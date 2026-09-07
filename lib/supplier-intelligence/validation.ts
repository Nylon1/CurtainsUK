import { validateSupplierSnapshot } from "@/lib/supplier-sync/normalize";
import type { NormalizedSupplierSnapshot } from "@/lib/supplier-sync/types";
import type { FreshnessDataType, SupplierFreshnessPolicy, SupplierValidationContext, SupplierValidationResult } from "./types";

function expiryFor(snapshot: NormalizedSupplierSnapshot, dataType: FreshnessDataType, policies: readonly SupplierFreshnessPolicy[]) {
  const applicable = policies
    .filter((policy) => policy.supplier_id === snapshot.supplier_id && policy.source_type === snapshot.source.type && policy.data_type === dataType && Date.parse(policy.effective_from) <= Date.parse(snapshot.checked_at))
    .sort((a, b) => Date.parse(b.effective_from) - Date.parse(a.effective_from))[0];
  if (!applicable) return null;
  return new Date(Date.parse(snapshot.checked_at) + applicable.freshness_minutes * 60_000).toISOString();
}

function hasStock(snapshot: NormalizedSupplierSnapshot) {
  return snapshot.aggregate_available_quantity !== null || snapshot.batches !== null || snapshot.next_due_date !== null || snapshot.next_due_quantity !== null;
}

function hasPrice(snapshot: NormalizedSupplierSnapshot) {
  return snapshot.standard_trade_price !== null || snapshot.cut_trade_price !== null;
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

  if (context.required_price_field === "CUT_TRADE_PRICE" && snapshot.cut_trade_price === null) errors.push("CUT_TRADE_PRICE_REQUIRED");
  if (context.required_price_field === "STANDARD_TRADE_PRICE" && snapshot.standard_trade_price === null) errors.push("STANDARD_TRADE_PRICE_REQUIRED");

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

  const stockExpiry = hasStock(snapshot) ? expiryFor(snapshot, "STOCK", context.freshness_policies) : null;
  const priceExpiry = hasPrice(snapshot) ? expiryFor(snapshot, "PRICE", context.freshness_policies) : null;
  const lifecycleExpiry = snapshot.lifecycle_state !== "UNKNOWN" ? expiryFor(snapshot, "LIFECYCLE", context.freshness_policies) : null;
  if (hasStock(snapshot) && stockExpiry === null) errors.push("STOCK_FRESHNESS_POLICY_MISSING");
  if (hasPrice(snapshot) && priceExpiry === null) errors.push("PRICE_FRESHNESS_POLICY_MISSING");
  if (snapshot.lifecycle_state !== "UNKNOWN" && lifecycleExpiry === null) errors.push("LIFECYCLE_FRESHNESS_POLICY_MISSING");
  if (stockExpiry !== null && Date.parse(stockExpiry) <= now.getTime()) errors.push("STOCK_SOURCE_EXPIRED");
  if (priceExpiry !== null && Date.parse(priceExpiry) <= now.getTime()) errors.push("PRICE_SOURCE_EXPIRED");
  if (lifecycleExpiry !== null && Date.parse(lifecycleExpiry) <= now.getTime()) errors.push("LIFECYCLE_SOURCE_EXPIRED");

  return {
    status: errors.length ? "FAILED" : "VALIDATED",
    errors: [...new Set(errors)],
    stock_expires_at: stockExpiry,
    price_expires_at: priceExpiry,
    lifecycle_expires_at: lifecycleExpiry,
  };
}
