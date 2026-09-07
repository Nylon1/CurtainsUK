import assert from "node:assert/strict";
import test from "node:test";
import type { FabricSpec } from "@/lib/decision-engine/types";
import { FABRIC_SPEC_FIXTURES } from "@/lib/decision-engine/seed/fabrics";
import { PrestigiousWebtexAdapter, PRESTIGIOUS_PRICE_VERIFIED_MOCHA_SKUS, PRESTIGIOUS_SUPPLIER_ID } from "../adapters/prestigious-webtex";
import type { SandersonDesignGroupAdapter } from "../adapters/sanderson-design-group";
import { evaluateSupplierAvailability } from "../availability";
import { InMemorySupplierSnapshotHistoryStore } from "../history-store";
import { normalizeSupplierSnapshot } from "../normalize";
import { runSupplierShadowSync } from "../orchestrator";
import { PRESTIGIOUS_SHADOW_INITIAL_SKUS, PRESTIGIOUS_SHADOW_PILOT_SKUS, validatePrestigiousPilotExpansion } from "../prestigious-pilot-gate";
import { resolveSupplierUnitCost } from "../pricing";
import type { NormalizedSupplierSnapshot, SupplierAdapter, SupplierFabricLink } from "../types";

const checkedAt = "2026-09-07T10:00:00.000Z";
const now = new Date("2026-09-07T12:00:00.000Z");

function snapshot(overrides: Partial<NormalizedSupplierSnapshot> = {}) {
  return normalizeSupplierSnapshot({
    supplier_id: "supplier-a",
    brand_id: "brand-a",
    supplier_sku: "SKU-1",
    checked_at: checkedAt,
    stock_unit: "METRE",
    aggregate_available_quantity: 20,
    batches: [{ batch_reference: "A", batch_available_quantity: 20, pieces: 1 }],
    lifecycle_state: "CURRENT",
    source: { type: "OFFICIAL_FEED", name: "Test feed", reference: null },
    verification_status: "VERIFIED",
    ...overrides,
  });
}

test("normalization preserves missing supplier fields as unknown", () => {
  const item = normalizeSupplierSnapshot({
    supplier_id: "supplier-a",
    supplier_sku: "SKU-UNKNOWN",
    checked_at: checkedAt,
    source: { type: "OTHER", name: "Partial source", reference: null },
  });
  assert.equal(item.standard_trade_price, null);
  assert.equal(item.cut_trade_price, null);
  assert.equal(item.stock_unit, null);
  assert.equal(item.aggregate_available_quantity, null);
  assert.equal(item.batches, null);
  assert.equal(item.sample_available, null);
  assert.equal(item.lifecycle_state, "UNKNOWN");
  assert.equal(item.verification_status, "UNVERIFIED");
});

test("Prestigious Webtex adapter runs the three verified Mocha SKUs in shadow mode", async () => {
  const adapter = new PrestigiousWebtexAdapter();
  const result = await adapter.readSnapshots({ requested_supplier_skus: PRESTIGIOUS_SHADOW_INITIAL_SKUS, requested_at: checkedAt });
  assert.equal(adapter.mode, "SHADOW");
  assert.equal(result.status, "SUCCESS");
  if (result.status !== "SUCCESS") return;
  assert.equal(result.snapshots.length, 3);
  assert.deepEqual(result.snapshots.map((item) => item.supplier_sku), [...PRESTIGIOUS_PRICE_VERIFIED_MOCHA_SKUS]);
  assert.ok(result.snapshots.every((item) => item.batches === null && item.sample_available === null));
  assert.equal(validatePrestigiousPilotExpansion(result.snapshots).missing_or_unverified_skus.length, 17);
});

test("shadow orchestration appends snapshots but cannot write Shopify or schedule production", async () => {
  const store = new InMemorySupplierSnapshotHistoryStore();
  const run = await runSupplierShadowSync(new PrestigiousWebtexAdapter(), store, { requested_supplier_skus: PRESTIGIOUS_SHADOW_INITIAL_SKUS, requested_at: checkedAt }, () => now);
  assert.equal(run.status, "SUCCEEDED");
  assert.equal(run.snapshots_appended, 3);
  assert.equal(run.shopify_writes, 0);
  assert.equal(run.production_schedule_created, false);
  assert.equal(store.history(PRESTIGIOUS_SUPPLIER_ID, "4269/147").length, 1);
});

test("the 20-colourway Prestigious expansion is gated on verified cut prices", () => {
  const complete = PRESTIGIOUS_SHADOW_PILOT_SKUS.map((sku, index) => normalizeSupplierSnapshot({
    snapshot_id: `pilot-${index}`,
    supplier_id: PRESTIGIOUS_SUPPLIER_ID,
    supplier_sku: sku,
    checked_at: checkedAt,
    cut_trade_price: "20.00",
    currency: "GBP",
    source: { type: "MANUAL_PORTAL", name: "Validation fixture", reference: null },
    verification_status: "VERIFIED",
  }));
  assert.equal(validatePrestigiousPilotExpansion(complete).eligible, true);
  assert.equal(validatePrestigiousPilotExpansion(complete.slice(0, 19)).eligible, false);
});

test("supplier history is append-only and retains price and availability changes", () => {
  const store = new InMemorySupplierSnapshotHistoryStore();
  const first = snapshot({ snapshot_id: "first", checked_at: "2026-09-07T09:00:00.000Z", cut_trade_price: "20.00", currency: "GBP" });
  const second = snapshot({ snapshot_id: "second", checked_at: "2026-09-07T10:00:00.000Z", cut_trade_price: "22.00", currency: "GBP", aggregate_available_quantity: 12, batches: [{ batch_reference: "B", batch_available_quantity: 12, pieces: 1 }] });
  store.appendMany([first]);
  store.appendMany([second]);
  const history = store.history("supplier-a", "SKU-1");
  assert.equal(history.length, 2);
  assert.equal(history[0].cut_trade_price, "20.00");
  assert.equal(history[1].cut_trade_price, "22.00");
  assert.equal(store.latestVerified("supplier-a", "SKU-1")?.snapshot_id, "second");
});

test("a failed sync never replaces a previously verified snapshot with out-of-stock", async () => {
  const store = new InMemorySupplierSnapshotHistoryStore();
  store.appendMany([snapshot({ snapshot_id: "known-good" })]);
  const failedAdapter: SupplierAdapter = {
    supplier_id: "supplier-a",
    mode: "SHADOW",
    async readSnapshots() { return { status: "FAILED", error_code: "UPSTREAM_UNAVAILABLE", retryable: true }; },
  };
  const run = await runSupplierShadowSync(failedAdapter, store, { requested_supplier_skus: ["SKU-1"], requested_at: checkedAt }, () => now);
  assert.equal(run.status, "FAILED");
  assert.equal(run.snapshots_appended, 0);
  assert.equal(store.history("supplier-a", "SKU-1").length, 1);
  assert.equal(evaluateSupplierAvailability(store.latestVerified("supplier-a", "SKU-1")!, { quantity: 10, stock_unit: "METRE" }, { now }).internal_state, "AVAILABLE");
});

test("availability requires a verified sufficient single batch", () => {
  assert.equal(evaluateSupplierAvailability(snapshot(), { quantity: 12, stock_unit: "METRE" }, { now }).internal_state, "AVAILABLE");
  const split = snapshot({ batches: [{ batch_reference: "A", batch_available_quantity: 7, pieces: 1 }, { batch_reference: "B", batch_available_quantity: 7, pieces: 1 }], aggregate_available_quantity: 14 });
  assert.equal(evaluateSupplierAvailability(split, { quantity: 12, stock_unit: "METRE" }, { now }).internal_state, "INSUFFICIENT_SINGLE_BATCH");
  const aggregateOnly = snapshot({ batches: null, aggregate_available_quantity: 100 });
  assert.equal(evaluateSupplierAvailability(aggregateOnly, { quantity: 12, stock_unit: "METRE" }, { now }).internal_state, "UNKNOWN");
  const stale = snapshot({ checked_at: "2026-09-05T10:00:00.000Z" });
  assert.equal(evaluateSupplierAvailability(stale, { quantity: 12, stock_unit: "METRE" }, { now }).internal_state, "UNKNOWN");
});

test("pricing selects the configured normalized price field without supplier assumptions", () => {
  const priced = snapshot({ standard_trade_price: "18.25", cut_trade_price: "22.50", currency: "GBP" });
  assert.equal(resolveSupplierUnitCost(priced, { price_field: "STANDARD_TRADE_PRICE", require_verified_snapshot: true }).amountMinor, 1825);
  assert.equal(resolveSupplierUnitCost(priced, { price_field: "CUT_TRADE_PRICE", require_verified_snapshot: true }).amountMinor, 2250);
});

test("a future Sanderson adapter uses the same FabricSpec link and availability engine", () => {
  const fabric: FabricSpec = { ...structuredClone(FABRIC_SPEC_FIXTURES[0]), id: "sdg-fabric-1", supplier: "Sanderson Design Group", supplierReference: "SDG-100/BLUE", uniqueSku: "SDG-100/BLUE" };
  const link: SupplierFabricLink = { fabric_spec_id: fabric.id, supplier_id: "sanderson-design-group", brand_id: "sanderson", supplier_sku: fabric.uniqueSku };
  const sandersonSnapshot = snapshot({ supplier_id: link.supplier_id, brand_id: link.brand_id, supplier_sku: link.supplier_sku });
  assert.equal(evaluateSupplierAvailability(sandersonSnapshot, { quantity: 10, stock_unit: "METRE" }, { now }).internal_state, "AVAILABLE");
  const futureAdapter: SandersonDesignGroupAdapter | null = null;
  assert.equal(futureAdapter, null);
});
