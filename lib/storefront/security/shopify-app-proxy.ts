import "server-only";
import { createSupplierServiceClient } from "@/lib/supabase/supplier-service";
import {
  shopifyProxyRateLimitFingerprint,
  verifyShopifyAppProxyQuery,
  type ShopifyAppProxyContext,
} from "./shopify-app-proxy-core";

const DEFAULT_ALLOWED_SHOPS = ["carpetup.myshopify.com"];
const DEFAULT_ALLOWED_PATHS = ["/apps/curtainsuk-decision"];

function listFromEnvironment(name: string, defaults: readonly string[]) {
  return (process.env[name] ?? defaults.join(","))
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function clientAddress(request: Request) {
  // Prefer the platform-managed address over the generic forwarding header,
  // which can be supplied or extended by upstream clients and proxies.
  const forwarded = request.headers.get("x-vercel-forwarded-for") ?? request.headers.get("x-forwarded-for") ?? "unknown";
  return forwarded.split(",", 1)[0].trim().slice(0, 128) || "unknown";
}

function appProxySecret() {
  const secret = process.env.CURTAINSUK_SHOPIFY_APP_SECRET;
  if (!secret || secret.length < 32) throw new Error("SHOPIFY_PROXY_NOT_CONFIGURED");
  return secret;
}

function replayWindowSeconds() {
  const value = Number.parseInt(process.env.CURTAINSUK_SHOPIFY_PROXY_MAX_AGE_SECONDS ?? "300", 10);
  return Number.isInteger(value) && value >= 30 && value <= 900 ? value : 300;
}

export async function authenticateShopifyAppProxy(input: {
  request: Request;
  operation: string;
  limit: number;
}): Promise<ShopifyAppProxyContext> {
  const secret = appProxySecret();
  const url = new URL(input.request.url);
  const context = verifyShopifyAppProxyQuery(url.search, {
    secret,
    allowedShops: listFromEnvironment("CURTAINSUK_SHOPIFY_ALLOWED_SHOPS", DEFAULT_ALLOWED_SHOPS),
    allowedPathPrefixes: listFromEnvironment("CURTAINSUK_SHOPIFY_ALLOWED_PATHS", DEFAULT_ALLOWED_PATHS),
    maximumAgeSeconds: replayWindowSeconds(),
  });
  const limit = Number.isInteger(input.limit) && input.limit >= 1 && input.limit <= 300 ? input.limit : 60;
  const fingerprint = shopifyProxyRateLimitFingerprint({
    shop: context.shop,
    clientAddress: clientAddress(input.request),
    operation: input.operation,
    secret,
  });
  const { data, error } = await createSupplierServiceClient().rpc("consume_staging_review_submission_slot", {
    p_fingerprint_sha256: fingerprint,
    p_limit: limit,
  });
  if (error) throw new Error("SHOPIFY_PROXY_RATE_LIMIT_UNAVAILABLE");
  if (data !== true) throw new Error("SHOPIFY_PROXY_RATE_LIMITED");
  return context;
}
