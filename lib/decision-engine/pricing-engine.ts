import { MissingCommercialRuleError } from "./errors";
import { assertValidConfiguration, validatePricingRuleActivation } from "./validation";
import type {
  CalculationResult,
  ConstructionType,
  CurtainConfiguration,
  DecisionRegistry,
  FabricRateSnapshot,
  FabricSpec,
  GovernedValue,
  HeadingFullnessOverride,
  MaterialConstructionRule,
  MinimumOrderClass,
  Money,
  PackagingClass,
  PatternMatchType,
  PriceComponent,
  PricingRuleSet,
  WidthAllocation,
  WindowTypeMaster,
} from "./types";

export interface CalculatePriceInput {
  configuration: CurtainConfiguration;
  windowType: WindowTypeMaster;
  fabric: FabricSpec;
  rules: PricingRuleSet;
  shippingZone: string;
  mode: "CALIBRATION" | "PRODUCTION";
  decisionRegistry?: DecisionRegistry;
}

const gbp = (amountMinor: number): Money => ({ amountMinor, currency: "GBP" });

function requiredMoney(value: Money | null, path: string): Money {
  if (value === null) throw new MissingCommercialRuleError(path);
  if (value.currency !== "GBP" || !Number.isFinite(value.amountMinor) || value.amountMinor < 0) throw new Error(`Invalid GBP value at ${path}`);
  return value;
}

function requiredGoverned<T>(governed: GovernedValue<T>, path: string): T {
  if (governed.value === null) throw new MissingCommercialRuleError(path);
  return governed.value;
}

function component(code: string, description: string, netAmountMinor: number, vatRateBasisPoints: number, countsTowardGoodsMinimum: boolean, metadata?: Record<string, string | number | boolean>, chargeToCustomer = true): PriceComponent {
  return { code, description, netAmount: gbp(netAmountMinor), vatRateBasisPoints, chargeToCustomer, countsTowardGoodsMinimum, metadata };
}

export function calculateNumberOfWidths(coverageWidthMm: number, fullnessFactor: number, usableFabricWidthMm: number): number {
  if (![coverageWidthMm, fullnessFactor, usableFabricWidthMm].every((value) => Number.isFinite(value) && value > 0)) throw new RangeError("Width inputs must be positive finite numbers");
  return Math.ceil((coverageWidthMm * fullnessFactor) / usableFabricWidthMm);
}

export function allocateWidths(calculatedWidths: number, construction: ConstructionType): WidthAllocation {
  if (!Number.isInteger(calculatedWidths) || calculatedWidths <= 0) throw new RangeError("Calculated widths must be a positive integer");
  if (construction === "SINGLE") return { totalWidths: calculatedWidths, curtainWidths: [calculatedWidths] };
  const balancedTotal = calculatedWidths % 2 === 0 ? calculatedWidths : calculatedWidths + 1;
  return { totalWidths: balancedTotal, curtainWidths: [balancedTotal / 2, balancedTotal / 2] };
}

export function adjustCutLengthForPattern(cutLengthMm: number, verticalRepeatMm: number | null, patternMatchType: PatternMatchType): number {
  if (!Number.isFinite(cutLengthMm) || cutLengthMm <= 0) throw new RangeError("Cut length must be positive");
  if (patternMatchType === "RANDOM_MATCH") return cutLengthMm;
  if (patternMatchType === "HALF_DROP_MATCH") throw new MissingCommercialRuleError("patternRules.halfDropMatch");
  if (!verticalRepeatMm || !Number.isFinite(verticalRepeatMm) || verticalRepeatMm <= 0) throw new RangeError("Straight-match fabric requires a positive vertical repeat");
  return Math.ceil(cutLengthMm / verticalRepeatMm) * verticalRepeatMm;
}

export function roundMetresUp(metres: number, increment: number): number {
  if (!Number.isFinite(metres) || metres < 0 || !Number.isFinite(increment) || increment <= 0) throw new RangeError("Invalid metre rounding input");
  return Number((Math.ceil((metres - Number.EPSILON) / increment) * increment).toFixed(6));
}

function roundFinal(value: number, increment: number): number {
  return Math.round(value / increment) * increment;
}

function coverageAndDrop(configuration: CurtainConfiguration): { widthMm: number; dropMm: number } {
  const width = configuration.measurements.coverage_width ?? configuration.measurements.door_width;
  const drop = configuration.measurements.finished_drop ?? configuration.measurements.door_height;
  if (typeof width !== "number" || typeof drop !== "number") throw new Error("Pricing requires scalar coverage width and finished drop in centimetres");
  return { widthMm: width * 10, dropMm: drop * 10 };
}

function resolveFullness(configuration: CurtainConfiguration, fabric: FabricSpec, rules: PricingRuleSet, coverageWidthMm: number): number {
  const heading = rules.headingRules[configuration.heading];
  if (!heading) throw new MissingCommercialRuleError(`headingRules.${configuration.heading}`);
  const isVoile = fabric.usageSuitability.some((value) => value.toLowerCase().includes("voile"));
  const base = requiredGoverned(isVoile ? heading.voileFullnessFactor : heading.fullnessFactor, `headingRules.${configuration.heading}.${isVoile ? "voileFullnessFactor" : "fullnessFactor"}`);
  const matches = (override: HeadingFullnessOverride) =>
    (!override.fabricSpecId || override.fabricSpecId === fabric.id) &&
    (!override.trackType || override.trackType === configuration.trackOrPole) &&
    (!override.windowTypeSlug || override.windowTypeSlug === configuration.windowTypeSlug) &&
    (override.minimumCoverageWidthMm === undefined || coverageWidthMm >= override.minimumCoverageWidthMm) &&
    (override.maximumCoverageWidthMm === undefined || coverageWidthMm <= override.maximumCoverageWidthMm);
  const matched = heading.overrides.filter(matches).sort((left, right) => Object.keys(right).length - Object.keys(left).length)[0];
  return matched?.fullnessFactor ?? base;
}

function resolveFabricRate(fabric: FabricSpec, rules: PricingRuleSet): FabricRateSnapshot {
  const policy = fabric.sellingPricePolicy;
  let rate = policy.manualOverride.enabled ? policy.manualOverride.ratePerMetre : policy.curtainsUkSellingRatePerMetre;
  if (!rate && fabric.supplierCostPerMetre) {
    const tier = rules.markupTiers.find((item) => fabric.supplierCostPerMetre!.amountMinor >= item.minimumSupplierCostMinor && (item.maximumSupplierCostMinor === null || fabric.supplierCostPerMetre!.amountMinor <= item.maximumSupplierCostMinor));
    if (tier?.markupPercent !== null && tier?.markupPercent !== undefined) {
      const markedUp = fabric.supplierCostPerMetre.amountMinor * (1 + tier.markupPercent / 100);
      const cashFloor = tier.minimumCashMargin ? fabric.supplierCostPerMetre.amountMinor + tier.minimumCashMargin.amountMinor : 0;
      rate = gbp(Math.max(markedUp, cashFloor));
    }
  }
  rate = requiredMoney(rate, `fabric.${fabric.id}.sellingPricePolicy`);
  if (fabric.supplierCostPerMetre) {
    const cost = fabric.supplierCostPerMetre.amountMinor;
    const marginFloor = policy.minimumGrossMarginPercent === null ? 0 : cost / (1 - policy.minimumGrossMarginPercent / 100);
    const cashFloor = policy.minimumCashMargin === null ? 0 : cost + policy.minimumCashMargin.amountMinor;
    rate = gbp(Math.max(rate.amountMinor, marginFloor, cashFloor));
  }
  if (!policy.effectiveFrom) throw new MissingCommercialRuleError(`fabric.${fabric.id}.sellingPricePolicy.effectiveFrom`);
  return { fabricSpecId: fabric.id, sellingRateNetPerMetre: rate, effectiveFrom: policy.effectiveFrom, manualOverrideApplied: policy.manualOverride.enabled };
}

function adjustedCoverageWidth(configuration: CurtainConfiguration, widthMm: number, rules: PricingRuleSet): number {
  const allowances = rules.constructionAllowances;
  return widthMm
    + (configuration.constructionFeatures.includeCentreOverlap ? requiredGoverned(allowances.centreOverlapMm, "constructionAllowances.centreOverlapMm") : 0)
    + (configuration.constructionFeatures.includeLeftReturn ? requiredGoverned(allowances.leftReturnMm, "constructionAllowances.leftReturnMm") : 0)
    + (configuration.constructionFeatures.includeRightReturn ? requiredGoverned(allowances.rightReturnMm, "constructionAllowances.rightReturnMm") : 0);
}

function calculateMaterial(configuration: CurtainConfiguration, rule: MaterialConstructionRule, coverageWidthMm: number, dropMm: number, fullness: number, code: string, description: string, vatRate: number, increment: number): PriceComponent[] {
  if (rule.usableWidthMm === null || rule.topAllowanceMm === null || rule.bottomAllowanceMm === null) throw new MissingCommercialRuleError(`${code}.dimensions`);
  const rate = requiredMoney(rule.materialRateNetPerMetre, `${code}.materialRateNetPerMetre`);
  const labour = requiredMoney(rule.labourNetPerWidth, `${code}.labourNetPerWidth`);
  const widths = allocateWidths(calculateNumberOfWidths(coverageWidthMm, fullness, rule.usableWidthMm), configuration.construction);
  const metres = roundMetresUp(widths.totalWidths * (dropMm + rule.topAllowanceMm + rule.bottomAllowanceMm) / 1000, increment);
  return [
    component(`${code}_MATERIAL`, description, metres * rate.amountMinor, vatRate, true, { metres, widths: widths.totalWidths }),
    component(`${code}_LABOUR`, `${description} labour`, widths.totalWidths * labour.amountMinor, vatRate, true, { widths: widths.totalWidths }),
  ];
}

function applicableMinimum(rules: PricingRuleSet, minimumClass: MinimumOrderClass): Money | null {
  if (minimumClass === "PREMIUM_INTERLINED") return rules.minimumOrders.premiumInterlinedGross;
  if (minimumClass === "SPECIALIST_REVIEWED") return rules.minimumOrders.specialistReviewedGross;
  return rules.minimumOrders.standardMtmGross;
}

export interface FinalisePriceInput {
  components: PriceComponent[];
  shipping: PriceComponent;
  minimumGross: Money | null;
  sampleOrder: boolean;
  roundingIncrementMinor?: number;
}

export function finalisePrice(input: FinalisePriceInput) {
  const chargedGoods = input.components.filter((item) => item.chargeToCustomer && item.countsTowardGoodsMinimum);
  const goodsNetBeforeMinimum = chargedGoods.reduce((sum, item) => sum + item.netAmount.amountMinor, 0);
  const goodsVatBeforeMinimum = chargedGoods.reduce((sum, item) => sum + item.netAmount.amountMinor * item.vatRateBasisPoints / 10_000, 0);
  const goodsGrossBeforeMinimum = goodsNetBeforeMinimum + goodsVatBeforeMinimum;
  const minimumGross = input.sampleOrder ? null : input.minimumGross;
  let minimumAdjustment: PriceComponent | null = null;
  if (minimumGross && goodsGrossBeforeMinimum < minimumGross.amountMinor) {
    const dominantVatRate = chargedGoods[0]?.vatRateBasisPoints ?? 0;
    const netAdjustment = (minimumGross.amountMinor - goodsGrossBeforeMinimum) / (1 + dominantVatRate / 10_000);
    minimumAdjustment = component("MINIMUM_ORDER_ADJUSTMENT", "Minimum order adjustment", netAdjustment, dominantVatRate, true, undefined);
  }
  const allComponents = minimumAdjustment ? [...input.components, minimumAdjustment, input.shipping] : [...input.components, input.shipping];
  const charged = allComponents.filter((item) => item.chargeToCustomer);
  const net = charged.reduce((sum, item) => sum + item.netAmount.amountMinor, 0);
  const vat = charged.reduce((sum, item) => sum + item.netAmount.amountMinor * item.vatRateBasisPoints / 10_000, 0);
  const gross = net + vat;
  const shippingNet = input.shipping.chargeToCustomer ? input.shipping.netAmount.amountMinor : 0;
  return {
    components: allComponents,
    goodsNetBeforeMinimum: gbp(goodsNetBeforeMinimum),
    applicableMinimumGross: minimumGross,
    minimumAdjustmentNet: gbp(minimumAdjustment?.netAmount.amountMinor ?? 0),
    shippingNet: gbp(shippingNet),
    netTotal: gbp(net),
    vat: gbp(vat),
    grossBeforeRounding: gbp(gross),
    total: gbp(roundFinal(gross, input.roundingIncrementMinor ?? 100)),
  };
}

export interface PackagingClassificationInput {
  finishedWeightKg: number | null;
  longestSideMm: number;
  numberOfFabricWidths: number;
  lining: CurtainConfiguration["lining"];
  interlining: CurtainConfiguration["interlining"];
}

export function determinePackagingClass(input: PackagingClassificationInput, rules: PricingRuleSet): PackagingClass {
  const ordered: PackagingClass[] = ["SMALL", "STANDARD", "LARGE", "OVERSIZE", "SPECIALIST"];
  for (const name of ordered) {
    const rule = rules.packagingRules.find((item) => item.packagingClass === name);
    if (!rule) continue;
    const weightFits = input.finishedWeightKg === null || rule.maximumFinishedWeightKg === null || input.finishedWeightKg <= rule.maximumFinishedWeightKg;
    const sizeFits = rule.maximumLongestSideMm === null || input.longestSideMm <= rule.maximumLongestSideMm;
    const widthsFit = rule.maximumFabricWidths === null || input.numberOfFabricWidths <= rule.maximumFabricWidths;
    const liningFits = rule.eligibleLinings === null || rule.eligibleLinings.includes(input.lining);
    const interliningFits = rule.eligibleInterlinings === null || rule.eligibleInterlinings.includes(input.interlining);
    if (weightFits && sizeFits && widthsFit && liningFits && interliningFits) return name;
  }
  return "SPECIALIST";
}

export function calculatePrice(input: CalculatePriceInput): CalculationResult {
  const { configuration, fabric, rules, windowType } = input;
  assertValidConfiguration(configuration, windowType, fabric, rules.measurementValidation);
  if (input.mode === "PRODUCTION") {
    if (rules.lifecycle !== "ACTIVE" || !input.decisionRegistry) throw new Error("Production pricing requires an ACTIVE ruleset and decision registry");
    const validation = validatePricingRuleActivation(rules, input.decisionRegistry);
    if (!validation.valid) throw new Error(`Production pricing blocked: ${validation.issues.map((item) => item.code).join(", ")}`);
  }
  if (fabric.patternCentringRequirement === "REQUIRED" || fabric.patternCentringRequirement === "WORKROOM_CONFIRMATION_REQUIRED") throw new MissingCommercialRuleError("patternRules.exactCentringAndJoining");
  const vatRate = rules.vat.rateBasisPoints;
  if (vatRate === null) throw new MissingCommercialRuleError("vat.rateBasisPoints");
  const { widthMm, dropMm } = coverageAndDrop(configuration);
  const coverageWidthMm = adjustedCoverageWidth(configuration, widthMm, rules);
  const fullness = resolveFullness(configuration, fabric, rules, coverageWidthMm);
  const calculatedWidths = calculateNumberOfWidths(coverageWidthMm, fullness, fabric.usableWidthMm);
  const fabricWidths = allocateWidths(calculatedWidths, configuration.construction);
  requiredGoverned(rules.pairSingleConstruction, "pairSingleConstruction");
  const cutLengthMm = dropMm
    + requiredGoverned(rules.constructionAllowances.topAllowanceMm, "constructionAllowances.topAllowanceMm")
    + requiredGoverned(rules.constructionAllowances.bottomHemAllowanceMm, "constructionAllowances.bottomHemAllowanceMm");
  const adjustedCutLengthMm = adjustCutLengthForPattern(cutLengthMm, fabric.verticalRepeatMm, fabric.patternMatchType);
  const fabricMetres = roundMetresUp(fabricWidths.totalWidths * adjustedCutLengthMm / 1000, rules.fabricOrderingIncrementMetres);
  const fabricRateSnapshot = resolveFabricRate(fabric, rules);
  const baseLabour = requiredMoney(rules.baseMakeupLabourNetPerWidth, "baseMakeupLabourNetPerWidth");
  const headingRule = rules.headingRules[configuration.heading]!;
  const headingLabour = requiredMoney(headingRule.headingLabourNetPerWidth, `headingRules.${configuration.heading}.headingLabourNetPerWidth`);
  const components: PriceComponent[] = [
    component("FABRIC", "Face fabric", fabricMetres * fabricRateSnapshot.sellingRateNetPerMetre.amountMinor, vatRate, true, { metres: fabricMetres, widths: fabricWidths.totalWidths, usableWidthMm: fabric.usableWidthMm, adjustedCutLengthMm }),
    component("BASE_LABOUR", "Base make-up labour", fabricWidths.totalWidths * baseLabour.amountMinor, vatRate, true, { widths: fabricWidths.totalWidths }),
    component("HEADING_LABOUR", `${configuration.heading.toLowerCase()} heading labour`, fabricWidths.totalWidths * headingLabour.amountMinor, vatRate, true, { widths: fabricWidths.totalWidths }),
  ];
  if (fabric.patternMatchType === "STRAIGHT_MATCH") {
    const patternLabour = requiredMoney(rules.patternMatchLabourNetPerWidth, "patternMatchLabourNetPerWidth");
    components.push(component("PATTERN_MATCH_LABOUR", "Pattern-matching labour", fabricWidths.totalWidths * patternLabour.amountMinor, vatRate, true, { widths: fabricWidths.totalWidths }));
  }
  if (configuration.lining !== "UNLINED") components.push(...calculateMaterial(configuration, rules.liningRules[configuration.lining], coverageWidthMm, dropMm, fullness, "LINING", `${configuration.lining.toLowerCase()} lining`, vatRate, rules.fabricOrderingIncrementMetres));
  if (configuration.interlining === "INTERLINING") components.push(...calculateMaterial(configuration, rules.interliningRules.INTERLINING, coverageWidthMm, dropMm, fullness, "INTERLINING", "Interlining", vatRate, rules.fabricOrderingIncrementMetres));
  for (const selected of configuration.accessories) {
    if (!Number.isInteger(selected.quantity) || selected.quantity <= 0) throw new RangeError(`Invalid accessory quantity: ${selected.code}`);
    const spec = rules.accessories.find((item) => item.code === selected.code);
    if (!spec || spec.quoteOnly) throw new MissingCommercialRuleError(`accessories.${selected.code}`);
    const price = requiredMoney(spec.unitPriceNet, `accessories.${selected.code}.unitPriceNet`);
    if (spec.vatRateBasisPoints === null) throw new MissingCommercialRuleError(`accessories.${selected.code}.vatRateBasisPoints`);
    components.push(component(`ACCESSORY_${selected.code}`, spec.name, price.amountMinor * selected.quantity, spec.vatRateBasisPoints, true, { quantity: selected.quantity }));
  }
  const estimatedFaceFabricWeightKg = fabric.fabricWeightGsm === null
    ? null
    : fabricMetres * (fabric.usableWidthMm / 1000) * (fabric.fabricWeightGsm / 1000);
  const packagingClass = determinePackagingClass({
    finishedWeightKg: estimatedFaceFabricWeightKg,
    longestSideMm: Math.max(coverageWidthMm, dropMm),
    numberOfFabricWidths: fabricWidths.totalWidths,
    lining: configuration.lining,
    interlining: configuration.interlining,
  }, rules);
  const packagingRule = rules.packagingRules.find((item) => item.packagingClass === packagingClass);
  if (!packagingRule) throw new MissingCommercialRuleError(`packagingRules.${packagingClass}`);
  const packagingCost = requiredMoney(packagingRule.internalCostNet, `packagingRules.${packagingClass}.internalCostNet`);
  components.push(component("PACKAGING", `${packagingClass} packaging`, packagingCost.amountMinor, vatRate, false, { packagingClass }, packagingRule.chargeToCustomer));
  const shippingRule = rules.shippingZones.find((item) => item.code === input.shippingZone && item.enabled && item.supplyOnly);
  if (!shippingRule || !shippingRule.allowedPackagingClasses.includes(packagingClass)) throw new MissingCommercialRuleError(`shippingZones.${input.shippingZone}`);
  const shippingRate = requiredMoney(shippingRule.rateNet, `shippingZones.${input.shippingZone}.rateNet`);
  const shipping = component("SHIPPING", shippingRule.name, shippingRate.amountMinor, vatRate, false, { shippingZone: shippingRule.code });
  const totals = finalisePrice({ components, shipping, minimumGross: applicableMinimum(rules, configuration.minimumOrderClass), sampleOrder: false, roundingIncrementMinor: rules.rounding.incrementMinor });
  const vatSnapshot = { rateBasisPoints: vatRate, netAmount: totals.netTotal, vatAmount: totals.vat, grossAmountBeforeRounding: totals.grossBeforeRounding, grossAmountAfterRounding: totals.total };
  return {
    configurationId: configuration.id,
    calculationVersion: rules.version,
    fabricRateSnapshot,
    fabricWidths,
    fabricCutLengthMm: cutLengthMm,
    adjustedFabricCutLengthMm: adjustedCutLengthMm,
    fabricMetres,
    ...totals,
    vatSnapshot,
  };
}
