import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildCatalogueImport } from "../catalogue-normalization";
import { toDecisionEngineFabric } from "../decision-engine";
import { normalizePrestigiousFormationRows } from "../prestigious";
import { assertCustomerSafeProjection, projectCustomerSafeFabric } from "../projection";
import { normalizeSandersonRows } from "../sanderson";

const prestigiousRows = [{
  Title: "ESCHER",
  Tags: "Formation%20Collection",
  "Option1%20Value": "MOCHA",
  "Variant%20SKU": "4269/147",
  "Image%20Src": "https://www.prestigious.co.uk/assets/collections/4269%20escher/4269-147%20escher%20mocha.jpg",
}];

test("Prestigious catalogue normalization preserves permanent IDs and corrected public specifications", () => {
  const [record] = normalizePrestigiousFormationRows(prestigiousRows);
  assert.equal(record.fabric_id, "pt-4269-147");
  assert.equal(record.supplier_sku, "4269/147");
  assert.equal(record.full_width_mm, 1420);
  assert.equal(record.usable_width_mm, 1400);
  assert.equal(record.pattern_match_type, "RANDOM_MATCH");
  assert.equal(record.price_verification_status, "VERIFIED");
  assert.deepEqual(record.imagery, []);
});

test("Sanderson uses the same normalized Fabric Master contract without supplier-specific storage", () => {
  const [record] = normalizeSandersonRows([{
    brand: "Morris & Co.", collection: "Test Collection", design: "Test Design", colour: "Indigo",
    supplierSku: "DMORTEST101", supplierDesignCode: "TEST", widthMm: 1370,
    verticalRepeatMm: 640, horizontalRepeatMm: 685, composition: [{ material: "Linen", percentage: 100 }],
    imageUrl: null, lifecycleState: "CURRENT", sampleAvailable: true, sourceRowNumber: 2,
  }]);
  assert.equal(record.supplier_id, "sanderson-design-group");
  assert.equal(record.brand_id, "sdg-morris-co");
  assert.equal(record.fabric_id, "sdg-dmortest101");
  assert.equal(record.price_verification_status, "PRICE_REQUIRES_VERIFICATION");
});

test("the authorised Sanderson pilot fixture maps into the shared contract", () => {
  const fixture = JSON.parse(readFileSync(
    "fixtures/suppliers/sanderson/painters-garden-DAPGPA203.public.json",
    "utf8",
  ));
  const [record] = normalizeSandersonRows([fixture]);

  assert.equal(record.fabric_id, "sdg-dapgpa203");
  assert.equal(record.brand_id, "sdg-sanderson");
  assert.equal(record.collection_name, "A Painters Garden Fabrics");
  assert.equal(record.pattern_match_type, "STRAIGHT_MATCH");
  assert.equal(record.price_verification_status, "PRICE_REQUIRES_VERIFICATION");
  assert.equal(record.source_type, "AUTHORISED_PDF_PORTAL");
});

test("catalogue preview counts inserts and updates deterministically", () => {
  const records = normalizePrestigiousFormationRows(prestigiousRows);
  const batch = buildCatalogueImport({
    supplierId: "prestigious-textiles",
    sourceType: "AUTHORISED_XLSX",
    sourceName: "test",
    sourceSha256: "a".repeat(64),
    existingSupplierSkus: new Set(["4269/147"]),
    records,
    importedAt: "2026-09-07T12:00:00.000Z",
  });
  assert.equal(batch.metadata.inserted_count, 0);
  assert.equal(batch.metadata.updated_count, 1);
  assert.equal(batch.metadata.shopify_writes, 0);
});

test("customer projection strips supplier-commercial intelligence", () => {
  const source = normalizePrestigiousFormationRows(prestigiousRows)[0];
  const projection = projectCustomerSafeFabric({ ...source, supplier_name: "Prestigious Textiles" });
  assert.doesNotThrow(() => assertCustomerSafeProjection(projection));
  const serialised = JSON.stringify(projection);
  assert.equal(/trade_price|batch_reference|aggregate_available_quantity|costing_price/i.test(serialised), false);
});

test("decision engine adapter accepts either supplier through the same FabricSpec contract", () => {
  const source = normalizePrestigiousFormationRows(prestigiousRows)[0];
  const fabric = toDecisionEngineFabric({ ...source, supplier_name: "Prestigious Textiles" }, 2_000, "2026-09-07");
  assert.equal(fabric.supplierCostPerMetre?.amountMinor, 2_000);
  assert.equal(fabric.sellingPricePolicy.minimumGrossMarginPercent, 35);
});
