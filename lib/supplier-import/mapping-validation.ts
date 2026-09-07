import type { SupplierImportField, SupplierImportMapping, SupplierImportValueKind } from "./types";

const FIELDS = new Set<SupplierImportField>([
  "supplier_sku", "brand_id", "checked_at", "standard_trade_price", "cut_trade_price", "currency", "stock_unit",
  "aggregate_available_quantity", "batch_reference", "batch_available_quantity", "pieces", "next_due_date",
  "next_due_quantity", "sample_available", "lifecycle_state", "verification_status",
]);
const KINDS = new Set<SupplierImportValueKind>(["TEXT", "DECIMAL", "NUMBER", "INTEGER", "DATE", "BOOLEAN", "UPPERCASE", "LIFECYCLE", "VERIFICATION"]);
const SOURCE_TYPES = new Set(["MANUAL_PORTAL", "OFFICIAL_API", "OFFICIAL_FEED", "OFFICIAL_CSV", "EDI", "OTHER"]);

function object(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function parseSupplierImportMapping(value: unknown): SupplierImportMapping {
  if (!object(value)) throw new Error("IMPORT_MAPPING_OBJECT_REQUIRED");
  for (const key of ["mapping_id", "version", "supplier_id", "source_type", "source_name"]) {
    if (typeof value[key] !== "string" || !String(value[key]).trim() || String(value[key]).length > 200) throw new Error(`IMPORT_MAPPING_${key.toUpperCase()}_INVALID`);
  }
  if (!SOURCE_TYPES.has(String(value.source_type))) throw new Error("IMPORT_MAPPING_SOURCE_TYPE_INVALID");
  if (!object(value.fields) || !object(value.fields.supplier_sku)) throw new Error("IMPORT_MAPPING_SUPPLIER_SKU_REQUIRED");
  for (const [field, rawRule] of Object.entries(value.fields)) {
    if (!FIELDS.has(field as SupplierImportField) || !object(rawRule)) throw new Error("IMPORT_MAPPING_FIELD_INVALID");
    if (typeof rawRule.column !== "string" || !rawRule.column.trim() || rawRule.column.length > 200 || !KINDS.has(rawRule.kind as SupplierImportValueKind)) throw new Error(`IMPORT_MAPPING_RULE_INVALID:${field}`);
    if (rawRule.value_map !== undefined && (!object(rawRule.value_map) || Object.keys(rawRule.value_map).length > 100 || Object.values(rawRule.value_map).some((item) => typeof item !== "string" || item.length > 200))) throw new Error(`IMPORT_MAPPING_VALUE_MAP_INVALID:${field}`);
  }
  if (value.defaults !== undefined && !object(value.defaults)) throw new Error("IMPORT_MAPPING_DEFAULTS_INVALID");
  if (value.defaults && Object.keys(value.defaults).some((field) => !FIELDS.has(field as SupplierImportField))) throw new Error("IMPORT_MAPPING_DEFAULT_FIELD_INVALID");
  if (value.defaults && Object.values(value.defaults).some((item) => item !== null && !["string", "number", "boolean"].includes(typeof item))) throw new Error("IMPORT_MAPPING_DEFAULT_VALUE_INVALID");
  if (value.parser !== undefined && !object(value.parser)) throw new Error("IMPORT_MAPPING_PARSER_INVALID");
  if (object(value.parser)) {
    if (value.parser.header_row !== undefined && (!Number.isInteger(value.parser.header_row) || Number(value.parser.header_row) < 0 || Number(value.parser.header_row) > 100)) throw new Error("IMPORT_HEADER_ROW_INVALID");
    for (const key of ["delimiter", "pdf_delimiter"]) {
      if (value.parser[key] !== undefined && (typeof value.parser[key] !== "string" || String(value.parser[key]).length > 10)) throw new Error(`IMPORT_${key.toUpperCase()}_INVALID`);
    }
    if (value.parser.sheet_name !== undefined && (typeof value.parser.sheet_name !== "string" || value.parser.sheet_name.length > 100)) throw new Error("IMPORT_SHEET_NAME_INVALID");
  }
  return structuredClone(value) as unknown as SupplierImportMapping;
}
