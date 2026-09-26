import { normalizeSupplierSnapshot } from "./normalize";
import type { NormalizedSupplierSnapshot } from "./types";

export const PT_SUPPLIER = "prestigious-textiles";
export const PT_SOURCE = "Prestigious Webtex authenticated Stock Enquiry";
export const PT_REFRESH_INTERVAL_MS = 72 * 60 * 60 * 1000;

export interface PtIdentity { supplierSku: string; collection: string; brandId: string; lifecycleState: string }
export interface PtStockRow {
  sku: string;
  stockText: string;
  indicator: string;
  observedAt: string;
  queryType: "COLLECTION" | "DESIGN_CODE" | "PRODUCT_CODE";
  queryValue: string;
}
export interface PtStockException { sku: string; reason: string }
export interface PtReconciliation {
  snapshots: NormalizedSupplierSnapshot[];
  exceptions: PtStockException[];
  overlapCount: number;
}

const EXACT_SKU = /^\d{4}\/\d{3}$/;
const METRES = /^(\d+(?:\.\d+)?)\s*M$/i;

export function nextPtRefreshAt(lastSuccessfulAt: string): Date {
  const last = Date.parse(lastSuccessfulAt);
  if (!Number.isFinite(last)) throw new Error("PT_LAST_SUCCESS_INVALID");
  return new Date(last + PT_REFRESH_INTERVAL_MS);
}

/** Only a supplier-returned, exact PT SKU with a numeric metre value is usable. */
export function reconcilePtStock(identities: readonly PtIdentity[], rows: readonly PtStockRow[]): PtReconciliation {
  const manifest = new Map<string, PtIdentity>();
  for (const identity of identities) {
    if (!EXACT_SKU.test(identity.supplierSku) || !identity.collection.trim() || identity.brandId !== PT_SUPPLIER ||
        identity.lifecycleState === "DISCONTINUED" || manifest.has(identity.supplierSku)) throw new Error("PT_MANIFEST_IDENTITY_INVALID");
    manifest.set(identity.supplierSku, identity);
  }
  const accepted = new Map<string, { metres: number; row: PtStockRow }>();
  const rejected = new Map<string, string>();
  let overlapCount = 0;
  for (const row of rows) {
    // Collection searches can return similarly named collections and other products.
    // They never expand the governed Fabric Master manifest.
    if (!manifest.has(row.sku)) continue;
    if (rejected.has(row.sku)) continue;
    if (row.indicator.toUpperCase() === "D") { accepted.delete(row.sku); rejected.set(row.sku, "SUPPLIER_DISCONTINUED_FLAG"); continue; }
    const match = METRES.exec(row.stockText.trim());
    const observedAt = Date.parse(row.observedAt);
    if (!match || !Number.isFinite(observedAt) || observedAt > Date.now()) {
      accepted.delete(row.sku); rejected.set(row.sku, "INVALID_METRE_EVIDENCE"); continue;
    }
    const metres = Number(match[1]);
    if (!Number.isFinite(metres) || metres < 0) { accepted.delete(row.sku); rejected.set(row.sku, "INVALID_METRE_EVIDENCE"); continue; }
    const prior = accepted.get(row.sku);
    if (prior) {
      overlapCount += 1;
      if (prior.metres !== metres) { accepted.delete(row.sku); rejected.set(row.sku, "CONFLICTING_SUPPLIER_QUANTITIES"); }
      continue;
    }
    accepted.set(row.sku, { metres, row });
  }
  const snapshots = [...accepted].map(([sku, { metres, row }]) => normalizeSupplierSnapshot({
    supplier_id: PT_SUPPLIER, brand_id: manifest.get(sku)!.brandId, supplier_sku: sku,
    checked_at: row.observedAt, stock_unit: "METRE", aggregate_available_quantity: metres,
    lifecycle_state: "CURRENT", verification_status: "VERIFIED",
    source: { type: "MANUAL_PORTAL", name: PT_SOURCE,
      reference: `pt:Webtex:${row.queryType}:${row.queryValue}:${sku}` },
  }));
  const exceptions = [...manifest.keys()].filter((sku) => !accepted.has(sku))
    .map((sku) => ({ sku, reason: rejected.get(sku) ?? "NOT_FOUND_IN_AUTHENTICATED_WEBTEX" }));
  return { snapshots, exceptions, overlapCount };
}

export function assertProvenPtCoverage(identities: readonly PtIdentity[], result: PtReconciliation): void {
  const expected = new Set(identities.map((item) => item.supplierSku));
  const resolved = new Set(result.snapshots.map((item) => item.supplier_sku));
  const unsupported = new Set(result.exceptions.map((item) => item.sku));
  if (identities.length === 0 || expected.size !== identities.length ||
      resolved.size !== result.snapshots.length || unsupported.size !== result.exceptions.length ||
      result.snapshots.length + result.exceptions.length !== identities.length ||
      [...resolved].some((sku) => !expected.has(sku) || unsupported.has(sku)) ||
      [...unsupported].some((sku) => !expected.has(sku))) {
    throw new Error("PT_COVERAGE_CHANGED");
  }
}
