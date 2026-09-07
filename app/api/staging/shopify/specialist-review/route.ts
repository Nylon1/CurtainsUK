import { NextResponse } from "next/server";
import { type SpecialistReviewRequest } from "@/lib/storefront/staging-pricing";
import { classifyServerSpecialistReview } from "@/lib/storefront/server-staging-pricing";
import { customerSafeApiError, stagingApiHeaders, stagingOptions } from "@/lib/storefront/staging-api";

export function OPTIONS(request: Request) {
  return stagingOptions(request);
}

export async function POST(request: Request) {
  try {
    const input = await request.json() as SpecialistReviewRequest;
    return NextResponse.json(await classifyServerSpecialistReview(input), {
      headers: stagingApiHeaders(request),
    });
  } catch (error) {
    return NextResponse.json({ error: customerSafeApiError(error, "Unable to prepare the specialist review") }, { status: 400, headers: stagingApiHeaders(request) });
  }
}
