import { NextResponse } from "next/server";
import { reviewStaffIdentity } from "@/lib/storefront/review-auth";
import { supplierAdminIdentity } from "@/lib/supplier-intelligence/server-auth";
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
  const { data: refreshEvents, error: auditError } = await createSupplierServiceClient()
    .from("daily_stock_refresh_events")
    .select("event_id,operator_id,snapshot_date,completed_at,supplier_results")
    .order("completed_at", { ascending: false })
    .limit(20);
  return error || auditError
    ? NextResponse.json(
        { error: "SNAPSHOT_STATUS_UNAVAILABLE" },
        { status: 503, headers },
      )
    : NextResponse.json(
        {
          runs: data,
          refreshEvents,
          responsibleOperator: "CurtainsUK owner/admin",
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
    if (input.action === "MORNING_REFRESH") {
      if (process.env.CURTAINSUK_DEPLOYMENT_STAGE !== "STAGING" || !(await supplierAdminIdentity()))
        return NextResponse.json({error:"SUPPLIER_ADMIN_REQUIRED"},{status:403,headers});
      if (input.confirmedCurrentSource !== true) throw Error("CURRENT_SOURCE_REQUIRED");
      const {data,error} = await createSupplierServiceClient().rpc("materialize_daily_stock_for_operator", {p_operator: actor.id});
      if (error) return NextResponse.json({error:"Refresh pending. Last successful snapshots remain unchanged. Retry after recovery."},{status:503,headers});
      return NextResponse.json({runs:data,message:"Only today's approved observations were added. Existing daily snapshots and confirmed usage were preserved. Check supplier coverage below; this does not retrieve supplier data."},{headers});
    }
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
