import type { NormalizedSupplierSnapshot, SupplierAvailabilityEvaluation, SupplierAvailabilityState, SupplierCustomerAvailability, SupplierStockUnit } from "./types";

export const DEFAULT_SUPPLIER_SNAPSHOT_FRESHNESS_HOURS = 24;

export function isSupplierSnapshotStale(snapshot: NormalizedSupplierSnapshot, now = new Date(), freshnessHours = DEFAULT_SUPPLIER_SNAPSHOT_FRESHNESS_HOURS) {
  const checked = Date.parse(snapshot.checked_at);
  return !Number.isFinite(checked) || now.getTime() - checked > freshnessHours * 60 * 60 * 1000;
}

export function supplierCustomerAvailability(state: SupplierAvailabilityState): SupplierCustomerAvailability {
  if (state === "AVAILABLE") return "Fabric available";
  if (state === "LOW_STOCK") return "Limited availability";
  if (state === "DUE") return "Available soon";
  if (state === "TEMPORARILY_UNAVAILABLE") return "Temporarily unavailable";
  if (state === "DISCONTINUED") return "No longer available";
  return "Availability to be confirmed";
}

function result(state: SupplierAvailabilityState, stale: boolean, sufficient: boolean): SupplierAvailabilityEvaluation {
  return { internal_state: state, customer_state: supplierCustomerAvailability(state), stale, sufficient_single_batch: sufficient };
}

export function evaluateSupplierAvailability(
  snapshot: NormalizedSupplierSnapshot,
  requirement: { quantity: number; stock_unit: SupplierStockUnit },
  options: { now?: Date; freshnessHours?: number; lowStockHeadroom?: number } = {},
): SupplierAvailabilityEvaluation {
  if (!Number.isFinite(requirement.quantity) || requirement.quantity <= 0) throw new RangeError("Required quantity must be positive");
  if (snapshot.lifecycle_state === "DISCONTINUED") return result("DISCONTINUED", false, false);
  if (snapshot.verification_status !== "VERIFIED") return result("UNKNOWN", false, false);
  const stale = isSupplierSnapshotStale(snapshot, options.now, options.freshnessHours);
  if (stale) return result("UNKNOWN", true, false);
  if (snapshot.stock_unit === null || snapshot.stock_unit !== requirement.stock_unit) return result("UNKNOWN", false, false);

  const knownBatches = (snapshot.batches ?? []).filter((batch) => batch.batch_available_quantity !== null);
  const qualifying = knownBatches.filter((batch) => (batch.batch_available_quantity ?? 0) >= requirement.quantity);
  if (qualifying.length) {
    const best = Math.max(...qualifying.map((batch) => batch.batch_available_quantity ?? 0));
    const state = best - requirement.quantity <= (options.lowStockHeadroom ?? 5) ? "LOW_STOCK" : "AVAILABLE";
    return result(state, false, true);
  }

  const batchAggregate = knownBatches.reduce((sum, batch) => sum + (batch.batch_available_quantity ?? 0), 0);
  if (knownBatches.length > 1 && batchAggregate >= requirement.quantity) return result("INSUFFICIENT_SINGLE_BATCH", false, false);
  if (snapshot.next_due_date !== null) return result("DUE", false, false);
  if (snapshot.aggregate_available_quantity === 0 || (knownBatches.length > 0 && batchAggregate === 0)) return result("TEMPORARILY_UNAVAILABLE", false, false);
  return result("UNKNOWN", false, false);
}
