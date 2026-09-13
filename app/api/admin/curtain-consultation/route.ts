import {
  requireReviewAdmin,
  assertPrivateJsonMutation,
  reviewResponse,
} from "../reviews/_shared";
import { hostedHciConsultation } from "@/lib/storefront/hci-service-server";
import { readBoundedJson } from "@/lib/storefront/staging-api";
export async function POST(request: Request) {
  const identity = await requireReviewAdmin();
  if (identity.response) return identity.response;
  try {
    assertPrivateJsonMutation(request);
  } catch {
    return reviewResponse({ error: "Invalid consultation request." }, 400);
  }
  try {
    return reviewResponse(
      await hostedHciConsultation(
        identity.admin.id,
        await readBoundedJson(request, 16_384),
      ),
    );
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    return reviewResponse(
      {
        error:
          code === "HCI_SESSION_CONFLICT"
            ? "Your consultation has changed. Reload it before continuing."
            : "The hosted consultation is currently unavailable. You can still explore the fabric library or shop by window.",
      },
      code === "HCI_SESSION_CONFLICT" ? 409 : 503,
    );
  }
}
