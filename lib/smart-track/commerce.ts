import { randomUUID, createHash } from "node:crypto";
import { trackSpecificationDigest, type SmartTrackQuote } from "./pricing";
import { type SmartTrackSpec } from "./domain";
import type { TrackPackage } from "./package";
import {
  SHOPIFY_DRAFT_ORDER_API_VERSION,
  SHOPIFY_DRAFT_ORDER_REQUIRED_SCOPES,
  type ShopifyDraftOrderExecutionContract,
  type ShopifyDraftOrderInput,
} from "../storefront/shopify-draft-order-core";
export type SmartTrackSnapshot = {
  version: 1;
  productType: "SMART_TRACK";
  id: string;
  designId: string;
  spec: SmartTrackSpec;
  specSha256: string;
  package: Readonly<TrackPackage>;
  weight: SmartTrackQuote["weight"];
  customerApproved: true;
  quoteId: string;
  priceVersion: string;
  price: { currency: "GBP"; goodsGrossMinor: number; goodsVatMinor: number };
  dispatchCommitment: unknown;
  revalidatedAt: string;
};
export function createSmartTrackSnapshot(
  quote: SmartTrackQuote,
  designId: string,
  p: Readonly<TrackPackage>,
  dispatchCommitment: unknown,
): Readonly<SmartTrackSnapshot> {
  if (
    !quote.purchaseReady ||
    !quote.spec.measurementsConfirmed ||
    !dispatchCommitment
  )
    throw Error("TRACK_SNAPSHOT_NOT_READY");
  const snapshot: SmartTrackSnapshot = {
    version: 1,
    productType: "SMART_TRACK",
    id: randomUUID(),
    designId,
    spec: quote.spec,
    specSha256: trackSpecificationDigest(quote.spec),
    package: p,
    weight: quote.weight,
    customerApproved: true,
    quoteId: quote.quoteId,
    priceVersion: quote.priceVersion,
    price: {
      currency: "GBP",
      goodsGrossMinor: quote.goodsMinor,
      goodsVatMinor: quote.vatMinor,
    },
    dispatchCommitment,
    revalidatedAt: quote.quotedAt,
  };
  const clone = structuredClone(snapshot);
  const freeze = (v: unknown) => {
    if (v && typeof v === "object") {
      Object.values(v).forEach(freeze);
      Object.freeze(v);
    }
  };
  freeze(clone);
  return clone;
}
export function smartTrackLine(
  snapshot: Readonly<SmartTrackSnapshot>,
  now = new Date(),
): ShopifyDraftOrderInput["lineItems"][number] {
  if (
    snapshot.productType !== "SMART_TRACK" ||
    snapshot.version !== 1 ||
    snapshot.specSha256 !== trackSpecificationDigest(snapshot.spec) ||
    !snapshot.customerApproved ||
    !Number.isFinite(Date.parse(snapshot.revalidatedAt)) ||
    Date.parse(snapshot.revalidatedAt) > now.getTime() ||
    now.getTime() - Date.parse(snapshot.revalidatedAt) > 300000
  )
    throw Error("TRACK_SNAPSHOT_INVALID");
  const s = snapshot.spec;
  return {
    title: `${snapshot.package.motorModel} — ${s.lengthCm} cm (${s.quantity})`,
    quantity: 1,
    originalUnitPriceWithCurrency: {
      amount: (snapshot.price.goodsGrossMinor / 100).toFixed(2),
      currencyCode: "GBP",
    },
    requiresShipping: true,
    taxable: true,
    sku: `CUK-TRACK-${snapshot.id}`,
    customAttributes: [
      { key: "Product type", value: "Smart curtain track" },
      { key: "Track length", value: `${s.lengthCm} cm` },
      {
        key: "Heading",
        value:
          { PENCIL: "Pencil pleat", PINCH: "Pinch pleat", WAVE: "Wave" }[
            s.heading
          ] + (s.waveSpacingMm ? " · " + s.waveSpacingMm + " mm" : ""),
      },
      {
        key: "Opening",
        value:
          s.opening === "CENTRE"
            ? "Centre-opening pair"
            : "One-way, stack " + s.opening.toLowerCase(),
      },
      { key: "Mounting", value: s.mounting === "WALL" ? "Wall" : "Ceiling" },
      { key: "Motor side", value: `${s.motorSide} — inside facing window` },
      { key: "Track quantity", value: String(s.quantity) },
      {
        key: "Included",
        value: `${snapshot.package.motorModel}, ${snapshot.package.controller!.model}, all track hardware`,
      },
      { key: "_curtainsuk_product_type", value: "SMART_TRACK" },
      { key: "_curtainsuk_track_snapshot_id", value: snapshot.id },
      { key: "_curtainsuk_track_spec_sha256", value: snapshot.specSha256 },
      { key: "_curtainsuk_mtm_locked", value: "true" },
    ],
  };
}
/** Reuses the existing checked custom-order transport and total reconciliation. */
export function buildSmartTrackOrder(input: {
  snapshots: readonly Readonly<SmartTrackSnapshot>[];
  base?: ShopifyDraftOrderExecutionContract;
  key: string;
  reviewId: string;
  shipping: {
    grossMinor: number;
    vatMinor: number;
    title: string;
    postcode: string;
  };
  production: boolean;
  now?: Date;
}): ShopifyDraftOrderExecutionContract {
  if (
    !input.snapshots.length ||
    input.snapshots.length > 32 ||
    !/^[A-Za-z0-9-]{8,100}$/.test(input.key) ||
    !/^[a-f0-9]{64}$/.test(input.reviewId)
  )
    throw Error("TRACK_CHECKOUT_INVALID");
  const lines = input.snapshots.map((s) => smartTrackLine(s, input.now));
  if ((input.base?.input.lineItems.length ?? 0) + lines.length > 100)
    throw Error("TRACK_ORDER_TOO_LARGE");
  const goodsGrossAmountMinor =
    (input.base?.expected.goodsGrossAmountMinor ?? 0) +
    input.snapshots.reduce((n, s) => n + s.price.goodsGrossMinor, 0);
  const goodsVatAmountMinor =
    (input.base?.expected.goodsVatAmountMinor ?? 0) +
    input.snapshots.reduce((n, s) => n + s.price.goodsVatMinor, 0);
  const tag = `CUK_TRACK_${createHash("sha256")
    .update(input.reviewId + ":" + input.key)
    .digest("hex")
    .slice(0, 30)}`;
  return {
    apiVersion: SHOPIFY_DRAFT_ORDER_API_VERSION,
    requiredScopes: SHOPIFY_DRAFT_ORDER_REQUIRED_SCOPES,
    environment: input.production ? "PRODUCTION" : "STAGING",
    paymentEnabled: input.production,
    completionMutationAllowed: false,
    invoiceSendAllowed: false,
    idempotencyTag: tag,
    expected: {
      currency: "GBP",
      goodsGrossAmountMinor,
      goodsVatAmountMinor,
      shippingGrossAmountMinor: input.shipping.grossMinor,
      shippingVatAmountMinor: input.shipping.vatMinor,
      orderGrossAmountMinor: goodsGrossAmountMinor + input.shipping.grossMinor,
      orderVatAmountMinor: goodsVatAmountMinor + input.shipping.vatMinor,
    },
    input: {
      acceptAutomaticDiscounts: false,
      allowDiscountCodesInCheckout: false,
      presentmentCurrencyCode: "GBP",
      taxExempt: false,
      lineItems: [...(input.base?.input.lineItems ?? []), ...lines],
      shippingAddress: { countryCode: "GB", zip: input.shipping.postcode },
      shippingLine: {
        title: input.shipping.title,
        priceWithCurrency: {
          amount: (input.shipping.grossMinor / 100).toFixed(2),
          currencyCode: "GBP",
        },
      },
      note: "CurtainsUK Design My Home. Hold all products together. Use each distinct immutable fulfilment snapshot after staff review.",
      tags: [
        ...(input.production
          ? ["CURTAINSUK_PRODUCTION"]
          : ["CURTAINSUK_STAGING", "DO_NOT_FULFIL", "NO_REAL_PAYMENT"]),
        "CURTAINSUK_SMART_TRACK",
        tag,
      ],
      customAttributes: [
        ...(input.base?.input.customAttributes ?? []).filter(
          (a) =>
            ![
              "curtainsuk_product_types",
              "curtainsuk_my_home_review_id",
            ].includes(a.key),
        ),
        {
          key: "curtainsuk_product_types",
          value: [
            ...new Set([
              ...(input.base?.input.customAttributes
                .find((a) => a.key === "curtainsuk_product_types")
                ?.value.split(",") ?? (input.base ? ["CURTAIN"] : [])),
              "SMART_TRACK",
            ]),
          ].join(","),
        },
        { key: "curtainsuk_track_checkout_key", value: input.key },
        { key: "curtainsuk_my_home_review_id", value: input.reviewId },
        { key: "curtainsuk_hold_together", value: "true" },
      ],
    },
  };
}
