export interface SupplierPriceSnapshotCandidate {
  snapshot_id: string;
  checked_at: string;
  price_expires_at: string | null;
  prices: Record<string, unknown> | Record<string, unknown>[] | null;
}

export interface SupplierPromotionObservation {
  snapshot_id: string;
  promotion_state: string;
  created_at: string;
}

function firstRelation(value: SupplierPriceSnapshotCandidate["prices"]) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

/**
 * CurtainsUK preserves the existing PT Standard Price selection whenever
 * Standard evidence exists. Approved Cut-only PT observations cover the
 * governed PDF cohort until Standard evidence is supplied; neither value is
 * derived from or relabelled as the other. Age-based
 * expiry fields are historical metadata, not a price gate. Explicit revocation remains authoritative.
 */
export function selectCurrentApprovedSupplierCostMinor(input: {
  supplierId: string;
  snapshots: readonly SupplierPriceSnapshotCandidate[];
  promotionEvents: readonly SupplierPromotionObservation[];
  now?: Date;
}) {
  const now = (input.now ?? new Date()).getTime();
  const latestPromotionBySnapshot = new Map<string, SupplierPromotionObservation>();
  for (const event of [...input.promotionEvents].sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at))) {
    if (!latestPromotionBySnapshot.has(event.snapshot_id)) latestPromotionBySnapshot.set(event.snapshot_id, event);
  }

  const snapshots = [...input.snapshots].sort((left, right) => Date.parse(right.checked_at) - Date.parse(left.checked_at));
  const priceFields = input.supplierId === "prestigious-textiles"
    ? ["standard_trade_price", "cut_trade_price"] as const
    : ["cut_trade_price"] as const;
  for (const priceField of priceFields) for (const snapshot of snapshots) {
    const latestPromotion = latestPromotionBySnapshot.get(snapshot.snapshot_id);
    const price = firstRelation(snapshot.prices);
    const basePrice = Number(price?.[priceField]);
    if (latestPromotion?.promotion_state !== "APPROVED_FOR_PROJECTION"
        || !Number.isFinite(Date.parse(snapshot.checked_at))
        || Date.parse(snapshot.checked_at) > now
        || price?.currency !== "GBP"
        || !Number.isFinite(basePrice)
        || basePrice <= 0) {
      continue;
    }
    return Math.round(basePrice * 100);
  }
  return null;
}
