export const UK_SHIPPING_REGIONS = [
  "UK_MAINLAND",
  "HIGHLANDS_ISLANDS",
  "NORTHERN_IRELAND",
] as const;

export type UkShippingRegion = (typeof UK_SHIPPING_REGIONS)[number];
export type ShippingParcelClass = "STANDARD" | "LARGE" | "OVERSIZE" | "SPECIALIST";

export function instantCurtainParcelClass(fabricWidths: number): ShippingParcelClass {
  if (!Number.isInteger(fabricWidths) || fabricWidths < 1) throw new Error("SHIPPING_CLASS_INPUT_INVALID");
  return fabricWidths > 6 ? "OVERSIZE" : "STANDARD";
}

export function approvedReviewParcelClass(value: unknown): ShippingParcelClass {
  if (value !== "STANDARD" && value !== "LARGE" && value !== "OVERSIZE" && value !== "SPECIALIST") {
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
  status: "AWAITING_OWNER_CONFIRMATION" | "VALIDATED" | "RETIRED";
  rateVersionId?: string;
  effectiveFrom?: string;
}

export interface ShippingQuote {
  postcode?: string;
  policyVersion?: string;
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
  (["STANDARD", "LARGE", "OVERSIZE"] as const).map((parcelClass) => ({
    region,
    parcelClass,
    enabled: true,
    grossAmountMinor: null,
    currency: "GBP" as const,
    status: "AWAITING_OWNER_CONFIRMATION" as const,
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
  // Legacy Specialist history is never an automatic delivery rate.
  if (input.parcelClass === "SPECIALIST") return {
    region, parcelClass: input.parcelClass, status: "RATE_REQUIRES_CONFIRMATION",
    grossAmountMinor: null, currency: "GBP", shownSeparately: true,
    countsTowardGoodsMinimum: false, message: "Specialist delivery requires a staff-approved manual quote",
  };
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

export interface ShippingRateVersionRecord {
  rate_version_id: string;
  region: string;
  parcel_class: string;
  gross_amount_minor: number | null;
  currency: string;
  status: string;
  effective_from: string;
  created_at: string;
}

export function shippingRuleFromVersion(record: ShippingRateVersionRecord): ShippingRule {
  if (!UK_SHIPPING_REGIONS.includes(record.region as UkShippingRegion)
    || !["STANDARD", "LARGE", "OVERSIZE", "SPECIALIST"].includes(record.parcel_class)
    || record.currency !== "GBP"
    || !["AWAITING_OWNER_CONFIRMATION", "VALIDATED", "RETIRED"].includes(record.status)
    || !record.rate_version_id
    || Number.isNaN(new Date(record.effective_from).getTime())) {
    throw new Error("SHIPPING_RATE_RECORD_INVALID");
  }
  const amount = record.gross_amount_minor;
  if (record.status === "VALIDATED"
    ? !Number.isInteger(amount) || amount === null || amount <= 0
    : amount !== null) {
    throw new Error("SHIPPING_RATE_RECORD_INVALID");
  }
  return {
    region: record.region as UkShippingRegion,
    parcelClass: record.parcel_class as ShippingParcelClass,
    enabled: record.status !== "RETIRED",
    grossAmountMinor: amount,
    currency: "GBP",
    status: record.status as ShippingRule["status"],
    rateVersionId: record.rate_version_id,
    effectiveFrom: record.effective_from,
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
