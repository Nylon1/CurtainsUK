import { createSupplierServiceClient } from "@/lib/supabase/supplier-service";
import { EMAIL_EVIDENCE_STATES } from "@/lib/storefront/email-evidence";
import { getStaffReviewDashboard } from "@/lib/storefront/review-operations-repository";
import { parseReviewRequestId } from "@/lib/storefront/review-admin-validation";
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
    const raw = await readBoundedJson(request, 8 * 1024);
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("REVIEW_TRANSITION_INVALID");
    const input = raw as Record<string, unknown>;
    if (Object.keys(input).some((key) => !["state", "reason", "revisionId", "expectedEventId"].includes(key))
        || !EMAIL_EVIDENCE_STATES.includes(input.state as typeof EMAIL_EVIDENCE_STATES[number])
        || typeof input.reason !== "string" || input.reason.trim().length < 3 || input.reason.trim().length > 2000) throw new Error("REVIEW_TRANSITION_INVALID");
    const revisionId = parseReviewRequestId(input.revisionId);
    const expectedEventId = input.expectedEventId === null ? null : parseReviewRequestId(input.expectedEventId);
    const { error } = await createSupplierServiceClient().rpc("record_staging_email_evidence", {
      p_request_id: requestId, p_state: input.state, p_revision_id: revisionId,
      p_expected_event_id: expectedEventId, p_actor_id: auth.admin.id, p_reason: input.reason.trim(),
    });
    if (error) {
      if (error.message.includes("changed since")) throw new Error("REVIEW_CONFLICT");
      if (error.message.includes("Unknown review")) throw new Error("REVIEW_NOT_FOUND");
      if (error.message.includes("Invalid email evidence")) throw new Error("REVIEW_TRANSITION_INVALID");
      throw new Error("REVIEW_OPERATION_FAILED");
    }
    return reviewResponse({ review: await getStaffReviewDashboard(requestId) });
  } catch (error) { return reviewErrorResponse(error); }
}
