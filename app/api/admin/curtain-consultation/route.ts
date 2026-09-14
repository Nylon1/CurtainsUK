import {
  requireReviewAdmin,
  assertPrivateJsonMutation,
  reviewResponse,
} from "../reviews/_shared";
import { stagingHciIntegration, integrationEnabled } from "@/lib/storefront/hci-integration-server";
import { readBoundedJson } from "@/lib/storefront/staging-api";
import { retailFabricDetail } from "@/lib/fabric-master/retail-repository";
export const maxDuration = 30;
export async function GET(request: Request) {
  const identity = await requireReviewAdmin();
  if (identity.response) return identity.response;
  if (!integrationEnabled(process.env)) return reviewResponse({ error: "Unavailable" }, 404);
  try {
    const fabric = await retailFabricDetail(new URL(request.url).searchParams.get("fabric") ?? "");
    return reviewResponse({ fabric }, fabric ? 200 : 404);
  } catch {
    return reviewResponse({ error: "Fabric temporarily unavailable" }, 503);
  }
}
export async function POST(request: Request) {
  const identity = await requireReviewAdmin();
  if (identity.response) return identity.response;
  try {
    assertPrivateJsonMutation(request);
    return reviewResponse(
      await stagingHciIntegration(
        identity.admin.id,
        await readBoundedJson(request, 3_000_000),
      ),
    );
  } catch (error) {
    const code = error instanceof Error && /^[A-Z][A-Z0-9_]{2,80}$/.test(error.message) ? error.message : "UNCLASSIFIED_UPSTREAM_FAILURE";
    console.error("CURTAINSUK_HCI_REQUEST_PAUSED", code);
    const conflict =
      error instanceof Error && error.message === "HCI_SESSION_CONFLICT";
    return reviewResponse(
      {
        error: conflict
          ? "This consultation changed. Resume the saved consultation before continuing."
          : "The consultation is paused. Your accepted choices are saved. You can retry, browse fabrics or shop by window independently.",
      },
      conflict ? 409 : 503,
    );
  }
}
