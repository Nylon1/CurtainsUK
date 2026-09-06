import type { FabricSpec } from "../types";

/**
 * Synthetic fixtures used to exercise the schema. They are deliberately not
 * real supplier records and must never be published to Shopify or Google.
 */
export const FABRIC_SPEC_FIXTURES: FabricSpec[] = [
  {
    id: "fabric_fixture_pt_plain_001",
    supplier: "Prestigious Textiles (fixture)",
    collection: "Schema Example Plains",
    design: "Example Plain",
    colour: "Natural",
    supplierReference: "PT-FIXTURE-PLAIN-NATURAL",
    uniqueSku: "CUK-FIX-PT-PLAIN-NAT",
    usableWidthMm: 1380,
    verticalRepeatMm: null,
    horizontalRepeatMm: null,
    patternMatchType: "PLAIN",
    composition: [{ material: "Polyester", percentage: 100 }],
    careInstructions: ["Fixture only: replace with supplier instructions"],
    usageSuitability: ["Curtains"],
    supplierCostPerMetre: null,
    sellingRatePerMetre: null,
    sampleAvailable: true,
    samplePrice: null,
    leadTime: { minimumBusinessDays: 5, maximumBusinessDays: 10 },
    status: "DRAFT",
    imageReferences: ["fixture://fabrics/example-plain-natural"],
    allowedHeadings: [
      "WAVE",
      "PENCIL_PLEAT",
      "DOUBLE_PINCH",
      "TRIPLE_PINCH",
      "EYELET",
    ],
    allowedLinings: ["UNLINED", "STANDARD", "BLACKOUT", "THERMAL"],
    suitableWindowTypeSlugs: ["standard-window", "patio-doors"],
    googleFeedEligibility: {
      eligible: false,
      reason: "Synthetic fixture with unresolved commercial and identifier data",
      identifierExists: false,
    },
    fixtureOnly: true,
  },
  {
    id: "fabric_fixture_pt_pattern_001",
    supplier: "Prestigious Textiles (fixture)",
    collection: "Schema Example Patterns",
    design: "Example Botanical",
    colour: "Sage",
    supplierReference: "PT-FIXTURE-BOTANICAL-SAGE",
    uniqueSku: "CUK-FIX-PT-BOT-SAGE",
    usableWidthMm: 1370,
    verticalRepeatMm: 640,
    horizontalRepeatMm: 685,
    patternMatchType: "HALF_DROP",
    composition: [
      { material: "Cotton", percentage: 55 },
      { material: "Polyester", percentage: 45 },
    ],
    careInstructions: ["Fixture only: replace with supplier instructions"],
    usageSuitability: ["Curtains", "Roman blinds"],
    supplierCostPerMetre: null,
    sellingRatePerMetre: null,
    sampleAvailable: true,
    samplePrice: null,
    leadTime: { minimumBusinessDays: 5, maximumBusinessDays: 15 },
    status: "DRAFT",
    imageReferences: ["fixture://fabrics/example-botanical-sage"],
    allowedHeadings: [
      "WAVE",
      "PENCIL_PLEAT",
      "DOUBLE_PINCH",
      "TRIPLE_PINCH",
    ],
    allowedLinings: ["STANDARD", "BLACKOUT", "THERMAL"],
    suitableWindowTypeSlugs: [
      "standard-window",
      "bay-window",
      "french-doors",
    ],
    googleFeedEligibility: {
      eligible: false,
      reason: "Synthetic fixture with unresolved commercial and identifier data",
      identifierExists: false,
    },
    fixtureOnly: true,
  },
];

export const FABRIC_SPECS_BY_ID = new Map(
  FABRIC_SPEC_FIXTURES.map((fabric) => [fabric.id, fabric]),
);
