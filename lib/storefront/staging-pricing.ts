import { classifyComplexity } from "@/lib/decision-engine/complexity";
import { createCurtainConfiguration } from "@/lib/decision-engine/curtain-configuration";
import { calculatePrice, calculateFabricRequirement } from "@/lib/decision-engine/pricing-engine";
import { assertValidConfiguration, type ConfigurationFabricIdentity } from "@/lib/decision-engine/validation";
import { DRAFT_PRICING_RULE_SET, INITIAL_COMPLEXITY_RULE_SET } from "@/lib/decision-engine/seed/pricing-rules";
import { WINDOW_TYPES_BY_SLUG } from "@/lib/decision-engine/seed/window-types";
import type { ConstructionType, CoverageMeasurementBasis, CurtainConfiguration, FabricSpec, HeadingType, InterliningType, LiningType, PricingRuleSet } from "@/lib/decision-engine/types";
import { STOREFRONT_FABRICS_BY_ID } from "@/lib/storefront/fabrics";
import { STOREFRONT_WINDOWS_BY_SLUG } from "@/lib/storefront/window-catalog";
import { allocateVatInclusiveRetailTotal } from "./checkout-gates";
import { MissingCommercialRuleError } from "@/lib/decision-engine/errors";

export interface StagingPriceRequest {
  windowSlug: string;
  measurementBasis: CoverageMeasurementBasis;
  widthCm?: number;
  dropCm: number;
  bayTrackOrPoleFitted?: boolean;
  bayNumberOfSections?: number;
  baySegmentWidthsCm?: number[];
  cornerSectionWidthsCm?: number[];
  cornerAngleDegrees?: number;
  fabricId: string;
  heading: HeadingType;
  lining: LiningType;
  interlining?: InterliningType;
  construction: ConstructionType;
  stackDirection: CurtainConfiguration["stackDirection"];
  photoNames?: string[];
}

export interface StagingPriceResponse {
  configurationId: string;
  calculationVersion: string;
  outcome: "INSTANT_PRICE" | "PRICE_WITH_REVIEW" | "MANUAL_QUOTE";
  pricingConfidence: "HIGH" | "MEDIUM" | "LOW";
  technicalReviewRequired: boolean;
  reasons: string[];
  fabricWidths: number | null;
  fabricMetres: number | null;
  commercialState?: "PRICE_CONFIRMATION_REQUIRED" | "PRICE_READY" | "ORDER_READY";
  selectedFabric: { id: string; supplier: string; collection: string; design: string; colour: string };
  heading: HeadingType;
  lining: LiningType;
  construction: ConstructionType;
  netAmountMinor: number | null;
  vatAmountMinor: number | null;
  totalAmountMinor: number | null;
  vatRateBasisPoints: number | null;
  currency: "GBP";
  totalCoverageWidthCm: number;
  bayTrackOrPoleFitted: boolean | null;
  delivery: string;
  availability: string;
  message: string;
  /** Short-lived staging capability created only by the server wrapper for review routes. */
  reviewSubmissionToken?: string | null;
}

export function buildStagingRuleSet(): PricingRuleSet {
  return {
    ...DRAFT_PRICING_RULE_SET,
    packagingRules: DRAFT_PRICING_RULE_SET.packagingRules.map((rule) => ({
      ...rule,
      internalCostNet: { amountMinor: 0, currency: "GBP" },
      chargeToCustomer: false,
    })),
    shippingZones: DRAFT_PRICING_RULE_SET.shippingZones.map((zone) => zone.code === "UK_MAINLAND"
      ? { ...zone, rateNet: { amountMinor: 0, currency: "GBP" }, allowedPackagingClasses: ["SMALL", "STANDARD", "LARGE", "OVERSIZE", "SPECIALIST"] }
      : zone),
    measurementValidation: {
      ...DRAFT_PRICING_RULE_SET.measurementValidation,
      minimumWidthCm: 30,
      maximumWidthCm: 1_200,
      minimumDropCm: 30,
      maximumDropCm: 600,
      suspiciousLikelyMillimetresAtCm: 1_000,
    },
  };
}

function scalarMeasurementsFor(masterSlug: string, widthCm: number, dropCm: number) {
  const isDoor = ["french-doors", "patio-doors", "sliding-doors", "bifold-doors"].includes(masterSlug);
  return isDoor
    ? { door_width: widthCm, door_height: dropCm }
    : { coverage_width: widthCm, finished_drop: dropCm };
}

function newConfigurationId() {
  return crypto.randomUUID();
}

function bayMeasurements(input: StagingPriceRequest) {
  if (typeof input.bayTrackOrPoleFitted !== "boolean") throw new Error("Bay track or pole status is required");
  if (!Number.isInteger(input.bayNumberOfSections) || input.bayNumberOfSections! < 2 || input.bayNumberOfSections! > 8) {
    throw new Error("Bay section count must be between 2 and 8");
  }
  if (!Array.isArray(input.baySegmentWidthsCm) || input.baySegmentWidthsCm.length !== input.bayNumberOfSections) {
    throw new Error("Bay section widths must match the section count");
  }
  if (input.baySegmentWidthsCm.some((value) => !Number.isFinite(value) || value < 10 || value > 600)) {
    throw new Error("Bay section widths must be between 10 cm and 600 cm");
  }
  return {
    sectionWidthsCm: [...input.baySegmentWidthsCm],
    numberOfSections: input.bayNumberOfSections,
    totalCoverageWidthCm: input.baySegmentWidthsCm.reduce((sum, value) => sum + value, 0),
  };
}

function cornerMeasurements(input: StagingPriceRequest) {
  if (!Array.isArray(input.cornerSectionWidthsCm) || input.cornerSectionWidthsCm.length !== 2) {
    throw new Error("Corner windows require exactly two section widths");
  }
  if (input.cornerSectionWidthsCm.some((value) => !Number.isFinite(value) || value < 10 || value > 600)) {
    throw new Error("Corner section widths must be between 10 cm and 600 cm");
  }
  if (!Number.isFinite(input.cornerAngleDegrees) || input.cornerAngleDegrees! < 1 || input.cornerAngleDegrees! > 359) {
    throw new Error("Corner angle must be between 1 and 359 degrees");
  }
  const totalCoverageWidthCm = input.cornerSectionWidthsCm.reduce((sum, value) => sum + value, 0);
  if (totalCoverageWidthCm < 30 || totalCoverageWidthCm > 1_200) {
    throw new Error("Corner total coverage width must be between 30 cm and 1,200 cm");
  }
  return {
    sectionWidthsCm: [...input.cornerSectionWidthsCm],
    angleDegrees: input.cornerAngleDegrees!,
    totalCoverageWidthCm,
  };
}

export function prepareStagingConfiguration(input: StagingPriceRequest, pricedFabric: ConfigurationFabricIdentity) {
  const storefrontWindow = STOREFRONT_WINDOWS_BY_SLUG.get(input.windowSlug);
  if (!storefrontWindow) throw new Error("Unknown window type");
  if (storefrontWindow.journey === "SPECIALIST") throw new Error("Specialist shapes require the review journey");
  const masterSlug = storefrontWindow.masterSlugs[0];
  const windowType = WINDOW_TYPES_BY_SLUG.get(masterSlug);
  if (!windowType) throw new Error("Window type is unavailable");
  const isBay = masterSlug === "bay-window";
  const isCorner = masterSlug === "corner-window";
  const isCurved = masterSlug === "curved-window" || masterSlug === "bow-window";
  const bay = isBay ? bayMeasurements(input) : null;
  const corner = isCorner ? cornerMeasurements(input) : null;
  const widthCm = bay?.totalCoverageWidthCm ?? corner?.totalCoverageWidthCm ?? input.widthCm;
  if (typeof widthCm !== "number" || !Number.isFinite(widthCm) || !Number.isFinite(input.dropCm)) throw new Error("Width and drop must be valid numbers");

  const configuration = createCurtainConfiguration({
    id: newConfigurationId(),
    windowTypeSlug: masterSlug,
    measurementBasis: input.measurementBasis,
    fabricSpecId: pricedFabric.id,
    colour: pricedFabric.colour,
    heading: input.heading,
    lining: input.lining,
    interlining: input.interlining ?? "NONE",
    construction: input.construction,
    trackOrPole: isBay || isCorner ? "BAY_TRACK" : isCurved ? "CURVED_TRACK" : input.measurementBasis === "POLE_USABLE_WIDTH" ? "POLE" : "STRAIGHT_TRACK",
    trackComplexity: isBay || isCorner ? "MULTI_SEGMENT" : isCurved ? "BENT" : "SIMPLE_STRAIGHT",
    numberOfSegments: bay?.numberOfSections ?? corner?.sectionWidthsCm.length ?? 1,
    stackDirection: input.stackDirection,
  });
  configuration.measurements = isBay
    ? {
        coverage_width: widthCm,
        finished_drop: input.dropCm,
        bay_segment_widths: bay!.sectionWidthsCm,
      }
    : isCorner
      ? {
          coverage_width: widthCm,
          finished_drop: input.dropCm,
          bay_segment_widths: corner!.sectionWidthsCm,
          bay_angles_degrees: [corner!.angleDegrees],
        }
      : isCurved
        ? {
            coverage_width: widthCm,
            curve_arc_length: widthCm,
            finished_drop: input.dropCm,
          }
        : scalarMeasurementsFor(masterSlug, widthCm, input.dropCm);
  configuration.attachments.photoReferences = (input.photoNames ?? []).map((name) => `staging-local://${name}`);

  assertValidConfiguration(configuration, windowType, pricedFabric, buildStagingRuleSet().measurementValidation);
  return {configuration, windowType, widthCm, bay};
}

function calculateStagingPriceWithFabric(input: StagingPriceRequest, pricedFabric: FabricSpec, availability: string): StagingPriceResponse & {fabricWidths:number;fabricMetres:number} {
  const {configuration, windowType, widthCm, bay} = prepareStagingConfiguration(input, pricedFabric);
  const rules = buildStagingRuleSet();
  const calculation = calculatePrice({ configuration, windowType, fabric: pricedFabric, rules, shippingZone: "UK_MAINLAND", mode: "CALIBRATION" });
  const complexity = classifyComplexity(configuration, windowType, INITIAL_COMPLEXITY_RULE_SET, {
    fabric: pricedFabric,
    // The draft rules do not yet define an exact width-count review threshold.
    // Treat more than six widths as a review signal without making ordinary jobs
    // review-only merely because the engine calculated a width count.
    calculatedFabricWidths: calculation.fabricWidths.totalWidths > 6 ? calculation.fabricWidths.totalWidths : undefined,
  });
  const manualQuote = complexity.outcome === "MANUAL_QUOTE";
  const retailPrice = manualQuote
    ? null
    : allocateVatInclusiveRetailTotal(calculation.total.amountMinor, rules.vat.rateBasisPoints!);
  return {
    configurationId: configuration.id,
    calculationVersion: calculation.calculationVersion,
    outcome: complexity.outcome,
    pricingConfidence: complexity.pricingConfidence,
    technicalReviewRequired: complexity.outcome !== "INSTANT_PRICE" || complexity.technicalApprovalRequiredBeforePayment,
    reasons: complexity.reasons,
    fabricWidths: calculation.fabricWidths.totalWidths,
    fabricMetres: calculation.fabricMetres,
    selectedFabric: { id: pricedFabric.id, supplier: pricedFabric.supplier, collection: pricedFabric.collection, design: pricedFabric.design, colour: pricedFabric.colour },
    heading: input.heading,
    lining: input.lining,
    construction: input.construction,
    netAmountMinor: retailPrice?.netAmountMinor ?? null,
    vatAmountMinor: retailPrice?.vatAmountMinor ?? null,
    totalAmountMinor: retailPrice?.grossAmountMinor ?? null,
    vatRateBasisPoints: retailPrice?.vatRateBasisPoints ?? null,
    currency: "GBP",
    totalCoverageWidthCm: widthCm,
    bayTrackOrPoleFitted: bay ? input.bayTrackOrPoleFitted! : null,
    delivery: "UK Mainland delivery shown separately; staging rate pending",
    availability,
    message: manualQuote
      ? "Price confirmed after technical review"
      : complexity.outcome === "PRICE_WITH_REVIEW"
        ? "Provisional price subject to technical review"
        : "Your made-to-measure price is ready",
  };
}

/** Pure test/calibration entry point. The cost is supplied by the test, never read from Git. */
export function calculateStagingPriceForTest(input: StagingPriceRequest, pricedFabric: FabricSpec) {
  return calculateStagingPriceWithFabric(input, pricedFabric, "Availability to be confirmed");
}

/** Reuses the ordinary canonical configuration and existing manual review queue. */
export function calculatePriceConfirmationReview(
  input: StagingPriceRequest,
  identity: ConfigurationFabricIdentity & Pick<FabricSpec, "supplier" | "collection" | "design">,
  manufacturingFabric: FabricSpec | null,
): StagingPriceResponse & {outcome:"MANUAL_QUOTE"} {
  const {configuration, windowType, widthCm, bay} = prepareStagingConfiguration(input, identity);
  const rules = buildStagingRuleSet();
  let requirement: ReturnType<typeof calculateFabricRequirement> | null = null;
  if(manufacturingFabric) {
    try { requirement = calculateFabricRequirement({configuration, windowType, fabric: manufacturingFabric, rules}); }
    catch(error) { if(!(error instanceof MissingCommercialRuleError))throw error; }
  }
  return {
    configurationId: configuration.id, calculationVersion: rules.version,
    outcome: "MANUAL_QUOTE", pricingConfidence: "LOW", technicalReviewRequired: true,
    commercialState: "PRICE_CONFIRMATION_REQUIRED",
    reasons: ["PRICE_CONFIRMATION_REQUIRED", ...(!requirement ? ["FABRIC_REQUIREMENT_CONFIRMATION_REQUIRED"] : [])],
    fabricWidths: requirement?.fabricWidths.totalWidths ?? null,
    fabricMetres: requirement?.fabricMetres ?? null,
    selectedFabric: {id:identity.id,supplier:identity.supplier,collection:identity.collection,design:identity.design,colour:identity.colour},
    heading:input.heading,lining:input.lining,construction:input.construction,
    netAmountMinor:null,vatAmountMinor:null,totalAmountMinor:null,vatRateBasisPoints:null,currency:"GBP",
    totalCoverageWidthCm:widthCm,bayTrackOrPoleFitted:bay ? input.bayTrackOrPoleFitted! : null,
    delivery:"Delivery charge requires confirmation",availability:"Availability to be confirmed",
    message:"Price confirmation required. Submit your curtain details for supplier price and availability verification.",
  };
}

export interface SpecialistReviewRequest {
  windowSlug: string;
  measurements: Record<string, number>;
  fabricId: string;
  heading: HeadingType;
  lining: LiningType;
  construction: ConstructionType;
  fixingPosition: string;
  stackDirection: CurtainConfiguration["stackDirection"];
  photoNames?: string[];
  drawingName?: string;
}

export function classifySpecialistReview(input: SpecialistReviewRequest, suppliedFabric?: ConfigurationFabricIdentity) {
  const storefrontWindow = STOREFRONT_WINDOWS_BY_SLUG.get(input.windowSlug);
  if (!storefrontWindow || storefrontWindow.journey !== "SPECIALIST") throw new Error("A specialist window type is required");
  if (typeof input.fixingPosition !== "string" || input.fixingPosition.trim().length < 3 || input.fixingPosition.trim().length > 200) {
    throw new Error("Specialist fixing position is required");
  }
  const windowType = WINDOW_TYPES_BY_SLUG.get(storefrontWindow.masterSlugs[0]);
  const fabric = suppliedFabric ?? STOREFRONT_FABRICS_BY_ID.get(input.fabricId);
  if (!windowType || !fabric) throw new Error("Window type or fabric is unavailable");
  const configuration = createCurtainConfiguration({
    id: newConfigurationId(),
    windowTypeSlug: windowType.slug,
    measurementBasis: "TRACK_WIDTH",
    fabricSpecId: fabric.id,
    colour: fabric.colour,
    heading: input.heading,
    lining: input.lining,
    construction: input.construction,
    trackOrPole: "SLOPING_TRACK",
    trackComplexity: "SLOPING",
    stackDirection: input.stackDirection,
    minimumOrderClass: "SPECIALIST_REVIEWED",
  });
  configuration.measurements = input.measurements;
  configuration.attachments.photoReferences = (input.photoNames ?? []).map((name) => `staging-local://${name}`);
  configuration.attachments.drawingReferences = input.drawingName ? [`staging-local://${input.drawingName}`] : [];
  assertValidConfiguration(configuration, windowType, fabric, buildStagingRuleSet().measurementValidation);
  const complexity = classifyComplexity(configuration, windowType, INITIAL_COMPLEXITY_RULE_SET, "usableWidthMm" in fabric ? {fabric: fabric as FabricSpec} : {});
  return {
    ...complexity,
    configurationId: configuration.id,
    construction: configuration.construction,
    technicalReviewState: "PENDING" as const,
    paymentState: "BLOCKED" as const,
    productionState: "BLOCKED" as const,
    fixingPosition: input.fixingPosition.trim(),
    message: complexity.outcome === "MANUAL_QUOTE"
      ? "Price confirmed after technical review"
      : "Price subject to technical review",
    persisted: false,
  };
}
