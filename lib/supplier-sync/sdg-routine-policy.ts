import type { SdgStockIdentity, SdgStockReadResult } from "./adapters/sanderson-design-group";

export const SDG_REFRESH_INTERVAL_MS = 72 * 60 * 60 * 1000;
export const SDG_EXPECTED_IDENTITIES = 8636;
export const SDG_PROVEN_IDENTITIES = 7861;
export const SDG_UNRESOLVED_ZOFFANY = 775;

export function nextSdgRefreshAt(lastSuccessfulAt: string): Date {
  const last = Date.parse(lastSuccessfulAt);
  if (!Number.isFinite(last)) throw new Error("SDG_LAST_SUCCESS_INVALID");
  return new Date(last + SDG_REFRESH_INTERVAL_MS);
}

/** The proven five-brand cohort is required; Zoffany cannot be promoted by this job. */
export function assertProvenSdgCoverage(identities: readonly SdgStockIdentity[], result: SdgStockReadResult): void {
  if (identities.length !== SDG_EXPECTED_IDENTITIES || new Set(identities.map((item) => item.supplierSku)).size !== identities.length) {
    throw new Error("SDG_MANIFEST_CHANGED");
  }
  const bySku = new Map(identities.map((item) => [item.supplierSku, item]));
  const resolved = new Set<string>();
  for (const snapshot of result.snapshots) {
    const identity = bySku.get(snapshot.supplier_sku);
    if (!identity || identity.brandId !== snapshot.brand_id || identity.brandId === "sdg-zoffany" || resolved.has(snapshot.supplier_sku)) {
      throw new Error("SDG_RESOLVED_IDENTITY_CHANGED");
    }
    resolved.add(snapshot.supplier_sku);
  }
  const unresolved = new Set<string>();
  for (const item of result.exceptions) {
    if (bySku.get(item.supplierSku)?.brandId !== "sdg-zoffany" || resolved.has(item.supplierSku) || unresolved.has(item.supplierSku)) {
      throw new Error("SDG_UNRESOLVED_IDENTITY_CHANGED");
    }
    unresolved.add(item.supplierSku);
  }
  if (result.requested !== SDG_EXPECTED_IDENTITIES || resolved.size !== SDG_PROVEN_IDENTITIES ||
      unresolved.size !== SDG_UNRESOLVED_ZOFFANY || resolved.size + unresolved.size !== identities.length) {
    throw new Error("SDG_COVERAGE_CHANGED");
  }
}
