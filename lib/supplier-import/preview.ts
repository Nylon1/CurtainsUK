import { createHash } from "node:crypto";
import type { DurableSupplierSnapshot, SupplierValidationResult } from "@/lib/supplier-intelligence/types";
import { validateSupplierIntelligenceSnapshot } from "@/lib/supplier-intelligence/validation";
import type { SupplierIntelligenceRepository } from "@/lib/supplier-intelligence/repository";
import type { NormalizedSupplierSnapshot } from "@/lib/supplier-sync/types";
import { mapSupplierImportRows } from "./mapping";
import { parseSupplierImportDocument } from "./parse";
import type { SupplierImportDocument, SupplierImportFieldDiff, SupplierImportMapping, SupplierImportPreview, SupplierImportPreviewRow, SupplierLifecycleTransition } from "./types";

const COMPARED_FIELDS: Array<keyof NormalizedSupplierSnapshot> = [
  "brand_id", "standard_trade_price", "cut_trade_price", "currency", "stock_unit", "aggregate_available_quantity",
  "batches", "next_due_date", "next_due_quantity", "sample_available", "lifecycle_state", "verification_status",
];

const PRIVATE_FIELDS = new Set<keyof NormalizedSupplierSnapshot>([
  "standard_trade_price", "cut_trade_price", "aggregate_available_quantity", "batches", "next_due_date", "next_due_quantity",
]);

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, stable(item)]));
  return value;
}

function sha256(value: Uint8Array | string) {
  return createHash("sha256").update(value).digest("hex");
}

function latestValidatedBySku(snapshots: DurableSupplierSnapshot[]) {
  const latest = new Map<string, DurableSupplierSnapshot>();
  for (const snapshot of snapshots.filter((item) => item.validation_status === "VALIDATED")) {
    const current = latest.get(snapshot.supplier_sku);
    if (!current || Date.parse(snapshot.checked_at) > Date.parse(current.checked_at)) latest.set(snapshot.supplier_sku, snapshot);
  }
  return latest;
}

function diffSnapshot(current: DurableSupplierSnapshot | undefined, next: NormalizedSupplierSnapshot): SupplierImportFieldDiff[] {
  return COMPARED_FIELDS.flatMap((field) => {
    const before = current?.[field] ?? null;
    const after = next[field];
    if (JSON.stringify(stable(before)) === JSON.stringify(stable(after))) return [];
    return [{ field: String(field), before, after, private: PRIVATE_FIELDS.has(field) }];
  });
}

function lifecycleTransition(before: NormalizedSupplierSnapshot["lifecycle_state"] | undefined, after: NormalizedSupplierSnapshot["lifecycle_state"]): SupplierLifecycleTransition {
  if (before === undefined || before === after) return "NONE";
  if (before === "CURRENT" && after === "DISCONTINUED") return "CURRENT_TO_DISCONTINUED";
  if (before === "DISCONTINUED" && after === "CURRENT") return "DISCONTINUED_TO_CURRENT";
  if (after === "UNKNOWN") return "TO_UNKNOWN";
  if (before === "UNKNOWN") return "FROM_UNKNOWN";
  return "NONE";
}

export async function buildSupplierImportPreview(input: {
  document: SupplierImportDocument;
  mapping: SupplierImportMapping;
  repository: SupplierIntelligenceRepository;
  now?: Date;
}): Promise<SupplierImportPreview> {
  const now = input.now ?? new Date();
  const importedAt = now.toISOString();
  const fileSha256 = sha256(input.document.bytes);
  const table = await parseSupplierImportDocument(input.document, input.mapping.parser);
  const candidates = mapSupplierImportRows({ table, mapping: input.mapping, file_sha256: fileSha256, imported_at: importedAt });
  const [dataset, approvalPolicy] = await Promise.all([
    input.repository.dataset(input.mapping.supplier_id),
    input.repository.approvalPolicy(input.mapping.supplier_id),
  ]);
  const latestBySku = latestValidatedBySku(dataset.snapshots);
  const rows: SupplierImportPreviewRow[] = [];

  for (const candidate of candidates) {
    if (!candidate.snapshot) {
      rows.push({ source_rows: candidate.source_rows, supplier_sku: null, snapshot: null, action: "INVALID", lifecycle_transition: "NONE", validation: null, errors: candidate.mapping_errors, diff: [] });
      continue;
    }
    const context = await input.repository.validationContext({
      supplierId: candidate.snapshot.supplier_id,
      supplierSku: candidate.snapshot.supplier_sku,
      sourceType: candidate.snapshot.source.type,
      requiredPriceField: approvalPolicy?.required_price_field ?? null,
    });
    const baseValidation = validateSupplierIntelligenceSnapshot(candidate.snapshot, context, now);
    const errors = [...new Set([...candidate.mapping_errors, ...baseValidation.errors])];
    const validation: SupplierValidationResult = { ...baseValidation, status: errors.length ? "FAILED" : "VALIDATED", errors };
    const previous = latestBySku.get(candidate.snapshot.supplier_sku);
    const diff = diffSnapshot(previous, candidate.snapshot);
    rows.push({
      source_rows: candidate.source_rows,
      supplier_sku: candidate.snapshot.supplier_sku,
      snapshot: candidate.snapshot,
      action: validation.status === "FAILED" ? "INVALID" : previous ? (diff.length ? "UPDATE" : "UNCHANGED") : "NEW",
      lifecycle_transition: lifecycleTransition(previous?.lifecycle_state, candidate.snapshot.lifecycle_state),
      validation,
      errors,
      diff,
    });
  }

  const unsigned = {
    file_sha256: fileSha256,
    format: table.format,
    mapping_id: input.mapping.mapping_id,
    mapping_version: input.mapping.version,
    supplier_id: input.mapping.supplier_id,
    source_name: input.mapping.source_name,
    generated_at: importedAt,
    parser_warnings: table.warnings,
    rows,
    summary: {
      source_rows: table.rows.length,
      candidates: rows.length,
      new: rows.filter((row) => row.action === "NEW").length,
      updated: rows.filter((row) => row.action === "UPDATE").length,
      unchanged: rows.filter((row) => row.action === "UNCHANGED").length,
      invalid: rows.filter((row) => row.action === "INVALID").length,
      lifecycle_transitions: rows.filter((row) => row.lifecycle_transition !== "NONE").length,
    },
  };
  return { preview_hash: sha256(JSON.stringify(stable(unsigned))), ...unsigned };
}
