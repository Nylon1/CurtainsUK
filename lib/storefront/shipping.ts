export const UK_SHIPPING_REGIONS = [
  "UK_MAINLAND",
  "HIGHLANDS_ISLANDS",
  "NORTHERN_IRELAND",
] as const;

export type UkShippingRegion = (typeof UK_SHIPPING_REGIONS)[number];
export type ShippingParcelClass = "STANDARD" | "OVERSIZE" | "SPECIALIST";

export function instantCurtainParcelClass(fabricWidths: number): ShippingParcelClass {
  if (!Number.isInteger(fabricWidths) || fabricWidths < 1) throw new Error("SHIPPING_CLASS_INPUT_INVALID");
  return fabricWidths > 6 ? "OVERSIZE" : "STANDARD";
}

export function approvedReviewParcelClass(value: unknown): ShippingParcelClass {
  if (value !== "STANDARD" && value !== "OVERSIZE" && value !== "SPECIALIST") {
    throw new Error("CHECKOUT_SHIPPING_CLASS_REQUIRES_APPROVAL");
  }
  return value;
}

export interface ShippingRule {
  region: UkShippingRegion;
  parcelClass: ShippingParcelClass;
  enabled: boolean;
  grossAmountMinor: number | null;
  currency: "GBP";
  status: "DRAFT" | "VALIDATED";
}

export interface ShippingQuote {
  region: UkShippingRegion;
  parcelClass: ShippingParcelClass;
  status: "READY" | "RATE_REQUIRES_CONFIRMATION" | "UNAVAILABLE";
  grossAmountMinor: number | null;
  currency: "GBP";
  shownSeparately: true;
  countsTowardGoodsMinimum: false;
  message: string;
}

/**
 * Launch geography only. Rates intentionally remain unknown until the operations
 * owner approves them; an unknown rate is never represented as free delivery.
 */
export const STAGING_UK_SHIPPING_RULES: readonly ShippingRule[] = UK_SHIPPING_REGIONS.flatMap((region) => (
  (["STANDARD", "OVERSIZE", "SPECIALIST"] as const).map((parcelClass) => ({
    region,
    parcelClass,
    enabled: true,
    grossAmountMinor: null,
    currency: "GBP" as const,
    status: "DRAFT" as const,
  }))
));

export function quoteUkShipping(input: {
  region: string;
  parcelClass: ShippingParcelClass;
  rules?: readonly ShippingRule[];
}): ShippingQuote {
  if (!UK_SHIPPING_REGIONS.includes(input.region as UkShippingRegion)) {
    throw new Error("INTERNATIONAL_SHIPPING_DISABLED");
  }
  const region = input.region as UkShippingRegion;
  const rule = (input.rules ?? STAGING_UK_SHIPPING_RULES).find(
    (candidate) => candidate.region === region && candidate.parcelClass === input.parcelClass,
  );
  if (!rule?.enabled) {
    return {
      region,
      parcelClass: input.parcelClass,
      status: "UNAVAILABLE",
      grossAmountMinor: null,
      currency: "GBP",
      shownSeparately: true,
      countsTowardGoodsMinimum: false,
      message: "Delivery is not available for this destination and parcel class",
    };
  }
  if (rule.status !== "VALIDATED" || rule.grossAmountMinor === null) {
    return {
      region,
      parcelClass: input.parcelClass,
      status: "RATE_REQUIRES_CONFIRMATION",
      grossAmountMinor: null,
      currency: "GBP",
      shownSeparately: true,
      countsTowardGoodsMinimum: false,
      message: "Delivery is shown separately and confirmed before checkout",
    };
  }
  if (!Number.isInteger(rule.grossAmountMinor) || rule.grossAmountMinor <= 0) {
    throw new Error("SHIPPING_RATE_INVALID");
  }
  return {
    region,
    parcelClass: input.parcelClass,
    status: "READY",
    grossAmountMinor: rule.grossAmountMinor,
    currency: "GBP",
    shownSeparately: true,
    countsTowardGoodsMinimum: false,
    message: "Delivery shown separately",
  };
}

export function orderAmounts(input: {
  goodsGrossAmountMinor: number;
  shipping: ShippingQuote;
  minimumGoodsAmountMinor: number | null;
}) {
  if (!Number.isInteger(input.goodsGrossAmountMinor) || input.goodsGrossAmountMinor <= 0) {
    throw new Error("GOODS_PRICE_INVALID");
  }
  if (input.minimumGoodsAmountMinor !== null
      && (!Number.isInteger(input.minimumGoodsAmountMinor) || input.minimumGoodsAmountMinor <= 0)) {
    throw new Error("GOODS_MINIMUM_INVALID");
  }
  const goodsMinimumSatisfied = input.minimumGoodsAmountMinor === null
    || input.goodsGrossAmountMinor >= input.minimumGoodsAmountMinor;
  const shippingAmountMinor = input.shipping.grossAmountMinor;
  return {
    goodsGrossAmountMinor: input.goodsGrossAmountMinor,
    shippingGrossAmountMinor: shippingAmountMinor,
    orderGrossAmountMinor: shippingAmountMinor === null
      ? null
      : input.goodsGrossAmountMinor + shippingAmountMinor,
    goodsMinimumBasisMinor: input.goodsGrossAmountMinor,
    goodsMinimumSatisfied,
    shippingCountsTowardGoodsMinimum: false as const,
  };
}
