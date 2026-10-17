import type { TrackWeightInput, WeightMaterial } from "./domain";
export type WeightResult = {
  status: "MEASURED" | "ESTIMATED" | "UNKNOWN";
  minimumKg: number | null;
  maximumKg: number | null;
  compatibility: "WITHIN_LIMIT" | "OVER_LIMIT" | "REVIEW_REQUIRED";
  assumptions: string[];
  message: string;
};
export type GovernedCurtainWeight = {
  materials: WeightMaterial[];
  complete: boolean;
  assumptions: string[];
};
const rounded = (kg: number) => Math.round(kg * 1000) / 1000;
export function materialWeightKg(material: WeightMaterial): number | null {
  if (Number.isFinite(material.grams) && material.grams! >= 0)
    return material.grams! / 1000;
  if (!(material.density! > 0) || !Number.isFinite(material.density))
    return null;
  if (material.unit === "G_PER_LINEAR_METRE")
    return material.metres! > 0
      ? (material.metres! * material.density!) / 1000
      : null;
  if (material.unit !== "GSM") return null;
  const area = material.areaM2 ?? (material.metres! * material.widthCm!) / 100;
  return area > 0 && Number.isFinite(area)
    ? (area * material.density!) / 1000
    : null;
}
export function checkTrackWeight(
  input: TrackWeightInput,
  maximumKg = 35,
  governed?: GovernedCurtainWeight,
): WeightResult {
  let min: number | null = null,
    max: number | null = null,
    status: WeightResult["status"] = "UNKNOWN";
  const assumptions: string[] = [];
  if (input.mode === "MEASURED") {
    min = max = input.kg;
    status = "MEASURED";
    assumptions.push("Total of every curtain panel carried by one track.");
  }
  if (input.mode === "CURTAINSUK") {
    assumptions.push(
      ...(governed?.assumptions ?? [
        "Material weights are not yet confirmed for this curtain configuration.",
      ]),
    );
    const weights = governed?.materials.map(materialWeightKg) ?? [];
    if (weights.length && weights.every((n) => n !== null)) {
      min = weights.reduce<number>((sum, n) => sum + n!, 0);
      max = governed?.complete ? min : null;
      status = "ESTIMATED";
    }
    if (!governed?.complete)
      assumptions.push(
        "Missing material or component evidence prevents an upper-bound estimate. Please weigh the finished curtains.",
      );
  }
  if (input.mode === "EXISTING_ESTIMATE") {
    const area =
      ((input.panels * input.widthCm * input.dropCm) / 10000) *
      (input.widthBasis === "FLAT" ? 1 : input.fullness!);
    assumptions.push(
      input.widthBasis === "FLAT"
        ? "Flat fabric width per panel; fullness is not applied."
        : "Coverage width per panel multiplied by the stated fullness once.",
    );
    assumptions.push(
      "Dimensions must include the cloth in headings and hems. Unmeasured tape, hooks and other components are not included.",
    );
    if (input.lining)
      assumptions.push(
        "Lining uses the same area and gather as the face fabric.",
      );
    if (input.liningGsmSource === "STANDARD_PRESET")
      assumptions.push(
        "Standard lining estimate uses 200 g/m² (Evans DB1 reference). The customer's actual lining may differ; this is not measured weight.",
      );
    const densities = [
      input.gsm,
      ...(input.lining ? [input.liningGsm] : []),
      ...(input.interlining ? [input.interliningGsm] : []),
    ];
    if (input.gsm !== undefined) {
      min = (area * densities.reduce<number>((s, n) => s + (n ?? 0), 0)) / 1000;
      status = "ESTIMATED";
    }
    assumptions.push(
      densities.some((n) => n === undefined)
        ? "Fabric, lining or interlining weight is missing. Only known material weights are included; no complete total is claimed."
        : "This is a cloth-only estimate. Measure the complete panels to confirm the total.",
    );
  }
  // An incomplete upper bound can never approve the load, even if a partial total is small.
  // Purchased cloth may include discarded offcuts. An incomplete consumption
  // estimate is not a proven lower bound on the finished curtain's weight.
  const compatibility =
    min !== null && max !== null && min > maximumKg
      ? "OVER_LIMIT"
      : max !== null && max <= maximumKg
        ? "WITHIN_LIMIT"
        : "REVIEW_REQUIRED";
  return {
    status,
    minimumKg: min === null ? null : rounded(min),
    maximumKg: max === null ? null : rounded(max),
    compatibility,
    assumptions,
    message:
      compatibility === "OVER_LIMIT"
        ? `This exceeds the ${maximumKg} kg track limit.`
        : compatibility === "WITHIN_LIMIT"
          ? `Within the ${maximumKg} kg headline load limit; package configuration still needs approval.`
          : "A measured total or complete weight evidence is required to confirm capacity.",
  };
}
