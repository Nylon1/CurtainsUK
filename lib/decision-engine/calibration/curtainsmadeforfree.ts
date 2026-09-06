import { createCurtainConfiguration } from "../curtain-configuration";
import { calculatePrice } from "../pricing-engine";
import { FABRIC_SPEC_FIXTURES } from "../seed/fabrics";
import { DRAFT_PRICING_RULE_SET } from "../seed/pricing-rules";
import { WINDOW_TYPE_SEEDS } from "../seed/window-types";
import type { CurtainConfiguration, FabricSpec, HeadingType, Money, PriceComponent, PricingRuleSet } from "../types";

const gbp = (amountMinor: number): Money => ({ amountMinor, currency: "GBP" });

export interface CompetitorBenchmark {
  id: string;
  coverageWidthCm: number;
  finishedDropCm: number;
  heading: HeadingType;
  lining: CurtainConfiguration["lining"];
  interlining: CurtainConfiguration["interlining"];
  expectedFabricWidths: number;
  competitorGrossPrice: Money;
}

export interface CompetitorCalibrationResult {
  benchmark: CompetitorBenchmark;
  fabricWidths: number;
  fabricMetres: number;
  liningMetres: number;
  interliningMetres: number;
  faceFabricCostNet: Money;
  liningAndInterliningCostNet: Money;
  makeupCostNet: Money;
  headingAdjustmentNet: Money;
  totalDirectCostNet: Money;
  netSellingPrice: Money;
  vat: Money;
  grossSellingPrice: Money;
  competitorGrossPrice: Money;
  variance: Money;
  variancePercent: number;
  netGrossProfit: Money;
  grossMarginPercent: number;
}

export const CURTAINSMADEFORFREE_BENCHMARKS: CompetitorBenchmark[] = [
  { id: "CMFF-01", coverageWidthCm: 100, finishedDropCm: 220, heading: "PENCIL_PLEAT", lining: "STANDARD", interlining: "NONE", expectedFabricWidths: 2, competitorGrossPrice: gbp(31_741) },
  { id: "CMFF-02", coverageWidthCm: 100, finishedDropCm: 220, heading: "WAVE", lining: "BLACKOUT", interlining: "NONE", expectedFabricWidths: 2, competitorGrossPrice: gbp(34_501) },
  { id: "CMFF-03", coverageWidthCm: 200, finishedDropCm: 220, heading: "WAVE", lining: "BLACKOUT", interlining: "NONE", expectedFabricWidths: 4, competitorGrossPrice: gbp(69_001) },
  { id: "CMFF-04", coverageWidthCm: 200, finishedDropCm: 260, heading: "DOUBLE_PINCH", lining: "BLACKOUT", interlining: "NONE", expectedFabricWidths: 4, competitorGrossPrice: gbp(85_939) },
  { id: "CMFF-05", coverageWidthCm: 300, finishedDropCm: 260, heading: "DOUBLE_PINCH", lining: "STANDARD", interlining: "INTERLINING", expectedFabricWidths: 6, competitorGrossPrice: gbp(129_749) },
];

/**
 * Calibration-only stand-in for Arlington Blossom. It is not supplier catalogue
 * data and is deliberately Google-feed ineligible.
 */
export function createRepresentativeCalibrationFabric(): FabricSpec {
  const fabric = structuredClone(FABRIC_SPEC_FIXTURES[0]);
  fabric.id = "calibration-prestigious-1380-straight-match";
  fabric.supplier = "Prestigious Textiles (calibration fixture)";
  fabric.collection = "Competitor benchmark fixture";
  fabric.design = "Representative £20/m cost fabric";
  fabric.colour = "Calibration only";
  fabric.supplierReference = "CALIBRATION-NOT-A-SUPPLIER-SKU";
  fabric.uniqueSku = "CUK-CAL-CMFF-001";
  fabric.usableWidthMm = 1380;
  fabric.verticalRepeatMm = 32;
  fabric.horizontalRepeatMm = null;
  fabric.patternMatchType = "STRAIGHT_MATCH";
  fabric.patternCentringRequirement = "NONE";
  fabric.fabricWeightGsm = 250;
  fabric.supplierCostPerMetre = gbp(2_000);
  fabric.supplierCostEffectiveFrom = "2026-09-06T00:00:00.000Z";
  fabric.recordLifecycle = "ACTIVE";
  fabric.supplierAvailability = "ACTIVE";
  fabric.allowedHeadings = ["PENCIL_PLEAT", "WAVE", "EYELET", "DOUBLE_PINCH", "TRIPLE_PINCH"];
  fabric.allowedLinings = ["UNLINED", "STANDARD", "BLACKOUT", "THERMAL"];
  fabric.suitableWindowTypeSlugs = ["standard-window"];
  fabric.googleFeedEligibility = { eligible: false, reason: "Calibration fixture only", identifierExists: false };
  fabric.fixtureOnly = true;
  return fabric;
}

export function createCompetitiveCalibrationRules(): PricingRuleSet {
  const rules = structuredClone(DRAFT_PRICING_RULE_SET);
  rules.packagingRules.forEach((rule) => {
    rule.internalCostNet = gbp(0);
    rule.chargeToCustomer = false;
  });
  const ukMainland = rules.shippingZones.find((zone) => zone.code === "UK_MAINLAND");
  if (!ukMainland) throw new Error("UK Mainland shipping rule is required");
  ukMainland.rateNet = gbp(0);
  rules.minimumOrders.standardMtmGross = null;
  rules.minimumOrders.premiumInterlinedGross = null;
  rules.minimumOrders.specialistReviewedGross = null;
  return rules;
}

function component(result: ReturnType<typeof calculatePrice>, code: string): PriceComponent | undefined {
  return result.components.find((item) => item.code === code);
}

function componentMinor(result: ReturnType<typeof calculatePrice>, code: string): number {
  return component(result, code)?.netAmount.amountMinor ?? 0;
}

function componentMetres(result: ReturnType<typeof calculatePrice>, code: string): number {
  const metres = component(result, code)?.metadata?.metres;
  return typeof metres === "number" ? metres : 0;
}

export function runCurtainsMadeForFreeCalibration(): CompetitorCalibrationResult[] {
  const rules = createCompetitiveCalibrationRules();
  const fabric = createRepresentativeCalibrationFabric();
  const windowType = WINDOW_TYPE_SEEDS.find((item) => item.slug === "standard-window");
  if (!windowType) throw new Error("Standard Window master data is required");

  return CURTAINSMADEFORFREE_BENCHMARKS.map((benchmark) => {
    const configuration = createCurtainConfiguration({
      id: `calibration-${benchmark.id.toLowerCase()}`,
      windowTypeSlug: "standard-window",
      measurementBasis: "TRACK_WIDTH",
      fabricSpecId: fabric.id,
      colour: fabric.colour,
      heading: benchmark.heading,
      lining: benchmark.lining,
      interlining: benchmark.interlining,
      construction: "PAIR",
      trackOrPole: benchmark.heading === "EYELET" ? "POLE" : "STRAIGHT_TRACK",
      stackDirection: "SPLIT",
    });
    configuration.measurements = {
      coverage_width: benchmark.coverageWidthCm,
      finished_drop: benchmark.finishedDropCm,
    };

    const result = calculatePrice({
      configuration,
      windowType,
      fabric,
      rules,
      shippingZone: "UK_MAINLAND",
      mode: "CALIBRATION",
    });
    const varianceMinor = result.total.amountMinor - benchmark.competitorGrossPrice.amountMinor;
    return {
      benchmark,
      fabricWidths: result.fabricWidths.totalWidths,
      fabricMetres: result.fabricMetres,
      liningMetres: componentMetres(result, "LINING_MATERIAL"),
      interliningMetres: componentMetres(result, "INTERLINING_MATERIAL"),
      faceFabricCostNet: gbp(componentMinor(result, "FABRIC")),
      liningAndInterliningCostNet: gbp(componentMinor(result, "LINING_MATERIAL") + componentMinor(result, "INTERLINING_MATERIAL")),
      makeupCostNet: gbp(componentMinor(result, "BASE_LABOUR")),
      headingAdjustmentNet: gbp(componentMinor(result, "HEADING_ADJUSTMENT")),
      totalDirectCostNet: result.directCostNet,
      netSellingPrice: result.netSellingPriceBeforeMinimum,
      vat: result.vat,
      grossSellingPrice: result.total,
      competitorGrossPrice: benchmark.competitorGrossPrice,
      variance: gbp(varianceMinor),
      variancePercent: varianceMinor / benchmark.competitorGrossPrice.amountMinor * 100,
      netGrossProfit: result.netGrossProfit,
      grossMarginPercent: result.grossMarginPercent,
    };
  });
}
