import { createSupplierServiceClient } from "@/lib/supabase/supplier-service";
import type { FabricCatalogueImportItem, FabricCatalogueImportMetadata, FabricMasterRecord } from "./types";

type Row = Record<string, unknown>;

function databaseError(error: { code?: string; message?: string } | null) {
  if (error) {
    throw new Error(`FABRIC_MASTER_DATABASE_OPERATION_FAILED:${error.code ?? "UNKNOWN"}:${error.message ?? "Unknown database error"}`);
  }
}

export async function existingSupplierSkus(supplierId: string) {
  const { data, error } = await createSupplierServiceClient()
    .from("fabric_colourways")
    .select("supplier_sku")
    .eq("supplier_id", supplierId);
  databaseError(error);
  return new Set((data ?? []).map((row) => String(row.supplier_sku)));
}

export async function applyFabricCatalogueBatch(metadata: FabricCatalogueImportMetadata, items: FabricCatalogueImportItem[]) {
  const { data, error } = await createSupplierServiceClient().rpc("apply_fabric_catalogue_batch", {
    p_import: metadata,
    p_items: items,
  });
  databaseError(error);
  return data as { inserted: number; updated: number; rejected: number; shopify_writes: 0 };
}

export async function listFabricMasterRecords(input: { storefrontOnly?: boolean; supplierId?: string } = {}): Promise<FabricMasterRecord[]> {
  const database = createSupplierServiceClient();
  let query = database
    .from("fabric_colourways")
    .select("*,supplier_brands!inner(display_name),fabric_designs!inner(*,fabric_collections!inner(display_name))")
    .order("supplier_id")
    .order("supplier_sku");
  if (input.storefrontOnly) query = query.eq("storefront_selectable", true).eq("lifecycle_state", "CURRENT");
  if (input.supplierId) query = query.eq("supplier_id", input.supplierId);
  const { data, error } = await query;
  databaseError(error);

  return ((data ?? []) as Row[]).map((row) => {
    const design = row.fabric_designs as Row;
    const collection = design.fabric_collections as Row;
    const brand = row.supplier_brands as Row;
    return {
      fabric_id: String(row.fabric_id),
      supplier_id: String(row.supplier_id),
      supplier_name: row.supplier_id === "prestigious-textiles" ? "Prestigious Textiles" : "Sanderson Design Group",
      brand_id: String(row.brand_id),
      brand_name: String(brand.display_name),
      collection_id: String(design.collection_id),
      collection_name: String(collection.display_name),
      supplier_collection_code: null,
      design_id: String(row.design_id),
      supplier_design_code: String(design.supplier_design_code),
      design_name: String(design.display_name),
      supplier_sku: String(row.supplier_sku),
      colourway_code: row.colourway_code === null ? null : String(row.colourway_code),
      colour_name: String(row.colour_name),
      full_width_mm: design.full_width_mm === null ? null : Number(design.full_width_mm),
      usable_width_mm: design.usable_width_mm === null ? null : Number(design.usable_width_mm),
      vertical_repeat_mm: design.vertical_repeat_mm === null ? null : Number(design.vertical_repeat_mm),
      horizontal_repeat_mm: design.horizontal_repeat_mm === null ? null : Number(design.horizontal_repeat_mm),
      pattern_match_type: design.pattern_match_type as FabricMasterRecord["pattern_match_type"],
      composition: design.composition as FabricMasterRecord["composition"],
      weight_gsm: design.weight_gsm === null ? null : Number(design.weight_gsm),
      care_instructions: (design.care_instructions ?? []) as string[],
      usage_suitability: (design.usage_suitability ?? []) as string[],
      imagery: (row.imagery ?? []) as string[],
      sample_available: row.sample_available === null ? null : Boolean(row.sample_available),
      lifecycle_state: row.lifecycle_state as FabricMasterRecord["lifecycle_state"],
      price_verification_status: row.price_verification_status as FabricMasterRecord["price_verification_status"],
      storefront_selectable: Boolean(row.storefront_selectable),
      source_type: String(row.source_type),
      source_name: String(row.source_name),
      source_reference: row.source_reference === null ? null : String(row.source_reference),
      source_effective_date: row.source_effective_date === null ? null : String(row.source_effective_date),
    };
  });
}

export async function fabricMasterRecordById(fabricId: string) {
  const records = await listFabricMasterRecords();
  return records.find((record) => record.fabric_id === fabricId) ?? null;
}

export async function verifiedCutCostMinor(supplierId: string, supplierSku: string) {
  const database = createSupplierServiceClient();
  const { data: snapshots, error: snapshotError } = await database
    .from("supplier_snapshots")
    .select("snapshot_id,checked_at,price_expires_at,promotion_events:supplier_promotion_events!supplier_promotion_events_snapshot_id_fkey!inner(promotion_state,created_at),prices:supplier_snapshot_prices!inner(cut_trade_price,currency)")
    .eq("supplier_id", supplierId)
    .eq("supplier_sku", supplierSku)
    .eq("validation_status", "VALIDATED")
    .eq("promotion_events.promotion_state", "APPROVED_FOR_PROJECTION")
    .order("checked_at", { ascending: false })
    .limit(1);
  databaseError(snapshotError);
  const row = (snapshots?.[0] ?? null) as Row | null;
  if (!row) throw new Error("PRICE_REQUIRES_VERIFICATION");
  const relation = row.prices as Row | Row[];
  const prices = Array.isArray(relation) ? relation[0] : relation;
  if (!prices) throw new Error("PRICE_REQUIRES_VERIFICATION");
  if (prices.currency !== "GBP" || prices.cut_trade_price === null) throw new Error("PRICE_REQUIRES_VERIFICATION");
  return Math.round(Number(prices.cut_trade_price) * 100);
}

/** Reuses the Phase 4E manual approval gate; this does not write to Shopify. */
export async function promoteFabricForStagingProjection(input: { supplierId: string; supplierSku: string; snapshotId: string }) {
  const { error } = await createSupplierServiceClient().rpc("promote_fabric_for_staging_projection", {
    p_supplier_id: input.supplierId,
    p_supplier_sku: input.supplierSku,
    p_snapshot_id: input.snapshotId,
  });
  databaseError(error);
}
