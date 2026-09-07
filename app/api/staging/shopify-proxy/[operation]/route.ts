import { NextResponse } from "next/server";
import { buildDatabaseShopifyCatalogPayload } from "@/lib/storefront/shopify-database-contract";
import { calculateStagingPrice, classifyServerSpecialistReview } from "@/lib/storefront/server-staging-pricing";
import type { SpecialistReviewRequest, StagingPriceRequest } from "@/lib/storefront/staging-pricing";
import { customerSafeApiError, readBoundedJson } from "@/lib/storefront/staging-api";
import { createStagingReviewRequest } from "@/lib/storefront/review-request-repository";
import {
  prepareServerStagingCheckoutHandoff,
  type ServerStagingCheckoutHandoffInput,
} from "@/lib/storefront/checkout-handoff-server";
import { assertBoundedProxyRequest, PUBLIC_NO_STORE_HEADERS } from "@/lib/storefront/security/http";
import { authenticateShopifyAppProxy } from "@/lib/storefront/security/shopify-app-proxy";
import {
  isShopifyProxyOperation,
  SHOPIFY_PROXY_OPERATION_POLICY,
  type ShopifyProxyOperation,
} from "@/lib/storefront/security/shopify-proxy-operations";
import { parseProxyReviewRequest } from "@/lib/storefront/security/shopify-proxy-review-controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(error: unknown, fallback: string) {
  const code = error instanceof Error ? error.message : "";
  const status = code === "SHOPIFY_PROXY_RATE_LIMITED"
    ? 429
    : code === "SHOPIFY_PROXY_RATE_LIMIT_UNAVAILABLE"
      ? 503
      : code.startsWith("SHOPIFY_PROXY_")
        ? 401
        : 400;
  const message = code === "SHOPIFY_PROXY_RATE_LIMITED"
    ? "Too many requests. Please try again shortly."
    : code === "SHOPIFY_PROXY_RATE_LIMIT_UNAVAILABLE"
      ? "This service is temporarily unavailable."
      : code.startsWith("SHOPIFY_PROXY_")
        ? "Request authentication failed."
        : customerSafeApiError(error, fallback);
  return NextResponse.json({ error: message }, { status, headers: PUBLIC_NO_STORE_HEADERS });
}

async function operation(request: Request, rawOperation: string) {
  if (!isShopifyProxyOperation(rawOperation)) throw new Error("SHOPIFY_PROXY_OPERATION_DENIED");
  const selected = rawOperation as ShopifyProxyOperation;
  const policy = SHOPIFY_PROXY_OPERATION_POLICY[selected];
  assertBoundedProxyRequest(request, {
    methods: policy.methods,
    maximumBytes: policy.maximumBytes,
    acceptedContentTypes: selected === "review-request"
      ? ["multipart/form-data"]
      : selected === "catalog"
        ? undefined
        : ["application/json"],
  });
  await authenticateShopifyAppProxy({ request, operation: selected, limit: policy.limitPerWindow });
  return selected;
}

export async function GET(request: Request, context: { params: Promise<{ operation: string }> }) {
  try {
    const selected = await operation(request, (await context.params).operation);
    if (selected !== "catalog") throw new Error("SHOPIFY_PROXY_METHOD_DENIED");
    return NextResponse.json(await buildDatabaseShopifyCatalogPayload(), { headers: PUBLIC_NO_STORE_HEADERS });
  } catch (error) {
    return errorResponse(error, "Unable to load the fabric catalogue");
  }
}

export async function POST(request: Request, context: { params: Promise<{ operation: string }> }) {
  try {
    const selected = await operation(request, (await context.params).operation);
    if (selected === "price") {
      return NextResponse.json(await calculateStagingPrice(await readBoundedJson<StagingPriceRequest>(request)), {
        headers: PUBLIC_NO_STORE_HEADERS,
      });
    }
    if (selected === "specialist-review") {
      return NextResponse.json(await classifyServerSpecialistReview(await readBoundedJson<SpecialistReviewRequest>(request)), {
        headers: PUBLIC_NO_STORE_HEADERS,
      });
    }
    if (selected === "review-request") {
      const parsed = await parseProxyReviewRequest(request);
      return NextResponse.json(await createStagingReviewRequest(parsed), { status: 201, headers: PUBLIC_NO_STORE_HEADERS });
    }
    if (selected === "checkout-handoff") {
      const input = await readBoundedJson<ServerStagingCheckoutHandoffInput>(request);
      return NextResponse.json(await prepareServerStagingCheckoutHandoff(input), { headers: PUBLIC_NO_STORE_HEADERS });
    }
    throw new Error("SHOPIFY_PROXY_METHOD_DENIED");
  } catch (error) {
    return errorResponse(error, "Unable to process this request");
  }
}
