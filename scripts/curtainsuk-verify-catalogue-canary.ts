/** Phase 5H operator runbook: verified observations, existing append-only governance. */
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { listExistingCatalogueRecords, promoteFabricForStagingProjection } from "../lib/fabric-master/repository";
import { createSupplierServiceClient } from "../lib/supabase/supplier-service";
import { normalizeSupplierSnapshot } from "../lib/supplier-sync/normalize";
import { SupplierIntelligenceService } from "../lib/supplier-intelligence/service";
import { SupabaseSupplierIntelligenceRepository } from "../lib/supplier-intelligence/supabase-repository";
import type { DurableSupplierSyncRun } from "../lib/supplier-intelligence/types";

type Observation = { supplierSku: string; design: string; colour: string; portalCollection: string | null; standardPriceGbp: string; cutPriceGbp: string; sampleAvailable: boolean; portalMarker: string; lifecycle: "CURRENT"; lifecycleBasis: string; checkedAt: string; sourceReference: string };
const normal = (s: string) => s.trim().toLowerCase().replace(/ collection$/, "");
async function main() {
  loadEnvConfig(process.cwd());
  if (new URL(process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname !== "hqysjumypgeapgmqkcrx.supabase.co" || !process.argv.includes("--confirm-project=hqysjumypgeapgmqkcrx")) throw new Error("STAGING_PROJECT_REQUIRED");
  const apply = process.argv.includes("--apply");
  const arg = (key: string, fallback: string) => process.argv.find(v => v.startsWith(`--${key}=`))?.slice(key.length + 3) ?? fallback;
  const observations: Observation[] = JSON.parse(await readFile("artifacts/phase5h/private/prestigious-observations.json", "utf8"));
  const manifest: { fabric_id: string; supplier_sku: string }[] = JSON.parse(await readFile(arg("manifest", "artifacts/phase5g/prestigious-canary-50.json"), "utf8"));
  if (!manifest.length || manifest.length > 250 || new Set(manifest.map(r => r.fabric_id)).size !== manifest.length) throw new Error("INVALID_CANARY");
  const rows = await listExistingCatalogueRecords("prestigious-textiles");
  const db = createSupplierServiceClient();
  const repository = new SupabaseSupplierIntelligenceRepository();
  const service = new SupplierIntelligenceService(repository);
  // An explicitly labelled operator audit identity, not an impersonated application user.
  const operatorId = "554dcc42-4bb0-4db1-8ae8-d97413051548";
  const report = [];
  for (const item of manifest) {
    const existing = rows.find(r => r.record.fabric_id === item.fabric_id);
    const o = observations.find(r => r.supplierSku === item.supplier_sku);
    const r = existing?.record;
    const blockers: string[] = [];
    if (!r || !o || r.supplier_sku !== item.supplier_sku) blockers.push("EXACT_SKU_EVIDENCE_MISSING");
    if (r && o && (normal(r.design_name) !== normal(o.design) || normal(r.colour_name) !== normal(o.colour) || !o.portalCollection || normal(r.collection_name) !== normal(o.portalCollection))) blockers.push("IDENTITY_RECONCILIATION_REQUIRED");
    if (o && (o.lifecycle !== "CURRENT" || o.portalMarker !== "UNFLAGGED" || typeof o.sampleAvailable !== "boolean")) blockers.push("CURRENT_SUPPLIER_EVIDENCE_REQUIRED");
    if (o && (!Number.isFinite(Date.parse(o.checkedAt)) || Date.parse(o.checkedAt) > Date.now() || Date.now() - Date.parse(o.checkedAt) > 24 * 60 * 60 * 1000)) blockers.push("CURRENT_CHECK_TIMESTAMP_REQUIRED");
    if (o && (!/^prestigious-webtex:[a-z-]+:[A-Za-z0-9 -]+$/.test(o.sourceReference) || !Number.isFinite(Number(o.cutPriceGbp)) || Number(o.cutPriceGbp) <= 0)) blockers.push("PRICE_BASIS_OR_PROVENANCE_INVALID");
    if (r && o && r.source_effective_date && Date.parse(r.source_effective_date) > Date.parse(o.checkedAt)) blockers.push("NEWER_CANONICAL_EVIDENCE_PROTECTED");
    const latest = await db.from("supplier_snapshots").select("checked_at").eq("supplier_id", "prestigious-textiles").eq("supplier_sku", item.supplier_sku).eq("verification_status", "VERIFIED").order("checked_at", { ascending: false }).limit(1);
    if (latest.error) throw new Error("SUPPLIER_EVIDENCE_READ_FAILED");
    if (o && latest.data[0] && Date.parse(latest.data[0].checked_at) > Date.parse(o.checkedAt)) blockers.push("NEWER_COMMERCIAL_EVIDENCE_PROTECTED");
    if (!r || !o || !existing || blockers.length) { report.push({ fabricId: item.fabric_id, blockers }); continue; }
    const observationHash = createHash("sha256").update(JSON.stringify(o)).digest("hex");
    const snapshotId = `phase5h:${o.supplierSku}:${observationHash.slice(0,16)}`;
    let priceApproved = false;
    if (apply) {
      let saved = await repository.snapshot(snapshotId);
      if (!saved) {
        const snapshot = normalizeSupplierSnapshot({ snapshot_id: snapshotId, supplier_id: r.supplier_id, brand_id: r.brand_id, supplier_sku: r.supplier_sku, checked_at: o.checkedAt, standard_trade_price: o.standardPriceGbp, cut_trade_price: o.cutPriceGbp, currency: "GBP", stock_unit: "METRE", aggregate_available_quantity: null, batches: null, sample_available: o.sampleAvailable, lifecycle_state: o.lifecycle, source: { type: "MANUAL_PORTAL", name: "Phase 5H authorised Webtex verification; GBP per metre ex VAT", reference: o.sourceReference }, verification_status: "VERIFIED" });
        const run: DurableSupplierSyncRun = { run_id: snapshotId, supplier_id: r.supplier_id, adapter_id: "prestigious-manual-price", mode: "SHADOW", source_type: "MANUAL_PORTAL", source_name: snapshot.source.name, started_at: o.checkedAt, completed_at: o.checkedAt, status: "SUCCEEDED", snapshots_received: 1, snapshots_appended: 1, error_code: null, shopify_writes: 0, production_schedule_created: false };
        const ingested = await service.ingest({ run, snapshot, requiredPriceField: "CUT_TRADE_PRICE" });
        if (ingested.validation.status !== "VALIDATED") throw new Error("SUPPLIER_GOVERNANCE_VALIDATION_FAILED");
        saved = await repository.snapshot(snapshotId);
      }
      if (!saved || saved.validation_status !== "VALIDATED") throw new Error("SUPPLIER_SNAPSHOT_NOT_VALIDATED");
      const events = await db.from("supplier_promotion_events").select("promotion_state").eq("snapshot_id", snapshotId).order("created_at", { ascending: false }).limit(1);
      if (events.error) throw new Error("APPROVAL_READ_FAILED");
      if (events.data[0]?.promotion_state === "REJECTED" || events.data[0]?.promotion_state === "EXPIRED") throw new Error("EXISTING_REJECTION_PROTECTED");
      if (events.data[0]?.promotion_state !== "APPROVED_FOR_PROJECTION") await service.manuallyApprove({ snapshotId, approvedBy: operatorId, reason: "Codex operator, explicitly authorised by owner Phase 5H brief: exact Webtex SKU/design/colour and current unflagged listing verified; cut price GBP per metre ex VAT. No stock/batch or order approval implied." });
      const updated = await db.from("fabric_colourways").update({ lifecycle_state: "CURRENT", sample_available: o.sampleAvailable, source_type: "MANUAL_PORTAL", source_name: "Phase 5H authorised Webtex lifecycle verification", source_reference: o.sourceReference, source_effective_date: o.checkedAt.slice(0,10), updated_at: new Date().toISOString() }).eq("fabric_id", r.fabric_id).eq("updated_at", existing.updated_at).select("fabric_id");
      if (updated.error || updated.data.length !== 1) throw new Error("CANONICAL_REVISION_CHANGED");
      await promoteFabricForStagingProjection({ supplierId: r.supplier_id, supplierSku: r.supplier_sku, snapshotId });
      priceApproved = true;
    }
    report.push({ fabricId: r.fabric_id, supplierSku: r.supplier_sku, design: o.design, colour: o.colour, portalCollection: o.portalCollection, lifecycle: o.lifecycle, lifecycleBasis: o.lifecycleBasis, sampleAvailable: o.sampleAvailable, checkedAt: o.checkedAt, sourceReference: o.sourceReference, observationHash, snapshotId, operatorId, priceApproved, previousLifecycle: r.lifecycle_state, previousSourceDate: r.source_effective_date, blockers });
  }
  await writeFile(`${arg("report-prefix", "artifacts/phase5h/prestigious-verification")}-${apply ? "applied" : "preview"}.json`, JSON.stringify(report, null, 2) + "\n", "utf8");
  console.log(JSON.stringify({ checked: report.length, eligible: report.filter(r => !r.blockers.length).length, priceApproved: report.filter(r => "priceApproved" in r && r.priceApproved).length, blocked: report.filter(r => r.blockers.length).map(r => ({ fabricId: r.fabricId, blockers: r.blockers })) }));
}
main().catch(e => { console.error(e instanceof Error && /^[A-Z_]+$/.test(e.message) ? e.message : "VERIFICATION_OPERATION_FAILED"); process.exitCode = 1; });
