import { reviewStaffIdentity } from "@/lib/storefront/review-auth";
import { contentDispositionFileName, retrieveStaffEvidence } from "@/lib/storefront/security/evidence-access";
import { PRIVATE_NO_STORE_HEADERS } from "@/lib/storefront/security/http";
import { endpointRateLimitResponse } from "@/lib/storefront/security/endpoint-rate-limit";
import { enforceStaffEndpointRateLimit } from "@/lib/storefront/security/staff-rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ evidenceId: string }> }) {
  const actor = await reviewStaffIdentity();
  if (!actor) return Response.json({ error: "STAFF_ACCESS_REQUIRED" }, { status: 403, headers: PRIVATE_NO_STORE_HEADERS });
  try {
    await enforceStaffEndpointRateLimit({ request, actorId: actor.id, scope: "evidence-download", policy: { limit: 60, windowSeconds: 60 } });
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
  } catch (error) {
    const limited = endpointRateLimitResponse(error);
    if (limited) return Response.json({ error: limited.message }, { status: limited.status, headers: { ...PRIVATE_NO_STORE_HEADERS, ...limited.headers } });
    return Response.json({ error: "EVIDENCE_ACCESS_DENIED" }, { status: 403, headers: PRIVATE_NO_STORE_HEADERS });
  }
}
