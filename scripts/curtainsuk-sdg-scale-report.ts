/** Read-only Phase 5K accounting. Selects no prices, stock or credentials. */
import {readFile,readdir,writeFile} from "node:fs/promises";
import {loadEnvConfig} from "@next/env";
import {createSupplierServiceClient} from "../lib/supabase/supplier-service";
import type {ImportedMedia} from "../lib/fabric-master/supplier-media";
import {normalisePortalDisplay} from "../lib/fabric-master/portal-discovery";

async function main(){
 loadEnvConfig(process.cwd());
 if(new URL(process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname!=="hqysjumypgeapgmqkcrx.supabase.co")throw new Error("STAGING_REQUIRED");
 const root="artifacts/phase5k",db=createSupplierServiceClient();
 const brands=await db.from("supplier_brands").select("brand_id,display_name");
 if(brands.error)throw new Error("BRANDS_READ_FAILED");
 const names=new Map(brands.data.map(b=>[b.brand_id,b.display_name]));
 const masters=[];
 for(let from=0;;from+=1000){
  const r=await db.from("fabric_colourways").select("fabric_id,supplier_id,supplier_sku,brand_id,colour_name,lifecycle_state,staging_catalog_visible,imagery,fabric_designs!inner(display_name)").order("fabric_id").range(from,from+999);
  if(r.error)throw new Error("MASTER_READ_FAILED");masters.push(...r.data);if(r.data.length<1000)break;
 }
 const state=JSON.parse(await readFile("artifacts/phase5f/checkpoints/supplier-media.json","utf8")) as {mappings:Record<string,ImportedMedia>;failures:Record<string,string>};
 const mapped=new Map(Object.values(state.mappings).filter(m=>m.imageType==="MAIN").map(m=>[m.fabricId,m]));
 const observed=new Map<string,{sku:string;brand:string;status:string;title:string}>();
 const aliases:Record<string,string>={"Clarke and Clarke":"Clarke & Clarke","Morris and Co.":"Morris & Co."};
 for(const name of await readdir(`${root}/observations`)){
  if(!name.endsWith(".json"))continue;
  const o=JSON.parse(await readFile(`${root}/observations/${name}`,"utf8"));
  for(const r of o.rows)observed.set(`${aliases[r.brand]??r.brand}|${r.sku}`,r);
 }
 const phaseIds=new Set<string>();
 const batchReports=[];
 for(const name of (await readdir(root)).filter(n=>/^batch-\d+$/.test(n)).sort()){
  const m=JSON.parse(await readFile(`${root}/${name}/approved-manifest.json`,"utf8"));
  const ids=Object.keys(m.results);ids.forEach(id=>phaseIds.add(id));
  batchReports.push({batch:name,selected:ids.length,mapped:ids.filter(id=>mapped.has(id)).length,unmapped:ids.filter(id=>!mapped.has(id)).length});
 }
 const byBrand:Record<string,Record<string,number>>={},unmapped=[],discontinuedPending=[];
 const named=new Map<string,typeof observed extends Map<string,infer V>?V[]:never>();
 for(const o of observed.values()){
  const key=`${aliases[o.brand]??o.brand}|${normalisePortalDisplay(o.title)}`;
  named.set(key,[...(named.get(key)??[]),o]);
 }
 for(const m of masters){
  const brand=names.get(m.brand_id)??"UNKNOWN";
  const b=byBrand[brand]??={masterRecords:0,processedExactListing:0,genuineImagesMapped:0,newPhaseMappings:0,browsable:0,discontinuedHidden:0,stillUnmapped:0};
  b.masterRecords++;
  const seen=observed.has(`${brand}|${m.supplier_sku}`);
  if(observed.get(`${brand}|${m.supplier_sku}`)?.status==="Discontinued" && (m.lifecycle_state!=="DISCONTINUED"||m.staging_catalog_visible))discontinuedPending.push({fabricId:m.fabric_id,sku:m.supplier_sku,brand,visible:m.staging_catalog_visible});
  if(seen)b.processedExactListing++;
  if(mapped.has(m.fabric_id)){b.genuineImagesMapped++;if(phaseIds.has(m.fabric_id))b.newPhaseMappings++;}
  else{
   b.stillUnmapped++;
   const design=(m.fabric_designs as unknown as {display_name:string}).display_name;
   const candidates=seen?[]:named.get(`${brand}|${normalisePortalDisplay(`${design} ${m.colour_name}`)}`)??[];
   unmapped.push({fabricId:m.fabric_id,sku:m.supplier_sku,brand,design,colour:m.colour_name,status:m.lifecycle_state,reason:seen?"EXACT_LISTING_OBSERVED_RECONCILIATION_OR_IMPORT_PENDING":"EXACT_SKU_NOT_MAPPED_FROM_CAPTURED_LISTINGS",exactNameCandidates:candidates.map(c=>({portalSku:c.sku,portalTitle:c.title,resolution:"SUPPLIER_CODE_RELATIONSHIP_REQUIRES_CONFIRMATION"}))});
  }
  if(m.staging_catalog_visible)b.browsable++;
  if(m.lifecycle_state==="DISCONTINUED"&&!m.staging_catalog_visible)b.discontinuedHidden++;
 }
 const report={checkedAt:new Date().toISOString(),byBrand,batches:batchReports,totalFabrics:masters.length,totalBrowsables:masters.filter(m=>m.staging_catalog_visible).length,totalImageReady:mapped.size,phaseMappings:[...phaseIds].filter(id=>mapped.has(id)).length,distinctPhaseImageHashes:new Set([...phaseIds].flatMap(id=>mapped.has(id)?[mapped.get(id)!.contentHash]:[])).size,unmapped:unmapped.length,unmappedDoesNotMeanMissing:true,observedDiscontinuedPending:discontinuedPending,commercialChanges:0};
 const output=process.argv.find(a=>a.startsWith("--report="))?.slice(9)??`${root}/scale-report.json`;
 await writeFile(output,JSON.stringify(report,null,2));
 await writeFile(`${root}/unmapped-records.json`,JSON.stringify(unmapped,null,2));
 console.log(JSON.stringify(report));
}
main().catch(()=>{console.error("SCALE_REPORT_FAILED");process.exitCode=1;});
