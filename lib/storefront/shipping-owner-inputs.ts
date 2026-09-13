import { INITIAL_COMPLEXITY_RULE_SET } from "@/lib/decision-engine/seed/pricing-rules";
import { STOREFRONT_WINDOWS_BY_SLUG } from "./window-catalog";
import ownerInputs from "@/config/curtainsuk-shipping-owner-inputs.json";
import { quoteUkShipping, type ShippingRule, type ShippingQuote, type ShippingParcelClass, type UkShippingRegion } from "./shipping";

export const SHIPPING_PARCEL_CLASSES = ["STANDARD", "LARGE", "OVERSIZE"] as const;
type Dimensions = { maxLengthMm: number | null; maxWidthMm: number | null; maxHeightMm: number | null; maxWeightGrams: number | null };
export type ShippingOwnerInputs = Omit<typeof ownerInputs, "approvedBy" | "approvedAt" | "postcodeMapping" | "parcelThresholds" | "maximumParcel" | "packingRules"> & {
  approvedBy: string | null;
  approvedAt: string | null;
  postcodeMapping: { status: string; rules: { outwardCode?: string; area?: string; minDistrict?: number; maxDistrict?: number; region: UkShippingRegion }[]; excludedAreas?: string[]; unmatchedPostcode: string; conflictingMatches: string };
  parcelThresholds: { status: string } & Record<(typeof SHIPPING_PARCEL_CLASSES)[number], Dimensions>;
  maximumParcel: Dimensions;
  packingRules: { minFabricMetresExclusive: number; maxFabricMetres: number; maxFinishedDropCm: number; parcel: { lengthMm: number; widthMm: number; heightMm: number; weightGrams: number } }[];
};
export const STAGING_SHIPPING_OWNER_INPUTS: ShippingOwnerInputs = ownerInputs as ShippingOwnerInputs;

export type PackedParcel = { lengthMm: number; widthMm?: number; heightMm?: number; weightGrams: number; specialistHandling?: boolean };
const fields = ["maxLengthMm", "maxWidthMm", "maxHeightMm", "maxWeightGrams"] as const;

export function shippingPolicyBlockers(policy: ShippingOwnerInputs = STAGING_SHIPPING_OWNER_INPUTS): string[] {
  const blockers: string[] = [];
  if (policy.environment !== "STAGING" || policy.status !== "VALIDATED" || !policy.approvedBy?.trim()
    || !policy.approvedAt || !Number.isFinite(Date.parse(policy.approvedAt))) blockers.push("SHIPPING_OWNER_APPROVAL_REQUIRED");
  if (policy.postcodeMapping.status !== "VALIDATED" || !policy.postcodeMapping.rules.length
    || !["BLOCKED", "UK_MAINLAND"].includes(policy.postcodeMapping.unmatchedPostcode) || policy.postcodeMapping.conflictingMatches !== "BLOCKED") blockers.push("POSTCODE_MAPPING_REQUIRED");
  if (policy.launchMode !== "SINGLE_RATE") {
    if (policy.parcelThresholds.status !== "VALIDATED" || !["STANDARD", "LARGE"].every(key => { const limits = policy.parcelThresholds[key as "STANDARD" | "LARGE"]; return Number.isSafeInteger(limits.maxLengthMm) && limits.maxLengthMm! > 0 && Number.isSafeInteger(limits.maxWeightGrams) && limits.maxWeightGrams! > 0; })) blockers.push("PARCEL_THRESHOLDS_REQUIRED");

    const standard = policy.parcelThresholds.STANDARD;
    const large = policy.parcelThresholds.LARGE;
    if (large.maxLengthMm! < standard.maxLengthMm! || large.maxWeightGrams! < standard.maxWeightGrams!
      || [...SHIPPING_PARCEL_CLASSES.map(key => policy.parcelThresholds[key]), policy.maximumParcel]
        .some(limits => fields.some(key => limits[key] !== null && (!Number.isSafeInteger(limits[key]) || limits[key]! <= 0)))) blockers.push("PARCEL_THRESHOLDS_INVALID");
  }
  if (policy.specialistHandlingClass !== "OVERSIZE") blockers.push("SPECIALIST_HANDLING_CLASS_REQUIRED");
  if (policy.specialistManualOverride.automaticCheckout !== false) blockers.push("MANUAL_OVERRIDE_MUST_BLOCK_AUTOMATIC_CHECKOUT");
  return blockers;
}

/** Owner region rules apply only to a complete UK postcode. Packed length is the longest side. */
export function resolveOwnerShipping(input: {
  postcode: string;
  parcel: PackedParcel;
  policy?: ShippingOwnerInputs;
}): { region: UkShippingRegion; parcelClass: ShippingParcelClass } {
  const policy = input.policy ?? STAGING_SHIPPING_OWNER_INPUTS;
  if (shippingPolicyBlockers(policy).length) throw new Error("SHIPPING_POLICY_NOT_CONFIRMED");
  const region = resolveOwnerShippingRegion(input.postcode, policy);
  const packed = [input.parcel.lengthMm, input.parcel.widthMm, input.parcel.heightMm, input.parcel.weightGrams];
  if (![packed[0], packed[3]].every(value => Number.isSafeInteger(value) && value! > 0)
    || packed.slice(1,3).some(value => value !== undefined && (!Number.isSafeInteger(value) || value <= 0 || value > input.parcel.lengthMm))
    || (input.parcel.specialistHandling !== undefined && typeof input.parcel.specialistHandling !== "boolean")) throw new Error("SHIPPING_PARCEL_INVALID");
  const fits = (limits: Dimensions) => fields.every((key, index) => limits[key] === null || (packed[index] !== undefined && packed[index]! <= limits[key]!));
  if (!fits(policy.maximumParcel)) throw new Error("SHIPPING_MANUAL_OVERRIDE_REQUIRED");
  const parcelClass = input.parcel.specialistHandling ? "OVERSIZE" : SHIPPING_PARCEL_CLASSES.find(key => fits(policy.parcelThresholds[key]));
  if (!parcelClass) throw new Error("SHIPPING_MANUAL_OVERRIDE_REQUIRED");
  return { region, parcelClass };
}

export function resolveOwnerShippingRegion(postcode: string, policy: ShippingOwnerInputs = STAGING_SHIPPING_OWNER_INPUTS): UkShippingRegion {
  const compact = postcode.toUpperCase().replace(/\s/g, "");
  if (!/^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/.test(compact)) throw new Error("SHIPPING_POSTCODE_INVALID");
  const outwardCode = compact.slice(0, -3);
  const area = outwardCode.match(/^[A-Z]+/)![0];
  const district = Number(outwardCode.slice(area.length).match(/^\d+/)?.[0]);
  if (policy.postcodeMapping.excludedAreas?.includes(area)) throw new Error("SHIPPING_POSTCODE_UNMAPPED_OR_AMBIGUOUS");
  const matches = policy.postcodeMapping.rules.filter(rule => rule.outwardCode
    ? rule.outwardCode === outwardCode
    : rule.area === area && (rule.minDistrict === undefined || district >= rule.minDistrict)
      && (rule.maxDistrict === undefined || district <= rule.maxDistrict));
  if (matches.length > 1 || (!matches.length && policy.postcodeMapping.unmatchedPostcode !== "UK_MAINLAND")) throw new Error("SHIPPING_POSTCODE_UNMAPPED_OR_AMBIGUOUS");
  return matches[0]?.region ?? "UK_MAINLAND";
}

/** Reuse established configuration thresholds; never infer packed weight from fabric. */
export function deliveryRequiresReview(windowType: string, measurements: Record<string, unknown>, specification: Record<string, unknown> = {}): boolean {
  const width = Number(measurements.coverage_width ?? measurements.door_width ?? 0);
  const drop = Math.max(0, ...Object.entries(measurements).filter(([key,value]) => /drop|height|vertical/i.test(key) && typeof value === "number").map(([,value]) => Number(value)));
  return STOREFRONT_WINDOWS_BY_SLUG.get(windowType)?.journey === "SPECIALIST"
    || width > INITIAL_COMPLEXITY_RULE_SET.reviewMaximumWidthCm
    || drop > INITIAL_COMPLEXITY_RULE_SET.reviewMaximumDropCm
    || specification.commercial_order === true || specification.specialist_delivery === true
    || specification.unusually_heavy === true;
}

/** Only read this from an immutable, staff-approved revision, never customer input. */
export function approvedDeliveryConfirmation(value: unknown): { postcode: string; region: UkShippingRegion; grossAmountMinor: number; reason: string } | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  const v = value as Record<string, unknown>;
  if (typeof v.postcode !== "string" || typeof v.reason !== "string" || v.reason.trim().length < 3
    || !Number.isSafeInteger(v.gross_amount_minor) || Number(v.gross_amount_minor) <= 0) return;
  try {
    const region = resolveOwnerShippingRegion(v.postcode);
    if (region !== v.region) return;
    return {postcode:v.postcode.toUpperCase().replace(/\s/g,""),region,grossAmountMinor:Number(v.gross_amount_minor),reason:v.reason};
  } catch { return; }
}

/** Caller supplies server-calculated metres/drop, never a browser-provided parcel class. */
export function quoteOwnerApprovedCurtainShipping(input: {
  postcode?: string; selectedRegion: string; fabricMetres: number; maximumDropCm: number;
  /** Trusted staff/server packing evidence, never a browser-supplied class. */
  packedParcel?: PackedParcel;
  requiresDeliveryReview?: boolean;
  approvedDelivery?: ReturnType<typeof approvedDeliveryConfirmation>;
  rules: readonly ShippingRule[]; policy?: ShippingOwnerInputs;
}): ShippingQuote {
  const policy = input.policy ?? STAGING_SHIPPING_OWNER_INPUTS;
  const blocked = quoteUkShipping({ region: input.selectedRegion, parcelClass: "STANDARD", rules: [] });
  const unavailable = { ...blocked, status: "RATE_REQUIRES_CONFIRMATION" as const, message: "Delivery confirmed after review" };
  if (!input.postcode || shippingPolicyBlockers(policy).length || !(input.fabricMetres > 0) || !(input.maximumDropCm > 0)) return unavailable;
  if (policy.launchMode === "SINGLE_RATE") {
    try {
      const region = resolveOwnerShippingRegion(input.postcode, policy);
      if (region !== input.selectedRegion) return unavailable;
      const postcode = input.postcode.toUpperCase().replace(/\s/g, "");
      if (input.requiresDeliveryReview || input.packedParcel?.specialistHandling) {
        const approved = input.approvedDelivery;
        if (!approved || approved.region !== region || approved.postcode !== postcode) return unavailable;
        return {...blocked,region,parcelClass:"SPECIALIST",status:"READY",grossAmountMinor:approved.grossAmountMinor,postcode,policyVersion:policy.version,message:"Delivery confirmed after review"};
      }
      return {...quoteUkShipping({region,parcelClass:"STANDARD",rules:input.rules}),postcode,policyVersion:policy.version};
    } catch { return unavailable; }
  }
  const packing = policy.packingRules.filter(rule => input.fabricMetres > rule.minFabricMetresExclusive
    && input.fabricMetres <= rule.maxFabricMetres && input.maximumDropCm <= rule.maxFinishedDropCm);
  if (!input.packedParcel && packing.length !== 1) return unavailable;
  try {
    const resolved = resolveOwnerShipping({ postcode: input.postcode, parcel: input.packedParcel ?? packing[0].parcel, policy });
    if (resolved.region !== input.selectedRegion) return unavailable;
    return { ...quoteUkShipping({ ...resolved, rules: input.rules }), postcode: input.postcode.toUpperCase().replace(/\s/g, ""), policyVersion: policy.version };
  } catch { return unavailable; }
}
