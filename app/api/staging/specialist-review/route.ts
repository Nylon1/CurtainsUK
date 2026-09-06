import { NextResponse } from "next/server";
import { classifySpecialistReview, type SpecialistReviewRequest } from "@/lib/storefront/staging-pricing";

export async function POST(request: Request) {
  try {
    const input = await request.json() as SpecialistReviewRequest;
    return NextResponse.json(classifySpecialistReview(input));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to prepare the specialist review";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
