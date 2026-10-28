import { createHmac, timingSafeEqual } from "node:crypto";
import { specDigest, type CushionOrderSnapshot } from "./repository";
import { cushionWorkroomPacket } from "./checkout";
import { groupFulfilmentItems, type FulfilmentReference } from "./commerce";
import type { ShopifyDraftOrderExecutionContract } from "../storefront/shopify-draft-order-core";
import { expectedLineDiscount } from '../storefront/sample-credit';

type PaidLine = {
  id?: number;
  quantity?: number;
  price?: string;
  total_discount?: string;
  properties?: { name?: string; value?: string }[];
};
export interface CushionPaidOrderServices {
  secret: string;
  snapshot(id: string): Promise<CushionOrderSnapshot | null>;
  /** Existing curtain validation + packet builder; does not mutate by itself. */
  curtainPacket(
    snapshotId: string,
    line: PaidLine,
  ): Promise<Record<string, unknown>>;
  /** Atomic order-id deduplication and persistence of BOTH fulfilment streams. */
  record(
    orderGid: string,
    manifest: Record<string, unknown>,
  ): Promise<{ duplicate: boolean }>;
  /** Binds our persisted checkout/draft to this exact paid order and totals. */
  verifyOrder(
    payload: Record<string, unknown>,
    manifest: Record<string, unknown>,
  ): Promise<Record<string, unknown> | void>;
}

function minor(value: unknown) {
  if (typeof value !== "string" || !/^\d+(\.\d{1,2})?$/.test(value))
    throw new Error("CUSHION_PAID_AMOUNT_INVALID");
  const [whole, fraction = ""] = value.split(".");
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(amount))
    throw new Error("CUSHION_PAID_AMOUNT_INVALID");
  return amount;
}

export function verifyPersistedCushionPayment(
  payload: Record<string, unknown>,
  manifest: Record<string, unknown>,
  group: {
    snapshots: CushionOrderSnapshot[];
    contract: ShopifyDraftOrderExecutionContract;
  },
) {
  const contract = group.contract;
  if (
    contract.environment !== "PRODUCTION" ||
    !contract.paymentEnabled ||
    payload.currency !== "GBP" ||
    payload.taxes_included !== true
  )
    throw new Error("CUSHION_PAID_CONTRACT_INVALID");
  const expectedIds = contract.input.lineItems.map(
    (line) =>
      line.customAttributes.find(
        (property) =>
          property.key === "_curtainsuk_cushion_snapshot_id" ||
          property.key === "_curtainsuk_snapshot_id",
      )?.value,
  );
  const groups = manifest.groups as {
    curtains: FulfilmentReference[];
    cushions: FulfilmentReference[];
  };
  const actualIds = [...groups.curtains, ...groups.cushions].map(
    (line) => line.snapshotId,
  );
  if (
    expectedIds.some((id) => !id) ||
    expectedIds.length !== actualIds.length ||
    new Set(expectedIds).size !== expectedIds.length ||
    expectedIds.some((id) => !actualIds.includes(id!))
  )
    throw new Error("CUSHION_PAID_CHECKOUT_BINDING_INVALID");
  if (
    groups.cushions.length !== group.snapshots.length ||
    group.snapshots.some(
      (snapshot) =>
        !groups.cushions.some((line) => line.snapshotId === snapshot.id),
    )
  )
    throw new Error("CUSHION_PAID_CHECKOUT_BINDING_INVALID");
  const shipping = (
    payload.total_shipping_price_set as
      | { presentment_money?: { amount?: unknown; currency_code?: unknown } }
      | undefined
  )?.presentment_money;
  if (
    shipping?.currency_code !== "GBP" ||
    minor(shipping?.amount) !== contract.expected.shippingGrossAmountMinor ||
    minor(payload.total_price) !== contract.expected.orderGrossAmountMinor ||
    minor(payload.total_tax) !== contract.expected.orderVatAmountMinor ||
    minor(payload.total_discounts) !== (contract.expected.discountAmountMinor ?? 0)
  )
    throw new Error("CUSHION_PAID_ORDER_FINANCIAL_MISMATCH");
  const goods = (payload.line_items as PaidLine[]).reduce(
    (sum, line) => sum + minor(line.price),
    0,
  );
  if (goods !== contract.expected.goodsGrossAmountMinor)
    throw new Error("CUSHION_PAID_ORDER_FINANCIAL_MISMATCH");
  for (const line of payload.line_items as PaidLine[]) {
    const props=new Map((line.properties??[]).map(a=>[a.name,a.value]));
    const source=contract.input.lineItems.find(l=>l.customAttributes.some(a=>['_curtainsuk_snapshot_id','_curtainsuk_cushion_snapshot_id'].includes(a.key)&&props.get(a.key)===a.value));
    if(!source || minor(line.total_discount??'0')!==expectedLineDiscount(source))throw Error('CUSHION_PAID_ORDER_FINANCIAL_MISMATCH');
  }
}

/** Raw-body authentication precedes parsing. Standalone, closed-gate rehearsal
 * uses the same trusted snapshot verification as a future hosted receiver. */
export async function processCushionPaidOrder(
  raw: Uint8Array,
  signature: string | null,
  services: CushionPaidOrderServices,
) {
  if (
    services.secret.length < 32 ||
    !signature ||
    raw.length === 0 ||
    raw.length > 256000
  )
    throw new Error("CUSHION_WEBHOOK_INVALID");
  const expected = createHmac("sha256", services.secret).update(raw).digest();
  const received = Buffer.from(signature, "base64");
  if (
    received.length !== expected.length ||
    !timingSafeEqual(received, expected)
  )
    throw new Error("CUSHION_WEBHOOK_SIGNATURE_INVALID");
  const payload = JSON.parse(Buffer.from(raw).toString("utf8")) as {
    id: number;
    name: string;
    currency: string;
    financial_status: string;
    processed_at?: string;
    created_at?: string;
    line_items: PaidLine[];
  };
  if (
    !Number.isSafeInteger(payload.id) ||
    payload.id <= 0 ||
    typeof payload.name !== "string" ||
    payload.currency !== "GBP" ||
    payload.financial_status !== "paid" ||
    !Array.isArray(payload.line_items) ||
    !payload.line_items.length ||
    payload.line_items.length > 100
  )
    throw new Error("CUSHION_PAID_PAYLOAD_INVALID");
  const references: FulfilmentReference[] = [],
    packets: Record<string, unknown>[] = [];
  const snapshots = new Set<string>();
  const sets = new Map<
    string,
    { expected: Set<string>; received: Set<string> }
  >();
  for (const line of payload.line_items) {
    if (!Number.isSafeInteger(line.id) || line.quantity !== 1)
      throw new Error("CUSHION_PAID_LINE_INVALID");
    const properties = new Map(
      (line.properties ?? []).map((property) => [
        property.name,
        property.value,
      ]),
    );
    if (properties.size !== (line.properties ?? []).length)
      throw new Error("CUSHION_PAID_LINE_INVALID");
    const cushionId = properties.get("_curtainsuk_cushion_snapshot_id");
    if (cushionId) {
      if (
        properties.get("_curtainsuk_product_type") !== "CUSHION" ||
        snapshots.has(cushionId)
      )
        throw new Error("CUSHION_PAID_LINE_INVALID");
      const snapshot = await services.snapshot(cushionId);
      if (
        !snapshot ||
        snapshot.specSha256 !== specDigest(snapshot.spec) ||
        properties.get("_curtainsuk_cushion_spec_sha256") !==
          snapshot.specSha256
      )
        throw new Error("CUSHION_PAID_SNAPSHOT_MISMATCH");
      if (
        minor(line.price) !== snapshot.price.goodsGrossMinor ||
        minor(line.total_discount ?? "0") !== 0
      )
        throw new Error("CUSHION_PAID_AMOUNT_MISMATCH");
      const setId = snapshot.manufacturing.setQuoteId;
      const setSpecs = snapshot.manufacturing.setSpecs as
        | { id: string }[]
        | undefined;
      if (typeof setId !== "string" || !Array.isArray(setSpecs))
        throw new Error("CUSHION_PAID_SET_INVALID");
      const group = sets.get(setId) ?? {
        expected: new Set(setSpecs.map((spec) => spec.id)),
        received: new Set<string>(),
      };
      group.received.add(snapshot.spec.id);
      sets.set(setId, group);
      references.push({
        productType: "CUSHION",
        snapshotId: cushionId,
        lineId: String(line.id),
      });
      packets.push(cushionWorkroomPacket(snapshot));
      snapshots.add(cushionId);
    } else {
      const curtainId = properties.get("_curtainsuk_snapshot_id");
      if (!curtainId || snapshots.has(curtainId))
        throw new Error("CUSHION_PAID_LINE_INVALID");
      packets.push(await services.curtainPacket(curtainId, line));
      references.push({
        productType: "CURTAIN",
        snapshotId: curtainId,
        lineId: String(line.id),
      });
      snapshots.add(curtainId);
    }
  }
  for (const group of sets.values())
    if (
      group.expected.size !== group.received.size ||
      [...group.expected].some((id) => !group.received.has(id))
    )
      throw new Error("CUSHION_PAID_SET_INCOMPLETE");
  if (!references.some((reference) => reference.productType === "CUSHION"))
    throw new Error("CUSHION_PAID_ORDER_NOT_CUSHION");
  const orderGid = `gid://shopify/Order/${payload.id}`;
  const paidAt = payload.processed_at ?? payload.created_at;
  if (!paidAt || !Number.isFinite(Date.parse(paidAt)))
    throw new Error("CUSHION_PAID_TIMESTAMP_INVALID");
  const manifest = {
    version: 1,
    orderGid,
    orderName: payload.name,
    paidAt,
    groups: groupFulfilmentItems(references),
    packets,
  };
  const binding = await services.verifyOrder(payload, manifest);
  const verifiedManifest = { ...manifest, ...binding };
  return {
    ...(await services.record(orderGid, verifiedManifest)),
    manifest: verifiedManifest,
  };
}
