export type CurrencyCode = "GBP";

export type DecisionOutcome =
  | "INSTANT_PRICE"
  | "PRICE_WITH_REVIEW"
  | "MANUAL_QUOTE";

export type ComplexityClass =
  | "STANDARD"
  | "CONFIGURABLE"
  | "REVIEW_REQUIRED"
  | "SPECIALIST";

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
  | "TRIANGLE"
  | "GABLE"
  | "ANGLED_POLYGON"
  | "ARCH"
  | "CORNER"
  | "MULTI_PLANE"
  | "UNKNOWN";

export type HeadingType =
  | "WAVE"
  | "PENCIL_PLEAT"
  | "DOUBLE_PINCH"
  | "TRIPLE_PINCH"
  | "EYELET"
  | "TAB_TOP";

export type LiningType =
  | "UNLINED"
  | "STANDARD"
  | "BLACKOUT"
  | "THERMAL";

export type InterliningType = "NONE" | "DOMETTE" | "BUMP";

export type TrackType =
  | "STRAIGHT_TRACK"
  | "BAY_TRACK"
  | "BENDABLE_TRACK"
  | "CURVED_TRACK"
  | "SLOPING_TRACK"
  | "MOTORISED_TRACK"
  | "POLE";

export type ConstructionType = "PAIR" | "SINGLE";

export type StackDirection = "LEFT" | "RIGHT" | "SPLIT" | "FIXED";

export type PatternMatchType =
  | "PLAIN"
  | "STRAIGHT_MATCH"
  | "HALF_DROP"
  | "RANDOM_MATCH";

export type MeasurementKey =
  | "track_width_mm"
  | "finished_drop_mm"
  | "recess_width_mm"
  | "recess_height_mm"
  | "left_return_mm"
  | "right_return_mm"
  | "bay_segment_widths_mm"
  | "bay_angles_degrees"
  | "curve_arc_length_mm"
  | "apex_height_mm"
  | "left_vertical_mm"
  | "right_vertical_mm"
  | "left_slope_mm"
  | "right_slope_mm"
  | "door_width_mm"
  | "door_height_mm";

export interface MeasurementRequirement {
  key: MeasurementKey;
  label: string;
  valueType: "LENGTH" | "ANGLE" | "LENGTH_LIST" | "ANGLE_LIST";
  minimum?: number;
  maximum?: number;
  guidance?: string;
}

export interface WindowTypeMaster {
  canonicalName: string;
  slug: string;
  family: WindowFamily;
  customerFacingDescription: string;
  searchAliases: string[];
  geometryType: GeometryType;
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

export interface Money {
  amountMinor: number;
  currency: CurrencyCode;
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
  composition: FabricCompositionPart[];
  careInstructions: string[];
  usageSuitability: string[];
  supplierCostPerMetre: Money | null;
  sellingRatePerMetre: Money | null;
  sampleAvailable: boolean;
  samplePrice: Money | null;
  leadTime: FabricLeadTime;
  status: "ACTIVE" | "DISCONTINUED" | "DRAFT";
  imageReferences: string[];
  allowedHeadings: HeadingType[];
  allowedLinings: LiningType[];
  suitableWindowTypeSlugs: string[];
  googleFeedEligibility: GoogleFeedEligibility;
  fixtureOnly?: boolean;
}

export interface HeadingPricingRule {
  fullnessFactor: number;
  headingAllowanceMm: number;
  labourPerWidth: Money | null;
}

export interface MaterialPricingRule {
  usableWidthMm: number;
  headingAllowanceMm: number;
  hemAllowanceMm: number;
  sellingRatePerMetre: Money | null;
  orderingIncrementMetres: number;
}

export interface SurchargeRule {
  threshold: number;
  fixedAmount: Money | null;
  percentageBasisPoints: number | null;
}

export interface PricingRuleSet {
  id: string;
  version: string;
  status: "DRAFT" | "ACTIVE" | "RETIRED";
  currency: CurrencyCode;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  supersedesVersion: string | null;
  headingRules: Record<HeadingType, HeadingPricingRule | null>;
  hemAllowanceMm: number;
  patternRepeatAdjustment: "ROUND_CUT_UP_TO_REPEAT";
  pairSingleConstruction: {
    pairAllocation: "BALANCED_WHOLE_WIDTHS";
    singleAllocation: "ALL_WIDTHS_TO_SINGLE";
  };
  fabricOrderingIncrementMetres: number;
  liningRules: Record<LiningType, MaterialPricingRule | null>;
  interliningRules: Record<InterliningType, MaterialPricingRule | null>;
  baseLabourPerWidth: Money | null;
  patternMatchingLabourPerWidth: Money | null;
  oversizedWidthSurcharge: SurchargeRule | null;
  oversizedDropSurcharge: SurchargeRule | null;
  complexitySurcharges: Record<ComplexityClass, Money | null>;
  accessoryPrices: Record<string, Money | null>;
  packaging: {
    base: Money | null;
    oversized: Money | null;
  };
  shipping: Record<string, Money | null>;
  minimumOrderValue: Money | null;
  vat: {
    rateBasisPoints: number | null;
    inputPricesIncludeVat: boolean;
  };
  rounding: {
    incrementMinor: number;
    mode: "UP" | "DOWN" | "NEAREST";
  };
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

export interface PriceComponent {
  code: string;
  description: string;
  amount: Money;
  metadata?: Record<string, string | number | boolean>;
}

export interface CurtainConfiguration {
  id: string;
  windowTypeSlug: string;
  measurements: Partial<Record<MeasurementKey, MeasurementValue>>;
  fabricSpecId: string;
  colour: string;
  heading: HeadingType;
  lining: LiningType;
  interlining: InterliningType;
  construction: ConstructionType;
  trackOrPole: TrackType;
  stackDirection: StackDirection;
  accessories: SelectedAccessory[];
  attachments: ConfigurationAttachments;
  calculationVersion: string | null;
  calculatedComponents: PriceComponent[];
  finalPrice: Money | null;
  technicalReviewState:
    | "NOT_REQUIRED"
    | "PENDING"
    | "NEEDS_INFORMATION"
    | "APPROVED"
    | "REJECTED";
  customerApprovalState: "NOT_REQUESTED" | "PENDING" | "APPROVED" | "REJECTED";
  productionState: "DRAFT" | "BLOCKED" | "READY" | "RELEASED" | "COMPLETE";
}

export interface ComplexityRuleSet {
  id: string;
  version: string;
  manualQuoteWindowTypes: string[];
  reviewWindowTypes: string[];
  reviewWidthThresholdMm: number | null;
  manualQuoteWidthThresholdMm: number | null;
  reviewDropThresholdMm: number | null;
  manualQuoteDropThresholdMm: number | null;
}

export interface ComplexityDecision {
  outcome: DecisionOutcome;
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
  fabricWidths: WidthAllocation;
  fabricCutLengthMm: number;
  adjustedFabricCutLengthMm: number;
  fabricMetres: number;
  components: PriceComponent[];
  subtotal: Money;
  vat: Money;
  total: Money;
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
