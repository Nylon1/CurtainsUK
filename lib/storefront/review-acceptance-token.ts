import "server-only";
import {
  createReviewAcceptanceTokenWithSecret,
  verifyReviewAcceptanceTokenWithSecret,
  type ReviewAcceptanceClaims,
} from "./review-acceptance-token-core";

function acceptanceSecret() {
  const secret = process.env.CURTAINSUK_STAGING_REVIEW_SIGNING_SECRET;
  if (!secret || secret.length < 32) throw new Error("REVIEW_ACCEPTANCE_SIGNING_UNAVAILABLE");
  return secret;
}

export function createReviewAcceptanceToken(claims: ReviewAcceptanceClaims) {
  return createReviewAcceptanceTokenWithSecret(claims, acceptanceSecret());
}

export function verifyReviewAcceptanceToken(token: unknown, claims: ReviewAcceptanceClaims) {
  return verifyReviewAcceptanceTokenWithSecret(token, claims, acceptanceSecret());
}
