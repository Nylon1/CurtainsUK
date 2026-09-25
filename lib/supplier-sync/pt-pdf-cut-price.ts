import { createHash } from "node:crypto";
import { normalizeSupplierSnapshot } from "./normalize";
import type { NormalizedSupplierSnapshot } from "./types";

export const PT_PDF_CUT_PRICE_SOURCE = "Prestigious Textiles August 2026 Price List; owner-confirmed Cut Price";

type PriceRow = {
  pdf_page: number;
  printed_price: string;
  currency: string;
  source_line: string;
};

type PriceCoverage = {
  supplier_sku: string;
  supplier_design_code: string;
  match_basis: string;
  supplier_price_row: PriceRow;
};

export type PtPdfCutPriceCoverage = {
  source_sha256: string;
  publication_label: string;
  selected_skus: number;
  matched_at_design_code: number;
  workbook_price_rrp_used: boolean;
  coverage: PriceCoverage[];
};

const SKU = /^\d{4}\/\d{3}$/;
const DESIGN = /^\d{4}$/;
const MONEY = /^\d+(?:\.\d{1,4})?$/;
const SHA256 = /^[a-f0-9]{64}$/;

function fail(code: string): never { throw new Error(code); }

/**
 * Turns a supplier PDF's exact design-code rows into private, price-only
 * observations. The owner-confirmed cut-price basis is an explicit argument,
 * so a generic PDF "Price" column can never silently become Standard Price.
 */
export function buildPtPdfCutPriceSnapshots(input: {
  coverage: PtPdfCutPriceCoverage;
  ownerConfirmedCutPrice: boolean;
  observedAt: string;
}): NormalizedSupplierSnapshot[] {
  const { coverage, observedAt } = input;
  if (!input.ownerConfirmedCutPrice) fail("PT_PDF_CUT_PRICE_OWNER_CONFIRMATION_REQUIRED");
  if (!SHA256.test(coverage.source_sha256)) fail("PT_PDF_SOURCE_HASH_INVALID");
  if (!Number.isFinite(Date.parse(observedAt))) fail("PT_PDF_OBSERVED_AT_INVALID");
  if (coverage.workbook_price_rrp_used) fail("PT_PDF_WORKBOOK_PRICE_RRP_FORBIDDEN");
  if (coverage.selected_skus < 1 || coverage.selected_skus > 100 ||
      coverage.matched_at_design_code !== coverage.selected_skus ||
      coverage.coverage.length !== coverage.selected_skus) fail("PT_PDF_COHORT_COVERAGE_INVALID");

  const seen = new Set<string>();
  return coverage.coverage.map((item) => {
    const row = item.supplier_price_row;
    if (!SKU.test(item.supplier_sku) || !DESIGN.test(item.supplier_design_code) ||
        item.supplier_sku.slice(0, 4) !== item.supplier_design_code ||
        item.match_basis !== "EXACT_SUPPLIER_DESIGN_CODE") fail("PT_PDF_EXACT_IDENTITY_REQUIRED");
    if (seen.has(item.supplier_sku)) fail("PT_PDF_DUPLICATE_SKU");
    seen.add(item.supplier_sku);
    if (!row || !Number.isInteger(row.pdf_page) || row.pdf_page < 1 || !MONEY.test(row.printed_price) ||
        Number(row.printed_price) <= 0 || row.currency !== "GBP" || !row.source_line.trim()) fail("PT_PDF_CUT_PRICE_EVIDENCE_INVALID");

    const sourceReference = `pt-price-list:sha256:${coverage.source_sha256}:page:${row.pdf_page}:design:${item.supplier_design_code}:cut:${row.printed_price}`;
    const snapshotId = `pt-pdf-cut:${createHash("sha256").update(`${coverage.source_sha256}:${item.supplier_sku}:${row.printed_price}`).digest("hex").slice(0, 24)}:${item.supplier_sku}`;
    return normalizeSupplierSnapshot({
      snapshot_id: snapshotId,
      supplier_id: "prestigious-textiles",
      brand_id: "prestigious-textiles",
      supplier_sku: item.supplier_sku,
      checked_at: observedAt,
      standard_trade_price: null,
      cut_trade_price: row.printed_price,
      currency: "GBP",
      stock_unit: null,
      aggregate_available_quantity: null,
      batches: null,
      next_due_date: null,
      next_due_quantity: null,
      sample_available: null,
      lifecycle_state: "UNKNOWN",
      source: { type: "OTHER", name: PT_PDF_CUT_PRICE_SOURCE, reference: sourceReference },
      verification_status: "VERIFIED",
    });
  });
}
