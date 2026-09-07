export interface StagingReviewResumeLinkInput {
  baseUrl: string;
  allowedOrigins: readonly string[];
  reviewRequestId: string;
  reviewAcceptanceToken: string;
}

const REQUEST_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACCEPTANCE_TOKEN = /^v1\.\d{10,12}\.[A-Za-z0-9_-]{43}$/;
const ALLOWED_PATHS = new Set(["/pages/curtain-visualiser", "/pages/configure-curtains"]);

/**
 * Puts the customer capability in a URL fragment. Fragments are not sent in
 * the initial HTTP request or referrer, and Dawn removes it immediately after
 * copying it into tab-scoped sessionStorage.
 */
export function buildStagingReviewResumeUrl(input: StagingReviewResumeLinkInput) {
  if (!REQUEST_ID.test(input.reviewRequestId) || !ACCEPTANCE_TOKEN.test(input.reviewAcceptanceToken)) {
    throw new Error("REVIEW_RESUME_CLAIMS_INVALID");
  }
  let url: URL;
  try {
    url = new URL(input.baseUrl);
  } catch {
    throw new Error("REVIEW_RESUME_BASE_URL_INVALID");
  }
  const allowedOrigins = new Set(input.allowedOrigins.map((value) => {
    try {
      return new URL(value).origin;
    } catch {
      return "";
    }
  }).filter(Boolean));
  if (url.protocol !== "https:"
      || url.username
      || url.password
      || !allowedOrigins.has(url.origin)
      || !ALLOWED_PATHS.has(url.pathname)) {
    throw new Error("REVIEW_RESUME_BASE_URL_DENIED");
  }
  url.hash = new URLSearchParams({
    cuk_review: input.reviewRequestId,
    cuk_token: input.reviewAcceptanceToken,
  }).toString();
  return url.toString();
}
