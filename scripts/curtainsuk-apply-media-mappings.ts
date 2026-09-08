import { readFile } from "node:fs/promises";
import { loadEnvConfig } from "@next/env";
import { createSupplierServiceClient } from "../lib/supabase/supplier-service";
import { isShopifyCdnUrl, validateMediaCandidate, type ImportedMedia } from "../lib/fabric-master/supplier-media";
import { forEachMediaRecord } from "../lib/fabric-master/media-batch-work";

async function main() {
  loadEnvConfig(process.cwd());
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (new URL(url).hostname !== "hqysjumypgeapgmqkcrx.supabase.co" || !process.argv.includes("--confirm-project=hqysjumypgeapgmqkcrx")) throw new Error("STAGING_DATABASE_REQUIRED");
  const state = JSON.parse(await readFile("artifacts/phase5f/checkpoints/supplier-media.json", "utf8")) as { mappings: Record<string, ImportedMedia> };
  const requested = process.argv.find(arg => arg.startsWith("--fabric-ids="))?.slice("--fabric-ids=".length).split(",");
  const concurrency = Number(process.argv.find(arg=>arg.startsWith("--concurrency="))?.slice("--concurrency=".length) ?? 1);
  if(!Number.isInteger(concurrency) || concurrency<1 || concurrency>4)throw new Error("MEDIA_CONCURRENCY_INVALID");
  const all = Object.values(state.mappings);
  if (requested && (!requested.length || requested.length > 250 || new Set(requested).size !== requested.length || requested.some(id => !/^[a-z0-9-]{1,150}$/.test(id) || !all.some(m => m.fabricId === id)))) throw new Error("MEDIA_BATCH_INVALID");
  // A fabric can now have several resumable image jobs rather than one fabric-id key.
  const batch = (requested ? all.filter(m => requested.includes(m.fabricId)) : all).sort((a,b) => Number(b.imageType === "MAIN") - Number(a.imageType === "MAIN"));
  const db = createSupplierServiceClient();
  let count = 0, visibilityChanges = 0;
  // Different fabrics can be attached concurrently. Keep every image belonging
  // to one fabric sequential so MAIN/gallery updates cannot race each other.
  const groups=new Map<string,ImportedMedia[]>();
  for(const mapping of batch)groups.set(mapping.fabricId,[...(groups.get(mapping.fabricId)??[]),mapping]);
  await forEachMediaRecord([...groups.values()],concurrency,async mappings=>{
   for (const mapping of mappings) {
    validateMediaCandidate(mapping);
    if (!isShopifyCdnUrl(mapping.shopifyCdnUrl) || !/^[a-f0-9]{64}$/.test(mapping.contentHash)) throw new Error("MEDIA_ASSET_INVALID");
    const { data: row, error } = await db.from("fabric_colourways").select("supplier_id,supplier_sku,updated_at,imagery,lifecycle_state,staging_catalog_visible,brand_id,design_id,colour_name").eq("fabric_id", mapping.fabricId).single();
    if (error || row.supplier_id !== mapping.supplier || row.supplier_sku !== mapping.supplierSku) throw new Error("MEDIA_CANONICAL_IDENTITY_MISMATCH");
    const asset = await db.from("fabric_media_assets").upsert({ content_hash: mapping.contentHash, shopify_file_id: mapping.shopifyFileId, shopify_cdn_url: mapping.shopifyCdnUrl, width: mapping.width, height: mapping.height, imported_at: mapping.importedAt }, { onConflict: "content_hash", ignoreDuplicates: true });
    if (asset.error) throw new Error("MEDIA_ASSET_WRITE_FAILED");
    const saved = await db.from("fabric_media_mappings").upsert({ fabric_id: mapping.fabricId, content_hash: mapping.contentHash, image_type: mapping.imageType, supplier_id: mapping.supplier, supplier_sku: mapping.supplierSku, source_reference: mapping.sourceReference, rights_state: mapping.rightsState, mapping_state: mapping.mappingState, imported_at: mapping.importedAt }, { onConflict: "fabric_id,image_type,content_hash", ignoreDuplicates: true });
    if (saved.error) throw new Error("MEDIA_MAPPING_WRITE_FAILED");
    const approved = await db.from("fabric_media_mappings").select("rights_state,mapping_state").eq("fabric_id", mapping.fabricId).eq("content_hash", mapping.contentHash).eq("image_type", mapping.imageType).single();
    if (approved.error || approved.data.rights_state !== "APPROVED" || approved.data.mapping_state !== "VERIFIED") throw new Error("MEDIA_MAPPING_APPROVAL_WITHHELD");
    // Replace portal hotlinks only after the verified Shopify copy exists.
    const exactColourway = !mapping.mediaScope || mapping.mediaScope === "COLOURWAY";
    const oldImagery = ((row.imagery ?? []) as string[]).filter(isShopifyCdnUrl);
    // Shared ROOM/collection assets stay in typed mappings. They never replace the
    // exact-colourway image in legacy projections or activate an image-less fabric.
    const imagery = exactColourway ? [...new Set(mapping.imageType === "MAIN" ? [mapping.shopifyCdnUrl,...oldImagery] : [...oldImagery,mapping.shopifyCdnUrl])] : oldImagery;
    // Approved exact-identity media activates browsing without a commercial check.
    const staging_catalog_visible = row.lifecycle_state !== "DISCONTINUED" && Boolean(row.brand_id && row.design_id && row.colour_name?.trim()) && (exactColourway || row.staging_catalog_visible);
    const update = await db.from("fabric_colourways").update({ imagery, staging_catalog_visible }).eq("fabric_id", mapping.fabricId).eq("updated_at", row.updated_at).select("fabric_id");
    if (update.error || !update.data?.length) throw new Error("MEDIA_MASTER_REVISION_CHANGED");
    if (row.staging_catalog_visible !== staging_catalog_visible) visibilityChanges++;
    const checkpoint = await db.from("fabric_media_checkpoints").upsert({ supplier_id: mapping.supplier, supplier_sku: mapping.supplierSku, fabric_id: mapping.fabricId, state: "UPLOADED", failure_reason: null, updated_at: new Date().toISOString() });
    if (checkpoint.error) throw new Error("MEDIA_CHECKPOINT_WRITE_FAILED");
    count++;
   }
  });
  console.log(JSON.stringify({ mappingsApplied: count, visibilityChanges, pricingChanges: 0 }));
}
main().catch(() => { console.error("MEDIA_MAPPING_APPLY_FAILED"); process.exitCode = 1; });
