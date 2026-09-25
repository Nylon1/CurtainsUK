/**
 * Exact, owner-approved PDF cut-price observations for a prepared PT cohort.
 * Default mode is read-only. --apply appends no catalogue fields; --approve
 * additionally records the existing required manual approval with a staff id.
 */
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { loadEnvConfig } from "@next/env";
import { createSupplierServiceClient } from "../lib/supabase/supplier-service";
import { assertPtPdfSourceBytes, buildPtPdfCutPriceSnapshots, type PtPdfCutPriceCoverage } from "../lib/supplier-sync/pt-pdf-cut-price";
import { validateSupplierIntelligenceSnapshot } from "../lib/supplier-intelligence/validation";
import { createValidationEvent } from "../lib/supplier-intelligence/promotion";
import { SupplierIntelligenceService } from "../lib/supplier-intelligence/service";
import { SupabaseSupplierIntelligenceRepository } from "../lib/supplier-intelligence/supabase-repository";
import { hasSupplierPriceApprovalPermission, isPriceOnlyObservation } from "../lib/supplier-intelligence/authz";
import type { SupplierBulkAppendItem } from "../lib/supplier-import/types";
import type { DurableSupplierSyncRun } from "../lib/supplier-intelligence/types";

type PreparedMaster = { supplier_id: string; supplier_sku: string; supplier_design_code: string; action: string; exclusion_checked: boolean; commercial_authority: string; workbook_commercial_fields_used: unknown[] };

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

async function resolveRegisteredPriceApprover(email: string) {
  const requested = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requested)) throw new Error("PT_PDF_PRICE_APPROVER_EMAIL_REQUIRED");
  const client = createSupplierServiceClient();
  // Server-managed staff metadata is the established production authority.
  // Resolve the registered operator rather than accepting
  // an arbitrary UUID or reusing the staging-reviewer account.
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error("PT_PDF_PRICE_APPROVER_LOOKUP_FAILED");
    const user = (data.users ?? []).find((item) => item.email?.trim().toLowerCase() === requested);
    if (user) {
      if (!hasSupplierPriceApprovalPermission(user.app_metadata)) throw new Error("PT_PDF_PRICE_APPROVAL_PERMISSION_REQUIRED");
      return user.id;
    }
    if ((data.users ?? []).length < 1000) break;
  }
  throw new Error("PT_PDF_PRICE_APPROVER_NOT_FOUND");
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
  const sourcePdfPath = option("--source-pdf");
  const approverEmail = option("--approver-email");
  const observedAt = option("--observed-at") ?? new Date().toISOString();
  const apply = process.argv.includes("--apply");
  const approve = process.argv.includes("--approve");
  const approvalSqlPath = option("--prepare-approval-sql");
  if (!coveragePath || !manifestPath || !process.argv.includes("--owner-confirmed-cut-price")) throw new Error("USAGE: --coverage=... --manifest=... --owner-confirmed-cut-price [--observed-at=ISO] [--apply --approve --source-pdf=... --approver-email=...]");
  if (approve && !apply) throw new Error("PT_PDF_APPROVAL_REQUIRES_APPLY");
  // A PDF observation remains unavailable for commercial use until approved.
  // Require an approval run and retain resumability after a partial failure.
  if (apply && !approve) throw new Error("PT_PDF_APPLY_REQUIRES_APPROVAL");
  // Do not accept a UUID supplied by the shell: resolve a current production
  // price approver using the same permission gate used by the admin API.
  if (approve && !approverEmail) throw new Error("PT_PDF_PRICE_APPROVER_EMAIL_REQUIRED");
  if (apply && !sourcePdfPath) throw new Error("PT_PDF_SOURCE_PDF_REQUIRED");

  const [coverage, manifest] = await Promise.all([readJson<PtPdfCutPriceCoverage>(coveragePath), readJson<PreparedMaster[]>(manifestPath)]);
  validatePreparedCohort(manifest, coverage);
  const snapshots = buildPtPdfCutPriceSnapshots({ coverage, ownerConfirmedCutPrice: true, observedAt });
  if (snapshots.some(snapshot => !isPriceOnlyObservation(snapshot))) throw new Error("PT_PDF_PRICE_ONLY_OBSERVATIONS_REQUIRED");
  const summary = { supplier: "prestigious-textiles", scope: "EXACT_FIRST_50_MISSING_ONLY", priceField: "CUT_TRADE_PRICE",
    standardPrices: 0, cutPrices: snapshots.length, stockObservations: 0, workbookPriceOrRrpUsed: false, applied: false, approved: false };
  if (!apply) { console.log(JSON.stringify(summary)); return; }

  requireProductionConfiguration();
  // Read and hash the supplied file before every database operation. The
  // coverage hash alone is mutable input and is therefore insufficient.
  assertPtPdfSourceBytes(coverage, await readFile(sourcePdfPath!));
  const actor = await resolveRegisteredPriceApprover(approverEmail!);
  const repository = new SupabaseSupplierIntelligenceRepository();
  const policy = await repository.approvalPolicy("prestigious-textiles");
  if (!policy || policy.approval_mode !== "MANUAL" || policy.required_price_field !== "CUT_TRADE_PRICE") {
    throw new Error("PT_PDF_CUT_APPROVAL_POLICY_REQUIRED");
  }
  await assertExactlyOneCurrentMasterPerSku(snapshots.map((item) => item.supplier_sku));
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
    const pending: unknown[] = [];
    if (approvalSqlPath) repository.appendPromotionEvent = async (event) => { pending.push(event); };
    const service = new SupplierIntelligenceService(repository);
    for (const snapshot of snapshots) {
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
          const events = await repository.promotionEvents(snapshot.snapshot_id);
          if (!events.some((event) => event.promotion_state === "APPROVED_FOR_PROJECTION")) {
            await service.manuallyApprove({ snapshotId: snapshot.snapshot_id, approvedBy: actor,
              reason: "Owner-confirmed CurtainsUK PT Cut Price basis. Exact supplier design-code match in the August 2026 Prestigious Textiles Price List; no workbook Price/RRP, stock, lifecycle, or Fabric Master facts supplied by this observation." });
          }
          console.log(JSON.stringify({ event: approvalSqlPath ? "PT_PRICE_APPROVAL_PREPARED" : "PT_PRICE_APPROVED", sku: snapshot.supplier_sku }));
          break;
        } catch (error) {
          if (attempt === 3 || !(error instanceof Error) || error.message !== "SUPPLIER_DATABASE_OPERATION_FAILED") throw error;
          await new Promise(resolve => setTimeout(resolve, attempt * 1500));
        }
      }
    }
    if (approvalSqlPath) {
      const payload = JSON.stringify(pending);
      const scope = snapshots.map(snapshot => `'${snapshot.snapshot_id.replaceAll("'", "''")}'`).join(",");
      if (payload.includes("$ptapproval$")) throw new Error("UNSAFE_SQL_DELIMITER");
      await writeFile(approvalSqlPath, `BEGIN;
SET LOCAL statement_timeout='120s';
SET LOCAL lock_timeout='30s';
SELECT pg_advisory_xact_lock(4252026,9248);
DO $guard$ BEGIN
IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id='${actor}'::uuid AND raw_app_meta_data->'permissions' ? 'supplier_prices.approve') THEN RAISE EXCEPTION 'STAFF_PERMISSION_REQUIRED'; END IF;
IF NOT EXISTS(SELECT 1 FROM curtainsuk_private.supplier_approval_policies WHERE supplier_id='prestigious-textiles' AND approval_mode='MANUAL' AND required_price_field='CUT_TRADE_PRICE') THEN RAISE EXCEPTION 'CUT_MANUAL_POLICY_REQUIRED'; END IF;
END $guard$;
CREATE TEMP TABLE pending_pt_approvals ON COMMIT DROP AS SELECT * FROM jsonb_populate_recordset(null::curtainsuk_private.supplier_promotion_events,$ptapproval$${payload}$ptapproval$::jsonb);
DO $guard$ BEGIN
IF EXISTS(SELECT 1 FROM pending_pt_approvals e LEFT JOIN curtainsuk_private.supplier_snapshots s USING(snapshot_id) WHERE s.snapshot_id IS NULL OR s.validation_status<>'VALIDATED' OR s.source_name<>'Prestigious Textiles August 2026 Price List; owner-confirmed Cut Price' OR e.actor_id IS DISTINCT FROM '${actor}' OR e.actor_type<>'MANUAL_STAFF' OR e.promotion_state<>'APPROVED_FOR_PROJECTION') THEN RAISE EXCEPTION 'PREPARED_APPROVAL_SCOPE_INVALID'; END IF;
END $guard$;
INSERT INTO curtainsuk_private.supplier_promotion_events SELECT e.* FROM pending_pt_approvals e WHERE NOT EXISTS(SELECT 1 FROM curtainsuk_private.supplier_promotion_events p WHERE p.snapshot_id=e.snapshot_id AND p.promotion_state='APPROVED_FOR_PROJECTION');
DO $guard$ BEGIN
IF (SELECT count(*) FROM curtainsuk_private.supplier_promotion_events WHERE snapshot_id IN (${scope}) AND promotion_state='APPROVED_FOR_PROJECTION' AND actor_id='${actor}')<>50 OR (SELECT count(DISTINCT snapshot_id) FROM curtainsuk_private.supplier_promotion_events WHERE snapshot_id IN (${scope}) AND promotion_state='APPROVED_FOR_PROJECTION' AND actor_id='${actor}')<>50 THEN RAISE EXCEPTION 'EXACTLY_50_DISTINCT_APPROVALS_REQUIRED'; END IF;
END $guard$;
SELECT count(*) AS approved_prices, count(DISTINCT snapshot_id) AS distinct_approved_prices FROM curtainsuk_private.supplier_promotion_events WHERE snapshot_id IN (${scope}) AND promotion_state='APPROVED_FOR_PROJECTION' AND actor_id='${actor}';
COMMIT;\n`);
      console.log(JSON.stringify({ ...summary, applied: true, approved: false, pendingApprovals: pending.length, approvalSqlPrepared: true }));
      return;
    }
  }
  console.log(JSON.stringify({ ...summary, applied: true, approved: approve, runId }));
}

void main().catch((error) => { console.error(error instanceof Error ? error.message : "PT_PDF_PRICE_UNEXPECTED_FAILURE"); process.exitCode = 1; });
