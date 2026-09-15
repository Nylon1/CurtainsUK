import { STOCK_VALIDITY_MS } from "@/lib/storefront/daily-stock";
import { validateSupplierSnapshot } from "@/lib/supplier-sync/normalize";
import type { NormalizedSupplierSnapshot } from "@/lib/supplier-sync/types";
import type { SupplierValidationContext, SupplierValidationResult } from "./types";

function hasStock(snapshot: NormalizedSupplierSnapshot) {
  return snapshot.aggregate_available_quantity !== null || snapshot.batches !== null || snapshot.next_due_date !== null || snapshot.next_due_quantity !== null;
}

export function validateSupplierIntelligenceSnapshot(
  snapshot: NormalizedSupplierSnapshot,
  context: SupplierValidationContext,
  now = new Date(),
): SupplierValidationResult {
  const errors = validateSupplierSnapshot(snapshot);
  if (!context.known_supplier) errors.push("UNKNOWN_SUPPLIER");
  if (!context.known_sku) errors.push("UNKNOWN_SUPPLIER_SKU");
  if (snapshot.currency !== null && !context.allowed_currencies.includes(snapshot.currency)) errors.push("UNSUPPORTED_CURRENCY");
  if (snapshot.stock_unit !== null && !context.allowed_stock_units.includes(snapshot.stock_unit)) errors.push("UNSUPPORTED_STOCK_UNIT");

  // A genuine stock-only observation may be approved without manufacturing a price.
  // Price selectors still require their own positive, approved cut-price basis.
  if (!hasStock(snapshot) && context.required_price_field === "CUT_TRADE_PRICE" && snapshot.cut_trade_price === null) errors.push("CUT_TRADE_PRICE_REQUIRED");
  if (!hasStock(snapshot) && context.required_price_field === "STANDARD_TRADE_PRICE" && snapshot.standard_trade_price === null) errors.push("STANDARD_TRADE_PRICE_REQUIRED");

  const references = new Set<string>();
  for (const batch of snapshot.batches ?? []) {
    if ((batch.batch_available_quantity !== null || batch.pieces !== null) && batch.batch_reference === null) errors.push("BATCH_REFERENCE_REQUIRED");
    if (batch.batch_reference !== null) {
      if (references.has(batch.batch_reference)) errors.push("DUPLICATE_BATCH_REFERENCE");
      references.add(batch.batch_reference);
    }
  }
  const knownBatchTotal = (snapshot.batches ?? []).reduce((sum, batch) => sum + (batch.batch_available_quantity ?? 0), 0);
  if (snapshot.aggregate_available_quantity !== null && snapshot.batches !== null && knownBatchTotal > snapshot.aggregate_available_quantity) errors.push("BATCH_TOTAL_EXCEEDS_AGGREGATE");

  // Preserve genuine historical observations. Only their stock usability expires.
  const checked = Date.parse(snapshot.checked_at);
  if (checked > now.getTime()) errors.push("FUTURE_OBSERVATION");
  const stockExpiry = hasStock(snapshot) && Number.isFinite(checked) ? new Date(checked + STOCK_VALIDITY_MS).toISOString() : null;
  const priceExpiry = null;
  const lifecycleExpiry = null;

  return {
    status: errors.length ? "FAILED" : "VALIDATED",
    errors: [...new Set(errors)],
    stock_expires_at: stockExpiry,
    price_expires_at: priceExpiry,
    lifecycle_expires_at: lifecycleExpiry,
  };
}
