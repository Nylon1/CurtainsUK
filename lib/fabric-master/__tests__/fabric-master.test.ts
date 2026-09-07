import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as XLSX from "xlsx";
import { officialPrestigiousThumbnailUrl } from "../prestigious-imagery";
import { BULK_IMPORT_GATES, evaluateBulkImportReadiness } from "../bulk-import-readiness";
import { buildCatalogueImport } from "../catalogue-normalization";
import { protectCatalogueCandidate } from "../catalogue-protection";
import { toDecisionEngineFabric } from "../decision-engine";
import { normalizePrestigiousFormationRows } from "../prestigious";
import { assertCustomerSafeProjection, fabricIsConfigurationEligible, projectCustomerSafeFabric } from "../projection";
import { previewSandersonAllBrandsCatalogue } from "../sanderson-catalogue-import";
import { SANDERSON_CANARY_ALLOCATION, selectSandersonCanary } from "../sanderson-canary";
import { normalizeSandersonRows } from "../sanderson";
import { selectCurrentApprovedCutCostMinor } from "../verified-supplier-price";

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

test("Prestigious imagery is derived from the stable SKU/design/colour mapping", () => {
  assert.equal(
    officialPrestigiousThumbnailUrl({ supplierSku: "4269/147", design: "Escher", colour: "Mocha" }),
    "https://www.prestigious.co.uk/wp-content/uploads/product_images/thumbs/4269-147%20escher%20mocha.jpg",
  );
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
  assert.equal(/priceVerificationStatus|price_verification_status/.test(serialised), false);
  assert.equal(projection.configurable, true);
  assert.equal(projection.configurationMessage, "Ready to configure");
});

test("a staging-visible unverified canary is customer-visible but cannot enter configuration", () => {
  const source = normalizeSandersonRows([{
    brand: "Sanderson", collection: "Canary", design: "Safe card", colour: "Blue",
    supplierSku: "CANARYSAFE101", supplierDesignCode: null, fullWidthMm: 1370, usableWidthMm: null,
    verticalRepeatMm: 640, horizontalRepeatMm: 685, patternMatchType: "STRAIGHT_MATCH",
    composition: [{ material: "Cotton", percentage: 100 }], imageUrl: null,
    lifecycleState: "UNKNOWN", sampleAvailable: null, sourceRowNumber: 2,
  }])[0];
  const projection = projectCustomerSafeFabric({
    ...source,
    supplier_name: "Sanderson Design Group",
    staging_catalog_visible: true,
  });

  assert.equal(projection.configurable, false);
  assert.equal(projection.configurationMessage, "Price and availability to be confirmed");
  assert.equal(projection.availability, "Availability to be confirmed");
  assert.equal(JSON.stringify(projection).includes("PRICE_REQUIRES_VERIFICATION"), false);
  assert.equal(fabricIsConfigurationEligible({ ...source, supplier_name: "Sanderson Design Group", staging_catalog_visible: true }), false);
});

test("decision engine adapter accepts either supplier through the same FabricSpec contract", () => {
  const source = normalizePrestigiousFormationRows(prestigiousRows)[0];
  const fabric = toDecisionEngineFabric({ ...source, supplier_name: "Prestigious Textiles" }, 2_000, "2026-09-07");
  assert.equal(fabric.supplierCostPerMetre?.amountMinor, 2_000);
  assert.equal(fabric.sellingPricePolicy.minimumGrossMarginPercent, 35);
});

const sandersonHeaders = [
  "Sku/Product Code", "Design Name", "Descriptive Colour", "Collection Name", "Brand",
  "Main Product Category", "Pattern Match", "Vertical Pattern Repeat (cms)",
  "Horizontal Pattern Repeat (cms)", "Width (cms)", "Weight (gsm)",
  "Composition Description", "Product Status", "Available Stock", "On Po Due Date",
  "",
];

function sandersonWorkbook(rows: Array<Array<string | number | null>>) {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([sandersonHeaders, ...rows]);
  XLSX.utils.book_append_sheet(workbook, sheet, "All Product Data");
  workbook.Props = {
    CreatedDate: new Date("2026-02-24T08:47:01.000Z"),
    ModifiedDate: new Date("2026-02-24T08:48:32.000Z"),
  };
  return new Uint8Array(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }));
}

function catalogueRow(input: {
  sku: string;
  brand?: string;
  category?: string;
  collection?: string | null;
  design?: string | null;
  colour?: string | null;
  match?: string | null;
}) {
  return [
    input.sku,
    input.design === undefined ? "Painters Garden" : input.design,
    input.colour === undefined ? "Violet/Crimson" : input.colour,
    input.collection === undefined ? "Sanderson One Sixty Fabrics" : input.collection,
    input.brand ?? "Sanderson",
    input.category ?? "Fabric",
    input.match === undefined ? "Straight Match" : input.match,
    66,
    137,
    137,
    131,
    "100% Cotton",
    "LIVE",
    99.5,
    "3/17/26",
  ];
}

test("Sanderson all-brands catalogue maps identity/specification fields but ignores stale operations", async () => {
  const bytes = sandersonWorkbook([
    catalogueRow({ sku: "DAPGPA203" }),
    catalogueRow({ sku: "DMORRIS101", brand: "Morris & Co." }),
    catalogueRow({ sku: "WALL101", category: "Wallpaper" }),
    catalogueRow({ sku: "OTHER101", brand: "Studio G" }),
  ]);
  const preview = await previewSandersonAllBrandsCatalogue({
    document: { filename: "sanderson-all-brands.xlsx", mime_type: null, format: "XLSX", bytes },
    now: new Date("2026-09-07T12:00:00.000Z"),
  });

  assert.equal(preview.source.observed_at, "2026-02-24T08:48:32.000Z");
  assert.equal(preview.source.stale_operational_data_ignored, true);
  assert.equal(preview.summary.source_rows, 4);
  assert.equal(preview.summary.eligible_fabric_rows, 2);
  assert.equal(preview.summary.accepted_colourways, 2);
  assert.equal(preview.summary.brands, 2);
  const record = preview.records.find((item) => item.supplier_sku === "DAPGPA203")!;
  assert.equal(record.full_width_mm, 1370);
  assert.equal(record.usable_width_mm, null);
  assert.equal(record.vertical_repeat_mm, 660);
  assert.equal(record.pattern_match_type, "STRAIGHT_MATCH");
  assert.deepEqual(record.composition, [{ material: "Cotton", percentage: 100 }]);
  assert.equal(record.lifecycle_state, "UNKNOWN");
  assert.equal(record.sample_available, null);
  assert.deepEqual(record.imagery, []);
  assert.equal(record.price_verification_status, "PRICE_REQUIRES_VERIFICATION");
  assert.equal(record.storefront_selectable, false);
  assert.equal(JSON.stringify(record).includes("99.5"), false);
});

test("Sanderson catalogue supports exactly the six approved brands through one Fabric Master", async () => {
  const brands = ["Sanderson", "Morris & Co.", "Harlequin", "Zoffany", "Scion", "Clarke & Clarke"];
  const bytes = sandersonWorkbook(brands.map((brand, index) => catalogueRow({ sku: `SKU${index}101`, brand })));
  const preview = await previewSandersonAllBrandsCatalogue({
    document: { filename: "all-brands.xlsx", mime_type: null, format: "XLSX", bytes },
  });
  assert.equal(preview.summary.brands, 6);
  assert.equal(preview.records.every((record) => record.supplier_id === "sanderson-design-group"), true);
  assert.deepEqual(new Set(preview.records.map((record) => record.brand_id)), new Set([
    "sdg-sanderson", "sdg-morris-co", "sdg-harlequin", "sdg-zoffany", "sdg-scion", "sdg-clarke-clarke",
  ]));
});

test("catalogue protection keeps newer verified pilot data instead of applying a stale bulk row", async () => {
  const pilot = JSON.parse(readFileSync(
    "fixtures/suppliers/sanderson/painters-garden-DAPGPA203.public.json",
    "utf8",
  ));
  const incomingBytes = sandersonWorkbook([catalogueRow({ sku: "DAPGPA203" })]);
  const existing = {
    ...normalizeSandersonRows([pilot])[0],
    supplier_name: "Sanderson Design Group",
    price_verification_status: "VERIFIED" as const,
    storefront_selectable: true,
  };
  const preview = await previewSandersonAllBrandsCatalogue({
    document: { filename: "stale-all-brands.xlsx", mime_type: null, format: "XLSX", bytes: incomingBytes },
    existing_records: [{ record: existing, observed_at: "2026-09-07T10:00:00.000Z" }],
  });

  assert.equal(preview.rows[0].action, "PRESERVE_NEWER_EXISTING");
  assert.equal(preview.records_to_apply.length, 0);
  assert.equal(preview.records[0].price_verification_status, "VERIFIED");
  assert.equal(preview.records[0].storefront_selectable, true);
  assert.equal(preview.records[0].lifecycle_state, "CURRENT");
  assert.equal(preview.records[0].sample_available, true);
  assert.deepEqual(preview.records[0].imagery, [pilot.imageUrl]);
  assert.equal(preview.records[0].collection_name, "A Painters Garden Fabrics");
  assert.equal(preview.records[0].source_effective_date, "2026-09-07");
});

test("Sanderson canary selects exactly 50 new records across six brands and leaves DAPGPA203 untouched", async () => {
  const brands = ["Sanderson", "Morris & Co.", "Harlequin", "Zoffany", "Scion", "Clarke & Clarke"];
  const rows = [catalogueRow({ sku: "DAPGPA203" })];
  for (const [brandIndex, brand] of brands.entries()) {
    for (let index = 0; index < 10; index += 1) {
      rows.push(catalogueRow({
        sku: `CANARY${brandIndex}${String(index).padStart(2, "0")}`,
        brand,
        collection: `Collection ${brandIndex}-${index}`,
        design: `Design ${brandIndex}-${index}`,
        colour: `Colour ${brandIndex}-${index}`,
      }));
    }
  }
  const pilot = JSON.parse(readFileSync(
    "fixtures/suppliers/sanderson/painters-garden-DAPGPA203.public.json",
    "utf8",
  ));
  const existing = {
    ...normalizeSandersonRows([pilot])[0],
    supplier_name: "Sanderson Design Group",
    price_verification_status: "VERIFIED" as const,
    storefront_selectable: true,
  };
  const preview = await previewSandersonAllBrandsCatalogue({
    document: { filename: "canary.xlsx", mime_type: null, format: "XLSX", bytes: sandersonWorkbook(rows) },
    existing_records: [{ record: existing, observed_at: "2026-09-07T10:00:00.000Z" }],
  });
  const selected = selectSandersonCanary(preview);

  assert.equal(selected.length, 50);
  assert.equal(new Set(selected.map((record) => record.supplier_sku)).size, 50);
  assert.equal(selected.some((record) => record.supplier_sku === "DAPGPA203"), false);
  assert.equal(preview.rows.find((row) => row.supplier_sku === "DAPGPA203")?.action, "PRESERVE_NEWER_EXISTING");
  for (const [brandId, expected] of Object.entries(SANDERSON_CANARY_ALLOCATION)) {
    assert.equal(selected.filter((record) => record.brand_id === brandId).length, expected);
  }
  assert.equal(selected.every((record) => record.supplier_design_code === null), true);
  assert.equal(selected.every((record) => !record.storefront_selectable), true);
  assert.equal(selected.every((record) => record.staging_catalog_visible === true), true);
  assert.equal(selected.every((record) => record.price_verification_status === "PRICE_REQUIRES_VERIFICATION"), true);
});

test("catalogue protection enriches newer specs without erasing independently verified fields", () => {
  const [incoming] = normalizeSandersonRows([{
    brand: "Sanderson", collection: "Current collection", design: "Design", colour: "Blue",
    supplierSku: "SAFE101", supplierDesignCode: "SAFE", fullWidthMm: 1400, usableWidthMm: null,
    verticalRepeatMm: 500, horizontalRepeatMm: null, patternMatchType: null, composition: [],
    imageUrl: null, lifecycleState: "UNKNOWN", sampleAvailable: null, sourceRowNumber: 2,
    sourceEffectiveDate: "2026-09-07",
  }]);
  const existing = {
    ...incoming,
    supplier_name: "Sanderson Design Group",
    full_width_mm: 1370,
    usable_width_mm: 1350,
    vertical_repeat_mm: 480,
    pattern_match_type: "STRAIGHT_MATCH" as const,
    composition: [{ material: "Linen", percentage: 100 }],
    imagery: ["https://example.test/safe.jpg"],
    sample_available: true,
    lifecycle_state: "CURRENT" as const,
    price_verification_status: "VERIFIED" as const,
    storefront_selectable: true,
    source_effective_date: "2026-02-01",
  };
  const result = protectCatalogueCandidate({
    incoming,
    incoming_observed_at: "2026-09-07T10:00:00.000Z",
    existing: { record: existing, observed_at: "2026-02-01T10:00:00.000Z" },
  });

  assert.equal(result.action, "UPDATE");
  assert.equal(result.record.full_width_mm, 1400);
  assert.equal(result.record.usable_width_mm, 1350);
  assert.equal(result.record.pattern_match_type, "STRAIGHT_MATCH");
  assert.deepEqual(result.record.composition, existing.composition);
  assert.deepEqual(result.record.imagery, existing.imagery);
  assert.equal(result.record.sample_available, true);
  assert.equal(result.record.lifecycle_state, "CURRENT");
  assert.equal(result.record.price_verification_status, "VERIFIED");
  assert.equal(result.record.storefront_selectable, true);
});

test("unsupported or absent Sanderson match data remains unknown", async () => {
  const bytes = sandersonWorkbook([
    catalogueRow({ sku: "THIRD101", match: "Third Drop Match" }),
    catalogueRow({ sku: "BLANK101", match: null }),
  ]);
  const preview = await previewSandersonAllBrandsCatalogue({
    document: { filename: "matches.xlsx", mime_type: null, format: "XLSX", bytes },
  });
  assert.equal(preview.summary.pattern_match_unknown, 2);
  assert.equal(preview.records.every((record) => record.pattern_match_type === null), true);
});

test("No Pattern Match and shifted trailing cells stay blocked for review", async () => {
  const noMatch = catalogueRow({ sku: "NOMATCH101", match: "No Pattern Match" });
  const shifted = [...catalogueRow({ sku: "SHIFTED101" }), "unexpected shifted value"];
  const bytes = sandersonWorkbook([noMatch, shifted]);
  const preview = await previewSandersonAllBrandsCatalogue({
    document: { filename: "structural-review.xlsx", mime_type: null, format: "XLSX", bytes },
  });
  assert.equal(preview.records[0].pattern_match_type, null);
  assert.equal(preview.rejected_rows.length, 1);
  assert.deepEqual(preview.rejected_rows[0].reasons, ["UNNAMED_TRAILING_COLUMN_DATA"]);
});

test("bulk supplier expansion fails closed until every dated gate has evidence", () => {
  const complete = Object.fromEntries(BULK_IMPORT_GATES.map((id) => [id, {
    state: "PASS" as const,
    checkedAt: "2026-09-07T17:00:00.000Z",
    evidenceReference: `phase5c:${id.toLowerCase()}`,
    detail: "Verified in staging",
  }]));
  const ready = evaluateBulkImportReadiness({
    supplierId: "sanderson-design-group",
    intendedColourways: 9_630,
    gates: complete as Parameters<typeof evaluateBulkImportReadiness>[0]["gates"],
  }, new Date("2026-09-07T17:30:00.000Z"));
  assert.equal(ready.status, "READY_FOR_BULK_IMPORT");
  assert.deepEqual(ready.failedGates, []);

  const missingImageryEvidence = {
    ...complete,
    AUTHORISED_IMAGERY: { ...complete.AUTHORISED_IMAGERY, evidenceReference: null },
  };
  const blocked = evaluateBulkImportReadiness({
    supplierId: "sanderson-design-group",
    intendedColourways: 9_630,
    gates: missingImageryEvidence as Parameters<typeof evaluateBulkImportReadiness>[0]["gates"],
  });
  assert.equal(blocked.status, "BLOCKED");
  assert.deepEqual(blocked.unknownGates, ["AUTHORISED_IMAGERY"]);
});

test("verified cut pricing requires a current expiry and the latest promotion to remain approved", () => {
  const now = new Date("2026-09-07T19:00:00.000Z");
  const snapshots = [{
    snapshot_id: "snapshot-current",
    checked_at: "2026-09-07T18:00:00.000Z",
    price_expires_at: "2026-09-14T18:00:00.000Z",
    prices: { cut_trade_price: "20.0000", currency: "GBP" },
  }, {
    snapshot_id: "snapshot-older",
    checked_at: "2026-09-06T18:00:00.000Z",
    price_expires_at: "2026-09-13T18:00:00.000Z",
    prices: { cut_trade_price: "19.0000", currency: "GBP" },
  }];
  const approved = [
    { snapshot_id: "snapshot-current", promotion_state: "APPROVED_FOR_PROJECTION", created_at: "2026-09-07T18:01:00.000Z" },
    { snapshot_id: "snapshot-older", promotion_state: "APPROVED_FOR_PROJECTION", created_at: "2026-09-06T18:01:00.000Z" },
  ];

  assert.equal(selectCurrentApprovedCutCostMinor({ snapshots, promotionEvents: approved, now }), 2_000);
  assert.equal(selectCurrentApprovedCutCostMinor({
    snapshots,
    promotionEvents: [...approved, {
      snapshot_id: "snapshot-current",
      promotion_state: "REJECTED",
      created_at: "2026-09-07T18:02:00.000Z",
    }],
    now,
  }), 1_900, "a later rejection invalidates that snapshot but preserves an older current approval");
  assert.equal(selectCurrentApprovedCutCostMinor({
    snapshots: [{ ...snapshots[0], price_expires_at: "2026-09-07T18:59:59.000Z" }],
    promotionEvents: approved,
    now,
  }), null);
  assert.equal(selectCurrentApprovedCutCostMinor({
    snapshots: [{ ...snapshots[0], price_expires_at: null }],
    promotionEvents: approved,
    now,
  }), null);
});
