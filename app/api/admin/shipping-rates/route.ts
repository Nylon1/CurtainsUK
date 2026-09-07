import { NextResponse } from "next/server";
import { STAGING_SHIPPING_OWNER_INPUTS, shippingPolicyBlockers } from "@/lib/storefront/shipping-owner-inputs";
import { supplierAdminIdentity } from "@/lib/supplier-intelligence/server-auth";
import { readBoundedJson } from "@/lib/storefront/staging-api";
import { assertSameOriginJsonMutation, PRIVATE_NO_STORE_HEADERS } from "@/lib/storefront/security/http";
import { UK_SHIPPING_REGIONS, type ShippingParcelClass, type ShippingRule } from "@/lib/storefront/shipping";
import { appendStagingShippingRate, currentStagingShippingRates } from "@/lib/storefront/shipping-repository";
import { endpointRateLimitResponse } from "@/lib/storefront/security/endpoint-rate-limit";
import { enforceStaffEndpointRateLimit } from "@/lib/storefront/security/staff-rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const actor = await supplierAdminIdentity();
  if (!actor) {
    return NextResponse.json({ error: "STAFF_ACCESS_REQUIRED" }, { status: 403, headers: PRIVATE_NO_STORE_HEADERS });
  }
  try {
    await enforceStaffEndpointRateLimit({ request, actorId: actor.id, scope: "shipping-rates-read", policy: { limit: 30, windowSeconds: 60 } });
    return NextResponse.json({ rates: await currentStagingShippingRates(), ownerInputs: STAGING_SHIPPING_OWNER_INPUTS, policyBlockers: shippingPolicyBlockers() }, { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error) {
    const limited = endpointRateLimitResponse(error);
    if (limited) return NextResponse.json({ error: limited.message }, { status: limited.status, headers: { ...PRIVATE_NO_STORE_HEADERS, ...limited.headers } });
    return NextResponse.json({ error: "SHIPPING_RATE_CONFIGURATION_UNAVAILABLE" }, { status: 503, headers: PRIVATE_NO_STORE_HEADERS });
  }
}

export async function POST(request: Request) {
  const actor = await supplierAdminIdentity();
  if (!actor) {
    return NextResponse.json({ error: "STAFF_ACCESS_REQUIRED" }, { status: 403, headers: PRIVATE_NO_STORE_HEADERS });
  }
  try {
    await enforceStaffEndpointRateLimit({ request, actorId: actor.id, scope: "shipping-rates-write", policy: { limit: 12, windowSeconds: 3_600 } });
    assertSameOriginJsonMutation(request);
    const input = await readBoundedJson<Record<string, unknown>>(request, 8_192);
    if (typeof input.expectedCurrentRateVersionId !== "string"
      || !UK_SHIPPING_REGIONS.includes(input.region as never)
      || !["STANDARD", "LARGE", "OVERSIZE", "SPECIALIST"].includes(String(input.parcelClass))
      || !["AWAITING_OWNER_CONFIRMATION", "VALIDATED", "RETIRED"].includes(String(input.status))
      || (input.grossAmountMinor !== null && !Number.isInteger(input.grossAmountMinor))
      || typeof input.reason !== "string") {
      throw new Error("SHIPPING_RATE_INPUT_INVALID");
    }
    const rate = await appendStagingShippingRate({
      expectedCurrentRateVersionId: input.expectedCurrentRateVersionId,
      region: input.region as (typeof UK_SHIPPING_REGIONS)[number],
      parcelClass: input.parcelClass as ShippingParcelClass,
      grossAmountMinor: input.grossAmountMinor as number | null,
      status: input.status as ShippingRule["status"],
      actorId: actor.id,
      reason: input.reason,
      effectiveFrom: typeof input.effectiveFrom === "string" ? input.effectiveFrom : undefined,
    });
    return NextResponse.json({ rate }, { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error) {
    const limited = endpointRateLimitResponse(error);
    if (limited) return NextResponse.json({ error: limited.message }, { status: limited.status, headers: { ...PRIVATE_NO_STORE_HEADERS, ...limited.headers } });
    return NextResponse.json({ error: "SHIPPING_RATE_UPDATE_DENIED" }, { status: 409, headers: PRIVATE_NO_STORE_HEADERS });
  }
}
