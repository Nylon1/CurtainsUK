import { readFile,writeFile } from "node:fs/promises";
import { loadEnvConfig } from "@next/env";
import { createSupplierServiceClient } from "../lib/supabase/supplier-service";
import { fabricMasterRecordsByIds } from "../lib/fabric-master/repository";
import { approvedMediaJob, type DiscoveredImage } from "../lib/fabric-master/discovered-media";
import { newDiscoveryCheckpoint, recordDiscoveryObservation, type DiscoveryCheckpoint } from "../lib/fabric-master/portal-discovery";
import { PORTAL_MAP_VERSION } from "../lib/fabric-master/portal-discovery-maps";

// Data preparation for the existing importer: no schema or catalogue architecture changes.
async function main(){
 loadEnvConfig(process.cwd());
 const input=process.argv.find(a=>a.startsWith("--input="))?.slice(8);
 if(!input) throw new Error("OBSERVATIONS_REQUIRED");
 const observed=JSON.parse(await readFile(input,"utf8")) as {checkedAt:string;brand:string;productType:string;status:string;rows:[string,string,string][]};
 if(observed.productType!=="FABRIC" || observed.status!=="Live" || observed.rows.length>250) throw new Error("OBSERVATIONS_INVALID");
 const db=createSupplierServiceClient();
 let databaseWrites=0;
 if(process.argv.includes("--apply-colour-corrections")) {
  if(!process.argv.includes("--confirm-project=hqysjumypgeapgmqkcrx") || new URL(process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname!=="hqysjumypgeapgmqkcrx.supabase.co") throw new Error("STAGING_REQUIRED");
  const path="artifacts/portal-discovery/colour-corrections.json";
  const corrections=JSON.parse(await readFile(path,"utf8")) as {resolution:string;rows:{master_id:string;workbook_sku:string;portal_sku:string;brand:string;design:string;workbook_colour:string;portal_colour:string;expected_revision:string;workbook_effective_date:string}[]};
  if(corrections.rows.length!==2 || observed.brand!=="Clarke & Clarke") throw new Error("CORRECTION_SCOPE_INVALID");
  for(const correction of corrections.rows) {
   if(correction.workbook_sku!==correction.portal_sku || !observed.rows.some(r=>r[0]===correction.portal_sku && r[1]===`${correction.design} ${correction.portal_colour}`)) throw new Error("EXACT_PORTAL_EVIDENCE_REQUIRED");
   const current=(await fabricMasterRecordsByIds([correction.master_id]))[0];
   if(!current || current.supplier_sku!==correction.workbook_sku || current.design_name!==correction.design || current.brand_name!==correction.brand) throw new Error("CORRECTION_IDENTITY_CHANGED");
   if(current.colour_name===correction.portal_colour) continue;
   const saved=await db.from("fabric_colourways").update({colour_name:correction.portal_colour,updated_at:new Date().toISOString()}).eq("fabric_id",correction.master_id).eq("supplier_sku",correction.workbook_sku).eq("colour_name",correction.workbook_colour).eq("updated_at",correction.expected_revision).eq("source_effective_date",correction.workbook_effective_date).eq("staging_catalog_visible",false).select("fabric_id");
   if(saved.error || saved.data.length!==1) throw new Error("NEWER_COLOUR_IDENTITY_PROTECTED");
   databaseWrites++;
  }
  corrections.resolution="APPLIED_GUARDED_COLOUR_CORRECTION";
  await writeFile(path,JSON.stringify(corrections,null,2));
 }
 const {data,error}=await db.from("fabric_colourways").select("fabric_id,supplier_sku").eq("supplier_id","sanderson-design-group").in("supplier_sku",observed.rows.map(r=>r[0]));
 if(error) throw new Error("MASTER_READ_FAILED");
 const ids=(data??[]).map(r=>r.fabric_id);
 const masters=(await Promise.all(Array.from({length:Math.ceil(ids.length/48)},(_,i)=>fabricMasterRecordsByIds(ids.slice(i*48,(i+1)*48))))).flat();
 const normal=(v:string)=>v.normalize("NFKC").trim().replace(/\s+/g," ").toLowerCase();
 const results:Record<string,unknown>={},withheld:{sku:string;reason:string}[]=[], reconciliation:Record<string,unknown>[]=[];
 // Observed, bounded display-name differences. Exact SKU, brand AND colour still
 // have to agree. These do not rename masters or permit fuzzy name matching.
 const displayAliases:Record<string,{design:string;portalDesign:string}>={
  CCF0887:{design:"Ignis",portalDesign:"Ignis Weave"},
  CCF0888:{design:"Kalia",portalDesign:"Kalia Print"},
  CCF0891:{design:"Viento",portalDesign:"Viento Print"},
  CCF0892:{design:"Wildbloom",portalDesign:"Wildbloom Print"},
 };
 for(const [sku,title,imagePath] of observed.rows){
  const matches=masters.filter(m=>m.supplier_sku===sku);
  if(matches.length!==1){withheld.push({sku,reason:matches.length?"DUPLICATE_MASTER_SKU":"NO_EXACT_MASTER_SKU"});continue;}
  const m=matches[0];
  const alias=displayAliases[sku.split("-")[0]];
  const exactTitle=normal(`${m.design_name} ${m.colour_name}`)===normal(title);
  const knownDisplayAlias=observed.brand==="Clarke & Clarke" && alias && normal(alias.design)===normal(m.design_name) && normal(`${alias.portalDesign} ${m.colour_name}`)===normal(title);
  const identityMatches=normal(m.brand_name)===normal(observed.brand) && (exactTitle || knownDisplayAlias);
  reconciliation.push({master_id:m.fabric_id,workbook_sku:m.supplier_sku,portal_sku:sku,master_design:m.design_name,master_colour:m.colour_name,portal_title:title,match_method:identityMatches?(exactTitle?"EXACT_SKU_BRAND_DESIGN_COLOUR":"EXACT_SKU_BRAND_COLOUR_VERIFIED_DISPLAY_ALIAS"):"UNRESOLVED_IDENTITY_DIFFERENCE",confidence:identityMatches?"HIGH":"WITHHELD",resolution:identityMatches?"APPROVED_MEDIA_ONLY":"WITHHELD",verified_at:observed.checkedAt});
  if(!identityMatches){withheld.push({sku,reason:"IDENTITY_MISMATCH"});continue;}
  if(m.lifecycle_state==="DISCONTINUED"){withheld.push({sku,reason:"KNOWN_DISCONTINUED"});continue;}
  if(!/^[A-Za-z0-9/_ .-]+\.jpg$/.test(imagePath)){withheld.push({sku,reason:"UNSAFE_IMAGE_PATH"});continue;}
  const identity={supplier:m.supplier_id,fabricId:m.fabric_id,sku,brand:m.brand_name,design:m.design_name,colour:m.colour_name,collection:m.collection_name};
  const media:DiscoveredImage={url:`https://trade.sandersondesigngroup.com/static/media/catalog/product/${imagePath}`,route:"FABRIC_LISTING",location:"sdg.fabric-listing",rightsState:"APPROVED",evidence:{sku,brand:observed.brand,design:m.design_name,colour:m.colour_name,productType:"FABRIC",scope:"COLOURWAY",imageType:"MAIN",relationshipEstablished:true}};
  approvedMediaJob(identity,media);
  const discoveryPath=`artifacts/phase5f/checkpoints/discovery-${m.fabric_id}.json`;
  let discovery=newDiscoveryCheckpoint(identity,PORTAL_MAP_VERSION);
  try {
   const previous=JSON.parse(await readFile(discoveryPath,"utf8")) as DiscoveryCheckpoint;
   if(previous.identityKey===discovery.identityKey && previous.mapVersion===discovery.mapVersion) discovery=previous;
  } catch(error) { if((error as NodeJS.ErrnoException).code!=="ENOENT") throw new Error("DISCOVERY_CHECKPOINT_INVALID"); }
  const later=discovery.observations.some(o=>o.route==="FABRIC_LISTING" && Date.parse(o.checkedAt)>Date.parse(observed.checkedAt));
  if(!later) discovery=recordDiscoveryObservation(discovery,{route:"FABRIC_LISTING",state:"IN_PROGRESS",location:"sdg.fabric-listing",checkedAt:observed.checkedAt,pagesVisited:1,paginationExhausted:false,productFound:true,exactSkuFound:true,colourwayMedia:1,designMedia:0,ambiguous:false});
  await writeFile(discoveryPath,JSON.stringify(discovery,null,2));
  results[m.fabric_id]={record:{fabric_id:m.fabric_id,supplier_id:m.supplier_id,supplier_sku:sku,brand_name:m.brand_name,design_name:m.design_name,colour_name:m.colour_name,collection_name:m.collection_name},images:[],media:[media]};
 }
 const output=process.argv.find(a=>a.startsWith("--output="))?.slice(9) ?? "artifacts/phase5f/checkpoints/sdg-observed-media.json";
 const reportPath=process.argv.find(a=>a.startsWith("--report="))?.slice(9) ?? "artifacts/portal-discovery/sdg-reconciliation.json";
 await writeFile(output,JSON.stringify({results},null,2));
 const report={observed:observed.rows.length,exactIdentityMatches:Object.keys(results).length,withheld,databaseWrites,pricingChanges:0};
 await writeFile(reportPath,JSON.stringify({...report,reconciliation},null,2));console.log(JSON.stringify(report));
}
main().catch(()=>{console.error("OBSERVED_MEDIA_RECONCILIATION_FAILED");process.exitCode=1;});
