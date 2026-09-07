import type { SupplierImportMapping } from "./types";

export const PRESTIGIOUS_FILE_MAPPING_V1: SupplierImportMapping = {
  mapping_id: "prestigious-file-v1",
  version: "1.0.0",
  supplier_id: "prestigious-textiles",
  source_type: "OFFICIAL_CSV",
  source_name: "Prestigious authorised supplier file",
  fields: {
    supplier_sku: { column: "Product Code", kind: "TEXT" },
    brand_id: { column: "Brand", kind: "TEXT" },
    standard_trade_price: { column: "Standard Trade Price", kind: "DECIMAL" },
    cut_trade_price: { column: "Cut Trade Price", kind: "DECIMAL" },
    currency: { column: "Currency", kind: "UPPERCASE" },
    stock_unit: { column: "Unit", kind: "UPPERCASE" },
    aggregate_available_quantity: { column: "Free Stock", kind: "NUMBER" },
    batch_reference: { column: "Batch", kind: "TEXT" },
    batch_available_quantity: { column: "Batch Metres", kind: "NUMBER" },
    pieces: { column: "Pieces", kind: "INTEGER" },
    next_due_date: { column: "Next Due", kind: "DATE" },
    next_due_quantity: { column: "Next Due Quantity", kind: "NUMBER" },
    sample_available: { column: "Sample Available", kind: "BOOLEAN" },
    lifecycle_state: { column: "Status", kind: "LIFECYCLE", value_map: { Current: "CURRENT", Discontinued: "DISCONTINUED" } },
  },
  defaults: { verification_status: "UNVERIFIED" },
};

export const PRESTIGIOUS_PORTAL_EXPORT_MAPPING_V1: SupplierImportMapping = {
  ...PRESTIGIOUS_FILE_MAPPING_V1,
  mapping_id: "prestigious-portal-export-v1",
  source_type: "MANUAL_PORTAL",
  source_name: "Prestigious authorised portal export",
};

export const SANDERSON_FILE_MAPPING_V1: SupplierImportMapping = {
  mapping_id: "sanderson-file-v1",
  version: "1.0.0",
  supplier_id: "sanderson-design-group",
  source_type: "OFFICIAL_CSV",
  source_name: "Sanderson Design Group authorised supplier file",
  fields: {
    supplier_sku: { column: "SKU", kind: "TEXT" },
    brand_id: { column: "Brand Code", kind: "TEXT" },
    standard_trade_price: { column: "Standard Price", kind: "DECIMAL" },
    cut_trade_price: { column: "Cut Length Price", kind: "DECIMAL" },
    currency: { column: "Currency", kind: "UPPERCASE" },
    stock_unit: { column: "Stock UOM", kind: "UPPERCASE" },
    aggregate_available_quantity: { column: "Available Quantity", kind: "NUMBER" },
    batch_reference: { column: "Dye Lot", kind: "TEXT" },
    batch_available_quantity: { column: "Lot Quantity", kind: "NUMBER" },
    pieces: { column: "Pieces", kind: "INTEGER" },
    next_due_date: { column: "Due Date", kind: "DATE" },
    next_due_quantity: { column: "Due Quantity", kind: "NUMBER" },
    sample_available: { column: "Sample Available", kind: "BOOLEAN" },
    lifecycle_state: { column: "Lifecycle", kind: "LIFECYCLE", value_map: { Active: "CURRENT", Discontinued: "DISCONTINUED" } },
  },
  defaults: { verification_status: "UNVERIFIED" },
};

export const SUPPLIER_IMPORT_MAPPING_PROFILES = new Map([
  [PRESTIGIOUS_FILE_MAPPING_V1.mapping_id, PRESTIGIOUS_FILE_MAPPING_V1],
  [PRESTIGIOUS_PORTAL_EXPORT_MAPPING_V1.mapping_id, PRESTIGIOUS_PORTAL_EXPORT_MAPPING_V1],
  [SANDERSON_FILE_MAPPING_V1.mapping_id, SANDERSON_FILE_MAPPING_V1],
]);
