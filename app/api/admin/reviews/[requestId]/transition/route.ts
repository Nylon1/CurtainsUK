import { getStaffReviewDashboard, transitionStaffReviewRequest } from "@/lib/storefront/review-operations-repository";
import { canTransitionReview } from "@/lib/storefront/review-workflow";
import { parseReviewRequestId, parseReviewTransitionInput } from "@/lib/storefront/review-admin-validation";
import { readBoundedJson } from "@/lib/storefront/staging-api";
import { assertPrivateJsonMutation, requireReviewAdmin, reviewErrorResponse, reviewResponse } from "../../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ requestId: string }> }) {
  const auth = await requireReviewAdmin();
  if (auth.response) return auth.response;
  try {
    assertPrivateJsonMutation(request);
    const requestId = parseReviewRequestId((await context.params).requestId);
    const input = parseReviewTransitionInput(await readBoundedJson(request, 16 * 1024));
    if (!input.latestRevisionId
        || input.toState === "PENDING"
        || input.toState === "READY_FOR_CHECKOUT"
        || !canTransitionReview(input.expectedState, input.toState)) {
      throw new Error("REVIEW_TRANSITION_INVALID");
    }
    await transitionStaffReviewRequest({
      requestId,
      state: input.toState,
      actorId: auth.admin.id,
      reason: input.reason,
      expectedState: input.expectedState,
      expectedLatestRevisionId: input.latestRevisionId,
    });
    const review = await getStaffReviewDashboard(requestId);
    if (!review) throw new Error("REVIEW_NOT_FOUND");
    return reviewResponse({
      review,
      ...(input.toState === "APPROVED" ? {
        analyticsEvent: { event: "curtainsuk_review_approved", requestId },
      } : {}),
    });
  } catch (error) {
    return reviewErrorResponse(error, "REVIEW_TRANSITION_FAILED");
  }
}
