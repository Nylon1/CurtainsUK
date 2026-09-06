import { classifyComplexity } from "@/lib/decision-engine/complexity";
import { createCurtainConfiguration } from "@/lib/decision-engine/curtain-configuration";
import { calculatePrice } from "@/lib/decision-engine/pricing-engine";
import { DRAFT_PRICING_RULE_SET, INITIAL_COMPLEXITY_RULE_SET } from "@/lib/decision-engine/seed/pricing-rules";
import { WINDOW_TYPES_BY_SLUG } from "@/lib/decision-engine/seed/window-types";
import type { ConstructionType, CoverageMeasurementBasis, CurtainConfiguration, HeadingType, InterliningType, LiningType, PricingRuleSet } from "@/lib/decision-engine/types";
import { STOREFRONT_FABRICS_BY_ID } from "@/lib/storefront/fabrics";
import { STOREFRONT_WINDOWS_BY_SLUG } from "@/lib/storefront/window-catalog";

export interface StagingPriceRequest {
  windowSlug: string;
  measurementBasis: CoverageMeasurementBasis;
  widthCm: number;
  dropCm: number;
  baySegmentWidthsCm?: number[];
  bayAnglesDegrees?: number[];
  fabricId: string;
  heading: HeadingType;
  lining: LiningType;
  interlining?: InterliningType;
  construction: ConstructionType;
  stackDirection: CurtainConfiguration["stackDirection"];
  photoNames?: string[];
}

export interface StagingPriceResponse {
  calculationVersion: string;
  outcome: "INSTANT_PRICE" | "PRICE_WITH_REVIEW" | "MANUAL_QUOTE";
  pricingConfidence: "HIGH" | "MEDIUM" | "LOW";
  technicalReviewRequired: boolean;
  reasons: string[];
  fabricWidths: number;
  fabricMetres: number;
  selectedFabric: { id: string; supplier: string; collection: string; design: string; colour: string };
  heading: HeadingType;
  lining: LiningType;
  construction: ConstructionType;
  netAmountMinor: number;
  vatAmountMinor: number;
  totalAmountMinor: number;
  currency: "GBP";
  delivery: string;
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

export function calculateStagingPrice(input: StagingPriceRequest): StagingPriceResponse {
  const storefrontWindow = STOREFRONT_WINDOWS_BY_SLUG.get(input.windowSlug);
  if (!storefrontWindow) throw new Error("Unknown window type");
  if (storefrontWindow.journey === "SPECIALIST") throw new Error("Specialist shapes require the review journey");
  const masterSlug = storefrontWindow.masterSlugs[0];
  const windowType = WINDOW_TYPES_BY_SLUG.get(masterSlug);
  const fabric = STOREFRONT_FABRICS_BY_ID.get(input.fabricId);
  if (!windowType || !fabric) throw new Error("Window type or fabric is unavailable");
  if (!Number.isFinite(input.widthCm) || !Number.isFinite(input.dropCm)) throw new Error("Width and drop must be valid numbers");

  const isBay = masterSlug === "bay-window";
  const configuration = createCurtainConfiguration({
    id: `stage-${Date.now()}`,
    windowTypeSlug: masterSlug,
    measurementBasis: input.measurementBasis,
    fabricSpecId: fabric.id,
    colour: fabric.colour,
    heading: input.heading,
    lining: input.lining,
    interlining: input.interlining ?? "NONE",
    construction: input.construction,
    trackOrPole: isBay ? "BAY_TRACK" : input.measurementBasis === "POLE_USABLE_WIDTH" ? "POLE" : "STRAIGHT_TRACK",
    trackComplexity: isBay ? "MULTI_SEGMENT" : "SIMPLE_STRAIGHT",
    numberOfSegments: isBay ? input.baySegmentWidthsCm?.length ?? 1 : 1,
    stackDirection: input.stackDirection,
  });
  configuration.measurements = isBay
    ? {
        coverage_width: input.widthCm,
        finished_drop: input.dropCm,
        bay_segment_widths: input.baySegmentWidthsCm ?? [],
        bay_angles_degrees: input.bayAnglesDegrees ?? [],
      }
    : scalarMeasurementsFor(masterSlug, input.widthCm, input.dropCm);
  configuration.attachments.photoReferences = (input.photoNames ?? []).map((name) => `staging-local://${name}`);

  const rules = buildStagingRuleSet();
  const calculation = calculatePrice({ configuration, windowType, fabric, rules, shippingZone: "UK_MAINLAND", mode: "CALIBRATION" });
  const complexity = classifyComplexity(configuration, windowType, INITIAL_COMPLEXITY_RULE_SET, {
    fabric,
    // The draft rules do not yet define an exact width-count review threshold.
    // Treat more than six widths as a review signal without making ordinary jobs
    // review-only merely because the engine calculated a width count.
    calculatedFabricWidths: calculation.fabricWidths.totalWidths > 6 ? calculation.fabricWidths.totalWidths : undefined,
  });
  return {
    calculationVersion: calculation.calculationVersion,
    outcome: complexity.outcome,
    pricingConfidence: complexity.pricingConfidence,
    technicalReviewRequired: complexity.outcome !== "INSTANT_PRICE" || complexity.technicalApprovalRequiredBeforePayment,
    reasons: complexity.reasons,
    fabricWidths: calculation.fabricWidths.totalWidths,
    fabricMetres: calculation.fabricMetres,
    selectedFabric: { id: fabric.id, supplier: fabric.supplier.replace(" (synthetic staging fixture)", ""), collection: fabric.collection, design: fabric.design, colour: fabric.colour },
    heading: input.heading,
    lining: input.lining,
    construction: input.construction,
    netAmountMinor: calculation.netTotal.amountMinor,
    vatAmountMinor: calculation.vat.amountMinor,
    totalAmountMinor: calculation.total.amountMinor,
    currency: "GBP",
    delivery: "UK Mainland delivery shown separately; staging rate pending",
  };
}

export interface SpecialistReviewRequest {
  windowSlug: string;
  measurements: Record<string, number>;
  fabricId: string;
  heading: HeadingType;
  lining: LiningType;
  fixingPosition: string;
  stackDirection: CurtainConfiguration["stackDirection"];
  photoNames: string[];
  drawingName?: string;
}

export function classifySpecialistReview(input: SpecialistReviewRequest) {
  const storefrontWindow = STOREFRONT_WINDOWS_BY_SLUG.get(input.windowSlug);
  if (!storefrontWindow || storefrontWindow.journey !== "SPECIALIST") throw new Error("A specialist window type is required");
  const windowType = WINDOW_TYPES_BY_SLUG.get(storefrontWindow.masterSlugs[0]);
  const fabric = STOREFRONT_FABRICS_BY_ID.get(input.fabricId);
  if (!windowType || !fabric) throw new Error("Window type or fabric is unavailable");
  const configuration = createCurtainConfiguration({
    id: `stage-review-${Date.now()}`,
    windowTypeSlug: windowType.slug,
    measurementBasis: "TRACK_WIDTH",
    fabricSpecId: fabric.id,
    colour: fabric.colour,
    heading: input.heading,
    lining: input.lining,
    construction: "PAIR",
    trackOrPole: "SLOPING_TRACK",
    trackComplexity: "SLOPING",
    stackDirection: input.stackDirection,
    minimumOrderClass: "SPECIALIST_REVIEWED",
  });
  configuration.measurements = input.measurements;
  configuration.attachments.photoReferences = input.photoNames.map((name) => `staging-local://${name}`);
  configuration.attachments.drawingReferences = input.drawingName ? [`staging-local://${input.drawingName}`] : [];
  const complexity = classifyComplexity(configuration, windowType, INITIAL_COMPLEXITY_RULE_SET, { fabric });
  return {
    ...complexity,
    technicalReviewState: "PENDING" as const,
    paymentState: "BLOCKED" as const,
    productionState: "BLOCKED" as const,
    fixingPosition: input.fixingPosition,
    message: "Price subject to technical review",
    persisted: false,
  };
}
