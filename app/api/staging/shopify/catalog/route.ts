import { NextResponse } from "next/server";
import { buildShopifyCatalogPayload } from "@/lib/storefront/shopify-contract";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(buildShopifyCatalogPayload(), {
    headers: {
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
