import type { FabricSpec } from "@/lib/decision-engine/types";
import { PRESTIGIOUS_PILOT_FABRICS, PRESTIGIOUS_PILOT_FABRICS_BY_ID } from "@/lib/prestigious/pilot-fabrics";
import type { PrestigiousPublicFabric } from "@/lib/prestigious/types";

export type StorefrontFabric = PrestigiousPublicFabric;
export const STOREFRONT_FABRICS = PRESTIGIOUS_PILOT_FABRICS;
export const STOREFRONT_FABRICS_BY_ID = PRESTIGIOUS_PILOT_FABRICS_BY_ID;

export function compositionLabel(fabric: FabricSpec): string {
  return fabric.composition.map((part) => `${part.percentage}% ${part.material}`).join(", ");
}

export function repeatLabel(fabric: FabricSpec): string {
  if (fabric.patternMatchType === "RANDOM_MATCH") return "No pattern repeat";
  if (fabric.verticalRepeatMm === null) return "Repeat pending";
  return `${fabric.verticalRepeatMm / 10} cm vertical repeat`;
}
