import { readFile } from "node:fs/promises";
import { loadEnvConfig } from "@next/env";
import { createSupplierServiceClient } from "../lib/supabase/supplier-service";
import { isShopifyCdnUrl, validateMediaCandidate, type ImportedMedia } from "../lib/fabric-master/supplier-media";

async function main() {
  loadEnvConfig(process.cwd());
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (new URL(url).hostname !== "hqysjumypgeapgmqkcrx.supabase.co" || !process.argv.includes("--confirm-project=hqysjumypgeapgmqkcrx")) throw new Error("STAGING_DATABASE_REQUIRED");
  const state = JSON.parse(await readFile("artifacts/phase5f/checkpoints/supplier-media.json", "utf8")) as { mappings: Record<string, ImportedMedia> };
  const requested = process.argv.find(arg => arg.startsWith("--fabric-ids="))?.slice("--fabric-ids=".length).split(",");
  if (requested && (!requested.length || requested.length > 250 || new Set(requested).size !== requested.length || requested.some(id => !/^[a-z0-9-]{1,150}$/.test(id) || !state.mappings[id]))) throw new Error("MEDIA_BATCH_INVALID");
  const batch = requested ? requested.map(id => state.mappings[id]) : Object.values(state.mappings);
  const db = createSupplierServiceClient();
  let count = 0;
  for (const mapping of batch) {
    validateMediaCandidate(mapping);
    if (!isShopifyCdnUrl(mapping.shopifyCdnUrl) || !/^[a-f0-9]{64}$/.test(mapping.contentHash)) throw new Error("MEDIA_ASSET_INVALID");
    const { data: row, error } = await db.from("fabric_colourways").select("supplier_id,supplier_sku,updated_at,imagery").eq("fabric_id", mapping.fabricId).single();
    if (error || row.supplier_id !== mapping.supplier || row.supplier_sku !== mapping.supplierSku) throw new Error("MEDIA_CANONICAL_IDENTITY_MISMATCH");
    const asset = await db.from("fabric_media_assets").upsert({ content_hash: mapping.contentHash, shopify_file_id: mapping.shopifyFileId, shopify_cdn_url: mapping.shopifyCdnUrl, width: mapping.width, height: mapping.height, imported_at: mapping.importedAt }, { onConflict: "content_hash", ignoreDuplicates: true });
    if (asset.error) throw new Error("MEDIA_ASSET_WRITE_FAILED");
    const saved = await db.from("fabric_media_mappings").upsert({ fabric_id: mapping.fabricId, content_hash: mapping.contentHash, image_type: mapping.imageType, supplier_id: mapping.supplier, supplier_sku: mapping.supplierSku, source_reference: mapping.sourceReference, rights_state: mapping.rightsState, mapping_state: mapping.mappingState, imported_at: mapping.importedAt }, { onConflict: "fabric_id,image_type,content_hash", ignoreDuplicates: true });
    if (saved.error) throw new Error("MEDIA_MAPPING_WRITE_FAILED");
    const approved = await db.from("fabric_media_mappings").select("rights_state,mapping_state").eq("fabric_id", mapping.fabricId).eq("content_hash", mapping.contentHash).eq("image_type", mapping.imageType).single();
    if (approved.error || approved.data.rights_state !== "APPROVED" || approved.data.mapping_state !== "VERIFIED") throw new Error("MEDIA_MAPPING_APPROVAL_WITHHELD");
    // Replace portal hotlinks only after the verified Shopify copy exists.
    const imagery = [...new Set([mapping.shopifyCdnUrl, ...((row.imagery ?? []) as string[]).filter(isShopifyCdnUrl)])];
    const update = await db.from("fabric_colourways").update({ imagery }).eq("fabric_id", mapping.fabricId).eq("updated_at", row.updated_at).select("fabric_id");
    if (update.error || !update.data?.length) throw new Error("MEDIA_MASTER_REVISION_CHANGED");
    const checkpoint = await db.from("fabric_media_checkpoints").upsert({ supplier_id: mapping.supplier, supplier_sku: mapping.supplierSku, fabric_id: mapping.fabricId, state: "UPLOADED", failure_reason: null, updated_at: new Date().toISOString() });
    if (checkpoint.error) throw new Error("MEDIA_CHECKPOINT_WRITE_FAILED");
    count++;
  }
  console.log(JSON.stringify({ mappingsApplied: count, visibilityChanges: 0, pricingChanges: 0 }));
}
main().catch(() => { console.error("MEDIA_MAPPING_APPLY_FAILED"); process.exitCode = 1; });
