import type {
  CompatibilityDecision,
  CurtainConfiguration,
  FabricSpec,
  PricingRuleSet,
  ValidationIssue,
  WindowTypeMaster,
} from "./types";

const allows = (values: string[], value: string) => values.includes("*") || values.includes(value);

export function evaluateCompatibility(
  configuration: CurtainConfiguration,
  windowType: WindowTypeMaster,
  fabric: FabricSpec,
  rules: PricingRuleSet,
): CompatibilityDecision {
  const blocked: ValidationIssue[] = [];
  const review: ValidationIssue[] = [];
  const add = (target: ValidationIssue[], code: string, field: string, message: string) => target.push({ code, field, message });

  if (fabric.supplierAvailability === "DISCONTINUED") add(blocked, "FABRIC_DISCONTINUED", "fabricSpecId", "Discontinued fabric cannot start a new configuration");
  if (!allows(fabric.suitableWindowTypeSlugs, windowType.slug)) add(blocked, "FABRIC_WINDOW_INCOMPATIBLE", "fabricSpecId", "Fabric is not approved for this window type");
  if (!fabric.allowedHeadings.includes(configuration.heading) || !windowType.availableCurtainHeadings.includes(configuration.heading)) add(blocked, "HEADING_INCOMPATIBLE", "heading", "Heading is incompatible with the selected fabric or window type");
  if (!fabric.allowedLinings.includes(configuration.lining) || !windowType.allowedLiningOptions.includes(configuration.lining)) add(blocked, "LINING_INCOMPATIBLE", "lining", "Lining is incompatible with the selected fabric or window type");
  if (!windowType.recommendedTrackTypes.includes(configuration.trackOrPole)) add(review, "TRACK_REVIEW_REQUIRED", "trackOrPole", "Track or pole is outside the recommended set and requires review");

  const lining = rules.liningRules[configuration.lining];
  if (!allows(lining.compatibleHeadings, configuration.heading) || !allows(lining.compatibleWindowTypes, windowType.slug)) add(blocked, "LINING_RULE_INCOMPATIBLE", "lining", "Lining manufacturing rule blocks this combination");
  const interlining = rules.interliningRules[configuration.interlining];
  if (!allows(interlining.compatibleHeadings, configuration.heading) || !allows(interlining.compatibleWindowTypes, windowType.slug)) add(blocked, "INTERLINING_RULE_INCOMPATIBLE", "interlining", "Interlining manufacturing rule blocks this combination");

  if (["UNKNOWN", "BACKORDER"].includes(fabric.supplierAvailability)) add(review, "SUPPLIER_AVAILABILITY_REVIEW", "fabricSpecId", "Supplier status prevents a firm lead-time promise");
  if (configuration.trackComplexity !== "SIMPLE_STRAIGHT" || configuration.numberOfSegments > 1) add(review, "TRACK_COMPLEXITY_REVIEW", "trackComplexity", "Track complexity or segmentation requires review");
  if (fabric.fabricWeightGsm === null) add(review, "FABRIC_WEIGHT_UNKNOWN", "fabricSpecId", "Fabric weight is unknown and must be checked for this combination");

  if (blocked.length) return { outcome: "BLOCKED", issues: [...blocked, ...review] };
  if (review.length) return { outcome: "REVIEW", issues: review };
  return { outcome: "ALLOWED", issues: [] };
}
