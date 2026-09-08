import type { PrestigiousPublicFabric } from "./types";

type DesignKey = "ESCHER" | "DALI" | "DIEZ" | "SARCONE" | "VARINI";

const DESIGNS: Record<DesignKey, {
  code: string;
  fullWidthMm: number;
  usableWidthMm: number;
  verticalRepeatMm: number | null;
  horizontalRepeatMm: number | null;
  composition: PrestigiousPublicFabric["composition"];
  careCode: string;
  usageCode: string;
  weightGsm: number | null;
  description: string;
}> = {
  ESCHER: { code: "4269", fullWidthMm: 1420, usableWidthMm: 1400, verticalRepeatMm: null, horizontalRepeatMm: null, composition: [{ material: "Polyester", percentage: 68 }, { material: "Viscose", percentage: 32 }], careCode: "0CSpE", usageCode: "BCDU", weightGsm: 845, description: "A tactile Formation weave with a calm, architectural surface." },
  DALI: { code: "4270", fullWidthMm: 1460, usableWidthMm: 1430, verticalRepeatMm: 627, horizontalRepeatMm: 237, composition: [{ material: "Polyester", percentage: 61 }, { material: "Cotton", percentage: 39 }], careCode: "1CTpE", usageCode: "BCDU", weightGsm: 434, description: "A rhythmic geometric from the Formation collection." },
  DIEZ: { code: "4271", fullWidthMm: 1400, usableWidthMm: 1320, verticalRepeatMm: 233, horizontalRepeatMm: 220, composition: [{ material: "Polyester", percentage: 77 }, { material: "Cotton", percentage: 23 }], careCode: "0CSpE", usageCode: "BCD", weightGsm: 847, description: "A structured Formation design with a compact repeat." },
  SARCONE: { code: "4272", fullWidthMm: 1420, usableWidthMm: 1390, verticalRepeatMm: 255, horizontalRepeatMm: null, composition: [{ material: "Polyester", percentage: 61 }, { material: "Cotton", percentage: 39 }], careCode: "1CTpE", usageCode: "BCDU", weightGsm: null, description: "A versatile small-scale geometric in the Formation palette." },
  VARINI: { code: "4273", fullWidthMm: 1430, usableWidthMm: 1390, verticalRepeatMm: 498, horizontalRepeatMm: null, composition: [{ material: "Polyester", percentage: 100 }], careCode: "1CTpE", usageCode: "BCDU", weightGsm: null, description: "A graphic Formation pattern for confident made-to-measure schemes." },
};

const COLOURWAYS: Array<{ design: DesignKey; colour: string; code: string; swatch: string }> = [
  { design: "ESCHER", colour: "Mocha", code: "147", swatch: "#8d7767" },
  { design: "ESCHER", colour: "Canopy", code: "658", swatch: "#667264" },
  { design: "ESCHER", colour: "Mercury", code: "934", swatch: "#969696" },
  { design: "ESCHER", colour: "Angora", code: "975", swatch: "#d3c6b6" },
  { design: "DALI", colour: "Mocha", code: "147", swatch: "#8d7767" },
  { design: "DALI", colour: "Woodrose", code: "217", swatch: "#a87c7b" },
  { design: "DALI", colour: "Canopy", code: "658", swatch: "#667264" },
  { design: "DALI", colour: "Mercury", code: "934", swatch: "#969696" },
  { design: "DALI", colour: "Angora", code: "975", swatch: "#d3c6b6" },
  { design: "DIEZ", colour: "Mocha", code: "147", swatch: "#8d7767" },
  { design: "DIEZ", colour: "Woodrose", code: "217", swatch: "#a87c7b" },
  { design: "DIEZ", colour: "Canopy", code: "658", swatch: "#667264" },
  { design: "DIEZ", colour: "Mercury", code: "934", swatch: "#969696" },
  { design: "DIEZ", colour: "Angora", code: "975", swatch: "#d3c6b6" },
  { design: "SARCONE", colour: "Mocha", code: "147", swatch: "#8d7767" },
  { design: "SARCONE", colour: "Woodrose", code: "217", swatch: "#a87c7b" },
  { design: "SARCONE", colour: "Canopy", code: "658", swatch: "#667264" },
  { design: "SARCONE", colour: "Mercury", code: "934", swatch: "#969696" },
  { design: "SARCONE", colour: "Angora", code: "975", swatch: "#d3c6b6" },
  { design: "VARINI", colour: "Mocha", code: "147", swatch: "#8d7767" },
];

const PORTAL_VERIFIED_SKUS = new Set(["4269/147", "4270/147", "4271/147"]);

function imageUrl(design: DesignKey, code: string, colour: string) {
  const name = design.toLowerCase();
  return `https://www.prestigious.co.uk/assets/collections/${DESIGNS[design].code}%20${name}/${DESIGNS[design].code}-${code}%20${name}%20${colour.toLowerCase()}.jpg`;
}

function buildFabric(row: (typeof COLOURWAYS)[number]): PrestigiousPublicFabric {
  const design = DESIGNS[row.design];
  const sku = `${design.code}/${row.code}`;
  const verified = PORTAL_VERIFIED_SKUS.has(sku);
  const image = imageUrl(row.design, row.code, row.colour);
  return {
    id: `pt-${design.code}-${row.code}`,
    supplier: "Prestigious Textiles",
    collection: "Formation",
    design: row.design[0] + row.design.slice(1).toLowerCase(),
    colour: row.colour,
    supplierReference: sku,
    supplierDesignCode: design.code,
    colourwayCode: row.code,
    uniqueSku: sku,
    fullWidthMm: design.fullWidthMm,
    usableWidthMm: design.usableWidthMm,
    verticalRepeatMm: design.verticalRepeatMm,
    horizontalRepeatMm: design.horizontalRepeatMm,
    patternMatchType: design.verticalRepeatMm === null ? "RANDOM_MATCH" : "STRAIGHT_MATCH",
    patternCentringRequirement: design.verticalRepeatMm === null ? "NONE" : "PREFERRED",
    composition: design.composition,
    careInstructions: [`Prestigious care code ${design.careCode}`],
    usageSuitability: ["Curtains", `Prestigious usage code ${design.usageCode}`],
    fabricWeightGsm: design.weightGsm,
    supplierCostPerMetre: null,
    supplierCostEffectiveFrom: null,
    sellingPricePolicy: {
      supplierRrpPerMetre: null,
      curtainsUkSellingRatePerMetre: null,
      pricingBand: null,
      minimumGrossMarginPercent: 35,
      minimumCashMargin: null,
      effectiveFrom: null,
      manualOverride: { enabled: false, ratePerMetre: null, reason: null, approvedBy: null },
    },
    sample: { sku: `SAMPLE-${sku}`, available: true, price: null, postage: null, futureOrderCreditEligible: false },
    leadTime: { minimumBusinessDays: 5, maximumBusinessDays: 15 },
    recordLifecycle: "ACTIVE",
    supplierAvailability: "UNKNOWN",
    imageReferences: [image],
    allowedHeadings: ["PENCIL_PLEAT", "WAVE", "DOUBLE_PINCH", "TRIPLE_PINCH", "EYELET"],
    allowedLinings: ["UNLINED", "STANDARD", "BLACKOUT", "THERMAL", "BONDED"],
    suitableWindowTypeSlugs: ["*"],
    googleFeedEligibility: { eligible: false, reason: "Unpublished Phase 4C pilot; production pricing and stock approval required", identifierExists: true },
    fixtureOnly: false,
    storefrontName: `${row.design[0] + row.design.slice(1).toLowerCase()} — ${row.colour}`,
    storefrontDescription: design.description,
    swatchColour: row.swatch,
    image,
    priceVerificationStatus: verified ? "VERIFIED" : "PRICE_REQUIRES_VERIFICATION",
    customerAvailability: "Availability to be confirmed",
  };
}

export const PRESTIGIOUS_PILOT_FABRICS = COLOURWAYS.map(buildFabric);
export const PRESTIGIOUS_PILOT_FABRICS_BY_ID = new Map(PRESTIGIOUS_PILOT_FABRICS.map((fabric) => [fabric.id, fabric]));
