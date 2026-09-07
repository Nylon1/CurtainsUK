import type { FabricMasterRecord } from "./types";
import { stableSlug } from "./catalogue-normalization";

export interface SandersonTradeRow {
  brand: string;
  collection: string;
  design: string;
  colour: string;
  supplierSku: string;
  supplierDesignCode: string;
  /** Legacy combined width field retained for the manually verified pilot. */
  widthMm?: number | null;
  fullWidthMm?: number | null;
  usableWidthMm?: number | null;
  verticalRepeatMm: number | null;
  horizontalRepeatMm: number | null;
  composition: FabricMasterRecord["composition"];
  imageUrl: string | null;
  lifecycleState: FabricMasterRecord["lifecycle_state"];
  sampleAvailable: boolean | null;
  sourceRowNumber: number;
  patternMatchType?: FabricMasterRecord["pattern_match_type"];
  weightGsm?: number | null;
  careInstructions?: string[];
  usageSuitability?: string[];
  sourceType?: string;
  sourceName?: string;
  sourceReference?: string | null;
  sourceEffectiveDate?: string | null;
}

const BRAND_IDS: Record<string, string> = {
  sanderson: "sdg-sanderson",
  "morris & co.": "sdg-morris-co",
  "morris & co": "sdg-morris-co",
  harlequin: "sdg-harlequin",
  zoffany: "sdg-zoffany",
  scion: "sdg-scion",
  "clarke & clarke": "sdg-clarke-clarke",
};

export function sandersonBrandId(brand: string) {
  const id = BRAND_IDS[brand.trim().toLowerCase()];
  if (!id) throw new Error(`UNMAPPED_SANDERSON_BRAND:${brand}`);
  return id;
}

export function normalizeSandersonRows(rows: SandersonTradeRow[]): Array<Omit<FabricMasterRecord, "supplier_name"> & { brand_name: string; source_row_number: number }> {
  return rows.map((row) => {
    const brandId = sandersonBrandId(row.brand);
    const designCode = row.supplierDesignCode || row.supplierSku.split(/[\/-]/)[0];
    const pattern = row.patternMatchType !== undefined
      ? row.patternMatchType
      : (row.verticalRepeatMm === null || row.verticalRepeatMm === 0 ? "RANDOM_MATCH" : "STRAIGHT_MATCH");
    const fullWidth = row.fullWidthMm !== undefined ? row.fullWidthMm : (row.widthMm ?? null);
    const usableWidth = row.usableWidthMm !== undefined ? row.usableWidthMm : (row.widthMm ?? null);
    return {
      fabric_id: `sdg-${stableSlug(row.supplierSku)}`,
      supplier_id: "sanderson-design-group",
      brand_id: brandId,
      brand_name: row.brand.trim(),
      collection_id: `${brandId}-collection-${stableSlug(row.collection)}`,
      collection_name: row.collection.trim(),
      supplier_collection_code: null,
      design_id: `${brandId}-design-${stableSlug(designCode)}`,
      supplier_design_code: designCode,
      design_name: row.design.trim(),
      supplier_sku: row.supplierSku.trim(),
      colourway_code: null,
      colour_name: row.colour.trim(),
      full_width_mm: fullWidth,
      usable_width_mm: usableWidth,
      vertical_repeat_mm: row.verticalRepeatMm,
      horizontal_repeat_mm: row.horizontalRepeatMm,
      pattern_match_type: pattern,
      composition: row.composition,
      weight_gsm: row.weightGsm ?? null,
      care_instructions: row.careInstructions ?? [],
      usage_suitability: row.usageSuitability ?? ["Curtains"],
      imagery: row.imageUrl ? [row.imageUrl] : [],
      sample_available: row.sampleAvailable,
      lifecycle_state: row.lifecycleState,
      price_verification_status: "PRICE_REQUIRES_VERIFICATION",
      storefront_selectable: false,
      source_type: row.sourceType ?? "AUTHORISED_XLSX",
      source_name: row.sourceName ?? "Sanderson Design Group authorised all-brands export",
      source_reference: row.sourceReference ?? null,
      source_effective_date: row.sourceEffectiveDate ?? null,
      source_row_number: row.sourceRowNumber,
    };
  });
}
