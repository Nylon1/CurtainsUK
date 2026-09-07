import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { PRESTIGIOUS_PILOT_FABRICS, PRESTIGIOUS_PILOT_FABRICS_BY_ID } from "@/lib/prestigious/pilot-fabrics";
import type { PrestigiousStockVerificationInput } from "@/lib/prestigious/types";
import { supplierAdminIdentity } from "@/lib/supplier-intelligence/server-auth";
import { SupplierIntelligenceService } from "@/lib/supplier-intelligence/service";
import { SupabaseSupplierIntelligenceRepository } from "@/lib/supplier-intelligence/supabase-repository";
import type { DurableSupplierSyncRun } from "@/lib/supplier-intelligence/types";
import { normalizeSupplierSnapshot } from "@/lib/supplier-sync/normalize";
import { supplierDatabaseConfigured } from "@/lib/supabase/supplier-service";

export const dynamic = "force-dynamic";

function response(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });
}

function moneyMinor(value: string | null) {
  if (value === null) return null;
  const [whole, fraction = ""] = value.split(".");
  return Number(whole) * 100 + Number((fraction + "00").slice(0, 2));
}

export async function GET(request: NextRequest) {
  if (!(await supplierAdminIdentity())) return response({ error: "SUPPLIER_ADMIN_REQUIRED" }, 403);
  if (!supplierDatabaseConfigured()) return response({ error: "SUPPLIER_DATABASE_NOT_CONFIGURED" }, 503);
  const requiredMetres = Number(request.nextUrl.searchParams.get("requiredMetres"));
  try {
    const repository = new SupabaseSupplierIntelligenceRepository();
    const data = await repository.dataset("prestigious-textiles");
    return response({
      persistence: "PRIVATE_POSTGRES_APPEND_ONLY",
      fabrics: PRESTIGIOUS_PILOT_FABRICS.map((fabric) => {
        const latest = data.snapshots.filter((snapshot) => snapshot.supplier_sku === fabric.uniqueSku).sort((a, b) => Date.parse(b.checked_at) - Date.parse(a.checked_at))[0] ?? null;
        return {
          id: fabric.id,
          design: fabric.design,
          colour: fabric.colour,
          sku: fabric.uniqueSku,
          requiredMetres: Number.isFinite(requiredMetres) && requiredMetres > 0 ? requiredMetres : null,
          record: {
            standardTradePriceExVat: latest?.standard_trade_price ? { amountMinor: moneyMinor(latest.standard_trade_price) } : null,
            cutTradePriceExVat: latest?.cut_trade_price ? { amountMinor: moneyMinor(latest.cut_trade_price) } : null,
            totalFreeStockMetres: latest?.aggregate_available_quantity ?? null,
            batches: (latest?.batches ?? []).map((batch) => ({ batchReference: batch.batch_reference, usableMetres: batch.batch_available_quantity, pieces: batch.pieces })),
            nextDueDate: latest?.next_due_date ?? null,
            nextDueMetres: latest?.next_due_quantity ?? null,
            verifiedAt: latest?.checked_at ?? null,
            notes: null,
            priceVerificationStatus: fabric.priceVerificationStatus,
          },
          evaluation: latest ? { internalState: latest.validation_status, customerState: "Availability to be confirmed", stale: latest.stock_expires_at ? Date.parse(latest.stock_expires_at) <= Date.now() : true } : null,
        };
      }),
    });
  } catch {
    return response({ error: "SUPPLIER_DATABASE_OPERATION_FAILED" }, 503);
  }
}

export async function POST(request: NextRequest) {
  if (!(await supplierAdminIdentity())) return response({ error: "SUPPLIER_ADMIN_REQUIRED" }, 403);
  if (!supplierDatabaseConfigured()) return response({ error: "SUPPLIER_DATABASE_NOT_CONFIGURED" }, 503);
  const body = await request.json() as PrestigiousStockVerificationInput;
  const fabric = PRESTIGIOUS_PILOT_FABRICS_BY_ID.get(body.fabricSpecId);
  if (!fabric) return response({ error: "UNKNOWN_PILOT_FABRIC" }, 400);
  if (!body.verifiedAt || !Number.isFinite(Date.parse(body.verifiedAt))) return response({ error: "VALID_VERIFICATION_TIMESTAMP_REQUIRED" }, 400);
  const id = randomUUID();
  const standard = body.standardTradePriceExVatMinor === null ? null : (body.standardTradePriceExVatMinor / 100).toFixed(2);
  const cut = body.cutTradePriceExVatMinor === null ? null : (body.cutTradePriceExVatMinor / 100).toFixed(2);
  const hasBatchObservation = body.batchReference !== null || body.selectedBatchMetres !== null || body.pieces !== null;
  const snapshot = normalizeSupplierSnapshot({
    snapshot_id: `prestigious:${fabric.uniqueSku}:${body.verifiedAt}:${id}`,
    supplier_id: "prestigious-textiles",
    brand_id: "prestigious-textiles",
    supplier_sku: fabric.uniqueSku,
    checked_at: body.verifiedAt,
    standard_trade_price: standard,
    cut_trade_price: cut,
    currency: standard !== null || cut !== null ? "GBP" : null,
    stock_unit: "METRE",
    aggregate_available_quantity: body.totalFreeStockMetres,
    batches: hasBatchObservation ? [{ batch_reference: body.batchReference, batch_available_quantity: body.selectedBatchMetres, pieces: body.pieces }] : null,
    next_due_date: body.nextDueDate,
    next_due_quantity: body.nextDueMetres,
    sample_available: null,
    lifecycle_state: "UNKNOWN",
    source: { type: "MANUAL_PORTAL", name: "Prestigious Webtex manual verification", reference: null },
    verification_status: "VERIFIED",
  });
  const run: DurableSupplierSyncRun = {
    run_id: `prestigious-manual:${body.verifiedAt}:${id}`,
    supplier_id: "prestigious-textiles",
    adapter_id: "prestigious-webtex",
    mode: "SHADOW",
    source_type: "MANUAL_PORTAL",
    source_name: "Prestigious Webtex manual verification",
    started_at: body.verifiedAt,
    completed_at: body.verifiedAt,
    status: "SUCCEEDED",
    snapshots_received: 1,
    snapshots_appended: 1,
    error_code: null,
    shopify_writes: 0,
    production_schedule_created: false,
  };
  try {
    const saved = await new SupplierIntelligenceService(new SupabaseSupplierIntelligenceRepository()).ingest({ run, snapshot, requiredPriceField: cut === null ? null : "CUT_TRADE_PRICE", now: new Date(body.verifiedAt) });
    return response({ saved: { snapshot_id: snapshot.snapshot_id, validation_status: saved.validation.status, validation_errors: saved.validation.errors, promotion_state: saved.event.promotion_state } });
  } catch {
    return response({ error: "SUPPLIER_DATABASE_OPERATION_FAILED" }, 503);
  }
}
