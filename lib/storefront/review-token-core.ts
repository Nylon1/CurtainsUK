import { createHmac, timingSafeEqual } from "node:crypto";
import type { ReviewConfiguration } from "./review-request";

export interface ReviewTokenClaims {
  configuration: ReviewConfiguration;
  configurationId: string;
  outcome: "PRICE_WITH_REVIEW" | "MANUAL_QUOTE";
  totalAmountMinor: number | null;
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().filter((key) => record[key] !== undefined).map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
}

function signature(secret: string, claims: ReviewTokenClaims, expiresAt: number) {
  return createHmac("sha256", secret)
    .update("curtainsuk:staging-review:v1\0")
    .update(String(expiresAt))
    .update("\0")
    .update(canonicalJson(claims))
    .digest("base64url");
}

export function signReviewSubmissionWithSecret(claims: ReviewTokenClaims, secret: string, nowSeconds = Math.floor(Date.now() / 1_000)) {
  const expiresAt = nowSeconds + 2 * 60 * 60;
  return `v1.${expiresAt}.${signature(secret, claims, expiresAt)}`;
}

export function verifyReviewSubmissionWithSecret(
  claims: ReviewTokenClaims,
  token: unknown,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1_000),
) {
  if (typeof token !== "string") return false;
  const parts = token.split(".");
  const expiresAt = Number.parseInt(parts[1] ?? "", 10);
  if (parts.length !== 3 || parts[0] !== "v1" || !Number.isInteger(expiresAt) || expiresAt < nowSeconds) return false;
  const expected = Buffer.from(`v1.${expiresAt}.${signature(secret, claims, expiresAt)}`);
  const supplied = Buffer.from(token);
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}

export function stagingReviewFingerprintWithSecret(request: Request, scope: string, secret: string) {
  const forwarded = request.headers.get("x-vercel-forwarded-for")
    ?? request.headers.get("x-forwarded-for")
    ?? "unknown";
  const address = forwarded.split(",")[0]?.trim() || "unknown";
  return createHmac("sha256", secret)
    .update("curtainsuk:staging-review-rate:v1\0")
    .update(scope)
    .update("\0")
    .update(address)
    .digest("hex");
}
