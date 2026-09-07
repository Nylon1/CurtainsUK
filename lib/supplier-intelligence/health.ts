import { effectivePromotionState } from "./promotion";
import type { DurableSupplierSnapshot, SupplierChange, SupplierHealthReport, SupplierIntelligenceDataset } from "./types";

function latestTwoBySku(snapshots: readonly DurableSupplierSnapshot[]) {
  const groups = new Map<string, DurableSupplierSnapshot[]>();
  for (const snapshot of snapshots) {
    const key = `${snapshot.supplier_id}:${snapshot.supplier_sku}`;
    groups.set(key, [...(groups.get(key) ?? []), snapshot]);
  }
  return [...groups.values()].map((items) => items.sort((a, b) => Date.parse(b.checked_at) - Date.parse(a.checked_at)).slice(0, 2));
}

function change(current: DurableSupplierSnapshot, previous: DurableSupplierSnapshot, previousValue: string | number | null, currentValue: string | number | null): SupplierChange {
  return {
    supplier_id: current.supplier_id,
    supplier_sku: current.supplier_sku,
    previous_snapshot_id: previous.snapshot_id,
    current_snapshot_id: current.snapshot_id,
    previous_value: previousValue,
    current_value: currentValue,
  };
}

function price(snapshot: DurableSupplierSnapshot) {
  return snapshot.cut_trade_price ?? snapshot.standard_trade_price;
}

export function buildSupplierHealthReport(
  dataset: SupplierIntelligenceDataset,
  options: { supplierId?: string; now?: Date; lowStockThresholdBySupplier?: Record<string, number> } = {},
): SupplierHealthReport {
  const now = options.now ?? new Date();
  const snapshots = dataset.snapshots.filter((snapshot) => !options.supplierId || snapshot.supplier_id === options.supplierId);
  const runs = dataset.sync_runs.filter((run) => !options.supplierId || run.supplier_id === options.supplierId).sort((a, b) => Date.parse(b.completed_at) - Date.parse(a.completed_at));
  const links = dataset.catalog_links.filter((link) => !options.supplierId || link.supplier_id === options.supplierId);
  const latestPairs = latestTwoBySku(snapshots);
  const latest = latestPairs.map((pair) => pair[0]);
  const priceIncreases: SupplierChange[] = [];
  const priceDecreases: SupplierChange[] = [];
  const newlyLowStock: SupplierChange[] = [];
  const newlyUnavailable: SupplierChange[] = [];
  const nextDueChanges: SupplierChange[] = [];
  const newlyDiscontinued: SupplierChange[] = [];

  for (const pair of latestPairs) {
    const [current, previous] = pair;
    if (!previous) continue;
    const currentPrice = price(current);
    const previousPrice = price(previous);
    if (currentPrice !== null && previousPrice !== null && Number(currentPrice) > Number(previousPrice)) priceIncreases.push(change(current, previous, previousPrice, currentPrice));
    if (currentPrice !== null && previousPrice !== null && Number(currentPrice) < Number(previousPrice)) priceDecreases.push(change(current, previous, previousPrice, currentPrice));
    const threshold = options.lowStockThresholdBySupplier?.[current.supplier_id];
    if (threshold !== undefined && current.aggregate_available_quantity !== null && previous.aggregate_available_quantity !== null && current.aggregate_available_quantity > 0 && current.aggregate_available_quantity <= threshold && previous.aggregate_available_quantity > threshold) {
      newlyLowStock.push(change(current, previous, previous.aggregate_available_quantity, current.aggregate_available_quantity));
    }
    if (current.aggregate_available_quantity === 0 && previous.aggregate_available_quantity !== null && previous.aggregate_available_quantity > 0) newlyUnavailable.push(change(current, previous, previous.aggregate_available_quantity, 0));
    const currentDue = `${current.next_due_date ?? "UNKNOWN"}:${current.next_due_quantity ?? "UNKNOWN"}`;
    const previousDue = `${previous.next_due_date ?? "UNKNOWN"}:${previous.next_due_quantity ?? "UNKNOWN"}`;
    if (currentDue !== previousDue) nextDueChanges.push(change(current, previous, previousDue, currentDue));
    if (current.lifecycle_state === "DISCONTINUED" && previous.lifecycle_state !== "DISCONTINUED") newlyDiscontinued.push(change(current, previous, previous.lifecycle_state, current.lifecycle_state));
  }

  const staleSkus = latest.filter((snapshot) => snapshot.stock_expires_at !== null && Date.parse(snapshot.stock_expires_at) <= now.getTime()).map((snapshot) => snapshot.supplier_sku);
  const expiredSkus = latest.filter((snapshot) => effectivePromotionState(snapshot, dataset.promotion_events, now) === "EXPIRED").map((snapshot) => snapshot.supplier_sku);
  const awaitingApproval = latest.filter((snapshot) => ["RAW_SHADOW", "VALIDATED"].includes(effectivePromotionState(snapshot, dataset.promotion_events, now))).map((snapshot) => snapshot.supplier_sku);

  return {
    generated_at: now.toISOString(),
    supplier_id: options.supplierId ?? null,
    last_successful_run: runs.find((run) => run.status === "SUCCEEDED") ?? null,
    last_failed_run: runs.find((run) => run.status === "FAILED") ?? null,
    stale_skus: [...new Set(staleSkus)],
    expired_skus: [...new Set(expiredSkus)],
    awaiting_approval_skus: [...new Set(awaitingApproval)],
    awaiting_approval: latest.filter((snapshot) => ["RAW_SHADOW", "VALIDATED"].includes(effectivePromotionState(snapshot, dataset.promotion_events, now))).map((snapshot) => ({ snapshot_id: snapshot.snapshot_id, supplier_sku: snapshot.supplier_sku, checked_at: snapshot.checked_at, validation_status: snapshot.validation_status })),
    price_verification_required_skus: links.filter((link) => link.price_verification_status === "PRICE_REQUIRES_VERIFICATION").map((link) => link.supplier_sku),
    price_increases: priceIncreases,
    price_decreases: priceDecreases,
    newly_low_stock: newlyLowStock,
    newly_unavailable: newlyUnavailable,
    next_due_changes: nextDueChanges,
    newly_discontinued: newlyDiscontinued,
    validation_failures: snapshots.filter((snapshot) => snapshot.validation_status === "FAILED").map((snapshot) => ({ snapshot_id: snapshot.snapshot_id, supplier_sku: snapshot.supplier_sku, errors: snapshot.validation_errors })),
  };
}
