import type {
  HeadingType,
  LiningType,
  MeasurementRequirement,
  WindowTypeMaster,
} from "../types";

const WIDTH: MeasurementRequirement = {
  key: "track_width_mm",
  label: "Track or pole width",
  valueType: "LENGTH",
  minimum: 1,
};

const DROP: MeasurementRequirement = {
  key: "finished_drop_mm",
  label: "Finished curtain drop",
  valueType: "LENGTH",
  minimum: 1,
};

const BAY_SEGMENTS: MeasurementRequirement = {
  key: "bay_segment_widths_mm",
  label: "Bay segment widths",
  valueType: "LENGTH_LIST",
  minimum: 1,
};

const BAY_ANGLES: MeasurementRequirement = {
  key: "bay_angles_degrees",
  label: "Bay angles",
  valueType: "ANGLE_LIST",
  minimum: 1,
  maximum: 359,
};

const APEX_HEIGHT: MeasurementRequirement = {
  key: "apex_height_mm",
  label: "Overall apex height",
  valueType: "LENGTH",
  minimum: 1,
};

const LEFT_VERTICAL: MeasurementRequirement = {
  key: "left_vertical_mm",
  label: "Left vertical height",
  valueType: "LENGTH",
  minimum: 1,
};

const RIGHT_VERTICAL: MeasurementRequirement = {
  key: "right_vertical_mm",
  label: "Right vertical height",
  valueType: "LENGTH",
  minimum: 1,
};

const LEFT_SLOPE: MeasurementRequirement = {
  key: "left_slope_mm",
  label: "Left sloping length",
  valueType: "LENGTH",
  minimum: 1,
};

const RIGHT_SLOPE: MeasurementRequirement = {
  key: "right_slope_mm",
  label: "Right sloping length",
  valueType: "LENGTH",
  minimum: 1,
};

const CURVE_ARC: MeasurementRequirement = {
  key: "curve_arc_length_mm",
  label: "Track arc length",
  valueType: "LENGTH",
  minimum: 1,
};

const DEFAULT_HEADINGS: HeadingType[] = [
  "WAVE",
  "PENCIL_PLEAT",
  "DOUBLE_PINCH",
  "TRIPLE_PINCH",
  "EYELET",
];

const TRACK_HEADINGS: HeadingType[] = [
  "WAVE",
  "PENCIL_PLEAT",
  "DOUBLE_PINCH",
  "TRIPLE_PINCH",
];

const DEFAULT_LININGS: LiningType[] = [
  "UNLINED",
  "STANDARD",
  "BLACKOUT",
  "THERMAL",
];

type WindowSeed = Omit<
  WindowTypeMaster,
  | "customerFacingDescription"
  | "searchAliases"
  | "requiredMeasurements"
  | "optionalMeasurements"
  | "availableCurtainHeadings"
  | "allowedLiningOptions"
  | "recommendedTrackTypes"
  | "pairSingleAvailability"
  | "photoRequired"
  | "drawingRequired"
  | "technicalReviewRequired"
  | "instantPricingAllowed"
  | "relatedWindowTypes"
  | "seoTitle"
  | "seoDescription"
  | "primarySearchIntent"
  | "associatedFaqQuestions"
> &
  Partial<
    Pick<
      WindowTypeMaster,
      | "customerFacingDescription"
      | "searchAliases"
      | "requiredMeasurements"
      | "optionalMeasurements"
      | "availableCurtainHeadings"
      | "allowedLiningOptions"
      | "recommendedTrackTypes"
      | "pairSingleAvailability"
      | "photoRequired"
      | "drawingRequired"
      | "technicalReviewRequired"
      | "instantPricingAllowed"
      | "relatedWindowTypes"
      | "seoTitle"
      | "seoDescription"
      | "primarySearchIntent"
      | "associatedFaqQuestions"
    >
  >;

function defineWindowType(seed: WindowSeed): WindowTypeMaster {
  return {
    customerFacingDescription: `${seed.canonicalName} curtain project.`,
    searchAliases: [],
    requiredMeasurements: [WIDTH, DROP],
    optionalMeasurements: [],
    availableCurtainHeadings: DEFAULT_HEADINGS,
    allowedLiningOptions: DEFAULT_LININGS,
    recommendedTrackTypes: ["STRAIGHT_TRACK", "POLE"],
    pairSingleAvailability: ["PAIR", "SINGLE"],
    photoRequired: false,
    drawingRequired: false,
    technicalReviewRequired: seed.complexityClass !== "STANDARD",
    instantPricingAllowed: seed.complexityClass === "STANDARD",
    relatedWindowTypes: [],
    seoTitle: `${seed.canonicalName} Curtains | CurtainsUK`,
    seoDescription: `Made-to-measure curtain guidance for ${seed.canonicalName.toLowerCase()} projects.`,
    primarySearchIntent: `made-to-measure curtains for ${seed.canonicalName.toLowerCase()}`,
    associatedFaqQuestions: [
      `How should I measure a ${seed.canonicalName.toLowerCase()}?`,
      `Which curtain heading works for a ${seed.canonicalName.toLowerCase()}?`,
    ],
    ...seed,
  };
}

const architecturalRequired = [
  WIDTH,
  APEX_HEIGHT,
  LEFT_VERTICAL,
  RIGHT_VERTICAL,
  LEFT_SLOPE,
  RIGHT_SLOPE,
];

export const WINDOW_TYPE_SEEDS: WindowTypeMaster[] = [
  defineWindowType({
    canonicalName: "Standard Window",
    slug: "standard-window",
    family: "RECTANGULAR",
    geometryType: "RECTANGLE",
    complexityClass: "STANDARD",
    searchAliases: ["rectangular window", "normal window"],
    relatedWindowTypes: ["floor-to-ceiling-window", "tall-window"],
    customerFacingDescription:
      "A conventional rectangular window served by a straight track or pole.",
  }),
  defineWindowType({
    canonicalName: "Bay Window",
    slug: "bay-window",
    family: "BAY_AND_CURVED",
    geometryType: "SEGMENTED_BAY",
    complexityClass: "CONFIGURABLE",
    requiredMeasurements: [BAY_SEGMENTS, BAY_ANGLES, DROP],
    recommendedTrackTypes: ["BAY_TRACK", "BENDABLE_TRACK"],
    photoRequired: true,
    instantPricingAllowed: false,
    relatedWindowTypes: ["bow-window", "corner-window"],
  }),
  defineWindowType({
    canonicalName: "Bow Window",
    slug: "bow-window",
    family: "BAY_AND_CURVED",
    geometryType: "CURVED_ARC",
    complexityClass: "REVIEW_REQUIRED",
    requiredMeasurements: [CURVE_ARC, DROP],
    recommendedTrackTypes: ["CURVED_TRACK", "BENDABLE_TRACK"],
    photoRequired: true,
    drawingRequired: true,
    instantPricingAllowed: false,
    relatedWindowTypes: ["bay-window", "curved-window"],
  }),
  ...["Apex Window", "Triangular Window", "Gable End Window"].map(
    (canonicalName, index) =>
      defineWindowType({
        canonicalName,
        slug: ["apex-window", "triangular-window", "gable-end-window"][index],
        family: "ANGLED_AND_ARCHITECTURAL",
        geometryType: index === 1 ? "TRIANGLE" : "GABLE",
        complexityClass: "SPECIALIST",
        requiredMeasurements: architecturalRequired,
        availableCurtainHeadings: TRACK_HEADINGS,
        recommendedTrackTypes: ["SLOPING_TRACK"],
        photoRequired: true,
        drawingRequired: true,
        technicalReviewRequired: true,
        instantPricingAllowed: false,
        relatedWindowTypes: ["angled-window", "double-height-window"],
      }),
  ),
  defineWindowType({
    canonicalName: "Angled Window",
    slug: "angled-window",
    family: "ANGLED_AND_ARCHITECTURAL",
    geometryType: "ANGLED_POLYGON",
    complexityClass: "SPECIALIST",
    requiredMeasurements: architecturalRequired,
    availableCurtainHeadings: TRACK_HEADINGS,
    recommendedTrackTypes: ["SLOPING_TRACK", "BENDABLE_TRACK"],
    photoRequired: true,
    drawingRequired: true,
    instantPricingAllowed: false,
    relatedWindowTypes: ["apex-window", "triangular-window"],
  }),
  ...["Extra Wide Window", "Tall Window", "Double Height Window"].map(
    (canonicalName, index) =>
      defineWindowType({
        canonicalName,
        slug: ["extra-wide-window", "tall-window", "double-height-window"][index],
        family: "OVERSIZED",
        geometryType: "RECTANGLE",
        complexityClass: "REVIEW_REQUIRED",
        recommendedTrackTypes: ["STRAIGHT_TRACK", "MOTORISED_TRACK"],
        photoRequired: index === 2,
        technicalReviewRequired: true,
        instantPricingAllowed: false,
        relatedWindowTypes: ["floor-to-ceiling-window", "standard-window"],
      }),
  ),
  defineWindowType({
    canonicalName: "Floor-to-Ceiling Window",
    slug: "floor-to-ceiling-window",
    family: "OVERSIZED",
    geometryType: "RECTANGLE",
    complexityClass: "CONFIGURABLE",
    technicalReviewRequired: true,
    instantPricingAllowed: false,
    recommendedTrackTypes: ["STRAIGHT_TRACK", "MOTORISED_TRACK"],
    relatedWindowTypes: ["tall-window", "sliding-doors"],
  }),
  ...[
    ["French Doors", "french-doors"],
    ["Patio Doors", "patio-doors"],
    ["Sliding Doors", "sliding-doors"],
    ["Bifold Doors", "bifold-doors"],
  ].map(([canonicalName, slug]) =>
    defineWindowType({
      canonicalName,
      slug,
      family: "DOORS",
      geometryType: "RECTANGLE",
      complexityClass: "CONFIGURABLE",
      requiredMeasurements: [
        { ...WIDTH, key: "door_width_mm", label: "Door opening width" },
        { ...DROP, key: "door_height_mm", label: "Door opening height" },
      ],
      recommendedTrackTypes: ["STRAIGHT_TRACK", "MOTORISED_TRACK"],
      instantPricingAllowed: true,
      relatedWindowTypes: ["floor-to-ceiling-window"],
    }),
  ),
  defineWindowType({
    canonicalName: "Dormer Window",
    slug: "dormer-window",
    family: "SPECIAL_SHAPE",
    geometryType: "RECTANGLE",
    complexityClass: "CONFIGURABLE",
    photoRequired: true,
    instantPricingAllowed: false,
    relatedWindowTypes: ["standard-window", "angled-window"],
  }),
  defineWindowType({
    canonicalName: "Corner Window",
    slug: "corner-window",
    family: "MULTI_WINDOW",
    geometryType: "CORNER",
    complexityClass: "REVIEW_REQUIRED",
    requiredMeasurements: [BAY_SEGMENTS, BAY_ANGLES, DROP],
    recommendedTrackTypes: ["BAY_TRACK", "BENDABLE_TRACK"],
    photoRequired: true,
    drawingRequired: true,
    instantPricingAllowed: false,
    relatedWindowTypes: ["bay-window"],
  }),
  defineWindowType({
    canonicalName: "Arched Window",
    slug: "arched-window",
    family: "SPECIAL_SHAPE",
    geometryType: "ARCH",
    complexityClass: "SPECIALIST",
    requiredMeasurements: [WIDTH, DROP, APEX_HEIGHT],
    availableCurtainHeadings: TRACK_HEADINGS,
    recommendedTrackTypes: ["CURVED_TRACK", "BENDABLE_TRACK"],
    photoRequired: true,
    drawingRequired: true,
    instantPricingAllowed: false,
    relatedWindowTypes: ["curved-window"],
  }),
  defineWindowType({
    canonicalName: "Curved Window",
    slug: "curved-window",
    family: "BAY_AND_CURVED",
    geometryType: "CURVED_ARC",
    complexityClass: "SPECIALIST",
    requiredMeasurements: [CURVE_ARC, DROP],
    availableCurtainHeadings: TRACK_HEADINGS,
    recommendedTrackTypes: ["CURVED_TRACK"],
    photoRequired: true,
    drawingRequired: true,
    instantPricingAllowed: false,
    relatedWindowTypes: ["bow-window", "arched-window"],
  }),
  defineWindowType({
    canonicalName: "Conservatory",
    slug: "conservatory",
    family: "MULTI_WINDOW",
    geometryType: "MULTI_PLANE",
    complexityClass: "REVIEW_REQUIRED",
    requiredMeasurements: [BAY_SEGMENTS, DROP],
    recommendedTrackTypes: ["STRAIGHT_TRACK", "BENDABLE_TRACK"],
    photoRequired: true,
    drawingRequired: true,
    instantPricingAllowed: false,
    relatedWindowTypes: ["bay-window", "patio-doors"],
  }),
  defineWindowType({
    canonicalName: "Awkward / Unusual Window",
    slug: "awkward-unusual-window",
    family: "UNUSUAL",
    geometryType: "UNKNOWN",
    complexityClass: "SPECIALIST",
    requiredMeasurements: [],
    availableCurtainHeadings: TRACK_HEADINGS,
    recommendedTrackTypes: ["BENDABLE_TRACK", "SLOPING_TRACK"],
    photoRequired: true,
    drawingRequired: true,
    instantPricingAllowed: false,
    relatedWindowTypes: ["angled-window", "corner-window"],
  }),
];

export const WINDOW_TYPES_BY_SLUG = new Map(
  WINDOW_TYPE_SEEDS.map((windowType) => [windowType.slug, windowType]),
);
