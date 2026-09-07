import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supplierAdminIdentity } from "@/lib/supplier-intelligence/server-auth";
import { PRIVATE_NO_STORE_HEADERS } from "@/lib/storefront/security/http";

export function reviewResponse(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: PRIVATE_NO_STORE_HEADERS });
}

export async function requireReviewAdmin() {
  try {
    const admin = await supplierAdminIdentity();
    if (admin) return { admin, response: null } as const;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user
      ? { admin: null, response: reviewResponse({ error: "STAFF_ROLE_REQUIRED" }, 403) } as const
      : { admin: null, response: reviewResponse({ error: "AUTHENTICATION_REQUIRED" }, 401) } as const;
  } catch {
    return { admin: null, response: reviewResponse({ error: "STAFF_AUTH_UNAVAILABLE" }, 503) } as const;
  }
}

export function assertPrivateJsonMutation(request: Request) {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (contentType !== "application/json") throw new Error("REVIEW_CONTENT_TYPE_INVALID");
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) throw new Error("REVIEW_ORIGIN_INVALID");
}

export function reviewErrorResponse(error: unknown, fallback = "REVIEW_OPERATION_FAILED") {
  const code = error instanceof Error ? error.message : fallback;
  const badRequest = new Set([
    "REVIEW_QUERY_INVALID",
    "REVIEW_CURSOR_INVALID",
    "REVIEW_LIMIT_INVALID",
    "REVIEW_STATE_INVALID",
    "REVIEW_REQUEST_ID_INVALID",
    "REVIEW_REVISION_ID_INVALID",
    "REVIEW_REASON_INVALID",
    "REVIEW_TRANSITION_INVALID",
    "REVIEW_AMENDMENT_INVALID",
    "REVIEW_SPECIFICATION_INVALID",
    "REVIEW_FINAL_PRICE_INVALID",
    "REVIEW_PRICING_VERSION_REQUIRED",
    "REVIEW_CHECKOUT_INVALID",
    "REVIEW_CONTENT_TYPE_INVALID",
    "REVIEW_ORIGIN_INVALID",
    "STAGING_REQUEST_INVALID_JSON",
    "STAGING_REQUEST_TOO_LARGE",
  ]);
  if (badRequest.has(code)) return reviewResponse({ error: code }, 400);
  if (code === "REVIEW_NOT_FOUND") return reviewResponse({ error: code }, 404);
  if (["REVIEW_CONFLICT", "REVIEW_EVIDENCE_NOT_CLEAN", "REVIEW_FINAL_PRICE_REQUIRED", "REVIEW_CHECKOUT_BLOCKED"].includes(code)) {
    return reviewResponse({ error: code }, 409);
  }
  return reviewResponse({ error: fallback }, 503);
}
