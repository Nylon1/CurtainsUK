import { createHmac, timingSafeEqual } from "node:crypto";

export interface ReviewAcceptanceClaims {
  reviewRequestId: string;
  reviewRevisionId: string;
}

function signature(secret: string, claims: ReviewAcceptanceClaims, expiresAt: number) {
  return createHmac("sha256", secret)
    .update("curtainsuk:review-checkout-acceptance:v1\0")
    .update(claims.reviewRequestId)
    .update("\0")
    .update(claims.reviewRevisionId)
    .update("\0")
    .update(String(expiresAt))
    .digest("base64url");
}

export function createReviewAcceptanceTokenWithSecret(
  claims: ReviewAcceptanceClaims,
  secret: string,
  input: { nowSeconds?: number; ttlSeconds?: number } = {},
) {
  const now = input.nowSeconds ?? Math.floor(Date.now() / 1_000);
  const ttl = input.ttlSeconds ?? 14 * 24 * 60 * 60;
  if (!Number.isInteger(ttl) || ttl < 300 || ttl > 31 * 24 * 60 * 60) {
    throw new Error("REVIEW_ACCEPTANCE_TTL_INVALID");
  }
  const expiresAt = now + ttl;
  return `v1.${expiresAt}.${signature(secret, claims, expiresAt)}`;
}

export function verifyReviewAcceptanceTokenWithSecret(
  token: unknown,
  claims: ReviewAcceptanceClaims,
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
