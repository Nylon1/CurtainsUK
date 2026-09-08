import assert from "node:assert/strict";
import test from "node:test";
import * as XLSX from "xlsx";
import { buildCatalogueImport } from "../catalogue-normalization";
import {
  fabricIsCatalogueQaEligible,
  fabricIsCustomerLaunchEligible,
  summarizeCatalogueCompletion,
} from "../catalogue-completion";
import { previewPrestigiousFormationCatalogue } from "../prestigious-catalogue-import";
import { normalizePrestigiousFormationRows } from "../prestigious";
import { previewSandersonAllBrandsCatalogue } from "../sanderson-catalogue-import";

function workbookBytes(headers: string[], rows: Array<Array<string | number | null>>, sheetName = "Sheet1") {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([headers, ...rows]), sheetName);
  workbook.Props = { ModifiedDate: new Date("2026-02-24T08:48:32.000Z") };
  return new Uint8Array(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }));
}

const prestigiousHeaders = ["Title", "Tags", "Option1%20Value", "Variant%20SKU", "Image%20Src", "Variant%20Price"];

test("catalogue completion keeps private QA, pricing eligibility and launch projection separate", () => {
  const [base] = normalizePrestigiousFormationRows([{
    Title: "ESCHER",
    Tags: "Formation%20Collection",
    "Option1%20Value": "MOCHA",
    "Variant%20SKU": "4269/147",
    "Image%20Src": "https://legacy.invalid/example.jpg",
  }]);
  const safeQaOnly = {
    ...base,
    price_verification_status: "PRICE_REQUIRES_VERIFICATION" as const,
    storefront_selectable: false,
    staging_catalog_visible: false,
  };
  const unsafePublic = {
    ...base,
    supplier_sku: "4269/999",
    fabric_id: "pt-4269-999",
    storefront_selectable: true,
    imagery: [],
  };
  const launchReady = {
    ...base,
    supplier_sku: "4269/998",
    fabric_id: "pt-4269-998",
    imagery: ["https://cdn.shopify.com/authorised.jpg"],
  };
  const report = summarizeCatalogueCompletion("prestigious-textiles", [safeQaOnly, unsafePublic, launchReady]);

  assert.equal(fabricIsCatalogueQaEligible(safeQaOnly), true);
  assert.equal(fabricIsCustomerLaunchEligible(safeQaOnly), false);
  assert.equal(fabricIsCustomerLaunchEligible(launchReady), true);
  assert.equal(fabricIsCustomerLaunchEligible({ ...launchReady, lifecycle_state: "UNKNOWN", price_verification_status: "PRICE_REQUIRES_VERIFICATION", composition: [], storefront_selectable: false }), true);
  assert.equal(fabricIsCustomerLaunchEligible({ ...launchReady, lifecycle_state: "DISCONTINUED" }), false);
  assert.equal(report.qa_import.eligible, true);
  assert.equal(report.customer_launch.eligible, false);
  assert.equal(report.counts.pricing_eligible, 2);
  assert.equal(report.counts.customer_launch_eligible, 1);
  assert.equal(report.counts.unsafe_public_candidates, 1);
  assert.ok(report.customer_launch.blockers.includes("UNSAFE_PUBLIC_CANDIDATES"));
});

test("catalogue completion rejects duplicate supplier SKUs case-insensitively", () => {
  const [base] = normalizePrestigiousFormationRows([{
    Title: "ESCHER", Tags: "Formation%20Collection", "Option1%20Value": "MOCHA",
    "Variant%20SKU": "4269/147", "Image%20Src": "",
  }]);
  const report = summarizeCatalogueCompletion("prestigious-textiles", [
    base,
    { ...base, fabric_id: "duplicate", supplier_sku: "4269/147".toLowerCase() },
  ]);
  assert.equal(report.counts.duplicate_supplier_skus, 1);
  assert.equal(report.qa_import.eligible, false);
  assert.deepEqual(report.qa_import.blockers, ["DUPLICATE_SUPPLIER_SKUS"]);
});

test("Prestigious preview ignores Shopify placeholder price and retired image URL", async () => {
  const bytes = workbookBytes(prestigiousHeaders, [
    ["ESCHER", "Formation%20Collection", "MOCHA", "4269/147", "https://legacy.invalid/escher.jpg", "0"],
    ["DALI", "Formation%20Collection", "SAGE", "4270/164", "https://legacy.invalid/dali.jpg", "0"],
  ]);
  const preview = await previewPrestigiousFormationCatalogue({
    document: { filename: "formation.xlsx", mime_type: null, format: "XLSX", bytes },
    source_observed_at: "2026-08-01T00:00:00.000Z",
  });

  assert.equal(preview.summary.accepted_colourways, 2);
  assert.equal(preview.summary.source_image_references_present, 2);
  assert.equal(preview.summary.source_image_references_projected, 0);
  assert.equal(preview.summary.verified_prices, 1);
  assert.equal(preview.summary.prices_awaiting_verification, 1);
  assert.equal(preview.records.every((record) => record.imagery.length === 0), true);
  assert.equal(preview.records.every((record) => record.storefront_selectable === false), true);
  assert.equal(preview.records.every((record) => record.staging_catalog_visible === false), true);
  assert.equal(JSON.stringify(preview).includes('"Variant%20Price"'), false);
  assert.equal(JSON.stringify(preview).includes('"0"'), false);
});

test("Prestigious preview preserves a newer approved record instead of downgrading it", async () => {
  const bytes = workbookBytes(prestigiousHeaders, [
    ["ESCHER", "Formation%20Collection", "MOCHA", "4269/147", "https://legacy.invalid/escher.jpg", "0"],
  ]);
  const [source] = normalizePrestigiousFormationRows([{
    Title: "ESCHER", Tags: "Formation%20Collection", "Option1%20Value": "MOCHA",
    "Variant%20SKU": "4269/147", "Image%20Src": "",
  }]);
  const existing = {
    ...source,
    supplier_name: "Prestigious Textiles",
    imagery: ["https://supplier.example/current.jpg"],
    staging_catalog_visible: true,
  };
  const preview = await previewPrestigiousFormationCatalogue({
    document: { filename: "formation.xlsx", mime_type: null, format: "XLSX", bytes },
    source_observed_at: "2026-08-01T00:00:00.000Z",
    existing_records: [{ record: existing, observed_at: "2026-09-07T00:00:00.000Z" }],
  });

  assert.equal(preview.rows[0].action, "PRESERVE_NEWER_EXISTING");
  assert.equal(preview.records_to_apply.length, 0);
  assert.deepEqual(preview.records[0].imagery, existing.imagery);
  assert.equal(preview.records[0].staging_catalog_visible, true);
});

test("full Sanderson preview remains private QA data until an explicit canary projection", async () => {
  const headers = [
    "Sku/Product Code", "Design Name", "Descriptive Colour", "Collection Name", "Brand",
    "Main Product Category", "Pattern Match", "Vertical Pattern Repeat (cms)",
    "Horizontal Pattern Repeat (cms)", "Width (cms)", "Weight (gsm)", "Composition Description",
  ];
  const bytes = workbookBytes(headers, [[
    "DSAFE101", "Safe Design", "Blue", "Safe Collection", "Sanderson", "Fabric",
    "Straight Match", 64, 68, 137, 220, "100% Cotton",
  ]], "All Product Data");
  const preview = await previewSandersonAllBrandsCatalogue({
    document: { filename: "sanderson.xlsx", mime_type: null, format: "XLSX", bytes },
  });

  assert.equal(preview.records[0].staging_catalog_visible, false);
  assert.equal(preview.completion.qa_import.eligible, true);
  assert.equal(preview.completion.customer_launch.eligible, false);
  assert.equal(preview.completion.counts.prices_awaiting_verification, 1);
  assert.equal(preview.completion.counts.customer_launch_eligible, 0);
});

test("catalogue import carries protected-field evidence into the atomic batch", () => {
  const [record] = normalizePrestigiousFormationRows([{
    Title: "ESCHER", Tags: "Formation%20Collection", "Option1%20Value": "MOCHA",
    "Variant%20SKU": "4269/147", "Image%20Src": "",
  }]);
  const batch = buildCatalogueImport({
    supplierId: "prestigious-textiles",
    sourceType: "AUTHORISED_XLSX_CATALOGUE",
    sourceName: "test",
    sourceSha256: "a".repeat(64),
    existingSupplierSkus: new Set([record.supplier_sku]),
    existingSupplierUpdatedAt: new Map([[record.supplier_sku, "2026-09-07T12:00:00.000Z"]]),
    protectedFieldsBySku: new Map([[record.supplier_sku, ["imagery", "price_verification_status"]]]),
    records: [record],
    importedAt: "2026-09-07T12:00:00.000Z",
  });
  assert.deepEqual(batch.items[0].protected_fields, ["imagery", "price_verification_status"]);
});
