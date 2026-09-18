import assert from "node:assert/strict";
import test from "node:test";
import { assertProvenSdgCoverage, nextSdgRefreshAt } from "../sdg-routine-policy";
import type { SdgStockIdentity, SdgStockReadResult } from "../adapters/sanderson-design-group";
import type { NormalizedSupplierSnapshot } from "../types";

test("the next refresh is due after 72 hours, leaving a 24-hour freshness recovery window", () => {
  assert.equal(nextSdgRefreshAt("2026-09-18T18:11:20.259Z").toISOString(), "2026-09-21T18:11:20.259Z");
});

test("exact five-brand stock and unresolved Zoffany pass; identity or coverage drift fails closed", () => {
  const identities: SdgStockIdentity[] = Array.from({ length: 7861 }, (_, i) => ({ supplierSku: `F${i}`, brandId: "sdg-sanderson" }))
    .concat(Array.from({ length: 775 }, (_, i) => ({ supplierSku: `Z${i}`, brandId: "sdg-zoffany" })));
  const snapshots = identities.slice(0, 7861).map((item) => ({ supplier_sku: item.supplierSku, brand_id: item.brandId })) as NormalizedSupplierSnapshot[];
  const exceptions = identities.slice(7861).map((item) => ({ supplierSku: item.supplierSku, reason: "MISSING_PORTAL_SKU" }));
  const result = { requested: 8636, snapshots, exceptions, details: [], batches: [] } as SdgStockReadResult;
  assert.doesNotThrow(() => assertProvenSdgCoverage(identities, result));
  assert.throws(() => assertProvenSdgCoverage(identities, { ...result, snapshots: snapshots.slice(1) }), /SDG_COVERAGE_CHANGED/);
  assert.throws(() => assertProvenSdgCoverage(identities, { ...result, exceptions: [{ supplierSku: "F0", reason: "ERROR" }, ...exceptions.slice(1)] }), /SDG_UNRESOLVED_IDENTITY_CHANGED/);
  assert.throws(() => assertProvenSdgCoverage(identities, { ...result, snapshots: [{ ...snapshots[0], brand_id: "sdg-zoffany" }, ...snapshots.slice(1)] }), /SDG_RESOLVED_IDENTITY_CHANGED/);
});
