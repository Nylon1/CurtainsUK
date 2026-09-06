import type { PrestigiousPrivateSupplierRecord, PrestigiousStockState, StockEvaluation } from "./types";

export const DEFAULT_STOCK_FRESHNESS_HOURS = 24;

export function isVerificationStale(verifiedAt: string | null, now = new Date(), freshnessHours = DEFAULT_STOCK_FRESHNESS_HOURS) {
  if (!verifiedAt) return true;
  const timestamp = Date.parse(verifiedAt);
  return !Number.isFinite(timestamp) || now.getTime() - timestamp > freshnessHours * 60 * 60 * 1000;
}

export function customerStateFor(internalState: PrestigiousStockState) {
  if (internalState === "AVAILABLE") return "Fabric available" as const;
  if (internalState === "LOW_STOCK") return "Limited availability" as const;
  if (internalState === "DUE") return "Available soon" as const;
  if (internalState === "TEMPORARILY_UNAVAILABLE") return "Temporarily unavailable" as const;
  if (internalState === "DISCONTINUED") return "No longer available" as const;
  return "Availability to be confirmed" as const;
}

export function customerStateForRecord(record: PrestigiousPrivateSupplierRecord, now = new Date(), freshnessHours = DEFAULT_STOCK_FRESHNESS_HOURS) {
  return isVerificationStale(record.verifiedAt, now, freshnessHours) ? "Availability to be confirmed" as const : customerStateFor(record.stockState);
}

export function evaluateStock(record: PrestigiousPrivateSupplierRecord, requiredMetres: number, options: { now?: Date; freshnessHours?: number; lowStockHeadroomMetres?: number } = {}): StockEvaluation {
  if (!Number.isFinite(requiredMetres) || requiredMetres <= 0) throw new RangeError("Required metres must be positive");
  if (record.stockState === "DISCONTINUED") return { internalState: "DISCONTINUED", customerState: "No longer available", stale: false, sufficientSingleBatch: false };
  const stale = isVerificationStale(record.verifiedAt, options.now, options.freshnessHours);
  if (stale) return { internalState: "UNKNOWN", customerState: "Availability to be confirmed", stale: true, sufficientSingleBatch: false };
  const qualifying = record.batches.filter((batch) => batch.usableMetres >= requiredMetres);
  if (qualifying.length) {
    const best = Math.max(...qualifying.map((batch) => batch.usableMetres));
    const low = best - requiredMetres <= (options.lowStockHeadroomMetres ?? 5);
    const internalState = low ? "LOW_STOCK" : "AVAILABLE";
    return { internalState, customerState: customerStateFor(internalState), stale: false, sufficientSingleBatch: true };
  }
  const aggregate = record.batches.reduce((sum, batch) => sum + batch.usableMetres, 0);
  if (aggregate >= requiredMetres) return { internalState: "INSUFFICIENT_SINGLE_BATCH", customerState: "Availability to be confirmed", stale: false, sufficientSingleBatch: false };
  if (record.nextDueDate) return { internalState: "DUE", customerState: "Available soon", stale: false, sufficientSingleBatch: false };
  const internalState = record.stockState === "TEMPORARILY_UNAVAILABLE" ? "TEMPORARILY_UNAVAILABLE" : "UNKNOWN";
  return { internalState, customerState: customerStateFor(internalState), stale: false, sufficientSingleBatch: false };
}
