import type { DecisionRegistry, PricingRuleSet, RuleImplementationStatus } from "../types";
import { DRAFT_PRICING_RULE_SET } from "./pricing-rules";
import { PHASE_2_DECISION_REGISTRY } from "./decision-registry";

const VERSION = "3.0.0-production.1";
const EFFECTIVE_FROM = "2026-09-20";

function locked<T>(decisionId: string, value: T) {
  return { decisionId, status: "LOCKED" as const, value };
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

/**
 * Immutable launch rules. This is intentionally derived from, rather than
 * modifying, the historical calibration ruleset.
 */
export const MTM_PRODUCTION_DECISION_REGISTRY: DecisionRegistry = Object.freeze({
  registryVersion: VERSION,
  lastChangedDate: EFFECTIVE_FROM,
  decisions: PHASE_2_DECISION_REGISTRY.decisions.map((record) => ({
    ...record,
    status: "LOCKED" as RuleImplementationStatus,
    blocksProductionActivation: false,
    effectiveVersion: VERSION,
    lastChangedDate: EFFECTIVE_FROM,
    rationale: record.decisionId === "PATTERN_HALF_DROP" || record.decisionId === "PATTERN_CENTRING_JOINING"
      ? "Unsupported pattern handling remains review-only; it cannot enter the automated payable route."
      : record.rationale,
  })),
});

const base = clone(DRAFT_PRICING_RULE_SET);

for (const heading of ["PENCIL_PLEAT", "WAVE", "DOUBLE_PINCH", "EYELET"] as const) {
  const rule = base.headingRules[heading]!;
  rule.fullnessFactor = locked(`HEADING_FULLNESS_${heading}`, rule.fullnessFactor.value!);
  // Voile-specific consumption has not been approved for automated payment.
  rule.voileFullnessFactor = { decisionId: `VOILE_FULLNESS_${heading}`, status: "DRAFT", value: null };
  rule.priceFactor = locked(`HEADING_PRICE_FACTOR_${heading}`, rule.priceFactor.value!);
}

// Eyelet is pole-only but follows Double Pinch for both consumption and making.
base.headingRules.EYELET = {
  ...base.headingRules.DOUBLE_PINCH!,
  fullnessFactor: locked("HEADING_FULLNESS_EYELET", base.headingRules.DOUBLE_PINCH!.fullnessFactor.value!),
  priceFactor: locked("HEADING_PRICE_FACTOR_EYELET", base.headingRules.DOUBLE_PINCH!.priceFactor.value!),
  voileFullnessFactor: { decisionId: "VOILE_FULLNESS_EYELET", status: "DRAFT", value: null },
  overrides: [],
};

// These headings are excluded by the server compatibility policy.
base.headingRules.TRIPLE_PINCH = null;
base.headingRules.TAB_TOP = null;

base.constructionAllowances = {
  topAllowanceMm: locked("TOP_ALLOWANCE", base.constructionAllowances.topAllowanceMm.value!),
  bottomHemAllowanceMm: locked("BOTTOM_HEM_ALLOWANCE", base.constructionAllowances.bottomHemAllowanceMm.value!),
  centreOverlapMm: locked("CENTRE_OVERLAP", base.constructionAllowances.centreOverlapMm.value!),
  leftReturnMm: locked("LEFT_RETURN", base.constructionAllowances.leftReturnMm.value!),
  rightReturnMm: locked("RIGHT_RETURN", base.constructionAllowances.rightReturnMm.value!),
};
base.pairSingleConstruction = locked("PAIR_SINGLE_ALLOCATION", "BALANCED_WHOLE_WIDTHS");
base.patternRules = {
  ...base.patternRules,
  randomMatch: locked("PATTERN_RANDOM_MATCH", "CUT_LENGTH_EQUALS_DROP_PLUS_ALLOWANCES"),
  straightMatch: locked("PATTERN_STRAIGHT_MATCH", "ROUND_UP_TO_COMPLETE_VERTICAL_REPEAT"),
};
base.patternMatchLabourNetPerWidth = null;
base.liningRules = Object.fromEntries(Object.entries(base.liningRules).map(([key, rule]) => [key, {
  ...rule,
  usableWidthMm: rule.usableWidthMm,
  topAllowanceMm: rule.topAllowanceMm,
  bottomAllowanceMm: rule.bottomAllowanceMm,
}])) as PricingRuleSet["liningRules"];
base.interliningRules = Object.fromEntries(Object.entries(base.interliningRules).map(([key, rule]) => [key, {
  ...rule,
  usableWidthMm: rule.usableWidthMm,
  topAllowanceMm: rule.topAllowanceMm,
  bottomAllowanceMm: rule.bottomAllowanceMm,
}])) as PricingRuleSet["interliningRules"];
base.minimumOrders = {
  ...base.minimumOrders,
  standardMtmGross: { amountMinor: 0, currency: "GBP" },
  premiumInterlinedGross: { amountMinor: 0, currency: "GBP" },
  specialistReviewedGross: { amountMinor: 0, currency: "GBP" },
};
// Accessories are outside the automated MTM checkout scope for this release.
base.accessories = [];
base.packagingRules = base.packagingRules.map((rule) => ({
  ...rule,
  internalCostNet: { amountMinor: 0, currency: "GBP" },
  chargeToCustomer: false,
}));
base.shippingZones = base.shippingZones.map((zone) => zone.code === "UK_MAINLAND"
  ? { ...zone, rateNet: { amountMinor: 0, currency: "GBP" } }
  : zone);
base.measurementValidation = {
  ...base.measurementValidation,
  minimumWidthCm: 30,
  maximumWidthCm: 1200,
  minimumDropCm: 30,
  maximumDropCm: 600,
  suspiciousLikelyMillimetresAtCm: 1000,
};

export const MTM_PRODUCTION_PRICING_RULE_SET: PricingRuleSet = Object.freeze({
  ...base,
  id: "curtainsuk-pricing-v1-production",
  version: VERSION,
  lifecycle: "ACTIVE",
  effectiveFrom: EFFECTIVE_FROM,
  effectiveTo: null,
  supersedesVersion: DRAFT_PRICING_RULE_SET.version,
  decisionRegistryVersion: MTM_PRODUCTION_DECISION_REGISTRY.registryVersion,
});
