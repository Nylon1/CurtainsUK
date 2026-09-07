import {
  getStaffReviewDashboard,
  getStaffReviewRequest,
  transitionStaffReviewRequest,
} from "@/lib/storefront/review-operations-repository";
import { parseReviewCheckoutInput, parseReviewRequestId } from "@/lib/storefront/review-admin-validation";
import { readBoundedJson } from "@/lib/storefront/staging-api";
import { createReviewAcceptanceToken } from "@/lib/storefront/review-acceptance-token";
import { assertPrivateJsonMutation, requireReviewAdmin, reviewErrorResponse, reviewResponse } from "../../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    if (current.request.review_state !== input.expectedState || !latest || latest.revision_id !== input.revisionId) throw new Error("REVIEW_CONFLICT");
    if (!dashboard.checkout.eligible) throw new Error("REVIEW_CHECKOUT_BLOCKED");
    await transitionStaffReviewRequest({
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
        token: createReviewAcceptanceToken({
          reviewRequestId: requestId,
          reviewRevisionId: input.revisionId,
        }),
        expiresInSeconds: 14 * 24 * 60 * 60,
      },
      paymentEnabled: false,
      shopifyWritePerformed: false,
    });
  } catch (error) {
    return reviewErrorResponse(error, "REVIEW_CHECKOUT_READINESS_FAILED");
  }
}
