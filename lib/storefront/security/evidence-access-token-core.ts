import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

export interface EvidenceAccessClaims {
  evidenceId: string;
  actorId: string;
}

function validUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function digest(secret: string, claims: EvidenceAccessClaims, expiresAt: number, nonce: string) {
  return createHmac("sha256", secret)
    .update("curtainsuk:staff-evidence-access:v1\0")
    .update(claims.evidenceId)
    .update("\0")
    .update(claims.actorId)
    .update("\0")
    .update(String(expiresAt))
    .update("\0")
    .update(nonce)
    .digest("hex");
}

export function createEvidenceAccessTokenWithSecret(
  claims: EvidenceAccessClaims,
  secret: string,
  input: { nowSeconds?: number; ttlSeconds?: number; nonce?: string } = {},
) {
  if (!validUuid(claims.evidenceId) || !validUuid(claims.actorId) || secret.length < 32) {
    throw new Error("EVIDENCE_ACCESS_TOKEN_INVALID");
  }
  const now = input.nowSeconds ?? Math.floor(Date.now() / 1_000);
  const ttl = input.ttlSeconds ?? 60;
  if (!Number.isInteger(ttl) || ttl < 10 || ttl > 300) throw new Error("EVIDENCE_ACCESS_TOKEN_INVALID");
  const expiresAt = now + ttl;
  const nonce = input.nonce ?? randomUUID().replaceAll("-", "");
  if (!/^[a-zA-Z0-9_-]{16,64}$/.test(nonce)) throw new Error("EVIDENCE_ACCESS_TOKEN_INVALID");
  return `v1.${expiresAt}.${claims.evidenceId}.${claims.actorId}.${nonce}.${digest(secret, claims, expiresAt, nonce)}`;
}

export function verifyEvidenceAccessTokenWithSecret(
  token: unknown,
  expectedClaims: EvidenceAccessClaims,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1_000),
) {
  if (typeof token !== "string" || token.length > 512 || !validUuid(expectedClaims.evidenceId) || !validUuid(expectedClaims.actorId)) return false;
  const [version, expiryText, evidenceId, actorId, nonce, signature, ...extra] = token.split(".");
  if (version !== "v1" || extra.length || !/^\d{1,12}$/.test(expiryText ?? "") || !signature || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  if (evidenceId !== expectedClaims.evidenceId || actorId !== expectedClaims.actorId || !/^[a-zA-Z0-9_-]{16,64}$/.test(nonce ?? "")) return false;
  const expiresAt = Number.parseInt(expiryText, 10);
  if (expiresAt < nowSeconds || expiresAt > nowSeconds + 300) return false;
  const expected = digest(secret, expectedClaims, expiresAt, nonce);
  const receivedBytes = Buffer.from(signature.toLowerCase(), "ascii");
  const expectedBytes = Buffer.from(expected, "ascii");
  return receivedBytes.length === expectedBytes.length && timingSafeEqual(receivedBytes, expectedBytes);
}
