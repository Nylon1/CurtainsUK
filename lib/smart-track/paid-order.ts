import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { TrackCheckoutGroup } from "./checkout";
import { trackSpecificationDigest } from "./pricing";
import { specDigest } from "../cushion-studio/repository";
import {
  housePaymentFromShopify,
  shopifyOrderAttributes,
  type ShopifyPaidLine,
} from "../storefront/mtm-house-paid-webhook";
export function hasSmartTrackPaidLines(value: unknown) {
  return (
    Array.isArray((value as { line_items?: unknown[] })?.line_items) &&
    (value as { line_items: ShopifyPaidLine[] }).line_items.some((l) =>
      l.properties?.some(
        (p) =>
          p.name === "_curtainsuk_track_snapshot_id" ||
          (p.name === "_curtainsuk_product_type" && p.value === "SMART_TRACK"),
      ),
    )
  );
}
const minor = (v: unknown) => {
  if (typeof v !== "string" || !/^\d+(?:\.\d{1,2})?$/.test(v))
    throw Error("TRACK_PAID_AMOUNT_INVALID");
  const [a, b = ""] = v.split(".");
  const n = Number(a) * 100 + Number(b.padEnd(2, "0"));
  if (!Number.isSafeInteger(n)) throw Error("TRACK_PAID_AMOUNT_INVALID");
  return n;
};
const ids = [
  "_curtainsuk_track_snapshot_id",
  "_curtainsuk_cushion_snapshot_id",
  "_curtainsuk_snapshot_id",
];
export interface TrackPaidServices {
  secret: string;
  group(key: string): Promise<TrackCheckoutGroup | null>;
  verifyDraft(group: TrackCheckoutGroup, orderGid: string): Promise<string>;
  record(
    orderGid: string,
    manifest: Record<string, unknown>,
  ): Promise<{ duplicate: boolean }>;
}
export async function processSmartTrackPaidOrder(
  raw: Uint8Array,
  signature: string | null,
  services: TrackPaidServices,
) {
  if (
    !signature ||
    services.secret.length < 32 ||
    !raw.length ||
    raw.length > 256000
  )
    throw Error("TRACK_WEBHOOK_INVALID");
  const expected = createHmac("sha256", services.secret).update(raw).digest(),
    received = Buffer.from(signature, "base64");
  if (
    received.length !== expected.length ||
    !timingSafeEqual(expected, received)
  )
    throw Error("TRACK_WEBHOOK_SIGNATURE_INVALID");
  const p = JSON.parse(Buffer.from(raw).toString("utf8"));
  if (
    !Number.isSafeInteger(p.id) ||
    p.id <= 0 ||
    typeof p.name !== "string" ||
    p.currency !== "GBP" ||
    p.taxes_included !== true ||
    p.financial_status !== "paid" ||
    !Array.isArray(p.line_items) ||
    !p.line_items.length ||
    p.line_items.length > 100
  )
    throw Error("TRACK_PAID_PAYLOAD_INVALID");
  const attrs = shopifyOrderAttributes(p.note_attributes),
    key = attrs.get("curtainsuk_track_checkout_key");
  if (!key || !/^[A-Za-z0-9-]{8,100}$/.test(key))
    throw Error("TRACK_PAID_BINDING_INVALID");
  const group = await services.group(key);
  if (
    !group ||
    group.contract.environment !== "PRODUCTION" ||
    !group.contract.paymentEnabled ||
    attrs.get("curtainsuk_my_home_review_id") !== group.reviewId
  )
    throw Error("TRACK_PAID_BINDING_INVALID");
  const contract = group.contract;
  if (p.line_items.length !== contract.input.lineItems.length)
    throw Error("TRACK_PAID_LINES_MISMATCH");
  const groups: {
    tracks: Record<string, string>[];
    cushions: Record<string, string>[];
    curtains: Record<string, string>[];
  } = { tracks: [], cushions: [], curtains: [] };
  const seen = new Set<string>(),
    lineIds = new Set<number>();
  let goods = 0;
  for (const line of p.line_items) {
    if (
      !Number.isSafeInteger(line.id) ||
      line.id <= 0 ||
      lineIds.has(line.id) ||
      line.quantity !== 1 ||
      !Array.isArray(line.properties) ||
      minor(line.total_discount ?? "0") !== 0
    )
      throw Error("TRACK_PAID_LINES_MISMATCH");
    lineIds.add(line.id);
    const props = new Map<string, string>(
      line.properties.map((a: { name: string; value: string }) => [
        a.name,
        a.value,
      ]),
    );
    const present = ids.filter((id) => props.has(id));
    if (props.size !== line.properties.length || present.length !== 1)
      throw Error("TRACK_PAID_LINES_MISMATCH");
    const snapshotId = props.get(present[0])!;
    if (seen.has(snapshotId)) throw Error("TRACK_PAID_LINES_MISMATCH");
    seen.add(snapshotId);
    const source = contract.input.lineItems.find((l) =>
      l.customAttributes.some(
        (a) => a.key === present[0] && a.value === snapshotId,
      ),
    );
    if (
      !source ||
      source.quantity !== 1 ||
      minor(line.price) !==
        minor(source.originalUnitPriceWithCurrency.amount) ||
      source.customAttributes.some((a) => props.get(a.key) !== a.value)
    )
      throw Error("TRACK_PAID_LINES_MISMATCH");
    const productType =
      present[0] === ids[0]
        ? "SMART_TRACK"
        : present[0] === ids[1]
          ? "CUSHION"
          : "CURTAIN";
    if (productType === "SMART_TRACK") {
      const s = group.snapshots.find((s) => s.id === snapshotId);
      if (
        !s ||
        s.specSha256 !== trackSpecificationDigest(s.spec) ||
        s.price.goodsGrossMinor !== minor(line.price) ||
        !s.customerApproved
      )
        throw Error("TRACK_PAID_SNAPSHOT_MISMATCH");
    } else if (productType === "CUSHION") {
      const s = group.cushions.find((s) => s.id === snapshotId);
      if (
        !s ||
        s.specSha256 !== specDigest(s.spec) ||
        s.price.goodsGrossMinor !== minor(line.price)
      )
        throw Error("TRACK_PAID_SNAPSHOT_MISMATCH");
    }
    if (
      !group.packets.some(
        (s) => s.snapshotId === snapshotId && s.productType === productType,
      )
    )
      throw Error("TRACK_PAID_PACKET_MISSING");
    groups[
      productType === "SMART_TRACK"
        ? "tracks"
        : productType === "CUSHION"
          ? "cushions"
          : "curtains"
    ].push({ productType, snapshotId, lineId: String(line.id) });
    goods += minor(line.price);
  }
  const shipping = p.total_shipping_price_set?.presentment_money;
  if (
    !groups.tracks.length ||
    groups.tracks.length !== group.snapshots.length ||
    groups.cushions.length !== group.cushions.length ||
    goods !== contract.expected.goodsGrossAmountMinor ||
    shipping?.currency_code !== "GBP" ||
    minor(shipping?.amount) !== contract.expected.shippingGrossAmountMinor ||
    minor(p.total_price) !== contract.expected.orderGrossAmountMinor ||
    minor(p.total_tax) !== contract.expected.orderVatAmountMinor ||
    minor(p.total_discounts) !== 0
  )
    throw Error("TRACK_PAID_FINANCIAL_MISMATCH");
  const paidAt = p.processed_at ?? p.created_at;
  if (typeof paidAt !== "string" || !Number.isFinite(Date.parse(paidAt)))
    throw Error("TRACK_PAID_TIMESTAMP_INVALID");
  const orderGid = `gid://shopify/Order/${p.id}`,
    draftId = await services.verifyDraft(group, orderGid);
  let nativeCurtainPayment: Record<string, unknown> | undefined;
  if (groups.curtains.length) {
    const attributes = shopifyOrderAttributes(contract.input.customAttributes);
    const house = housePaymentFromShopify({
      orderAttributes: attributes,
      lineItems: p.line_items.filter((l: ShopifyPaidLine) =>
        l.properties?.some((a) => a.name === "_curtainsuk_snapshot_id"),
      ),
    });
    if (!house) throw Error("TRACK_NATIVE_CURTAIN_CONTRACT_REQUIRED");
    const hex = createHash("sha256")
      .update(`mixed-paid:${orderGid}`)
      .digest("hex");
    nativeCurtainPayment = {
      paid_order_id: `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`,
      house_id: house.houseId,
      house_revision: house.houseRevision,
      house_fingerprint: house.houseFingerprint,
      contract_fingerprint: house.contractFingerprint,
      curtains: house.curtains.map((c) => ({
        snapshot_id: c.snapshotId,
        configuration_id: c.configurationId,
        room_id: c.roomId,
        room_name: c.roomName,
        window_name: c.windowName,
        line_ordinal: c.lineOrdinal,
      })),
      shopify_order_gid: orderGid,
      shopify_order_name: p.name,
      shopify_draft_order_gid: draftId,
      paid_at: paidAt,
      webhook_payload_sha256: createHash("sha256").update(raw).digest("hex"),
    };
  }
  const manifest = {
    version: 1,
    orderGid,
    orderName: p.name,
    paidAt,
    checkoutKey: key,
    verifiedDraftOrderGid: draftId,
    groups,
    packets: group.packets,
    holdTogether: true,
    lifecycleState: "CURTAINSUK_REVIEW",
    ...(nativeCurtainPayment ? { nativeCurtainPayment } : {}),
  };
  return { ...(await services.record(orderGid, manifest)), manifest };
}
