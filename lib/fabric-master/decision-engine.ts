import type { FabricSpec } from "@/lib/decision-engine/types";
import type { FabricMasterRecord } from "./types";
import type { ConfigurationFabricIdentity } from "@/lib/decision-engine/validation";

/** Identity-only review does not invent missing width, repeat or commercial data. */
export function toReviewFabricIdentity(record: FabricMasterRecord): ConfigurationFabricIdentity & Pick<FabricSpec, "supplier" | "collection" | "design"> {
  return {
    id: record.fabric_id, colour: record.colour_name, supplier: record.supplier_name,
    collection: record.collection_name, design: record.design_name,
    recordLifecycle: record.lifecycle_state === "DISCONTINUED" ? "RETIRED" : "ACTIVE",
    supplierAvailability: "UNKNOWN",
    allowedHeadings: ["PENCIL_PLEAT", "WAVE", "DOUBLE_PINCH", "TRIPLE_PINCH", "EYELET"],
    allowedLinings: ["UNLINED", "STANDARD", "BLACKOUT", "THERMAL", "BONDED"],
    suitableWindowTypeSlugs: ["*"],
  };
}

export function toDecisionEngineFabric(record: FabricMasterRecord, cutCostMinor: number | null, effectiveDate: string): FabricSpec {
  if (!record.usable_width_mm || !Number.isFinite(record.usable_width_mm) || record.usable_width_mm <= 0) throw new Error("FABRIC_SPECIFICATION_INCOMPLETE");
  const verifiedPattern = record.pattern_match_type === "RANDOM_MATCH"
    || (record.pattern_match_type !== null && (record.vertical_repeat_mm ?? 0) > 0);
  // An explicit specialist match stays authoritative even when its repeat is missing.
  const fallback = !verifiedPattern && record.pattern_match_type !== "HALF_DROP_MATCH";
  const noMatchRequired = record.pattern_match_type === null && record.vertical_repeat_mm === 0;
  return {
    id: record.fabric_id,
    supplier: record.supplier_name,
    collection: record.collection_name,
    design: record.design_name,
    colour: record.colour_name,
    supplierReference: record.supplier_sku,
    uniqueSku: record.supplier_sku,
    usableWidthMm: record.usable_width_mm,
    verticalRepeatMm: record.vertical_repeat_mm,
    horizontalRepeatMm: record.horizontal_repeat_mm,
    patternMatchType: record.pattern_match_type,
    ...(fallback ? { patternAllowance: {
      provenance: noMatchRequired ? "PLAIN_NO_MATCH_REQUIRED" as const : "DEFAULT_PATTERN_ALLOWANCE" as const,
      allowanceMm: noMatchRequired ? 0 as const : 500 as const,
      policyVersion: "curtainsuk-pattern-allowance-v1" as const,
    } } : {}),
    patternCentringRequirement: record.pattern_match_type === "RANDOM_MATCH" ? "NONE" : "PREFERRED",
    composition: record.composition,
    careInstructions: record.care_instructions,
    usageSuitability: record.usage_suitability,
    fabricWeightGsm: record.weight_gsm,
    supplierCostPerMetre: cutCostMinor === null ? null : { amountMinor: cutCostMinor, currency: "GBP" },
    supplierCostEffectiveFrom: effectiveDate,
    sellingPricePolicy: {
      supplierRrpPerMetre: null,
      curtainsUkSellingRatePerMetre: null,
      pricingBand: null,
      minimumGrossMarginPercent: 35,
      minimumCashMargin: null,
      effectiveFrom: effectiveDate,
      manualOverride: { enabled: false, ratePerMetre: null, reason: null, approvedBy: null },
    },
    sample: {
      sku: `SAMPLE-${record.supplier_sku}`,
      available: record.sample_available === true,
      price: null,
      postage: null,
      futureOrderCreditEligible: false,
    },
    leadTime: { minimumBusinessDays: 5, maximumBusinessDays: 20 },
    recordLifecycle: record.lifecycle_state === "DISCONTINUED" ? "RETIRED" : "ACTIVE",
    supplierAvailability: "UNKNOWN",
    imageReferences: record.imagery,
    allowedHeadings: ["PENCIL_PLEAT", "WAVE", "DOUBLE_PINCH", "TRIPLE_PINCH", "EYELET"],
    allowedLinings: ["UNLINED", "STANDARD", "BLACKOUT", "THERMAL", "BONDED"],
    suitableWindowTypeSlugs: ["*"],
    googleFeedEligibility: {
      eligible: false,
      reason: "Unpublished development projection; production approval required",
      identifierExists: true,
    },
    fixtureOnly: false,
  };
}
