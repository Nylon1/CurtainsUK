import { createHash } from "node:crypto";
import { normalizeSupplierSnapshot } from "../normalize";
import type { NormalizedSupplierSnapshot, SupplierAdapter } from "../types";

/** Existing adapter contract remains available to callers. */
export type SandersonDesignGroupAdapter = SupplierAdapter;

// Observed in the authenticated SDG trade portal on 18 September 2026. The
// portal itself requests at most 130 product details per batch. Stay below it.
export const SDG_PORTAL_DETAIL_URL = "https://supplier.sandersondesigngroup.com/EdiNextCore/api/Product/detail";
const BATCH_SIZE = 100;
const METRE_UNITS = new Set(["m", "metre", "metres", "meter", "meters"]);

export interface SdgStockIdentity { supplierSku: string; brandId: string }
export interface SdgStockException { supplierSku: string; reason: string }
export interface SdgStockReadResult {
  snapshots: NormalizedSupplierSnapshot[];
  exceptions: SdgStockException[];
  requested: number;
}

type PortalProduct = {
  productCode?: unknown;
  productStockUnit?: unknown;
  stockInformation?: { primaryStock?: unknown; purchaseStockUnitDescription?: unknown } | null;
};

function quantity(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function isMetres(value: unknown): boolean {
  return typeof value === "string" && METRE_UNITS.has(value.trim().toLowerCase());
}

function snapshotFor(product: PortalProduct, identity: SdgStockIdentity, checkedAt: string): NormalizedSupplierSnapshot | null {
  const metres = quantity(product.stockInformation?.primaryStock);
  // No response, missing quantity, or ambiguous units must never mean zero.
  if (metres === null || !isMetres(product.productStockUnit)) return null;
  const digest = createHash("sha256").update(JSON.stringify([identity.supplierSku, checkedAt, metres])).digest("hex").slice(0, 24);
  return normalizeSupplierSnapshot({
    snapshot_id: `sdg-portal-stock:${digest}`,
    supplier_id: "sanderson-design-group",
    brand_id: identity.brandId,
    supplier_sku: identity.supplierSku,
    checked_at: checkedAt,
    stock_unit: "METRE",
    aggregate_available_quantity: metres,
    // The detail service reports aggregate current stock. Future/on-order
    // quantities and commercial price are intentionally not imported here.
    batches: null,
    lifecycle_state: "UNKNOWN",
    sample_available: null,
    source: { type: "MANUAL_PORTAL", name: "SDG authenticated trade portal Product/detail", reference: `sdg:Product/detail:${identity.supplierSku}` },
    verification_status: "VERIFIED",
  });
}

/** Read-only supplier access. Auth is injected; this module never acquires or saves a portal session. */
export async function readSdgPortalStock(input: {
  identities: readonly SdgStockIdentity[];
  bearerToken: string;
  fetchImpl?: typeof fetch;
  clock?: () => Date;
}): Promise<SdgStockReadResult> {
  if (!input.bearerToken.trim()) throw new Error("SDG_PORTAL_CREDENTIAL_REQUIRED");
  const fetchImpl = input.fetchImpl ?? fetch;
  const clock = input.clock ?? (() => new Date());
  const identities = new Map<string, SdgStockIdentity>();
  for (const identity of input.identities) {
    if (!identity.supplierSku.trim() || !identity.brandId.trim() || identities.has(identity.supplierSku)) throw new Error("SDG_EXACT_IDENTITY_REQUIRED");
    identities.set(identity.supplierSku, identity);
  }
  const snapshots: NormalizedSupplierSnapshot[] = [];
  const exceptions: SdgStockException[] = [];
  const requested = [...identities.values()];
  for (let offset = 0; offset < requested.length; offset += BATCH_SIZE) {
    const batch = requested.slice(offset, offset + BATCH_SIZE);
    const response = await fetchImpl(SDG_PORTAL_DETAIL_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${input.bearerToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ price: false, stock: true, options: false, productCriteria: batch.map(({ supplierSku }) => ({ productCode: supplierSku, orderUnit: "", orderQuantity: 1 })) }),
      cache: "no-store",
    });
    if (response.status === 401 || response.status === 403) throw new Error("SDG_PORTAL_AUTH_FAILED");
    if (response.status === 429) throw new Error("SDG_PORTAL_RATE_LIMITED");
    if (!response.ok) throw new Error("SDG_PORTAL_DETAIL_FAILED");
    const payload: unknown = await response.json();
    if (!Array.isArray(payload)) throw new Error("SDG_PORTAL_DETAIL_SHAPE_CHANGED");
    const bySku = new Map<string, PortalProduct[]>();
    for (const raw of payload) {
      if (!raw || typeof raw !== "object") throw new Error("SDG_PORTAL_DETAIL_SHAPE_CHANGED");
      const product = raw as PortalProduct;
      if (typeof product.productCode !== "string") throw new Error("SDG_PORTAL_DETAIL_SHAPE_CHANGED");
      if (!batch.some((identity) => identity.supplierSku === product.productCode)) throw new Error("SDG_PORTAL_UNREQUESTED_SKU");
      const list = bySku.get(product.productCode) ?? [];
      list.push(product);
      bySku.set(product.productCode, list);
    }
    const checkedAt = clock().toISOString();
    for (const identity of batch) {
      const products = bySku.get(identity.supplierSku) ?? [];
      if (products.length !== 1) {
        exceptions.push({ supplierSku: identity.supplierSku, reason: products.length ? "DUPLICATE_PORTAL_SKU" : "MISSING_PORTAL_SKU" });
        continue;
      }
      const snapshot = snapshotFor(products[0], identity, checkedAt);
      if (!snapshot) {
        exceptions.push({ supplierSku: identity.supplierSku, reason: "MISSING_STOCK_OR_NON_METRE_UNIT" });
        continue;
      }
      snapshots.push(snapshot);
    }
  }
  return { snapshots, exceptions, requested: requested.length };
}
