import { NextResponse } from "next/server";
import { buildDatabaseShopifyCatalogPayload } from "@/lib/storefront/shopify-database-contract";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await buildDatabaseShopifyCatalogPayload(), {
      headers: {
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  } catch {
    return NextResponse.json({ error: "CURTAINSUK_FABRIC_MASTER_UNAVAILABLE" }, {
      status: 503,
      headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" },
    });
  }
}
