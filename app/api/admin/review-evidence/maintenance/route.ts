import { NextResponse } from "next/server";
import { supplierAdminIdentity } from "@/lib/supplier-intelligence/server-auth";
import { readBoundedJson } from "@/lib/storefront/staging-api";
import { evidenceMaintenancePreview, removePlannedEvidenceOrphans } from "@/lib/storefront/security/evidence-maintenance";
import { assertSameOriginJsonMutation, PRIVATE_NO_STORE_HEADERS } from "@/lib/storefront/security/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await supplierAdminIdentity())) {
    return NextResponse.json({ error: "STAFF_ACCESS_REQUIRED" }, { status: 403, headers: PRIVATE_NO_STORE_HEADERS });
  }
  try {
    return NextResponse.json(await evidenceMaintenancePreview(), { headers: PRIVATE_NO_STORE_HEADERS });
  } catch {
    return NextResponse.json({ error: "EVIDENCE_MAINTENANCE_UNAVAILABLE" }, { status: 503, headers: PRIVATE_NO_STORE_HEADERS });
  }
}

export async function POST(request: Request) {
  if (!(await supplierAdminIdentity())) {
    return NextResponse.json({ error: "STAFF_ACCESS_REQUIRED" }, { status: 403, headers: PRIVATE_NO_STORE_HEADERS });
  }
  try {
    assertSameOriginJsonMutation(request);
    const input = await readBoundedJson<{ expectedObjectPaths?: unknown; reason?: unknown }>(request, 16_384);
    if (!Array.isArray(input.expectedObjectPaths) || !input.expectedObjectPaths.every((value): value is string => typeof value === "string")) {
      throw new Error("EVIDENCE_ORPHAN_CLEANUP_INVALID");
    }
    const reason = typeof input.reason === "string" ? input.reason : "";
    return NextResponse.json(await removePlannedEvidenceOrphans({ expectedObjectPaths: input.expectedObjectPaths, reason }), {
      headers: PRIVATE_NO_STORE_HEADERS,
    });
  } catch {
    return NextResponse.json({ error: "EVIDENCE_ORPHAN_CLEANUP_DENIED" }, { status: 409, headers: PRIVATE_NO_STORE_HEADERS });
  }
}
