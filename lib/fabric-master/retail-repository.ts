import { createSupplierServiceClient } from "../supabase/supplier-service";
import { fabricMasterRecordsByIds } from "./repository";
import { projectCustomerSafeFabric, assertCustomerSafeProjection } from "./projection";
import { RETAIL_TAXONOMY, retailLaunchBlockers, retailMetadata, type RetailImage, type RetailProfile } from "./retail";

export async function retailFabricDetail(id: string) {
  if (!/^[a-zA-Z0-9-]{1,150}$/.test(id)) return null;
  return (await hydrateRetailFabrics([id]))[0] ?? null;
}
async function hydrateRetailFabrics(ids: string[]) {
  if (!ids.length) return [];
  const db = createSupplierServiceClient();
  const [records, profileResult, imageResult] = await Promise.all([
    fabricMasterRecordsByIds(ids),
    db.from("fabric_retail_profiles").select("fabric_id,description,description_validated,colour_families,patterns,characters,styles,rooms,window_types,headings,linings").in("fabric_id", ids),
    db.from("fabric_media_mappings").select("fabric_id,image_type,fabric_media_assets!inner(shopify_cdn_url,width,height)").in("fabric_id", ids).eq("rights_state", "APPROVED").eq("mapping_state", "VERIFIED"),
  ]);
  if (profileResult.error || imageResult.error) throw new Error("RETAIL_CATALOGUE_UNAVAILABLE");
  return ids.flatMap((id) => {
  const record = records.find((r) => r.fabric_id === id);
  if (!record?.staging_catalog_visible || record.lifecycle_state === "DISCONTINUED") return [];
  const profile = profileResult.data?.find((p) => p.fabric_id === id) as RetailProfile | undefined;
  const images: RetailImage[] = (imageResult.data ?? []).filter((row) => row.fabric_id === id).map((row) => {
    const asset = row.fabric_media_assets as unknown as { shopify_cdn_url: string; width: number; height: number };
    return { imageType: String(row.image_type), url: asset.shopify_cdn_url, width: asset.width, height: asset.height, approved: true };
  }).filter((i) => /^https:\/\/cdn\.shopify\.com\/[^?#]+$/.test(i.url)).sort((a, b) => Number(b.imageType === "MAIN") - Number(a.imageType === "MAIN"));
  const safe = projectCustomerSafeFabric(record);
  // Explicit public shape: supplier SKU remains in canonical server records.
  const result = {
    id: safe.id, supplier: safe.supplier, brand: safe.brand, collection: safe.collection, design: safe.design, colour: safe.colour,
    composition: safe.composition, fullWidthMm: safe.fullWidthMm, usableWidthMm: safe.usableWidthMm, verticalRepeatMm: safe.verticalRepeatMm, horizontalRepeatMm: safe.horizontalRepeatMm,
    patternMatchType: safe.patternMatchType, weightGsm: record.weight_gsm, careInstructions: record.care_instructions,
    sampleAvailable: safe.sampleAvailable, availability: safe.availability, configurable: safe.configurable, configurationMessage: safe.configurationMessage,
    imageReferences: images.map((i) => i.url), images, description: profile?.description_validated ? profile.description : "",
    colourFamilies: profile?.colour_families ?? ["UNKNOWN"], patterns: profile?.patterns ?? ["UNKNOWN"], characters: profile?.characters ?? ["UNKNOWN"], styles: profile?.styles ?? ["UNKNOWN"],
    headings: profile?.headings ?? [], windowTypes: profile?.window_types ?? [], linings: profile?.linings ?? [], rooms: profile?.rooms ?? [],
    launchReady: retailLaunchBlockers(record, profile ?? null, images).length === 0, metadata: retailMetadata(record), feedEligible: false,
  };
  assertCustomerSafeProjection(result); return [result];
  });
}
export async function searchRetailFabrics(params: URLSearchParams) {
  const page = Math.max(1, Math.min(10000, Number.parseInt(params.get("page") ?? "1", 10) || 1));
  const pageSize = 24;
  const filters = Object.fromEntries(["query", "brand", "collection", "colour", "pattern", "character", "style", "sample", "availability", "window"].map((key) => [key, (params.get(key) ?? "").trim().slice(0, 100)]));
  const { data, error } = await createSupplierServiceClient().rpc("search_retail_fabrics", { p_filters: filters, p_page: page, p_size: pageSize });
  if (error) throw new Error("RETAIL_SEARCH_UNAVAILABLE");
  const value = data as { ids: string[]; total: number; brands: string[]; collections: string[] };
  // At most 24 records are ever hydrated for a response.
  const fabrics = await hydrateRetailFabrics(value.ids);
  return { schemaVersion: "3.0.0", fabrics, page, pageSize, total: value.total, pages: Math.ceil(value.total / pageSize), facets: { brands: value.brands, collections: value.collections, ...RETAIL_TAXONOMY } };
}
