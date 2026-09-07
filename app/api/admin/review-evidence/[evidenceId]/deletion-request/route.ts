import { NextResponse } from "next/server";
import { supplierAdminIdentity } from "@/lib/supplier-intelligence/server-auth";
import { requestEvidenceDeletion } from "@/lib/storefront/security/evidence-access";
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
    const input = await readBoundedJson<{ reason?: unknown }>(request, 4_096);
    const reason = typeof input.reason === "string" ? input.reason : "";
    return NextResponse.json(await requestEvidenceDeletion({ evidenceId, actorId: actor.id, reason }), {
      headers: PRIVATE_NO_STORE_HEADERS,
    });
  } catch {
    return NextResponse.json({ error: "EVIDENCE_DELETION_DENIED" }, { status: 403, headers: PRIVATE_NO_STORE_HEADERS });
  }
}
