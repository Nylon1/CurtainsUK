import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parseEnv} from 'node:util';
import {buildCatalogueImport} from '../lib/fabric-master/catalogue-normalization';
import {preparePtWorkbookRecords,type PtPreparedRecord} from '../lib/fabric-master/pt-workbook-batch';
import {createSupplierServiceClient} from '../lib/supabase/supplier-service';

const arg=(name:string)=>process.argv.find(a=>a.startsWith(`--${name}=`))?.slice(name.length+3);
async function main(){
  for(const k of ['env-file','manifest','source-workbook','out']) if(!arg(k)) throw Error(`PT_REQUIRED_${k.toUpperCase()}`);
  const env=parseEnv(await readFile(arg('env-file')!,'utf8')); Object.assign(process.env,env);
  if(new URL(process.env.SUPABASE_URL??'').hostname!=='hqysjumypgeapgmqkcrx.supabase.co')throw Error('PT_DATABASE_TARGET_REJECTED');
  const rows=JSON.parse(await readFile(arg('manifest')!,'utf8')) as PtPreparedRecord[];
  const workbook=await readFile(arg('source-workbook')!);
  const sha=createHash('sha256').update(workbook).digest('hex');
  if(sha!=='aa51f9df01c9de3bfbfefb61e02d2e66defbd1fb6ec35732e65a196f70c522ca')throw Error('PT_SOURCE_WORKBOOK_CHANGED');
  const records=preparePtWorkbookRecords(rows,{name:'PT manufacturer design and colour list September 2026',reference:'Full Design and Colour List Sept 26 - Standard.xlsx',sha256:sha});
  for(const r of rows){const bytes=await readFile(r.selected_image.local_file);if(bytes.length!==r.selected_image.bytes || createHash('sha256').update(bytes).digest('hex')!==r.selected_image.sha256)throw Error('PT_OFFICIAL_IMAGE_CHANGED');}
  const db=createSupplierServiceClient();
  const designIds=[...new Set(records.map(r=>r.design_id))],collectionIds=[...new Set(records.map(r=>r.collection_id))];
  const checks=await Promise.all([
    db.from('fabric_colourways').select('fabric_id').eq('supplier_id','prestigious-textiles').in('supplier_sku',rows.map(r=>r.supplier_sku)),
    db.from('fabric_designs').select('design_id').eq('supplier_id','prestigious-textiles').in('supplier_design_code',rows.map(r=>r.supplier_design_code)),
    db.from('fabric_designs').select('design_id').in('design_id',designIds),
    db.from('fabric_collections').select('collection_id').in('collection_id',collectionIds),
  ]);
  if(checks.some(r=>r.error))throw Error('PT_IDENTITY_RECONCILIATION_FAILED');
  if(checks.some(r=>r.data?.length))throw Error('PT_FIRST50_ALREADY_REGISTERED_OR_SHARED_PARENT_REQUIRES_MERGE');
  const batch=buildCatalogueImport({supplierId:'prestigious-textiles',sourceType:'AUTHORISED_XLSX_CATALOGUE',sourceName:records[0].source_name,sourceReference:records[0].source_reference,sourceSha256:sha,sourceObservedAt:new Date().toISOString(),existingSupplierSkus:new Set(),records});
  await writeFile(arg('out')!,JSON.stringify(batch,null,2));
  if(process.argv.includes('--apply')){
    if(arg('confirm-project')!=='hqysjumypgeapgmqkcrx')throw Error('PT_APPLY_TARGET_CONFIRMATION_REQUIRED');
    const applied=await db.rpc('apply_fabric_catalogue_batch',{p_import:batch.metadata,p_items:batch.items});
    if(applied.error)throw Error(`PT_GOVERNED_INGESTION_FAILED:${applied.error.code}`);
    await writeFile(arg('out')!+'.result.json',JSON.stringify(applied.data,null,2));
    console.log(JSON.stringify({mode:'APPLY',result:applied.data}));
  } else console.log(JSON.stringify({mode:'PREPARED_ONLY',records:records.length,designs:designIds.length,collections:collectionIds.length,commercial_fields_from_workbook:0,live_writes:0}));
}
main().catch(e=>{console.error(e instanceof Error?e.message:'PT_PREPARATION_FAILED');process.exitCode=1;});
