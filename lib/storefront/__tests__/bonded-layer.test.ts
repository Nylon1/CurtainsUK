import assert from "node:assert/strict";
import test from "node:test";
import { STOREFRONT_FABRICS } from "../fabrics";
import { buildStagingRuleSet, prepareStagingConfiguration, type StagingPriceRequest } from "../staging-pricing";
import { DecisionEngineValidationError } from "../../decision-engine/errors";
import { calculatePrice } from "../../decision-engine/pricing-engine";

const fabric = { ...STOREFRONT_FABRICS[0], supplierCostEffectiveFrom: "2026-09-08", supplierCostPerMetre: { amountMinor: 1000, currency: "GBP" as const } };
const request = { windowSlug: "standard-window", measurementBasis: "TRACK_WIDTH", widthCm: 200, dropCm: 220,
  fabricId: fabric.id, heading: "PENCIL_PLEAT", lining: "BONDED", construction: "PAIR", stackDirection: "SPLIT" } as StagingPriceRequest;

test("bonded lining is one complete 5 GBP per metre layer without an extra lining charge", () => {
  const rules = buildStagingRuleSet();
  const { configuration, windowType } = prepareStagingConfiguration(request, fabric);
  const result = calculatePrice({ configuration, windowType, fabric, rules, mode: "CALIBRATION", shippingZone: "UK_MAINLAND" });
  const materials = result.components.filter(c => c.code.endsWith("MATERIAL") && c.code !== "FACE_FABRIC_MATERIAL");
  const lining = result.components.find(c => c.code === "LINING_MATERIAL")!;
  assert.ok(lining);
  assert.equal(configuration.interlining, "NONE");
  assert.equal(rules.liningRules.BONDED.materialRateNetPerMetre?.amountMinor, 500);
  assert.equal(result.components.some(c => c.code.startsWith("INTERLINING_")), false);
  assert.equal(materials.filter(c => /LINING/.test(c.code)).length, 1);
  assert.equal(lining.netAmount.amountMinor, Number(lining.metadata?.metres) * 500);
});

test("bonded combined layer rejects additional separate interlining even in direct pricing", () => {
  assert.throws(() => prepareStagingConfiguration({ ...request, interlining: "INTERLINING" }, fabric), (error: unknown) => error instanceof DecisionEngineValidationError && error.issues.some(issue => issue.code === "BONDED_COMBINED_LAYER"));
  const { configuration, windowType } = prepareStagingConfiguration(request, fabric);
  configuration.interlining = "INTERLINING";
  assert.throws(() => calculatePrice({ configuration, windowType, fabric, rules: buildStagingRuleSet(), mode: "CALIBRATION", shippingZone: "UK_MAINLAND" }), (error: unknown) => error instanceof DecisionEngineValidationError && error.issues.some(issue => issue.code === "BONDED_COMBINED_LAYER"));
});
