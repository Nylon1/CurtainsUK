/** PT Webtex collection-first stock → existing supplier evidence/materialisation. */
import { randomUUID } from "node:crypto";
import { createSupplierServiceClient } from "../lib/supabase/supplier-service";
import { PtWebtexSession } from "../lib/supplier-sync/adapters/pt-webtex-session";
import { assertProvenPtCoverage, nextPtRefreshAt, PT_PRIOR_UNKNOWN_SKUS, PT_SOURCE, PT_SUPPLIER, reconcilePtStock, type PtIdentity, type PtStockRow } from "../lib/supplier-sync/pt-stock-reconciliation";
import { validateSupplierIntelligenceSnapshot } from "../lib/supplier-intelligence/validation";
import { createValidationEvent } from "../lib/supplier-intelligence/promotion";
import type { NormalizedSupplierSnapshot } from "../lib/supplier-sync/types";

const ADAPTER = "pt-webtex-stock-enquiry";
const FULL_ADAPTER = "pt-webtex-full-refresh";
type Stage = "CONFIGURATION" | "DUE_CHECK" | "MANIFEST" | "AUTHENTICATION" | "RETRIEVAL" | "COVERAGE" | "VALIDATION" | "APPROVAL" | "MATERIALISATION" | "VERIFICATION";

function assertConfiguration() {
  const url = process.env.SUPABASE_URL;
  const ref = process.env.CURTAINSUK_SUPABASE_PROJECT_REF;
  if (!url || ref !== "hqysjumypgeapgmqkcrx" || new URL(url).hostname !== `${ref}.supabase.co` ||
      !process.env.SUPABASE_SECRET_KEY || !process.env.PT_WEBTEX_USERNAME || !process.env.PT_WEBTEX_PASSWORD) {
    throw new Error("PT_PRODUCTION_CONFIGURATION_REQUIRED");
  }
}

async function manifest(): Promise<PtIdentity[]> {
  const db = createSupplierServiceClient();
  const identities: PtIdentity[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.from("fabric_colourways")
      .select("supplier_sku,brand_id,lifecycle_state,fabric_designs!inner(supplier_design_code,fabric_collections!inner(display_name))")
      .eq("supplier_id", PT_SUPPLIER).neq("lifecycle_state", "DISCONTINUED")
      .order("supplier_sku").range(offset, offset + 999);
    if (error) throw new Error("PT_MANIFEST_READ_FAILED");
    for (const row of data ?? []) {
      const design = row.fabric_designs as unknown as { supplier_design_code?: string; fabric_collections?: { display_name?: string } };
      if (typeof row.supplier_sku !== "string" || typeof row.brand_id !== "string" ||
          typeof design?.fabric_collections?.display_name !== "string") throw new Error("PT_MANIFEST_IDENTITY_MISSING");
      identities.push({ supplierSku: row.supplier_sku, brandId: row.brand_id,
        lifecycleState: row.lifecycle_state, collection: design.fabric_collections.display_name });
    }
    if ((data ?? []).length < 1000) break;
  }
  return identities;
}

function runAudit(input: { id: string; adapter: string; started: string; completed: string; status: "SUCCEEDED" | "FAILED"; received: number; appended: number; errorCode?: string }) {
  return { run_id: input.id, supplier_id: PT_SUPPLIER, adapter_id: input.adapter, mode: "SHADOW",
    source_type: "MANUAL_PORTAL", source_name: PT_SOURCE, started_at: input.started, completed_at: input.completed,
    status: input.status, snapshots_received: input.received, snapshots_appended: input.appended,
    error_code: input.errorCode ?? null, shopify_writes: 0, production_schedule_created: false };
}

async function retrieve(session: PtWebtexSession, identities: readonly PtIdentity[]) {
  const rows: PtStockRow[] = [];
  const collections = [...new Set(identities.map((item) => item.collection))];
  for (const collection of collections) rows.push(...(await session.search("COLLECTION", collection)).rows);
  const found = new Set(rows.map((row) => row.sku));
  const missing = identities.filter((item) => !found.has(item.supplierSku));
  const designs = [...new Set(missing.map((item) => item.supplierSku.slice(0, 4)))];
  for (const design of designs) rows.push(...(await session.search("DESIGN_CODE", design)).rows);
  const afterDesign = new Set(rows.map((row) => row.sku));
  const skuFallbacks = identities.filter((item) => !afterDesign.has(item.supplierSku));
  for (const item of skuFallbacks) {
    try { rows.push(...(await session.search("PRODUCT_CODE", item.supplierSku)).rows); }
    catch (error) {
      // Only the three previously proven unresolved identities may be absent.
      // Authentication and parser failures still stop the run; missing product
      // evidence never becomes an invented zero or a refreshed timestamp.
      const code = error instanceof Error ? error.message : "";
      if (!PT_PRIOR_UNKNOWN_SKUS.has(item.supplierSku) ||
          !(/^PT_WEBTEX_QUERY_STATUS_/.test(code) || code === "PT_WEBTEX_HTTP_404")) throw error;
    }
  }
  return { rows, collectionQueries: collections.length, designQueries: designs.length, skuQueries: skuFallbacks.length };
}

async function verifyMaterialisation(snapshots: readonly NormalizedSupplierSnapshot[]) {
  const db = createSupplierServiceClient();
  const bySku = new Map(snapshots.map((item) => [item.supplier_sku, item]));
  let count = 0;
  for (let offset = 0; offset < snapshots.length; offset += 100) {
    const skus = snapshots.slice(offset, offset + 100).map((item) => item.supplier_sku);
    const { data, error } = await db.from("daily_stock_snapshots")
      .select("supplier_sku,source_snapshot_id,aggregate_metres,checked_at")
      .eq("supplier_id", PT_SUPPLIER).in("supplier_sku", skus)
      .gte("checked_at", snapshots[0].checked_at.slice(0, 10));
    if (error) throw new Error("PT_MATERIALISATION_READ_FAILED");
    const found = new Map((data ?? []).map((item) => [item.supplier_sku, item]));
    for (const sku of skus) {
      const actual = found.get(sku);
      const expected = bySku.get(sku)!;
      if (!actual || actual.source_snapshot_id !== expected.snapshot_id ||
          Number(actual.aggregate_metres) !== expected.aggregate_available_quantity ||
          Date.parse(actual.checked_at) !== Date.parse(expected.checked_at)) throw new Error("PT_MATERIALISATION_EVIDENCE_MISMATCH");
      count += 1;
    }
  }
  if (count !== snapshots.length) throw new Error("PT_MATERIALISATION_COVERAGE_MISMATCH");
}

async function main() {
  const started = new Date();
  const fullRunId = `pt-webtex-full-refresh:${randomUUID()}`;
  let stage: Stage = "CONFIGURATION", received = 0, appended = 0, dbReady = false;
  try {
    assertConfiguration();
    const db = createSupplierServiceClient();
    dbReady = true;
    stage = "DUE_CHECK";
    const { data: latest, error: dueError } = await db.from("supplier_sync_runs")
      .select("completed_at").eq("supplier_id", PT_SUPPLIER).eq("adapter_id", FULL_ADAPTER)
      .eq("status", "SUCCEEDED").order("completed_at", { ascending: false }).limit(1).maybeSingle();
    if (dueError) throw new Error("PT_LAST_SUCCESS_UNAVAILABLE");
    const due = latest ? nextPtRefreshAt(latest.completed_at) : null;
    if (due && started < due && process.env.PT_FORCE_REFRESH !== "1") {
      console.log(JSON.stringify({ outcome: "NOT_DUE", nextRefresh: due.toISOString() })); return;
    }
    stage = "MANIFEST";
    const identities = await manifest();
    stage = "AUTHENTICATION";
    const session = new PtWebtexSession();
    await session.login(process.env.PT_WEBTEX_USERNAME!, process.env.PT_WEBTEX_PASSWORD!);
    delete process.env.PT_WEBTEX_PASSWORD;
    stage = "RETRIEVAL";
    const retrieved = await retrieve(session, identities);
    received = identities.length;
    const result = reconcilePtStock(identities, retrieved.rows);
    stage = "COVERAGE";
    assertProvenPtCoverage(identities, result);
    stage = "VALIDATION";
    const validated = result.snapshots.map((snapshot) => {
      const validation = validateSupplierIntelligenceSnapshot(snapshot, {
        known_supplier: true, known_sku: true, allowed_currencies: ["GBP"], allowed_stock_units: ["METRE"],
        required_price_field: "STANDARD_TRADE_PRICE", freshness_policies: [],
      }, new Date());
      if (validation.status !== "VALIDATED") throw new Error("PT_STOCK_VALIDATION_FAILED");
      return { snapshot, validation };
    });
    stage = "APPROVAL";
    for (let offset = 0; offset < validated.length; offset += 100) {
      const batch = validated.slice(offset, offset + 100);
      const runId = `pt-webtex-routine:${randomUUID()}:${String(Math.floor(offset / 100) + 1).padStart(3, "0")}`;
      const times = batch.map((item) => Date.parse(item.snapshot.checked_at));
      const run = runAudit({ id: runId, adapter: ADAPTER, started: new Date(Math.min(...times)).toISOString(),
        completed: new Date(Math.max(...times)).toISOString(), status: "SUCCEEDED", received: batch.length, appended: batch.length });
      const eventAt = new Date(Date.now() - 1000).toISOString();
      const items = batch.map(({ snapshot, validation }) => ({
        snapshot: { ...snapshot, run_id: runId, source_type: snapshot.source.type,
          source_name: snapshot.source.name, source_reference: snapshot.source.reference,
          validation_status: validation.status, validation_errors: validation.errors,
          stock_expires_at: validation.stock_expires_at, price_expires_at: null, lifecycle_expires_at: null,
          normalized_payload: snapshot },
        validation_event: createValidationEvent(snapshot.snapshot_id, validation, eventAt),
      }));
      const { error: appendError } = await db.rpc("append_supplier_snapshot_batch", { p_run: run, p_items: items });
      if (appendError) throw new Error("PT_EVIDENCE_APPEND_FAILED");
      appended += batch.length;
      const { data: approved, error: approvalError } = await db.rpc("approve_pt_webtex_stock_run", { p_run_id: runId });
      if (approvalError || approved !== batch.length) throw new Error("PT_POLICY_APPROVAL_FAILED");
      stage = "MATERIALISATION";
      const { data: applied, error: materializeError } = await db.rpc("materialize_pt_webtex_stock_run", { p_run_id: runId });
      if (materializeError || applied !== batch.length) throw new Error("PT_MATERIALISATION_FAILED");
      stage = "APPROVAL";
    }
    stage = "VERIFICATION";
    await verifyMaterialisation(result.snapshots);
    const completed = new Date();
    const { error: auditError } = await db.from("supplier_sync_runs").insert(runAudit({ id: fullRunId, adapter: FULL_ADAPTER,
      started: started.toISOString(), completed: completed.toISOString(), status: "SUCCEEDED", received, appended }));
    if (auditError) throw new Error("PT_SUCCESS_AUDIT_FAILED");
    console.log(JSON.stringify({ outcome: "SUCCEEDED", expected: received, resolved: appended,
      atLeast30: result.snapshots.filter((item) => (item.aggregate_available_quantity ?? 0) >= 30).length,
      positiveBelow30: result.snapshots.filter((item) => (item.aggregate_available_quantity ?? 0) > 0 && (item.aggregate_available_quantity ?? 0) < 30).length,
      zero: result.snapshots.filter((item) => item.aggregate_available_quantity === 0).length,
      unknown: result.exceptions, overlap: result.overlapCount,
      collectionQueries: retrieved.collectionQueries, designQueries: retrieved.designQueries, skuQueries: retrieved.skuQueries,
      durationMs: completed.getTime() - started.getTime(), nextRefresh: nextPtRefreshAt(completed.toISOString()).toISOString() }));
  } catch (error) {
    const code = error instanceof Error && /^PT_[A-Z0-9_]+$/.test(error.message) ? error.message : "PT_ROUTINE_UNEXPECTED_FAILURE";
    if (dbReady) {
      try { await createSupplierServiceClient().from("supplier_sync_runs").insert(runAudit({ id: fullRunId,
        adapter: FULL_ADAPTER, started: started.toISOString(), completed: new Date().toISOString(), status: "FAILED",
        received, appended, errorCode: `${stage}:${code}` })); } catch { /* Workflow failure remains an alert. */ }
    }
    console.error(JSON.stringify({ outcome: "FAILED", stage, code, received, appended }));
    process.exitCode = 1;
  }
}

void main();
