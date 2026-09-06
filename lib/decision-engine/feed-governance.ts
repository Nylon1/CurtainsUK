import type { DecisionOutcome, Money, PricingRuleSet } from "./types";

export interface FeedEligibilityInput {
  exactPrice: Money | null;
  landingPagePrice: Money | null;
  purchasable: boolean;
  shippingValid: boolean;
  requiredProductDataComplete: boolean;
  pricingOutcome: DecisionOutcome;
  pricingRuleSet: PricingRuleSet;
}

export interface FeedEligibilityDecision {
  eligible: boolean;
  reasons: string[];
}

export function evaluateGoogleFeedEligibility(input: FeedEligibilityInput): FeedEligibilityDecision {
  const reasons: string[] = [];
  if (!input.exactPrice) reasons.push("EXACT_PRICE_REQUIRED");
  if (input.exactPrice?.amountMinor === 0) reasons.push("ZERO_OR_PLACEHOLDER_PRICE");
  if (!input.landingPagePrice || input.landingPagePrice.amountMinor !== input.exactPrice?.amountMinor) reasons.push("LANDING_PAGE_PRICE_MISMATCH");
  if (!input.purchasable) reasons.push("PRODUCT_NOT_PURCHASABLE");
  if (!input.shippingValid) reasons.push("SHIPPING_NOT_VALID");
  if (!input.requiredProductDataComplete) reasons.push("PRODUCT_DATA_INCOMPLETE");
  if (input.pricingOutcome === "MANUAL_QUOTE") reasons.push("QUOTE_ONLY_PRODUCT");
  if (input.pricingRuleSet.lifecycle !== "ACTIVE") reasons.push("ACTIVE_PRICING_RULESET_REQUIRED");
  return { eligible: reasons.length === 0, reasons };
}
