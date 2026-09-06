import type {
  ConstructionType,
  CoverageMeasurementBasis,
  CurtainConfiguration,
  HeadingType,
  InterliningType,
  LiningType,
  MinimumOrderClass,
  StackDirection,
  TrackComplexity,
  TrackType,
} from "./types";

export interface NewCurtainConfigurationInput {
  id: string;
  windowTypeSlug: string;
  measurementBasis: CoverageMeasurementBasis;
  fabricSpecId: string;
  colour: string;
  heading: HeadingType;
  lining: LiningType;
  interlining?: InterliningType;
  construction: ConstructionType;
  trackOrPole: TrackType;
  trackComplexity?: TrackComplexity;
  numberOfSegments?: number;
  stackDirection: StackDirection;
  minimumOrderClass?: MinimumOrderClass;
}

export function createCurtainConfiguration(input: NewCurtainConfigurationInput): CurtainConfiguration {
  const interlining = input.interlining ?? "NONE";
  return {
    ...input,
    interlining,
    customerLengthUnit: "CM",
    trackComplexity: input.trackComplexity ?? "SIMPLE_STRAIGHT",
    numberOfSegments: input.numberOfSegments ?? 1,
    constructionFeatures: {
      includeCentreOverlap: input.construction === "PAIR",
      includeLeftReturn: false,
      includeRightReturn: false,
    },
    minimumOrderClass: input.minimumOrderClass ?? (interlining === "INTERLINING" ? "PREMIUM_INTERLINED" : "STANDARD_MTM"),
    measurements: {},
    accessories: [],
    attachments: { photoReferences: [], drawingReferences: [] },
    pricingConfidence: null,
    calculationVersion: null,
    calculatedComponents: [],
    fabricRateSnapshot: null,
    vatSnapshot: null,
    finalPrice: null,
    technicalReviewState: "NOT_REQUIRED",
    customerApprovalState: "NOT_REQUESTED",
    paymentState: "BLOCKED",
    productionState: "DRAFT",
  };
}
