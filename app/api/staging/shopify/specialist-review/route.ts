import { NextResponse } from "next/server";
import { type SpecialistReviewRequest } from "@/lib/storefront/staging-pricing";
import { classifyServerSpecialistReview } from "@/lib/storefront/server-staging-pricing";
import { assertAllowedStagingMutation, customerSafeApiError, readBoundedJson, stagingApiHeaders, stagingOptions } from "@/lib/storefront/staging-api";
import { consumeStagingRequestSlot } from "@/lib/storefront/staging-rate-limit";

export function OPTIONS(request: Request) {
  return stagingOptions(request);
}

export async function POST(request: Request) {
  try {
    assertAllowedStagingMutation(request);
    await consumeStagingRequestSlot({ request, scope: "specialist", environmentVariable: "CURTAINSUK_STAGING_SPECIALIST_RATE_LIMIT", defaultLimit: 30 });
    const input = await readBoundedJson<SpecialistReviewRequest>(request);
    return NextResponse.json(await classifyServerSpecialistReview(input), {
      headers: stagingApiHeaders(request),
    });
  } catch (error) {
    return NextResponse.json({ error: customerSafeApiError(error, "Unable to prepare the specialist review") }, { status: 400, headers: stagingApiHeaders(request) });
  }
}
