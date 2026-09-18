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
  details: SdgStockDetail[];
  batches: SdgStockBatchMetric[];
  requested: number;
}

export interface SdgStockDetail {
  supplierSku: string;
  brandId: string;
  productDesignName: string | null;
  unit: string | null;
  primaryMetres: number | null;
  offsiteMetres: number | null;
  futureMetres: number | null;
  primaryDescription: string | null;
  offsiteDescription: string | null;
  purchaseOrders: { dueDate: string | null; dueMetres: number | null }[];
  batches: { batchId: string | null; batchMetres: number | null; pieces: { pieceId: string | null; lengthMetres: number | null }[] }[];
}

export interface SdgStockBatchMetric {
  requested: number;
  returned: number;
  attempts: number;
  retries: number;
  throttled: number;
  latencyMs: number;
}

type PortalProduct = {
  productCode?: unknown;
  productDesignName?: unknown;
  productStockUnit?: unknown;
  stockInformation?: {
    primaryStock?: unknown;
    offsiteStock?: unknown;
    futureStock?: unknown;
    primaryStockDescription?: unknown;
    offsiteStockDescription?: unknown;
    purchaseStockUnitDescription?: unknown;
    purchaseOrderData?: { purchaseOrders?: unknown } | null;
    locations?: unknown;
  } | null;
};

function quantity(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function isMetres(value: unknown): boolean {
  return typeof value === "string" && METRE_UNITS.has(value.trim().toLowerCase());
}

function retryAfterSeconds(value: string | null, attempt: number): number {
  if (!value) return attempt * 5;
  if (/^\d+$/.test(value)) return Number(value);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(1, Math.ceil((date - Date.now()) / 1000)) : Number.NaN;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function objectOrNull(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function detailFor(product: PortalProduct, identity: SdgStockIdentity): SdgStockDetail {
  const stock = product.stockInformation;
  const purchaseOrders = Array.isArray(stock?.purchaseOrderData?.purchaseOrders)
    ? stock.purchaseOrderData.purchaseOrders.map((raw) => {
      const row = objectOrNull(raw);
      return { dueDate: stringOrNull(row?.dueDate), dueMetres: quantity(row?.dueStock) };
    }) : [];
  const batches = Array.isArray(stock?.locations)
    ? stock.locations.flatMap((rawLocation) => {
      const location = objectOrNull(rawLocation);
      if (!Array.isArray(location?.siteBatches)) return [];
      return location.siteBatches.map((rawBatch) => {
        const batch = objectOrNull(rawBatch);
        const pieces = Array.isArray(batch?.batchPieces) ? batch.batchPieces.map((rawPiece) => {
          const piece = objectOrNull(rawPiece);
          return { pieceId: stringOrNull(piece?.pieceId), lengthMetres: quantity(piece?.pieceCurrentLength) };
        }) : [];
        return { batchId: stringOrNull(batch?.batchId), batchMetres: quantity(batch?.batchQuantity), pieces };
      });
    }) : [];
  return {
    supplierSku: identity.supplierSku,
    brandId: identity.brandId,
    productDesignName: stringOrNull(product.productDesignName),
    unit: stringOrNull(product.productStockUnit),
    primaryMetres: quantity(stock?.primaryStock),
    offsiteMetres: quantity(stock?.offsiteStock),
    futureMetres: quantity(stock?.futureStock),
    primaryDescription: stringOrNull(stock?.primaryStockDescription),
    offsiteDescription: stringOrNull(stock?.offsiteStockDescription),
    purchaseOrders,
    batches,
  };
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
  bearerToken?: string;
  getBearerToken?: () => Promise<string>;
  fetchImpl?: typeof fetch;
  clock?: () => Date;
  sleep?: (ms: number) => Promise<void>;
  onBatch?: (progress: { completed: number; total: number; metric: SdgStockBatchMetric }) => Promise<void> | void;
}): Promise<SdgStockReadResult> {
  if (!input.bearerToken?.trim() && !input.getBearerToken) throw new Error("SDG_PORTAL_CREDENTIAL_REQUIRED");
  const fetchImpl = input.fetchImpl ?? fetch;
  const clock = input.clock ?? (() => new Date());
  const sleep = input.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const identities = new Map<string, SdgStockIdentity>();
  for (const identity of input.identities) {
    if (!identity.supplierSku.trim() || !identity.brandId.trim() || identities.has(identity.supplierSku)) throw new Error("SDG_EXACT_IDENTITY_REQUIRED");
    identities.set(identity.supplierSku, identity);
  }
  const snapshots: NormalizedSupplierSnapshot[] = [];
  const exceptions: SdgStockException[] = [];
  const details: SdgStockDetail[] = [];
  const batches: SdgStockBatchMetric[] = [];
  const requested = [...identities.values()];
  for (let offset = 0; offset < requested.length; offset += BATCH_SIZE) {
    const batch = requested.slice(offset, offset + BATCH_SIZE);
    const started = Date.now();
    let response: Response | undefined;
    let attempts = 0;
    let throttled = 0;
    while (attempts < 3) {
      attempts += 1;
      const token = input.getBearerToken ? await input.getBearerToken() : input.bearerToken;
      if (!token?.trim()) throw new Error("SDG_PORTAL_CREDENTIAL_REQUIRED");
      try {
        response = await fetchImpl(SDG_PORTAL_DETAIL_URL, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ price: false, stock: true, options: false, productCriteria: batch.map(({ supplierSku }) => ({ productCode: supplierSku, orderUnit: "", orderQuantity: 1 })) }),
          cache: "no-store",
          signal: AbortSignal.timeout(20000),
        });
      } catch {
        if (attempts === 3) throw new Error("SDG_PORTAL_DETAIL_NETWORK_FAILED");
        await sleep(attempts * 1000);
        continue;
      }
      if (response.status === 401 || response.status === 403) throw new Error("SDG_PORTAL_AUTH_FAILED");
      if (response.status === 404) break;
      if (response.status === 429) {
        throttled += 1;
        const seconds = retryAfterSeconds(response.headers.get("Retry-After"), attempts);
        if (attempts === 3 || !Number.isFinite(seconds) || seconds > 60) throw new Error("SDG_PORTAL_RATE_LIMITED");
        await sleep(Math.max(1, seconds) * 1000);
        continue;
      }
      if (response.status >= 500 && attempts < 3) {
        await sleep(attempts * 1000);
        continue;
      }
      if (!response.ok) throw new Error(`SDG_PORTAL_DETAIL_HTTP_${response.status}`);
      break;
    }
    if (response?.status === 404) {
      // A batch-level 404 does not prove that any SKU has zero stock, or even
      // that each individual SKU is absent. Leave the whole batch unresolved.
      exceptions.push(...batch.map(({ supplierSku }) => ({ supplierSku, reason: "PORTAL_BATCH_HTTP_404" })));
      const metric = { requested: batch.length, returned: 0, attempts, retries: attempts - 1, throttled, latencyMs: Date.now() - started };
      batches.push(metric);
      await input.onBatch?.({ completed: Math.min(offset + batch.length, requested.length), total: requested.length, metric });
      continue;
    }
    if (!response?.ok) throw new Error(`SDG_PORTAL_DETAIL_HTTP_${response?.status ?? "NO_RESPONSE"}`);
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
      details.push(detailFor(products[0], identity));
      const snapshot = snapshotFor(products[0], identity, checkedAt);
      if (!snapshot) {
        exceptions.push({ supplierSku: identity.supplierSku, reason: "MISSING_STOCK_OR_NON_METRE_UNIT" });
        continue;
      }
      snapshots.push(snapshot);
    }
    const metric = { requested: batch.length, returned: payload.length, attempts, retries: attempts - 1, throttled, latencyMs: Date.now() - started };
    batches.push(metric);
    await input.onBatch?.({ completed: Math.min(offset + batch.length, requested.length), total: requested.length, metric });
  }
  return { snapshots, exceptions, details, batches, requested: requested.length };
}
