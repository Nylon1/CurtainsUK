import { supplierAdminIdentity } from "@/lib/supplier-intelligence/server-auth";
import { contentDispositionFileName, retrieveStaffEvidence } from "@/lib/storefront/security/evidence-access";
import { PRIVATE_NO_STORE_HEADERS } from "@/lib/storefront/security/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ evidenceId: string }> }) {
  const actor = await supplierAdminIdentity();
  if (!actor) return Response.json({ error: "STAFF_ACCESS_REQUIRED" }, { status: 403, headers: PRIVATE_NO_STORE_HEADERS });
  try {
    const { evidenceId } = await context.params;
    const token = new URL(request.url).searchParams.get("token");
    const evidence = await retrieveStaffEvidence({ evidenceId, actorId: actor.id, token });
    return new Response(evidence.bytes, {
      status: 200,
      headers: {
        ...PRIVATE_NO_STORE_HEADERS,
        "Content-Type": evidence.contentType,
        "Content-Disposition": contentDispositionFileName(evidence.fileName),
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch {
    return Response.json({ error: "EVIDENCE_ACCESS_DENIED" }, { status: 403, headers: PRIVATE_NO_STORE_HEADERS });
  }
}
