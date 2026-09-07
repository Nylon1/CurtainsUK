import { createHmac, timingSafeEqual } from "node:crypto";

export type ShopifyAppProxyErrorCode =
  | "SHOPIFY_PROXY_SIGNATURE_MISSING"
  | "SHOPIFY_PROXY_SIGNATURE_INVALID"
  | "SHOPIFY_PROXY_TIMESTAMP_INVALID"
  | "SHOPIFY_PROXY_REQUEST_EXPIRED"
  | "SHOPIFY_PROXY_SHOP_DENIED"
  | "SHOPIFY_PROXY_PATH_DENIED";

export class ShopifyAppProxyError extends Error {
  constructor(public readonly code: ShopifyAppProxyErrorCode) {
    super(code);
    this.name = "ShopifyAppProxyError";
  }
}

export interface ShopifyAppProxyContext {
  shop: string;
  pathPrefix: string;
  loggedInCustomerId: string | null;
  timestamp: number;
}

export interface VerifyShopifyAppProxyOptions {
  secret: string;
  allowedShops: readonly string[];
  allowedPathPrefixes: readonly string[];
  nowSeconds?: number;
  maximumAgeSeconds?: number;
  maximumFutureSkewSeconds?: number;
}

function groupedQuery(rawQuery: string) {
  const grouped = new Map<string, string[]>();
  const query = rawQuery.startsWith("?") ? rawQuery.slice(1) : rawQuery;
  for (const [key, value] of new URLSearchParams(query)) {
    const current = grouped.get(key);
    if (current) current.push(value);
    else grouped.set(key, [value]);
  }
  return grouped;
}

/**
 * Canonical form documented by Shopify for app-proxy requests: URL-decode,
 * group duplicate values with commas, sort key=value entries and concatenate
 * without separators. The signature parameter itself is excluded.
 */
export function canonicalShopifyAppProxyQuery(rawQuery: string) {
  const grouped = groupedQuery(rawQuery);
  grouped.delete("signature");
  return [...grouped.entries()]
    .map(([key, values]) => `${key}=${values.join(",")}`)
    .sort()
    .join("");
}

export function signShopifyAppProxyQuery(rawQuery: string, secret: string) {
  return createHmac("sha256", secret)
    .update(canonicalShopifyAppProxyQuery(rawQuery), "utf8")
    .digest("hex");
}

function safeHexEqual(received: string, expected: string) {
  if (!/^[a-f0-9]{64}$/i.test(received)) return false;
  const receivedBytes = Buffer.from(received.toLowerCase(), "ascii");
  const expectedBytes = Buffer.from(expected.toLowerCase(), "ascii");
  return receivedBytes.length === expectedBytes.length && timingSafeEqual(receivedBytes, expectedBytes);
}

function oneParameter(grouped: Map<string, string[]>, name: string) {
  const values = grouped.get(name);
  return values?.length === 1 ? values[0] : null;
}

function normalizedAllowedValues(values: readonly string[]) {
  return new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean));
}

export function verifyShopifyAppProxyQuery(
  rawQuery: string,
  options: VerifyShopifyAppProxyOptions,
): ShopifyAppProxyContext {
  const grouped = groupedQuery(rawQuery);
  const signature = oneParameter(grouped, "signature");
  if (!signature) throw new ShopifyAppProxyError("SHOPIFY_PROXY_SIGNATURE_MISSING");
  const expected = signShopifyAppProxyQuery(rawQuery, options.secret);
  if (!safeHexEqual(signature, expected)) throw new ShopifyAppProxyError("SHOPIFY_PROXY_SIGNATURE_INVALID");

  const timestampText = oneParameter(grouped, "timestamp");
  if (!timestampText || !/^\d{1,12}$/.test(timestampText)) {
    throw new ShopifyAppProxyError("SHOPIFY_PROXY_TIMESTAMP_INVALID");
  }
  const timestamp = Number.parseInt(timestampText, 10);
  const now = options.nowSeconds ?? Math.floor(Date.now() / 1_000);
  const maximumAge = options.maximumAgeSeconds ?? 300;
  const maximumFutureSkew = options.maximumFutureSkewSeconds ?? 60;
  if (timestamp < now - maximumAge || timestamp > now + maximumFutureSkew) {
    throw new ShopifyAppProxyError("SHOPIFY_PROXY_REQUEST_EXPIRED");
  }

  const shop = oneParameter(grouped, "shop")?.toLowerCase() ?? "";
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop)
    || !normalizedAllowedValues(options.allowedShops).has(shop)) {
    throw new ShopifyAppProxyError("SHOPIFY_PROXY_SHOP_DENIED");
  }

  const pathPrefix = oneParameter(grouped, "path_prefix") ?? "";
  const allowedPaths = new Set(options.allowedPathPrefixes.map((value) => value.trim()).filter(Boolean));
  if (!allowedPaths.has(pathPrefix)) throw new ShopifyAppProxyError("SHOPIFY_PROXY_PATH_DENIED");

  const loggedInCustomerId = oneParameter(grouped, "logged_in_customer_id");
  return {
    shop,
    pathPrefix,
    loggedInCustomerId: loggedInCustomerId || null,
    timestamp,
  };
}

export function shopifyProxyRateLimitFingerprint(input: {
  shop: string;
  clientAddress: string;
  operation: string;
  secret: string;
}) {
  return createHmac("sha256", input.secret)
    .update("curtainsuk:shopify-app-proxy-rate:v1\0")
    .update(input.shop)
    .update("\0")
    .update(input.clientAddress)
    .update("\0")
    .update(input.operation)
    .digest("hex");
}

export function shopifyProxyReplayFingerprint(input: {
  shop: string;
  operation: "review-request" | "checkout-handoff";
  signature: string;
  bodySha256: string;
  secret: string;
}) {
  if (!/^[a-f0-9]{64}$/i.test(input.signature) || !/^[a-f0-9]{64}$/i.test(input.bodySha256)) {
    throw new Error("SHOPIFY_PROXY_REPLAY_INPUT_INVALID");
  }
  return createHmac("sha256", input.secret)
    .update("curtainsuk:shopify-app-proxy-replay:v1\0")
    .update(input.shop.toLowerCase())
    .update("\0")
    .update(input.operation)
    .update("\0")
    .update(input.signature.toLowerCase())
    .update("\0")
    .update(input.bodySha256.toLowerCase())
    .digest("hex");
}
