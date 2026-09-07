import type { NormalizedSupplierSnapshot, SupplierSnapshotSourceType } from "@/lib/supplier-sync/types";
import type { PromotionEvent, SupplierValidationResult } from "@/lib/supplier-intelligence/types";

export type SupplierImportFormat = "CSV" | "XLS" | "XLSX" | "PDF" | "PORTAL_EXPORT";

export interface SupplierImportDocument {
  filename: string;
  mime_type: string | null;
  bytes: Uint8Array;
  format?: SupplierImportFormat;
}

export interface SupplierImportParserOptions {
  sheet_name?: string;
  header_row?: number;
  delimiter?: string;
  pdf_delimiter?: string;
}

export interface ParsedSupplierTable {
  format: SupplierImportFormat;
  sheet_name: string | null;
  /** Timestamp embedded by the source document, never the local import time. */
  source_observed_at: string | null;
  headers: string[];
  rows: Array<Record<string, string | null>>;
  warnings: string[];
}

export type SupplierImportField =
  | "supplier_sku"
  | "brand_id"
  | "checked_at"
  | "standard_trade_price"
  | "cut_trade_price"
  | "currency"
  | "stock_unit"
  | "aggregate_available_quantity"
  | "batch_reference"
  | "batch_available_quantity"
  | "pieces"
  | "next_due_date"
  | "next_due_quantity"
  | "sample_available"
  | "lifecycle_state"
  | "verification_status";

export type SupplierImportValueKind = "TEXT" | "DECIMAL" | "NUMBER" | "INTEGER" | "DATE" | "BOOLEAN" | "UPPERCASE" | "LIFECYCLE" | "VERIFICATION";

export interface SupplierImportColumnRule {
  column: string;
  kind: SupplierImportValueKind;
  value_map?: Record<string, string>;
}

export interface SupplierImportMapping {
  mapping_id: string;
  version: string;
  supplier_id: string;
  source_type: SupplierSnapshotSourceType;
  source_name: string;
  fields: Partial<Record<SupplierImportField, SupplierImportColumnRule>>;
  defaults?: Partial<Record<SupplierImportField, string | number | boolean | null>>;
  parser?: SupplierImportParserOptions;
}

export interface SupplierImportMappedCandidate {
  source_rows: number[];
  snapshot: NormalizedSupplierSnapshot | null;
  mapping_errors: string[];
}

export type SupplierImportAction = "NEW" | "UPDATE" | "UNCHANGED" | "INVALID";
export type SupplierLifecycleTransition = "NONE" | "CURRENT_TO_DISCONTINUED" | "DISCONTINUED_TO_CURRENT" | "TO_UNKNOWN" | "FROM_UNKNOWN";

export interface SupplierImportFieldDiff {
  field: string;
  before: unknown;
  after: unknown;
  private: boolean;
}

export interface SupplierImportPreviewRow {
  source_rows: number[];
  supplier_sku: string | null;
  snapshot: NormalizedSupplierSnapshot | null;
  action: SupplierImportAction;
  lifecycle_transition: SupplierLifecycleTransition;
  validation: SupplierValidationResult | null;
  errors: string[];
  diff: SupplierImportFieldDiff[];
}

export interface SupplierImportPreview {
  preview_hash: string;
  file_sha256: string;
  format: SupplierImportFormat;
  mapping_id: string;
  mapping_version: string;
  supplier_id: string;
  source_name: string;
  generated_at: string;
  parser_warnings: string[];
  rows: SupplierImportPreviewRow[];
  summary: {
    source_rows: number;
    candidates: number;
    new: number;
    updated: number;
    unchanged: number;
    invalid: number;
    lifecycle_transitions: number;
  };
}

export interface SupplierBulkAppendItem {
  snapshot: NormalizedSupplierSnapshot;
  validation: SupplierValidationResult;
  validation_event: PromotionEvent;
}

export interface SupplierBulkApplyResult {
  run_id: string | null;
  preview_hash: string;
  appended: number;
  valid: number;
  invalid_retained_for_audit: number;
  unchanged_skipped: number;
  shopify_writes: 0;
  production_schedule_created: false;
}
