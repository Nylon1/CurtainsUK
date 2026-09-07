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
import { normalizeSandersonRows, type SandersonTradeRow } from "./sanderson";

export const SANDERSON_ALL_BRANDS_SHEET = "All Product Data";

export const SANDERSON_TARGET_BRANDS = [
  "Sanderson",
  "Morris & Co.",
  "Harlequin",
  "Zoffany",
  "Scion",
  "Clarke & Clarke",
] as const;

export const SANDERSON_IGNORED_OPERATIONAL_HEADERS = [
  "Product Status Abv.",
  "Product Status",
  "Available Stock",
  "Largest Available Stock Segment",
  "On Po Quantity",
  "On Po Due Date",
  "Unit Of Measure Abv.",
  "Unit Of Measure",
] as const;

const REQUIRED_HEADERS = [
  "Sku/Product Code",
  "Design Name",
  "Descriptive Colour",
  "Collection Name",
  "Brand",
  "Main Product Category",
  "Pattern Match",
  "Vertical Pattern Repeat (cms)",
  "Horizontal Pattern Repeat (cms)",
  "Width (cms)",
  "Weight (gsm)",
  "Composition Description",
] as const;

export interface SandersonCatalogueRejectedRow {
  source_row_number: number;
  supplier_sku: string | null;
  reasons: string[];
}

export interface SandersonCataloguePreviewRow {
  source_row_number: number;
  supplier_sku: string;
  action: CatalogueProtectionAction;
  protected_fields: string[];
}

export interface SandersonCataloguePreview {
  supplier_id: "sanderson-design-group";
  source: {
    filename: string;
    sheet_name: string;
    source_sha256: string;
    observed_at: string;
    effective_date: string;
    age_days: number;
    stale_operational_data_ignored: true;
    existing_master_compared: boolean;
  };
  ignored_operational_headers: readonly string[];
  completion: CatalogueCompletionReport;
  records: NormalizedCatalogueRecord[];
  records_to_apply: NormalizedCatalogueRecord[];
  rows: SandersonCataloguePreviewRow[];
  rejected_rows: SandersonCatalogueRejectedRow[];
  summary: {
    source_rows: number;
    eligible_fabric_rows: number;
    accepted_colourways: number;
    rejected_rows: number;
    brands: number;
    collections: number;
    designs: number;
    insert: number;
    update: number;
    unchanged: number;
    preserve_newer_existing: number;
    price_requires_verification: number;
    storefront_selectable: number;
    usable_width_unknown: number;
    image_unknown: number;
    sample_unknown: number;
    pattern_match_unknown: number;
    composition_unknown: number;
  };
}

function value(row: Record<string, string | null>, header: string) {
  const exact = row[header];
  return exact === null || exact === undefined ? null : exact.trim() || null;
}

function positiveCentimetresToMm(raw: string | null, allowZero = false) {
  if (raw === null) return null;
  const parsed = Number(raw.replace(/,/g, ""));
  if (!Number.isFinite(parsed) || (allowZero ? parsed < 0 : parsed <= 0)) return null;
  return Math.round(parsed * 10);
}

function nonnegativeNumber(raw: string | null) {
  if (raw === null) return null;
  const parsed = Number(raw.replace(/,/g, ""));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function mapSandersonPatternMatch(raw: string | null): SandersonTradeRow["patternMatchType"] {
  const normalized = raw?.trim().toLowerCase() ?? "";
  if (normalized === "straight match") return "STRAIGHT_MATCH";
  if (normalized === "half drop match") return "HALF_DROP_MATCH";
  if (normalized === "random match") return "RANDOM_MATCH";
  return null;
}

export function parseSandersonComposition(raw: string | null): SandersonTradeRow["composition"] {
  if (!raw || /[()]/.test(raw)) return [];
  const matches = [...raw.matchAll(/(\d+(?:\.\d+)?)%\s*([\s\S]*?)(?=\s*\d+(?:\.\d+)?%|$)/g)];
  if (!matches.length) return [];
  const parts = matches.map((match) => ({
    percentage: Number(match[1]),
    material: match[2].replace(/^\s*[,;+/]\s*|\s*[,;+/]\s*$/g, "").replace(/\s+/g, " ").trim(),
  }));
  if (parts.some((part) => !part.material || !Number.isFinite(part.percentage))) return [];
  const total = parts.reduce((sum, part) => sum + part.percentage, 0);
  if (Math.abs(total - 100) > 0.01) return [];
  return parts;
}

function assertSandersonHeaders(table: ParsedSupplierTable) {
  const missing = REQUIRED_HEADERS.filter((header) => !table.headers.includes(header));
  if (missing.length) throw new Error(`SANDERSON_CATALOGUE_HEADERS_MISSING:${missing.join(",")}`);
}

function sourceAgeDays(observedAt: string, now: Date) {
  return Math.max(0, Math.floor((now.getTime() - new Date(observedAt).getTime()) / 86_400_000));
}

export function mapSandersonCatalogueTable(input: {
  table: ParsedSupplierTable;
  filename: string;
  source_sha256: string;
  existing_records?: ExistingCatalogueRecord[];
  now?: Date;
}): SandersonCataloguePreview {
  assertSandersonHeaders(input.table);
  if (input.table.sheet_name !== SANDERSON_ALL_BRANDS_SHEET) {
    throw new Error(`SANDERSON_CATALOGUE_SHEET_REQUIRED:${SANDERSON_ALL_BRANDS_SHEET}`);
  }
  if (!input.table.source_observed_at) throw new Error("SANDERSON_CATALOGUE_SOURCE_OBSERVED_AT_REQUIRED");
  const observedAt = new Date(input.table.source_observed_at);
  if (!Number.isFinite(observedAt.getTime())) throw new Error("SANDERSON_CATALOGUE_SOURCE_OBSERVED_AT_INVALID");

  const targetBrands = new Set<string>(SANDERSON_TARGET_BRANDS);
  const eligible = input.table.rows
    .map((row, index) => ({ row, sourceRowNumber: index + 2 }))
    .filter(({ row }) => value(row, "Main Product Category") === "Fabric" && targetBrands.has(value(row, "Brand") ?? ""));
  const rejectedRows: SandersonCatalogueRejectedRow[] = [];
  const seenSkus = new Set<string>();
  const tradeRows: SandersonTradeRow[] = [];
  const unnamedTrailingHeaders = input.table.headers.filter((header) => /^column_\d+$/.test(header));

  for (const { row, sourceRowNumber } of eligible) {
    const supplierSku = value(row, "Sku/Product Code")?.toUpperCase() ?? null;
    const brand = value(row, "Brand");
    const collection = value(row, "Collection Name");
    const design = value(row, "Design Name");
    const colour = value(row, "Descriptive Colour");
    const reasons: string[] = [];
    if (!supplierSku) reasons.push("SUPPLIER_SKU_REQUIRED");
    if (!brand) reasons.push("BRAND_REQUIRED");
    if (!collection) reasons.push("COLLECTION_REQUIRED");
    if (!design) reasons.push("DESIGN_REQUIRED");
    if (!colour) reasons.push("COLOUR_REQUIRED");
    if (unnamedTrailingHeaders.some((header) => value(row, header) !== null)) {
      reasons.push("UNNAMED_TRAILING_COLUMN_DATA");
    }
    if (supplierSku && seenSkus.has(supplierSku)) reasons.push("DUPLICATE_SUPPLIER_SKU");
    if (reasons.length) {
      rejectedRows.push({ source_row_number: sourceRowNumber, supplier_sku: supplierSku, reasons });
      continue;
    }
    seenSkus.add(supplierSku!);
    tradeRows.push({
      brand: brand!,
      collection: collection!,
      design: design!,
      colour: colour!,
      supplierSku: supplierSku!,
      // This export has no supplier-issued design-code field. The normalized
      // design_id remains deterministic while supplier_design_code stays unknown.
      supplierDesignCode: null,
      fullWidthMm: positiveCentimetresToMm(value(row, "Width (cms)")),
      // The export contains finished/full width only. Usable width is not inferred.
      usableWidthMm: null,
      verticalRepeatMm: positiveCentimetresToMm(value(row, "Vertical Pattern Repeat (cms)"), true),
      horizontalRepeatMm: positiveCentimetresToMm(value(row, "Horizontal Pattern Repeat (cms)"), true),
      patternMatchType: mapSandersonPatternMatch(value(row, "Pattern Match")),
      composition: parseSandersonComposition(value(row, "Composition Description")),
      weightGsm: nonnegativeNumber(value(row, "Weight (gsm)")),
      imageUrl: null,
      lifecycleState: "UNKNOWN",
      sampleAvailable: null,
      careInstructions: [],
      usageSuitability: [],
      sourceRowNumber,
      sourceType: "AUTHORISED_XLSX_CATALOGUE",
      sourceName: "Sanderson Design Group authorised all-brands export",
      sourceReference: `${basename(input.filename)}#${SANDERSON_ALL_BRANDS_SHEET}`,
      sourceEffectiveDate: observedAt.toISOString().slice(0, 10),
    });
  }

  // A full supplier catalogue import is private Fabric Master/QA data. It must
  // not become Dawn catalogue content merely because the file was accepted.
  // The separately reviewed canary selector may opt specific rows into staging.
  const incoming = normalizeSandersonRows(tradeRows).map((record) => ({
    ...record,
    staging_catalog_visible: false,
  }));
  const existing = new Map((input.existing_records ?? []).map((entry) => [
    `${entry.record.supplier_id}:${entry.record.supplier_sku.toUpperCase()}`,
    entry,
  ]));
  const protectedRows = incoming.map((record) => protectCatalogueCandidate({
    incoming: record,
    incoming_observed_at: observedAt.toISOString(),
    existing: existing.get(`${record.supplier_id}:${record.supplier_sku.toUpperCase()}`),
  }));
  const records = protectedRows.map((row) => row.record);
  const rows: SandersonCataloguePreviewRow[] = protectedRows.map((row) => ({
    source_row_number: row.record.source_row_number,
    supplier_sku: row.record.supplier_sku,
    action: row.action,
    protected_fields: row.protected_fields,
  }));
  const countAction = (action: CatalogueProtectionAction) => rows.filter((row) => row.action === action).length;
  const now = input.now ?? new Date();
  const completion = summarizeCatalogueCompletion("sanderson-design-group", records);

  return {
    supplier_id: "sanderson-design-group",
    source: {
      filename: basename(input.filename),
      sheet_name: SANDERSON_ALL_BRANDS_SHEET,
      source_sha256: input.source_sha256,
      observed_at: observedAt.toISOString(),
      effective_date: observedAt.toISOString().slice(0, 10),
      age_days: sourceAgeDays(observedAt.toISOString(), now),
      stale_operational_data_ignored: true,
      existing_master_compared: input.existing_records !== undefined,
    },
    ignored_operational_headers: SANDERSON_IGNORED_OPERATIONAL_HEADERS,
    completion,
    records,
    records_to_apply: protectedRows.filter((row) => row.apply).map((row) => row.record),
    rows,
    rejected_rows: rejectedRows,
    summary: {
      source_rows: input.table.rows.length,
      eligible_fabric_rows: eligible.length,
      accepted_colourways: records.length,
      rejected_rows: rejectedRows.length,
      brands: new Set(records.map((record) => record.brand_id)).size,
      collections: new Set(records.map((record) => record.collection_id)).size,
      designs: new Set(records.map((record) => record.design_id)).size,
      insert: countAction("INSERT"),
      update: countAction("UPDATE"),
      unchanged: countAction("UNCHANGED"),
      preserve_newer_existing: countAction("PRESERVE_NEWER_EXISTING"),
      price_requires_verification: records.filter((record) => record.price_verification_status === "PRICE_REQUIRES_VERIFICATION").length,
      storefront_selectable: records.filter((record) => record.storefront_selectable).length,
      usable_width_unknown: records.filter((record) => record.usable_width_mm === null).length,
      image_unknown: records.filter((record) => record.imagery.length === 0).length,
      sample_unknown: records.filter((record) => record.sample_available === null).length,
      pattern_match_unknown: records.filter((record) => record.pattern_match_type === null).length,
      composition_unknown: records.filter((record) => record.composition.length === 0).length,
    },
  };
}

export async function previewSandersonAllBrandsCatalogue(input: {
  document: SupplierImportDocument;
  existing_records?: ExistingCatalogueRecord[];
  now?: Date;
}) {
  const table = await parseSupplierImportDocument(input.document, { sheet_name: SANDERSON_ALL_BRANDS_SHEET });
  return mapSandersonCatalogueTable({
    table,
    filename: input.document.filename,
    source_sha256: sha256(input.document.bytes),
    existing_records: input.existing_records,
    now: input.now,
  });
}
