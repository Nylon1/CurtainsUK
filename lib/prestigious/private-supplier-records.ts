import type { FabricSpec } from "@/lib/decision-engine/types";

/**
 * Compatibility helper for pure unit tests only. Real supplier costs now come
 * from the private PostgreSQL snapshot history through fabric-master/repository.
 */
export function resolveFabricForServerPricing(fabric: FabricSpec, cutCostMinor?: number, effectiveDate?: string): FabricSpec {
  if (!Number.isInteger(cutCostMinor) || cutCostMinor! < 0 || !effectiveDate) throw new Error("PRICE_REQUIRES_VERIFICATION");
  return {
    ...fabric,
    supplierCostPerMetre: { amountMinor: cutCostMinor!, currency: "GBP" },
    supplierCostEffectiveFrom: effectiveDate,
  };
}
