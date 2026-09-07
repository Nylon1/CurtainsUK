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
  const safe = new Set([
    "PRICE_REQUIRES_VERIFICATION",
    "FABRIC_SPECIFICATION_INCOMPLETE",
    "Window type or fabric is unavailable",
    "Unknown window type",
    "Specialist shapes require the review journey",
    "Width and drop must be valid numbers",
    "A specialist window type is required",
  ]);
  return safe.has(message) ? message : fallback;
}
