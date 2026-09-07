import { NextResponse } from "next/server";
import { supplierAdminIdentity } from "@/lib/supplier-intelligence/server-auth";
import { issueStaffEvidenceAccess } from "@/lib/storefront/security/evidence-access";
import { assertSameOriginJsonMutation, PRIVATE_NO_STORE_HEADERS } from "@/lib/storefront/security/http";
import { readBoundedJson } from "@/lib/storefront/staging-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ evidenceId: string }> }) {
  const actor = await supplierAdminIdentity();
  if (!actor) return NextResponse.json({ error: "STAFF_ACCESS_REQUIRED" }, { status: 403, headers: PRIVATE_NO_STORE_HEADERS });
  try {
    assertSameOriginJsonMutation(request);
    const { evidenceId } = await context.params;
    const input = await readBoundedJson<{ reason?: unknown }>(request, 2_048);
    const reason = typeof input.reason === "string" ? input.reason : "";
    const result = await issueStaffEvidenceAccess({ evidenceId, actorId: actor.id, reason });
    return NextResponse.json({
      downloadUrl: `/api/admin/review-evidence/${encodeURIComponent(evidenceId)}/download?token=${encodeURIComponent(result.token)}`,
      expiresInSeconds: result.expiresInSeconds,
    }, { headers: PRIVATE_NO_STORE_HEADERS });
  } catch {
    return NextResponse.json({ error: "EVIDENCE_ACCESS_DENIED" }, { status: 403, headers: PRIVATE_NO_STORE_HEADERS });
  }
}
