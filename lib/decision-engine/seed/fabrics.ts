import type { FabricSpec, PatternMatchType } from "../types";

function fixture(id: string, match: PatternMatchType): FabricSpec {
  const patterned = match !== "RANDOM_MATCH";
  return {
    id,
    supplier: "Prestigious Textiles (synthetic fixture)",
    collection: patterned ? "Schema Example Patterns" : "Schema Example Plains",
    design: patterned ? "Example Botanical" : "Example Plain",
    colour: patterned ? "Sage" : "Natural",
    supplierReference: patterned ? "PT-FIXTURE-BOTANICAL-SAGE" : "PT-FIXTURE-PLAIN-NATURAL",
    uniqueSku: patterned ? "CUK-FIX-PT-BOT-SAGE" : "CUK-FIX-PT-PLAIN-NAT",
    usableWidthMm: patterned ? 1370 : 1380,
    verticalRepeatMm: patterned ? 640 : null,
    horizontalRepeatMm: patterned ? 685 : null,
    patternMatchType: match,
    patternCentringRequirement: patterned ? "WORKROOM_CONFIRMATION_REQUIRED" : "NONE",
    composition: patterned
      ? [{ material: "Cotton", percentage: 55 }, { material: "Polyester", percentage: 45 }]
      : [{ material: "Polyester", percentage: 100 }],
    careInstructions: ["Fixture only: replace with supplier instructions"],
    usageSuitability: ["Curtains"],
    fabricWeightGsm: null,
    supplierCostPerMetre: null,
    sellingPricePolicy: {
      supplierRrpPerMetre: null,
      curtainsUkSellingRatePerMetre: null,
      pricingBand: null,
      minimumGrossMarginPercent: null,
      minimumCashMargin: null,
      effectiveFrom: null,
      manualOverride: { enabled: false, ratePerMetre: null, reason: null, approvedBy: null },
    },
    sample: {
      sku: patterned ? "CUK-SAMPLE-FIX-PT-BOT-SAGE" : "CUK-SAMPLE-FIX-PT-PLAIN-NAT",
      available: true,
      price: null,
      postage: null,
      futureOrderCreditEligible: false,
    },
    leadTime: { minimumBusinessDays: 5, maximumBusinessDays: patterned ? 15 : 10 },
    recordLifecycle: "DRAFT",
    supplierAvailability: "UNKNOWN",
    imageReferences: [`fixture://fabrics/${patterned ? "example-botanical-sage" : "example-plain-natural"}`],
    allowedHeadings: patterned
      ? ["WAVE", "PENCIL_PLEAT", "DOUBLE_PINCH", "TRIPLE_PINCH"]
      : ["WAVE", "PENCIL_PLEAT", "DOUBLE_PINCH", "TRIPLE_PINCH", "EYELET"],
    allowedLinings: patterned
      ? ["STANDARD", "BLACKOUT", "THERMAL"]
      : ["UNLINED", "STANDARD", "BLACKOUT", "THERMAL"],
    suitableWindowTypeSlugs: patterned
      ? ["standard-window", "bay-window", "french-doors"]
      : ["standard-window", "patio-doors"],
    googleFeedEligibility: {
      eligible: false,
      reason: "Synthetic fixture with unresolved commercial and identifier data",
      identifierExists: false,
    },
    fixtureOnly: true,
  };
}

export const FABRIC_SPEC_FIXTURES: FabricSpec[] = [
  fixture("fabric_fixture_pt_plain_001", "RANDOM_MATCH"),
  fixture("fabric_fixture_pt_pattern_001", "HALF_DROP_MATCH"),
];

export const FABRIC_SPECS_BY_ID = new Map(FABRIC_SPEC_FIXTURES.map((fabric) => [fabric.id, fabric]));
