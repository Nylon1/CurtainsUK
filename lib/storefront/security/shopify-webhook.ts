import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

function webhookSecret() {
  const secret = process.env.CURTAINSUK_SHOPIFY_APP_SECRET;
  if (!secret || secret.length < 32) throw new Error("SHOPIFY_WEBHOOK_NOT_CONFIGURED");
  return secret;
}

/** Verify Shopify's raw-body HMAC before parsing the paid-order payload. */
export function assertVerifiedShopifyWebhook(rawBody: Uint8Array, receivedHmac: string | null) {
  if (!receivedHmac || !/^[A-Za-z0-9+/]+={0,2}$/.test(receivedHmac)) throw new Error("SHOPIFY_WEBHOOK_SIGNATURE_INVALID");
  const expected = createHmac("sha256", webhookSecret()).update(rawBody).digest();
  let received: Buffer;
  try { received = Buffer.from(receivedHmac, "base64"); } catch { throw new Error("SHOPIFY_WEBHOOK_SIGNATURE_INVALID"); }
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) throw new Error("SHOPIFY_WEBHOOK_SIGNATURE_INVALID");
}
