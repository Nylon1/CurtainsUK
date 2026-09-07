import { NextResponse } from "next/server";
import { supplierAdminIdentity } from "@/lib/supplier-intelligence/server-auth";
import { completeEvidenceDeletion } from "@/lib/storefront/security/evidence-access";
import { assertSameOriginJsonMutation, PRIVATE_NO_STORE_HEADERS } from "@/lib/storefront/security/http";
import { readBoundedJson } from "@/lib/storefront/staging-api";
import { endpointRateLimitResponse } from "@/lib/storefront/security/endpoint-rate-limit";
import { enforceStaffEndpointRateLimit } from "@/lib/storefront/security/staff-rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ evidenceId: string }> }) {
  const actor = await supplierAdminIdentity();
  if (!actor) return NextResponse.json({ error: "STAFF_ACCESS_REQUIRED" }, { status: 403, headers: PRIVATE_NO_STORE_HEADERS });
  try {
    await enforceStaffEndpointRateLimit({ request, actorId: actor.id, scope: "evidence-delete-complete", policy: { limit: 10, windowSeconds: 3_600 } });
    assertSameOriginJsonMutation(request);
    const { evidenceId } = await context.params;
    const input = await readBoundedJson<{ reason?: unknown }>(request, 4_096);
    const reason = typeof input.reason === "string" ? input.reason : "";
    return NextResponse.json(await completeEvidenceDeletion({ evidenceId, actorId: actor.id, reason }), {
      headers: PRIVATE_NO_STORE_HEADERS,
    });
  } catch (error) {
    const limited = endpointRateLimitResponse(error);
    if (limited) return NextResponse.json({ error: limited.message }, { status: limited.status, headers: { ...PRIVATE_NO_STORE_HEADERS, ...limited.headers } });
    return NextResponse.json({ error: "EVIDENCE_DELETION_DENIED" }, { status: 403, headers: PRIVATE_NO_STORE_HEADERS });
  }
}
