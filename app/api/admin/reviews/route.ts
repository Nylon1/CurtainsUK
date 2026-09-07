import { listStaffReviewDashboard } from "@/lib/storefront/review-operations-repository";
import { parseReviewListQuery } from "@/lib/storefront/review-admin-validation";
import { requireReviewAdmin, reviewErrorResponse, reviewResponse } from "./_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireReviewAdmin();
  if (auth.response) return auth.response;
  try {
    return reviewResponse(await listStaffReviewDashboard(parseReviewListQuery(request.url)));
  } catch (error) {
    return reviewErrorResponse(error, "REVIEW_LIST_UNAVAILABLE");
  }
}
