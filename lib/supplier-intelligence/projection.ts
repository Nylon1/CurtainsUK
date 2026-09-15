import { dailyStockDecision } from "@/lib/storefront/daily-stock";
import type { SupplierStockUnit } from "@/lib/supplier-sync/types";
import { effectivePromotionState } from "./promotion";
import type { CustomerSafeSupplierProjection, DurableSupplierSnapshot, PromotionEvent } from "./types";

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
  const evaluated = dailyStockDecision({
    aggregateMetres: input.snapshot.stock_unit === 'METRE' ? input.snapshot.aggregate_available_quantity : null,
    confirmedUsageMetres: 0, snapshotDate: null, checkedAt: input.snapshot.checked_at,
    discontinued: input.snapshot.lifecycle_state === 'DISCONTINUED',
  }, now);
  return {
    supplier_id: input.snapshot.supplier_id,
    supplier_sku: input.snapshot.supplier_sku,
    checked_at: input.snapshot.checked_at,
    availability: evaluated.availability,
    promotion_state: "APPROVED_FOR_PROJECTION",
  };
}
