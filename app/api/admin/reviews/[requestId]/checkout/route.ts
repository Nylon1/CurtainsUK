import {
  getStaffReviewDashboard,
  getStaffReviewRequest,
  transitionStaffReviewRequest,
} from "@/lib/storefront/review-operations-repository";
import { parseReviewCheckoutInput, parseReviewRequestId } from "@/lib/storefront/review-admin-validation";
import { readBoundedJson } from "@/lib/storefront/staging-api";
import { createReviewAcceptanceToken } from "@/lib/storefront/review-acceptance-token";
import { canIssueReviewAcceptanceLink } from "@/lib/storefront/review-workflow";
import { buildStagingReviewResumeUrl } from "@/lib/storefront/review-resume-link-core";
import { assertPrivateJsonMutation, requireReviewAdmin, reviewErrorResponse, reviewResponse } from "../../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function customerResumeLink(input: {
  reviewRequestId: string;
  reviewRevisionId: string;
  token: string;
}) {
  const baseUrl = process.env.CURTAINSUK_STAGING_REVIEW_RESUME_URL;
  if (!baseUrl) throw new Error("REVIEW_RESUME_NOT_CONFIGURED");
  const allowedOrigins = (process.env.CURTAINSUK_STAGING_ALLOWED_ORIGINS ?? "https://carpetup.myshopify.com")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  try {
    return buildStagingReviewResumeUrl({
      baseUrl,
      allowedOrigins,
      reviewRequestId: input.reviewRequestId,
      reviewAcceptanceToken: input.token,
    });
  } catch {
    throw new Error("REVIEW_RESUME_NOT_CONFIGURED");
  }
}

export async function POST(request: Request, context: { params: Promise<{ requestId: string }> }) {
  const auth = await requireReviewAdmin();
  if (auth.response) return auth.response;
  try {
    assertPrivateJsonMutation(request);
    const requestId = parseReviewRequestId((await context.params).requestId);
    const input = parseReviewCheckoutInput(await readBoundedJson(request, 8 * 1024));
    const [current, dashboard] = await Promise.all([
      getStaffReviewRequest(requestId),
      getStaffReviewDashboard(requestId),
    ]);
    if (!current || !dashboard) throw new Error("REVIEW_NOT_FOUND");
    const latest = current.revisions.at(-1);
    const recovering = current.request.review_state === "READY_FOR_CHECKOUT";
    if ((!recovering && current.request.review_state !== input.expectedState) || !latest || latest.revision_id !== input.revisionId) throw new Error("REVIEW_CONFLICT");
    if (!canIssueReviewAcceptanceLink(current.request.review_state, dashboard.checkout.blockedReasons)) throw new Error("REVIEW_CHECKOUT_BLOCKED");
    const token = createReviewAcceptanceToken({
      reviewRequestId: requestId,
      reviewRevisionId: input.revisionId,
    });
    // Do not make READY_FOR_CHECKOUT terminal until the unpublished Dawn
    // acceptance route is configured and a deliverable link can be built.
    const resumeUrl = customerResumeLink({
      reviewRequestId: requestId,
      reviewRevisionId: input.revisionId,
      token,
    });
    if (!recovering) await transitionStaffReviewRequest({
      requestId,
      state: "READY_FOR_CHECKOUT",
      actorId: auth.admin.id,
      reason: input.reason,
      expectedState: input.expectedState,
      expectedLatestRevisionId: input.revisionId,
    });
    const review = await getStaffReviewDashboard(requestId);
    if (!review) throw new Error("REVIEW_NOT_FOUND");
    return reviewResponse({
      review,
      customerAcceptance: {
        reviewRequestId: requestId,
        reviewRevisionId: input.revisionId,
        token,
        expiresInSeconds: 14 * 24 * 60 * 60,
        resumeUrl,
        resumeUrlStatus: "READY",
      },
      paymentEnabled: false,
      shopifyWritePerformed: false,
    });
  } catch (error) {
    return reviewErrorResponse(error, "REVIEW_CHECKOUT_READINESS_FAILED");
  }
}
