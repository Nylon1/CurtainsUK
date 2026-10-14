import {
  SHOPIFY_DRAFT_ORDER_API_VERSION,
  SHOPIFY_DRAFT_ORDER_REQUIRED_SCOPES,
  type ShopifyDraftOrderExecutionContract,
  type ShopifyDraftOrderInput,
} from "../storefront/shopify-draft-order-core";
import { specDigest, type CushionOrderSnapshot } from "./repository";
import type { CushionQuote } from "./pricing";

/** Whitelist future customer responses. Never serialize internal rates/costs. */
export function customerCushionQuote(quote: CushionQuote) {
  return {
    version: 1,
    quoteId: quote.quoteId,
    currency: quote.currency,
    specs: quote.specs,
    totalMinor: quote.ready ? quote.totalMinor : null,
    deliveryGrossMinor: quote.deliveryGrossMinor,
    ready: quote.ready,
    status: quote.status,
    items: quote.items.map((item) => ({
      specId: item.specId,
      quantity: item.quantity,
      goodsGrossMinor: quote.ready ? item.goodsGrossMinor : null,
    })),
    previewMaterials: quote.previewMaterials,
    message: quote.ready
      ? "Your cushion price is ready."
      : "This cushion needs a manufacturing or price review before ordering.",
  };
}

export type FulfilmentReference = {
  productType: "CURTAIN" | "CUSHION";
  snapshotId: string;
  lineId: string;
};

/** Manufacturing streams retain distinct snapshot schemas in a shared checkout. */
export function groupFulfilmentItems(items: FulfilmentReference[]) {
  if (
    items.some(
      (item) =>
        !["CURTAIN", "CUSHION"].includes(item.productType) ||
        !item.snapshotId ||
        !item.lineId,
    )
  )
    throw new Error("FULFILMENT_REFERENCE_INVALID");
  if (new Set(items.map((item) => item.lineId)).size !== items.length)
    throw new Error("FULFILMENT_LINE_DUPLICATED");
  return {
    curtains: items.filter((item) => item.productType === "CURTAIN"),
    cushions: items.filter((item) => item.productType === "CUSHION"),
  };
}

function money(minor: number) {
  if (!Number.isSafeInteger(minor) || minor < 0)
    throw new Error("CUSHION_MONEY_INVALID");
  return { amount: (minor / 100).toFixed(2), currencyCode: "GBP" as const };
}

export function cushionDraftLine(
  snapshot: CushionOrderSnapshot,
  now = new Date(),
): ShopifyDraftOrderInput["lineItems"][number] {
  const checkedAt = Date.parse(snapshot.revalidatedAt);
  if (
    snapshot.productType !== "CUSHION" ||
    snapshot.version !== 1 ||
    snapshot.specSha256 !== specDigest(snapshot.spec)
  )
    throw new Error("CUSHION_SNAPSHOT_INVALID");
  if (
    !Number.isFinite(checkedAt) ||
    checkedAt > now.getTime() ||
    now.getTime() - checkedAt > 5 * 60 * 1000
  )
    throw new Error("CUSHION_REVALIDATION_REQUIRED");
  if (
    snapshot.price.currency !== "GBP" ||
    snapshot.price.goodsGrossMinor <= 0 ||
    snapshot.price.goodsVatMinor < 0 ||
    snapshot.price.goodsVatMinor > snapshot.price.goodsGrossMinor
  )
    throw new Error("CUSHION_PRICE_INVALID");
  // One custom line represents this entire validated quantity. Shopify cannot
  // multiply a nested set's price by a mutable cart quantity.
  return {
    title: `Cushion — ${snapshot.fabricIdentity.design} ${snapshot.fabricIdentity.colour} (${snapshot.spec.quantity})`,
    quantity: 1,
    originalUnitPriceWithCurrency: money(snapshot.price.goodsGrossMinor),
    requiresShipping: true,
    taxable: true,
    sku: `CUK-CUSHION-${snapshot.id}`,
    customAttributes: [
      { key: "Product type", value: "CUSHION" },
      { key: "Fabric", value: snapshot.fabricIdentity.id },
      { key: "Size", value: snapshot.spec.sizeId },
      { key: "Filling", value: snapshot.spec.filling },
      { key: "Edge", value: snapshot.spec.edge },
      { key: "Cushion quantity", value: String(snapshot.spec.quantity) },
      { key: "_curtainsuk_product_type", value: "CUSHION" },
      { key: "_curtainsuk_cushion_snapshot_id", value: snapshot.id },
      { key: "_curtainsuk_cushion_spec_sha256", value: snapshot.specSha256 },
      { key: "_curtainsuk_mtm_locked", value: "true" },
    ],
  };
}

/** Pure adapter to existing checked custom-price transport. No Shopify write. */
export function buildCushionDraftContract(input: {
  snapshots: CushionOrderSnapshot[];
  idempotencyKey: string;
  shipping: { grossMinor: number; vatMinor: number; title: string };
  now?: Date;
}): ShopifyDraftOrderExecutionContract {
  if (
    !input.snapshots.length ||
    input.snapshots.length > 32 ||
    !/^[a-zA-Z0-9-]{8,100}$/.test(input.idempotencyKey)
  )
    throw new Error("CUSHION_CHECKOUT_INPUT_INVALID");
  if (
    new Set(input.snapshots.map((snapshot) => snapshot.id)).size !==
    input.snapshots.length
  )
    throw new Error("CUSHION_SNAPSHOT_DUPLICATED");
  money(input.shipping.vatMinor);
  if (input.shipping.vatMinor > input.shipping.grossMinor)
    throw new Error("CUSHION_SHIPPING_INVALID");
  const lines = input.snapshots.map((snapshot) =>
    cushionDraftLine(snapshot, input.now),
  );
  const goodsGross = input.snapshots.reduce(
    (sum, snapshot) => sum + snapshot.price.goodsGrossMinor,
    0,
  );
  const goodsVat = input.snapshots.reduce(
    (sum, snapshot) => sum + snapshot.price.goodsVatMinor,
    0,
  );
  money(goodsGross);
  money(goodsVat);
  const tag = `cushion-studio-${input.idempotencyKey}`;
  return {
    apiVersion: SHOPIFY_DRAFT_ORDER_API_VERSION,
    environment: "STAGING",
    idempotencyTag: tag,
    requiredScopes: SHOPIFY_DRAFT_ORDER_REQUIRED_SCOPES,
    paymentEnabled: false,
    completionMutationAllowed: false,
    invoiceSendAllowed: false,
    input: {
      acceptAutomaticDiscounts: false,
      allowDiscountCodesInCheckout: false,
      customAttributes: [
        { key: "curtainsuk_product_types", value: "CUSHION" },
        { key: "curtainsuk_cushion_checkout_key", value: input.idempotencyKey },
        {
          key: "curtainsuk_cushion_snapshot_ids",
          value: input.snapshots.map((snapshot) => snapshot.id).join(","),
        },
      ],
      lineItems: lines,
      note: "Cushion Studio local review. No payment or fulfilment authorised.",
      presentmentCurrencyCode: "GBP",
      shippingLine: {
        title: input.shipping.title,
        priceWithCurrency: money(input.shipping.grossMinor),
      },
      shippingAddress: { countryCode: "GB" },
      tags: [
        "CURTAINSUK_STAGING",
        "DO_NOT_FULFIL",
        "NO_REAL_PAYMENT",
        "CURTAINSUK_CUSHION_REVIEW",
        tag,
      ],
      taxExempt: false,
    },
    expected: {
      currency: "GBP",
      goodsGrossAmountMinor: goodsGross,
      goodsVatAmountMinor: goodsVat,
      shippingGrossAmountMinor: input.shipping.grossMinor,
      shippingVatAmountMinor: input.shipping.vatMinor,
      orderGrossAmountMinor: goodsGross + input.shipping.grossMinor,
      orderVatAmountMinor: goodsVat + input.shipping.vatMinor,
    },
  };
}

/** Caller must revalidate every original curtain and cushion contract before merging. */
export function buildMixedDraftContract(input: {
  curtain: ShopifyDraftOrderExecutionContract;
  cushion: ShopifyDraftOrderExecutionContract;
  idempotencyKey: string;
  shipping: { grossMinor: number; vatMinor: number; title: string };
}): ShopifyDraftOrderExecutionContract {
  if (
    input.curtain.environment !== "STAGING" ||
    input.cushion.environment !== "STAGING" ||
    !/^[a-zA-Z0-9-]{8,100}$/.test(input.idempotencyKey)
  )
    throw new Error("MIXED_CHECKOUT_REVIEW_ONLY");
  money(input.shipping.grossMinor);
  money(input.shipping.vatMinor);
  if (input.shipping.vatMinor > input.shipping.grossMinor)
    throw new Error("CUSHION_SHIPPING_INVALID");
  const goodsGross =
    input.curtain.expected.goodsGrossAmountMinor +
    input.cushion.expected.goodsGrossAmountMinor;
  const goodsVat =
    input.curtain.expected.goodsVatAmountMinor +
    input.cushion.expected.goodsVatAmountMinor;
  money(goodsGross);
  money(goodsVat);
  const tag = `mixed-studio-${input.idempotencyKey}`;
  return {
    ...input.cushion,
    idempotencyTag: tag,
    paymentEnabled: false,
    input: {
      ...input.cushion.input,
      lineItems: [
        ...input.curtain.input.lineItems,
        ...input.cushion.input.lineItems,
      ],
      customAttributes: [
        ...input.curtain.input.customAttributes,
        ...input.cushion.input.customAttributes.filter(
          (attribute) => attribute.key !== "curtainsuk_product_types",
        ),
        { key: "curtainsuk_product_types", value: "CURTAIN,CUSHION" },
      ],
      shippingLine: {
        title: input.shipping.title,
        priceWithCurrency: money(input.shipping.grossMinor),
      },
      tags: [
        "CURTAINSUK_STAGING",
        "DO_NOT_FULFIL",
        "NO_REAL_PAYMENT",
        "CURTAINSUK_MIXED_REVIEW",
        tag,
      ],
    },
    expected: {
      currency: "GBP",
      goodsGrossAmountMinor: goodsGross,
      goodsVatAmountMinor: goodsVat,
      shippingGrossAmountMinor: input.shipping.grossMinor,
      shippingVatAmountMinor: input.shipping.vatMinor,
      orderGrossAmountMinor: goodsGross + input.shipping.grossMinor,
      orderVatAmountMinor: goodsVat + input.shipping.vatMinor,
    },
  };
}
