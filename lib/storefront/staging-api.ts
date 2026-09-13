import { NextResponse } from "next/server";

const DEFAULT_ALLOWED_ORIGINS = [
  "https://carpetup.myshopify.com",
  "https://www.curtainsuk.com",
  "https://curtainsuk.com",
];

function allowedOrigins() {
  return (process.env.CURTAINSUK_STAGING_ALLOWED_ORIGINS ?? DEFAULT_ALLOWED_ORIGINS.join(","))
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function assertAllowedStagingMutation(request: Request) {
  const origin = request.headers.get("origin");
  const sameOrigin = origin === new URL(request.url).origin;
  if (!origin || (!sameOrigin && !allowedOrigins().includes(origin))) throw new Error("STAGING_REQUEST_ORIGIN_DENIED");
}

export async function readBoundedJson<T>(request: Request, maximumBytes = 64 * 1024): Promise<T> {
  const declared = request.headers.get("content-length");
  if (declared && (!/^\d+$/.test(declared) || Number.parseInt(declared, 10) > maximumBytes)) {
    throw new Error("STAGING_REQUEST_TOO_LARGE");
  }
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > maximumBytes) throw new Error("STAGING_REQUEST_TOO_LARGE");
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error("STAGING_REQUEST_INVALID_JSON");
  }
}

export function stagingApiHeaders(request: Request) {
  const origin = request.headers.get("origin");
  const headers: Record<string, string> = {
    "Cache-Control": "no-store",
    "X-Robots-Tag": "noindex, nofollow",
    Vary: "Origin",
  };
  if (origin && allowedOrigins().includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Accept, Content-Type";
  }
  return headers;
}

export function stagingOptions(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && !allowedOrigins().includes(origin)) {
    return new NextResponse(null, { status: 403, headers: stagingApiHeaders(request) });
  }
  return new NextResponse(null, { status: 204, headers: stagingApiHeaders(request) });
}

export function customerSafeApiError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const customerMessages: Record<string, string> = {
    SHOPIFY_DRAFT_ORDER_SCOPE_MISSING: "The test checkout connection needs staff attention. Your configuration is retained; please retry once the connection is restored.",
    SHOPIFY_DRAFT_ORDER_PENDING: "Your test order is being confirmed. Retry shortly to recover it; if it remains pending, contact the curtain team. Do not start a replacement order.",
    SHOPIFY_ADMIN_REQUEST_FAILED: "The test checkout service did not respond. Your configuration is retained. Retry to check the same order.",
    SHOPIFY_DRAFT_ORDER_CLAIM_UNAVAILABLE: "Test checkout is temporarily unavailable. Your configuration is retained; please retry later.",
    SHOPIFY_DRAFT_ORDER_RECEIPT_UNAVAILABLE: "Test checkout is temporarily unavailable. Your configuration is retained; please retry later.",
    CHECKOUT_PRICE_RECONFIRM_REQUIRED: "Please check your price again before continuing. The previous price confirmation has expired or the configuration price has changed.",
    PRICE_REQUIRES_VERIFICATION: "This fabric price must be confirmed before it can be configured",
    FABRIC_SPECIFICATION_INCOMPLETE: "This fabric specification must be confirmed before it can be configured",
    REVIEW_CONTACT_INVALID: "Enter a valid email address so our curtain team can contact you",
    REVIEW_UPLOADS_DISABLED: "Please email photos or drawings separately using your review reference",
    REVIEW_EVIDENCE_REQUIRED: "Add at least one clear photo of the specialist window",
    REVIEW_DRAWING_REQUIRED: "Add a simple drawing of the unusual window",
    REVIEW_EVIDENCE_INVALID: "Use a JPG, PNG, WebP, HEIC or PDF file no larger than 3 MB",
    REVIEW_SUBMISSION_TOKEN_INVALID: "Recheck the configuration before submitting it for review",
    REVIEW_CONFIGURATION_CHANGED: "The configuration changed; check it again before submitting",
    REVIEW_RATE_LIMITED: "Too many staging requests were received. Please try again later",
  };
  if (customerMessages[message]) return customerMessages[message];
  const safe = new Set([
    "Window type or fabric is unavailable",
    "Unknown window type",
    "Specialist shapes require the review journey",
    "Width and drop must be valid numbers",
    "A specialist window type is required",
    "Specialist fixing position is required",
    "Bay track or pole status is required",
    "Bay section count must be between 2 and 8",
    "Bay section widths must match the section count",
    "Bay section widths must be between 10 cm and 600 cm",
    "Corner windows require exactly two section widths",
    "Corner section widths must be between 10 cm and 600 cm",
    "Corner angle must be between 1 and 359 degrees",
    "Corner total coverage width must be between 30 cm and 1,200 cm",
    "Curtain configuration is incomplete or invalid",
  ]);
  return safe.has(message) ? message : fallback;
}
