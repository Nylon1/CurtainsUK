import { getStaffReviewDashboard } from "@/lib/storefront/review-operations-repository";
import { parseReviewRequestId } from "@/lib/storefront/review-admin-validation";
import { requireReviewAdmin, reviewErrorResponse, reviewResponse } from "../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ requestId: string }> }) {
  const auth = await requireReviewAdmin();
  if (auth.response) return auth.response;
  try {
    const requestId = parseReviewRequestId((await context.params).requestId);
    const review = await getStaffReviewDashboard(requestId);
    return review ? reviewResponse({ review }) : reviewResponse({ error: "REVIEW_NOT_FOUND" }, 404);
  } catch (error) {
    return reviewErrorResponse(error, "REVIEW_DETAIL_UNAVAILABLE");
  }
}
