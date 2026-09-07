import type { DecisionOutcome } from "@/lib/decision-engine/types";
import type { PublicSupplierAvailability } from "@/lib/supplier-intelligence/types";
import type { ReviewState } from "./review-workflow";
import type { ShippingQuote } from "./shipping";

export type CheckoutBlocker =
  | "PRICE_INVALID"
  | "FABRIC_NOT_PRICING_ELIGIBLE"
  | "TECHNICAL_CONFIGURATION_INVALID"
  | "AVAILABILITY_NOT_ACCEPTABLE"
  | "REVIEW_NOT_READY"
  | "CUSTOMER_ACCEPTANCE_REQUIRED"
  | "SHIPPING_NOT_READY";

export interface CheckoutGateInput {
  outcome: DecisionOutcome;
  price: {
    netAmountMinor: number | null;
    vatAmountMinor: number | null;
    grossAmountMinor: number | null;
    vatRateBasisPoints: number | null;
    currency: "GBP";
  };
  fabricPricingEligible: boolean;
  technicallyValid: boolean;
  availability: PublicSupplierAvailability;
  reviewState: ReviewState | null;
  customerAccepted: boolean;
  shipping: ShippingQuote;
}

export interface CheckoutGateDecision {
  eligible: boolean;
  action: "STAGING_CHECKOUT_HANDOFF" | "SUBMIT_FOR_REVIEW" | "SUBMIT_PROJECT" | "BLOCKED";
  blockers: readonly CheckoutBlocker[];
  numericPriceMayBeShown: boolean;
  paymentEnabled: false;
}

const ACCEPTABLE_CHECKOUT_AVAILABILITY = new Set<PublicSupplierAvailability>([
  "FABRIC_AVAILABLE",
  "LIMITED_AVAILABILITY",
]);

/** Locked UK launch VAT rate. It is carried into every immutable retail snapshot. */
export const CURTAINSUK_RETAIL_VAT_RATE_BASIS_POINTS = 2_000;

/**
 * Allocates the final, already-rounded VAT-inclusive customer total between
 * net and VAT in whole pennies. This preserves the commercial rule that only
 * the final retail total is rounded while keeping the stored tax arithmetic
 * exact and auditable.
 */
export function allocateVatInclusiveRetailTotal(
  grossAmountMinor: number,
  vatRateBasisPoints = CURTAINSUK_RETAIL_VAT_RATE_BASIS_POINTS,
) {
  if (!Number.isSafeInteger(grossAmountMinor) || grossAmountMinor <= 0 || grossAmountMinor % 100 !== 0) {
    throw new Error("CHECKOUT_FINAL_ROUNDING_INVALID");
  }
  if (!Number.isSafeInteger(vatRateBasisPoints) || vatRateBasisPoints < 0 || vatRateBasisPoints > 10_000) {
    throw new Error("CHECKOUT_VAT_RATE_INVALID");
  }
  const netAmountMinor = Math.round(
    grossAmountMinor * 10_000 / (10_000 + vatRateBasisPoints),
  );
  return Object.freeze({
    netAmountMinor,
    vatAmountMinor: grossAmountMinor - netAmountMinor,
    grossAmountMinor,
    vatRateBasisPoints,
    currency: "GBP" as const,
  });
}

function validPrice(price: CheckoutGateInput["price"]) {
  if (![price.netAmountMinor, price.vatAmountMinor, price.grossAmountMinor, price.vatRateBasisPoints].every(Number.isSafeInteger)
      || (price.netAmountMinor ?? 0) <= 0
      || (price.vatAmountMinor ?? -1) < 0
      || price.netAmountMinor! + price.vatAmountMinor! !== price.grossAmountMinor!) {
    return false;
  }
  if ((price.grossAmountMinor ?? 0) <= 0 || price.grossAmountMinor! % 100 !== 0) return false;
  try {
    const allocation = allocateVatInclusiveRetailTotal(price.grossAmountMinor!, price.vatRateBasisPoints!);
    return allocation.netAmountMinor === price.netAmountMinor
      && allocation.vatAmountMinor === price.vatAmountMinor;
  } catch {
    return false;
  }
}

export function evaluateCheckoutGate(input: CheckoutGateInput): CheckoutGateDecision {
  const blockers: CheckoutBlocker[] = [];
  const routePriceValid = validPrice(input.price);
  const reviewReady = input.reviewState === "READY_FOR_CHECKOUT";

  if (!routePriceValid) blockers.push("PRICE_INVALID");
  if (!input.fabricPricingEligible) blockers.push("FABRIC_NOT_PRICING_ELIGIBLE");
  if (!input.technicallyValid) blockers.push("TECHNICAL_CONFIGURATION_INVALID");
  if (!ACCEPTABLE_CHECKOUT_AVAILABILITY.has(input.availability)) blockers.push("AVAILABILITY_NOT_ACCEPTABLE");
  if (input.outcome !== "INSTANT_PRICE" && !reviewReady) blockers.push("REVIEW_NOT_READY");
  if (input.outcome !== "INSTANT_PRICE" && !input.customerAccepted) blockers.push("CUSTOMER_ACCEPTANCE_REQUIRED");
  if (input.shipping.status !== "READY") blockers.push("SHIPPING_NOT_READY");

  if (input.outcome === "PRICE_WITH_REVIEW" && !reviewReady) {
    return { eligible: false, action: "SUBMIT_FOR_REVIEW", blockers, numericPriceMayBeShown: routePriceValid, paymentEnabled: false };
  }
  if (input.outcome === "MANUAL_QUOTE" && !reviewReady) {
    return { eligible: false, action: "SUBMIT_PROJECT", blockers, numericPriceMayBeShown: false, paymentEnabled: false };
  }
  return {
    eligible: blockers.length === 0,
    action: blockers.length === 0 ? "STAGING_CHECKOUT_HANDOFF" : "BLOCKED",
    blockers,
    numericPriceMayBeShown: input.outcome !== "MANUAL_QUOTE" || reviewReady,
    paymentEnabled: false,
  };
}

export interface ImmutableConfigurationSnapshot {
  snapshotId: string;
  configurationId: string;
  reviewRequestId: string | null;
  reviewRevisionId: string | null;
  outcome: DecisionOutcome;
  windowType: string;
  measurements: Readonly<Record<string, unknown>>;
  fabricMasterId: string;
  supplierSku: string;
  heading: string;
  lining: string;
  construction: "PAIR" | "SINGLE";
  calculatedFabricMetres: number;
  pricingRuleVersion: string;
  customerPrice: Readonly<{
    netAmountMinor: number;
    vatAmountMinor: number;
    grossAmountMinor: number;
    vatRateBasisPoints: number;
    currency: "GBP";
  }>;
  availability: PublicSupplierAvailability;
  shipping: Readonly<ShippingQuote>;
  customerAcceptedAt: string;
  recordedAt: string;
}

const PRIVATE_KEY_PATTERN = /(^|_)(supplier_?cost|standard_?trade_?price|cut_?trade_?price|gross_?margin|raw_?stock|batch_?reference|dye_?lot)($|_)/i;

function assertCustomerSafe(value: unknown, path = "snapshot") {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (PRIVATE_KEY_PATTERN.test(key)) throw new Error(`CHECKOUT_PRIVATE_FIELD:${path}.${key}`);
    assertCustomerSafe(child, `${path}.${key}`);
  }
}

function immutableClone<T>(value: T): Readonly<T> {
  const clone = structuredClone(value);
  const freeze = (item: unknown): void => {
    if (!item || typeof item !== "object" || Object.isFrozen(item)) return;
    for (const child of Object.values(item)) freeze(child);
    Object.freeze(item);
  };
  freeze(clone);
  return clone;
}

export function createImmutableConfigurationSnapshot(input: Omit<ImmutableConfigurationSnapshot, "customerPrice"> & {
  customerPrice: ImmutableConfigurationSnapshot["customerPrice"];
  gate: CheckoutGateDecision;
}): Readonly<ImmutableConfigurationSnapshot> {
  if (!input.gate.eligible || input.gate.action !== "STAGING_CHECKOUT_HANDOFF") {
    throw new Error("CHECKOUT_GATE_NOT_SATISFIED");
  }
  if (input.outcome !== "INSTANT_PRICE" && (!input.reviewRequestId || !input.reviewRevisionId)) {
    throw new Error("CHECKOUT_APPROVAL_REFERENCE_REQUIRED");
  }
  if (input.outcome === "INSTANT_PRICE" && (input.reviewRequestId || input.reviewRevisionId)) {
    throw new Error("CHECKOUT_UNEXPECTED_REVIEW_REFERENCE");
  }
  if (!input.pricingRuleVersion.trim() || input.calculatedFabricMetres <= 0) {
    throw new Error("CHECKOUT_SNAPSHOT_INVALID");
  }
  if (!Number.isFinite(Date.parse(input.recordedAt)) || !Number.isFinite(Date.parse(input.customerAcceptedAt))) {
    throw new Error("CHECKOUT_SNAPSHOT_TIMESTAMP_INVALID");
  }
  const { gate: _gate, ...snapshot } = input;
  void _gate;
  assertCustomerSafe(snapshot);
  return immutableClone(snapshot);
}

export interface StagingCheckoutHandoff {
  handoffId: string;
  snapshot: Readonly<ImmutableConfigurationSnapshot>;
  mode: "SHOPIFY_DRAFT_ORDER_EXACT_PRICE";
  environment: "STAGING";
  paymentEnabled: false;
  shopifyWritePerformed: false;
  checkoutUrl: null;
  goodsPriceGrossAmountMinor: number;
  shippingGrossAmountMinor: number;
  currency: "GBP";
  preparedAt: string;
}

export function prepareStagingCheckoutHandoff(input: {
  handoffId: string;
  snapshot: Readonly<ImmutableConfigurationSnapshot>;
  preparedAt: string;
}): Readonly<StagingCheckoutHandoff> {
  if (!Number.isFinite(Date.parse(input.preparedAt))) throw new Error("CHECKOUT_HANDOFF_TIMESTAMP_INVALID");
  if (input.snapshot.shipping.status !== "READY" || input.snapshot.shipping.grossAmountMinor === null) {
    throw new Error("CHECKOUT_SHIPPING_NOT_READY");
  }
  const handoff: StagingCheckoutHandoff = {
    handoffId: input.handoffId,
    snapshot: input.snapshot,
    mode: "SHOPIFY_DRAFT_ORDER_EXACT_PRICE",
    environment: "STAGING",
    paymentEnabled: false,
    shopifyWritePerformed: false,
    checkoutUrl: null,
    goodsPriceGrossAmountMinor: input.snapshot.customerPrice.grossAmountMinor,
    shippingGrossAmountMinor: input.snapshot.shipping.grossAmountMinor,
    currency: "GBP",
    preparedAt: input.preparedAt,
  };
  assertCustomerSafe(handoff);
  return immutableClone(handoff);
}
