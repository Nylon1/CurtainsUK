import { NextResponse } from "next/server";
import { supplierAdminIdentity } from "@/lib/supplier-intelligence/server-auth";
import { readBoundedJson } from "@/lib/storefront/staging-api";
import {
  evidenceMaintenancePreview,
  removeExpiredReviewEvidence,
  removePlannedEvidenceOrphans,
} from "@/lib/storefront/security/evidence-maintenance";
import { assertSameOriginJsonMutation, PRIVATE_NO_STORE_HEADERS } from "@/lib/storefront/security/http";
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
    await enforceStaffEndpointRateLimit({ request, actorId: actor.id, scope: "evidence-maintenance-read", policy: { limit: 30, windowSeconds: 60 } });
    return NextResponse.json(await evidenceMaintenancePreview(), { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error) {
    const limited = endpointRateLimitResponse(error);
    if (limited) return NextResponse.json({ error: limited.message }, { status: limited.status, headers: { ...PRIVATE_NO_STORE_HEADERS, ...limited.headers } });
    return NextResponse.json({ error: "EVIDENCE_MAINTENANCE_UNAVAILABLE" }, { status: 503, headers: PRIVATE_NO_STORE_HEADERS });
  }
}

export async function POST(request: Request) {
  const actor = await supplierAdminIdentity();
  if (!actor) {
    return NextResponse.json({ error: "STAFF_ACCESS_REQUIRED" }, { status: 403, headers: PRIVATE_NO_STORE_HEADERS });
  }
  try {
    await enforceStaffEndpointRateLimit({ request, actorId: actor.id, scope: "evidence-maintenance-write", policy: { limit: 5, windowSeconds: 3_600 } });
    assertSameOriginJsonMutation(request);
    const input = await readBoundedJson<{
      mode?: unknown;
      expectedObjectPaths?: unknown;
      expectedEvidenceIds?: unknown;
      reason?: unknown;
    }>(request, 16_384);
    const reason = typeof input.reason === "string" ? input.reason : "";
    if (input.mode === "RETENTION") {
      if (!Array.isArray(input.expectedEvidenceIds)
        || !input.expectedEvidenceIds.every((value): value is string => typeof value === "string")) {
        throw new Error("EVIDENCE_RETENTION_CLEANUP_INVALID");
      }
      return NextResponse.json(await removeExpiredReviewEvidence({
        expectedEvidenceIds: input.expectedEvidenceIds,
        actorId: actor.id,
        reason,
      }), { headers: PRIVATE_NO_STORE_HEADERS });
    }
    if (input.mode !== "ORPHAN"
      || !Array.isArray(input.expectedObjectPaths)
      || !input.expectedObjectPaths.every((value): value is string => typeof value === "string")) {
      throw new Error("EVIDENCE_ORPHAN_CLEANUP_INVALID");
    }
    return NextResponse.json(await removePlannedEvidenceOrphans({
      expectedObjectPaths: input.expectedObjectPaths,
      reason,
    }), { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error) {
    const limited = endpointRateLimitResponse(error);
    if (limited) return NextResponse.json({ error: limited.message }, { status: limited.status, headers: { ...PRIVATE_NO_STORE_HEADERS, ...limited.headers } });
    return NextResponse.json({ error: "EVIDENCE_ORPHAN_CLEANUP_DENIED" }, { status: 409, headers: PRIVATE_NO_STORE_HEADERS });
  }
}
