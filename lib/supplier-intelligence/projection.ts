import { evaluateSupplierAvailability } from "@/lib/supplier-sync/availability";
import type { SupplierStockUnit } from "@/lib/supplier-sync/types";
import { effectivePromotionState } from "./promotion";
import type { CustomerSafeSupplierProjection, DurableSupplierSnapshot, PromotionEvent, PublicSupplierAvailability } from "./types";

const PUBLIC_STATE: Record<string, PublicSupplierAvailability> = {
  "Fabric available": "FABRIC_AVAILABLE",
  "Limited availability": "LIMITED_AVAILABILITY",
  "Available soon": "AVAILABLE_SOON",
  "Availability to be confirmed": "AVAILABILITY_TO_BE_CONFIRMED",
  "Temporarily unavailable": "TEMPORARILY_UNAVAILABLE",
  "No longer available": "NO_LONGER_AVAILABLE",
};

export function buildCustomerSafeSupplierProjection(input: {
  snapshot: DurableSupplierSnapshot | null;
  promotionEvents: readonly PromotionEvent[];
  requirement: { quantity: number; stock_unit: SupplierStockUnit } | null;
  now?: Date;
}): CustomerSafeSupplierProjection {
  const now = input.now ?? new Date();
  if (!input.snapshot) return { supplier_id: "UNKNOWN", supplier_sku: "UNKNOWN", checked_at: null, availability: "AVAILABILITY_TO_BE_CONFIRMED", promotion_state: "UNAPPROVED" };
  const state = effectivePromotionState(input.snapshot, input.promotionEvents, now);
  if (state !== "APPROVED_FOR_PROJECTION") return {
    supplier_id: input.snapshot.supplier_id,
    supplier_sku: input.snapshot.supplier_sku,
    checked_at: input.snapshot.checked_at,
    availability: "AVAILABILITY_TO_BE_CONFIRMED",
    promotion_state: state === "EXPIRED" ? "EXPIRED" : "UNAPPROVED",
  };
  if (!input.requirement) return {
    supplier_id: input.snapshot.supplier_id,
    supplier_sku: input.snapshot.supplier_sku,
    checked_at: input.snapshot.checked_at,
    availability: input.snapshot.lifecycle_state === "DISCONTINUED" ? "NO_LONGER_AVAILABLE" : "AVAILABILITY_TO_BE_CONFIRMED",
    promotion_state: "APPROVED_FOR_PROJECTION",
  };
  const evaluated = evaluateSupplierAvailability(input.snapshot, input.requirement, { now, freshnessHours: Number.MAX_SAFE_INTEGER });
  return {
    supplier_id: input.snapshot.supplier_id,
    supplier_sku: input.snapshot.supplier_sku,
    checked_at: input.snapshot.checked_at,
    availability: PUBLIC_STATE[evaluated.customer_state] ?? "AVAILABILITY_TO_BE_CONFIRMED",
    promotion_state: "APPROVED_FOR_PROJECTION",
  };
}
