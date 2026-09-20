import { calculatePrice } from "@/lib/decision-engine/pricing-engine";
import { validatePricingRuleActivation } from "@/lib/decision-engine/validation";
import {
  MTM_PRODUCTION_DECISION_REGISTRY,
  MTM_PRODUCTION_PRICING_RULE_SET,
} from "@/lib/decision-engine/seed/production-pricing-rules";
import type { FabricSpec } from "@/lib/decision-engine/types";
import { prepareStagingConfiguration, type StagingPriceRequest } from "./staging-pricing";

/**
 * The isolated production path used by the private Draft Order rehearsal.
 * It cannot be reached from the public Shopify app proxy while the checkout
 * runtime remains disabled.
 */
export function calculateProductionMtmPriceForRehearsal(
  input: StagingPriceRequest,
  fabric: FabricSpec,
) {
  const activation = validatePricingRuleActivation(
    MTM_PRODUCTION_PRICING_RULE_SET,
    MTM_PRODUCTION_DECISION_REGISTRY,
  );
  if (!activation.valid) {
    throw new Error(`MTM_PRODUCTION_RULESET_BLOCKED:${activation.issues.map((issue) => issue.code).join(",")}`);
  }
  const { configuration, windowType } = prepareStagingConfiguration(input, fabric);
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
