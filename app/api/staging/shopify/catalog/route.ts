import { NextResponse } from "next/server";
import { buildDatabaseShopifyCatalogPayload } from "@/lib/storefront/shopify-database-contract";
import { stagingApiHeaders, stagingOptions } from "@/lib/storefront/staging-api";
import { legacyStagingApiDisabledResponse } from "@/lib/storefront/security/legacy-staging-api";

export const dynamic = "force-dynamic";

export function OPTIONS(request: Request) {
  const disabled = legacyStagingApiDisabledResponse();
  if (disabled) return disabled;
  return stagingOptions(request);
}

export async function GET(request: Request) {
  const disabled = legacyStagingApiDisabledResponse();
  if (disabled) return disabled;
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
