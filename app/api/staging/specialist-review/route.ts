import { NextResponse } from "next/server";
import { classifySpecialistReview, type SpecialistReviewRequest } from "@/lib/storefront/staging-pricing";
import { assertAllowedStagingMutation, customerSafeApiError, readBoundedJson } from "@/lib/storefront/staging-api";
import { consumeStagingRequestSlot } from "@/lib/storefront/staging-rate-limit";
import { legacyStagingApiDisabledResponse } from "@/lib/storefront/security/legacy-staging-api";

export async function POST(request: Request) {
  const disabled = legacyStagingApiDisabledResponse();
  if (disabled) return disabled;
  try {
    assertAllowedStagingMutation(request);
    await consumeStagingRequestSlot({ request, scope: "specialist", environmentVariable: "CURTAINSUK_STAGING_SPECIALIST_RATE_LIMIT", defaultLimit: 30 });
    const input = await readBoundedJson<SpecialistReviewRequest>(request);
    return NextResponse.json(classifySpecialistReview(input));
  } catch (error) {
    const message = customerSafeApiError(error, "Unable to prepare the specialist review");
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
