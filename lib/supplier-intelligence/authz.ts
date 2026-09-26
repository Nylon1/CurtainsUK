import type { NormalizedSupplierSnapshot } from "../supplier-sync/types";

export const SUPPLIER_PRICE_APPROVAL_PERMISSION = "supplier_prices.approve";

export function hasSupplierAdminRole(appMetadata: Record<string, unknown> | null | undefined) {
  const roles = Array.isArray(appMetadata?.roles) ? appMetadata.roles.filter((role): role is string => typeof role === "string") : [];
  return roles.includes("SUPPLIER_ADMIN");
}

export function hasSupplierPriceApprovalPermission(appMetadata: Record<string, unknown> | null | undefined) {
  return hasSupplierAdminRole(appMetadata) || (Array.isArray(appMetadata?.permissions) && appMetadata.permissions.includes(SUPPLIER_PRICE_APPROVAL_PERMISSION));
}

/** Narrow permission cannot approve stock, lifecycle, samples, or mixed observations. */
export function isPriceOnlyObservation(snapshot: NormalizedSupplierSnapshot | null) {
  if (!snapshot) return false;
  const prices = [snapshot.standard_trade_price, snapshot.cut_trade_price];
  return prices.some(value => value !== null && Number.isFinite(Number(value)) && Number(value) > 0)
    && snapshot.stock_unit === null && snapshot.aggregate_available_quantity === null
    && (snapshot.batches === null || snapshot.batches.length === 0)
    && snapshot.next_due_date === null && snapshot.next_due_quantity === null
    && snapshot.sample_available === null && snapshot.lifecycle_state === "UNKNOWN";
}
