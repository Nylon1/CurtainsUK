import type { FabricSpec, PatternMatchType } from "@/lib/decision-engine/types";

export interface StorefrontFabric extends FabricSpec {
  storefrontName: string;
  storefrontDescription: string;
  swatchColour: string;
  image: string;
}

function fabric(input: {
  id: string;
  collection: string;
  design: string;
  colour: string;
  reference: string;
  costMinor: number;
  swatchColour: string;
  image: string;
  composition: FabricSpec["composition"];
  usableWidthMm?: number;
  verticalRepeatMm?: number | null;
  horizontalRepeatMm?: number | null;
  match?: PatternMatchType;
  description: string;
}): StorefrontFabric {
  const match = input.match ?? "RANDOM_MATCH";
  return {
    id: input.id,
    storefrontName: `${input.design} — ${input.colour}`,
    storefrontDescription: input.description,
    swatchColour: input.swatchColour,
    image: input.image,
    supplier: "Prestigious Textiles (synthetic staging fixture)",
    collection: input.collection,
    design: input.design,
    colour: input.colour,
    supplierReference: input.reference,
    uniqueSku: `CUK-STAGE-${input.reference}`,
    usableWidthMm: input.usableWidthMm ?? 1380,
    verticalRepeatMm: input.verticalRepeatMm ?? null,
    horizontalRepeatMm: input.horizontalRepeatMm ?? null,
    patternMatchType: match,
    patternCentringRequirement: "NONE",
    composition: input.composition,
    careInstructions: ["Synthetic staging record — replace with approved supplier care data"],
    usageSuitability: ["Curtains"],
    fabricWeightGsm: 240,
    supplierCostPerMetre: { amountMinor: input.costMinor, currency: "GBP" },
    supplierCostEffectiveFrom: "2026-09-06",
    sellingPricePolicy: {
      supplierRrpPerMetre: null,
      curtainsUkSellingRatePerMetre: null,
      pricingBand: "STAGING_ONLY",
      minimumGrossMarginPercent: 40,
      minimumCashMargin: null,
      effectiveFrom: null,
      manualOverride: { enabled: false, ratePerMetre: null, reason: null, approvedBy: null },
    },
    sample: {
      sku: `CUK-STAGE-SAMPLE-${input.reference}`,
      available: true,
      price: null,
      postage: null,
      futureOrderCreditEligible: false,
    },
    leadTime: { minimumBusinessDays: 10, maximumBusinessDays: 15 },
    // Active only inside this isolated staging catalogue; fixtureOnly/feed governance
    // keeps the record ineligible for Shopify or Merchant Center export.
    recordLifecycle: "ACTIVE",
    supplierAvailability: "ACTIVE",
    imageReferences: [input.image],
    allowedHeadings: ["PENCIL_PLEAT", "WAVE", "DOUBLE_PINCH", "TRIPLE_PINCH", "EYELET"],
    allowedLinings: ["UNLINED", "STANDARD", "BLACKOUT", "THERMAL"],
    suitableWindowTypeSlugs: ["*"],
    googleFeedEligibility: {
      eligible: false,
      reason: "Synthetic staging fixture is never feed eligible",
      identifierExists: false,
    },
    fixtureOnly: true,
  };
}

export const STOREFRONT_FABRICS: StorefrontFabric[] = [
  fabric({
    id: "stage-fabric-linwood-natural",
    collection: "Studio Plains",
    design: "Linwood",
    colour: "Natural",
    reference: "FIX-LIN-NAT",
    costMinor: 2000,
    swatchColour: "#d7c8b1",
    image: "/headings/pencil-pleat.jpeg",
    composition: [{ material: "Polyester", percentage: 100 }],
    description: "A quiet, linen-look plain designed to make window shape and heading the focus.",
  }),
  fabric({
    id: "stage-fabric-harlow-sage",
    collection: "Botanical Study",
    design: "Harlow",
    colour: "Sage",
    reference: "FIX-HAR-SAG",
    costMinor: 2400,
    swatchColour: "#708779",
    image: "/journey/design-direction.jpeg",
    composition: [{ material: "Cotton", percentage: 55 }, { material: "Polyester", percentage: 45 }],
    verticalRepeatMm: 640,
    horizontalRepeatMm: 690,
    match: "STRAIGHT_MATCH",
    description: "A soft botanical staging pattern used to exercise repeat-aware fabric calculations.",
  }),
  fabric({
    id: "stage-fabric-arden-ochre",
    collection: "Textured Essentials",
    design: "Arden",
    colour: "Ochre",
    reference: "FIX-ARD-OCH",
    costMinor: 1800,
    swatchColour: "#b88943",
    image: "/headings/wave-pleat.jpg",
    composition: [{ material: "Polyester", percentage: 70 }, { material: "Viscose", percentage: 30 }],
    description: "A warm textured plain for testing colour-led browsing and sample selection.",
  }),
  fabric({
    id: "stage-fabric-auburn-midnight",
    collection: "Architectural Velvets",
    design: "Auburn",
    colour: "Midnight",
    reference: "FIX-AUB-MID",
    costMinor: 3000,
    swatchColour: "#263b42",
    image: "/headings/pinch-pleat.jpg",
    composition: [{ material: "Polyester", percentage: 100 }],
    description: "A deep velvet-look staging fabric for tall glazing and stronger light control.",
  }),
];

export const STOREFRONT_FABRICS_BY_ID = new Map(STOREFRONT_FABRICS.map((item) => [item.id, item]));

export function compositionLabel(fabric: FabricSpec): string {
  return fabric.composition.map((part) => `${part.percentage}% ${part.material}`).join(", ");
}

export function repeatLabel(fabric: FabricSpec): string {
  if (fabric.patternMatchType === "RANDOM_MATCH") return "No pattern repeat";
  if (fabric.verticalRepeatMm === null) return "Repeat pending";
  return `${fabric.verticalRepeatMm / 10} cm vertical repeat`;
}
