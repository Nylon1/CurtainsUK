/** Apply five exact-SKU observations and sampled editorial rules, never pricing. */
import { readFile, writeFile } from "node:fs/promises";
import { loadEnvConfig } from "@next/env";
import { createSupplierServiceClient } from "../lib/supabase/supplier-service";
import { fabricMasterRecordsByIds } from "../lib/fabric-master/repository";
import { retailLaunchBlockers } from "../lib/fabric-master/retail";
async function main() {
  loadEnvConfig(process.cwd());
  if (!process.argv.includes("--confirm-project=hqysjumypgeapgmqkcrx") || new URL(process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname !== "hqysjumypgeapgmqkcrx.supabase.co") throw new Error("STAGING_REQUIRED");
  const evidence: {master_id:string;portal_sku:string;portal_product_id:string;colourway:string;confidence:string;verified_at:string;lifecycle:string;sampleAvailable:boolean}[] = JSON.parse(await readFile("artifacts/phase5h/sanderson-astraea-exact-batch.json","utf8"));
  if (evidence.length!==5 || evidence.some((e,i)=>e.master_id!==`sdg-f1787-0${i+2}` || e.confidence!=="HIGH" || e.lifecycle!=="CURRENT" || !e.sampleAvailable || Date.now()-Date.parse(e.verified_at)>86400000)) throw new Error("EXACT_BATCH_REQUIRED");
  const rules: Record<string,{tone:string;families:string[]}> = { Ebony:{tone:"black with pale woven flecks",families:["black","grey"]},Espresso:{tone:"deep brown with pale woven flecks",families:["brown"]},Midnight:{tone:"dark blue with pale woven flecks",families:["blue"]},Parchment:{tone:"soft cream with a lightly mottled weave",families:["white/cream"]},Teal:{tone:"blue-green with dark and pale woven flecks",families:["blue","green"]} };
  const db=createSupplierServiceClient(), reports=[];
  for (const e of evidence) {
    const before=await db.from("fabric_colourways").select("supplier_sku,updated_at,source_effective_date,lifecycle_state,sample_available,price_verification_status,storefront_selectable").eq("fabric_id",e.master_id).single();
    const r=(await fabricMasterRecordsByIds([e.master_id]))[0], rule=rules[e.colourway];
    if (before.error || !r || !rule || before.data.supplier_sku!==e.portal_sku || r.design_name!=="Astraea" || r.colour_name!==e.colourway || r.collection_name!=="Aqueous Performance" || r.brand_name!=="Clarke & Clarke" || before.data.price_verification_status!=="PRICE_REQUIRES_VERIFICATION" || before.data.storefront_selectable) throw new Error("CANONICAL_IDENTITY_OR_COMMERCIAL_STATE_CHANGED");
    if (before.data.source_effective_date && Date.parse(before.data.source_effective_date)>Date.parse(e.verified_at)) throw new Error("NEWER_EVIDENCE_PROTECTED");
    const now=new Date().toISOString();
    const update=await db.from("fabric_colourways").update({lifecycle_state:"CURRENT",sample_available:true,source_type:"MANUAL_PORTAL",source_name:"Phase 5H exact-SKU authorised SDG lifecycle verification",source_reference:`sdg-product:${e.portal_sku}:${e.portal_product_id}`,source_effective_date:e.verified_at.slice(0,10),updated_at:now}).eq("fabric_id",e.master_id).eq("updated_at",before.data.updated_at).select("fabric_id");
    if(update.error || update.data.length!==1)throw new Error("CANONICAL_REVISION_CHANGED");
    const description=`Astraea in ${e.colourway} by Clarke & Clarke combines ${rule.tone}. Its fine, irregular texture adds visual interest without a large pictorial motif, making it an option for contemporary living rooms or bedrooms. This Aqueous Performance fabric is listed for drapes, blinds and cushions. The usable width is 140 cm, with a 24 cm vertical repeat. Order a sample to see how its colour and texture work with your room before choosing your curtains.`;
    const profile={fabric_id:e.master_id,description,description_validated:true,colour_families:rule.families,patterns:["UNKNOWN"],characters:["textured"],styles:["contemporary"],rooms:["living room","bedroom"],window_types:[],headings:[],linings:[],classification_evidence:JSON.stringify({ruleVersion:"phase5h-astraea-five",reviewer:"Codex operator under owner Phase 5H authority",exactSku:e.portal_sku,portalId:e.portal_product_id,allFiveImagesVisuallyReviewed:true}),updated_at:now};
    const inserted=await db.from("fabric_retail_profiles").upsert(profile,{onConflict:"fabric_id",ignoreDuplicates:true});
    if(inserted.error)throw new Error("EDITORIAL_WRITE_FAILED");
    const saved=await db.from("fabric_retail_profiles").select("*").eq("fabric_id",e.master_id).single();
    if(saved.error || saved.data.classification_evidence!==profile.classification_evidence)throw new Error("EXISTING_EDITORIAL_PROTECTED");
    const mappings=await db.from("fabric_media_mappings").select("image_type,fabric_media_assets!inner(shopify_cdn_url,width,height)").eq("fabric_id",e.master_id).eq("mapping_state","VERIFIED").eq("rights_state","APPROVED");
    if(mappings.error)throw new Error("MEDIA_READ_FAILED");
    const images=mappings.data.map(m=>{const a=m.fabric_media_assets as unknown as {shopify_cdn_url:string;width:number;height:number};return {imageType:m.image_type,url:a.shopify_cdn_url,width:a.width,height:a.height,approved:true};});
    const updatedRecord=(await fabricMasterRecordsByIds([e.master_id]))[0];
    const blockers=retailLaunchBlockers(updatedRecord,saved.data,images);
    if(blockers.length)throw new Error("BROWSE_GATE_BLOCKED");
    const visible=await db.from("fabric_colourways").update({staging_catalog_visible:true}).eq("fabric_id",e.master_id).eq("updated_at",now).select("fabric_id");
    if(visible.error || visible.data.length!==1)throw new Error("VISIBILITY_REVISION_CHANGED");
    reports.push({fabricId:e.master_id,browseReady:true,priceReady:false,sampleReady:true,commercialWrites:0,checkedAt:e.verified_at});
  }
  await writeFile("artifacts/phase5h/sanderson-astraea-activation.json",JSON.stringify(reports,null,2)+"\n");
  console.log(JSON.stringify({browseReady:reports.length,priceReady:0,commercialWrites:0}));
}
main().catch(e=>{console.error(e instanceof Error && /^[A-Z_]+$/.test(e.message)?e.message:"ASTRAEA_APPROVAL_FAILED");process.exitCode=1;});
