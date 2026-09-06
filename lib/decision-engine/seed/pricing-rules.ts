import type { ComplexityRuleSet, PricingRuleSet } from "../types";

const unresolvedHeadingRule = (fullnessFactor: number | null = null) =>
  fullnessFactor === null
    ? null
    : {
        fullnessFactor,
        headingAllowanceMm: 0,
        labourPerWidth: null,
      };

/**
 * Draft-only seed. Commercial figures intentionally remain unresolved. The
 * engine refuses to quote from a rule set containing required null values.
 */
export const DRAFT_PRICING_RULE_SET: PricingRuleSet = {
  id: "curtainsuk-standard-draft-v1",
  version: "1.0.0-draft.1",
  status: "DRAFT",
  currency: "GBP",
  effectiveFrom: null,
  effectiveTo: null,
  supersedesVersion: null,
  headingRules: {
    WAVE: unresolvedHeadingRule(),
    PENCIL_PLEAT: unresolvedHeadingRule(),
    DOUBLE_PINCH: unresolvedHeadingRule(),
    TRIPLE_PINCH: unresolvedHeadingRule(),
    EYELET: unresolvedHeadingRule(),
    TAB_TOP: unresolvedHeadingRule(),
  },
  hemAllowanceMm: 0,
  patternRepeatAdjustment: "ROUND_CUT_UP_TO_REPEAT",
  pairSingleConstruction: {
    pairAllocation: "BALANCED_WHOLE_WIDTHS",
    singleAllocation: "ALL_WIDTHS_TO_SINGLE",
  },
  fabricOrderingIncrementMetres: 0.1,
  liningRules: {
    UNLINED: null,
    STANDARD: null,
    BLACKOUT: null,
    THERMAL: null,
  },
  interliningRules: {
    NONE: null,
    DOMETTE: null,
    BUMP: null,
  },
  baseLabourPerWidth: null,
  patternMatchingLabourPerWidth: null,
  oversizedWidthSurcharge: null,
  oversizedDropSurcharge: null,
  complexitySurcharges: {
    STANDARD: null,
    CONFIGURABLE: null,
    REVIEW_REQUIRED: null,
    SPECIALIST: null,
  },
  accessoryPrices: {},
  packaging: { base: null, oversized: null },
  shipping: {},
  minimumOrderValue: null,
  vat: { rateBasisPoints: null, inputPricesIncludeVat: false },
  rounding: { incrementMinor: 1, mode: "NEAREST" },
};

export const INITIAL_COMPLEXITY_RULE_SET: ComplexityRuleSet = {
  id: "curtainsuk-complexity-draft-v1",
  version: "1.0.0-draft.1",
  manualQuoteWindowTypes: [
    "apex-window",
    "triangular-window",
    "gable-end-window",
    "angled-window",
    "arched-window",
    "curved-window",
    "awkward-unusual-window",
  ],
  reviewWindowTypes: [
    "bay-window",
    "bow-window",
    "extra-wide-window",
    "tall-window",
    "double-height-window",
    "floor-to-ceiling-window",
    "dormer-window",
    "corner-window",
    "conservatory",
  ],
  reviewWidthThresholdMm: null,
  manualQuoteWidthThresholdMm: null,
  reviewDropThresholdMm: null,
  manualQuoteDropThresholdMm: null,
};
