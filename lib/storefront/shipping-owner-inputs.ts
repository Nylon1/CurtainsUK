import ownerInputs from "@/config/curtainsuk-shipping-owner-inputs.json";
import { quoteUkShipping, type ShippingRule, type ShippingQuote, type ShippingParcelClass, type UkShippingRegion } from "./shipping";

export const SHIPPING_PARCEL_CLASSES = ["STANDARD", "LARGE", "OVERSIZE"] as const;
type Dimensions = { maxLengthMm: number | null; maxWidthMm: number | null; maxHeightMm: number | null; maxWeightGrams: number | null };
export type ShippingOwnerInputs = Omit<typeof ownerInputs, "approvedBy" | "approvedAt" | "postcodeMapping" | "parcelThresholds" | "maximumParcel" | "packingRules"> & {
  approvedBy: string | null;
  approvedAt: string | null;
  postcodeMapping: { status: string; rules: { outwardCode: string; region: UkShippingRegion }[]; unmatchedPostcode: string; conflictingMatches: string };
  parcelThresholds: { status: string } & Record<(typeof SHIPPING_PARCEL_CLASSES)[number], Dimensions>;
  maximumParcel: Dimensions;
  packingRules: { minFabricMetresExclusive: number; maxFabricMetres: number; maxFinishedDropCm: number; parcel: { lengthMm: number; widthMm: number; heightMm: number; weightGrams: number } }[];
};
export const STAGING_SHIPPING_OWNER_INPUTS: ShippingOwnerInputs = ownerInputs;

const fields = ["maxLengthMm", "maxWidthMm", "maxHeightMm", "maxWeightGrams"] as const;
function completeDimensions(value: Dimensions) {
  return fields.every(key => Number.isSafeInteger(value[key]) && value[key]! > 0);
}

export function shippingPolicyBlockers(policy: ShippingOwnerInputs = STAGING_SHIPPING_OWNER_INPUTS): string[] {
  const blockers: string[] = [];
  if (policy.environment !== "STAGING" || policy.status !== "VALIDATED" || !policy.approvedBy?.trim()
    || !policy.approvedAt || !Number.isFinite(Date.parse(policy.approvedAt))) blockers.push("SHIPPING_OWNER_APPROVAL_REQUIRED");
  if (policy.postcodeMapping.status !== "VALIDATED" || !policy.postcodeMapping.rules.length
    || policy.postcodeMapping.unmatchedPostcode !== "BLOCKED" || policy.postcodeMapping.conflictingMatches !== "BLOCKED") blockers.push("POSTCODE_MAPPING_REQUIRED");
  if (policy.parcelThresholds.status !== "VALIDATED" || !SHIPPING_PARCEL_CLASSES.every(key => completeDimensions(policy.parcelThresholds[key]))) blockers.push("PARCEL_THRESHOLDS_REQUIRED");
  if (!completeDimensions(policy.maximumParcel)) blockers.push("MAXIMUM_PARCEL_REQUIRED");
  if (policy.specialistManualOverride.automaticCheckout !== false) blockers.push("MANUAL_OVERRIDE_MUST_BLOCK_AUTOMATIC_CHECKOUT");
  return blockers;
}

/** Exact outward-code mapping has no implicit mainland fallback. Dimensions are packed dimensions, longest side first. */
export function resolveOwnerShipping(input: {
  postcode: string;
  parcel: { lengthMm: number; widthMm: number; heightMm: number; weightGrams: number };
  policy?: ShippingOwnerInputs;
}): { region: UkShippingRegion; parcelClass: ShippingParcelClass } {
  const policy = input.policy ?? STAGING_SHIPPING_OWNER_INPUTS;
  if (shippingPolicyBlockers(policy).length) throw new Error("SHIPPING_POLICY_NOT_CONFIRMED");
  const compact = input.postcode.toUpperCase().replace(/\s/g, "");
  if (!/^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/.test(compact)) throw new Error("SHIPPING_POSTCODE_INVALID");
  const outwardCode = compact.slice(0, -3);
  const matches = policy.postcodeMapping.rules.filter(rule => rule.outwardCode === outwardCode);
  if (matches.length !== 1) throw new Error("SHIPPING_POSTCODE_UNMAPPED_OR_AMBIGUOUS");
  const packed = [input.parcel.lengthMm, input.parcel.widthMm, input.parcel.heightMm, input.parcel.weightGrams];
  if (!packed.every(value => Number.isSafeInteger(value) && value > 0)
    || packed[0] < packed[1] || packed[1] < packed[2]) throw new Error("SHIPPING_PARCEL_INVALID");
  const fits = (limits: Dimensions) => fields.every((key, index) => packed[index] <= limits[key]!);
  if (!fits(policy.maximumParcel)) throw new Error("SHIPPING_MANUAL_OVERRIDE_REQUIRED");
  const parcelClass = SHIPPING_PARCEL_CLASSES.find(key => fits(policy.parcelThresholds[key]));
  if (!parcelClass) throw new Error("SHIPPING_MANUAL_OVERRIDE_REQUIRED");
  return { region: matches[0].region, parcelClass };
}

/** Caller supplies server-calculated metres/drop, never a browser-provided parcel class. */
export function quoteOwnerApprovedCurtainShipping(input: {
  postcode?: string; selectedRegion: string; fabricMetres: number; maximumDropCm: number;
  rules: readonly ShippingRule[]; policy?: ShippingOwnerInputs;
}): ShippingQuote {
  const policy = input.policy ?? STAGING_SHIPPING_OWNER_INPUTS;
  const blocked = quoteUkShipping({ region: input.selectedRegion, parcelClass: "STANDARD", rules: [] });
  const unavailable = { ...blocked, status: "RATE_REQUIRES_CONFIRMATION" as const, message: "Delivery postcode, packing policy and owner-confirmed rate are required" };
  if (!input.postcode || shippingPolicyBlockers(policy).length || !(input.fabricMetres > 0) || !(input.maximumDropCm > 0)) return unavailable;
  const packing = policy.packingRules.filter(rule => input.fabricMetres > rule.minFabricMetresExclusive
    && input.fabricMetres <= rule.maxFabricMetres && input.maximumDropCm <= rule.maxFinishedDropCm);
  if (packing.length !== 1) return unavailable;
  try {
    const resolved = resolveOwnerShipping({ postcode: input.postcode, parcel: packing[0].parcel, policy });
    if (resolved.region !== input.selectedRegion) return unavailable;
    return { ...quoteUkShipping({ ...resolved, rules: input.rules }), postcode: input.postcode.toUpperCase().replace(/\s/g, ""), policyVersion: policy.version };
  } catch { return unavailable; }
}
