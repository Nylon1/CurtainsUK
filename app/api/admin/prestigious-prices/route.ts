import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { fabricMasterRecordById, listFabricMasterRecords, promoteFabricForStagingProjection } from "@/lib/fabric-master/repository";
import { supplierAdminIdentity } from "@/lib/supplier-intelligence/server-auth";
import { SupplierIntelligenceService } from "@/lib/supplier-intelligence/service";
import { SupabaseSupplierIntelligenceRepository } from "@/lib/supplier-intelligence/supabase-repository";
import type { DurableSupplierSyncRun } from "@/lib/supplier-intelligence/types";
import { normalizeSupplierSnapshot } from "@/lib/supplier-sync/normalize";

export const dynamic = "force-dynamic";

function response(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });
}

export async function GET() {
  if (!(await supplierAdminIdentity())) return response({ error: "SUPPLIER_ADMIN_REQUIRED" }, 403);
  try {
    const records = await listFabricMasterRecords({ supplierId: "prestigious-textiles" });
    return response({
      fabrics: records.map((record) => ({
        id: record.fabric_id,
        sku: record.supplier_sku,
        design: record.design_name,
        colour: record.colour_name,
        priceVerificationStatus: record.price_verification_status,
        pricingEligible: record.storefront_selectable,
      })),
    });
  } catch {
    return response({ error: "SUPPLIER_DATABASE_OPERATION_FAILED" }, 503);
  }
}

type PriceItem = { fabricId: string; cutPriceGbp: number; standardPriceGbp?: number | null };
type BulkPriceBody = { items: PriceItem[]; checkedAt: string; sourceReference: string; approvalReason: string };

export async function POST(request: Request) {
  const admin = await supplierAdminIdentity();
  if (!admin) return response({ error: "SUPPLIER_ADMIN_REQUIRED" }, 403);
  const body = await request.json() as BulkPriceBody;
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 100) return response({ error: "ONE_TO_100_PRICE_ROWS_REQUIRED" }, 400);
  if (!body.checkedAt || !Number.isFinite(Date.parse(body.checkedAt))) return response({ error: "VALID_CHECKED_AT_REQUIRED" }, 400);
  if (!body.sourceReference?.trim() || !body.approvalReason?.trim()) return response({ error: "SOURCE_AND_APPROVAL_REASON_REQUIRED" }, 400);

  const repository = new SupabaseSupplierIntelligenceRepository();
  const service = new SupplierIntelligenceService(repository);
  const results: Array<{ fabricId: string; sku?: string; status: "PROMOTED" | "REJECTED"; error?: string }> = [];

  for (const item of body.items) {
    try {
      if (!Number.isFinite(item.cutPriceGbp) || item.cutPriceGbp <= 0) throw new Error("VALID_CUT_PRICE_REQUIRED");
      if (item.standardPriceGbp !== undefined && item.standardPriceGbp !== null && (!Number.isFinite(item.standardPriceGbp) || item.standardPriceGbp <= 0)) throw new Error("VALID_STANDARD_PRICE_REQUIRED");
      const fabric = await fabricMasterRecordById(item.fabricId);
      if (!fabric || fabric.supplier_id !== "prestigious-textiles") throw new Error("UNKNOWN_PRESTIGIOUS_FABRIC");
      const id = randomUUID();
      const snapshotId = `prestigious-price:${fabric.supplier_sku}:${body.checkedAt}:${id}`;
      const snapshot = normalizeSupplierSnapshot({
        snapshot_id: snapshotId,
        supplier_id: fabric.supplier_id,
        brand_id: fabric.brand_id,
        supplier_sku: fabric.supplier_sku,
        checked_at: body.checkedAt,
        standard_trade_price: item.standardPriceGbp == null ? null : item.standardPriceGbp.toFixed(2),
        cut_trade_price: item.cutPriceGbp.toFixed(2),
        currency: "GBP",
        stock_unit: null,
        aggregate_available_quantity: null,
        batches: null,
        next_due_date: null,
        next_due_quantity: null,
        sample_available: fabric.sample_available,
        lifecycle_state: fabric.lifecycle_state,
        source: { type: "MANUAL_PORTAL", name: "Prestigious verified price bulk entry", reference: body.sourceReference.trim() },
        verification_status: "VERIFIED",
      });
      const run: DurableSupplierSyncRun = {
        run_id: `prestigious-price:${body.checkedAt}:${id}`,
        supplier_id: fabric.supplier_id,
        adapter_id: "prestigious-manual-price",
        mode: "SHADOW",
        source_type: "MANUAL_PORTAL",
        source_name: "Prestigious verified price bulk entry",
        started_at: body.checkedAt,
        completed_at: body.checkedAt,
        status: "SUCCEEDED",
        snapshots_received: 1,
        snapshots_appended: 1,
        error_code: null,
        shopify_writes: 0,
        production_schedule_created: false,
      };
      const ingested = await service.ingest({ run, snapshot, requiredPriceField: "CUT_TRADE_PRICE", now: new Date(body.checkedAt) });
      if (ingested.validation.status !== "VALIDATED") throw new Error(ingested.validation.errors.join(",") || "VALIDATION_FAILED");
      await service.manuallyApprove({ snapshotId, approvedBy: admin.id, approvedAt: new Date(body.checkedAt), reason: body.approvalReason.trim() });
      await promoteFabricForStagingProjection({ supplierId: fabric.supplier_id, supplierSku: fabric.supplier_sku, snapshotId });
      results.push({ fabricId: item.fabricId, sku: fabric.supplier_sku, status: "PROMOTED" });
    } catch (error) {
      results.push({ fabricId: item.fabricId, status: "REJECTED", error: error instanceof Error ? error.message : "PRICE_PROMOTION_FAILED" });
    }
  }

  return response({ results, promoted: results.filter((item) => item.status === "PROMOTED").length, rejected: results.filter((item) => item.status === "REJECTED").length }, results.every((item) => item.status === "REJECTED") ? 400 : 200);
}
