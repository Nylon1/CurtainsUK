import "server-only";
import { createHash } from "node:crypto";
import { createSupplierServiceClient } from "@/lib/supabase/supplier-service";
import {
  shopifyProxyReplayFingerprint,
  shopifyProxyRateLimitFingerprint,
  verifyShopifyAppProxyQuery,
  type ShopifyAppProxyContext,
} from "./shopify-app-proxy-core";
import { consumeEndpointRateLimit, type EndpointRateLimitPolicy } from "./endpoint-rate-limit";

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
  rateLimit: EndpointRateLimitPolicy;
}): Promise<ShopifyAppProxyContext> {
  const secret = appProxySecret();
  const url = new URL(input.request.url);
  const context = verifyShopifyAppProxyQuery(url.search, {
    secret,
    allowedShops: listFromEnvironment("CURTAINSUK_SHOPIFY_ALLOWED_SHOPS", DEFAULT_ALLOWED_SHOPS),
    allowedPathPrefixes: listFromEnvironment("CURTAINSUK_SHOPIFY_ALLOWED_PATHS", DEFAULT_ALLOWED_PATHS),
    maximumAgeSeconds: replayWindowSeconds(),
  });
  const fingerprint = shopifyProxyRateLimitFingerprint({
    shop: context.shop,
    clientAddress: clientAddress(input.request),
    operation: input.operation,
    secret,
  });
  await consumeEndpointRateLimit(fingerprint, input.rateLimit);
  return context;
}

export async function claimShopifyMutationReplay(input: {
  request: Request;
  context: ShopifyAppProxyContext;
  operation: "review-request" | "checkout-handoff";
  bodyBytes: Uint8Array;
}) {
  const signature = new URL(input.request.url).searchParams.get("signature") ?? "";
  const bodySha256 = createHash("sha256").update(input.bodyBytes).digest("hex");
  const fingerprint = shopifyProxyReplayFingerprint({
    shop: input.context.shop,
    operation: input.operation,
    signature,
    bodySha256,
    secret: appProxySecret(),
  });
  const { data, error } = await createSupplierServiceClient().rpc("claim_staging_shopify_proxy_replay_receipt", {
    p_request_fingerprint_sha256: fingerprint,
    p_shop: input.context.shop,
    p_operation: input.operation,
    p_signature_timestamp: input.context.timestamp,
    p_ttl_seconds: replayWindowSeconds(),
  });
  if (error) throw new Error("SHOPIFY_PROXY_REPLAY_UNAVAILABLE");
  if (data !== true) throw new Error("SHOPIFY_PROXY_REPLAY_DETECTED");
}
