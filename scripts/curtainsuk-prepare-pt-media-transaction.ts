import {readFile,writeFile} from "node:fs/promises";
import {isShopifyCdnUrl,validateMediaCandidate,type ImportedMedia} from "../lib/fabric-master/supplier-media";
const arg=(n:string)=>process.argv.find(v=>v.startsWith(`--${n}=`))?.slice(n.length+3);
async function main(){
  const manifest=JSON.parse(await readFile(arg("manifest")!,"utf8")) as {fabric_id:string;supplier_sku:string}[];
  const state=JSON.parse(await readFile("artifacts/phase5f/checkpoints/supplier-media.json","utf8"));
  const rows=(Object.values(state.mappings) as ImportedMedia[]).filter(m=>manifest.some(r=>r.fabric_id===m.fabricId&&r.supplier_sku===m.supplierSku));
  if(manifest.length!==50||rows.length!==50||new Set(rows.map(m=>m.fabricId)).size!==50)throw Error("PT_MEDIA_EXACT_50_REQUIRED");
  for(const m of rows){validateMediaCandidate(m);if(m.supplier!=="prestigious-textiles"||m.imageType!=="MAIN"||!isShopifyCdnUrl(m.shopifyCdnUrl)||!/^[a-f0-9]{64}$/.test(m.contentHash)||m.width<=0||m.height<=0)throw Error("PT_MEDIA_INVALID");}
  const payload=JSON.stringify(rows.map(m=>({fabric_id:m.fabricId,supplier_id:m.supplier,supplier_sku:m.supplierSku,content_hash:m.contentHash,shopify_file_id:m.shopifyFileId,shopify_cdn_url:m.shopifyCdnUrl,width:m.width,height:m.height,imported_at:m.importedAt,source_reference:m.sourceReference}))).replaceAll("'","''");
  const sql=`BEGIN;
SET LOCAL lock_timeout='20s'; SET LOCAL statement_timeout='90s';
SELECT pg_advisory_xact_lock(4252026,9248);
CREATE TEMP TABLE pt_media_batch ON COMMIT DROP AS
SELECT * FROM jsonb_to_recordset('${payload}'::jsonb) AS x(fabric_id text,supplier_id text,supplier_sku text,content_hash text,shopify_file_id text,shopify_cdn_url text,width integer,height integer,imported_at timestamptz,source_reference text);
DO $validate$
BEGIN
 IF (SELECT count(*) FROM pt_media_batch)<>50 OR (SELECT count(DISTINCT fabric_id) FROM pt_media_batch)<>50 OR (SELECT count(*) FROM pt_media_batch m JOIN curtainsuk_private.fabric_colourways c USING(fabric_id,supplier_id,supplier_sku) WHERE NOT c.staging_catalog_visible AND c.lifecycle_state<>'DISCONTINUED')<>50 THEN RAISE EXCEPTION 'PT_MEDIA_IDENTITY_OR_VISIBILITY_CHANGED'; END IF;
 IF EXISTS(SELECT 1 FROM pt_media_batch m JOIN curtainsuk_private.fabric_media_assets a USING(content_hash) WHERE a.shopify_cdn_url<>m.shopify_cdn_url OR a.width<>m.width OR a.height<>m.height) THEN RAISE EXCEPTION 'PT_MEDIA_EXISTING_ASSET_DIFFERS'; END IF;
END $validate$;
INSERT INTO curtainsuk_private.fabric_media_assets(content_hash,shopify_file_id,shopify_cdn_url,width,height,imported_at)
SELECT DISTINCT ON(content_hash) content_hash,shopify_file_id,shopify_cdn_url,width,height,imported_at FROM pt_media_batch ON CONFLICT(content_hash) DO NOTHING;
INSERT INTO curtainsuk_private.fabric_media_mappings(fabric_id,content_hash,image_type,supplier_id,supplier_sku,source_reference,rights_state,mapping_state,imported_at)
SELECT fabric_id,content_hash,'MAIN',supplier_id,supplier_sku,source_reference,'APPROVED','VERIFIED',imported_at FROM pt_media_batch ON CONFLICT(fabric_id,image_type,content_hash) DO NOTHING;
DO $approval$ BEGIN
 IF (SELECT count(*) FROM pt_media_batch b JOIN curtainsuk_private.fabric_media_mappings m USING(fabric_id,content_hash,supplier_id,supplier_sku) WHERE m.image_type='MAIN' AND m.rights_state='APPROVED' AND m.mapping_state='VERIFIED')<>50 THEN RAISE EXCEPTION 'PT_MEDIA_APPROVAL_WITHHELD'; END IF;
END $approval$;
UPDATE curtainsuk_private.fabric_colourways c SET imagery=jsonb_build_array(b.shopify_cdn_url)
FROM pt_media_batch b WHERE c.fabric_id=b.fabric_id AND c.supplier_id=b.supplier_id AND c.supplier_sku=b.supplier_sku AND c.imagery='[]'::jsonb;
DO $images$ BEGIN
 IF EXISTS(SELECT 1 FROM pt_media_batch b JOIN curtainsuk_private.fabric_colourways c USING(fabric_id) WHERE c.imagery<>jsonb_build_array(b.shopify_cdn_url) OR c.staging_catalog_visible) THEN RAISE EXCEPTION 'PT_MEDIA_MASTER_IMAGE_CHANGED'; END IF;
END $images$;
INSERT INTO curtainsuk_private.fabric_media_checkpoints(supplier_id,supplier_sku,fabric_id,state,failure_reason,updated_at)
SELECT supplier_id,supplier_sku,fabric_id,'UPLOADED',NULL,now() FROM pt_media_batch
ON CONFLICT(supplier_id,supplier_sku) DO UPDATE SET state='UPLOADED',failure_reason=NULL,updated_at=now();
SELECT count(*) AS attached, count(DISTINCT content_hash) AS distinct_assets,0 AS visibility_changes FROM pt_media_batch;
COMMIT;`;
  await writeFile(arg("out")!,sql);console.log(JSON.stringify({prepared:rows.length,liveWrites:0}));
}
main().catch(e=>{console.error(e instanceof Error?e.message:"PT_MEDIA_TRANSACTION_PREPARE_FAILED");process.exitCode=1;});
