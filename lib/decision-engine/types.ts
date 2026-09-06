export type CurrencyCode = "GBP";

export type RuleImplementationStatus =
  | "LOCKED"
  | "DRAFT"
  | "WORKROOM_CONFIRMATION_REQUIRED";

export type PricingRuleLifecycle = "DRAFT" | "VALIDATED" | "ACTIVE" | "RETIRED";
export type DecisionOutcome = "INSTANT_PRICE" | "PRICE_WITH_REVIEW" | "MANUAL_QUOTE";
export type ComplexityClass = "STANDARD" | "CONFIGURABLE" | "REVIEW_REQUIRED" | "SPECIALIST";

export type WindowFamily =
  | "RECTANGULAR"
  | "BAY_AND_CURVED"
  | "ANGLED_AND_ARCHITECTURAL"
  | "OVERSIZED"
  | "DOORS"
  | "SPECIAL_SHAPE"
  | "MULTI_WINDOW"
  | "UNUSUAL";

export type GeometryType =
  | "RECTANGLE"
  | "SEGMENTED_BAY"
  | "CURVED_ARC"
  | "SYMMETRICAL_APEX"
  | "TRIANGLE"
  | "GABLE"
  | "ANGLED_POLYGON"
  | "ARCH"
  | "CORNER"
  | "MULTI_PLANE"
  | "UNKNOWN";

export type CoverageMeasurementBasis = "TRACK_WIDTH" | "POLE_USABLE_WIDTH";
export type CustomerLengthUnit = "CM";
export type HeadingType = "WAVE" | "PENCIL_PLEAT" | "DOUBLE_PINCH" | "TRIPLE_PINCH" | "EYELET" | "TAB_TOP";
export type LiningType = "UNLINED" | "STANDARD" | "BLACKOUT" | "THERMAL";
export type InterliningType = "NONE" | "INTERLINING";

export type TrackType =
  | "STRAIGHT_TRACK"
  | "BAY_TRACK"
  | "BENDABLE_TRACK"
  | "CURVED_TRACK"
  | "SLOPING_TRACK"
  | "MOTORISED_TRACK"
  | "POLE"
  | "SPECIALIST_TRACK";

export type TrackComplexity =
  | "SIMPLE_STRAIGHT"
  | "BENT"
  | "SLOPING"
  | "MULTI_SEGMENT"
  | "SPECIALIST_FABRICATION";

export type ConstructionType = "PAIR" | "SINGLE";
export type StackDirection = "LEFT" | "RIGHT" | "SPLIT" | "FIXED";
export type PatternMatchType = "RANDOM_MATCH" | "STRAIGHT_MATCH" | "HALF_DROP_MATCH";
export type PatternCentringRequirement = "NONE" | "PREFERRED" | "REQUIRED" | "WORKROOM_CONFIRMATION_REQUIRED";

export type MeasurementKey =
  | "coverage_width"
  | "finished_drop"
  | "recess_width"
  | "recess_height"
  | "left_return"
  | "right_return"
  | "bay_segment_widths"
  | "bay_angles_degrees"
  | "curve_arc_length"
  | "peak_height"
  | "left_vertical"
  | "right_vertical"
  | "left_slope"
  | "right_slope"
  | "left_slope_angle_degrees"
  | "right_slope_angle_degrees"
  | "door_width"
  | "door_height";

export interface MeasurementRequirement {
  key: MeasurementKey;
  label: string;
  valueType: "LENGTH" | "ANGLE" | "LENGTH_LIST" | "ANGLE_LIST";
  minimumCustomerValue?: number;
  maximumCustomerValue?: number;
  guidance?: string;
}

export interface WindowTypeMaster {
  canonicalName: string;
  slug: string;
  family: WindowFamily;
  customerFacingDescription: string;
  searchAliases: string[];
  geometryType: GeometryType;
  allowedMeasurementBases: CoverageMeasurementBasis[];
  requiredMeasurements: MeasurementRequirement[];
  optionalMeasurements: MeasurementRequirement[];
  availableCurtainHeadings: HeadingType[];
  allowedLiningOptions: LiningType[];
  recommendedTrackTypes: TrackType[];
  pairSingleAvailability: ConstructionType[];
  photoRequired: boolean;
  drawingRequired: boolean;
  technicalReviewRequired: boolean;
  instantPricingAllowed: boolean;
  complexityClass: ComplexityClass;
  relatedWindowTypes: string[];
  seoTitle: string;
  seoDescription: string;
  primarySearchIntent: string;
  associatedFaqQuestions: string[];
}

/** Fractional minor units are retained until final customer-total rounding. */
export interface Money {
  amountMinor: number;
  currency: CurrencyCode;
}

export interface GovernedValue<T> {
  decisionId: string;
  status: RuleImplementationStatus;
  value: T | null;
}

export interface FabricCompositionPart {
  material: string;
  percentage: number;
}

export interface FabricLeadTime {
  minimumBusinessDays: number;
  maximumBusinessDays: number;
}

export interface GoogleFeedEligibility {
  eligible: boolean;
  reason: string;
  identifierExists: boolean;
}

export type SupplierAvailability = "ACTIVE" | "LOW_STOCK" | "BACKORDER" | "DISCONTINUED" | "UNKNOWN";

export interface FabricSellingPricePolicy {
  supplierRrpPerMetre: Money | null;
  curtainsUkSellingRatePerMetre: Money | null;
  pricingBand: string | null;
  minimumGrossMarginPercent: number | null;
  minimumCashMargin: Money | null;
  effectiveFrom: string | null;
  manualOverride: {
    enabled: boolean;
    ratePerMetre: Money | null;
    reason: string | null;
    approvedBy: string | null;
  };
}

export interface SamplePolicy {
  sku: string;
  available: boolean;
  price: Money | null;
  postage: Money | null;
  futureOrderCreditEligible: boolean;
}

export interface FabricSpec {
  id: string;
  supplier: string;
  collection: string;
  design: string;
  colour: string;
  supplierReference: string;
  uniqueSku: string;
  usableWidthMm: number;
  verticalRepeatMm: number | null;
  horizontalRepeatMm: number | null;
  patternMatchType: PatternMatchType;
  patternCentringRequirement: PatternCentringRequirement;
  composition: FabricCompositionPart[];
  careInstructions: string[];
  usageSuitability: string[];
  fabricWeightGsm: number | null;
  supplierCostPerMetre: Money | null;
  sellingPricePolicy: FabricSellingPricePolicy;
  sample: SamplePolicy;
  leadTime: FabricLeadTime;
  recordLifecycle: "DRAFT" | "ACTIVE" | "RETIRED";
  supplierAvailability: SupplierAvailability;
  imageReferences: string[];
  allowedHeadings: HeadingType[];
  allowedLinings: LiningType[];
  suitableWindowTypeSlugs: string[];
  googleFeedEligibility: GoogleFeedEligibility;
  fixtureOnly?: boolean;
}

export interface HeadingFullnessOverride {
  fabricSpecId?: string;
  trackType?: TrackType;
  windowTypeSlug?: string;
  minimumCoverageWidthMm?: number;
  maximumCoverageWidthMm?: number;
  fullnessFactor: number;
  status: RuleImplementationStatus;
}

export interface HeadingPricingRule {
  fullnessFactor: GovernedValue<number>;
  voileFullnessFactor: GovernedValue<number>;
  headingLabourNetPerWidth: Money | null;
  overrides: HeadingFullnessOverride[];
}

export interface ConstructionAllowances {
  topAllowanceMm: GovernedValue<number>;
  bottomHemAllowanceMm: GovernedValue<number>;
  centreOverlapMm: GovernedValue<number>;
  leftReturnMm: GovernedValue<number>;
  rightReturnMm: GovernedValue<number>;
}

export interface MaterialConstructionRule {
  structureStatus: "LOCKED";
  usableWidthMm: number | null;
  materialRateNetPerMetre: Money | null;
  topAllowanceMm: number | null;
  bottomAllowanceMm: number | null;
  labourNetPerWidth: Money | null;
  compatibleHeadings: HeadingType[];
  compatibleWindowTypes: string[];
}

export interface SurchargeRule {
  threshold: number;
  fixedAmountNet: Money | null;
  percentageBasisPoints: number | null;
}

export type MinimumOrderClass = "STANDARD_MTM" | "PREMIUM_INTERLINED" | "SPECIALIST_REVIEWED";

export interface MinimumOrderRules {
  structureStatus: "LOCKED";
  valuesStatus: "DRAFT";
  standardMtmGross: Money | null;
  premiumInterlinedGross: Money | null;
  specialistReviewedGross: Money | null;
  samplesExempt: true;
  shippingCountsTowardMinimum: false;
}

export type PackagingClass = "SMALL" | "STANDARD" | "LARGE" | "OVERSIZE" | "SPECIALIST";

export interface AccessorySpec {
  code: "MATCHING_TIEBACK" | "EXTRA_FABRIC_METRE" | "HOOKS_GLIDERS" | string;
  name: string;
  lifecycle: "DRAFT" | "ACTIVE" | "RETIRED";
  unitType: "EACH" | "PAIR" | "METRE" | "PACK";
  unitPriceNet: Money | null;
  vatRateBasisPoints: number | null;
  compatibleHeadings: HeadingType[];
  compatibleWindowTypes: string[];
  shippingClass: PackagingClass;
  reviewRequired: boolean;
  quoteOnly: boolean;
}

export interface PackagingRule {
  packagingClass: PackagingClass;
  internalCostNet: Money | null;
  chargeToCustomer: boolean;
  maximumFinishedWeightKg: number | null;
  maximumLongestSideMm: number | null;
  maximumFabricWidths: number | null;
  eligibleLinings: LiningType[] | null;
  eligibleInterlinings: InterliningType[] | null;
}

export interface ShippingZoneRule {
  code: string;
  name: string;
  enabled: boolean;
  supplyOnly: boolean;
  rateNet: Money | null;
  allowedPackagingClasses: PackagingClass[];
}

export interface MeasurementValidationRules {
  structureStatus: "LOCKED";
  customerLengthUnit: "CM";
  minimumWidthCm: number | null;
  maximumWidthCm: number | null;
  minimumDropCm: number | null;
  maximumDropCm: number | null;
  suspiciousLikelyMillimetresAtCm: number | null;
}

export interface PricingRuleSet {
  id: string;
  version: string;
  lifecycle: PricingRuleLifecycle;
  currency: CurrencyCode;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  supersedesVersion: string | null;
  decisionRegistryVersion: string;
  allowedCustomerWidthBases: GovernedValue<CoverageMeasurementBasis[]>;
  headingRules: Record<HeadingType, HeadingPricingRule | null>;
  constructionAllowances: ConstructionAllowances;
  patternRules: {
    randomMatch: GovernedValue<"CUT_LENGTH_EQUALS_DROP_PLUS_ALLOWANCES">;
    straightMatch: GovernedValue<"ROUND_UP_TO_COMPLETE_VERTICAL_REPEAT">;
    halfDropMatch: GovernedValue<"PENDING_WORKROOM_FORMULA" | "WORKROOM_APPROVED_HALF_DROP_FORMULA_V1">;
    exactCentringAndJoining: GovernedValue<"PENDING_WORKROOM_FORMULA" | "WORKROOM_APPROVED_CENTRING_FORMULA_V1">;
  };
  fabricOrderingIncrementMetres: number;
  pairSingleConstruction: GovernedValue<"BALANCED_WHOLE_WIDTHS">;
  baseMakeupLabourNetPerWidth: Money | null;
  patternMatchLabourNetPerWidth: Money | null;
  liningRules: Record<LiningType, MaterialConstructionRule>;
  interliningRules: Record<InterliningType, MaterialConstructionRule>;
  markupTiers: Array<{
    minimumSupplierCostMinor: number;
    maximumSupplierCostMinor: number | null;
    markupPercent: number | null;
    minimumCashMargin: Money | null;
  }>;
  oversizedWidthSurcharge: SurchargeRule | null;
  oversizedDropSurcharge: SurchargeRule | null;
  automaticComplexitySurchargesEnabled: false;
  complexitySurcharges: Record<ComplexityClass, Money | null>;
  accessories: AccessorySpec[];
  packagingRules: PackagingRule[];
  shippingZones: ShippingZoneRule[];
  internationalShippingEnabled: false;
  installationAvailabilityHandledSeparately: true;
  minimumOrders: MinimumOrderRules;
  vat: {
    implementationStatus: "LOCKED";
    baseRatesStoredNet: true;
    retailPricesPresentedGross: true;
    rateBasisPoints: number | null;
  };
  rounding: {
    implementationStatus: "LOCKED";
    calculateIntermediateAtFullPrecision: true;
    incrementMinor: 100;
    mode: "NEAREST";
  };
  measurementValidation: MeasurementValidationRules;
}

export type MeasurementValue = number | number[];

export interface ConfigurationAttachments {
  photoReferences: string[];
  drawingReferences: string[];
}

export interface SelectedAccessory {
  code: string;
  quantity: number;
}

export interface ConstructionFeatures {
  includeCentreOverlap: boolean;
  includeLeftReturn: boolean;
  includeRightReturn: boolean;
}

export interface PriceComponent {
  code: string;
  description: string;
  netAmount: Money;
  vatRateBasisPoints: number;
  chargeToCustomer: boolean;
  countsTowardGoodsMinimum: boolean;
  metadata?: Record<string, string | number | boolean>;
}

export type PricingConfidence = "HIGH" | "MEDIUM" | "LOW";

export interface FabricRateSnapshot {
  fabricSpecId: string;
  sellingRateNetPerMetre: Money;
  effectiveFrom: string;
  manualOverrideApplied: boolean;
}

export interface VatSnapshot {
  rateBasisPoints: number;
  netAmount: Money;
  vatAmount: Money;
  grossAmountBeforeRounding: Money;
  grossAmountAfterRounding: Money;
}

export interface CurtainConfiguration {
  id: string;
  windowTypeSlug: string;
  measurementBasis: CoverageMeasurementBasis;
  customerLengthUnit: CustomerLengthUnit;
  measurements: Partial<Record<MeasurementKey, MeasurementValue>>;
  fabricSpecId: string;
  colour: string;
  heading: HeadingType;
  lining: LiningType;
  interlining: InterliningType;
  construction: ConstructionType;
  trackOrPole: TrackType;
  trackComplexity: TrackComplexity;
  numberOfSegments: number;
  constructionFeatures: ConstructionFeatures;
  stackDirection: StackDirection;
  accessories: SelectedAccessory[];
  attachments: ConfigurationAttachments;
  pricingConfidence: PricingConfidence | null;
  minimumOrderClass: MinimumOrderClass;
  calculationVersion: string | null;
  calculatedComponents: PriceComponent[];
  fabricRateSnapshot: FabricRateSnapshot | null;
  vatSnapshot: VatSnapshot | null;
  finalPrice: Money | null;
  technicalReviewState: "NOT_REQUIRED" | "PENDING" | "NEEDS_INFORMATION" | "APPROVED" | "REJECTED";
  customerApprovalState: "NOT_REQUESTED" | "PENDING" | "APPROVED" | "REJECTED";
  paymentState: "BLOCKED" | "ELIGIBLE" | "PAID" | "REFUNDED";
  productionState: "DRAFT" | "BLOCKED" | "READY" | "RELEASED" | "COMPLETE";
}

export interface ComplexityRuleSet {
  id: string;
  version: string;
  status: "DRAFT" | "VALIDATED";
  thresholdsStatus: "DRAFT";
  instantMaximumWidthCm: 400;
  instantMaximumDropCm: 300;
  reviewMaximumWidthCm: 600;
  reviewMaximumDropCm: 350;
  usuallyInstantWindowTypes: string[];
  usuallyReviewWindowTypes: string[];
  usuallyManualQuoteWindowTypes: string[];
  provisionalSpecialistGeometries: GeometryType[];
  complexityFactors: {
    fabricWidths: true;
    fabricWeight: true;
    patternMatching: true;
    liningAndInterlining: true;
    headingType: true;
    windowType: true;
    trackComplexity: true;
    numberOfSegments: true;
  };
}

export interface ComplexityDecision {
  outcome: DecisionOutcome;
  pricingConfidence: PricingConfidence;
  technicalApprovalRequiredBeforePayment: boolean;
  reasons: string[];
  rulesVersion: string;
}

export interface WidthAllocation {
  totalWidths: number;
  curtainWidths: number[];
}

export interface CalculationResult {
  configurationId: string;
  calculationVersion: string;
  fabricRateSnapshot: FabricRateSnapshot;
  fabricWidths: WidthAllocation;
  fabricCutLengthMm: number;
  adjustedFabricCutLengthMm: number;
  fabricMetres: number;
  components: PriceComponent[];
  goodsNetBeforeMinimum: Money;
  applicableMinimumGross: Money | null;
  minimumAdjustmentNet: Money;
  shippingNet: Money;
  netTotal: Money;
  vat: Money;
  grossBeforeRounding: Money;
  total: Money;
  vatSnapshot: VatSnapshot;
}

export interface CompatibilityDecision {
  outcome: "ALLOWED" | "REVIEW" | "BLOCKED";
  issues: ValidationIssue[];
}

export interface PricingAdminActor {
  id: string;
  roles: string[];
}

export interface ValidationIssue {
  code: string;
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export interface DecisionRecord {
  decisionId: string;
  title: string;
  status: RuleImplementationStatus;
  value: unknown;
  rationale: string;
  confirmationOwner: string;
  effectiveVersion: string;
  lastChangedDate: string;
  blocksProductionActivation: boolean;
}

export interface DecisionRegistry {
  registryVersion: string;
  lastChangedDate: string;
  decisions: DecisionRecord[];
}
