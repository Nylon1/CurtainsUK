import type { FabricCompositionPart, FabricMasterRecord } from "./types";
import { stableSlug } from "./catalogue-normalization";

export interface PrestigiousShopifyRow {
  Title: string;
  Tags: string;
  "Option1%20Value": string;
  "Variant%20SKU": string;
  "Image%20Src": string;
}

interface PrestigiousDesignSpecification {
  fullWidthMm: number;
  usableWidthMm: number;
  verticalRepeatMm: number | null;
  horizontalRepeatMm: number | null;
  composition: FabricCompositionPart[];
  careCode: string;
  usageCode: string;
}

/** Public product specifications transcribed from the authorised August 2026 list. */
export const PRESTIGIOUS_FORMATION_SPECS: Record<string, PrestigiousDesignSpecification> = {
  "4269": { fullWidthMm: 1420, usableWidthMm: 1400, verticalRepeatMm: null, horizontalRepeatMm: null, composition: [{ material: "Polyester", percentage: 68 }, { material: "Viscose", percentage: 32 }], careCode: "0CSpE", usageCode: "BCDU" },
  "4270": { fullWidthMm: 1460, usableWidthMm: 1430, verticalRepeatMm: 627, horizontalRepeatMm: 237, composition: [{ material: "Polyester", percentage: 61 }, { material: "Cotton", percentage: 39 }], careCode: "1CTpE", usageCode: "BCDU" },
  "4271": { fullWidthMm: 1400, usableWidthMm: 1320, verticalRepeatMm: 233, horizontalRepeatMm: 220, composition: [{ material: "Polyester", percentage: 77 }, { material: "Cotton", percentage: 23 }], careCode: "0CSpE", usageCode: "BCD" },
  "4272": { fullWidthMm: 1420, usableWidthMm: 1390, verticalRepeatMm: 255, horizontalRepeatMm: null, composition: [{ material: "Polyester", percentage: 61 }, { material: "Cotton", percentage: 39 }], careCode: "1CTpE", usageCode: "BCDU" },
  "4273": { fullWidthMm: 1430, usableWidthMm: 1390, verticalRepeatMm: 498, horizontalRepeatMm: null, composition: [{ material: "Polyester", percentage: 100 }], careCode: "1CTpE", usageCode: "BCDU" },
  "4274": { fullWidthMm: 1490, usableWidthMm: 1320, verticalRepeatMm: 158, horizontalRepeatMm: null, composition: [{ material: "Cotton", percentage: 76 }, { material: "Polyester", percentage: 24 }], careCode: "0CSpE", usageCode: "CD" },
  "4275": { fullWidthMm: 1490, usableWidthMm: 1320, verticalRepeatMm: 140, horizontalRepeatMm: null, composition: [{ material: "Polyester", percentage: 100 }], careCode: "0CSpE", usageCode: "D" },
};

const VERIFIED_MOCHA_SKUS = new Set(["4269/147", "4270/147", "4271/147"]);

function decoded(value: string) {
  return decodeURIComponent(value ?? "").trim();
}

export function normalizePrestigiousFormationRows(rows: PrestigiousShopifyRow[]): Array<Omit<FabricMasterRecord, "supplier_name"> & { brand_name: string; source_row_number: number }> {
  return rows.map((row, index) => {
    const supplierSku = decoded(row["Variant%20SKU"]);
    const [designCode, colourwayCode] = supplierSku.split("/");
    const spec = PRESTIGIOUS_FORMATION_SPECS[designCode];
    if (!spec || !designCode || !colourwayCode) throw new Error(`UNMAPPED_PRESTIGIOUS_DESIGN:${supplierSku}`);
    const designName = decoded(row.Title).replace(/\b\w/g, (letter) => letter.toUpperCase());
    const colourName = decoded(row["Option1%20Value"]).replace(/\b\w/g, (letter) => letter.toUpperCase());
    const collectionName = decoded(row.Tags).replace(/\s+Collection$/i, "") || "Formation";
    const fabricId = `pt-${designCode}-${colourwayCode}`;
    return {
      fabric_id: fabricId,
      supplier_id: "prestigious-textiles",
      brand_id: "prestigious-textiles",
      brand_name: "Prestigious Textiles",
      collection_id: `pt-collection-${stableSlug(collectionName)}`,
      collection_name: collectionName,
      supplier_collection_code: null,
      design_id: `pt-design-${designCode}`,
      supplier_design_code: designCode,
      design_name: designName,
      supplier_sku: supplierSku,
      colourway_code: colourwayCode,
      colour_name: colourName,
      full_width_mm: spec.fullWidthMm,
      usable_width_mm: spec.usableWidthMm,
      vertical_repeat_mm: spec.verticalRepeatMm,
      horizontal_repeat_mm: spec.horizontalRepeatMm,
      pattern_match_type: spec.verticalRepeatMm === null ? "RANDOM_MATCH" : "STRAIGHT_MATCH",
      composition: spec.composition,
      weight_gsm: null,
      care_instructions: [`Prestigious care code ${spec.careCode}`],
      usage_suitability: ["Curtains", `Prestigious usage code ${spec.usageCode}`],
      // The authorised export currently contains retired `/assets/collections/`
      // URLs that return 404 on the supplier's rebuilt public site. Preserve the
      // workbook as provenance, but do not project broken image references.
      imagery: [],
      sample_available: true,
      lifecycle_state: "CURRENT",
      price_verification_status: VERIFIED_MOCHA_SKUS.has(supplierSku) ? "VERIFIED" : "PRICE_REQUIRES_VERIFICATION",
      storefront_selectable: VERIFIED_MOCHA_SKUS.has(supplierSku),
      source_type: "AUTHORISED_XLSX",
      source_name: "Prestigious authorised Shopify catalogue export",
      source_reference: "shopify_prestigious_products.xlsx",
      source_effective_date: "2026-08-01",
      source_row_number: index + 2,
    };
  });
}
