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
 * PT uses genuine Standard Price ex VAT; other suppliers retain their approved
 * cut-price basis. Neither field is derived from the other. The latest genuine
 * approved price remains valid until superseded. Age-based
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

  for (const snapshot of [...input.snapshots].sort((left, right) => Date.parse(right.checked_at) - Date.parse(left.checked_at))) {
    const latestPromotion = latestPromotionBySnapshot.get(snapshot.snapshot_id);
    const price = firstRelation(snapshot.prices);
    const basePrice = Number(input.supplierId === 'prestigious-textiles'
      ? price?.standard_trade_price : price?.cut_trade_price);
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
