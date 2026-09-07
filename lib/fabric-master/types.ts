import type { PatternMatchType } from "@/lib/decision-engine/types";

export type FabricLifecycleState = "CURRENT" | "DISCONTINUED" | "UNKNOWN";
export type FabricPriceVerificationStatus = "VERIFIED" | "PRICE_REQUIRES_VERIFICATION";

export interface FabricCompositionPart {
  material: string;
  percentage: number;
}

export interface FabricMasterRecord {
  fabric_id: string;
  supplier_id: string;
  supplier_name: string;
  brand_id: string;
  brand_name: string;
  collection_id: string;
  collection_name: string;
  supplier_collection_code: string | null;
  design_id: string;
  supplier_design_code: string;
  design_name: string;
  supplier_sku: string;
  colourway_code: string | null;
  colour_name: string;
  full_width_mm: number | null;
  usable_width_mm: number | null;
  vertical_repeat_mm: number | null;
  horizontal_repeat_mm: number | null;
  pattern_match_type: PatternMatchType | null;
  composition: FabricCompositionPart[];
  weight_gsm: number | null;
  care_instructions: string[];
  usage_suitability: string[];
  imagery: string[];
  sample_available: boolean | null;
  lifecycle_state: FabricLifecycleState;
  price_verification_status: FabricPriceVerificationStatus;
  storefront_selectable: boolean;
  source_type: string;
  source_name: string;
  source_reference: string | null;
  source_effective_date: string | null;
}

export interface FabricCatalogueImportItem extends Omit<FabricMasterRecord, "supplier_name"> {
  brand_name: string;
  collection_lifecycle_state: FabricLifecycleState;
  observation_id: string;
  public_record_sha256: string;
  source_row_number: number | null;
}

export interface FabricCatalogueImportMetadata {
  import_id: string;
  supplier_id: string;
  source_type: string;
  source_name: string;
  source_reference: string | null;
  source_sha256: string;
  source_effective_date: string | null;
  imported_at: string;
  row_count: number;
  inserted_count: number;
  updated_count: number;
  rejected_count: number;
  shopify_writes: 0;
}

export interface CustomerSafeFabricProjection {
  id: string;
  supplierSku: string;
  supplier: string;
  brand: string;
  collection: string;
  design: string;
  colour: string;
  imageReferences: string[];
  composition: FabricCompositionPart[];
  fullWidthMm: number | null;
  usableWidthMm: number | null;
  verticalRepeatMm: number | null;
  horizontalRepeatMm: number | null;
  patternMatchType: PatternMatchType | null;
  sampleAvailable: boolean | null;
  availability: "Fabric available" | "Limited availability" | "Available soon" | "Availability to be confirmed" | "Temporarily unavailable" | "No longer available";
  priceVerificationStatus: FabricPriceVerificationStatus;
  feedEligible: false;
}

export const PRIVATE_FABRIC_FIELDS = [
  "standard_trade_price",
  "cut_trade_price",
  "costing_price",
  "aggregate_available_quantity",
  "batch_reference",
  "batch_available_quantity",
  "pieces",
  "next_due_quantity",
] as const;
