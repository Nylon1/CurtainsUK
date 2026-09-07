import "server-only";
import { createHmac } from "node:crypto";
import { consumeEndpointRateLimit, type EndpointRateLimitPolicy } from "./endpoint-rate-limit";

function clientAddress(request: Request) {
  const forwarded = request.headers.get("x-vercel-forwarded-for") ?? request.headers.get("x-forwarded-for") ?? "unknown";
  return forwarded.split(",", 1)[0].trim().slice(0, 128) || "unknown";
}

function fingerprintSecret() {
  const secret = process.env.CURTAINSUK_RATE_LIMIT_FINGERPRINT_SECRET
    ?? process.env.CURTAINSUK_EVIDENCE_ACCESS_SECRET
    ?? process.env.CURTAINSUK_SHOPIFY_APP_SECRET;
  if (!secret || secret.length < 32) throw new Error("STAFF_RATE_LIMIT_NOT_CONFIGURED");
  return secret;
}

export async function enforceStaffEndpointRateLimit(input: {
  request: Request;
  actorId: string;
  scope: string;
  policy: EndpointRateLimitPolicy;
}) {
  if (!/^[a-z0-9][a-z0-9-]{1,63}$/.test(input.scope)) throw new Error("STAFF_RATE_LIMIT_INVALID");
  const secret = fingerprintSecret();
  const fingerprint = createHmac("sha256", secret)
    .update("curtainsuk:staff-endpoint-rate:v1\0")
    .update(input.actorId)
    .update("\0")
    .update(clientAddress(input.request))
    .update("\0")
    .update(input.scope)
    .digest("hex");
  await consumeEndpointRateLimit(fingerprint, input.policy);
}
