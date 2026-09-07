import { validateSpecialistGeometry } from "./validation";
import type {
  ComplexityDecision,
  ComplexityRuleSet,
  CurtainConfiguration,
  FabricSpec,
  WindowTypeMaster,
} from "./types";

export interface ComplexityContext {
  fabric?: FabricSpec;
  calculatedFabricWidths?: number;
}

function scalar(configuration: CurtainConfiguration, primary: "coverage_width" | "finished_drop", fallback: "door_width" | "door_height"): number | null {
  const value = configuration.measurements[primary] ?? configuration.measurements[fallback];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function decision(outcome: ComplexityDecision["outcome"], confidence: ComplexityDecision["pricingConfidence"], technicalApproval: boolean, reasons: string[], version: string): ComplexityDecision {
  return { outcome, pricingConfidence: confidence, technicalApprovalRequiredBeforePayment: technicalApproval, reasons, rulesVersion: version };
}

export function classifyComplexity(
  configuration: CurtainConfiguration,
  windowType: WindowTypeMaster,
  rules: ComplexityRuleSet,
  context: ComplexityContext = {},
): ComplexityDecision {
  const reasons: string[] = [];
  const width = scalar(configuration, "coverage_width", "door_width");
  const drop = scalar(configuration, "finished_drop", "door_height");
  const specialist = rules.provisionalSpecialistGeometries.includes(windowType.geometryType);

  if (configuration.trackComplexity === "SPECIALIST_FABRICATION" || configuration.trackOrPole === "SPECIALIST_TRACK") {
    return decision("MANUAL_QUOTE", "LOW", specialist, ["Specialist track fabrication requires a manual quote"], rules.version);
  }
  if (width !== null && width > rules.reviewMaximumWidthCm || drop !== null && drop > rules.reviewMaximumDropCm) {
    return decision("MANUAL_QUOTE", "LOW", specialist, ["Width or drop exceeds the draft manual-quote threshold"], rules.version);
  }

  if (specialist) {
    const missing = windowType.requiredMeasurements.some((requirement) => configuration.measurements[requirement.key] === undefined);
    const geometry = validateSpecialistGeometry(configuration, windowType);
    if (missing || !geometry.valid) {
      return decision("MANUAL_QUOTE", "LOW", true, [
        missing ? "Required specialist measurements are incomplete" : "Specialist measurements are present",
        ...geometry.issues.map((item) => item.message),
      ], rules.version);
    }
    reasons.push("Complete simple specialist geometry is eligible only for a provisional reviewed price");
    if (context.fabric?.patternMatchType === "HALF_DROP_MATCH" || context.fabric?.patternCentringRequirement === "REQUIRED") {
      return decision("MANUAL_QUOTE", "LOW", true, [...reasons, "Unconfirmed pattern matching or centring prevents provisional pricing"], rules.version);
    }
    return decision("PRICE_WITH_REVIEW", "MEDIUM", true, reasons, rules.version);
  }

  if (rules.usuallyManualQuoteWindowTypes.includes(windowType.slug) || windowType.complexityClass === "SPECIALIST") {
    return decision("MANUAL_QUOTE", "LOW", true, ["Window type normally requires a manual quote"], rules.version);
  }

  const exceedsInstant = width !== null && width > rules.instantMaximumWidthCm || drop !== null && drop > rules.instantMaximumDropCm;
  if (exceedsInstant) reasons.push("Width or drop falls within the draft technical-review band");
  if (rules.usuallyReviewWindowTypes.includes(windowType.slug) || windowType.technicalReviewRequired) reasons.push("Window type normally requires technical review");
  if (configuration.trackComplexity !== "SIMPLE_STRAIGHT") reasons.push("Track complexity requires review");
  if (configuration.numberOfSegments > 1) reasons.push("Multi-segment construction requires review");
  if (context.fabric?.patternMatchType === "HALF_DROP_MATCH" || context.fabric?.patternCentringRequirement === "WORKROOM_CONFIRMATION_REQUIRED") reasons.push("Pattern handling requires workroom review");
  // Missing supplier metadata must not change a technically standard curtain
  // into a review job. Known heavy fabrics can be routed by an explicit,
  // versioned threshold once the workroom approves one; unknown weight remains
  // a separate fabric-data/availability concern.
  if (configuration.interlining === "INTERLINING") reasons.push("Interlining is a complexity factor");
  if (context.calculatedFabricWidths !== undefined) reasons.push(`Calculated construction uses ${context.calculatedFabricWidths} fabric widths`);

  if (reasons.length) return decision("PRICE_WITH_REVIEW", "MEDIUM", false, reasons, rules.version);
  if (rules.usuallyInstantWindowTypes.includes(windowType.slug) && windowType.instantPricingAllowed) {
    return decision("INSTANT_PRICE", "HIGH", false, ["Eligible rectangular job is within the draft size thresholds"], rules.version);
  }
  return decision("MANUAL_QUOTE", "LOW", windowType.technicalReviewRequired, ["No approved instant-pricing path exists"], rules.version);
}
