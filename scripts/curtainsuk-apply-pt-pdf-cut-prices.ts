/**
 * Exact, owner-approved PDF cut-price observations for a prepared PT cohort.
 * Default mode is read-only. --apply appends no catalogue fields; --approve
 * additionally records the existing required manual approval with a staff id.
 */
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { loadEnvConfig } from "@next/env";
import { createSupplierServiceClient } from "../lib/supabase/supplier-service";
import { buildPtPdfCutPriceSnapshots, type PtPdfCutPriceCoverage } from "../lib/supplier-sync/pt-pdf-cut-price";
import { validateSupplierIntelligenceSnapshot } from "../lib/supplier-intelligence/validation";
import { createValidationEvent } from "../lib/supplier-intelligence/promotion";
import { SupplierIntelligenceService } from "../lib/supplier-intelligence/service";
import { SupabaseSupplierIntelligenceRepository } from "../lib/supplier-intelligence/supabase-repository";
import type { SupplierBulkAppendItem } from "../lib/supplier-import/types";
import type { DurableSupplierSyncRun } from "../lib/supplier-intelligence/types";

type PreparedMaster = { supplier_id: string; supplier_sku: string; supplier_design_code: string; action: string; exclusion_checked: boolean; commercial_authority: string; workbook_commercial_fields_used: unknown[] };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function option(name: string) {
  return process.argv.find((value) => value.startsWith(`${name}=`))?.slice(name.length + 1) ?? null;
}

function requireProductionConfiguration() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || process.env.CURTAINSUK_SUPABASE_PROJECT_REF !== "hqysjumypgeapgmqkcrx" ||
      new URL(url).hostname !== "hqysjumypgeapgmqkcrx.supabase.co" || !process.env.SUPABASE_SECRET_KEY) {
    throw new Error("PT_PDF_PRODUCTION_CONFIGURATION_REQUIRED");
  }
}

async function readJson<T>(path: string) {
  // PowerShell emits a UTF-8 BOM for the supplied coverage file. It is not
  // part of JSON and must not turn an otherwise exact source manifest invalid.
  return JSON.parse((await readFile(path, "utf8")).replace(/^\uFEFF/, "")) as T;
}

function validatePreparedCohort(manifest: PreparedMaster[], coverage: PtPdfCutPriceCoverage) {
  const manifestSkus = new Set(manifest.map((item) => item.supplier_sku));
  const coverageSkus = new Set(coverage.coverage.map((item) => item.supplier_sku));
  if (manifest.length !== 50 || coverage.selected_skus !== 50 || coverageSkus.size !== 50 || manifestSkus.size !== 50 ||
      [...manifestSkus].some((sku) => !coverageSkus.has(sku)) || [...coverageSkus].some((sku) => !manifestSkus.has(sku))) {
    throw new Error("PT_PDF_FIRST_50_SCOPE_MISMATCH");
  }
  for (const item of manifest) {
    if (item.supplier_id !== "prestigious-textiles" || item.action !== "CREATE_GOVERNED_MASTER" || !item.exclusion_checked ||
        item.commercial_authority !== "EXISTING_PT_SUPPLIER_REFRESH_ONLY" || !Array.isArray(item.workbook_commercial_fields_used) || item.workbook_commercial_fields_used.length) {
      throw new Error("PT_PDF_MANIFEST_NOT_PREPARED_MISSING_COHORT");
    }
  }
}

async function assertExactlyOneCurrentMasterPerSku(skus: string[]) {
  const { data, error } = await createSupplierServiceClient().from("fabric_colourways")
    .select("supplier_sku,brand_id,lifecycle_state").eq("supplier_id", "prestigious-textiles")
    .in("supplier_sku", skus);
  if (error) throw new Error("PT_PDF_MASTER_READ_FAILED");
  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    if (row.brand_id !== "prestigious-textiles" || row.lifecycle_state === "DISCONTINUED") throw new Error("PT_PDF_MASTER_NOT_CURRENT");
    counts.set(String(row.supplier_sku), (counts.get(String(row.supplier_sku)) ?? 0) + 1);
  }
  if (counts.size !== skus.length || [...counts.values()].some((count) => count !== 1)) throw new Error("PT_PDF_MASTER_SCOPE_MISMATCH");
}

async function main() {
  loadEnvConfig(process.cwd());
  const coveragePath = option("--coverage");
  const manifestPath = option("--manifest");
  const observedAt = option("--observed-at") ?? new Date().toISOString();
  const apply = process.argv.includes("--apply");
  const approve = process.argv.includes("--approve");
  if (!coveragePath || !manifestPath || !process.argv.includes("--owner-confirmed-cut-price")) throw new Error("USAGE: --coverage=... --manifest=... --owner-confirmed-cut-price [--observed-at=ISO] [--apply --approve]");
  if (approve && !apply) throw new Error("PT_PDF_APPROVAL_REQUIRES_APPLY");

  const [coverage, manifest] = await Promise.all([readJson<PtPdfCutPriceCoverage>(coveragePath), readJson<PreparedMaster[]>(manifestPath)]);
  validatePreparedCohort(manifest, coverage);
  const snapshots = buildPtPdfCutPriceSnapshots({ coverage, ownerConfirmedCutPrice: true, observedAt });
  const summary = { supplier: "prestigious-textiles", scope: "EXACT_FIRST_50_MISSING_ONLY", priceField: "CUT_TRADE_PRICE",
    standardPrices: 0, cutPrices: snapshots.length, stockObservations: 0, workbookPriceOrRrpUsed: false, applied: false, approved: false };
  if (!apply) { console.log(JSON.stringify(summary)); return; }

  requireProductionConfiguration();
  await assertExactlyOneCurrentMasterPerSku(snapshots.map((item) => item.supplier_sku));
  const repository = new SupabaseSupplierIntelligenceRepository();
  const now = new Date();
  const items: SupplierBulkAppendItem[] = [];
  for (const snapshot of snapshots) {
    const context = await repository.validationContext({ supplierId: snapshot.supplier_id, supplierSku: snapshot.supplier_sku, sourceType: snapshot.source.type, requiredPriceField: "CUT_TRADE_PRICE" });
    const validation = validateSupplierIntelligenceSnapshot(snapshot, context, now);
    if (validation.status !== "VALIDATED") throw new Error(`PT_PDF_PRICE_VALIDATION_FAILED:${snapshot.supplier_sku}`);
    items.push({ snapshot, validation, validation_event: createValidationEvent(snapshot.snapshot_id, validation, now.toISOString()) });
  }
  const existing = await Promise.all(snapshots.map((item) => repository.snapshot(item.snapshot_id)));
  if (existing.some(Boolean) && !existing.every(Boolean)) throw new Error("PT_PDF_SNAPSHOT_PARTIAL_RETRY_BLOCKED");
  const runId = `pt-pdf-cut-price:${createHash("sha256").update(`${coverage.source_sha256}:${observedAt}`).digest("hex").slice(0, 24)}`;
  const run: DurableSupplierSyncRun = { run_id: runId, supplier_id: "prestigious-textiles", adapter_id: "pt-pdf-cut-price",
    mode: "SHADOW", source_type: "OTHER", source_name: "Prestigious Textiles August 2026 Price List; owner-confirmed Cut Price",
    started_at: observedAt, completed_at: observedAt, status: "SUCCEEDED", snapshots_received: snapshots.length, snapshots_appended: snapshots.length,
    error_code: null, shopify_writes: 0, production_schedule_created: false };
  if (!existing.every(Boolean)) await repository.appendBulkValidatedSnapshots({ run, items });

  if (approve) {
    const actor = process.env.PT_PDF_PRICE_APPROVED_BY;
    if (!actor || !UUID.test(actor)) throw new Error("PT_PDF_PRICE_APPROVER_REQUIRED");
    const service = new SupplierIntelligenceService(repository);
    for (const snapshot of snapshots) {
      const events = await repository.promotionEvents(snapshot.snapshot_id);
      if (!events.some((event) => event.promotion_state === "APPROVED_FOR_PROJECTION")) {
        await service.manuallyApprove({ snapshotId: snapshot.snapshot_id, approvedBy: actor,
          reason: "Owner-confirmed CurtainsUK PT Cut Price basis. Exact supplier design-code match in the August 2026 Prestigious Textiles Price List; no workbook Price/RRP, stock, lifecycle, or Fabric Master facts supplied by this observation." });
      }
    }
  }
  console.log(JSON.stringify({ ...summary, applied: true, approved: approve, runId }));
}

void main().catch((error) => { console.error(error instanceof Error ? error.message : "PT_PDF_PRICE_UNEXPECTED_FAILURE"); process.exitCode = 1; });
