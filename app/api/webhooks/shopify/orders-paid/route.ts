import { NextResponse } from "next/server";
import { recordVerifiedMtmPaidOrder } from "@/lib/storefront/mtm-paid-order-lifecycle";
import { housePaymentFromShopify, shopifyOrderAttributes, type ShopifyPaidLine } from "@/lib/storefront/mtm-house-paid-webhook";
import { assertVerifiedShopifyWebhook } from "@/lib/storefront/security/shopify-webhook";

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
};

function asOrderGid(payload: ShopifyOrderPayload): string {
  if (typeof payload.admin_graphql_api_id === "string" && /^gid:\/\/shopify\/Order\/\d+$/.test(payload.admin_graphql_api_id)) return payload.admin_graphql_api_id;
  if (Number.isSafeInteger(payload.id) && payload.id! > 0) return `gid://shopify/Order/${payload.id}`;
  throw new Error("SHOPIFY_PAID_ORDER_ID_INVALID");
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
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "SHOPIFY_WEBHOOK_FAILED";
    return new NextResponse(code === "SHOPIFY_PAID_ORDER_NOT_MTM" ? null : "Webhook rejected", {
      status: code === "SHOPIFY_PAID_ORDER_NOT_MTM" ? 200 : 400,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
