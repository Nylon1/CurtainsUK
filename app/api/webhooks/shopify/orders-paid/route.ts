import { NextResponse } from "next/server";
import { recordVerifiedMtmPaidOrder } from "@/lib/storefront/mtm-paid-order-lifecycle";
import { housePaymentFromShopify, shopifyOrderAttributes, type ShopifyPaidLine } from "@/lib/storefront/mtm-house-paid-webhook";
import { assertVerifiedShopifyWebhook } from "@/lib/storefront/security/shopify-webhook";
import { sendOpenAiOrderCreated } from "@/lib/storefront/openai-ads-capi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ShopifyOrderPayload = {
  id?: number;
  admin_graphql_api_id?: string;
  name?: string;
  processed_at?: string;
  created_at?: string;
  note_attributes?: Array<{ name?: unknown; key?: unknown; value?: unknown }>;
  line_items?: ShopifyPaidLine[];
  current_total_price?: string;
  total_price?: string;
  currency?: string;
  email?: string;
  contact_email?: string;
  customer?: { email?: string };
  shipping_address?: { zip?: string; country_code?: string };
};

function asOrderGid(payload: ShopifyOrderPayload): string {
  if (typeof payload.admin_graphql_api_id === "string" && /^gid:\/\/shopify\/Order\/\d+$/.test(payload.admin_graphql_api_id)) return payload.admin_graphql_api_id;
  if (Number.isSafeInteger(payload.id) && payload.id! > 0) return `gid://shopify/Order/${payload.id}`;
  throw new Error("SHOPIFY_PAID_ORDER_ID_INVALID");
}

function orderEventId(payload: ShopifyOrderPayload): string {
  if (Number.isSafeInteger(payload.id) && payload.id! > 0) return String(payload.id);
  const gid = asOrderGid(payload);
  return gid.slice(gid.lastIndexOf("/") + 1);
}

function moneyMinor(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d+(?:\.\d{1,2})?$/.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(minor) ? minor : null;
}

export async function POST(request: Request) {
  try {
    const rawBody = new Uint8Array(await request.arrayBuffer());
    if (rawBody.byteLength === 0 || rawBody.byteLength > 256_000) throw new Error("SHOPIFY_WEBHOOK_BODY_INVALID");
    assertVerifiedShopifyWebhook(rawBody, request.headers.get("x-shopify-hmac-sha256"));
    const payload = JSON.parse(new TextDecoder().decode(rawBody)) as ShopifyOrderPayload;
    const orderName = typeof payload.name === "string" && payload.name.trim() ? payload.name.trim() : null;
    const paidAt = typeof payload.processed_at === "string" ? payload.processed_at : payload.created_at;
    if (!orderName || !paidAt || !Number.isFinite(Date.parse(paidAt))) throw new Error("SHOPIFY_PAID_ORDER_PAYLOAD_INVALID");
    const orderAttributes = shopifyOrderAttributes(payload.note_attributes);
    const house = housePaymentFromShopify({ orderAttributes, lineItems: payload.line_items });
    const snapshotId = orderAttributes.get("curtainsuk_snapshot_id");
    const draftOrderGid = orderAttributes.get("curtainsuk_draft_order_gid") ?? null;
    if (!house && (!snapshotId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(snapshotId))) {
      throw new Error("SHOPIFY_PAID_ORDER_NOT_MTM");
    }
    await recordVerifiedMtmPaidOrder({
      ...(house ? { house } : { snapshotId: snapshotId! }),
      shopifyOrderGid: asOrderGid(payload),
      shopifyOrderName: orderName,
      shopifyDraftOrderGid: draftOrderGid,
      paidAt,
      rawWebhookBody: rawBody,
    });

    const amountMinor = moneyMinor(payload.current_total_price ?? payload.total_price);
    const currency = typeof payload.currency === "string" ? payload.currency.toUpperCase() : "";
    if (amountMinor !== null && currency === "GBP") {
      try {
        await sendOpenAiOrderCreated({
          orderId: orderEventId(payload),
          paidAt,
          amountMinor,
          currency: "GBP",
          oppref: orderAttributes.get("curtainsuk_openai_oppref") ?? null,
          obref: orderAttributes.get("curtainsuk_openai_obref") ?? null,
          email: payload.email ?? payload.contact_email ?? payload.customer?.email ?? null,
          country: payload.shipping_address?.country_code ?? "GB",
          postalCode: payload.shipping_address?.zip ?? null,
        });
      } catch {
        // Paid-order recording must never be blocked by advertising telemetry.
        // The stable order event ID makes a later retry/deduplication safe.
        console.error(JSON.stringify({ event: "OPENAI_ADS_CAPI_DELIVERY_FAILED", order: orderName }));
      }
    }

    return new NextResponse(null, { status: 200 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "SHOPIFY_WEBHOOK_FAILED";
    return new NextResponse(code === "SHOPIFY_PAID_ORDER_NOT_MTM" ? null : "Webhook rejected", {
      status: code === "SHOPIFY_PAID_ORDER_NOT_MTM" ? 200 : 400,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
