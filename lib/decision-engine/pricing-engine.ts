import { MissingCommercialRuleError } from "./errors";
import { assertValidConfiguration } from "./validation";
import type {
  CalculationResult,
  ConstructionType,
  CurtainConfiguration,
  FabricSpec,
  MaterialPricingRule,
  Money,
  PatternMatchType,
  PriceComponent,
  PricingRuleSet,
  SurchargeRule,
  WidthAllocation,
  WindowTypeMaster,
} from "./types";

export interface CalculatePriceInput {
  configuration: CurtainConfiguration;
  windowType: WindowTypeMaster;
  fabric: FabricSpec;
  rules: PricingRuleSet;
  shippingZone: string;
}

function requiredMoney(value: Money | null, path: string, currency: string): Money {
  if (value === null) throw new MissingCommercialRuleError(path);
  if (value.currency !== currency) {
    throw new Error(`Currency mismatch at ${path}`);
  }
  return value;
}

function component(
  code: string,
  description: string,
  amountMinor: number,
  metadata?: Record<string, string | number | boolean>,
): PriceComponent {
  return {
    code,
    description,
    amount: { amountMinor: Math.round(amountMinor), currency: "GBP" },
    metadata,
  };
}

export function calculateNumberOfWidths(
  finishedWidthMm: number,
  fullnessFactor: number,
  usableFabricWidthMm: number,
): number {
  if (
    !Number.isFinite(finishedWidthMm) ||
    !Number.isFinite(fullnessFactor) ||
    !Number.isFinite(usableFabricWidthMm) ||
    finishedWidthMm <= 0 ||
    fullnessFactor <= 0 ||
    usableFabricWidthMm <= 0
  ) {
    throw new RangeError("Width inputs must be positive finite numbers");
  }
  return Math.ceil((finishedWidthMm * fullnessFactor) / usableFabricWidthMm);
}

export function allocateWidths(
  calculatedWidths: number,
  construction: ConstructionType,
): WidthAllocation {
  if (!Number.isInteger(calculatedWidths) || calculatedWidths <= 0) {
    throw new RangeError("Calculated widths must be a positive integer");
  }
  if (construction === "SINGLE") {
    return { totalWidths: calculatedWidths, curtainWidths: [calculatedWidths] };
  }

  const balancedTotal = calculatedWidths % 2 === 0 ? calculatedWidths : calculatedWidths + 1;
  return {
    totalWidths: balancedTotal,
    curtainWidths: [balancedTotal / 2, balancedTotal / 2],
  };
}

export function adjustCutLengthForPattern(
  cutLengthMm: number,
  verticalRepeatMm: number | null,
  patternMatchType: PatternMatchType,
): number {
  if (!Number.isFinite(cutLengthMm) || cutLengthMm <= 0) {
    throw new RangeError("Cut length must be positive");
  }
  if (
    verticalRepeatMm === null ||
    patternMatchType === "PLAIN" ||
    patternMatchType === "RANDOM_MATCH"
  ) {
    return cutLengthMm;
  }
  if (!Number.isFinite(verticalRepeatMm) || verticalRepeatMm <= 0) {
    throw new RangeError("Vertical repeat must be positive when pattern matching applies");
  }
  return Math.ceil(cutLengthMm / verticalRepeatMm) * verticalRepeatMm;
}

export function roundMetresUp(metres: number, increment: number): number {
  if (metres < 0 || increment <= 0) throw new RangeError("Invalid metre rounding input");
  const units = Math.ceil((metres - Number.EPSILON) / increment);
  return Number((units * increment).toFixed(6));
}

function applyRounding(value: number, increment: number, mode: "UP" | "DOWN" | "NEAREST") {
  if (!Number.isInteger(increment) || increment <= 0) {
    throw new RangeError("Price rounding increment must be a positive integer");
  }
  const scaled = value / increment;
  const rounded = mode === "UP" ? Math.ceil(scaled) : mode === "DOWN" ? Math.floor(scaled) : Math.round(scaled);
  return rounded * increment;
}

function calculateMaterial(
  code: string,
  description: string,
  finishedWidthMm: number,
  finishedDropMm: number,
  fullnessFactor: number,
  construction: ConstructionType,
  materialRule: MaterialPricingRule,
  currency: string,
): { component: PriceComponent; metres: number } {
  const widths = allocateWidths(
    calculateNumberOfWidths(finishedWidthMm, fullnessFactor, materialRule.usableWidthMm),
    construction,
  );
  const cutLength =
    finishedDropMm + materialRule.headingAllowanceMm + materialRule.hemAllowanceMm;
  const metres = roundMetresUp(
    (widths.totalWidths * cutLength) / 1000,
    materialRule.orderingIncrementMetres,
  );
  const rate = requiredMoney(materialRule.sellingRatePerMetre, `${code}.sellingRatePerMetre`, currency);
  return {
    metres,
    component: component(code, description, metres * rate.amountMinor, {
      metres,
      widths: widths.totalWidths,
    }),
  };
}

function calculateSurcharge(
  code: string,
  description: string,
  observed: number,
  rule: SurchargeRule | null,
  subtotalMinor: number,
  currency: string,
): PriceComponent | null {
  if (!rule || observed <= rule.threshold) return null;
  if (rule.fixedAmount === null && rule.percentageBasisPoints === null) {
    throw new MissingCommercialRuleError(code);
  }
  const fixed = rule.fixedAmount
    ? requiredMoney(rule.fixedAmount, `${code}.fixedAmount`, currency).amountMinor
    : 0;
  const percentage = rule.percentageBasisPoints
    ? (subtotalMinor * rule.percentageBasisPoints) / 10_000
    : 0;
  return component(code, description, fixed + percentage, {
    observed,
    threshold: rule.threshold,
  });
}

export function calculatePrice(input: CalculatePriceInput): CalculationResult {
  const { configuration, fabric, rules, windowType } = input;
  assertValidConfiguration(configuration, windowType, fabric);

  if (rules.status !== "ACTIVE") {
    throw new Error(`Pricing-rule version ${rules.version} is not active`);
  }
  const finishedWidthMm = configuration.measurements.track_width_mm;
  const finishedDropMm = configuration.measurements.finished_drop_mm;
  if (typeof finishedWidthMm !== "number" || typeof finishedDropMm !== "number") {
    throw new Error("Pricing currently requires scalar track width and finished drop");
  }

  const headingRule = rules.headingRules[configuration.heading];
  if (!headingRule) {
    throw new MissingCommercialRuleError(`headingRules.${configuration.heading}`);
  }
  const fabricRate = requiredMoney(
    fabric.sellingRatePerMetre,
    `fabric.${fabric.id}.sellingRatePerMetre`,
    rules.currency,
  );
  const baseLabour = requiredMoney(
    rules.baseLabourPerWidth,
    "baseLabourPerWidth",
    rules.currency,
  );
  const headingLabour = requiredMoney(
    headingRule.labourPerWidth,
    `headingRules.${configuration.heading}.labourPerWidth`,
    rules.currency,
  );
  const shipping = requiredMoney(
    rules.shipping[input.shippingZone] ?? null,
    `shipping.${input.shippingZone}`,
    rules.currency,
  );
  const packaging = requiredMoney(rules.packaging.base, "packaging.base", rules.currency);
  const minimumOrder = requiredMoney(
    rules.minimumOrderValue,
    "minimumOrderValue",
    rules.currency,
  );
  if (rules.vat.rateBasisPoints === null) {
    throw new MissingCommercialRuleError("vat.rateBasisPoints");
  }

  const calculatedWidths = calculateNumberOfWidths(
    finishedWidthMm,
    headingRule.fullnessFactor,
    fabric.usableWidthMm,
  );
  const fabricWidths = allocateWidths(calculatedWidths, configuration.construction);
  const fabricCutLengthMm =
    finishedDropMm + headingRule.headingAllowanceMm + rules.hemAllowanceMm;
  const adjustedFabricCutLengthMm = adjustCutLengthForPattern(
    fabricCutLengthMm,
    fabric.verticalRepeatMm,
    fabric.patternMatchType,
  );
  const fabricMetres = roundMetresUp(
    (fabricWidths.totalWidths * adjustedFabricCutLengthMm) / 1000,
    rules.fabricOrderingIncrementMetres,
  );

  const components: PriceComponent[] = [
    component("FABRIC", "Face fabric", fabricMetres * fabricRate.amountMinor, {
      metres: fabricMetres,
      widths: fabricWidths.totalWidths,
      usableWidthMm: fabric.usableWidthMm,
      adjustedCutLengthMm: adjustedFabricCutLengthMm,
    }),
  ];

  if (configuration.lining !== "UNLINED") {
    const liningRule = rules.liningRules[configuration.lining];
    if (!liningRule) {
      throw new MissingCommercialRuleError(`liningRules.${configuration.lining}`);
    }
    components.push(
      calculateMaterial(
        "LINING",
        `${configuration.lining.toLowerCase()} lining`,
        finishedWidthMm,
        finishedDropMm,
        headingRule.fullnessFactor,
        configuration.construction,
        liningRule,
        rules.currency,
      ).component,
    );
  }

  if (configuration.interlining !== "NONE") {
    const interliningRule = rules.interliningRules[configuration.interlining];
    if (!interliningRule) {
      throw new MissingCommercialRuleError(
        `interliningRules.${configuration.interlining}`,
      );
    }
    components.push(
      calculateMaterial(
        "INTERLINING",
        `${configuration.interlining.toLowerCase()} interlining`,
        finishedWidthMm,
        finishedDropMm,
        headingRule.fullnessFactor,
        configuration.construction,
        interliningRule,
        rules.currency,
      ).component,
    );
  }

  components.push(
    component(
      "BASE_LABOUR",
      "Make-up labour by fabric width",
      fabricWidths.totalWidths * baseLabour.amountMinor,
      { widths: fabricWidths.totalWidths },
    ),
    component(
      "HEADING_LABOUR",
      `${configuration.heading.toLowerCase()} heading labour`,
      fabricWidths.totalWidths * headingLabour.amountMinor,
      { widths: fabricWidths.totalWidths },
    ),
  );

  if (
    fabric.patternMatchType === "STRAIGHT_MATCH" ||
    fabric.patternMatchType === "HALF_DROP"
  ) {
    const patternLabour = requiredMoney(
      rules.patternMatchingLabourPerWidth,
      "patternMatchingLabourPerWidth",
      rules.currency,
    );
    components.push(
      component(
        "PATTERN_MATCHING_LABOUR",
        "Pattern-matching labour",
        fabricWidths.totalWidths * patternLabour.amountMinor,
        { widths: fabricWidths.totalWidths, match: fabric.patternMatchType },
      ),
    );
  }

  const currentSubtotal = () =>
    components.reduce((total, item) => total + item.amount.amountMinor, 0);
  const widthSurcharge = calculateSurcharge(
    "OVERSIZED_WIDTH",
    "Oversized width surcharge",
    finishedWidthMm,
    rules.oversizedWidthSurcharge,
    currentSubtotal(),
    rules.currency,
  );
  if (widthSurcharge) components.push(widthSurcharge);
  const dropSurcharge = calculateSurcharge(
    "OVERSIZED_DROP",
    "Oversized drop surcharge",
    finishedDropMm,
    rules.oversizedDropSurcharge,
    currentSubtotal(),
    rules.currency,
  );
  if (dropSurcharge) components.push(dropSurcharge);

  if (windowType.complexityClass !== "STANDARD") {
    const complexity = requiredMoney(
      rules.complexitySurcharges[windowType.complexityClass],
      `complexitySurcharges.${windowType.complexityClass}`,
      rules.currency,
    );
    components.push(
      component("COMPLEXITY", "Window complexity surcharge", complexity.amountMinor),
    );
  }

  for (const accessory of configuration.accessories) {
    if (!Number.isInteger(accessory.quantity) || accessory.quantity <= 0) {
      throw new RangeError(`Invalid quantity for accessory ${accessory.code}`);
    }
    const unitPrice = requiredMoney(
      rules.accessoryPrices[accessory.code] ?? null,
      `accessoryPrices.${accessory.code}`,
      rules.currency,
    );
    components.push(
      component(
        `ACCESSORY_${accessory.code}`,
        `Accessory ${accessory.code}`,
        unitPrice.amountMinor * accessory.quantity,
        { quantity: accessory.quantity },
      ),
    );
  }

  components.push(
    component("PACKAGING", "Packaging", packaging.amountMinor),
    component("SHIPPING", `Shipping: ${input.shippingZone}`, shipping.amountMinor),
  );

  const beforeMinimum = currentSubtotal();
  if (beforeMinimum < minimumOrder.amountMinor) {
    components.push(
      component(
        "MINIMUM_ORDER_ADJUSTMENT",
        "Minimum order adjustment",
        minimumOrder.amountMinor - beforeMinimum,
      ),
    );
  }

  const subtotalMinor = currentSubtotal();
  const vatRate = rules.vat.rateBasisPoints;
  const vatMinor = rules.vat.inputPricesIncludeVat
    ? Math.round((subtotalMinor * vatRate) / (10_000 + vatRate))
    : Math.round((subtotalMinor * vatRate) / 10_000);
  const beforeRounding = rules.vat.inputPricesIncludeVat
    ? subtotalMinor
    : subtotalMinor + vatMinor;
  const totalMinor = applyRounding(
    beforeRounding,
    rules.rounding.incrementMinor,
    rules.rounding.mode,
  );

  return {
    configurationId: configuration.id,
    calculationVersion: rules.version,
    fabricWidths,
    fabricCutLengthMm,
    adjustedFabricCutLengthMm,
    fabricMetres,
    components,
    subtotal: { amountMinor: subtotalMinor, currency: "GBP" },
    vat: { amountMinor: vatMinor, currency: "GBP" },
    total: { amountMinor: totalMinor, currency: "GBP" },
  };
}
