import { NextResponse } from "next/server";
import { reviewStaffIdentity } from "@/lib/storefront/review-auth";
import { createSupplierServiceClient } from "@/lib/supabase/supplier-service";
import { readBoundedJson } from "@/lib/storefront/staging-api";
import {
  assertSameOriginJsonMutation,
  PRIVATE_NO_STORE_HEADERS as headers,
} from "@/lib/storefront/security/http";
import { enforceStaffEndpointRateLimit } from "@/lib/storefront/security/staff-rate-limit";
export const dynamic = "force-dynamic";
export async function GET() {
  if (!(await reviewStaffIdentity()))
    return NextResponse.json(
      { error: "STAFF_ACCESS_REQUIRED" },
      { status: 403, headers },
    );
  const { data, error } = await createSupplierServiceClient()
    .from("daily_stock_runs")
    .select("supplier_id,snapshot_date,attempted_at,status,imported,error_code")
    .order("snapshot_date", { ascending: false })
    .limit(20);
  return error
    ? NextResponse.json(
        { error: "SNAPSHOT_STATUS_UNAVAILABLE" },
        { status: 503, headers },
      )
    : NextResponse.json(
        {
          runs: data,
          upstreamRefresh: "UNATTENDED_SUPPLIER_SOURCE_NOT_CONFIGURED",
        },
        { headers },
      );
}
export async function POST(request: Request) {
  const actor = await reviewStaffIdentity();
  if (!actor)
    return NextResponse.json(
      { error: "STAFF_ACCESS_REQUIRED" },
      { status: 403, headers },
    );
  try {
    assertSameOriginJsonMutation(request);
    await enforceStaffEndpointRateLimit({
      request,
      actorId: actor.id,
      scope: "confirmed-stock-usage",
      policy: { limit: 30, windowSeconds: 3600 },
    });
    const input = await readBoundedJson<Record<string, unknown>>(request, 2048);
    if (
      input.confirmedOrder !== true ||
      typeof input.configurationId !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(input.configurationId) ||
      typeof input.orderReference !== "string" ||
      !/^gid:\/\/shopify\/Order\/\d+$/.test(input.orderReference)
    )
      throw new Error("CONFIRMED_ORDER_REQUIRED");
    const { data, error } = await createSupplierServiceClient().rpc(
      "confirm_daily_stock_usage",
      {
        p_configuration: input.configurationId,
        p_order: input.orderReference,
        p_actor: actor.id,
      },
    );
    if (error) throw new Error("CONFIRMED_USAGE_REJECTED");
    return NextResponse.json(
      { recorded: data === true, reused: data === false },
      { headers },
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "Confirmed usage was not recorded. Check the order and immutable configuration references.",
      },
      { status: 409, headers },
    );
  }
}
