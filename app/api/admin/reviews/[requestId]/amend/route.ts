import {
  appendStaffReviewRevision,
  getStaffReviewDashboard,
  getStaffReviewRequest,
} from "@/lib/storefront/review-operations-repository";
import { parseReviewAmendmentInput, parseReviewRequestId } from "@/lib/storefront/review-admin-validation";
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
    const input = parseReviewAmendmentInput(await readBoundedJson(request, 64 * 1024));
    const current = await getStaffReviewRequest(requestId);
    if (!current) throw new Error("REVIEW_NOT_FOUND");
    const latest = current.revisions.at(-1);
    if (!latest || latest.revision_id !== input.previousRevisionId || !["PENDING", "NEEDS_INFORMATION", "UNDER_REVIEW"].includes(current.request.review_state)) {
      throw new Error("REVIEW_CONFLICT");
    }
    await appendStaffReviewRevision({
      requestId,
      specification: input.specification,
      actorId: auth.admin.id,
      reason: input.reason,
      finalPrice: input.finalPrice,
      pricingRuleVersion: input.pricingRuleVersion,
      expectedState: current.request.review_state,
      expectedLatestRevisionId: input.previousRevisionId,
    });
    const review = await getStaffReviewDashboard(requestId);
    if (!review) throw new Error("REVIEW_NOT_FOUND");
    return reviewResponse({ review });
  } catch (error) {
    return reviewErrorResponse(error, "REVIEW_AMENDMENT_FAILED");
  }
}
