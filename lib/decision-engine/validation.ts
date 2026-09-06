import { DecisionEngineValidationError } from "./errors";
import type {
  CurtainConfiguration,
  DecisionRegistry,
  FabricSpec,
  MeasurementRequirement,
  MeasurementValidationRules,
  MeasurementValue,
  Money,
  PricingRuleSet,
  ValidationIssue,
  ValidationResult,
  WindowTypeMaster,
} from "./types";

function issue(code: string, field: string, message: string): ValidationIssue {
  return { code, field, message };
}

function validateMeasurement(requirement: MeasurementRequirement, value: MeasurementValue | undefined): ValidationIssue[] {
  const field = `measurements.${requirement.key}`;
  if (value === undefined) return [issue("MEASUREMENT_REQUIRED", field, `${requirement.label} is required`)];
  const expectsList = requirement.valueType.endsWith("_LIST");
  if (expectsList !== Array.isArray(value)) return [issue("MEASUREMENT_TYPE_INVALID", field, `${requirement.label} has the wrong value type`)];
  const values = Array.isArray(value) ? value : [value];
  if (values.length === 0) return [issue("MEASUREMENT_REQUIRED", field, `${requirement.label} must contain at least one value`)];
  return values.flatMap((item, index) => {
    const itemField = `${field}${Array.isArray(value) ? `[${index}]` : ""}`;
    if (!Number.isFinite(item) || item <= 0) return [issue("MEASUREMENT_INVALID", itemField, `${requirement.label} must be a positive finite number`)];
    const result: ValidationIssue[] = [];
    if (requirement.minimumCustomerValue !== undefined && item < requirement.minimumCustomerValue) result.push(issue("MEASUREMENT_BELOW_MINIMUM", itemField, `${requirement.label} is below its minimum`));
    if (requirement.maximumCustomerValue !== undefined && item > requirement.maximumCustomerValue) result.push(issue("MEASUREMENT_ABOVE_MAXIMUM", itemField, `${requirement.label} is above its maximum`));
    return result;
  });
}

function scalar(configuration: CurtainConfiguration, key: "coverage_width" | "door_width" | "finished_drop" | "door_height"): number | null {
  const value = configuration.measurements[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function validateMeasurementPlausibility(configuration: CurtainConfiguration, rules: MeasurementValidationRules): ValidationResult {
  const issues: ValidationIssue[] = [];
  const width = scalar(configuration, "coverage_width") ?? scalar(configuration, "door_width");
  const drop = scalar(configuration, "finished_drop") ?? scalar(configuration, "door_height");
  if (width !== null && rules.minimumWidthCm !== null && width < rules.minimumWidthCm) issues.push(issue("WIDTH_BELOW_MINIMUM", "measurements.coverage_width", "Coverage width is below the configured minimum"));
  if (width !== null && rules.maximumWidthCm !== null && width > rules.maximumWidthCm) issues.push(issue("WIDTH_ABOVE_MAXIMUM", "measurements.coverage_width", "Coverage width exceeds the configured maximum"));
  if (drop !== null && rules.minimumDropCm !== null && drop < rules.minimumDropCm) issues.push(issue("DROP_BELOW_MINIMUM", "measurements.finished_drop", "Finished drop is below the configured minimum"));
  if (drop !== null && rules.maximumDropCm !== null && drop > rules.maximumDropCm) issues.push(issue("DROP_ABOVE_MAXIMUM", "measurements.finished_drop", "Finished drop exceeds the configured maximum"));
  if (rules.suspiciousLikelyMillimetresAtCm !== null) {
    for (const [key, value] of Object.entries(configuration.measurements)) {
      const values = Array.isArray(value) ? value : [value];
      if (!key.includes("degrees") && values.some((item) => typeof item === "number" && item >= rules.suspiciousLikelyMillimetresAtCm!)) {
        issues.push(issue("SUSPICIOUS_MM_CM_INPUT", `measurements.${key}`, "Value looks like millimetres but the customer unit is centimetres"));
      }
    }
  }
  return { valid: issues.length === 0, issues };
}

export function validateSpecialistGeometry(configuration: CurtainConfiguration, windowType: WindowTypeMaster): ValidationResult {
  const issues: ValidationIssue[] = [];
  if (!["SYMMETRICAL_APEX", "TRIANGLE", "GABLE"].includes(windowType.geometryType)) return { valid: true, issues };
  const number = (key: Parameters<typeof scalar>[1] | "peak_height" | "left_vertical" | "right_vertical" | "left_slope" | "right_slope") => {
    const value = configuration.measurements[key];
    return typeof value === "number" ? value : null;
  };
  const width = number("coverage_width");
  const peak = number("peak_height");
  const leftVertical = number("left_vertical");
  const rightVertical = number("right_vertical");
  const leftSlope = number("left_slope");
  const rightSlope = number("right_slope");
  if ([width, peak, leftVertical, rightVertical, leftSlope, rightSlope].some((value) => value === null)) return { valid: true, issues };
  if (peak! <= Math.max(leftVertical!, rightVertical!)) issues.push(issue("GEOMETRY_PEAK_INCONSISTENT", "measurements.peak_height", "Peak height must exceed the vertical heights"));
  if (leftSlope! + rightSlope! <= width!) issues.push(issue("GEOMETRY_TRIANGLE_INCONSISTENT", "measurements", "Slope lengths cannot span the supplied base width"));
  if (windowType.geometryType === "SYMMETRICAL_APEX") {
    const toleranceCm = 2;
    if (Math.abs(leftVertical! - rightVertical!) > toleranceCm || Math.abs(leftSlope! - rightSlope!) > toleranceCm) {
      issues.push(issue("SYMMETRICAL_APEX_INCONSISTENT", "measurements", "A symmetrical apex requires matching vertical and slope dimensions within the draft tolerance"));
    }
    const expectedSlope = Math.hypot(width! / 2, peak! - leftVertical!);
    if (Math.abs(expectedSlope - leftSlope!) > toleranceCm) issues.push(issue("APEX_PYTHAGORAS_INCONSISTENT", "measurements.left_slope", "Apex dimensions are mathematically inconsistent"));
  }
  return { valid: issues.length === 0, issues };
}

export function validateConfiguration(configuration: CurtainConfiguration, windowType: WindowTypeMaster, fabric: FabricSpec, measurementRules?: MeasurementValidationRules): ValidationResult {
  const issues = windowType.requiredMeasurements.flatMap((requirement) => validateMeasurement(requirement, configuration.measurements[requirement.key]));
  if (configuration.customerLengthUnit !== "CM") issues.push(issue("CUSTOMER_UNIT_INVALID", "customerLengthUnit", "Customer measurements must be recorded in centimetres"));
  if (!windowType.allowedMeasurementBases.includes(configuration.measurementBasis)) issues.push(issue("MEASUREMENT_BASIS_NOT_ALLOWED", "measurementBasis", "Measurement basis is not allowed for this window type"));
  if (configuration.windowTypeSlug !== windowType.slug) issues.push(issue("WINDOW_TYPE_MISMATCH", "windowTypeSlug", "Configuration and supplied window type do not match"));
  if (configuration.fabricSpecId !== fabric.id) issues.push(issue("FABRIC_MISMATCH", "fabricSpecId", "Configuration and supplied fabric do not match"));
  if (configuration.colour.trim().toLowerCase() !== fabric.colour.trim().toLowerCase()) issues.push(issue("FABRIC_COLOUR_MISMATCH", "colour", "Configuration colour does not match the selected FabricSpec"));
  if (fabric.recordLifecycle !== "ACTIVE") issues.push(issue("FABRIC_NOT_ACTIVE", "fabricSpecId", "Only an active FabricSpec can start a new configuration"));
  if (fabric.supplierAvailability === "DISCONTINUED") issues.push(issue("FABRIC_DISCONTINUED", "fabricSpecId", "Discontinued fabric cannot start a new configuration"));
  if (!windowType.availableCurtainHeadings.includes(configuration.heading)) issues.push(issue("HEADING_NOT_ALLOWED_FOR_WINDOW", "heading", "Heading is not allowed for this window type"));
  if (!fabric.allowedHeadings.includes(configuration.heading)) issues.push(issue("HEADING_NOT_ALLOWED_FOR_FABRIC", "heading", "Heading is not allowed for this fabric"));
  if (!windowType.allowedLiningOptions.includes(configuration.lining)) issues.push(issue("LINING_NOT_ALLOWED_FOR_WINDOW", "lining", "Lining is not allowed for this window type"));
  if (!fabric.allowedLinings.includes(configuration.lining)) issues.push(issue("LINING_NOT_ALLOWED_FOR_FABRIC", "lining", "Lining is not allowed for this fabric"));
  if (!windowType.pairSingleAvailability.includes(configuration.construction)) issues.push(issue("CONSTRUCTION_NOT_ALLOWED", "construction", "Pair/single selection is not allowed"));
  if (!fabric.suitableWindowTypeSlugs.includes("*") && !fabric.suitableWindowTypeSlugs.includes(windowType.slug)) issues.push(issue("FABRIC_NOT_SUITABLE_FOR_WINDOW", "fabricSpecId", "Fabric is not approved for this window type"));
  if (windowType.photoRequired && configuration.attachments.photoReferences.length === 0) issues.push(issue("PHOTO_REQUIRED", "attachments.photoReferences", "At least one project photo is required"));
  if (windowType.drawingRequired && configuration.attachments.drawingReferences.length === 0) issues.push(issue("DRAWING_REQUIRED", "attachments.drawingReferences", "A drawing is required"));
  if (!Number.isInteger(configuration.numberOfSegments) || configuration.numberOfSegments < 1) issues.push(issue("SEGMENT_COUNT_INVALID", "numberOfSegments", "Number of segments must be a positive integer"));
  issues.push(...validateSpecialistGeometry(configuration, windowType).issues);
  if (measurementRules) issues.push(...validateMeasurementPlausibility(configuration, measurementRules).issues);
  return { valid: issues.length === 0, issues };
}

export function assertValidConfiguration(configuration: CurtainConfiguration, windowType: WindowTypeMaster, fabric: FabricSpec, measurementRules?: MeasurementValidationRules): void {
  const result = validateConfiguration(configuration, windowType, fabric, measurementRules);
  if (!result.valid) throw new DecisionEngineValidationError("Curtain configuration is incomplete or invalid", result.issues);
}

export function validateWindowTypeMasterData(windowTypes: WindowTypeMaster[]): ValidationResult {
  const issues: ValidationIssue[] = [];
  const slugs = new Set<string>();
  for (const windowType of windowTypes) {
    if (slugs.has(windowType.slug)) issues.push(issue("DUPLICATE_WINDOW_TYPE_SLUG", `windowTypes.${windowType.slug}`, "Window type slug must be unique"));
    slugs.add(windowType.slug);
    if (windowType.allowedMeasurementBases.length === 0) issues.push(issue("WIDTH_BASIS_REQUIRED", `windowTypes.${windowType.slug}.allowedMeasurementBases`, "At least one width basis is required"));
    if (windowType.instantPricingAllowed && windowType.complexityClass === "SPECIALIST") issues.push(issue("UNSAFE_INSTANT_PRICING", `windowTypes.${windowType.slug}.instantPricingAllowed`, "Specialist window types cannot default to instant pricing"));
  }
  for (const windowType of windowTypes) for (const related of windowType.relatedWindowTypes) if (!slugs.has(related)) issues.push(issue("RELATED_WINDOW_TYPE_NOT_FOUND", `windowTypes.${windowType.slug}.relatedWindowTypes`, `Related window type does not exist: ${related}`));
  return { valid: issues.length === 0, issues };
}

export function validateFabricSpec(fabric: FabricSpec): ValidationResult {
  const issues: ValidationIssue[] = [];
  if (!fabric.uniqueSku.trim()) issues.push(issue("FABRIC_SKU_REQUIRED", "uniqueSku", "A unique SKU is required"));
  if (!Number.isFinite(fabric.usableWidthMm) || fabric.usableWidthMm <= 0) issues.push(issue("FABRIC_WIDTH_INVALID", "usableWidthMm", "Usable fabric width must be positive"));
  if (Math.abs(fabric.composition.reduce((sum, part) => sum + part.percentage, 0) - 100) > 0.001) issues.push(issue("FABRIC_COMPOSITION_INVALID", "composition", "Fabric composition must total 100 percent"));
  if (fabric.patternMatchType !== "RANDOM_MATCH" && (!fabric.verticalRepeatMm || fabric.verticalRepeatMm <= 0)) issues.push(issue("VERTICAL_REPEAT_REQUIRED", "verticalRepeatMm", "Patterned fabric requires a vertical repeat"));
  if (fabric.fixtureOnly && fabric.googleFeedEligibility.eligible) issues.push(issue("FIXTURE_CANNOT_ENTER_GOOGLE_FEED", "googleFeedEligibility.eligible", "Fixture fabrics cannot be feed eligible"));
  return { valid: issues.length === 0, issues };
}

export function canPromiseFirmLeadTime(fabric: FabricSpec): boolean {
  return fabric.recordLifecycle === "ACTIVE" && ["ACTIVE", "LOW_STOCK"].includes(fabric.supplierAvailability);
}

function validateMoney(value: Money | null, field: string, required: boolean, issues: ValidationIssue[]): void {
  if (value === null) {
    if (required) issues.push(issue("COMMERCIAL_INPUT_REQUIRED", field, `Commercial input is required before activation: ${field}`));
  } else if (!Number.isFinite(value.amountMinor) || value.amountMinor < 0 || value.currency !== "GBP") {
    issues.push(issue("MONEY_INVALID", field, `${field} must be a non-negative GBP minor-unit amount`));
  }
}

export function validateDecisionRegistry(registry: DecisionRegistry): ValidationResult {
  const issues: ValidationIssue[] = [];
  const ids = new Set<string>();
  for (const record of registry.decisions) {
    if (ids.has(record.decisionId)) issues.push(issue("DUPLICATE_DECISION_ID", `decisions.${record.decisionId}`, "Decision IDs must be unique"));
    ids.add(record.decisionId);
    if (record.blocksProductionActivation !== (record.status !== "LOCKED")) issues.push(issue("DECISION_BLOCKER_MISMATCH", `decisions.${record.decisionId}`, "Draft and workroom-confirmation decisions must block activation"));
  }
  return { valid: issues.length === 0, issues };
}

export function validatePricingRuleSet(rules: PricingRuleSet): ValidationResult {
  const issues: ValidationIssue[] = [];
  if (!rules.version.trim()) issues.push(issue("RULE_VERSION_REQUIRED", "version", "Pricing rules require an immutable version"));
  if (rules.rounding.incrementMinor !== 100 || rules.rounding.mode !== "NEAREST") issues.push(issue("ROUNDING_RULE_INVALID", "rounding", "Final total must round to the nearest whole pound"));
  if (!rules.vat.baseRatesStoredNet || !rules.vat.retailPricesPresentedGross) issues.push(issue("VAT_BASIS_INVALID", "vat", "Component rates must support net storage and gross retail presentation"));
  if (rules.minimumOrders.shippingCountsTowardMinimum) issues.push(issue("SHIPPING_MINIMUM_SEQUENCE_INVALID", "minimumOrders.shippingCountsTowardMinimum", "Shipping must not count toward the goods minimum"));
  if (!rules.minimumOrders.samplesExempt) issues.push(issue("SAMPLE_MINIMUM_EXEMPTION_REQUIRED", "minimumOrders.samplesExempt", "Samples must be exempt from order minimums"));
  if (rules.internationalShippingEnabled) issues.push(issue("INTERNATIONAL_SHIPPING_NOT_APPROVED", "internationalShippingEnabled", "International shipping must remain disabled for launch"));
  for (const [heading, rule] of Object.entries(rules.headingRules)) {
    if (rule && rule.fullnessFactor.value !== null && rule.fullnessFactor.value <= 0) issues.push(issue("FULLNESS_INVALID", `headingRules.${heading}.fullnessFactor`, "Fullness must be positive"));
  }
  return { valid: issues.length === 0, issues };
}

export function validatePricingRuleActivation(rules: PricingRuleSet, registry: DecisionRegistry): ValidationResult {
  const issues = [...validatePricingRuleSet(rules).issues, ...validateDecisionRegistry(registry).issues];
  if (rules.lifecycle !== "VALIDATED" && rules.lifecycle !== "ACTIVE") issues.push(issue("RULESET_NOT_VALIDATED", "lifecycle", "Only a validated ruleset may be activated"));
  if (rules.decisionRegistryVersion !== registry.registryVersion) issues.push(issue("DECISION_REGISTRY_VERSION_MISMATCH", "decisionRegistryVersion", "Ruleset and decision registry versions must match"));
  for (const record of registry.decisions.filter((item) => item.blocksProductionActivation)) issues.push(issue("UNCONFIRMED_BUSINESS_DECISION", `decisions.${record.decisionId}`, `${record.decisionId} is ${record.status}`));
  const governedValues = [
    rules.allowedCustomerWidthBases,
    rules.constructionAllowances.topAllowanceMm,
    rules.constructionAllowances.bottomHemAllowanceMm,
    rules.constructionAllowances.centreOverlapMm,
    rules.constructionAllowances.leftReturnMm,
    rules.constructionAllowances.rightReturnMm,
    rules.patternRules.randomMatch,
    rules.patternRules.straightMatch,
    rules.patternRules.halfDropMatch,
    rules.patternRules.exactCentringAndJoining,
    rules.pairSingleConstruction,
  ];
  for (const governed of governedValues) if (governed.status !== "LOCKED" || governed.value === null) issues.push(issue("GOVERNED_VALUE_NOT_LOCKED", `decisions.${governed.decisionId}`, "Every executable governed value must be locked and resolved before activation"));
  for (const [heading, rule] of Object.entries(rules.headingRules)) {
    if (!rule || rule.fullnessFactor.value === null) issues.push(issue("HEADING_RULE_REQUIRED", `headingRules.${heading}`, "Heading fullness is required before activation"));
    if (rule) {
      if (rule.fullnessFactor.status !== "LOCKED" || rule.voileFullnessFactor.status !== "LOCKED" || rule.voileFullnessFactor.value === null) issues.push(issue("HEADING_RULE_NOT_LOCKED", `headingRules.${heading}`, "Heading and voile fullness must be locked before activation"));
      validateMoney(rule.headingLabourNetPerWidth, `headingRules.${heading}.headingLabourNetPerWidth`, true, issues);
    }
  }
  validateMoney(rules.baseMakeupLabourNetPerWidth, "baseMakeupLabourNetPerWidth", true, issues);
  validateMoney(rules.patternMatchLabourNetPerWidth, "patternMatchLabourNetPerWidth", true, issues);
  for (const key of ["STANDARD", "BLACKOUT", "THERMAL"] as const) {
    const rule = rules.liningRules[key];
    if (rule.usableWidthMm === null || rule.topAllowanceMm === null || rule.bottomAllowanceMm === null) issues.push(issue("LINING_RULE_INCOMPLETE", `liningRules.${key}`, "Lining dimensions and allowances are required"));
    validateMoney(rule.materialRateNetPerMetre, `liningRules.${key}.materialRateNetPerMetre`, true, issues);
    validateMoney(rule.labourNetPerWidth, `liningRules.${key}.labourNetPerWidth`, true, issues);
  }
  const interlining = rules.interliningRules.INTERLINING;
  if (interlining.usableWidthMm === null) issues.push(issue("INTERLINING_RULE_INCOMPLETE", "interliningRules.INTERLINING", "Interlining dimensions are required"));
  validateMoney(interlining.materialRateNetPerMetre, "interliningRules.INTERLINING.materialRateNetPerMetre", true, issues);
  validateMoney(interlining.labourNetPerWidth, "interliningRules.INTERLINING.labourNetPerWidth", true, issues);
  validateMoney(rules.minimumOrders.standardMtmGross, "minimumOrders.standardMtmGross", true, issues);
  validateMoney(rules.minimumOrders.premiumInterlinedGross, "minimumOrders.premiumInterlinedGross", true, issues);
  validateMoney(rules.minimumOrders.specialistReviewedGross, "minimumOrders.specialistReviewedGross", true, issues);
  if (rules.vat.rateBasisPoints === null) issues.push(issue("VAT_RATE_REQUIRED", "vat.rateBasisPoints", "VAT rate is required before activation"));
  const shipping = rules.shippingZones.find((zone) => zone.code === "UK_MAINLAND" && zone.enabled);
  if (!shipping) issues.push(issue("UK_MAINLAND_SHIPPING_REQUIRED", "shippingZones", "Enabled UK Mainland supply-only shipping is required"));
  else validateMoney(shipping.rateNet, "shippingZones.UK_MAINLAND.rateNet", true, issues);
  if (rules.markupTiers.length === 0) issues.push(issue("MARKUP_POLICY_REQUIRED", "markupTiers", "A validated fabric markup policy is required"));
  for (const accessory of rules.accessories.filter((item) => !item.quoteOnly)) {
    validateMoney(accessory.unitPriceNet, `accessories.${accessory.code}.unitPriceNet`, true, issues);
    if (accessory.vatRateBasisPoints === null) issues.push(issue("ACCESSORY_VAT_REQUIRED", `accessories.${accessory.code}.vatRateBasisPoints`, "Launch accessories require a VAT rate"));
  }
  for (const packaging of rules.packagingRules) {
    validateMoney(packaging.internalCostNet, `packagingRules.${packaging.packagingClass}.internalCostNet`, true, issues);
    if (packaging.packagingClass !== "SPECIALIST" && packaging.maximumFabricWidths === null && packaging.maximumFinishedWeightKg === null && packaging.maximumLongestSideMm === null) issues.push(issue("PACKAGING_THRESHOLD_REQUIRED", `packagingRules.${packaging.packagingClass}`, "Non-specialist packaging requires at least one classification threshold"));
  }
  if ([rules.measurementValidation.minimumWidthCm, rules.measurementValidation.maximumWidthCm, rules.measurementValidation.minimumDropCm, rules.measurementValidation.maximumDropCm, rules.measurementValidation.suspiciousLikelyMillimetresAtCm].some((value) => value === null)) issues.push(issue("MEASUREMENT_LIMITS_REQUIRED", "measurementValidation", "Measurement limits and unit-confusion threshold are required"));
  return { valid: issues.length === 0, issues };
}
