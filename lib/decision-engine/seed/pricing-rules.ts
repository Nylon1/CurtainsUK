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

const heading = (code: HeadingType, fullness: number | null): HeadingPricingRule => ({
  fullnessFactor: governed(`HEADING_FULLNESS_${code}`, "DRAFT", fullness),
  voileFullnessFactor: governed<number>(`VOILE_FULLNESS_${code}`, "DRAFT", null),
  headingLabourNetPerWidth: null,
  overrides: [],
});

const material = (): MaterialConstructionRule => ({
  structureStatus: "LOCKED",
  usableWidthMm: null,
  materialRateNetPerMetre: null,
  topAllowanceMm: null,
  bottomAllowanceMm: null,
  labourNetPerWidth: null,
  compatibleHeadings: [],
  compatibleWindowTypes: [],
});

const packagingClasses = ["SMALL", "STANDARD", "LARGE", "OVERSIZE", "SPECIALIST"] as const;

/** Draft-only. Null commercial inputs and registry blockers make activation impossible. */
export const DRAFT_PRICING_RULE_SET: PricingRuleSet = {
  id: "curtainsuk-pricing-v2-draft",
  version: "2.0.0-draft.1",
  lifecycle: "DRAFT",
  currency: "GBP",
  effectiveFrom: null,
  effectiveTo: null,
  supersedesVersion: "1.0.0-draft.1",
  decisionRegistryVersion: "2.0.0-draft.1",
  allowedCustomerWidthBases: governed("CUSTOMER_WIDTH_BASIS", "LOCKED", ["TRACK_WIDTH", "POLE_USABLE_WIDTH"]),
  headingRules: {
    PENCIL_PLEAT: heading("PENCIL_PLEAT", 2),
    WAVE: heading("WAVE", 2),
    DOUBLE_PINCH: heading("DOUBLE_PINCH", 2.25),
    TRIPLE_PINCH: heading("TRIPLE_PINCH", 2.5),
    EYELET: heading("EYELET", 2),
    TAB_TOP: heading("TAB_TOP", null),
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
  baseMakeupLabourNetPerWidth: null,
  patternMatchLabourNetPerWidth: null,
  liningRules: {
    UNLINED: { ...material(), usableWidthMm: 1, materialRateNetPerMetre: { amountMinor: 0, currency: "GBP" }, topAllowanceMm: 0, bottomAllowanceMm: 0, labourNetPerWidth: { amountMinor: 0, currency: "GBP" }, compatibleHeadings: ["WAVE", "PENCIL_PLEAT", "DOUBLE_PINCH", "TRIPLE_PINCH", "EYELET", "TAB_TOP"], compatibleWindowTypes: ["*"] },
    STANDARD: material(), BLACKOUT: material(), THERMAL: material(),
  },
  interliningRules: {
    NONE: { ...material(), usableWidthMm: 1, materialRateNetPerMetre: { amountMinor: 0, currency: "GBP" }, topAllowanceMm: 0, bottomAllowanceMm: 0, labourNetPerWidth: { amountMinor: 0, currency: "GBP" }, compatibleHeadings: ["WAVE", "PENCIL_PLEAT", "DOUBLE_PINCH", "TRIPLE_PINCH", "EYELET", "TAB_TOP"], compatibleWindowTypes: ["*"] },
    INTERLINING: material(),
  },
  markupTiers: [],
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
  vat: { implementationStatus: "LOCKED", baseRatesStoredNet: true, retailPricesPresentedGross: true, rateBasisPoints: null },
  rounding: { implementationStatus: "LOCKED", calculateIntermediateAtFullPrecision: true, incrementMinor: 100, mode: "NEAREST" },
  measurementValidation: {
    structureStatus: "LOCKED", customerLengthUnit: "CM", minimumWidthCm: null,
    maximumWidthCm: null, minimumDropCm: null, maximumDropCm: null,
    suspiciousLikelyMillimetresAtCm: null,
  },
};

export const INITIAL_COMPLEXITY_RULE_SET: ComplexityRuleSet = {
  id: "curtainsuk-complexity-v2-draft", version: "2.0.0-draft.1", status: "DRAFT", thresholdsStatus: "DRAFT",
  instantMaximumWidthCm: 400, instantMaximumDropCm: 300,
  reviewMaximumWidthCm: 600, reviewMaximumDropCm: 350,
  usuallyInstantWindowTypes: ["standard-window", "french-doors", "patio-doors", "sliding-doors", "bifold-doors", "extra-wide-window", "floor-to-ceiling-window"],
  usuallyReviewWindowTypes: ["bay-window", "bow-window", "dormer-window", "corner-window", "tall-window", "double-height-window", "curved-window", "conservatory"],
  usuallyManualQuoteWindowTypes: ["apex-window", "triangular-window", "gable-end-window", "angled-window", "arched-window", "awkward-unusual-window"],
  provisionalSpecialistGeometries: ["SYMMETRICAL_APEX", "TRIANGLE", "GABLE"],
  complexityFactors: { fabricWidths: true, fabricWeight: true, patternMatching: true, liningAndInterlining: true, headingType: true, windowType: true, trackComplexity: true, numberOfSegments: true },
};
