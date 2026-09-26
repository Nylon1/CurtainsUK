import test from "node:test";
import assert from "node:assert/strict";
import { parsePtCohortSkus, reconcilePtStock, nextPtRefreshAt, type PtIdentity, type PtStockRow } from "../pt-stock-reconciliation";

const identities: PtIdentity[] = [
  { supplierSku: "4262/770", collection: "Rustic Persian", brandId: "prestigious-textiles", lifecycleState: "CURRENT" },
  { supplierSku: "4264/162", collection: "Rustic Persian", brandId: "prestigious-textiles", lifecycleState: "CURRENT" },
  { supplierSku: "3622/282", collection: "Elysium", brandId: "prestigious-textiles", lifecycleState: "CURRENT" },
];
const at = new Date(Date.now() - 1000).toISOString();
const row = (sku: string, stockText: string, queryValue = "Rustic Persian", indicator = ""): PtStockRow => ({
  sku, stockText, indicator, observedAt: at, queryType: "COLLECTION", queryValue,
});

test("exact PT SKU and metre evidence; extra collection results cannot enter Fabric Master", () => {
  const result = reconcilePtStock(identities, [row("4262/770", "295 M"), row("4264/162", "1 M"), row("9999/999", "800 M")]);
  assert.equal(result.snapshots.length, 2);
  assert.equal(result.snapshots.find((item) => item.supplier_sku === "4262/770")?.aggregate_available_quantity, 295);
  assert.equal(result.snapshots.find((item) => item.supplier_sku === "4264/162")?.aggregate_available_quantity, 1);
  assert.deepEqual(result.exceptions, [{ sku: "3622/282", reason: "NOT_FOUND_IN_AUTHENTICATED_WEBTEX" }]);
});

test("overlap with same quantity is deduplicated; conflicting quantity quarantines SKU", () => {
  const same = reconcilePtStock(identities, [row("4262/770", "295 M"), row("4262/770", "295 M", "Rustic")]);
  assert.equal(same.snapshots.length, 1);
  assert.equal(same.overlapCount, 1);
  const conflicting = reconcilePtStock(identities, [row("4262/770", "295 M"), row("4262/770", "294 M", "Rustic")]);
  assert.equal(conflicting.snapshots.length, 0);
  assert.equal(conflicting.exceptions.find((item) => item.sku === "4262/770")?.reason, "CONFLICTING_SUPPLIER_QUANTITIES");
});

test("explicit zero is retained; invalid units and discontinued supplier flag remain unknown", () => {
  const result = reconcilePtStock(identities, [row("4262/770", "0 M"), row("4264/162", "1 Roll"), row("3622/282", "50 M", "Elysium", "D")]);
  assert.equal(result.snapshots[0].aggregate_available_quantity, 0);
  assert.equal(result.exceptions.length, 2);
  assert.equal(result.exceptions.find((item) => item.sku === "4264/162")?.reason, "INVALID_METRE_EVIDENCE");
  assert.equal(result.exceptions.find((item) => item.sku === "3622/282")?.reason, "SUPPLIER_DISCONTINUED_FLAG");
});

test("PT routine due interval remains 72 hours", () => {
  assert.equal(nextPtRefreshAt("2026-09-18T00:00:00.000Z").toISOString(), "2026-09-21T00:00:00.000Z");
});

test("explicit cohort retains valid exact observations and isolates only unsupported SKUs", () => {
  assert.deepEqual(parsePtCohortSkus("4262/770,4264/162"), ["4262/770", "4264/162"]);
  assert.throws(() => parsePtCohortSkus("4262/770,4262/770"), /PT_COHORT_DUPLICATE_SKU/);
  assert.throws(() => parsePtCohortSkus("invalid"), /PT_COHORT_SKU_INVALID/);
  const partial = reconcilePtStock(identities, [row("4262/770", "295 M"), row("4264/162", "10 M")]);
  assert.deepEqual(partial.snapshots.map((item) => item.supplier_sku), ["4262/770", "4264/162"]);
  assert.deepEqual(partial.exceptions, [{ sku: "3622/282", reason: "NOT_FOUND_IN_AUTHENTICATED_WEBTEX" }]);
});
