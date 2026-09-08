import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { normalizeSupplierSnapshot } from "@/lib/supplier-sync/normalize";
import type { NormalizedSupplierSnapshot } from "@/lib/supplier-sync/types";
import { hasSupplierAdminRole } from "../authz";
import { buildSupplierHealthReport } from "../health";
import { InMemorySupplierIntelligenceRepository } from "../memory-repository";
import { SupplierIntelligenceService } from "../service";
import type { DurableSupplierSyncRun, SupplierApprovalPolicy, SupplierCatalogLink, SupplierFreshnessPolicy } from "../types";

const supplierId = "prestigious-textiles";
const sku = "4269/147";
const checkedAt = "2026-09-07T10:00:00.000Z";
const now = new Date("2026-09-07T12:00:00.000Z");
const staffId = "00000000-0000-4000-8000-000000000001";

const freshness: SupplierFreshnessPolicy[] = [
  { policy_id: "stock-v1", supplier_id: supplierId, source_type: "MANUAL_PORTAL", data_type: "STOCK", freshness_minutes: 1440, effective_from: "2026-01-01T00:00:00.000Z" },
  { policy_id: "price-v1", supplier_id: supplierId, source_type: "MANUAL_PORTAL", data_type: "PRICE", freshness_minutes: 10080, effective_from: "2026-01-01T00:00:00.000Z" },
  { policy_id: "lifecycle-v1", supplier_id: supplierId, source_type: "MANUAL_PORTAL", data_type: "LIFECYCLE", freshness_minutes: 4320, effective_from: "2026-01-01T00:00:00.000Z" },
];

const links: SupplierCatalogLink[] = [
  { supplier_id: supplierId, supplier_sku: sku, brand_id: supplierId, fabric_spec_id: "pt-4269-147", price_verification_status: "VERIFIED" },
];

const approval: SupplierApprovalPolicy[] = [
  { policy_id: "manual-v1", supplier_id: supplierId, approval_mode: "MANUAL", required_price_field: "CUT_TRADE_PRICE", effective_from: "2026-01-01T00:00:00.000Z" },
];

function repository(overrides: { supplier?: string; sku?: string } = {}) {
  const selectedSupplier = overrides.supplier ?? supplierId;
  const selectedSku = overrides.sku ?? sku;
  return new InMemorySupplierIntelligenceRepository({
    suppliers: [selectedSupplier],
    links: [{ ...links[0], supplier_id: selectedSupplier, supplier_sku: selectedSku, fabric_spec_id: `${selectedSupplier}-fabric` }],
    freshness: freshness.map((policy) => ({ ...policy, supplier_id: selectedSupplier })),
    approval: approval.map((policy) => ({ ...policy, supplier_id: selectedSupplier })),
  });
}

function snapshot(id: string, overrides: Partial<NormalizedSupplierSnapshot> = {}) {
  return normalizeSupplierSnapshot({
    snapshot_id: id,
    supplier_id: supplierId,
    brand_id: supplierId,
    supplier_sku: sku,
    checked_at: checkedAt,
    standard_trade_price: "17.25",
    cut_trade_price: "21.75",
    currency: "GBP",
    stock_unit: "METRE",
    aggregate_available_quantity: 20,
    batches: [{ batch_reference: "LOT-A", batch_available_quantity: 20, pieces: 1 }],
    next_due_date: null,
    next_due_quantity: null,
    sample_available: null,
    lifecycle_state: "CURRENT",
    source: { type: "MANUAL_PORTAL", name: "Manual supplier check", reference: null },
    verification_status: "VERIFIED",
    ...overrides,
  });
}

function run(id: string, status: "SUCCEEDED" | "FAILED" = "SUCCEEDED"): DurableSupplierSyncRun {
  return {
    run_id: id,
    supplier_id: supplierId,
    adapter_id: "prestigious-webtex",
    mode: "SHADOW",
    source_type: "MANUAL_PORTAL",
    source_name: "Manual supplier check",
    started_at: now.toISOString(),
    completed_at: now.toISOString(),
    status,
    snapshots_received: status === "SUCCEEDED" ? 1 : 0,
    snapshots_appended: status === "SUCCEEDED" ? 1 : 0,
    error_code: status === "FAILED" ? "UPSTREAM_UNAVAILABLE" : null,
    shopify_writes: 0,
    production_schedule_created: false,
  };
}

test("durable writes are append-only and retain historical reconstruction", async () => {
  const repo = repository();
  const service = new SupplierIntelligenceService(repo);
  await service.ingest({ run: run("run-1"), snapshot: snapshot("snapshot-1"), requiredPriceField: "CUT_TRADE_PRICE", now });
  await service.ingest({ run: run("run-2"), snapshot: snapshot("snapshot-2", { checked_at: "2026-09-07T11:00:00.000Z", cut_trade_price: "23.00" }), requiredPriceField: "CUT_TRADE_PRICE", now });
  const data = await repo.dataset(supplierId);
  assert.equal(data.snapshots.length, 2);
  assert.deepEqual(data.snapshots.map((item) => item.cut_trade_price), ["21.75", "23.00"]);
  await assert.rejects(() => service.ingest({ run: run("run-3"), snapshot: snapshot("snapshot-2"), requiredPriceField: "CUT_TRADE_PRICE", now }), /APPEND_ONLY_CONFLICT/);
});

test("validation failures are retained and cannot enter approval", async () => {
  const repo = repository();
  const service = new SupplierIntelligenceService(repo);
  const result = await service.ingest({ run: run("invalid-run"), snapshot: snapshot("invalid", { aggregate_available_quantity: -1 }), requiredPriceField: "CUT_TRADE_PRICE", now });
  assert.equal(result.validation.status, "FAILED");
  assert.ok(result.validation.errors.some((error) => error.includes("aggregate_available_quantity")));
  assert.equal((await repo.snapshot("invalid"))?.validation_status, "FAILED");
  await assert.rejects(() => service.manuallyApprove({ snapshotId: "invalid", approvedBy: staffId, reason: "Should remain blocked", approvedAt: now }), /SNAPSHOT_VALIDATION_REQUIRED/);
});

test("manual approval and rejection append attributed decision events", async () => {
  const repo = repository();
  const service = new SupplierIntelligenceService(repo);
  await service.ingest({ run: run("approval-run"), snapshot: snapshot("approval-snapshot"), requiredPriceField: "CUT_TRADE_PRICE", now });
  const approved = await service.manuallyApprove({ snapshotId: "approval-snapshot", approvedBy: staffId, reason: "Checked against the supplier portal", approvedAt: now });
  assert.equal(approved.promotion_state, "APPROVED_FOR_PROJECTION");
  assert.equal(approved.actor_id, staffId);
  const rejected = await service.manuallyReject({ snapshotId: "approval-snapshot", rejectedBy: staffId, reason: "Subsequent manual concern", rejectedAt: new Date("2026-09-07T13:00:00.000Z") });
  assert.equal(rejected.promotion_state, "REJECTED");
  assert.equal(rejected.rejection_reason, "Subsequent manual concern");
});

test("a later approval links to the previous approved snapshot", async () => {
  const repo = repository();
  const service = new SupplierIntelligenceService(repo);
  await service.ingest({ run: run("previous-run"), snapshot: snapshot("previous"), requiredPriceField: "CUT_TRADE_PRICE", now });
  await service.manuallyApprove({ snapshotId: "previous", approvedBy: staffId, reason: "First approval", approvedAt: now });
  await service.ingest({ run: run("current-run"), snapshot: snapshot("current", { checked_at: "2026-09-07T12:30:00.000Z" }), requiredPriceField: "CUT_TRADE_PRICE", now: new Date("2026-09-07T13:00:00.000Z") });
  const current = await service.manuallyApprove({ snapshotId: "current", approvedBy: staffId, reason: "Replacement approval", approvedAt: new Date("2026-09-07T13:00:00.000Z") });
  assert.equal(current.previous_approved_snapshot_id, "previous");
});

test("expiration and stale supplier state project availability to be confirmed", async () => {
  const repo = repository();
  const service = new SupplierIntelligenceService(repo);
  await service.ingest({ run: run("expiry-run"), snapshot: snapshot("expiry"), requiredPriceField: "CUT_TRADE_PRICE", now });
  await service.manuallyApprove({ snapshotId: "expiry", approvedBy: staffId, reason: "Fresh at approval", approvedAt: now });
  const fresh = await service.projection({ supplierId, supplierSku: sku, requirement: { quantity: 10, stock_unit: "METRE" }, now });
  assert.equal(fresh.availability, "FABRIC_AVAILABLE");
  const expiredAt = new Date("2026-09-08T10:00:01.000Z");
  const expired = await service.projection({ supplierId, supplierSku: sku, requirement: { quantity: 10, stock_unit: "METRE" }, now: expiredAt });
  assert.equal(expired.availability, "AVAILABILITY_TO_BE_CONFIRMED");
  assert.equal(expired.promotion_state, "EXPIRED");
  assert.deepEqual((await service.health(supplierId, expiredAt)).stale_skus, [sku]);
});

test("a failed sync preserves the previous approval until it expires", async () => {
  const repo = repository();
  const service = new SupplierIntelligenceService(repo);
  await service.ingest({ run: run("good-run"), snapshot: snapshot("known-good"), requiredPriceField: "CUT_TRADE_PRICE", now });
  await service.manuallyApprove({ snapshotId: "known-good", approvedBy: staffId, reason: "Known-good observation", approvedAt: now });
  await service.recordFailedRun(run("failed-run", "FAILED"));
  const stillGood = await service.projection({ supplierId, supplierSku: sku, requirement: { quantity: 10, stock_unit: "METRE" }, now: new Date("2026-09-07T13:00:00.000Z") });
  assert.equal(stillGood.availability, "FABRIC_AVAILABLE");
  const health = await service.health(supplierId, now);
  assert.equal(health.last_failed_run?.run_id, "failed-run");
  assert.equal((await repo.dataset(supplierId)).snapshots.length, 1);
});

test("batch-level projection does not combine incompatible dye lots", async () => {
  const repo = repository();
  const service = new SupplierIntelligenceService(repo);
  const split = snapshot("split", { aggregate_available_quantity: 14, batches: [{ batch_reference: "A", batch_available_quantity: 7, pieces: 1 }, { batch_reference: "B", batch_available_quantity: 7, pieces: 1 }] });
  await service.ingest({ run: run("split-run"), snapshot: split, requiredPriceField: "CUT_TRADE_PRICE", now });
  await service.manuallyApprove({ snapshotId: "split", approvedBy: staffId, reason: "Valid data but split batches", approvedAt: now });
  const projection = await service.projection({ supplierId, supplierSku: sku, requirement: { quantity: 12, stock_unit: "METRE" }, now });
  assert.equal(projection.availability, "AVAILABILITY_TO_BE_CONFIRMED");
});

test("health reports price, stock, due-date and lifecycle transitions", async () => {
  const repo = repository();
  const service = new SupplierIntelligenceService(repo);
  await service.ingest({ run: run("history-1"), snapshot: snapshot("history-1", { aggregate_available_quantity: 30, next_due_date: "2026-09-20", next_due_quantity: 20 }), requiredPriceField: "CUT_TRADE_PRICE", now });
  await service.ingest({ run: run("history-2"), snapshot: snapshot("history-2", { checked_at: "2026-09-07T11:00:00.000Z", cut_trade_price: "23.00", aggregate_available_quantity: 0, batches: [], next_due_date: "2026-09-25", next_due_quantity: 40, lifecycle_state: "DISCONTINUED" }), requiredPriceField: "CUT_TRADE_PRICE", now });
  const data = await repo.dataset(supplierId);
  const health = buildSupplierHealthReport(data, { supplierId, now, lowStockThresholdBySupplier: { [supplierId]: 10 } });
  assert.equal(health.price_increases.length, 1);
  assert.equal(health.newly_unavailable.length, 1);
  assert.equal(health.next_due_changes.length, 1);
  assert.equal(health.newly_discontinued.length, 1);
});

test("Sanderson uses the same durable storage and approval service", async () => {
  const sandersonId = "sanderson-design-group";
  const sandersonSku = "SDG-100/BLUE";
  const repo = repository({ supplier: sandersonId, sku: sandersonSku });
  const service = new SupplierIntelligenceService(repo);
  const item = snapshot("sanderson-1", { supplier_id: sandersonId, brand_id: "sanderson", supplier_sku: sandersonSku });
  await service.ingest({ run: { ...run("sanderson-run"), supplier_id: sandersonId, adapter_id: "sanderson-future" }, snapshot: item, requiredPriceField: "CUT_TRADE_PRICE", now });
  assert.equal((await repo.dataset(sandersonId)).snapshots[0].supplier_id, sandersonId);
});

test("customer-safe projection contains no supplier-commercial fields", async () => {
  const repo = repository();
  const service = new SupplierIntelligenceService(repo);
  await service.ingest({ run: run("privacy-run"), snapshot: snapshot("privacy"), requiredPriceField: "CUT_TRADE_PRICE", now });
  await service.manuallyApprove({ snapshotId: "privacy", approvedBy: staffId, reason: "Privacy test", approvedAt: now });
  const serialised = JSON.stringify(await service.projection({ supplierId, supplierSku: sku, requirement: { quantity: 10, stock_unit: "METRE" }, now }));
  assert.equal(/trade|price|cost|quantity|batch|metres|pieces|credential/i.test(serialised), false);
});

test("service access is role-gated and database grants deny browser roles", () => {
  assert.equal(hasSupplierAdminRole({ roles: ["SUPPLIER_ADMIN"] }), true);
  assert.equal(hasSupplierAdminRole({ roles: ["EDITOR"] }), false);
  const migration = readFileSync(path.join(process.cwd(), "supabase/migrations/20260907043049_supplier_intelligence_approval_gate.sql"), "utf8");
  const client = readFileSync(path.join(process.cwd(), "lib/supabase/supplier-service.ts"), "utf8");
  const auth = readFileSync(path.join(process.cwd(), "lib/supplier-intelligence/server-auth.ts"), "utf8");
  assert.match(migration, /revoke all on all tables in schema curtainsuk_private from public, anon, authenticated/i);
  assert.match(migration, /grant select, insert on all tables in schema curtainsuk_private to service_role/i);
  assert.match(migration, /alter default privileges in schema curtainsuk_private revoke all on tables from public, anon, authenticated/i);
  assert.match(migration, /create table curtainsuk_private\.supplier_validation_policies/i);
  assert.doesNotMatch(migration, /grant\s+(select|insert|update|delete).*to\s+(anon|authenticated)/i);
  assert.doesNotMatch(migration, /pt-4269-147-20260906|phase4c-webtex-bootstrap|"cut_trade_price":"/i);
  assert.match(client, /SUPABASE_SECRET_KEY/);
  assert.doesNotMatch(client, /NEXT_PUBLIC_SUPABASE_(SECRET|SERVICE)/);
  assert.match(auth, /user\.app_metadata/);
  assert.doesNotMatch(auth, /user_metadata/);
});


test("supplier timeout and temporary database failure retain last approved availability without inventing out-of-stock", async () => {
  const repo=repository(), service=new SupplierIntelligenceService(repo);
  await service.ingest({run:run("recovery-run"),snapshot:snapshot("recovery-snapshot"),requiredPriceField:"CUT_TRADE_PRICE",now});
  await service.manuallyApprove({snapshotId:"recovery-snapshot",approvedBy:staffId,reason:"Staging recovery fixture approved",approvedAt:now});
  const request={supplierId,supplierSku:sku,requirement:{quantity:10,stock_unit:"METRE" as const},now};
  const original=await repo.dataset(supplierId), good=await service.projection(request);
  assert.equal(good.availability,"FABRIC_AVAILABLE");
  await service.recordFailedRun(run("timeout-run","FAILED"));
  assert.deepEqual(await service.projection(request),good);
  const readDataset=repo.dataset.bind(repo);
  repo.dataset=async()=>{throw new Error("DATABASE_TIMEOUT");};
  await assert.rejects(service.projection(request),/DATABASE_TIMEOUT/);
  repo.dataset=readDataset;
  assert.deepEqual(await service.projection(request),good);
  const recovered=await repo.dataset(supplierId);
  assert.deepEqual(recovered.snapshots,original.snapshots);
  assert.deepEqual(recovered.promotion_events,original.promotion_events);
});
