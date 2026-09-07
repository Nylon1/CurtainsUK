import { NextResponse } from "next/server";
import type { StagingPriceRequest } from "@/lib/storefront/staging-pricing";
import { calculateStagingPrice } from "@/lib/storefront/server-staging-pricing";
import { assertAllowedStagingMutation, customerSafeApiError, readBoundedJson, stagingApiHeaders, stagingOptions } from "@/lib/storefront/staging-api";
import { consumeStagingRequestSlot } from "@/lib/storefront/staging-rate-limit";

export function OPTIONS(request: Request) {
  return stagingOptions(request);
}

export async function POST(request: Request) {
  try {
    assertAllowedStagingMutation(request);
    await consumeStagingRequestSlot({ request, scope: "price", environmentVariable: "CURTAINSUK_STAGING_PRICE_RATE_LIMIT", defaultLimit: 60 });
    const input = await readBoundedJson<StagingPriceRequest>(request);
    return NextResponse.json(await calculateStagingPrice(input), {
      headers: stagingApiHeaders(request),
    });
  } catch (error) {
    return NextResponse.json({ error: customerSafeApiError(error, "Unable to calculate the staging price") }, { status: 400, headers: stagingApiHeaders(request) });
  }
}
