import type {
  CurtainConfiguration,
  HeadingType,
  InterliningType,
  LiningType,
  StackDirection,
  TrackType,
  ConstructionType,
} from "./types";

export interface NewCurtainConfigurationInput {
  id: string;
  windowTypeSlug: string;
  fabricSpecId: string;
  colour: string;
  heading: HeadingType;
  lining: LiningType;
  interlining?: InterliningType;
  construction: ConstructionType;
  trackOrPole: TrackType;
  stackDirection: StackDirection;
}

export function createCurtainConfiguration(
  input: NewCurtainConfigurationInput,
): CurtainConfiguration {
  return {
    ...input,
    interlining: input.interlining ?? "NONE",
    measurements: {},
    accessories: [],
    attachments: { photoReferences: [], drawingReferences: [] },
    calculationVersion: null,
    calculatedComponents: [],
    finalPrice: null,
    technicalReviewState: "NOT_REQUIRED",
    customerApprovalState: "NOT_REQUESTED",
    productionState: "DRAFT",
  };
}
