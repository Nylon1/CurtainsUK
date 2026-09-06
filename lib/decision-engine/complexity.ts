import type {
  ComplexityDecision,
  ComplexityRuleSet,
  CurtainConfiguration,
  WindowTypeMaster,
} from "./types";

function scalarMeasurement(
  configuration: CurtainConfiguration,
  key: "track_width_mm" | "finished_drop_mm" | "door_width_mm" | "door_height_mm",
): number | null {
  const value = configuration.measurements[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function classifyComplexity(
  configuration: CurtainConfiguration,
  windowType: WindowTypeMaster,
  rules: ComplexityRuleSet,
): ComplexityDecision {
  const reasons: string[] = [];
  const width =
    scalarMeasurement(configuration, "track_width_mm") ??
    scalarMeasurement(configuration, "door_width_mm");
  const drop =
    scalarMeasurement(configuration, "finished_drop_mm") ??
    scalarMeasurement(configuration, "door_height_mm");

  const exceeds = (value: number | null, threshold: number | null) =>
    value !== null && threshold !== null && value > threshold;

  if (
    rules.manualQuoteWindowTypes.includes(windowType.slug) ||
    windowType.complexityClass === "SPECIALIST" ||
    exceeds(width, rules.manualQuoteWidthThresholdMm) ||
    exceeds(drop, rules.manualQuoteDropThresholdMm)
  ) {
    reasons.push("Specialist geometry or manual-quote threshold applies");
    return { outcome: "MANUAL_QUOTE", reasons, rulesVersion: rules.version };
  }

  if (
    rules.reviewWindowTypes.includes(windowType.slug) ||
    windowType.technicalReviewRequired ||
    exceeds(width, rules.reviewWidthThresholdMm) ||
    exceeds(drop, rules.reviewDropThresholdMm)
  ) {
    reasons.push("Technical review is required before the price is final");
    return {
      outcome: "PRICE_WITH_REVIEW",
      reasons,
      rulesVersion: rules.version,
    };
  }

  if (windowType.instantPricingAllowed) {
    reasons.push("Window type is eligible for an authoritative instant price");
    return { outcome: "INSTANT_PRICE", reasons, rulesVersion: rules.version };
  }

  reasons.push("No approved instant-pricing path exists for this window type");
  return { outcome: "MANUAL_QUOTE", reasons, rulesVersion: rules.version };
}
