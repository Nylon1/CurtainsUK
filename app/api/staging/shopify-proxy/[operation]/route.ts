import { NextResponse } from "next/server";
import { prepareSampleOrder } from "@/lib/storefront/sample-order-server";
import { buildDatabaseShopifyCatalogPayload } from "@/lib/storefront/shopify-database-contract";
import { calculateStagingPrice, classifyServerSpecialistReview } from "@/lib/storefront/server-staging-pricing";
import type { SpecialistReviewRequest, StagingPriceRequest } from "@/lib/storefront/staging-pricing";
import { customerSafeApiError, readBoundedJson } from "@/lib/storefront/staging-api";
import { createStagingReviewRequest } from "@/lib/storefront/review-request-repository";
import {
  prepareServerStagingCheckoutHandoff,
  type ServerStagingCheckoutHandoffInput,
} from "@/lib/storefront/checkout-handoff-server";
import { assertBoundedProxyRequest, PUBLIC_NO_STORE_HEADERS, readHardLimitedRequestBytes } from "@/lib/storefront/security/http";
import { authenticateShopifyAppProxy, claimShopifyMutationReplay } from "@/lib/storefront/security/shopify-app-proxy";
import {
  isShopifyProxyOperation,
  SHOPIFY_PROXY_OPERATION_POLICY,
  type ShopifyProxyOperation,
} from "@/lib/storefront/security/shopify-proxy-operations";
import { parseProxyReviewRequest } from "@/lib/storefront/security/shopify-proxy-review-controller";
import { endpointRateLimitResponse } from "@/lib/storefront/security/endpoint-rate-limit";
import { getCustomerReviewAcceptance } from "@/lib/storefront/review-acceptance-server";
import { retailFabricDetail, searchRetailFabrics } from "@/lib/fabric-master/retail-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(error: unknown, fallback: string) {
  const rateLimit = endpointRateLimitResponse(error);
  const code = error instanceof Error ? error.message : "";
  // Keep operational diagnostics private and bounded; never log request bodies or supplier values.
  if (process.env.VERCEL_ENV === "preview") {
    const diagnosticCode = code.split(":", 1)[0];
    console.error("CURTAINSUK_STAGING_REQUEST_FAILED", /^[A-Z][A-Z0-9_]{2,100}$/.test(diagnosticCode) ? diagnosticCode : "UNCLASSIFIED_FAILURE");
  }
  const replayStatus = code === "SHOPIFY_PROXY_REPLAY_DETECTED" ? 409 : null;
  const replayUnavailable = code === "SHOPIFY_PROXY_REPLAY_UNAVAILABLE";
  const status = rateLimit?.status ?? replayStatus ?? (replayUnavailable
    ? 503
    : code.startsWith("SHOPIFY_PROXY_")
        ? 401
        : 400);
  const message = rateLimit?.message ?? (replayStatus
    ? "This signed request has already been processed."
    : replayUnavailable
      ? "This service is temporarily unavailable."
      : code.startsWith("SHOPIFY_PROXY_")
        ? "Request authentication failed."
        : customerSafeApiError(error, fallback));
  const replayHeader: Record<string, string> = {};
  if (replayStatus) {
    replayHeader["X-CurtainsUK-Rejection-Reason"] = "REPLAY_DETECTED";
  } else if (replayUnavailable) {
    replayHeader["X-CurtainsUK-Rejection-Reason"] = "REPLAY_PROTECTION_UNAVAILABLE";
  }
  return NextResponse.json({ error: message }, {
    status,
    headers: { ...PUBLIC_NO_STORE_HEADERS, ...(rateLimit?.headers ?? {}), ...replayHeader },
  });
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
  const proxyContext = await authenticateShopifyAppProxy({ request, operation: selected, rateLimit: policy.rateLimit });
  if (selected === "review-request" || selected === "checkout-handoff") {
    const bodyBytes = await readHardLimitedRequestBytes(request.clone(), policy.maximumBytes);
    await claimShopifyMutationReplay({ request, context: proxyContext, operation: selected, bodyBytes });
  }
  return selected;
}

export async function GET(request: Request, context: { params: Promise<{ operation: string }> }) {
  try {
    const selected = await operation(request, (await context.params).operation);
    if (selected !== "catalog") throw new Error("SHOPIFY_PROXY_METHOD_DENIED");
    const params = new URL(request.url).searchParams;
    if (params.get("view") === "retail") {
      if (params.has("fabric")) {
        const fabric = await retailFabricDetail(params.get("fabric") ?? "");
        return NextResponse.json({ fabric }, { status: fabric ? 200 : 404, headers: PUBLIC_NO_STORE_HEADERS });
      }
      return NextResponse.json(await searchRetailFabrics(params), { headers: PUBLIC_NO_STORE_HEADERS });
    }
    return NextResponse.json(await buildDatabaseShopifyCatalogPayload(params.get("fabric") ?? undefined), { headers: PUBLIC_NO_STORE_HEADERS });
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
    if (selected === "sample-order") {
      return NextResponse.json(await prepareSampleOrder(await readBoundedJson(request,4096)), {headers:PUBLIC_NO_STORE_HEADERS});
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
    if (selected === "review-acceptance") {
      return NextResponse.json(await getCustomerReviewAcceptance(await readBoundedJson(request, 8 * 1024)), {
        headers: PUBLIC_NO_STORE_HEADERS,
      });
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
