import { knowledgeDiscovery, type KnowledgeOption } from './knowledge-discovery';
import { createSupplierServiceClient } from "../supabase/supplier-service";
import { fabricMasterRecordsByIds, verifiedSupplierCostMinor } from "./repository";
import { projectCustomerSafeFabric, assertCustomerSafeProjection } from "./projection";
import { RETAIL_TAXONOMY, factualRetailDescription, retailLaunchBlockers, retailMetadata, type RetailImage, type RetailProfile } from "./retail";
import { commercialReadiness } from './readiness-server';
import { calculationWidth } from './readiness';
import { customerGuidance, customerIntelligence, visualKnowledgeByFabricIds } from './visual-knowledge';

import { supplierFacts } from './browse-experience';
import { BROWSE_PRICE_BANDS, browsePriceBand, customerBrowseGuide } from './browse-price-guide';

export async function retailFabricDetail(id: string, withGuide = false) {
  if (!/^[a-zA-Z0-9-]{1,150}$/.test(id)) return null;
  const fabric = (await hydrateRetailFabrics([id]))[0] ?? null;
  if (!fabric || !withGuide) return fabric;
  const record = (await fabricMasterRecordsByIds([id]))[0];
  const cost = record ? await verifiedSupplierCostMinor(record.supplier_id, record.supplier_sku).catch(() => null) : null;
  return { ...fabric, browseGuide: customerBrowseGuide(cost === null ? null : cost * 3) };
}
async function hydrateRetailFabrics(ids: string[]) {
  if (!ids.length) return [];
  const db = createSupplierServiceClient();
  const [records, profileResult, imageResult] = await Promise.all([
    fabricMasterRecordsByIds(ids),
    db.from("fabric_retail_profiles").select("fabric_id,description,description_validated,colour_families,patterns,characters,styles,rooms,window_types,headings,linings").in("fabric_id", ids),
    db.from("fabric_media_mappings").select("fabric_id,supplier_id,supplier_sku,image_type,fabric_media_assets!inner(shopify_cdn_url,width,height)").in("fabric_id", ids).eq("rights_state", "APPROVED").eq("mapping_state", "VERIFIED"),
  ]);
  if (profileResult.error || imageResult.error) throw new Error("RETAIL_CATALOGUE_UNAVAILABLE");
  // A stock service outage must not take browsing offline or imply available stock.
  const readiness = await commercialReadiness(records).catch(()=>null);
  const visual = await visualKnowledgeByFabricIds(records.map((record) => record.fabric_id));
  return ids.flatMap((id) => {
  const record = records.find((r) => r.fabric_id === id);
  if (!record?.staging_catalog_visible || record.lifecycle_state === "DISCONTINUED") return [];
  const profile = profileResult.data?.find((p) => p.fabric_id === id) as RetailProfile | undefined;
  const images: RetailImage[] = (imageResult.data ?? []).filter((row) => row.fabric_id === id && row.supplier_id === record.supplier_id && row.supplier_sku === record.supplier_sku).map((row) => {
    const asset = row.fabric_media_assets as unknown as { shopify_cdn_url: string; width: number; height: number };
    return { imageType: String(row.image_type), url: asset.shopify_cdn_url, width: asset.width, height: asset.height, approved: true };
  }).filter((i) => /^https:\/\/cdn\.shopify\.com\/[^?#]+$/.test(i.url)).sort((a, b) => Number(b.imageType === "MAIN") - Number(a.imageType === "MAIN"));
  if (retailLaunchBlockers(record, profile ?? null, images).length) return [];
  const safe = projectCustomerSafeFabric(record);
  const commercial = readiness?.get(id);
  if(commercial?.commercialStockState==='DISCONTINUED') return [];
  // Explicit public shape: supplier SKU remains in canonical server records.
  const result = {
    supplierFacts: { facts: supplierFacts(record).facts },
    id: safe.id, supplier: safe.supplier, brand: safe.brand, collection: safe.collection, design: safe.design, colour: safe.colour,
    composition: safe.composition, fullWidthMm: safe.fullWidthMm, usableWidthMm: safe.usableWidthMm, verticalRepeatMm: safe.verticalRepeatMm, horizontalRepeatMm: safe.horizontalRepeatMm,
    patternMatchType: safe.patternMatchType, weightGsm: record.weight_gsm, careInstructions: record.care_instructions,
    sampleAvailable: commercial?.sampleReady ?? false, availability: commercial?.stockMessage ?? 'Check availability' as const, configurable: safe.configurable, configurationMessage: commercial?.priceReady ? 'Ready to configure' as const : 'Price and availability to be confirmed' as const,
    sampleEligible: true, calculationWidthMm: calculationWidth(record), ...(visual.get(id) ? { visualIntelligence: visual.get(id), fabricIntelligenceGuidance: customerGuidance(visual.get(id)), intelligence: customerIntelligence(visual.get(id)) } : {}),
    commercialStockState: commercial?.commercialStockState ?? 'CHECK_AVAILABILITY',
    priceReady: commercial?.priceReady ?? false, currentStockConfirmed: commercial?.currentStockConfirmed ?? false,
    imageReferences: images.map((i) => i.url), images, description: profile?.description_validated && profile.description.trim() ? profile.description : factualRetailDescription(record),
    colourFamilies: profile?.colour_families ?? ["UNKNOWN"], patterns: profile?.patterns ?? ["UNKNOWN"], characters: profile?.characters ?? ["UNKNOWN"], styles: profile?.styles ?? ["UNKNOWN"],
    headings: profile?.headings ?? [], windowTypes: profile?.window_types ?? [], linings: profile?.linings ?? [], rooms: profile?.rooms ?? [],
    browseReady: true, orderReady: commercial?.orderReady ?? false, launchReady: true, metadata: retailMetadata(record), feedEligible: false,
  };
  assertCustomerSafeProjection(result); return [result];
  });
}
export async function searchRetailFabrics(params: URLSearchParams) {
  const page = Math.max(1, Math.min(10000, Number.parseInt(params.get("page") ?? "1", 10) || 1));
  const pageSize = 24;
  const filters = Object.fromEntries(["query", "brand", "collection", "colour", "pattern", "character", "style", "sample", "availability", "window", "knowledge", "activity", "texture", "presence"].map((key) => [key, (params.get(key) ?? "").trim().slice(0, 100)]));
  const withGuide = params.get('browseGuide') === '1';
  const band = withGuide ? browsePriceBand(params.get('guidePrice')) : null;
  const { data, error } = await createSupplierServiceClient().rpc("search_retail_fabrics", { p_filters: filters, p_page: page, p_size: pageSize,
    ...(withGuide ? {p_guide_min: band?.minimumMinor ?? null, p_guide_max: band?.maximumMinor ?? null} : {}) });
  if (error) { console.error("RETAIL_SEARCH_UNAVAILABLE", { code: error.code }); throw new Error("RETAIL_SEARCH_UNAVAILABLE"); }
  const value = data as { ids: string[]; total: number; brands: string[]; collections: string[]; guidePrices?: Record<string, number>; knowledgeOptions?: KnowledgeOption[] };
  // At most 24 records are ever hydrated for a response.
  const fabrics = await hydrateRetailFabrics(value.ids);
  return { schemaVersion: "3.0.0", fabrics: withGuide ? fabrics.map(f => ({...f, browseGuide: customerBrowseGuide(value.guidePrices?.[f.id])})) : fabrics, page, pageSize, total: value.total, pages: Math.ceil(value.total / pageSize), facets: { brands: value.brands, collections: value.collections, ...RETAIL_TAXONOMY, ...(filters.knowledge === "1" ? { discovery: knowledgeDiscovery(value.knowledgeOptions) } : {}), ...(withGuide ? {guidePrices: BROWSE_PRICE_BANDS.map(({value,label})=>({value,label}))} : {}) } };
}
