import { reviewErrorResponse, reviewResponse, requireReviewAdmin, assertPrivateJsonMutation } from "@/app/api/admin/reviews/_shared";
import { readBoundedJson } from "@/lib/storefront/staging-api";
import { transitionMtmPaidOrder, type MtmPaidOrderLifecycleState } from "@/lib/storefront/mtm-paid-order-lifecycle";
import { enforceStaffEndpointRateLimit } from "@/lib/storefront/security/staff-rate-limit";

const STATES: readonly MtmPaidOrderLifecycleState[] = ["PAID", "CURTAINSUK_REVIEW", "APPROVED_FOR_MANUFACTURE", "WORKROOM_RELEASED", "CHANGE_REQUESTED", "REJECTED"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request, context: { params: Promise<{ orderId: string }> }) {
  try {
    const access = await requireReviewAdmin();
    if (access.response) return access.response;
    assertPrivateJsonMutation(request);
    const orderId = (await context.params).orderId;
    if (!UUID.test(orderId)) throw new Error("REVIEW_REQUEST_ID_INVALID");
    await enforceStaffEndpointRateLimit({
      request,
      actorId: access.admin!.id,
      scope: "mtm-paid-order-transition",
      policy: { limit: 20, windowSeconds: 60 },
    });
    const body = await readBoundedJson<{ expectedState?: unknown; toState?: unknown; reason?: unknown }>(request, 4_096);
    if (typeof body.expectedState !== "string" || typeof body.toState !== "string" || typeof body.reason !== "string"
      || !STATES.includes(body.expectedState as MtmPaidOrderLifecycleState)
      || !STATES.includes(body.toState as MtmPaidOrderLifecycleState)
      || body.reason.trim().length < 3 || body.reason.trim().length > 1_000) {
      throw new Error("REVIEW_TRANSITION_INVALID");
    }
    return reviewResponse(await transitionMtmPaidOrder({
      paidOrderId: orderId,
      expectedState: body.expectedState as MtmPaidOrderLifecycleState,
      toState: body.toState as MtmPaidOrderLifecycleState,
      actorId: access.admin!.id,
      reason: body.reason.trim(),
    }));
  } catch (error) {
    return reviewErrorResponse(error, "MTM_PAID_ORDER_TRANSITION_FAILED");
  }
}
