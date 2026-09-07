import { NextResponse } from "next/server";
import { buildDatabaseShopifyCatalogPayload } from "@/lib/storefront/shopify-database-contract";
import { stagingApiHeaders, stagingOptions } from "@/lib/storefront/staging-api";

export const dynamic = "force-dynamic";

export function OPTIONS(request: Request) {
  return stagingOptions(request);
}

export async function GET(request: Request) {
  try {
    return NextResponse.json(await buildDatabaseShopifyCatalogPayload(), {
      headers: stagingApiHeaders(request),
    });
  } catch {
    return NextResponse.json({ error: "CURTAINSUK_FABRIC_MASTER_UNAVAILABLE" }, {
      status: 503,
      headers: stagingApiHeaders(request),
    });
  }
}
