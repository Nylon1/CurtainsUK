import type { NormalizedSupplierSnapshot, SupplierSnapshotInput } from "./types";

const DECIMAL_MONEY = /^\d+(?:\.\d{1,4})?$/;

function generatedSnapshotId(input: SupplierSnapshotInput) {
  return `${input.supplier_id}:${input.supplier_sku}:${input.checked_at}`;
}

export function normalizeSupplierSnapshot(input: SupplierSnapshotInput): NormalizedSupplierSnapshot {
  return {
    snapshot_id: input.snapshot_id ?? generatedSnapshotId(input),
    supplier_id: input.supplier_id,
    brand_id: input.brand_id ?? null,
    supplier_sku: input.supplier_sku,
    checked_at: input.checked_at,
    standard_trade_price: input.standard_trade_price ?? null,
    cut_trade_price: input.cut_trade_price ?? null,
    currency: input.currency ?? null,
    stock_unit: input.stock_unit ?? null,
    aggregate_available_quantity: input.aggregate_available_quantity ?? null,
    batches: input.batches == null ? null : input.batches.map((batch) => ({
      batch_reference: batch.batch_reference ?? null,
      batch_available_quantity: batch.batch_available_quantity ?? null,
      pieces: batch.pieces ?? null,
    })),
    next_due_date: input.next_due_date ?? null,
    next_due_quantity: input.next_due_quantity ?? null,
    sample_available: input.sample_available ?? null,
    lifecycle_state: input.lifecycle_state ?? "UNKNOWN",
    source: {
      type: input.source.type,
      name: input.source.name,
      reference: input.source.reference ?? null,
    },
    verification_status: input.verification_status ?? "UNVERIFIED",
  };
}

export function validateSupplierSnapshot(snapshot: NormalizedSupplierSnapshot): string[] {
  const errors: string[] = [];
  if (!snapshot.snapshot_id.trim()) errors.push("snapshot_id is required");
  if (!snapshot.supplier_id.trim()) errors.push("supplier_id is required");
  if (!snapshot.supplier_sku.trim()) errors.push("supplier_sku is required");
  if (!Number.isFinite(Date.parse(snapshot.checked_at))) errors.push("checked_at must be an ISO timestamp");
  if (snapshot.next_due_date !== null && !Number.isFinite(Date.parse(snapshot.next_due_date))) errors.push("next_due_date must be a valid date or null");
  for (const [field, value] of [["standard_trade_price", snapshot.standard_trade_price], ["cut_trade_price", snapshot.cut_trade_price]] as const) {
    if (value !== null && !DECIMAL_MONEY.test(value)) errors.push(`${field} must be a non-negative decimal string or null`);
  }
  if ((snapshot.standard_trade_price !== null || snapshot.cut_trade_price !== null) && snapshot.currency === null) errors.push("currency is required when a price is present");
  if (snapshot.currency !== null && !/^[A-Z]{3}$/.test(snapshot.currency)) errors.push("currency must be an ISO 4217 code or null");
  if (snapshot.aggregate_available_quantity !== null && (!Number.isFinite(snapshot.aggregate_available_quantity) || snapshot.aggregate_available_quantity < 0)) errors.push("aggregate_available_quantity must be a non-negative finite number or null");
  if ((snapshot.aggregate_available_quantity !== null || snapshot.batches !== null) && snapshot.stock_unit === null) errors.push("stock_unit is required when stock data is present");
  if (snapshot.next_due_quantity !== null && (!Number.isFinite(snapshot.next_due_quantity) || snapshot.next_due_quantity < 0)) errors.push("next_due_quantity must be a non-negative finite number or null");
  for (const batch of snapshot.batches ?? []) {
    if (batch.batch_available_quantity !== null && (!Number.isFinite(batch.batch_available_quantity) || batch.batch_available_quantity < 0)) errors.push("batch_available_quantity must be a non-negative finite number or null");
    if (batch.pieces !== null && (!Number.isInteger(batch.pieces) || batch.pieces < 0)) errors.push("pieces must be a non-negative integer or null");
  }
  return errors;
}
