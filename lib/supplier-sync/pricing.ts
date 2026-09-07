import type { Money } from "@/lib/decision-engine/types";
import type { NormalizedSupplierSnapshot } from "./types";

export type SupplierCostField = "STANDARD_TRADE_PRICE" | "CUT_TRADE_PRICE";

export interface SupplierCostPolicy {
  price_field: SupplierCostField;
  require_verified_snapshot: boolean;
}

function decimalToMinor(value: string) {
  const [whole, fraction = ""] = value.split(".");
  return Number(whole) * 100 + Number((fraction + "00").slice(0, 2));
}

/** The commercial policy selects a field; the pricing engine contains no supplier-specific choice. */
export function resolveSupplierUnitCost(snapshot: NormalizedSupplierSnapshot, policy: SupplierCostPolicy): Money {
  if (policy.require_verified_snapshot && snapshot.verification_status !== "VERIFIED") throw new Error("SUPPLIER_PRICE_REQUIRES_VERIFICATION");
  const value = policy.price_field === "CUT_TRADE_PRICE" ? snapshot.cut_trade_price : snapshot.standard_trade_price;
  if (value === null || snapshot.currency === null) throw new Error("SUPPLIER_PRICE_UNKNOWN");
  if (snapshot.currency !== "GBP") throw new Error("SUPPLIER_CURRENCY_UNSUPPORTED");
  return { amountMinor: decimalToMinor(value), currency: "GBP" };
}
