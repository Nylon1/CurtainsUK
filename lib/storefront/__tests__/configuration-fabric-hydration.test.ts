import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = readFileSync(join(process.cwd(), "lib", "storefront", "shopify-database-contract.ts"), "utf8");

test("a direct Fabric Master reference uses the authoritative configuration projection, not retail editorial readiness", () => {
  assert.match(source, /resolveConfigurationFabric/);
  assert.match(source, /fabricMasterRecordById\(fabricId\)/);
  assert.match(source, /commercialReadiness\(\[record\]\)/);
  assert.match(source, /FABRIC_REFERENCE_INVALID/);
  assert.match(source, /requestedFabric/);
  assert.match(source, /if \(fabricId\) \{/);
  assert.match(source, /fabrics\.splice\(existingIndex, 1, requestedFabric\.fabric\)/);
  assert.doesNotMatch(source, /retailFabricDetail\(fabricId\)/);
});

test("the configuration hydration response never contains supplier-commercial data", () => {
  assert.match(source, /supplierSku: _supplierSku/);
  assert.match(source, /assertCustomerSafeProjection\(fabric\)/);
  assert.match(source, /assertCustomerSafeProjection\(fabrics\)/);
});
