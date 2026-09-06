import { DecisionEngineValidationError } from "./errors";
import type {
  CurtainConfiguration,
  FabricSpec,
  MeasurementRequirement,
  MeasurementValue,
  Money,
  PricingRuleSet,
  ValidationIssue,
  ValidationResult,
  WindowTypeMaster,
} from "./types";

function validateMeasurement(
  requirement: MeasurementRequirement,
  value: MeasurementValue | undefined,
): ValidationIssue[] {
  if (value === undefined) {
    return [
      {
        code: "MEASUREMENT_REQUIRED",
        field: `measurements.${requirement.key}`,
        message: `${requirement.label} is required`,
      },
    ];
  }

  const expectsList = requirement.valueType.endsWith("_LIST");
  if (expectsList !== Array.isArray(value)) {
    return [
      {
        code: "MEASUREMENT_TYPE_INVALID",
        field: `measurements.${requirement.key}`,
        message: `${requirement.label} has the wrong value type`,
      },
    ];
  }

  const values = Array.isArray(value) ? value : [value];
  if (values.length === 0) {
    return [
      {
        code: "MEASUREMENT_REQUIRED",
        field: `measurements.${requirement.key}`,
        message: `${requirement.label} must contain at least one value`,
      },
    ];
  }

  const issues: ValidationIssue[] = [];
  values.forEach((item, index) => {
    const suffix = Array.isArray(value) ? `[${index}]` : "";
    if (!Number.isFinite(item) || item <= 0) {
      issues.push({
        code: "MEASUREMENT_INVALID",
        field: `measurements.${requirement.key}${suffix}`,
        message: `${requirement.label} must be a positive finite number`,
      });
      return;
    }
    if (requirement.minimum !== undefined && item < requirement.minimum) {
      issues.push({
        code: "MEASUREMENT_BELOW_MINIMUM",
        field: `measurements.${requirement.key}${suffix}`,
        message: `${requirement.label} is below its minimum`,
      });
    }
    if (requirement.maximum !== undefined && item > requirement.maximum) {
      issues.push({
        code: "MEASUREMENT_ABOVE_MAXIMUM",
        field: `measurements.${requirement.key}${suffix}`,
        message: `${requirement.label} is above its maximum`,
      });
    }
  });
  return issues;
}

export function validateConfiguration(
  configuration: CurtainConfiguration,
  windowType: WindowTypeMaster,
  fabric: FabricSpec,
): ValidationResult {
  const issues = windowType.requiredMeasurements.flatMap((requirement) =>
    validateMeasurement(requirement, configuration.measurements[requirement.key]),
  );

  if (configuration.windowTypeSlug !== windowType.slug) {
    issues.push({
      code: "WINDOW_TYPE_MISMATCH",
      field: "windowTypeSlug",
      message: "Configuration and supplied window type do not match",
    });
  }
  if (configuration.fabricSpecId !== fabric.id) {
    issues.push({
      code: "FABRIC_MISMATCH",
      field: "fabricSpecId",
      message: "Configuration and supplied fabric do not match",
    });
  }
  if (configuration.colour.trim().toLowerCase() !== fabric.colour.trim().toLowerCase()) {
    issues.push({
      code: "FABRIC_COLOUR_MISMATCH",
      field: "colour",
      message: "Configuration colour does not match the selected fabric specification",
    });
  }
  if (!windowType.availableCurtainHeadings.includes(configuration.heading)) {
    issues.push({
      code: "HEADING_NOT_ALLOWED_FOR_WINDOW",
      field: "heading",
      message: "Selected heading is not allowed for this window type",
    });
  }
  if (!fabric.allowedHeadings.includes(configuration.heading)) {
    issues.push({
      code: "HEADING_NOT_ALLOWED_FOR_FABRIC",
      field: "heading",
      message: "Selected heading is not allowed for this fabric",
    });
  }
  if (!windowType.allowedLiningOptions.includes(configuration.lining)) {
    issues.push({
      code: "LINING_NOT_ALLOWED_FOR_WINDOW",
      field: "lining",
      message: "Selected lining is not allowed for this window type",
    });
  }
  if (!fabric.allowedLinings.includes(configuration.lining)) {
    issues.push({
      code: "LINING_NOT_ALLOWED_FOR_FABRIC",
      field: "lining",
      message: "Selected lining is not allowed for this fabric",
    });
  }
  if (!windowType.pairSingleAvailability.includes(configuration.construction)) {
    issues.push({
      code: "CONSTRUCTION_NOT_ALLOWED",
      field: "construction",
      message: "Pair/single selection is not allowed for this window type",
    });
  }
  if (
    !fabric.suitableWindowTypeSlugs.includes("*") &&
    !fabric.suitableWindowTypeSlugs.includes(windowType.slug)
  ) {
    issues.push({
      code: "FABRIC_NOT_SUITABLE_FOR_WINDOW",
      field: "fabricSpecId",
      message: "Selected fabric is not approved for this window type",
    });
  }
  if (windowType.photoRequired && configuration.attachments.photoReferences.length === 0) {
    issues.push({
      code: "PHOTO_REQUIRED",
      field: "attachments.photoReferences",
      message: "At least one project photo is required",
    });
  }
  if (
    windowType.drawingRequired &&
    configuration.attachments.drawingReferences.length === 0
  ) {
    issues.push({
      code: "DRAWING_REQUIRED",
      field: "attachments.drawingReferences",
      message: "A drawing is required",
    });
  }

  return { valid: issues.length === 0, issues };
}

export function assertValidConfiguration(
  configuration: CurtainConfiguration,
  windowType: WindowTypeMaster,
  fabric: FabricSpec,
): void {
  const result = validateConfiguration(configuration, windowType, fabric);
  if (!result.valid) {
    throw new DecisionEngineValidationError(
      "Curtain configuration is incomplete or invalid",
      result.issues,
    );
  }
}

export function validateWindowTypeMasterData(
  windowTypes: WindowTypeMaster[],
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const slugs = new Set<string>();

  for (const windowType of windowTypes) {
    if (slugs.has(windowType.slug)) {
      issues.push({
        code: "DUPLICATE_WINDOW_TYPE_SLUG",
        field: `windowTypes.${windowType.slug}`,
        message: `Duplicate window type slug: ${windowType.slug}`,
      });
    }
    slugs.add(windowType.slug);
    if (windowType.instantPricingAllowed && windowType.complexityClass === "SPECIALIST") {
      issues.push({
        code: "UNSAFE_INSTANT_PRICING",
        field: `windowTypes.${windowType.slug}.instantPricingAllowed`,
        message: "Specialist window types cannot default to instant pricing",
      });
    }
  }

  for (const windowType of windowTypes) {
    for (const relatedSlug of windowType.relatedWindowTypes) {
      if (!slugs.has(relatedSlug)) {
        issues.push({
          code: "RELATED_WINDOW_TYPE_NOT_FOUND",
          field: `windowTypes.${windowType.slug}.relatedWindowTypes`,
          message: `Related window type does not exist: ${relatedSlug}`,
        });
      }
    }
  }

  return { valid: issues.length === 0, issues };
}

export function validateFabricSpec(fabric: FabricSpec): ValidationResult {
  const issues: ValidationIssue[] = [];
  const compositionTotal = fabric.composition.reduce(
    (total, part) => total + part.percentage,
    0,
  );

  if (!fabric.uniqueSku.trim()) {
    issues.push({
      code: "FABRIC_SKU_REQUIRED",
      field: "uniqueSku",
      message: "A unique SKU is required",
    });
  }
  if (!Number.isFinite(fabric.usableWidthMm) || fabric.usableWidthMm <= 0) {
    issues.push({
      code: "FABRIC_WIDTH_INVALID",
      field: "usableWidthMm",
      message: "Usable fabric width must be positive",
    });
  }
  if (Math.abs(compositionTotal - 100) > 0.001) {
    issues.push({
      code: "FABRIC_COMPOSITION_INVALID",
      field: "composition",
      message: "Fabric composition must total 100 percent",
    });
  }
  if (fabric.fixtureOnly && fabric.googleFeedEligibility.eligible) {
    issues.push({
      code: "FIXTURE_CANNOT_ENTER_GOOGLE_FEED",
      field: "googleFeedEligibility.eligible",
      message: "Fixture fabrics cannot be Google-feed eligible",
    });
  }

  return { valid: issues.length === 0, issues };
}

function validateMoney(
  value: Money | null,
  field: string,
  required: boolean,
  issues: ValidationIssue[],
): void {
  if (value === null) {
    if (required) {
      issues.push({
        code: "COMMERCIAL_INPUT_REQUIRED",
        field,
        message: `Commercial input is required before activation: ${field}`,
      });
    }
    return;
  }
  if (!Number.isInteger(value.amountMinor) || value.amountMinor < 0) {
    issues.push({
      code: "MONEY_INVALID",
      field,
      message: `${field} must use a non-negative integer minor-unit amount`,
    });
  }
}

export function validatePricingRuleSet(rules: PricingRuleSet): ValidationResult {
  const issues: ValidationIssue[] = [];
  const requiresCommercialInputs = rules.status === "ACTIVE";

  if (!rules.version.trim()) {
    issues.push({
      code: "RULE_VERSION_REQUIRED",
      field: "version",
      message: "Pricing rules require an immutable version",
    });
  }
  if (rules.status === "ACTIVE" && !rules.effectiveFrom) {
    issues.push({
      code: "RULE_EFFECTIVE_DATE_REQUIRED",
      field: "effectiveFrom",
      message: "Active pricing rules require an effective-from date",
    });
  }

  for (const [heading, rule] of Object.entries(rules.headingRules)) {
    if (!rule) {
      if (requiresCommercialInputs) {
        issues.push({
          code: "HEADING_RULE_REQUIRED",
          field: `headingRules.${heading}`,
          message: `Heading rule is required before activation: ${heading}`,
        });
      }
      continue;
    }
    if (rule.fullnessFactor <= 0 || rule.headingAllowanceMm < 0) {
      issues.push({
        code: "HEADING_RULE_INVALID",
        field: `headingRules.${heading}`,
        message: "Fullness must be positive and allowance cannot be negative",
      });
    }
    validateMoney(
      rule.labourPerWidth,
      `headingRules.${heading}.labourPerWidth`,
      requiresCommercialInputs,
      issues,
    );
  }

  validateMoney(
    rules.baseLabourPerWidth,
    "baseLabourPerWidth",
    requiresCommercialInputs,
    issues,
  );
  validateMoney(
    rules.patternMatchingLabourPerWidth,
    "patternMatchingLabourPerWidth",
    requiresCommercialInputs,
    issues,
  );
  validateMoney(rules.packaging.base, "packaging.base", requiresCommercialInputs, issues);
  validateMoney(
    rules.minimumOrderValue,
    "minimumOrderValue",
    requiresCommercialInputs,
    issues,
  );

  for (const lining of ["STANDARD", "BLACKOUT", "THERMAL"] as const) {
    const rule = rules.liningRules[lining];
    if (!rule && requiresCommercialInputs) {
      issues.push({
        code: "LINING_RULE_REQUIRED",
        field: `liningRules.${lining}`,
        message: `Lining rule is required before activation: ${lining}`,
      });
    } else if (rule) {
      validateMoney(
        rule.sellingRatePerMetre,
        `liningRules.${lining}.sellingRatePerMetre`,
        requiresCommercialInputs,
        issues,
      );
    }
  }
  for (const interlining of ["DOMETTE", "BUMP"] as const) {
    const rule = rules.interliningRules[interlining];
    if (!rule && requiresCommercialInputs) {
      issues.push({
        code: "INTERLINING_RULE_REQUIRED",
        field: `interliningRules.${interlining}`,
        message: `Interlining rule is required before activation: ${interlining}`,
      });
    } else if (rule) {
      validateMoney(
        rule.sellingRatePerMetre,
        `interliningRules.${interlining}.sellingRatePerMetre`,
        requiresCommercialInputs,
        issues,
      );
    }
  }

  if (requiresCommercialInputs && Object.keys(rules.shipping).length === 0) {
    issues.push({
      code: "SHIPPING_RULE_REQUIRED",
      field: "shipping",
      message: "At least one shipping zone is required before activation",
    });
  }
  for (const [zone, price] of Object.entries(rules.shipping)) {
    validateMoney(price, `shipping.${zone}`, requiresCommercialInputs, issues);
  }
  if (requiresCommercialInputs && rules.vat.rateBasisPoints === null) {
    issues.push({
      code: "VAT_RULE_REQUIRED",
      field: "vat.rateBasisPoints",
      message: "VAT treatment is required before activation",
    });
  }
  if (!Number.isInteger(rules.rounding.incrementMinor) || rules.rounding.incrementMinor <= 0) {
    issues.push({
      code: "ROUNDING_RULE_INVALID",
      field: "rounding.incrementMinor",
      message: "Rounding increment must be a positive integer minor-unit amount",
    });
  }

  return { valid: issues.length === 0, issues };
}
