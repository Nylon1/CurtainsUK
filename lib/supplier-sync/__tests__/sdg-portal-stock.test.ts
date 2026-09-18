import assert from "node:assert/strict";
import test from "node:test";
import { readSdgPortalStock, SDG_PORTAL_DETAIL_URL } from "../adapters/sanderson-design-group";
import { validateSupplierIntelligenceSnapshot } from "../../supplier-intelligence/validation";

const now = new Date("2026-09-18T14:00:00.000Z");
const identities = [
  { supplierSku: "F0063/02", brandId: "clarke-and-clarke" },
  { supplierSku: "F0650/12", brandId: "clarke-and-clarke" },
];

test("portal details become exact stock-only observations through the existing 72-hour validator", async () => {
  let request: RequestInit | undefined;
  const result = await readSdgPortalStock({
    identities,
    bearerToken: "test-token",
    clock: () => now,
    fetchImpl: async (url, init) => {
      assert.equal(url, SDG_PORTAL_DETAIL_URL);
      request = init;
      return Response.json([
        { productCode: "F0063/02", productStockUnit: "Metres", stockInformation: { primaryStock: 385.6 } },
        { productCode: "F0650/12", productStockUnit: "Metres", stockInformation: { primaryStock: 0 } },
      ]);
    },
  });
  assert.equal(request?.method, "POST");
  assert.deepEqual(JSON.parse(String(request?.body)).productCriteria.map((item: { productCode: string }) => item.productCode), identities.map((item) => item.supplierSku));
  assert.equal(result.snapshots.length, 2);
  assert.deepEqual(result.snapshots.map((item) => item.aggregate_available_quantity), [385.6, 0]);
  assert.equal(result.snapshots[0].standard_trade_price, null);
  assert.equal(result.snapshots[0].sample_available, null);
  assert.equal(result.exceptions.length, 0);
  const validated = validateSupplierIntelligenceSnapshot(result.snapshots[0], {
    known_supplier: true, known_sku: true, allowed_currencies: ["GBP"], allowed_stock_units: ["METRE"], required_price_field: "CUT_TRADE_PRICE", freshness_policies: [],
  }, now);
  assert.equal(validated.status, "VALIDATED");
  assert.equal(validated.stock_expires_at, "2026-09-21T14:00:00.000Z");
});

test("missing, ambiguous and non-metre stock fail closed without converting absence to zero", async () => {
  const result = await readSdgPortalStock({
    identities: [...identities, { supplierSku: "F0419/04", brandId: "clarke-and-clarke" }], bearerToken: "test-token", clock: () => now,
    fetchImpl: async () => Response.json([
      { productCode: "F0063/02", productStockUnit: "Metres", stockInformation: {} },
      { productCode: "F0650/12", productStockUnit: "Roll", stockInformation: { primaryStock: 12 } },
    ]),
  });
  assert.equal(result.snapshots.length, 0);
  assert.deepEqual(result.exceptions.map((item) => item.reason), ["MISSING_STOCK_OR_NON_METRE_UNIT", "MISSING_STOCK_OR_NON_METRE_UNIT", "MISSING_PORTAL_SKU"]);
});

test("supplier authentication, throttling and unexpected identities stop the read", async () => {
  for (const [status, code] of [[401, "SDG_PORTAL_AUTH_FAILED"], [429, "SDG_PORTAL_RATE_LIMITED"]] as const) {
    await assert.rejects(readSdgPortalStock({ identities, bearerToken: "test-token", fetchImpl: async () => new Response(null, { status }) }), new RegExp(code));
  }
  await assert.rejects(readSdgPortalStock({ identities, bearerToken: "test-token", fetchImpl: async () => Response.json([{ productCode: "OTHER", productStockUnit: "Metres", stockInformation: { primaryStock: 100 } }]) }), /SDG_PORTAL_UNREQUESTED_SKU/);
});

test("portal requests are bounded to 100 exact SKUs per batch", async () => {
  const sizes: number[] = [];
  const many = Array.from({ length: 101 }, (_, index) => ({ supplierSku: `SKU-${index}`, brandId: "sdg" }));
  const result = await readSdgPortalStock({
    identities: many, bearerToken: "test-token", clock: () => now,
    fetchImpl: async (_url, init) => {
      const criteria = JSON.parse(String(init?.body)).productCriteria as { productCode: string }[];
      sizes.push(criteria.length);
      return Response.json(criteria.map((item) => ({ productCode: item.productCode, productStockUnit: "Metre", stockInformation: { primaryStock: 1 } })));
    },
  });
  assert.deepEqual(sizes, [100, 1]);
  assert.equal(result.snapshots.length, 101);
});
