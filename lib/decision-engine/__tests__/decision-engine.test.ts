import assert from "node:assert/strict";
import test from "node:test";

import {
  DRAFT_PRICING_RULE_SET,
  FABRIC_SPEC_FIXTURES,
  INITIAL_COMPLEXITY_RULE_SET,
  PHASE_2_DECISION_REGISTRY,
  PricingRuleRegistry,
  WINDOW_TYPE_SEEDS,
  activatePricingRuleSet,
  adjustCutLengthForPattern,
  allocateWidths,
  calculateNumberOfWidths,
  calculatePrice,
  canProceedToPayment,
  canReleaseToManufacture,
  classifyComplexity,
  createCurtainConfiguration,
  evaluateCompatibility,
  evaluateGoogleFeedEligibility,
  finalisePrice,
  runCurtainsMadeForFreeCalibration,
  validateConfiguration,
  validateDecisionRegistry,
  validateFabricSpec,
  validatePricingRuleActivation,
  validateWindowTypeMasterData,
} from "../index";
import type {
  CurtainConfiguration,
  DecisionRegistry,
  FabricSpec,
  Money,
  PriceComponent,
  PricingRuleSet,
  WindowTypeMaster,
} from "../types";

const gbp = (amountMinor: number): Money => ({ amountMinor, currency: "GBP" });
const windowType = (slug: string): WindowTypeMaster => WINDOW_TYPE_SEEDS.find((item) => item.slug === slug)!;

function productionSafeRegistry(): DecisionRegistry {
  return {
    ...structuredClone(PHASE_2_DECISION_REGISTRY),
    registryVersion: "2.0.0-test",
    decisions: PHASE_2_DECISION_REGISTRY.decisions.map((item) => ({
      ...structuredClone(item), status: "LOCKED", blocksProductionActivation: false,
      effectiveVersion: "2.0.0-test",
    })),
  };
}

function validatedRules(): PricingRuleSet {
  const money = gbp(1_000);
  const rule = structuredClone(DRAFT_PRICING_RULE_SET);
  rule.id = "rules-test";
  rule.version = "2.0.0-test";
  rule.lifecycle = "VALIDATED";
  rule.decisionRegistryVersion = "2.0.0-test";
  rule.allowedCustomerWidthBases.status = "LOCKED";
  Object.values(rule.constructionAllowances).forEach((value) => { value.status = "LOCKED"; });
  rule.patternRules.randomMatch.status = "LOCKED";
  rule.patternRules.straightMatch.status = "LOCKED";
  rule.patternRules.halfDropMatch = { decisionId: "PATTERN_HALF_DROP", status: "LOCKED", value: "WORKROOM_APPROVED_HALF_DROP_FORMULA_V1" };
  rule.patternRules.exactCentringAndJoining = { decisionId: "PATTERN_CENTRING_JOINING", status: "LOCKED", value: "WORKROOM_APPROVED_CENTRING_FORMULA_V1" };
  rule.pairSingleConstruction.status = "LOCKED";
  for (const heading of Object.values(rule.headingRules)) {
    if (!heading) continue;
    heading.fullnessFactor.status = "LOCKED";
    heading.fullnessFactor.value ??= 2;
    heading.voileFullnessFactor.status = "LOCKED";
    heading.voileFullnessFactor.value = 2;
    heading.priceFactor.status = "LOCKED";
    heading.priceFactor.value ??= 1;
  }
  rule.baseMakeupLabourNetPerWidth = gbp(5_000);
  rule.patternMatchLabourNetPerWidth = gbp(750);
  const fillMaterial = (material: PricingRuleSet["liningRules"]["STANDARD"]) => {
    material.usableWidthMm = 1400;
    material.materialRateNetPerMetre = money;
    material.topAllowanceMm = 150;
    material.bottomAllowanceMm = 200;
    material.labourNetPerWidth = gbp(500);
    material.compatibleHeadings = ["WAVE", "PENCIL_PLEAT", "DOUBLE_PINCH", "TRIPLE_PINCH", "EYELET", "TAB_TOP"];
    material.compatibleWindowTypes = ["*"];
  };
  fillMaterial(rule.liningRules.STANDARD);
  fillMaterial(rule.liningRules.BLACKOUT);
  fillMaterial(rule.liningRules.THERMAL);
  fillMaterial(rule.interliningRules.INTERLINING);
  rule.accessories.forEach((accessory) => {
    if (!accessory.quoteOnly) { accessory.unitPriceNet = money; accessory.vatRateBasisPoints = 2_000; accessory.compatibleHeadings = ["WAVE"]; accessory.compatibleWindowTypes = ["*"]; }
  });
  const widthLimits = [2, 6, 10, 20, null];
  rule.packagingRules.forEach((packaging, index) => {
    packaging.internalCostNet = gbp(250 + index * 50);
    packaging.maximumFabricWidths = widthLimits[index];
    packaging.maximumFinishedWeightKg = index === 0 ? 2 : index === 1 ? 20 : null;
    packaging.maximumLongestSideMm = index === 0 ? 1_500 : index === 1 ? 4_000 : null;
    packaging.eligibleLinings = ["UNLINED", "STANDARD", "BLACKOUT", "THERMAL"];
    packaging.eligibleInterlinings = ["NONE", "INTERLINING"];
  });
  rule.shippingZones[0].rateNet = money;
  rule.minimumOrders.standardMtmGross = gbp(10_000);
  rule.minimumOrders.premiumInterlinedGross = gbp(20_000);
  rule.minimumOrders.specialistReviewedGross = gbp(30_000);
  rule.vat.rateBasisPoints = 2_000;
  rule.measurementValidation = {
    structureStatus: "LOCKED", customerLengthUnit: "CM", minimumWidthCm: 20,
    maximumWidthCm: 1_000, minimumDropCm: 20, maximumDropCm: 500,
    suspiciousLikelyMillimetresAtCm: 2_000,
  };
  return rule;
}

function fabric(match: "RANDOM_MATCH" | "STRAIGHT_MATCH" = "STRAIGHT_MATCH"): FabricSpec {
  const value = structuredClone(FABRIC_SPEC_FIXTURES[match === "RANDOM_MATCH" ? 0 : 1]);
  value.patternMatchType = match;
  value.patternCentringRequirement = "NONE";
  value.verticalRepeatMm = match === "STRAIGHT_MATCH" ? 640 : null;
  value.recordLifecycle = "ACTIVE";
  value.supplierAvailability = "ACTIVE";
  value.fabricWeightGsm = 250;
  value.allowedLinings = ["UNLINED", "STANDARD", "BLACKOUT", "THERMAL"];
  value.suitableWindowTypeSlugs = ["*"];
  value.sellingPricePolicy.curtainsUkSellingRatePerMetre = gbp(3_000);
  value.sellingPricePolicy.effectiveFrom = "2026-09-06T00:00:00.000Z";
  value.supplierCostPerMetre = gbp(3_000);
  value.supplierCostEffectiveFrom = "2026-09-06T00:00:00.000Z";
  return value;
}

function configuration(slug = "standard-window", construction: "PAIR" | "SINGLE" = "PAIR"): CurtainConfiguration {
  const selectedFabric = fabric();
  const value = createCurtainConfiguration({
    id: "configuration-test", windowTypeSlug: slug, measurementBasis: "TRACK_WIDTH",
    fabricSpecId: selectedFabric.id, colour: selectedFabric.colour, heading: "WAVE",
    lining: "UNLINED", construction, trackOrPole: "STRAIGHT_TRACK",
    stackDirection: construction === "PAIR" ? "SPLIT" : "LEFT",
  });
  value.measurements = { coverage_width: 200, finished_drop: 230 };
  return value;
}

test("Window Type Master contains the 21 agreed unique types and customer width bases", () => {
  assert.equal(WINDOW_TYPE_SEEDS.length, 21);
  assert.equal(new Set(WINDOW_TYPE_SEEDS.map((item) => item.slug)).size, 21);
  assert.equal(validateWindowTypeMasterData(WINDOW_TYPE_SEEDS).valid, true);
  assert.deepEqual(windowType("standard-window").allowedMeasurementBases, ["TRACK_WIDTH", "POLE_USABLE_WIDTH"]);
  assert.equal(windowType("apex-window").drawingRequired, false);
});

test("FabricSpec fixtures are structurally valid, synthetic and feed-ineligible", () => {
  for (const item of FABRIC_SPEC_FIXTURES) {
    assert.equal(validateFabricSpec(item).valid, true);
    assert.equal(item.fixtureOnly, true);
    assert.equal(item.googleFeedEligibility.eligible, false);
    assert.equal(item.sellingPricePolicy.curtainsUkSellingRatePerMetre, null);
  }
});

test("number of widths and pair/single allocation remain deterministic", () => {
  assert.equal(calculateNumberOfWidths(2_000, 2, 1_380), 3);
  assert.deepEqual(allocateWidths(3, "PAIR"), { totalWidths: 4, curtainWidths: [2, 2] });
  assert.deepEqual(allocateWidths(3, "SINGLE"), { totalWidths: 3, curtainWidths: [3] });
});

test("straight match rounds upward while random match does not", () => {
  assert.equal(adjustCutLengthForPattern(2_650, 640, "STRAIGHT_MATCH"), 3_200);
  assert.equal(adjustCutLengthForPattern(2_650, null, "RANDOM_MATCH"), 2_650);
  assert.throws(() => adjustCutLengthForPattern(2_650, 640, "HALF_DROP_MATCH"), /unresolved/);
});

test("pricing calculates VAT at full precision and rounds only the final gross total", () => {
  const result = calculatePrice({
    configuration: configuration(), windowType: windowType("standard-window"), fabric: fabric(),
    rules: validatedRules(), shippingZone: "UK_MAINLAND", mode: "CALIBRATION",
  });
  assert.deepEqual(result.fabricWidths, { totalWidths: 4, curtainWidths: [2, 2] });
  assert.equal(result.fabricCutLengthMm, 2_650);
  assert.equal(result.adjustedFabricCutLengthMm, 3_200);
  assert.equal(result.fabricMetres, 12.8);
  assert.equal(result.directCostNet.amountMinor, 63_700);
  assert.equal(result.goodsNetBeforeMinimum.amountMinor, 98_000);
  assert.equal(result.netTotal.amountMinor, 99_000);
  assert.equal(result.vat.amountMinor, 19_800);
  assert.equal(result.grossBeforeRounding.amountMinor, 118_800);
  assert.equal(result.total.amountMinor, 118_800);
  assert.ok(Math.abs(result.grossMarginPercent - 35) < 0.000001);
});

test("random match fabric usage uses drop plus separate allowances", () => {
  const result = calculatePrice({
    configuration: { ...configuration(), fabricSpecId: fabric("RANDOM_MATCH").id, colour: fabric("RANDOM_MATCH").colour },
    windowType: windowType("standard-window"), fabric: fabric("RANDOM_MATCH"), rules: validatedRules(),
    shippingZone: "UK_MAINLAND", mode: "CALIBRATION",
  });
  assert.equal(result.adjustedFabricCutLengthMm, 2_650);
  assert.equal(result.fabricMetres, 10.6);
});

test("minimum charge is applied before shipping, with samples exempt", () => {
  const goods: PriceComponent[] = [{ code: "GOODS", description: "Goods", netAmount: gbp(5_000), vatRateBasisPoints: 2_000, chargeToCustomer: true, countsTowardGoodsMinimum: true }];
  const shipping = (amount: number): PriceComponent => ({ code: "SHIPPING", description: "Shipping", netAmount: gbp(amount), vatRateBasisPoints: 2_000, chargeToCustomer: true, countsTowardGoodsMinimum: false });
  const lowShipping = finalisePrice({ components: goods, shipping: shipping(1_000), minimumGross: gbp(10_000), sampleOrder: false });
  const highShipping = finalisePrice({ components: goods, shipping: shipping(10_000), minimumGross: gbp(10_000), sampleOrder: false });
  assert.equal(lowShipping.minimumAdjustmentNet.amountMinor, highShipping.minimumAdjustmentNet.amountMinor);
  assert.ok(lowShipping.minimumAdjustmentNet.amountMinor > 0);
  const sample = finalisePrice({ components: goods, shipping: shipping(1_000), minimumGross: gbp(10_000), sampleOrder: true });
  assert.equal(sample.minimumAdjustmentNet.amountMinor, 0);
  assert.equal(sample.applicableMinimumGross, null);
});

test("draft width/drop thresholds preserve exact boundary semantics", () => {
  const config = configuration();
  config.measurements = { coverage_width: 400, finished_drop: 300 };
  assert.equal(classifyComplexity(config, windowType("standard-window"), INITIAL_COMPLEXITY_RULE_SET).outcome, "INSTANT_PRICE");
  config.measurements.coverage_width = 400.1;
  assert.equal(classifyComplexity(config, windowType("standard-window"), INITIAL_COMPLEXITY_RULE_SET).outcome, "PRICE_WITH_REVIEW");
  config.measurements.coverage_width = 600.1;
  assert.equal(classifyComplexity(config, windowType("standard-window"), INITIAL_COMPLEXITY_RULE_SET).outcome, "MANUAL_QUOTE");
});

test("complete simple apex gets provisional review pricing but never direct manufacture", () => {
  const apex = configuration("apex-window");
  apex.trackOrPole = "SLOPING_TRACK";
  apex.trackComplexity = "SLOPING";
  apex.attachments.photoReferences = ["private://photo/1"];
  apex.measurements = { coverage_width: 200, peak_height: 300, left_vertical: 200, right_vertical: 200, left_slope: Math.sqrt(20_000), right_slope: Math.sqrt(20_000) };
  const result = classifyComplexity(apex, windowType("apex-window"), INITIAL_COMPLEXITY_RULE_SET);
  assert.equal(result.outcome, "PRICE_WITH_REVIEW");
  assert.equal(result.technicalApprovalRequiredBeforePayment, true);
  apex.customerApprovalState = "APPROVED";
  assert.equal(canProceedToPayment(apex, "SYMMETRICAL_APEX"), false);
  apex.technicalReviewState = "APPROVED";
  assert.equal(canProceedToPayment(apex, "SYMMETRICAL_APEX"), true);
  assert.equal(canReleaseToManufacture(apex, "SYMMETRICAL_APEX"), false);
  apex.paymentState = "PAID";
  assert.equal(canReleaseToManufacture(apex, "SYMMETRICAL_APEX"), true);
});

test("incomplete specialist geometry routes to manual quote", () => {
  const apex = configuration("apex-window");
  assert.equal(classifyComplexity(apex, windowType("apex-window"), INITIAL_COMPLEXITY_RULE_SET).outcome, "MANUAL_QUOTE");
});

test("discontinued fabrics cannot start new configurations but remain representable historically", () => {
  const discontinued = fabric();
  discontinued.supplierAvailability = "DISCONTINUED";
  const result = validateConfiguration(configuration(), windowType("standard-window"), discontinued);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((item) => item.code === "FABRIC_DISCONTINUED"));
  assert.equal(discontinued.supplierAvailability, "DISCONTINUED");
});

test("compatibility engine blocks invalid combinations", () => {
  const config = configuration();
  config.heading = "EYELET";
  const patterned = fabric();
  assert.equal(evaluateCompatibility(config, windowType("standard-window"), patterned, validatedRules()).outcome, "BLOCKED");
});

test("Phase 2 decision registry is valid and draft decisions block activation", () => {
  assert.equal(validateDecisionRegistry(PHASE_2_DECISION_REGISTRY).valid, true);
  const rule = validatedRules();
  rule.decisionRegistryVersion = PHASE_2_DECISION_REGISTRY.registryVersion;
  const result = validatePricingRuleActivation(rule, PHASE_2_DECISION_REGISTRY);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((item) => item.code === "UNCONFIRMED_BUSINESS_DECISION"));
});

test("only an authorised admin can activate a fully validated version", () => {
  const rules = validatedRules();
  const registry = productionSafeRegistry();
  assert.throws(() => activatePricingRuleSet(rules, registry, { id: "user", roles: [] }, "2026-09-07T00:00:00Z"), /authorised/);
  const active = activatePricingRuleSet(rules, registry, { id: "admin", roles: ["PRICING_ADMIN"] }, "2026-09-07T00:00:00Z");
  assert.equal(active.lifecycle, "ACTIVE");
  assert.equal(active.effectiveFrom, "2026-09-07T00:00:00.000Z");
});

test("pricing registry snapshots versions and resolves effective ACTIVE rules", () => {
  const registryData = productionSafeRegistry();
  const first = activatePricingRuleSet(validatedRules(), registryData, { id: "admin", roles: ["PRICING_ADMIN"] }, "2026-01-01T00:00:00Z");
  first.effectiveTo = "2026-07-01T00:00:00Z";
  const secondRules = validatedRules();
  secondRules.version = "2.0.1-test";
  secondRules.id = "rules-test-2";
  const second = activatePricingRuleSet(secondRules, registryData, { id: "admin", roles: ["PRICING_ADMIN"] }, "2026-07-01T00:00:00Z");
  const registry = new PricingRuleRegistry([first, second]);
  assert.equal(registry.resolveActive(new Date("2026-03-01T00:00:00Z")).version, "2.0.0-test");
  assert.equal(registry.resolveActive(new Date("2026-09-01T00:00:00Z")).version, "2.0.1-test");
  const copy = registry.get("2.0.1-test");
  copy.version = "tampered";
  assert.equal(registry.get("2.0.1-test").version, "2.0.1-test");
});

test("invalid or incomplete measurements are rejected before pricing", () => {
  const config = configuration();
  delete config.measurements.finished_drop;
  const result = validateConfiguration(config, windowType("standard-window"), fabric());
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((item) => item.code === "MEASUREMENT_REQUIRED"));
});

test("Google feed governance rejects quote-only, mismatched or inactive pricing", () => {
  const rules = validatedRules();
  const result = evaluateGoogleFeedEligibility({
    exactPrice: gbp(20_000), landingPagePrice: gbp(19_999), purchasable: true,
    shippingValid: true, requiredProductDataComplete: true, pricingOutcome: "MANUAL_QUOTE", pricingRuleSet: rules,
  });
  assert.equal(result.eligible, false);
  assert.deepEqual(result.reasons, ["LANDING_PAGE_PRICE_MISMATCH", "QUOTE_ONLY_PRODUCT", "ACTIVE_PRICING_RULESET_REQUIRED"]);
});

test("Pricing Ruleset v1 locks the commercial calibration inputs but remains non-production", () => {
  assert.equal(DRAFT_PRICING_RULE_SET.lifecycle, "DRAFT");
  assert.equal(DRAFT_PRICING_RULE_SET.commercialModelId, "CURTAINSUK_PRICING_RULESET_V1");
  assert.equal(DRAFT_PRICING_RULE_SET.marginPolicy.targetGrossMarginBasisPoints.value, 3_500);
  assert.equal(DRAFT_PRICING_RULE_SET.baseMakeupLabourNetPerWidth?.amountMinor, 2_500);
  assert.equal(DRAFT_PRICING_RULE_SET.headingRules.PENCIL_PLEAT?.priceFactor.value, 1);
  assert.equal(DRAFT_PRICING_RULE_SET.headingRules.WAVE?.priceFactor.value, 1.1);
  assert.equal(DRAFT_PRICING_RULE_SET.headingRules.EYELET?.priceFactor.value, 1.1);
  assert.equal(DRAFT_PRICING_RULE_SET.headingRules.DOUBLE_PINCH?.priceFactor.value, 1.2);
  assert.equal(DRAFT_PRICING_RULE_SET.liningRules.STANDARD.materialRateNetPerMetre?.amountMinor, 400);
  assert.equal(DRAFT_PRICING_RULE_SET.liningRules.BLACKOUT.materialRateNetPerMetre?.amountMinor, 600);
  assert.equal(DRAFT_PRICING_RULE_SET.liningRules.THERMAL.materialRateNetPerMetre?.amountMinor, 600);
  assert.equal(DRAFT_PRICING_RULE_SET.interliningRules.INTERLINING.materialRateNetPerMetre?.amountMinor, 500);
  assert.equal(DRAFT_PRICING_RULE_SET.marginPolicy.minimumNetGrossProfitFloor.active, false);
  assert.deepEqual([
    DRAFT_PRICING_RULE_SET.marginPolicy.minimumNetGrossProfitFloor.proposedNet.amountMinor,
    DRAFT_PRICING_RULE_SET.marginPolicy.minimumNetGrossProfitFloor.calibrationUpperBoundNet.amountMinor,
  ], [10_000, 15_000]);
});

test("the five competitor benchmarks run through the pricing engine without job-specific tuning", () => {
  const results = runCurtainsMadeForFreeCalibration();
  assert.deepEqual(results.map((result) => result.fabricWidths), [2, 2, 4, 4, 6]);
  assert.deepEqual(results.map((result) => result.fabricMetres), [5.2, 5.2, 10.3, 12, 17.9]);
  assert.deepEqual(results.map((result) => result.liningMetres), [5.1, 5.1, 10.2, 11.8, 17.7]);
  assert.deepEqual(results.map((result) => result.interliningMetres), [0, 0, 0, 0, 17.7]);
  assert.deepEqual(results.map((result) => result.grossSellingPrice.amountMinor), [32_200, 35_000, 69_600, 79_500, 128_700]);
  for (const result of results) {
    assert.ok(Math.abs(result.grossMarginPercent - 35) < 0.000001);
    assert.equal(result.fabricWidths, result.benchmark.expectedFabricWidths);
  }
});
