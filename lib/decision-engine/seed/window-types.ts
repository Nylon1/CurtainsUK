import type {
  HeadingType,
  LiningType,
  MeasurementRequirement,
  WindowTypeMaster,
} from "../types";

const length = (key: MeasurementRequirement["key"], label: string): MeasurementRequirement => ({
  key,
  label,
  valueType: "LENGTH",
  minimumCustomerValue: 0.1,
});

const WIDTH = length("coverage_width", "Full curtain coverage width");
const DROP = length("finished_drop", "Finished curtain drop");
const PEAK = length("peak_height", "Peak height");
const LEFT_VERTICAL = length("left_vertical", "Left vertical height");
const RIGHT_VERTICAL = length("right_vertical", "Right vertical height");
const LEFT_SLOPE = length("left_slope", "Left slope length");
const RIGHT_SLOPE = length("right_slope", "Right slope length");
const ARC = length("curve_arc_length", "Track arc length");
const BAY_SEGMENTS: MeasurementRequirement = {
  key: "bay_segment_widths", label: "Bay segment widths", valueType: "LENGTH_LIST", minimumCustomerValue: 0.1,
};
const BAY_ANGLES: MeasurementRequirement = {
  key: "bay_angles_degrees", label: "Bay angles", valueType: "ANGLE_LIST",
  minimumCustomerValue: 1, maximumCustomerValue: 359,
};
const SLOPE_ANGLES: MeasurementRequirement[] = [
  { key: "left_slope_angle_degrees", label: "Left slope angle", valueType: "ANGLE", minimumCustomerValue: 0.1, maximumCustomerValue: 179.9 },
  { key: "right_slope_angle_degrees", label: "Right slope angle", valueType: "ANGLE", minimumCustomerValue: 0.1, maximumCustomerValue: 179.9 },
];

const DEFAULT_HEADINGS: HeadingType[] = ["WAVE", "PENCIL_PLEAT", "DOUBLE_PINCH", "TRIPLE_PINCH", "EYELET"];
const TRACK_HEADINGS: HeadingType[] = DEFAULT_HEADINGS.filter((heading) => heading !== "EYELET");
const DEFAULT_LININGS: LiningType[] = ["UNLINED", "STANDARD", "BLACKOUT", "THERMAL"];

type WindowSeed = Pick<WindowTypeMaster, "canonicalName" | "slug" | "family" | "geometryType" | "complexityClass"> &
  Partial<Omit<WindowTypeMaster, "canonicalName" | "slug" | "family" | "geometryType" | "complexityClass">>;

function defineWindowType(seed: WindowSeed): WindowTypeMaster {
  const defaultInstant = seed.complexityClass === "STANDARD";
  return {
    ...seed,
    customerFacingDescription: seed.customerFacingDescription ?? `${seed.canonicalName} curtain project.`,
    searchAliases: seed.searchAliases ?? [],
    allowedMeasurementBases: seed.allowedMeasurementBases ?? ["TRACK_WIDTH", "POLE_USABLE_WIDTH"],
    requiredMeasurements: seed.requiredMeasurements ?? [WIDTH, DROP],
    optionalMeasurements: seed.optionalMeasurements ?? [],
    availableCurtainHeadings: seed.availableCurtainHeadings ?? DEFAULT_HEADINGS,
    allowedLiningOptions: seed.allowedLiningOptions ?? DEFAULT_LININGS,
    recommendedTrackTypes: seed.recommendedTrackTypes ?? ["STRAIGHT_TRACK", "POLE"],
    pairSingleAvailability: seed.pairSingleAvailability ?? ["PAIR", "SINGLE"],
    photoRequired: seed.photoRequired ?? false,
    drawingRequired: seed.drawingRequired ?? false,
    technicalReviewRequired: seed.technicalReviewRequired ?? !defaultInstant,
    instantPricingAllowed: seed.instantPricingAllowed ?? defaultInstant,
    relatedWindowTypes: seed.relatedWindowTypes ?? [],
    seoTitle: seed.seoTitle ?? `${seed.canonicalName} Curtains | CurtainsUK`,
    seoDescription: seed.seoDescription ?? `Made-to-measure curtain guidance for ${seed.canonicalName.toLowerCase()} projects.`,
    primarySearchIntent: seed.primarySearchIntent ?? `made-to-measure curtains for ${seed.canonicalName.toLowerCase()}`,
    associatedFaqQuestions: seed.associatedFaqQuestions ?? [
      `How should I measure a ${seed.canonicalName.toLowerCase()}?`,
      `Which curtain heading works for a ${seed.canonicalName.toLowerCase()}?`,
    ],
  };
}

const specialistMeasurements = [WIDTH, PEAK, LEFT_VERTICAL, RIGHT_VERTICAL, LEFT_SLOPE, RIGHT_SLOPE];

export const WINDOW_TYPE_SEEDS: WindowTypeMaster[] = [
  defineWindowType({ canonicalName: "Standard Window", slug: "standard-window", family: "RECTANGULAR", geometryType: "RECTANGLE", complexityClass: "STANDARD", searchAliases: ["rectangular window", "normal window"], relatedWindowTypes: ["floor-to-ceiling-window", "tall-window"] }),
  defineWindowType({ canonicalName: "Bay Window", slug: "bay-window", family: "BAY_AND_CURVED", geometryType: "SEGMENTED_BAY", complexityClass: "CONFIGURABLE", requiredMeasurements: [BAY_SEGMENTS, DROP], recommendedTrackTypes: ["BAY_TRACK", "BENDABLE_TRACK"], photoRequired: false, instantPricingAllowed: false, relatedWindowTypes: ["bow-window", "corner-window"] }),
  defineWindowType({ canonicalName: "Bow Window", slug: "bow-window", family: "BAY_AND_CURVED", geometryType: "CURVED_ARC", complexityClass: "REVIEW_REQUIRED", requiredMeasurements: [ARC, DROP], recommendedTrackTypes: ["CURVED_TRACK", "BENDABLE_TRACK"], photoRequired: true, instantPricingAllowed: false, relatedWindowTypes: ["bay-window", "curved-window"] }),
  ...([ ["Apex Window", "apex-window", "SYMMETRICAL_APEX"], ["Triangular Window", "triangular-window", "TRIANGLE"], ["Gable End Window", "gable-end-window", "GABLE"] ] as const).map(([canonicalName, slug, geometryType]) => defineWindowType({
    canonicalName, slug, family: "ANGLED_AND_ARCHITECTURAL", geometryType, complexityClass: "SPECIALIST",
    requiredMeasurements: specialistMeasurements, optionalMeasurements: SLOPE_ANGLES,
    availableCurtainHeadings: TRACK_HEADINGS, recommendedTrackTypes: ["SLOPING_TRACK", "SPECIALIST_TRACK"],
    photoRequired: true, drawingRequired: false, technicalReviewRequired: true, instantPricingAllowed: false,
    relatedWindowTypes: ["angled-window", "double-height-window"],
  })),
  defineWindowType({ canonicalName: "Angled Window", slug: "angled-window", family: "ANGLED_AND_ARCHITECTURAL", geometryType: "ANGLED_POLYGON", complexityClass: "SPECIALIST", requiredMeasurements: specialistMeasurements, optionalMeasurements: SLOPE_ANGLES, availableCurtainHeadings: TRACK_HEADINGS, recommendedTrackTypes: ["SLOPING_TRACK", "SPECIALIST_TRACK"], photoRequired: true, technicalReviewRequired: true, instantPricingAllowed: false, relatedWindowTypes: ["apex-window", "triangular-window"] }),
  ...([ ["Extra Wide Window", "extra-wide-window"], ["Tall Window", "tall-window"], ["Double Height Window", "double-height-window"] ] as const).map(([canonicalName, slug], index) => defineWindowType({
    canonicalName, slug, family: "OVERSIZED", geometryType: "RECTANGLE", complexityClass: index === 0 ? "CONFIGURABLE" : "REVIEW_REQUIRED",
    recommendedTrackTypes: ["STRAIGHT_TRACK", "MOTORISED_TRACK"], photoRequired: index === 2,
    technicalReviewRequired: index !== 0, instantPricingAllowed: index === 0,
    relatedWindowTypes: ["floor-to-ceiling-window", "standard-window"],
  })),
  defineWindowType({ canonicalName: "Floor-to-Ceiling Window", slug: "floor-to-ceiling-window", family: "OVERSIZED", geometryType: "RECTANGLE", complexityClass: "CONFIGURABLE", technicalReviewRequired: false, instantPricingAllowed: true, recommendedTrackTypes: ["STRAIGHT_TRACK", "MOTORISED_TRACK"], relatedWindowTypes: ["tall-window", "sliding-doors"] }),
  ...([ ["French Doors", "french-doors"], ["Patio Doors", "patio-doors"], ["Sliding Doors", "sliding-doors"], ["Bifold Doors", "bifold-doors"] ] as const).map(([canonicalName, slug]) => defineWindowType({
    canonicalName, slug, family: "DOORS", geometryType: "RECTANGLE", complexityClass: "CONFIGURABLE",
    requiredMeasurements: [length("door_width", "Full curtain coverage width"), length("door_height", "Finished curtain drop")],
    recommendedTrackTypes: ["STRAIGHT_TRACK", "MOTORISED_TRACK", "POLE"], technicalReviewRequired: false,
    instantPricingAllowed: true, relatedWindowTypes: ["floor-to-ceiling-window"],
  })),
  defineWindowType({ canonicalName: "Dormer Window", slug: "dormer-window", family: "SPECIAL_SHAPE", geometryType: "RECTANGLE", complexityClass: "CONFIGURABLE", photoRequired: true, instantPricingAllowed: false, relatedWindowTypes: ["standard-window", "angled-window"] }),
  defineWindowType({ canonicalName: "Corner Window", slug: "corner-window", family: "MULTI_WINDOW", geometryType: "CORNER", complexityClass: "REVIEW_REQUIRED", requiredMeasurements: [BAY_SEGMENTS, BAY_ANGLES, DROP], recommendedTrackTypes: ["BAY_TRACK", "BENDABLE_TRACK"], photoRequired: true, instantPricingAllowed: false, relatedWindowTypes: ["bay-window"] }),
  defineWindowType({ canonicalName: "Arched Window", slug: "arched-window", family: "SPECIAL_SHAPE", geometryType: "ARCH", complexityClass: "SPECIALIST", requiredMeasurements: [WIDTH, DROP, PEAK], availableCurtainHeadings: TRACK_HEADINGS, recommendedTrackTypes: ["CURVED_TRACK", "SPECIALIST_TRACK"], photoRequired: true, drawingRequired: true, instantPricingAllowed: false, relatedWindowTypes: ["curved-window"] }),
  defineWindowType({ canonicalName: "Curved Window", slug: "curved-window", family: "BAY_AND_CURVED", geometryType: "CURVED_ARC", complexityClass: "REVIEW_REQUIRED", requiredMeasurements: [ARC, DROP], availableCurtainHeadings: TRACK_HEADINGS, recommendedTrackTypes: ["CURVED_TRACK"], photoRequired: true, instantPricingAllowed: false, relatedWindowTypes: ["bow-window", "arched-window"] }),
  defineWindowType({ canonicalName: "Conservatory", slug: "conservatory", family: "MULTI_WINDOW", geometryType: "MULTI_PLANE", complexityClass: "REVIEW_REQUIRED", requiredMeasurements: [BAY_SEGMENTS, DROP], recommendedTrackTypes: ["STRAIGHT_TRACK", "BENDABLE_TRACK"], photoRequired: true, instantPricingAllowed: false, relatedWindowTypes: ["bay-window", "patio-doors"] }),
  defineWindowType({ canonicalName: "Awkward / Unusual Window", slug: "awkward-unusual-window", family: "UNUSUAL", geometryType: "UNKNOWN", complexityClass: "SPECIALIST", requiredMeasurements: [WIDTH, DROP], availableCurtainHeadings: TRACK_HEADINGS, recommendedTrackTypes: ["SPECIALIST_TRACK"], photoRequired: true, drawingRequired: true, instantPricingAllowed: false, relatedWindowTypes: ["angled-window", "corner-window"] }),
];

export const WINDOW_TYPES_BY_SLUG = new Map(WINDOW_TYPE_SEEDS.map((item) => [item.slug, item]));
