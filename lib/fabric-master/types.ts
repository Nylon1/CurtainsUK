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
  /** Supplier-issued design code when the authorised source provides one. */
  supplier_design_code: string | null;
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
  /** Staging catalogue visibility is independent from price/configuration eligibility. */
  staging_catalog_visible?: boolean;
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
  merge_action: "INSERT" | "UPDATE";
  /** Optimistic-lock token required before an existing colourway may be changed. */
  expected_existing_updated_at: string | null;
  protected_fields: string[];
}

export interface FabricCatalogueImportMetadata {
  import_id: string;
  supplier_id: string;
  source_type: string;
  source_name: string;
  source_reference: string | null;
  source_sha256: string;
  source_effective_date: string | null;
  /** True observation time from the supplier document, not the import run time. */
  source_observed_at: string;
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
  /** Public action gate. The private reason/status is deliberately not projected. */
  configurable: boolean;
  configurationMessage: "Ready to configure" | "Price and availability to be confirmed" | "No longer available";
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
