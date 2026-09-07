import { normalizeSupplierSnapshot } from "@/lib/supplier-sync/normalize";
import type { NormalizedSupplierSnapshot, SupplierSnapshotInput } from "@/lib/supplier-sync/types";
import type { ParsedSupplierTable, SupplierImportField, SupplierImportMappedCandidate, SupplierImportMapping, SupplierImportValueKind } from "./types";

function sourceValue(row: Record<string, string | null>, column: string) {
  const actual = Object.keys(row).find((header) => header.toLowerCase() === column.trim().toLowerCase());
  return actual ? row[actual] : undefined;
}

function mappedValue(raw: unknown, kind: SupplierImportValueKind, valueMap: Record<string, string> | undefined, field: SupplierImportField, errors: string[]) {
  if (raw === null || raw === undefined || String(raw).trim() === "") return null;
  const input = String(raw).trim();
  const mapped = valueMap?.[input] ?? valueMap?.[input.toLowerCase()] ?? input;
  if (kind === "TEXT") return mapped;
  if (kind === "UPPERCASE") return mapped.toUpperCase();
  if (kind === "DECIMAL") {
    const normalized = mapped.replace(/[£$€,\s]/g, "");
    if (!/^-?\d+(?:\.\d{1,4})?$/.test(normalized)) errors.push(`${field}:INVALID_DECIMAL`);
    return normalized;
  }
  if (kind === "NUMBER" || kind === "INTEGER") {
    const normalized = Number(mapped.replace(/,/g, ""));
    if (!Number.isFinite(normalized) || (kind === "INTEGER" && !Number.isInteger(normalized))) {
      errors.push(`${field}:INVALID_${kind}`);
      return null;
    }
    return normalized;
  }
  if (kind === "DATE") {
    const parsed = new Date(mapped);
    if (!Number.isFinite(parsed.getTime())) {
      errors.push(`${field}:INVALID_DATE`);
      return null;
    }
    return field === "checked_at" ? parsed.toISOString() : parsed.toISOString().slice(0, 10);
  }
  if (kind === "BOOLEAN") {
    if (["true", "yes", "y", "1", "available"].includes(mapped.toLowerCase())) return true;
    if (["false", "no", "n", "0", "unavailable"].includes(mapped.toLowerCase())) return false;
    errors.push(`${field}:INVALID_BOOLEAN`);
    return null;
  }
  if (kind === "LIFECYCLE") {
    const value = mapped.toUpperCase();
    if (!["CURRENT", "DISCONTINUED", "UNKNOWN"].includes(value)) errors.push(`${field}:INVALID_LIFECYCLE`);
    return value;
  }
  const value = mapped.toUpperCase();
  if (!["VERIFIED", "PARTIALLY_VERIFIED", "UNVERIFIED"].includes(value)) errors.push(`${field}:INVALID_VERIFICATION_STATUS`);
  return value;
}

function fieldValue(row: Record<string, string | null>, mapping: SupplierImportMapping, field: SupplierImportField, errors: string[]) {
  const rule = mapping.fields[field];
  const raw = rule ? sourceValue(row, rule.column) : mapping.defaults?.[field];
  if (rule && raw === undefined) {
    errors.push(`${field}:SOURCE_COLUMN_NOT_FOUND:${rule.column}`);
    return null;
  }
  return rule ? mappedValue(raw, rule.kind, rule.value_map, field, errors) : raw ?? null;
}

function mapRow(
  row: Record<string, string | null>,
  rowNumber: number,
  mapping: SupplierImportMapping,
  fileSha256: string,
  importedAt: string,
): SupplierImportMappedCandidate {
  const errors: string[] = [];
  const supplierSku = fieldValue(row, mapping, "supplier_sku", errors);
  if (typeof supplierSku !== "string" || !supplierSku.trim()) {
    errors.push("supplier_sku:REQUIRED");
    return { source_rows: [rowNumber], snapshot: null, mapping_errors: [...new Set(errors)] };
  }
  const checkedAt = fieldValue(row, mapping, "checked_at", errors) ?? importedAt;
  const batchReference = fieldValue(row, mapping, "batch_reference", errors);
  const batchQuantity = fieldValue(row, mapping, "batch_available_quantity", errors);
  const pieces = fieldValue(row, mapping, "pieces", errors);
  const hasBatch = batchReference !== null || batchQuantity !== null || pieces !== null;
  const input: SupplierSnapshotInput = {
    snapshot_id: `${mapping.supplier_id}:${supplierSku}:${checkedAt}:${fileSha256.slice(0, 16)}`,
    supplier_id: mapping.supplier_id,
    brand_id: fieldValue(row, mapping, "brand_id", errors) as string | null,
    supplier_sku: supplierSku,
    checked_at: String(checkedAt),
    standard_trade_price: fieldValue(row, mapping, "standard_trade_price", errors) as string | null,
    cut_trade_price: fieldValue(row, mapping, "cut_trade_price", errors) as string | null,
    currency: fieldValue(row, mapping, "currency", errors) as string | null,
    stock_unit: fieldValue(row, mapping, "stock_unit", errors) as string | null,
    aggregate_available_quantity: fieldValue(row, mapping, "aggregate_available_quantity", errors) as number | null,
    batches: hasBatch ? [{ batch_reference: batchReference as string | null, batch_available_quantity: batchQuantity as number | null, pieces: pieces as number | null }] : null,
    next_due_date: fieldValue(row, mapping, "next_due_date", errors) as string | null,
    next_due_quantity: fieldValue(row, mapping, "next_due_quantity", errors) as number | null,
    sample_available: fieldValue(row, mapping, "sample_available", errors) as boolean | null,
    lifecycle_state: (fieldValue(row, mapping, "lifecycle_state", errors) ?? "UNKNOWN") as NormalizedSupplierSnapshot["lifecycle_state"],
    source: { type: mapping.source_type, name: mapping.source_name, reference: `sha256:${fileSha256}` },
    verification_status: (fieldValue(row, mapping, "verification_status", errors) ?? "UNVERIFIED") as NormalizedSupplierSnapshot["verification_status"],
  };
  return { source_rows: [rowNumber], snapshot: normalizeSupplierSnapshot(input), mapping_errors: [...new Set(errors)] };
}

const MERGED_SCALARS: Array<keyof NormalizedSupplierSnapshot> = [
  "brand_id", "checked_at", "standard_trade_price", "cut_trade_price", "currency", "stock_unit",
  "aggregate_available_quantity", "next_due_date", "next_due_quantity", "sample_available", "lifecycle_state", "verification_status",
];

function mergeCandidates(candidates: SupplierImportMappedCandidate[]) {
  const unmapped = candidates.filter((candidate) => candidate.snapshot === null);
  const grouped = new Map<string, SupplierImportMappedCandidate[]>();
  for (const candidate of candidates.filter((item) => item.snapshot !== null)) {
    const key = `${candidate.snapshot!.supplier_id}:${candidate.snapshot!.supplier_sku}`;
    grouped.set(key, [...(grouped.get(key) ?? []), candidate]);
  }
  const merged = [...grouped.values()].map((items) => {
    const base = structuredClone(items[0].snapshot!);
    const errors = items.flatMap((item) => item.mapping_errors);
    for (const item of items.slice(1)) {
      const snapshot = item.snapshot!;
      for (const field of MERGED_SCALARS) {
        if (JSON.stringify(base[field]) !== JSON.stringify(snapshot[field])) errors.push(`${String(field)}:CONFLICTING_VALUES_FOR_SKU`);
      }
    }
    const batches = items.flatMap((item) => item.snapshot?.batches ?? []);
    base.batches = batches.length ? batches : null;
    return { source_rows: items.flatMap((item) => item.source_rows), snapshot: base, mapping_errors: [...new Set(errors)] };
  });
  return [...merged, ...unmapped].sort((a, b) => a.source_rows[0] - b.source_rows[0]);
}

export function mapSupplierImportRows(input: {
  table: ParsedSupplierTable;
  mapping: SupplierImportMapping;
  file_sha256: string;
  imported_at: string;
}): SupplierImportMappedCandidate[] {
  const candidates = input.table.rows.map((row, index) => mapRow(row, (input.mapping.parser?.header_row ?? 0) + index + 2, input.mapping, input.file_sha256, input.imported_at));
  return mergeCandidates(candidates);
}
