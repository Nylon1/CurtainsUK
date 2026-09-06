import type { PricingRuleSet } from "./types";
import { validatePricingRuleSet } from "./validation";

export class PricingRuleRegistry {
  readonly #byVersion: ReadonlyMap<string, PricingRuleSet>;

  constructor(ruleSets: PricingRuleSet[]) {
    const byVersion = new Map<string, PricingRuleSet>();
    for (const ruleSet of ruleSets) {
      const validation = validatePricingRuleSet(ruleSet);
      if (!validation.valid) {
        throw new Error(
          `Invalid pricing-rule version ${ruleSet.version}: ${validation.issues
            .map((issue) => issue.field)
            .join(", ")}`,
        );
      }
      if (byVersion.has(ruleSet.version)) {
        throw new Error(`Duplicate pricing-rule version: ${ruleSet.version}`);
      }
      byVersion.set(ruleSet.version, structuredClone(ruleSet));
    }
    this.#byVersion = byVersion;
  }

  get(version: string): PricingRuleSet {
    const ruleSet = this.#byVersion.get(version);
    if (!ruleSet) {
      throw new Error(`Unknown pricing-rule version: ${version}`);
    }
    return structuredClone(ruleSet);
  }

  resolveActive(at: Date): PricingRuleSet {
    const candidates = [...this.#byVersion.values()]
      .filter((ruleSet) => {
        if (ruleSet.status !== "ACTIVE" || !ruleSet.effectiveFrom) return false;
        const starts = new Date(ruleSet.effectiveFrom);
        const ends = ruleSet.effectiveTo ? new Date(ruleSet.effectiveTo) : null;
        return starts <= at && (!ends || at < ends);
      })
      .sort(
        (left, right) =>
          new Date(right.effectiveFrom!).getTime() -
          new Date(left.effectiveFrom!).getTime(),
      );

    if (candidates.length === 0) {
      throw new Error(`No active pricing rules for ${at.toISOString()}`);
    }
    return structuredClone(candidates[0]);
  }
}
