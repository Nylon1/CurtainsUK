import type { DecisionRecord, DecisionRegistry } from "./types";
import { validateDecisionRegistry } from "./validation";

export function getProductionBlockingDecisions(registry: DecisionRegistry): DecisionRecord[] {
  const validation = validateDecisionRegistry(registry);
  if (!validation.valid) throw new Error(`Invalid decision registry: ${validation.issues.map((item) => item.field).join(", ")}`);
  return registry.decisions.filter((decision) => decision.blocksProductionActivation);
}

export function assertDecisionRegistryProductionSafe(registry: DecisionRegistry): void {
  const blockers = getProductionBlockingDecisions(registry);
  if (blockers.length) throw new Error(`Production activation blocked by: ${blockers.map((item) => item.decisionId).join(", ")}`);
}
