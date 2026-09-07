import "server-only";
import {
  signReviewSubmissionWithSecret,
  stagingReviewFingerprintWithSecret,
  verifyReviewSubmissionWithSecret,
  type ReviewTokenClaims,
} from "./review-token-core";

function signingSecret() {
  const secret = process.env.CURTAINSUK_STAGING_REVIEW_SIGNING_SECRET;
  if (!secret || secret.length < 32) throw new Error("STAGING_REVIEW_SIGNING_UNAVAILABLE");
  return secret;
}

export function signReviewSubmission(claims: ReviewTokenClaims) {
  return signReviewSubmissionWithSecret(claims, signingSecret());
}

export function verifyReviewSubmission(claims: ReviewTokenClaims, token: unknown) {
  return verifyReviewSubmissionWithSecret(claims, token, signingSecret());
}

export function stagingReviewFingerprint(request: Request, scope = "review") {
  return stagingReviewFingerprintWithSecret(request, scope, signingSecret());
}
