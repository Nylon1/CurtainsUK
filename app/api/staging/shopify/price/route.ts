import { NextResponse } from "next/server";
import type { StagingPriceRequest } from "@/lib/storefront/staging-pricing";
import { calculateStagingPrice } from "@/lib/storefront/server-staging-pricing";

export async function POST(request: Request) {
  try {
    const input = await request.json() as StagingPriceRequest;
    return NextResponse.json(await calculateStagingPrice(input), {
      headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to calculate the staging price";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
