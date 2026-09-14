import { createHmac, timingSafeEqual } from "node:crypto";

export interface HciCommerceContext {
  sessionId: string;
  strategyId: string;
  fabricMasterId: string;
  policyVersion: string;
  recommendationVersion: string;
}
const uuid = /^[0-9a-f-]{36}$/i;
export function signHciCommerceContext(context: HciCommerceContext, secret: string, now = Date.now()) {
  if (secret.length < 32) throw Error("HCI_CONTEXT_SIGNING_UNAVAILABLE");
  const payload = Buffer.from(JSON.stringify({...context, expiresAt:now + 7 * 86400000})).toString("base64url");
  return `${payload}.${createHmac("sha256",secret).update(`hci-commerce-v1:${payload}`).digest("base64url")}`;
}
export function verifyHciCommerceContext(token: unknown, fabricId: string, secret: string, now = Date.now()): HciCommerceContext {
  if(typeof token !== "string" || token.length > 2000 || secret.length < 32) throw Error("HCI_CONTEXT_INVALID");
  const [payload, signature, extra] = token.split(".");
  const expected = createHmac("sha256",secret).update(`hci-commerce-v1:${payload}`).digest();
  const actual = Buffer.from(signature ?? "", "base64url");
  if(extra || actual.length !== expected.length || !timingSafeEqual(actual,expected)) throw Error("HCI_CONTEXT_INVALID");
  const value = JSON.parse(Buffer.from(payload,"base64url").toString("utf8"));
  if(!uuid.test(value.sessionId) || value.fabricMasterId !== fabricId || !Number.isFinite(value.expiresAt) || value.expiresAt <= now) throw Error("HCI_CONTEXT_INVALID");
  return {sessionId:value.sessionId,strategyId:value.strategyId,fabricMasterId:value.fabricMasterId,policyVersion:value.policyVersion,recommendationVersion:value.recommendationVersion};
}
