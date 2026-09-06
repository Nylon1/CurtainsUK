import type { DecisionRegistry, PricingAdminActor, PricingRuleSet } from "./types";
import { validatePricingRuleActivation, validatePricingRuleSet } from "./validation";

export function activatePricingRuleSet(
  ruleSet: PricingRuleSet,
  decisionRegistry: DecisionRegistry,
  actor: PricingAdminActor,
  effectiveFrom: string,
): PricingRuleSet {
  if (!actor.roles.includes("PRICING_ADMIN")) throw new Error("Only an authorised pricing admin can activate a pricing ruleset");
  const validation = validatePricingRuleActivation(ruleSet, decisionRegistry);
  if (!validation.valid) throw new Error(`Pricing ruleset activation blocked: ${validation.issues.map((item) => item.code).join(", ")}`);
  const parsed = new Date(effectiveFrom);
  if (Number.isNaN(parsed.getTime())) throw new Error("A valid effective-from timestamp is required");
  return { ...structuredClone(ruleSet), lifecycle: "ACTIVE", effectiveFrom: parsed.toISOString() };
}

export class PricingRuleRegistry {
  readonly #byVersion: ReadonlyMap<string, PricingRuleSet>;

  constructor(ruleSets: PricingRuleSet[]) {
    const byVersion = new Map<string, PricingRuleSet>();
    for (const ruleSet of ruleSets) {
      const validation = validatePricingRuleSet(ruleSet);
      if (!validation.valid) throw new Error(`Invalid pricing-rule version ${ruleSet.version}: ${validation.issues.map((item) => item.field).join(", ")}`);
      if (byVersion.has(ruleSet.version)) throw new Error(`Duplicate pricing-rule version: ${ruleSet.version}`);
      byVersion.set(ruleSet.version, structuredClone(ruleSet));
    }
    this.#byVersion = byVersion;
  }

  get(version: string): PricingRuleSet {
    const ruleSet = this.#byVersion.get(version);
    if (!ruleSet) throw new Error(`Unknown pricing-rule version: ${version}`);
    return structuredClone(ruleSet);
  }

  resolveActive(at: Date): PricingRuleSet {
    const candidates = [...this.#byVersion.values()]
      .filter((ruleSet) => {
        if (ruleSet.lifecycle !== "ACTIVE" || !ruleSet.effectiveFrom) return false;
        const start = new Date(ruleSet.effectiveFrom);
        const end = ruleSet.effectiveTo ? new Date(ruleSet.effectiveTo) : null;
        return start <= at && (!end || at < end);
      })
      .sort((left, right) => new Date(right.effectiveFrom!).getTime() - new Date(left.effectiveFrom!).getTime());
    if (!candidates.length) throw new Error(`No active pricing rules for ${at.toISOString()}`);
    return structuredClone(candidates[0]);
  }
}
