import { basename } from "node:path";
import type { ParsedSupplierTable, SupplierImportDocument } from "@/lib/supplier-import/types";
import { parseSupplierImportDocument } from "@/lib/supplier-import/parse";
import { sha256 } from "./catalogue-normalization";
import { summarizeCatalogueCompletion, type CatalogueCompletionReport } from "./catalogue-completion";
import {
  protectCatalogueCandidate,
  type CatalogueProtectionAction,
  type ExistingCatalogueRecord,
  type NormalizedCatalogueRecord,
} from "./catalogue-protection";
import { normalizePrestigiousFormationRows, type PrestigiousShopifyRow } from "./prestigious";

const REQUIRED_HEADERS = [
  "Title",
  "Tags",
  "Option1%20Value",
  "Variant%20SKU",
] as const;

export interface PrestigiousCataloguePreview {
  supplier_id: "prestigious-textiles";
  source: {
    filename: string;
    source_sha256: string;
    observed_at: string;
    effective_date: string;
    existing_master_compared: boolean;
  };
  records: NormalizedCatalogueRecord[];
  records_to_apply: NormalizedCatalogueRecord[];
  rows: Array<{
    source_row_number: number;
    supplier_sku: string;
    action: CatalogueProtectionAction;
    protected_fields: string[];
  }>;
  rejected_rows: Array<{
    source_row_number: number;
    supplier_sku: string | null;
    reasons: string[];
  }>;
  completion: CatalogueCompletionReport;
  summary: {
    source_rows: number;
    accepted_colourways: number;
    rejected_rows: number;
    designs: number;
    collections: number;
    verified_prices: number;
    prices_awaiting_verification: number;
    source_image_references_present: number;
    source_image_references_projected: 0;
    insert: number;
    update: number;
    unchanged: number;
    preserve_newer_existing: number;
  };
}

function assertHeaders(table: ParsedSupplierTable) {
  const missing = REQUIRED_HEADERS.filter((header) => !table.headers.includes(header));
  if (missing.length) throw new Error(`PRESTIGIOUS_CATALOGUE_HEADERS_MISSING:${missing.join(",")}`);
}

function value(row: Record<string, string | null>, header: string) {
  const candidate = row[header];
  return candidate === null || candidate === undefined ? "" : candidate.trim();
}

function decodedValue(raw: string) {
  try {
    return decodeURIComponent(raw).trim();
  } catch {
    return raw.trim();
  }
}

/**
 * Reviews the authorised 32-colourway Formation export without treating its
 * retired image URLs or Shopify placeholder prices as supplier truth.
 */
export async function previewPrestigiousFormationCatalogue(input: {
  document: SupplierImportDocument;
  source_observed_at: string;
  existing_records?: ExistingCatalogueRecord[];
}): Promise<PrestigiousCataloguePreview> {
  const observedAt = new Date(input.source_observed_at);
  if (!Number.isFinite(observedAt.getTime())) throw new Error("PRESTIGIOUS_SOURCE_OBSERVED_AT_INVALID");
  const table = await parseSupplierImportDocument(input.document);
  assertHeaders(table);
  const sourceEffectiveDate = observedAt.toISOString().slice(0, 10);
  const rejectedRows: PrestigiousCataloguePreview["rejected_rows"] = [];
  const sourceImageReferences = new Set<string>();
  const seenSkus = new Set<string>();
  const normalized: NormalizedCatalogueRecord[] = [];

  for (const [index, row] of table.rows.entries()) {
    const sourceRowNumber = index + 2;
    const supplierSku = decodedValue(value(row, "Variant%20SKU")).toUpperCase() || null;
    const reasons: string[] = [];
    if (!supplierSku) reasons.push("SUPPLIER_SKU_REQUIRED");
    if (!value(row, "Title")) reasons.push("DESIGN_REQUIRED");
    if (!value(row, "Option1%20Value")) reasons.push("COLOUR_REQUIRED");
    if (supplierSku && seenSkus.has(supplierSku)) reasons.push("DUPLICATE_SUPPLIER_SKU");
    if (reasons.length) {
      rejectedRows.push({ source_row_number: sourceRowNumber, supplier_sku: supplierSku, reasons });
      continue;
    }
    seenSkus.add(supplierSku!);
    const imageReference = value(row, "Image%20Src");
    if (imageReference) sourceImageReferences.add(supplierSku!);
    try {
      const [record] = normalizePrestigiousFormationRows([{
        Title: value(row, "Title"),
        Tags: value(row, "Tags"),
        "Option1%20Value": value(row, "Option1%20Value"),
        "Variant%20SKU": value(row, "Variant%20SKU"),
        "Image%20Src": imageReference,
      } as PrestigiousShopifyRow]);
      normalized.push({
        ...record,
        source_type: "AUTHORISED_XLSX_CATALOGUE",
        source_name: "Prestigious authorised Formation catalogue export",
        source_reference: basename(input.document.filename),
        source_effective_date: sourceEffectiveDate,
        source_row_number: sourceRowNumber,
        // Full catalogue imports stay out of Dawn until their independent
        // imagery/lifecycle/price gates have been proven.
        storefront_selectable: false,
        staging_catalog_visible: false,
      });
    } catch (error) {
      rejectedRows.push({
        source_row_number: sourceRowNumber,
        supplier_sku: supplierSku,
        reasons: [error instanceof Error ? error.message : "PRESTIGIOUS_ROW_MAPPING_FAILED"],
      });
    }
  }

  const existing = new Map((input.existing_records ?? []).map((entry) => [
    `${entry.record.supplier_id}:${entry.record.supplier_sku.toUpperCase()}`,
    entry,
  ]));
  const protectedRows = normalized.map((record) => protectCatalogueCandidate({
    incoming: record,
    incoming_observed_at: observedAt.toISOString(),
    existing: existing.get(`${record.supplier_id}:${record.supplier_sku.toUpperCase()}`),
  }));
  const records = protectedRows.map((entry) => entry.record);
  const rows = protectedRows.map((entry) => ({
    source_row_number: entry.record.source_row_number,
    supplier_sku: entry.record.supplier_sku,
    action: entry.action,
    protected_fields: entry.protected_fields,
  }));
  const count = (action: CatalogueProtectionAction) => rows.filter((row) => row.action === action).length;

  return {
    supplier_id: "prestigious-textiles",
    source: {
      filename: basename(input.document.filename),
      source_sha256: sha256(input.document.bytes),
      observed_at: observedAt.toISOString(),
      effective_date: sourceEffectiveDate,
      existing_master_compared: input.existing_records !== undefined,
    },
    records,
    records_to_apply: protectedRows.filter((entry) => entry.apply).map((entry) => entry.record),
    rows,
    rejected_rows: rejectedRows,
    completion: summarizeCatalogueCompletion("prestigious-textiles", records),
    summary: {
      source_rows: table.rows.length,
      accepted_colourways: records.length,
      rejected_rows: rejectedRows.length,
      designs: new Set(records.map((record) => record.design_id)).size,
      collections: new Set(records.map((record) => record.collection_id)).size,
      verified_prices: records.filter((record) => record.price_verification_status === "VERIFIED").length,
      prices_awaiting_verification: records.filter((record) => record.price_verification_status === "PRICE_REQUIRES_VERIFICATION").length,
      source_image_references_present: sourceImageReferences.size,
      source_image_references_projected: 0,
      insert: count("INSERT"),
      update: count("UPDATE"),
      unchanged: count("UNCHANGED"),
      preserve_newer_existing: count("PRESERVE_NEWER_EXISTING"),
    },
  };
}
