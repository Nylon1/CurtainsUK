import type { FabricSpec } from "@/lib/decision-engine/types";
import type { FabricMasterRecord } from "./types";

export function toDecisionEngineFabric(record: FabricMasterRecord, cutCostMinor: number, effectiveDate: string): FabricSpec {
  if (!record.usable_width_mm || !record.pattern_match_type) throw new Error("FABRIC_SPECIFICATION_INCOMPLETE");
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
    patternCentringRequirement: record.pattern_match_type === "RANDOM_MATCH" ? "NONE" : "PREFERRED",
    composition: record.composition,
    careInstructions: record.care_instructions,
    usageSuitability: record.usage_suitability,
    fabricWeightGsm: record.weight_gsm,
    supplierCostPerMetre: { amountMinor: cutCostMinor, currency: "GBP" },
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
    allowedLinings: ["UNLINED", "STANDARD", "BLACKOUT", "THERMAL"],
    suitableWindowTypeSlugs: ["*"],
    googleFeedEligibility: {
      eligible: false,
      reason: "Unpublished development projection; production approval required",
      identifierExists: true,
    },
    fixtureOnly: false,
  };
}
