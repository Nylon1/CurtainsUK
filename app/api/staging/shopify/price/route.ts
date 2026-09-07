import { NextResponse } from "next/server";
import type { StagingPriceRequest } from "@/lib/storefront/staging-pricing";
import { calculateStagingPrice } from "@/lib/storefront/server-staging-pricing";
import { customerSafeApiError, stagingApiHeaders, stagingOptions } from "@/lib/storefront/staging-api";

export function OPTIONS(request: Request) {
  return stagingOptions(request);
}

export async function POST(request: Request) {
  try {
    const input = await request.json() as StagingPriceRequest;
    return NextResponse.json(await calculateStagingPrice(input), {
      headers: stagingApiHeaders(request),
    });
  } catch (error) {
    return NextResponse.json({ error: customerSafeApiError(error, "Unable to calculate the staging price") }, { status: 400, headers: stagingApiHeaders(request) });
  }
}
