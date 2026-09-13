import {
  requireReviewAdmin,
  assertPrivateJsonMutation,
  reviewResponse,
} from "../reviews/_shared";
export async function POST(request: Request) {
  const identity = await requireReviewAdmin();
  if (identity.response) return identity.response;
  try {
    assertPrivateJsonMutation(request);
  } catch {
    return reviewResponse({ error: "Invalid consultation request." }, 400);
  }
  // PR #24 deliberately provides no authenticated hosted API. Never override its production gate.
  return reviewResponse(
    {
      error:
        "The private consultation is available in the local rehearsal. The hosted HCI connection has not been enabled yet. You can still explore the fabric library.",
    },
    503,
  );
}
