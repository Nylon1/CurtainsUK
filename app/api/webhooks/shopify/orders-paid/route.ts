import { NextResponse } from "next/server";
import { recordVerifiedMtmPaidOrder } from "@/lib/storefront/mtm-paid-order-lifecycle";
import { housePaymentFromShopify, shopifyOrderAttributes, type ShopifyPaidLine } from "@/lib/storefront/mtm-house-paid-webhook";
import { assertVerifiedShopifyWebhook } from "@/lib/storefront/security/shopify-webhook";
import { sendOpenAiOrderCreated } from "@/lib/storefront/openai-ads-conversions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ShopifyOrderPayload = {
  id?: number;
  admin_graphql_api_id?: string;
  name?: string;
  processed_at?: string;
  created_at?: string;
  contact_email?: string;
  email?: string;
  total_price?: string;
  current_total_price?: string;
  currency?: string;
  presentment_currency?: string;
  note_attributes?: Array<{ name?: unknown; key?: unknown; value?: unknown }>;
  line_items?: ShopifyPaidLine[];
};

function asOrderGid(payload: ShopifyOrderPayload): string {
  if (typeof payload.admin_graphql_api_id === "string" && /^gid:\/\/shopify\/Order\/\d+$/.test(payload.admin_graphql_api_id)) return payload.admin_graphql_api_id;
  if (Number.isSafeInteger(payload.id) && payload.id! > 0) return `gid://shopify/Order/${payload.id}`;
  throw new Error("SHOPIFY_PAID_ORDER_ID_INVALID");
}

function asOrderNumericId(payload: ShopifyOrderPayload): string {
  if (Number.isSafeInteger(payload.id) && payload.id! > 0) return String(payload.id);
  const match = typeof payload.admin_graphql_api_id === "string"
    ? payload.admin_graphql_api_id.match(/^gid:\/\/shopify\/Order\/(\d+)$/)
    : null;
  if (match) return match[1];
  throw new Error("SHOPIFY_PAID_ORDER_ID_INVALID");
}

function moneyMinor(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d+(?:\.\d{1,2})?$/.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(amount) ? amount : null;
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

    // Advertising telemetry must never block or roll back a verified paid order.
    // A stable Shopify-order event id makes CAPI retries safe and future browser
    // duplication removable with the same event_id.
    try {
      const amountMinor = moneyMinor(payload.current_total_price ?? payload.total_price);
      const currency = payload.presentment_currency ?? payload.currency ?? "GBP";
      if (amountMinor !== null) {
        const conversion = await sendOpenAiOrderCreated({
          shopifyOrderId: asOrderNumericId(payload),
          paidAt,
          amountMinor,
          currency,
          oppref: orderAttributes.get("curtainsuk_openai_oppref"),
          obref: orderAttributes.get("curtainsuk_openai_obref"),
          email: payload.contact_email ?? payload.email,
          contentId: house?.houseId ?? snapshotId ?? null,
          contentType: house ? "curtain_house_order" : "curtain_order",
          sourceUrl: "https://www.curtainsuk.com/",
        });
        if (conversion.status === "sent") {
          console.info(JSON.stringify({ event: "OPENAI_ADS_ORDER_CREATED_SENT", order: orderName }));
        } else if (conversion.status === "validated") {
          console.info(JSON.stringify({ event: "OPENAI_ADS_ORDER_CREATED_VALIDATED", order: orderName }));
        }
      }
    } catch (conversionError) {
      const code = conversionError instanceof Error ? conversionError.message.split(":", 1)[0] : "OPENAI_ADS_CAPI_FAILED";
      console.error(JSON.stringify({
        event: "OPENAI_ADS_ORDER_CREATED_FAILED",
        code: /^[A-Z0-9_]+$/.test(code) ? code : "OPENAI_ADS_CAPI_FAILED",
      }));
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
