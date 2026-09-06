import assert from "node:assert/strict";
import test from "node:test";

import {
  DRAFT_PRICING_RULE_SET,
  FABRIC_SPEC_FIXTURES,
  INITIAL_COMPLEXITY_RULE_SET,
  PricingRuleRegistry,
  WINDOW_TYPE_SEEDS,
  adjustCutLengthForPattern,
  allocateWidths,
  calculateNumberOfWidths,
  calculatePrice,
  classifyComplexity,
  createCurtainConfiguration,
  validateConfiguration,
  validateFabricSpec,
  validatePricingRuleSet,
  validateWindowTypeMasterData,
} from "../index";
import type { FabricSpec, Money, PricingRuleSet, WindowTypeMaster } from "../types";

const gbp = (amountMinor: number): Money => ({ amountMinor, currency: "GBP" });

function activeRuleSet(version = "1.0.0", effectiveFrom = "2026-01-01T00:00:00Z") {
  const materialRule = {
    usableWidthMm: 1400,
    headingAllowanceMm: 100,
    hemAllowanceMm: 200,
    sellingRatePerMetre: gbp(1_000),
    orderingIncrementMetres: 0.1,
  };
  const headingRule = {
    fullnessFactor: 2,
    headingAllowanceMm: 100,
    labourPerWidth: gbp(1_000),
  };

  return {
    ...structuredClone(DRAFT_PRICING_RULE_SET),
    id: `rules-${version}`,
    version,
    status: "ACTIVE",
    effectiveFrom,
    headingRules: {
      WAVE: headingRule,
      PENCIL_PLEAT: headingRule,
      DOUBLE_PINCH: headingRule,
      TRIPLE_PINCH: headingRule,
      EYELET: headingRule,
      TAB_TOP: headingRule,
    },
    hemAllowanceMm: 200,
    liningRules: {
      UNLINED: null,
      STANDARD: materialRule,
      BLACKOUT: materialRule,
      THERMAL: materialRule,
    },
    interliningRules: {
      NONE: null,
      DOMETTE: materialRule,
      BUMP: materialRule,
    },
    baseLabourPerWidth: gbp(5_000),
    patternMatchingLabourPerWidth: gbp(750),
    complexitySurcharges: {
      STANDARD: null,
      CONFIGURABLE: gbp(5_000),
      REVIEW_REQUIRED: gbp(10_000),
      SPECIALIST: gbp(20_000),
    },
    accessoryPrices: { HOLD_BACK: gbp(2_500) },
    packaging: { base: gbp(1_000), oversized: gbp(2_000) },
    shipping: { UK_MAINLAND: gbp(0) },
    minimumOrderValue: gbp(10_000),
    vat: { rateBasisPoints: 2_000, inputPricesIncludeVat: false },
    rounding: { incrementMinor: 100, mode: "NEAREST" },
  } satisfies PricingRuleSet;
}

function standardWindow(): WindowTypeMaster {
  return WINDOW_TYPE_SEEDS.find((item) => item.slug === "standard-window")!;
}

function pricedPatternFabric(): FabricSpec {
  return {
    ...structuredClone(FABRIC_SPEC_FIXTURES[1]),
    sellingRatePerMetre: gbp(3_000),
    allowedLinings: [...FABRIC_SPEC_FIXTURES[1].allowedLinings, "UNLINED"],
    status: "ACTIVE",
  };
}

function validStandardConfiguration(construction: "PAIR" | "SINGLE" = "PAIR") {
  const configuration = createCurtainConfiguration({
    id: "configuration-test-1",
    windowTypeSlug: "standard-window",
    fabricSpecId: FABRIC_SPEC_FIXTURES[1].id,
    colour: FABRIC_SPEC_FIXTURES[1].colour,
    heading: "WAVE",
    lining: "UNLINED",
    construction,
    trackOrPole: "STRAIGHT_TRACK",
    stackDirection: construction === "PAIR" ? "SPLIT" : "LEFT",
  });
  configuration.measurements = {
    track_width_mm: 2_000,
    finished_drop_mm: 2_300,
  };
  return configuration;
}

test("Window Type Master contains the 21 agreed unique types", () => {
  assert.equal(WINDOW_TYPE_SEEDS.length, 21);
  assert.equal(new Set(WINDOW_TYPE_SEEDS.map((item) => item.slug)).size, 21);
  assert.equal(validateWindowTypeMasterData(WINDOW_TYPE_SEEDS).valid, true);
  assert.deepEqual(
    WINDOW_TYPE_SEEDS.filter((item) =>
      ["apex-window", "triangular-window", "gable-end-window"].includes(item.slug),
    ).map((item) => item.complexityClass),
    ["SPECIALIST", "SPECIALIST", "SPECIALIST"],
  );
});

test("FabricSpec fixtures satisfy structural validation and remain feed-ineligible", () => {
  for (const fabric of FABRIC_SPEC_FIXTURES) {
    assert.equal(validateFabricSpec(fabric).valid, true);
    assert.equal(fabric.fixtureOnly, true);
    assert.equal(fabric.googleFeedEligibility.eligible, false);
    assert.equal(fabric.supplierCostPerMetre, null);
    assert.equal(fabric.sellingRatePerMetre, null);
  }
});

test("number-of-width calculation uses heading fullness and usable fabric width", () => {
  assert.equal(calculateNumberOfWidths(2_000, 2, 1_380), 3);
  assert.equal(calculateNumberOfWidths(2_760, 2, 1_380), 4);
});

test("pair allocation balances whole widths while single allocation retains the total", () => {
  assert.deepEqual(allocateWidths(3, "PAIR"), {
    totalWidths: 4,
    curtainWidths: [2, 2],
  });
  assert.deepEqual(allocateWidths(3, "SINGLE"), {
    totalWidths: 3,
    curtainWidths: [3],
  });
});

test("pattern repeat rounds each cut up to a complete vertical repeat", () => {
  assert.equal(adjustCutLengthForPattern(2_600, 640, "STRAIGHT_MATCH"), 3_200);
  assert.equal(adjustCutLengthForPattern(2_600, 640, "HALF_DROP"), 3_200);
  assert.equal(adjustCutLengthForPattern(2_600, null, "PLAIN"), 2_600);
});

test("pricing engine produces a versioned component breakdown", () => {
  const result = calculatePrice({
    configuration: validStandardConfiguration("PAIR"),
    windowType: standardWindow(),
    fabric: pricedPatternFabric(),
    rules: activeRuleSet(),
    shippingZone: "UK_MAINLAND",
  });

  assert.equal(result.calculationVersion, "1.0.0");
  assert.deepEqual(result.fabricWidths, {
    totalWidths: 4,
    curtainWidths: [2, 2],
  });
  assert.equal(result.fabricCutLengthMm, 2_600);
  assert.equal(result.adjustedFabricCutLengthMm, 3_200);
  assert.equal(result.fabricMetres, 12.8);
  assert.equal(result.subtotal.amountMinor, 66_400);
  assert.equal(result.vat.amountMinor, 13_280);
  assert.equal(result.total.amountMinor, 79_700);
  assert.deepEqual(
    result.components.map((item) => item.code),
    [
      "FABRIC",
      "BASE_LABOUR",
      "HEADING_LABOUR",
      "PATTERN_MATCHING_LABOUR",
      "PACKAGING",
      "SHIPPING",
    ],
  );
});

test("pricing-rule registry resolves the applicable immutable version", () => {
  const first = activeRuleSet("1.0.0", "2026-01-01T00:00:00Z");
  first.effectiveTo = "2026-07-01T00:00:00Z";
  const second = activeRuleSet("2.0.0", "2026-07-01T00:00:00Z");
  second.supersedesVersion = "1.0.0";
  const registry = new PricingRuleRegistry([first, second]);

  assert.equal(registry.resolveActive(new Date("2026-03-01T00:00:00Z")).version, "1.0.0");
  assert.equal(registry.resolveActive(new Date("2026-09-01T00:00:00Z")).version, "2.0.0");
  const copy = registry.get("2.0.0");
  copy.version = "tampered";
  assert.equal(registry.get("2.0.0").version, "2.0.0");
});

test("an incomplete commercial rule set cannot be activated", () => {
  const incomplete = {
    ...structuredClone(DRAFT_PRICING_RULE_SET),
    status: "ACTIVE",
    effectiveFrom: "2026-01-01T00:00:00Z",
  } satisfies PricingRuleSet;
  const validation = validatePricingRuleSet(incomplete);
  assert.equal(validation.valid, false);
  assert.ok(
    validation.issues.some((issue) => issue.code === "COMMERCIAL_INPUT_REQUIRED"),
  );
  assert.throws(() => new PricingRuleRegistry([incomplete]), /Invalid pricing-rule version/);
});

test("complexity engine returns instant, review and manual outcomes", () => {
  const standard = standardWindow();
  const bay = WINDOW_TYPE_SEEDS.find((item) => item.slug === "bay-window")!;
  const apex = WINDOW_TYPE_SEEDS.find((item) => item.slug === "apex-window")!;
  const base = validStandardConfiguration();

  assert.equal(classifyComplexity(base, standard, INITIAL_COMPLEXITY_RULE_SET).outcome, "INSTANT_PRICE");
  assert.equal(
    classifyComplexity({ ...base, windowTypeSlug: bay.slug }, bay, INITIAL_COMPLEXITY_RULE_SET).outcome,
    "PRICE_WITH_REVIEW",
  );
  assert.equal(
    classifyComplexity({ ...base, windowTypeSlug: apex.slug }, apex, INITIAL_COMPLEXITY_RULE_SET).outcome,
    "MANUAL_QUOTE",
  );
});

test("provisional size thresholds can escalate an otherwise standard job", () => {
  const rules = {
    ...INITIAL_COMPLEXITY_RULE_SET,
    reviewWidthThresholdMm: 3_000,
    manualQuoteWidthThresholdMm: 5_000,
  };
  const configuration = validStandardConfiguration();
  configuration.measurements.track_width_mm = 3_500;
  assert.equal(classifyComplexity(configuration, standardWindow(), rules).outcome, "PRICE_WITH_REVIEW");
  configuration.measurements.track_width_mm = 5_500;
  assert.equal(classifyComplexity(configuration, standardWindow(), rules).outcome, "MANUAL_QUOTE");
});

test("invalid or incomplete measurements are rejected before pricing", () => {
  const configuration = validStandardConfiguration();
  delete configuration.measurements.finished_drop_mm;
  const validation = validateConfiguration(configuration, standardWindow(), pricedPatternFabric());
  assert.equal(validation.valid, false);
  assert.ok(validation.issues.some((issue) => issue.code === "MEASUREMENT_REQUIRED"));
  assert.throws(
    () =>
      calculatePrice({
        configuration,
        windowType: standardWindow(),
        fabric: pricedPatternFabric(),
        rules: activeRuleSet(),
        shippingZone: "UK_MAINLAND",
      }),
    { name: "DecisionEngineValidationError" },
  );
});

test("unresolved draft commercial values cannot produce a price", () => {
  const unresolved = {
    ...structuredClone(DRAFT_PRICING_RULE_SET),
    status: "ACTIVE",
    effectiveFrom: "2026-01-01T00:00:00Z",
  } satisfies PricingRuleSet;
  assert.throws(
    () =>
      calculatePrice({
        configuration: validStandardConfiguration(),
        windowType: standardWindow(),
        fabric: pricedPatternFabric(),
        rules: unresolved,
        shippingZone: "UK_MAINLAND",
      }),
    { name: "MissingCommercialRuleError" },
  );
});
