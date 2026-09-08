/** Prepare exact-SKU, exact-design colour corrections for the existing guarded runbook. */
import {readFile,readdir,writeFile,mkdir} from "node:fs/promises";
import {loadEnvConfig} from "@next/env";
import {createSupplierServiceClient} from "../lib/supabase/supplier-service";
import {sourceImageMatchesSku} from "../lib/fabric-master/supplier-media";

async function main(){
 loadEnvConfig(process.cwd());
 const root="artifacts/phase5k",out=`${root}/colour-corrections`;
 await mkdir(out,{recursive:true});
 for(const name of (await readdir(out)).filter(n=>/^correction-\d+\.json$/.test(n))){
  const prior=JSON.parse(await readFile(`${out}/${name}`,"utf8"));
  if(prior.resolution==="APPLIED_GUARDED_COLOUR_CORRECTION")throw new Error("APPLIED_CORRECTION_HISTORY_IS_IMMUTABLE");
 }
 const reserved=new Set<string>();
 for(const name of (await readdir(root)).filter(n=>/^batch-\d+$/.test(n))){
  const m=JSON.parse(await readFile(`${root}/${name}/approved-manifest.json`,"utf8"));Object.keys(m.results).forEach(id=>reserved.add(id));
 }
 const aliases:Record<string,string>={"Clarke and Clarke":"Clarke & Clarke","Morris and Co.":"Morris & Co."};
 const observations=new Map<string,{checkedAt:string;brand:string;sku:string;title:string;imagePath:string;status:string}>();
 for(const name of await readdir(`${root}/observations`)){
  if(!name.endsWith(".json"))continue;
  const o=JSON.parse(await readFile(`${root}/observations/${name}`,"utf8"));
  for(const r of o.rows){
   const brand=aliases[r.brand]??r.brand,key=`${brand}|${r.sku}`;
   if(!observations.has(key)||observations.get(key)!.checkedAt<o.checkedAt)observations.set(key,{...r,brand,checkedAt:o.checkedAt});
  }
 }
 const db=createSupplierServiceClient();
 if(new URL(process.env.SUPABASE_URL??process.env.NEXT_PUBLIC_SUPABASE_URL??"").hostname!=="hqysjumypgeapgmqkcrx.supabase.co")throw new Error("STAGING_REQUIRED");
 const groups=new Map<string,{observed:typeof observations extends Map<string,infer V>?V:never;correction:Record<string,unknown>}[]>();
 for(let start=0;;start+=1000){
  const result=await db.from("fabric_colourways").select("fabric_id,supplier_sku,colour_name,updated_at,source_effective_date,lifecycle_state,staging_catalog_visible,storefront_selectable,supplier_brands!inner(display_name),fabric_designs!inner(display_name)").eq("supplier_id","sanderson-design-group").order("fabric_id").range(start,start+999);
  if(result.error)throw new Error("MASTER_READ_FAILED");
  for(const m of result.data){
   if(reserved.has(m.fabric_id)||m.staging_catalog_visible||m.storefront_selectable||m.lifecycle_state==="DISCONTINUED"||!m.source_effective_date)continue;
   const brand=(m.supplier_brands as unknown as {display_name:string}).display_name,design=(m.fabric_designs as unknown as {display_name:string}).display_name;
   const o=observations.get(`${brand}|${m.supplier_sku}`);
   if(!o||o.status==="Discontinued"||!o.title.toLowerCase().startsWith(design.toLowerCase()+" "))continue;
   const colour=o.title.slice(design.length+1).trim(),portalDesign=o.title.slice(0,design.length);
   if(!colour||colour===m.colour_name||/\d/.test(colour)||colour.toLowerCase().includes(m.supplier_sku.toLowerCase()))continue;
   // Do not turn product codes, fabric-format suffixes, supplier abbreviations
   // or observed portal spelling errors into customer colour names.
   if(/(?:^|\s)(?:cotton|emb|jacquar|pvm|pvc)$/i.test(colour))continue;
   if(/\b(?:fushia|saphire|burgendy|indigio|cinammon|gry|gsebery|lgnbery|rspbery|lgnberry|rspberry)\b/i.test(colour))continue;
   if(!sourceImageMatchesSku(`https://trade.sandersondesigngroup.com/static/media/catalog/product/${o.imagePath}`,"sanderson-design-group",m.supplier_sku))continue;
   const correction={master_id:m.fabric_id,workbook_sku:m.supplier_sku,portal_sku:m.supplier_sku,brand,design,portal_design:portalDesign,workbook_colour:m.colour_name,portal_colour:colour,expected_revision:m.updated_at,workbook_effective_date:m.source_effective_date};
   const key=`${brand}|${o.status}`;groups.set(key,[...(groups.get(key)??[]),{observed:o,correction}]);
  }
  if(result.data.length<1000)break;
 }
 const files=[];let index=0;
 for(const items of groups.values())for(let start=0;start<items.length;start+=48){
  const part=items.slice(start,start+48),o=part[0].observed,stem=`${out}/correction-${index++}`;
  const input={checkedAt:part.map(p=>p.observed.checkedAt).sort()[0],brand:o.brand,productType:"FABRIC",status:o.status,rows:part.map(p=>[p.observed.sku,p.observed.title,p.observed.imagePath])};
  await writeFile(`${stem}-observed.json`,JSON.stringify(input,null,2));
  await writeFile(`${stem}.json`,JSON.stringify({resolution:"EXACT_SKU_AND_DESIGN_CURRENT_PORTAL_COLOUR",rows:part.map(p=>p.correction)},null,2));
  files.push({corrections:`${stem}.json`,input:`${stem}-observed.json`,rows:part.length,brand:o.brand});
 }
 await writeFile(`${out}/preparation.json`,JSON.stringify({databaseWrites:0,files},null,2));console.log(JSON.stringify({databaseWrites:0,records:files.reduce((n,f)=>n+f.rows,0),files}));
}
main().catch(()=>{console.error("COLOUR_CORRECTION_PREPARATION_FAILED");process.exitCode=1;});
