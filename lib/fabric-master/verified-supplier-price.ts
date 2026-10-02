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

function approvedCandidates(input: {
  snapshots: readonly SupplierPriceSnapshotCandidate[];
  promotionEvents: readonly SupplierPromotionObservation[];
  now: number;
}) {
  const latestPromotionBySnapshot = new Map<string, SupplierPromotionObservation>();
  for (const event of [...input.promotionEvents].sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at))) {
    if (!latestPromotionBySnapshot.has(event.snapshot_id)) latestPromotionBySnapshot.set(event.snapshot_id, event);
  }
  return [...input.snapshots]
    .sort((left, right) => Date.parse(right.checked_at) - Date.parse(left.checked_at))
    .filter((snapshot) => {
      const latestPromotion = latestPromotionBySnapshot.get(snapshot.snapshot_id);
      const checked = Date.parse(snapshot.checked_at);
      const price = firstRelation(snapshot.prices);
      return latestPromotion?.promotion_state === "APPROVED_FOR_PROJECTION"
        && Number.isFinite(checked)
        && checked <= input.now
        && price?.currency === "GBP";
    });
}

/**
 * CurtainsUK PT commercial rule: Cut Price is the primary supplier base price.
 * Older approved Standard Price evidence remains a legacy fallback where no
 * approved Cut Price exists. SDG continues to use approved Cut Price.
 *
 * Raw supplier fields remain separate evidence; this selector does not rewrite,
 * derive or mutate either source field.
 */
export function selectCurrentApprovedSupplierCostMinor(input: {
  supplierId: string;
  snapshots: readonly SupplierPriceSnapshotCandidate[];
  promotionEvents: readonly SupplierPromotionObservation[];
  now?: Date;
}) {
  const candidates = approvedCandidates({
    snapshots: input.snapshots,
    promotionEvents: input.promotionEvents,
    now: (input.now ?? new Date()).getTime(),
  });

  const selectField = (field: "cut_trade_price" | "standard_trade_price") => {
    for (const snapshot of candidates) {
      const price = firstRelation(snapshot.prices);
      const value = Number(price?.[field]);
      if (Number.isFinite(value) && value > 0) return Math.round(value * 100);
    }
    return null;
  };

  if (input.supplierId === "prestigious-textiles") {
    return selectField("cut_trade_price") ?? selectField("standard_trade_price");
  }
  return selectField("cut_trade_price");
}
