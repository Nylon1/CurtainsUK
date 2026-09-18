/** Authorised SDG Product/detail → existing supplier evidence → existing daily stock materialiser. */
import { randomUUID } from "node:crypto";
import { createSupplierServiceClient } from "../lib/supabase/supplier-service";
import { SdgPortalSession } from "../lib/supplier-sync/adapters/sdg-portal-session";
import { readSdgPortalStock, type SdgStockIdentity, type SdgStockDetail } from "../lib/supplier-sync/adapters/sanderson-design-group";
import { assertProvenSdgCoverage, nextSdgRefreshAt } from "../lib/supplier-sync/sdg-routine-policy";
import { validateSupplierIntelligenceSnapshot } from "../lib/supplier-intelligence/validation";
import { createValidationEvent } from "../lib/supplier-intelligence/promotion";
import type { NormalizedSupplierSnapshot } from "../lib/supplier-sync/types";

const SUPPLIER = "sanderson-design-group";
const SOURCE = "SDG authenticated trade portal Product/detail";
const FULL_ADAPTER = "sdg-trade-portal-full-refresh";
type Stage = "CONFIGURATION" | "DUE_CHECK" | "MANIFEST" | "AUTHENTICATION" | "RETRIEVAL" | "COVERAGE" | "VALIDATION" | "APPROVAL" | "MATERIALISATION" | "VERIFICATION";

function assertProductionConfiguration() {
  const url = process.env.SUPABASE_URL;
  const ref = process.env.CURTAINSUK_SUPABASE_PROJECT_REF;
  if (!url || ref !== "hqysjumypgeapgmqkcrx" || new URL(url).hostname !== `${ref}.supabase.co` ||
      !process.env.SUPABASE_SECRET_KEY || !process.env.SDG_TRADE_EMAIL || !process.env.SDG_TRADE_PASSWORD) {
    throw new Error("SDG_ROUTINE_PRODUCTION_CONFIGURATION_REQUIRED");
  }
}

async function exactManifest(): Promise<SdgStockIdentity[]> {
  const db = createSupplierServiceClient();
  const result: SdgStockIdentity[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.from("fabric_colourways")
      .select("supplier_sku,brand_id,lifecycle_state")
      .eq("supplier_id", SUPPLIER).neq("lifecycle_state", "DISCONTINUED")
      .order("supplier_sku").range(offset, offset + 999);
    if (error) throw new Error("SDG_MANIFEST_READ_FAILED");
    for (const row of data ?? []) {
      if (typeof row.supplier_sku !== "string" || typeof row.brand_id !== "string") throw new Error("SDG_MANIFEST_IDENTITY_MISSING");
      result.push({ supplierSku: row.supplier_sku, brandId: row.brand_id });
    }
    if ((data ?? []).length < 1000) break;
  }
  return result;
}

function syncRun(input: { id: string; adapter: string; started: string; completed: string; status: "SUCCEEDED" | "FAILED"; received: number; appended: number; errorCode?: string }) {
  return {
    run_id: input.id, supplier_id: SUPPLIER, adapter_id: input.adapter, mode: "SHADOW",
    source_type: "MANUAL_PORTAL", source_name: SOURCE, started_at: input.started,
    completed_at: input.completed, status: input.status, snapshots_received: input.received,
    snapshots_appended: input.appended, error_code: input.errorCode ?? null,
    shopify_writes: 0, production_schedule_created: false,
  };
}

async function assertMaterialised(snapshots: readonly NormalizedSupplierSnapshot[]): Promise<void> {
  const db = createSupplierServiceClient();
  const bySku = new Map(snapshots.map((snapshot) => [snapshot.supplier_sku, snapshot]));
  let verified = 0;
  for (let offset = 0; offset < snapshots.length; offset += 100) {
    const skus = snapshots.slice(offset, offset + 100).map((snapshot) => snapshot.supplier_sku);
    const { data, error } = await db.from("daily_stock_snapshots")
      .select("supplier_sku,source_snapshot_id,aggregate_metres,checked_at")
      .eq("supplier_id", SUPPLIER).in("supplier_sku", skus)
      .gte("checked_at", snapshots[0].checked_at.slice(0, 10));
    if (error) throw new Error("SDG_MATERIALISATION_READ_FAILED");
    const found = new Map((data ?? []).map((row) => [row.supplier_sku, row]));
    for (const sku of skus) {
      const expected = bySku.get(sku)!;
      const actual = found.get(sku);
      if (!actual || actual.source_snapshot_id !== expected.snapshot_id ||
          Number(actual.aggregate_metres) !== expected.aggregate_available_quantity ||
          Date.parse(actual.checked_at) !== Date.parse(expected.checked_at)) {
        throw new Error("SDG_MATERIALISATION_EVIDENCE_MISMATCH");
      }
      verified += 1;
    }
  }
  if (verified !== snapshots.length) throw new Error("SDG_MATERIALISATION_COVERAGE_MISMATCH");
}

async function main() {
  const started = new Date();
  const fullRunId = `sdg-trade-portal-full-refresh:${randomUUID()}`;
  let stage: Stage = "CONFIGURATION";
  let received = 0;
  let appended = 0;
  let dbReady = false;
  try {
    assertProductionConfiguration();
    const db = createSupplierServiceClient();
    dbReady = true;
    stage = "DUE_CHECK";
    const { data: latest, error: dueError } = await db.from("supplier_sync_runs")
      .select("completed_at").eq("supplier_id", SUPPLIER).eq("adapter_id", FULL_ADAPTER)
      .eq("status", "SUCCEEDED").order("completed_at", { ascending: false }).limit(1).maybeSingle();
    if (dueError) throw new Error("SDG_LAST_SUCCESS_UNAVAILABLE");
    const due = latest ? nextSdgRefreshAt(latest.completed_at) : null;
    if (due && started < due) {
      console.log(JSON.stringify({ outcome: "NOT_DUE", nextRefresh: due.toISOString() }));
      return;
    }
    stage = "MANIFEST";
    const identities = await exactManifest();
    stage = "AUTHENTICATION";
    const session = new SdgPortalSession({ email: process.env.SDG_TRADE_EMAIL!, password: process.env.SDG_TRADE_PASSWORD! });
    delete process.env.SDG_TRADE_PASSWORD;
    await session.login();
    stage = "RETRIEVAL";
    const result = await readSdgPortalStock({ identities, getBearerToken: () => session.getBearerToken() });
    received = result.requested;
    stage = "COVERAGE";
    assertProvenSdgCoverage(identities, result);
    stage = "VALIDATION";
    const details = new Map(result.details.map((item) => [item.supplierSku, item]));
    const validated: { snapshot: NormalizedSupplierSnapshot; detail: SdgStockDetail; validation: ReturnType<typeof validateSupplierIntelligenceSnapshot> }[] = [];
    for (const snapshot of result.snapshots) {
      const detail = details.get(snapshot.supplier_sku);
      if (!detail || detail.brandId !== snapshot.brand_id || detail.unit?.toLowerCase() !== "metre" || detail.primaryMetres !== snapshot.aggregate_available_quantity) {
        throw new Error("SDG_DETAIL_SNAPSHOT_MISMATCH");
      }
      const validation = validateSupplierIntelligenceSnapshot(snapshot, {
        known_supplier: true, known_sku: true, allowed_currencies: ["GBP"], allowed_stock_units: ["METRE"],
        required_price_field: "CUT_TRADE_PRICE", freshness_policies: [],
      }, new Date());
      if (validation.status !== "VALIDATED") throw new Error("SDG_STOCK_VALIDATION_FAILED");
      validated.push({ snapshot, detail, validation });
    }
    stage = "APPROVAL";
    for (let offset = 0; offset < validated.length; offset += 100) {
      const batch = validated.slice(offset, offset + 100);
      const runId = `sdg-portal-routine:${randomUUID()}:${String(Math.floor(offset / 100) + 1).padStart(3, "0")}`;
      const timestamps = batch.map((item) => Date.parse(item.snapshot.checked_at));
      const run = syncRun({ id: runId, adapter: "sdg-portal-product-detail", started: new Date(Math.min(...timestamps)).toISOString(), completed: new Date(Math.max(...timestamps)).toISOString(), status: "SUCCEEDED", received: batch.length, appended: batch.length });
      const eventAt = new Date(Date.now() - 1000).toISOString();
      const items = batch.map(({ snapshot, detail, validation }) => ({
        snapshot: {
          ...snapshot, run_id: runId, source_type: snapshot.source.type, source_name: snapshot.source.name,
          source_reference: snapshot.source.reference, validation_status: validation.status,
          validation_errors: validation.errors, stock_expires_at: validation.stock_expires_at,
          price_expires_at: null, lifecycle_expires_at: null,
          normalized_payload: { ...snapshot, supplier_portal_detail: detail },
        },
        validation_event: createValidationEvent(snapshot.snapshot_id, validation, eventAt),
      }));
      const { error: appendError } = await db.rpc("append_supplier_snapshot_batch", { p_run: run, p_items: items });
      if (appendError) throw new Error("SDG_EVIDENCE_APPEND_FAILED");
      appended += batch.length;
      const { data: approved, error: approvalError } = await db.rpc("approve_sdg_portal_stock_run", { p_run_id: runId });
      if (approvalError || approved !== batch.length) throw new Error("SDG_POLICY_APPROVAL_FAILED");
    }
    stage = "MATERIALISATION";
    const { error: materializeError } = await db.rpc("materialize_daily_stock");
    if (materializeError) throw new Error("SDG_MATERIALISATION_FAILED");
    stage = "VERIFICATION";
    await assertMaterialised(result.snapshots);
    const completed = new Date();
    const { error: runError } = await db.from("supplier_sync_runs").insert(syncRun({ id: fullRunId, adapter: FULL_ADAPTER, started: started.toISOString(), completed: completed.toISOString(), status: "SUCCEEDED", received, appended }));
    if (runError) throw new Error("SDG_SUCCESS_AUDIT_FAILED");
    console.log(JSON.stringify({ outcome: "SUCCEEDED", expected: received, resolved: appended, unknown: result.exceptions.length,
      zero: result.snapshots.filter((item) => item.aggregate_available_quantity === 0).length,
      atLeast30: result.snapshots.filter((item) => (item.aggregate_available_quantity ?? 0) >= 30).length,
      future: result.details.filter((item) => (item.futureMetres ?? 0) > 0).length,
      durationMs: completed.getTime() - started.getTime(), nextRefresh: nextSdgRefreshAt(completed.toISOString()).toISOString() }));
  } catch (error) {
    const code = error instanceof Error && /^SDG_[A-Z0-9_]+$/.test(error.message) ? error.message : "SDG_ROUTINE_UNEXPECTED_FAILURE";
    if (dbReady) {
      try {
        await createSupplierServiceClient().from("supplier_sync_runs").insert(syncRun({ id: fullRunId, adapter: FULL_ADAPTER, started: started.toISOString(), completed: new Date().toISOString(), status: "FAILED", received, appended, errorCode: `${stage}:${code}` }));
      } catch { /* The GitHub Actions failure remains the alert if database audit is unavailable. */ }
    }
    console.error(JSON.stringify({ outcome: "FAILED", stage, code, received, appended }));
    process.exitCode = 1;
  }
}

void main();
