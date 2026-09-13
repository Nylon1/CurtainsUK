import type {
  ComplexityRuleSet,
  GovernedValue,
  HeadingPricingRule,
  HeadingType,
  MaterialConstructionRule,
  PricingRuleSet,
  RuleImplementationStatus,
} from "../types";

const governed = <T>(decisionId: string, status: RuleImplementationStatus, value: T | null): GovernedValue<T> => ({
  decisionId, status, value,
});

const heading = (code: HeadingType, fullness: number | null, priceFactor: number | null): HeadingPricingRule => ({
  fullnessFactor: governed(`HEADING_FULLNESS_${code}`, "DRAFT", fullness),
  voileFullnessFactor: governed<number>(`VOILE_FULLNESS_${code}`, "DRAFT", null),
  priceFactor: governed(`HEADING_PRICE_FACTOR_${code}`, priceFactor === null ? "DRAFT" : "LOCKED", priceFactor),
  overrides: [],
});

const material = (rateMinor: number | null = null): MaterialConstructionRule => ({
  structureStatus: "LOCKED",
  usableWidthMm: 1380,
  materialRateNetPerMetre: rateMinor === null ? null : { amountMinor: rateMinor, currency: "GBP" },
  topAllowanceMm: 150,
  bottomAllowanceMm: 200,
  labourNetPerWidth: { amountMinor: 0, currency: "GBP" },
  compatibleHeadings: ["WAVE", "PENCIL_PLEAT", "DOUBLE_PINCH", "TRIPLE_PINCH", "EYELET", "TAB_TOP"],
  compatibleWindowTypes: ["*"],
});

const packagingClasses = ["SMALL", "STANDARD", "LARGE", "OVERSIZE", "SPECIALIST"] as const;

/** Draft-only. Null commercial inputs and registry blockers make activation impossible. */
export const DRAFT_PRICING_RULE_SET: PricingRuleSet = {
  id: "curtainsuk-pricing-v1-shopify-integration-draft",
  version: "2.3.0-draft.1",
  commercialModelId: "CURTAINSUK_PRICING_RULESET_V1",
  lifecycle: "DRAFT",
  currency: "GBP",
  effectiveFrom: null,
  effectiveTo: null,
  supersedesVersion: "2.2.0-draft.1",
  decisionRegistryVersion: "2.3.0-draft.1",
  allowedCustomerWidthBases: governed("CUSTOMER_WIDTH_BASIS", "LOCKED", ["TRACK_WIDTH", "POLE_USABLE_WIDTH"]),
  headingRules: {
    PENCIL_PLEAT: heading("PENCIL_PLEAT", 2, 1),
    WAVE: heading("WAVE", 2, 1.1),
    DOUBLE_PINCH: heading("DOUBLE_PINCH", 2.25, 1.2),
    TRIPLE_PINCH: heading("TRIPLE_PINCH", 2.5, 1.2),
    EYELET: heading("EYELET", 2, 1.1),
    TAB_TOP: heading("TAB_TOP", null, null),
  },
  constructionAllowances: {
    topAllowanceMm: governed("TOP_ALLOWANCE", "DRAFT", 150),
    bottomHemAllowanceMm: governed("BOTTOM_HEM_ALLOWANCE", "DRAFT", 200),
    centreOverlapMm: governed("CENTRE_OVERLAP", "DRAFT", 50),
    leftReturnMm: governed("LEFT_RETURN", "DRAFT", 100),
    rightReturnMm: governed("RIGHT_RETURN", "DRAFT", 100),
  },
  patternRules: {
    randomMatch: governed("PATTERN_RANDOM_MATCH", "LOCKED", "CUT_LENGTH_EQUALS_DROP_PLUS_ALLOWANCES"),
    straightMatch: governed("PATTERN_STRAIGHT_MATCH", "LOCKED", "ROUND_UP_TO_COMPLETE_VERTICAL_REPEAT"),
    halfDropMatch: governed("PATTERN_HALF_DROP", "WORKROOM_CONFIRMATION_REQUIRED", "PENDING_WORKROOM_FORMULA"),
    exactCentringAndJoining: governed("PATTERN_CENTRING_JOINING", "WORKROOM_CONFIRMATION_REQUIRED", "PENDING_WORKROOM_FORMULA"),
  },
  fabricOrderingIncrementMetres: 0.1,
  pairSingleConstruction: governed("PAIR_SINGLE_ALLOCATION", "WORKROOM_CONFIRMATION_REQUIRED", "BALANCED_WHOLE_WIDTHS"),
  baseMakeupLabourNetPerWidth: { amountMinor: 2500, currency: "GBP" },
  patternMatchLabourNetPerWidth: null,
  marginPolicy: {
    basis: "DIRECT_COST_TARGET_GROSS_MARGIN",
    targetGrossMarginBasisPoints: governed("TARGET_GROSS_MARGIN", "LOCKED", 3500),
    minimumNetGrossProfitFloor: {
      status: "DRAFT",
      active: false,
      proposedNet: { amountMinor: 10000, currency: "GBP" },
      calibrationUpperBoundNet: { amountMinor: 15000, currency: "GBP" },
    },
  },
  liningRules: {
    UNLINED: { ...material(), usableWidthMm: 1, materialRateNetPerMetre: { amountMinor: 0, currency: "GBP" }, topAllowanceMm: 0, bottomAllowanceMm: 0, labourNetPerWidth: { amountMinor: 0, currency: "GBP" }, compatibleHeadings: ["WAVE", "PENCIL_PLEAT", "DOUBLE_PINCH", "TRIPLE_PINCH", "EYELET", "TAB_TOP"], compatibleWindowTypes: ["*"] },
    STANDARD: material(400), BLACKOUT: material(600), THERMAL: material(600),
    // Owner-approved complete combined layer: ordinary lining must not be added.
    BONDED: material(500),
  },
  interliningRules: {
    NONE: { ...material(), usableWidthMm: 1, materialRateNetPerMetre: { amountMinor: 0, currency: "GBP" }, topAllowanceMm: 0, bottomAllowanceMm: 0, labourNetPerWidth: { amountMinor: 0, currency: "GBP" }, compatibleHeadings: ["WAVE", "PENCIL_PLEAT", "DOUBLE_PINCH", "TRIPLE_PINCH", "EYELET", "TAB_TOP"], compatibleWindowTypes: ["*"] },
    INTERLINING: material(500),
  },
  oversizedWidthSurcharge: null,
  oversizedDropSurcharge: null,
  automaticComplexitySurchargesEnabled: false,
  complexitySurcharges: { STANDARD: null, CONFIGURABLE: null, REVIEW_REQUIRED: null, SPECIALIST: null },
  accessories: [
    { code: "MATCHING_TIEBACK", name: "Matching tiebacks", lifecycle: "DRAFT", unitType: "PAIR", unitPriceNet: null, vatRateBasisPoints: null, compatibleHeadings: [], compatibleWindowTypes: [], shippingClass: "STANDARD", reviewRequired: false, quoteOnly: false },
    { code: "EXTRA_FABRIC_METRE", name: "Extra fabric by metre", lifecycle: "DRAFT", unitType: "METRE", unitPriceNet: null, vatRateBasisPoints: null, compatibleHeadings: [], compatibleWindowTypes: [], shippingClass: "STANDARD", reviewRequired: false, quoteOnly: false },
    { code: "HOOKS_GLIDERS", name: "Hooks / gliders", lifecycle: "DRAFT", unitType: "PACK", unitPriceNet: null, vatRateBasisPoints: null, compatibleHeadings: [], compatibleWindowTypes: [], shippingClass: "SMALL", reviewRequired: false, quoteOnly: false },
    { code: "SPECIALIST_TRACK", name: "Specialist track", lifecycle: "DRAFT", unitType: "EACH", unitPriceNet: null, vatRateBasisPoints: null, compatibleHeadings: [], compatibleWindowTypes: [], shippingClass: "SPECIALIST", reviewRequired: true, quoteOnly: true },
    { code: "BESPOKE_POLE", name: "Bespoke pole", lifecycle: "DRAFT", unitType: "EACH", unitPriceNet: null, vatRateBasisPoints: null, compatibleHeadings: [], compatibleWindowTypes: [], shippingClass: "SPECIALIST", reviewRequired: true, quoteOnly: true },
    { code: "MOTORISATION", name: "Motorisation", lifecycle: "DRAFT", unitType: "EACH", unitPriceNet: null, vatRateBasisPoints: null, compatibleHeadings: [], compatibleWindowTypes: [], shippingClass: "SPECIALIST", reviewRequired: true, quoteOnly: true },
    { code: "COMPLEX_HARDWARE", name: "Complex hardware", lifecycle: "DRAFT", unitType: "EACH", unitPriceNet: null, vatRateBasisPoints: null, compatibleHeadings: [], compatibleWindowTypes: [], shippingClass: "SPECIALIST", reviewRequired: true, quoteOnly: true },
  ],
  packagingRules: packagingClasses.map((packagingClass) => ({ packagingClass, internalCostNet: null, chargeToCustomer: false, maximumFinishedWeightKg: null, maximumLongestSideMm: null, maximumFabricWidths: null, eligibleLinings: null, eligibleInterlinings: null })),
  shippingZones: [
    { code: "UK_MAINLAND", name: "UK Mainland supply-only", enabled: true, supplyOnly: true, rateNet: null, allowedPackagingClasses: ["SMALL", "STANDARD", "LARGE", "OVERSIZE"] },
    { code: "INTERNATIONAL", name: "International", enabled: false, supplyOnly: true, rateNet: null, allowedPackagingClasses: [] },
  ],
  internationalShippingEnabled: false,
  installationAvailabilityHandledSeparately: true,
  minimumOrders: {
    structureStatus: "LOCKED", valuesStatus: "DRAFT", standardMtmGross: null,
    premiumInterlinedGross: null, specialistReviewedGross: null,
    samplesExempt: true, shippingCountsTowardMinimum: false,
  },
  vat: { implementationStatus: "LOCKED", baseRatesStoredNet: true, retailPricesPresentedGross: true, rateBasisPoints: 2000 },
  rounding: { implementationStatus: "LOCKED", calculateIntermediateAtFullPrecision: true, incrementMinor: 100, mode: "NEAREST" },
  measurementValidation: {
    structureStatus: "LOCKED", customerLengthUnit: "CM", minimumWidthCm: null,
    maximumWidthCm: null, minimumDropCm: null, maximumDropCm: null,
    suspiciousLikelyMillimetresAtCm: null,
  },
};

export const INITIAL_COMPLEXITY_RULE_SET: ComplexityRuleSet = {
  id: "curtainsuk-complexity-v3-bay-instant", version: "3.0.0-bay-instant", status: "DRAFT", thresholdsStatus: "DRAFT",
  instantMaximumWidthCm: 400, instantMaximumDropCm: 300,
  reviewMaximumWidthCm: 600, reviewMaximumDropCm: 350,
  usuallyInstantWindowTypes: ["bay-window", "standard-window", "french-doors", "patio-doors", "sliding-doors", "bifold-doors", "extra-wide-window", "floor-to-ceiling-window"],
  usuallyReviewWindowTypes: ["bow-window", "dormer-window", "corner-window", "tall-window", "double-height-window", "curved-window", "conservatory"],
  usuallyManualQuoteWindowTypes: ["apex-window", "triangular-window", "gable-end-window", "angled-window", "arched-window", "awkward-unusual-window"],
  provisionalSpecialistGeometries: ["SYMMETRICAL_APEX", "TRIANGLE", "GABLE"],
  complexityFactors: { fabricWidths: true, fabricWeight: true, patternMatching: true, liningAndInterlining: true, headingType: true, windowType: true, trackComplexity: true, numberOfSegments: true },
};
