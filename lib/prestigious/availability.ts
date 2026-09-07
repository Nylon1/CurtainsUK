import { DEFAULT_SUPPLIER_SNAPSHOT_FRESHNESS_HOURS, evaluateSupplierAvailability, supplierCustomerAvailability } from "@/lib/supplier-sync/availability";
import { normalizeSupplierSnapshot } from "@/lib/supplier-sync/normalize";
import type { PrestigiousPrivateSupplierRecord, PrestigiousStockState, StockEvaluation } from "./types";

export const DEFAULT_STOCK_FRESHNESS_HOURS = DEFAULT_SUPPLIER_SNAPSHOT_FRESHNESS_HOURS;

export function isVerificationStale(verifiedAt: string | null, now = new Date(), freshnessHours = DEFAULT_STOCK_FRESHNESS_HOURS) {
  if (!verifiedAt) return true;
  const timestamp = Date.parse(verifiedAt);
  return !Number.isFinite(timestamp) || now.getTime() - timestamp > freshnessHours * 60 * 60 * 1000;
}

export function customerStateFor(internalState: PrestigiousStockState) {
  return supplierCustomerAvailability(internalState);
}

export function customerStateForRecord(record: PrestigiousPrivateSupplierRecord, now = new Date(), freshnessHours = DEFAULT_STOCK_FRESHNESS_HOURS) {
  return isVerificationStale(record.verifiedAt, now, freshnessHours) ? "Availability to be confirmed" as const : customerStateFor(record.stockState);
}

export function evaluateStock(record: PrestigiousPrivateSupplierRecord, requiredMetres: number, options: { now?: Date; freshnessHours?: number; lowStockHeadroomMetres?: number } = {}): StockEvaluation {
  const snapshot = normalizeSupplierSnapshot({
    supplier_id: "prestigious-textiles",
    supplier_sku: record.supplierSku,
    checked_at: record.verifiedAt ?? "invalid",
    stock_unit: "METRE",
    aggregate_available_quantity: record.stockState === "TEMPORARILY_UNAVAILABLE" ? 0 : record.totalFreeStockMetres,
    batches: record.batches.map((batch) => ({ batch_reference: batch.batchReference, batch_available_quantity: batch.usableMetres, pieces: batch.pieces })),
    next_due_date: record.nextDueDate,
    next_due_quantity: record.nextDueMetres,
    lifecycle_state: record.stockState === "DISCONTINUED" ? "DISCONTINUED" : "UNKNOWN",
    source: { type: "MANUAL_PORTAL", name: "Legacy Phase 4C verification", reference: null },
    verification_status: record.verifiedAt ? "VERIFIED" : "UNVERIFIED",
  });
  const evaluated = evaluateSupplierAvailability(snapshot, { quantity: requiredMetres, stock_unit: "METRE" }, {
    now: options.now,
    freshnessHours: options.freshnessHours,
    lowStockHeadroom: options.lowStockHeadroomMetres,
  });
  return {
    internalState: evaluated.internal_state,
    customerState: evaluated.customer_state,
    stale: evaluated.stale,
    sufficientSingleBatch: evaluated.sufficient_single_batch,
  };
}
