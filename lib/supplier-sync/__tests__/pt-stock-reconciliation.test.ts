import test from "node:test";
import assert from "node:assert/strict";
import { assertProvenPtCoverage, PT_EXPECTED_IDENTITIES, PT_PROVEN_MINIMUM, PT_PRIOR_UNKNOWN_SKUS, reconcilePtStock, nextPtRefreshAt, type PtIdentity, type PtStockRow } from "../pt-stock-reconciliation";

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

test("normal PT refresh accepts the reconciled 3,235-master full catalogue", () => {
  assert.equal(PT_EXPECTED_IDENTITIES, 3235);
  assert.equal(PT_PROVEN_MINIMUM, 3230);
  const full = Array.from({ length: PT_EXPECTED_IDENTITIES }, (_, index): PtIdentity => ({
    supplierSku: `${String(1000 + Math.floor(index / 1000)).padStart(4, "0")}/${String(index % 1000).padStart(3, "0")}`,
    collection: "Full manifest", brandId: "prestigious-textiles", lifecycleState: "CURRENT",
  }));
  [...PT_PRIOR_UNKNOWN_SKUS].forEach((sku, index) => { full[index] = { ...full[index], supplierSku: sku }; });
  const rows = full.slice(5).map((item): PtStockRow => ({ ...row(item.supplierSku, "1 M"), queryValue: "Full manifest" }));
  const result = reconcilePtStock(full, rows);
  assert.doesNotThrow(() => assertProvenPtCoverage(full, result));
  assert.equal(result.snapshots.length, 3230);
  assert.deepEqual(new Set(result.exceptions.map(item => item.sku)), PT_PRIOR_UNKNOWN_SKUS);
  assert.ok(result.snapshots.every(snapshot => !PT_PRIOR_UNKNOWN_SKUS.has(snapshot.supplier_sku)));
  // A new missing SKU must still stop the whole refresh, even if one known
  // exception recovers and the overall numeric coverage remains sufficient.
  const unexpected = reconcilePtStock(full, [...rows.slice(1), row(full[0].supplierSku, "1 M")]);
  assert.equal(unexpected.snapshots.length, 3230);
  assert.throws(() => assertProvenPtCoverage(full, unexpected), /PT_COVERAGE_CHANGED/);
});
