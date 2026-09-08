import type { DecisionRecord, DecisionRegistry, RuleImplementationStatus } from "../types";

const VERSION = "2.3.0-draft.1";
const DATE = "2026-09-06";

function decision(
  decisionId: string,
  title: string,
  status: RuleImplementationStatus,
  value: unknown,
  rationale: string,
  confirmationOwner: string,
): DecisionRecord {
  return {
    decisionId,
    title,
    status,
    value,
    rationale,
    confirmationOwner,
    effectiveVersion: VERSION,
    lastChangedDate: DATE,
    blocksProductionActivation: status !== "LOCKED",
  };
}

/** Machine-readable source of truth for the Phase 2 implementation state. */
export const PHASE_2_DECISION_REGISTRY: DecisionRegistry = {
  registryVersion: VERSION,
  lastChangedDate: DATE,
  decisions: [
    decision("CUSTOMER_WIDTH_BASIS", "Customer width basis", "LOCKED", ["TRACK_WIDTH", "POLE_USABLE_WIDTH"], "Customers provide total coverage width, never finished curtain width.", "Product owner"),
    decision("HEADING_FULLNESS_DEFAULTS", "Heading fullness defaults", "DRAFT", { PENCIL_PLEAT: 2, WAVE: 2, DOUBLE_PINCH: 2.25, TRIPLE_PINCH: 2.5, EYELET: 2 }, "Initial calibration defaults; override dimensions are supported.", "Workroom lead"),
    decision("HEADING_PRICE_FACTORS", "Heading price factors", "LOCKED", { PENCIL_PLEAT: 1, WAVE: 1.1, EYELET: 1.1, DOUBLE_PINCH: 1.2, TRIPLE_PINCH: 1.2 }, "The factor applies to the £25-per-width make-up component, not to fabric or lining material.", "Commercial owner"),
    decision("VOILE_FULLNESS", "Voile fullness", "DRAFT", null, "Voile must remain independently configurable.", "Workroom lead"),
    decision("CONSTRUCTION_ALLOWANCES", "Construction allowances", "DRAFT", { topMm: 150, bottomHemMm: 200, centreOverlapMm: 50, leftReturnMm: 100, rightReturnMm: 100 }, "Allowances are separate and applied only where configured.", "Workroom lead"),
    decision("PATTERN_RANDOM_MATCH", "Random-match cut length", "LOCKED", "DROP_PLUS_ALLOWANCES", "Random designs do not require repeat rounding.", "Workroom lead"),
    decision("PATTERN_STRAIGHT_MATCH", "Straight-match repeat rounding", "LOCKED", "ROUND_UP_TO_NEXT_VERTICAL_REPEAT", "Each required cut is rounded upward to a complete repeat.", "Workroom lead"),
    decision("PATTERN_HALF_DROP", "Half-drop joining formula", "WORKROOM_CONFIRMATION_REQUIRED", null, "The workroom joining sequence and waste have not been confirmed.", "Workroom lead"),
    decision("PATTERN_CENTRING_JOINING", "Exact pattern centring and joining", "WORKROOM_CONFIRMATION_REQUIRED", null, "Centring may add cut length and cannot be inferred safely.", "Workroom lead"),
    decision("PAIR_SINGLE_ALLOCATION", "Pair and single width allocation", "WORKROOM_CONFIRMATION_REQUIRED", "BALANCED_WHOLE_WIDTHS_DRAFT", "Odd-width pair construction must be confirmed by the workroom.", "Workroom lead"),
    decision("LABOUR_MODEL_STRUCTURE", "Component labour model", "LOCKED", ["BASE_PER_WIDTH", "HEADING_PER_WIDTH", "LINING_PER_WIDTH", "PATTERN_MATCH", "COMPLEXITY"], "Prevents an untraceable flat make-up fee.", "Commercial owner"),
    decision("BASE_MAKEUP_RATE", "Base make-up rate", "LOCKED", { netPerFabricWidthMinor: 2500, currency: "GBP", includesLiningConstructionLabour: true }, "Pricing Ruleset v1 uses a single base make-up cost per face-fabric width before the heading adjustment.", "Commercial owner"),
    decision("PATTERN_MATCH_LABOUR_RATE", "Pattern-match labour rate", "DRAFT", null, "No additional pattern-match labour rate was supplied for v1; calibration therefore applies no separate charge.", "Commercial owner"),
    decision("LINING_INTERLINING_STRUCTURE", "Lining and interlining structure", "LOCKED", ["UNLINED", "STANDARD", "BLACKOUT", "THERMAL", "BONDED", "INTERLINING"], "BONDED is one complete combined lining/interlining layer and cannot add ordinary lining or separate interlining. Historical separate interlining remains a distinct selection.", "Workroom lead"),
    decision("LINING_MATERIAL_RATES", "Lining and interlining material rates", "LOCKED", { STANDARD: { netPerMetreMinor: 400 }, BLACKOUT: { netPerMetreMinor: 600 }, THERMAL: { netPerMetreMinor: 600 }, INTERLINING: { netPerMetreMinor: 500 }, BONDED: { netPerMetreMinor: 500, replacesLining: true, additionalInterliningAllowed: false }, currency: "GBP" }, "These are direct material costs used before target-margin pricing.", "Commercial owner"),
    decision("LINING_MANUFACTURING_ASSUMPTIONS", "Lining and interlining manufacturing assumptions", "DRAFT", { usableWidthMm: 1380, topAllowanceMm: 150, bottomAllowanceMm: 200, separateLabourPerWidthMinor: 0 }, "The benchmark needs executable quantities; lining width, allowances and inclusion of lining labour in base make-up still require workroom calibration.", "Workroom lead"),
    decision("FABRIC_SELLING_PRICE_STRUCTURE", "Fabric selling-price policy", "LOCKED", ["SUPPLIER_COST", "SUPPLIER_RRP", "CURTAINSUK_RATE", "BAND", "MARGIN_FLOOR", "EFFECTIVE_DATE", "OVERRIDE"], "Supports rate snapshots without a universal multiplier.", "Commercial owner"),
    decision("TARGET_GROSS_MARGIN", "Direct-cost target gross margin", "LOCKED", { basis: "DIRECT_COST_TARGET_GROSS_MARGIN", basisPoints: 3500 }, "Net selling price is total direct cost divided by 0.65; no job-specific tuning is permitted.", "Commercial owner"),
    decision("MINIMUM_NET_GROSS_PROFIT_FLOOR", "Minimum net gross-profit floor", "DRAFT", { active: false, proposedNetMinor: 10000, calibrationUpperBoundNetMinor: 15000, currency: "GBP" }, "£100 is the preliminary floor; £150 remains an upper calibration candidate. The floor must remain inactive until real-job review.", "Commercial owner"),
    decision("MINIMUM_ORDER_STRUCTURE", "Minimum-order sequence", "LOCKED", { samplesExempt: true, shippingExcluded: true, deliveryAddedAfterMinimum: true }, "Curtain goods minimum is evaluated before delivery.", "Commercial owner"),
    decision("MINIMUM_ORDER_VALUES", "Minimum-order values", "DRAFT", { standardMtmGross: null, premiumInterlinedGross: null, specialistReviewedGross: null }, "Placeholder ranges are intentionally not executable.", "Commercial owner"),
    decision("VAT_BASIS", "VAT basis and snapshots", "LOCKED", { componentsStoredNet: true, retailGross: true, snapshotPerOrder: true }, "Preserves an auditable net/VAT/gross breakdown.", "Finance owner"),
    decision("VAT_RATE", "VAT rate", "DRAFT", { basisPoints: 2000 }, "The current UK standard rate is used for calibration; finance must confirm applicability before activation.", "Finance owner"),
    decision("PRICE_ROUNDING", "Final price rounding", "LOCKED", { intermediate: "FULL_PRECISION", sequence: ["MINIMUMS", "SURCHARGES", "VAT", "FINAL_ROUNDING"], finalIncrementMinor: 100, mode: "NEAREST" }, "Only the final customer-facing total is rounded; .99 bands are prohibited.", "Commercial owner"),
    decision("COMPLEXITY_THRESHOLDS", "Width and drop routing thresholds", "DRAFT", { instant: { widthCm: 400, dropCm: 300 }, review: { widthCm: 600, dropCm: 350 } }, "Initial thresholds require calibration and do not activate surcharges.", "Technical lead"),
    decision("WINDOW_TYPE_ROUTING", "Window-type routing", "DRAFT", { rectangular: "INSTANT_PRICE", bayAndTall: "PRICE_WITH_REVIEW", specialistShapes: "MANUAL_QUOTE" }, "Initial routing reflects manufacturing risk but requires operational validation.", "Technical lead"),
    decision("SPECIALIST_SHAPE_WORKFLOW", "Apex, triangular and gable approval workflow", "LOCKED", { directManufacture: false, approvalBeforePayment: true, confidence: ["HIGH", "MEDIUM", "LOW"] }, "Specialist shapes require technical approval before payment and manufacture.", "Technical lead"),
    decision("SPECIALIST_PROVISIONAL_ELIGIBILITY", "Specialist provisional-price eligibility", "DRAFT", ["SYMMETRICAL_APEX", "SIMPLE_TRIANGLE", "STRAIGHTFORWARD_GABLE"], "Simple complete geometries may receive a provisional price; low confidence stays manual.", "Technical lead"),
    decision("ACCESSORY_STRUCTURE", "Accessory model", "LOCKED", ["UNIT_TYPE", "UNIT_PRICE", "VAT", "COMPATIBILITY", "SHIPPING_CLASS", "REVIEW"], "Accessories are itemised and governable.", "Commercial owner"),
    decision("ACCESSORY_CATALOGUE", "Accessory catalogue and rates", "DRAFT", ["MATCHING_TIEBACK", "EXTRA_FABRIC_METRE", "HOOKS_GLIDERS"], "Launch catalogue and prices remain incomplete.", "Commercial owner"),
    decision("PACKAGING_STRUCTURE", "Packaging classes", "LOCKED", ["SMALL", "STANDARD", "LARGE", "OVERSIZE", "SPECIALIST"], "Packaging is classified from job characteristics and remains an internal component by default.", "Operations owner"),
    decision("PACKAGING_THRESHOLDS", "Packaging thresholds and costs", "DRAFT", null, "Weight, dimension and width limits require fulfilment data.", "Operations owner"),
    decision("SHIPPING_LAUNCH_POLICY", "UK Mainland supply-only launch", "LOCKED", { ukMainlandOnly: true, internationalEnabled: false, installationSeparate: true, universalWorldwideRateProhibited: true }, "Prevents use of the current universal worldwide flat rate.", "Operations owner"),
    decision("UK_MAINLAND_SHIPPING_RATE", "UK Mainland shipping rate", "DRAFT", null, "Supply-only rate and parcel restrictions remain unconfirmed.", "Operations owner"),
    decision("SAMPLE_POLICY_STRUCTURE", "Sample-order model", "LOCKED", { fabricColourwaySku: true, separatePostage: true, multipleAllowed: true, futureCreditSupported: true }, "Samples are separate products linked to FabricSpec.", "Product owner"),
    decision("SAMPLE_COMMERCIAL_VALUES", "Sample price, postage and credit", "DRAFT", null, "Exact values and credit policy remain unconfirmed.", "Commercial owner"),
    decision("MEASUREMENT_VALIDATION_STRUCTURE", "Measurement validation", "LOCKED", { customerUnit: "CM", plausibilityChecks: true, suspiciousMmCmDetection: true, geometryConsistency: true }, "Invalid and unit-confused measurements must not enter pricing.", "Technical lead"),
    decision("MEASUREMENT_LIMITS", "Measurement limits and tolerances", "DRAFT", null, "Minimums, maximums and geometry tolerances require real-job calibration.", "Technical lead"),
    decision("COMPATIBILITY_ENGINE", "Compatibility evaluation", "LOCKED", ["FABRIC", "WINDOW", "HEADING", "LINING", "TRACK", "SIZE_WEIGHT_COMPLEXITY"], "Invalid combinations are blocked and uncertain combinations route to review.", "Technical lead"),
    decision("SUPPLIER_STATUS", "Supplier availability states", "LOCKED", ["ACTIVE", "LOW_STOCK", "BACKORDER", "DISCONTINUED", "UNKNOWN"], "Discontinued blocks new configurations; unknown blocks firm lead-time promises.", "Buying owner"),
    decision("GOOGLE_FEED_GOVERNANCE", "Google feed eligibility gates", "LOCKED", ["EXACT_PRICE", "PRICE_MATCH", "PURCHASABLE", "VALID_SHIPPING", "COMPLETE_DATA", "NOT_QUOTE_ONLY", "NO_PLACEHOLDER_PRICE", "ACTIVE_RULESET"], "Only purchase-ready products with matching exact prices may be advertised.", "Feed owner"),
    decision("PRICING_RULE_LIFECYCLE", "Pricing ruleset lifecycle and activation", "LOCKED", ["DRAFT", "VALIDATED", "ACTIVE", "RETIRED"], "An authorised pricing admin may activate only after automated validation and zero registry blockers.", "Authorised pricing admin"),
  ],
};
