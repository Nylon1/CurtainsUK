import { calculatePrice } from "@/lib/decision-engine/pricing-engine";
import { validatePricingRuleActivation } from "@/lib/decision-engine/validation";
import {
  MTM_PRODUCTION_DECISION_REGISTRY,
  MTM_PRODUCTION_PRICING_RULE_SET,
} from "@/lib/decision-engine/seed/production-pricing-rules";
import type { FabricSpec } from "@/lib/decision-engine/types";
import {
  calculateCustomerPriceWithRules,
  prepareStagingConfiguration,
  type StagingPriceRequest,
} from "./staging-pricing";

function assertProductionRulesetActive() {
  const activation = validatePricingRuleActivation(
    MTM_PRODUCTION_PRICING_RULE_SET,
    MTM_PRODUCTION_DECISION_REGISTRY,
  );
  if (!activation.valid) {
    throw new Error(`MTM_PRODUCTION_RULESET_BLOCKED:${activation.issues.map((issue) => issue.code).join(",")}`);
  }
}

/**
 * The isolated production path used by the private Draft Order rehearsal.
 * It cannot be reached from the public Shopify app proxy while the checkout
 * runtime remains disabled.
 */
export function calculateProductionMtmPriceForRehearsal(
  input: StagingPriceRequest,
  fabric: FabricSpec,
) {
  assertProductionRulesetActive();
  const { configuration, windowType } = prepareStagingConfiguration(input, fabric, MTM_PRODUCTION_PRICING_RULE_SET);
  return calculatePrice({
    configuration,
    windowType,
    fabric,
    rules: MTM_PRODUCTION_PRICING_RULE_SET,
    shippingZone: "UK_MAINLAND",
    mode: "PRODUCTION",
    decisionRegistry: MTM_PRODUCTION_DECISION_REGISTRY,
  });
}

/** Production customer pricing: real production rules, not a draft result relabelled later. */
export function calculateProductionMtmCustomerPrice(
  input: StagingPriceRequest,
  fabric: FabricSpec,
) {
  assertProductionRulesetActive();
  const result = calculateCustomerPriceWithRules(input, fabric, "Availability to be confirmed", {
    rules: MTM_PRODUCTION_PRICING_RULE_SET,
    mode: "PRODUCTION",
    decisionRegistry: MTM_PRODUCTION_DECISION_REGISTRY,
  });
  if (result.calculationVersion !== MTM_PRODUCTION_PRICING_RULE_SET.version) throw new Error("MTM_PRODUCTION_RULESET_IDENTITY_INVALID");
  return result;
}
