import { PRESTIGIOUS_PILOT_FABRICS } from "@/lib/prestigious/pilot-fabrics";
import type { NormalizedSupplierSnapshot } from "./types";
import { PRESTIGIOUS_PRICE_VERIFIED_MOCHA_SKUS, PRESTIGIOUS_SUPPLIER_ID } from "./adapters/prestigious-webtex";

export const PRESTIGIOUS_SHADOW_INITIAL_SKUS = [...PRESTIGIOUS_PRICE_VERIFIED_MOCHA_SKUS];
export const PRESTIGIOUS_SHADOW_PILOT_SKUS = PRESTIGIOUS_PILOT_FABRICS.map((fabric) => fabric.uniqueSku);

export function validatePrestigiousPilotExpansion(snapshots: readonly NormalizedSupplierSnapshot[]) {
  const verified = new Set(snapshots
    .filter((snapshot) => snapshot.supplier_id === PRESTIGIOUS_SUPPLIER_ID && snapshot.verification_status === "VERIFIED" && snapshot.cut_trade_price !== null)
    .map((snapshot) => snapshot.supplier_sku));
  const missing_or_unverified_skus = PRESTIGIOUS_SHADOW_PILOT_SKUS.filter((sku) => !verified.has(sku));
  return { eligible: missing_or_unverified_skus.length === 0, missing_or_unverified_skus };
}
