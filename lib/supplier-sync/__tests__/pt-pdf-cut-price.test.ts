import test from "node:test";
import assert from "node:assert/strict";
import { assertPtPdfSourceBytes, buildPtPdfCutPriceSnapshots, type PtPdfCutPriceCoverage } from "../pt-pdf-cut-price";
import { createHash } from "node:crypto";

const coverage: PtPdfCutPriceCoverage = {
  source_sha256: "a".repeat(64), publication_label: "August 2026", selected_skus: 1, matched_at_design_code: 1,
  workbook_price_rrp_used: false,
  coverage: [{ supplier_sku: "4324/119", supplier_design_code: "4324", match_basis: "EXACT_SUPPLIER_DESIGN_CODE",
    supplier_price_row: { pdf_page: 44, printed_price: "19.00", currency: "GBP", source_line: "4324 JOEL ... £19.00" } }],
};

test("owner-confirmed PT PDF price becomes an exact, price-only cut observation", () => {
  const [snapshot] = buildPtPdfCutPriceSnapshots({ coverage, ownerConfirmedCutPrice: true, observedAt: "2026-09-25T18:00:00.000Z" });
  assert.equal(snapshot.supplier_sku, "4324/119");
  assert.equal(snapshot.standard_trade_price, null);
  assert.equal(snapshot.cut_trade_price, "19.00");
  assert.equal(snapshot.aggregate_available_quantity, null);
  assert.match(snapshot.source.reference ?? "", /sha256:a{64}:page:44:design:4324:cut:19\.00/);
});

test("the PDF mapping rejects unconfirmed basis, workbook pricing, and non-exact SKU mapping", () => {
  assert.throws(() => buildPtPdfCutPriceSnapshots({ coverage, ownerConfirmedCutPrice: false, observedAt: "2026-09-25T18:00:00.000Z" }), /PT_PDF_CUT_PRICE_OWNER_CONFIRMATION_REQUIRED/);
  assert.throws(() => buildPtPdfCutPriceSnapshots({ coverage: { ...coverage, workbook_price_rrp_used: true }, ownerConfirmedCutPrice: true, observedAt: "2026-09-25T18:00:00.000Z" }), /PT_PDF_WORKBOOK_PRICE_RRP_FORBIDDEN/);
  assert.throws(() => buildPtPdfCutPriceSnapshots({ coverage: { ...coverage, coverage: [{ ...coverage.coverage[0], supplier_design_code: "9999" }] }, ownerConfirmedCutPrice: true, observedAt: "2026-09-25T18:00:00.000Z" }), /PT_PDF_EXACT_IDENTITY_REQUIRED/);
});

test("application verifies the supplied PDF bytes against the coverage hash", () => {
  const bytes = Buffer.from("authoritative PT PDF bytes");
  const source_sha256 = createHash("sha256").update(bytes).digest("hex");
  assert.doesNotThrow(() => assertPtPdfSourceBytes({ source_sha256 }, bytes));
  assert.throws(() => assertPtPdfSourceBytes({ source_sha256 }, Buffer.from("changed bytes")), /PT_PDF_SOURCE_HASH_MISMATCH/);
});
