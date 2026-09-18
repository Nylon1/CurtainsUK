/** Prepare one-time, exact-SKU SDG Production stock packets from a fresh read-only report. No network/database access. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { validateSupplierIntelligenceSnapshot } from "../lib/supplier-intelligence/validation";
import { createValidationEvent } from "../lib/supplier-intelligence/promotion";
import type { PromotionEvent } from "../lib/supplier-intelligence/types";
import type { NormalizedSupplierSnapshot } from "../lib/supplier-sync/types";
import type { SdgStockDetail, SdgStockIdentity, SdgStockException } from "../lib/supplier-sync/adapters/sanderson-design-group";

type SourceReport = {
  complete: boolean; manifestCount: number; completedAt: string;
  full: { completedSkus: number; validMetreObservations: number;
    snapshots: NormalizedSupplierSnapshot[]; details: SdgStockDetail[]; exceptions: SdgStockException[] };
};
type PacketItem = { snapshot: NormalizedSupplierSnapshot & Record<string, unknown>; validation_event: PromotionEvent };

const supplier = "sanderson-design-group";
const actor = "554dcc42-4bb0-4db1-8ae8-d97413051548";
const sourceName = "SDG authenticated trade portal Product/detail";
const sqlJson = (value: unknown) => `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;
const sqlText = (value: string) => `'${value.replaceAll("'", "''")}'`;

async function main() {
  const reportPath = process.argv[2];
  if (!reportPath) throw new Error("FRESH_SDG_REPORT_PATH_REQUIRED");
  const reportText = await readFile(resolve(reportPath), "utf8");
  const report = JSON.parse(reportText) as SourceReport;
  const manifest = JSON.parse(await readFile("artifacts/sdg-portal-private/current-sdg-identities-2026-09-18.json", "utf8")) as SdgStockIdentity[];
  assert.equal(report.complete, true);
  assert.equal(report.manifestCount, 8636);
  assert.equal(report.full.completedSkus, 8636);
  assert.equal(report.full.snapshots.length, report.full.validMetreObservations);
  assert.equal(report.full.snapshots.length + report.full.exceptions.length, 8636);
  assert.equal(manifest.length, 8636);
  const manifestIds = new Set(manifest.map((v) => `${v.brandId}|${v.supplierSku}`));
  assert.equal(manifestIds.size, 8636);
  const reportSha256 = createHash("sha256").update(reportText).digest("hex");
  const now = new Date();
  const completed = new Date(report.completedAt);
  assert.ok(Number.isFinite(completed.valueOf()) && now.valueOf() - completed.valueOf() < 72 * 3600_000);
  const details = new Map(report.full.details.map((v) => [`${v.brandId}|${v.supplierSku}`, v]));
  const items: PacketItem[] = [];
  const seen = new Set<string>();
  for (const snapshot of report.full.snapshots) {
    const identity = `${snapshot.brand_id}|${snapshot.supplier_sku}`;
    assert.ok(manifestIds.has(identity) && !seen.has(identity), `INVALID_OR_DUPLICATE_IDENTITY:${identity}`);
    seen.add(identity);
    assert.equal(snapshot.supplier_id, supplier);
    assert.equal(snapshot.stock_unit, "METRE");
    assert.equal(snapshot.source.type, "MANUAL_PORTAL");
    assert.equal(snapshot.source.name, sourceName);
    assert.equal(snapshot.source.reference, `sdg:Product/detail:${snapshot.supplier_sku}`);
    assert.equal(snapshot.verification_status, "VERIFIED");
    assert.ok(typeof snapshot.aggregate_available_quantity === "number" && Number.isFinite(snapshot.aggregate_available_quantity) && snapshot.aggregate_available_quantity >= 0);
    assert.ok(Date.parse(snapshot.checked_at) <= completed.valueOf());
    const detail = details.get(identity);
    assert.ok(detail && detail.unit === "Metre", `DETAIL_MISSING_OR_WRONG_UNIT:${identity}`);
    assert.equal(detail.primaryMetres, snapshot.aggregate_available_quantity);
    const validation = validateSupplierIntelligenceSnapshot(snapshot, {
      known_supplier: true, known_sku: true, allowed_currencies: ["GBP"],
      allowed_stock_units: ["METRE"], required_price_field: "CUT_TRADE_PRICE", freshness_policies: [],
    }, now);
    assert.equal(validation.status, "VALIDATED", `${identity}:${validation.errors.join(",")}`);
    const normalized_payload = { ...snapshot, supplier_portal_detail: detail };
    const payload = {
      ...snapshot,
      source_type: snapshot.source.type,
      source_name: snapshot.source.name,
      source_reference: snapshot.source.reference,
      validation_status: validation.status,
      validation_errors: validation.errors,
      stock_expires_at: validation.stock_expires_at,
      price_expires_at: null,
      lifecycle_expires_at: null,
      normalized_payload,
    };
    items.push({ snapshot: payload, validation_event: createValidationEvent(snapshot.snapshot_id, validation, new Date(now.valueOf() - 1000).toISOString()) });
  }
  assert.equal(seen.size, 7861);
  const resolvedSkus = new Set(report.full.snapshots.map((v) => v.supplier_sku));
  assert.ok(report.full.exceptions.every((v) => !resolvedSkus.has(v.supplierSku)));
  const outDir = resolve("artifacts/sdg-portal-private/production-packets-2026-09-18");
  await mkdir(outDir, { recursive: true });
  const chunks: PacketItem[][] = [];
  for (let i = 0; i < items.length; i += 40) chunks.push(items.slice(i, i + 40));
  const reason = `Owner-authorised SDG Production stock promotion on 2026-09-18. Fresh authenticated exact-SKU portal read; source report SHA-256 ${reportSha256}. Current primary metres only; future and offsite stock preserved as separate evidence.`;
  for (let i = 0; i < chunks.length; i++) {
    const batch = chunks[i];
    const runId = `sdg-portal-production:${reportSha256.slice(0, 16)}:${String(i + 1).padStart(3, "0")}`;
    const checked = batch.map((v) => Date.parse(v.snapshot.checked_at));
    const run = {
      run_id: runId, supplier_id: supplier, adapter_id: "sdg-portal-product-detail",
      mode: "SHADOW", source_type: "MANUAL_PORTAL", source_name: sourceName,
      started_at: new Date(Math.min(...checked)).toISOString(), completed_at: new Date(Math.max(...checked)).toISOString(),
      status: "SUCCEEDED", snapshots_received: batch.length, snapshots_appended: batch.length,
      error_code: null, shopify_writes: 0, production_schedule_created: false,
    };
    for (const item of batch) item.snapshot.run_id = runId;
    const payload = batch.map((item) => ({ snapshot: item.snapshot, validation_event: item.validation_event }));
    const sql = `begin isolation level serializable;
set local role service_role;
set local lock_timeout = '5s';
set local statement_timeout = '120s';
do $stock$
declare input jsonb := ${sqlJson(payload)}; approved_count integer; scope jsonb; sub_scope jsonb; slice_index integer; result jsonb;
begin
 if (select count(*) from curtainsuk_private.fabric_colourways c join jsonb_array_elements(input) v on c.supplier_id=v.value->'snapshot'->>'supplier_id' and c.brand_id=v.value->'snapshot'->>'brand_id' and c.supplier_sku=v.value->'snapshot'->>'supplier_sku' and c.lifecycle_state in ('CURRENT','UNKNOWN')) <> ${batch.length} then raise exception 'SDG_EXACT_MASTER_IDENTITY_MISMATCH'; end if;
 if exists(select 1 from jsonb_array_elements(input) v left join curtainsuk_private.fabric_colourways c on c.supplier_id=v.value->'snapshot'->>'supplier_id' and c.brand_id=v.value->'snapshot'->>'brand_id' and c.supplier_sku=v.value->'snapshot'->>'supplier_sku' where c.fabric_id is null) then raise exception 'SDG_MASTER_IDENTITY_MISSING'; end if;
 if exists(select 1 from curtainsuk_private.supplier_snapshots where snapshot_id in (select jsonb_array_elements(input)->'snapshot'->>'snapshot_id')) then raise exception 'SDG_EVIDENCE_ALREADY_IMPORTED'; end if;
 perform curtainsuk_private.append_supplier_snapshot_batch(${sqlJson(run)}, input);
 insert into curtainsuk_private.supplier_promotion_events(event_id,snapshot_id,promotion_state,actor_type,actor_id,reason,rejection_reason,previous_approved_snapshot_id,created_at)
 select s.snapshot_id||':approval:'||to_char(now(),'YYYYMMDDHH24MISSMS'),s.snapshot_id,'APPROVED_FOR_PROJECTION','MANUAL_STAFF','${actor}'::uuid,${sqlText(reason)},null,
 (select prior.snapshot_id from curtainsuk_private.supplier_snapshots prior where prior.supplier_id=s.supplier_id and prior.supplier_sku=s.supplier_sku and prior.snapshot_id<>s.snapshot_id and (select e.promotion_state from curtainsuk_private.supplier_promotion_events e where e.snapshot_id=prior.snapshot_id order by e.created_at desc limit 1)='APPROVED_FOR_PROJECTION' order by prior.checked_at desc limit 1),now()
 from curtainsuk_private.supplier_snapshots s where s.snapshot_id in (select jsonb_array_elements(input)->'snapshot'->>'snapshot_id');
 get diagnostics approved_count = row_count;
 if approved_count <> ${batch.length} then raise exception 'SDG_APPROVAL_COUNT_MISMATCH'; end if;
 select jsonb_agg(jsonb_build_object('fabric_id',c.fabric_id,'supplier_id',c.supplier_id,'supplier_sku',c.supplier_sku,'snapshot_id',s.snapshot_id) order by c.fabric_id) into scope
 from curtainsuk_private.supplier_snapshots s join curtainsuk_private.fabric_colourways c on c.supplier_id=s.supplier_id and c.brand_id=s.brand_id and c.supplier_sku=s.supplier_sku
 where s.snapshot_id in (select jsonb_array_elements(input)->'snapshot'->>'snapshot_id');
 if jsonb_array_length(scope) <> ${batch.length} then raise exception 'SDG_SCOPE_COUNT_MISMATCH'; end if;
 for slice_index in 0..${Math.ceil(batch.length / 3) - 1} loop
  select jsonb_agg(value order by ordinality) into sub_scope from jsonb_array_elements(scope) with ordinality where ordinality > slice_index*3 and ordinality <= (slice_index+1)*3;
  result := curtainsuk_private.materialize_sdg_stock_canary(sub_scope,'${actor}'::uuid);
  if (result->>'rows_affected')::integer <> jsonb_array_length(sub_scope) then raise exception 'SDG_SCOPED_MATERIALISATION_COUNT_MISMATCH'; end if;
 end loop;
 if (select count(*) from curtainsuk_private.daily_stock_snapshots d join curtainsuk_private.supplier_snapshots s on s.snapshot_id=d.source_snapshot_id where s.snapshot_id in (select jsonb_array_elements(input)->'snapshot'->>'snapshot_id') and d.aggregate_metres=s.aggregate_available_quantity and d.checked_at=s.checked_at) <> ${batch.length} then raise exception 'SDG_MATERIALISED_EVIDENCE_MISMATCH'; end if;
end $stock$;
select ${i + 1} as packet, ${batch.length} as exact_observations, ${sqlText(reportSha256)} as source_report_sha256;
commit;
`;
    const name = `${String(i + 1).padStart(3, "0")}.sql`;
    await writeFile(resolve(outDir, name), sql, { mode: 0o600 });
  }
  await writeFile(resolve(outDir, "manifest.json"), JSON.stringify({ reportPath, reportSha256, expected: 8636, exactObservations: items.length, unknown: report.full.exceptions.length, packets: chunks.length, sourceCompletedAt: report.completedAt }, null, 2), { mode: 0o600 });
  console.log(JSON.stringify({ prepared: true, productionWrites: 0, reportSha256, packets: chunks.length, exactObservations: items.length, unknown: report.full.exceptions.length }));
}
main().catch((error) => { console.error(error instanceof Error ? error.message : "SDG_PACKET_PREPARATION_FAILED"); process.exitCode = 1; });
