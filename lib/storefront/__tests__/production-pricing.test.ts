import assert from "node:assert/strict";
import test from "node:test";
import { validatePricingRuleActivation } from "@/lib/decision-engine/validation";
import { MTM_PRODUCTION_DECISION_REGISTRY, MTM_PRODUCTION_PRICING_RULE_SET } from "@/lib/decision-engine/seed/production-pricing-rules";
import { calculateProductionMtmPriceForRehearsal } from "../production-pricing";
import { STOREFRONT_FABRICS_BY_ID } from "../fabrics";

test("the immutable production ruleset is activation-ready without changing calibration evidence", () => {
  const validation = validatePricingRuleActivation(MTM_PRODUCTION_PRICING_RULE_SET, MTM_PRODUCTION_DECISION_REGISTRY);
  assert.equal(validation.valid, true, validation.issues.map((issue) => `${issue.code}:${issue.field}`).join("\n"));
  assert.equal(MTM_PRODUCTION_PRICING_RULE_SET.lifecycle, "ACTIVE");
  assert.equal(MTM_PRODUCTION_PRICING_RULE_SET.headingRules.EYELET?.fullnessFactor.value, MTM_PRODUCTION_PRICING_RULE_SET.headingRules.DOUBLE_PINCH?.fullnessFactor.value);
  assert.equal(MTM_PRODUCTION_PRICING_RULE_SET.headingRules.EYELET?.priceFactor.value, MTM_PRODUCTION_PRICING_RULE_SET.headingRules.DOUBLE_PINCH?.priceFactor.value);
});

test("a compatible fresh production rehearsal configuration uses the production pricing path", () => {
  const source = [...STOREFRONT_FABRICS_BY_ID.values()][0];
  assert.ok(source);
  const fabric = {
    ...source,
    supplierCostPerMetre: { amountMinor: 1_000, currency: "GBP" as const },
    supplierCostEffectiveFrom: "2026-09-20",
  };
  const result = calculateProductionMtmPriceForRehearsal({
    windowSlug: "standard-window",
    measurementBasis: "TRACK_WIDTH",
    hardware: "TRACK",
    widthCm: 180,
    dropCm: 220,
    fabricId: fabric.id,
    heading: "PENCIL_PLEAT",
    lining: "UNLINED",
    construction: "PAIR",
    stackDirection: "SPLIT",
  }, fabric);
  assert.equal(result.calculationVersion, MTM_PRODUCTION_PRICING_RULE_SET.version);
  assert.ok(result.total.amountMinor > 0);
});
