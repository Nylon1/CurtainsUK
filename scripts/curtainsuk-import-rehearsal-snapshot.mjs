// Read-only export: fixed GET allowlist, no RPCs, OpenAI, image fetches, or writes.
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const out='artifacts/import-rehearsal-snapshot';
const tables={
  fabric_colourways:['fabric_id','fabric_id,supplier_id,supplier_sku,brand_id,design_id,colour_name,colourway_code,lifecycle_state,staging_catalog_visible'],
  fabric_media_mappings:['fabric_id,image_type,content_hash','fabric_id,supplier_id,supplier_sku,image_type,content_hash,rights_state,mapping_state'],
  fabric_media_assets:['content_hash','content_hash,shopify_cdn_url,width,height'],
  fabric_visual_knowledge_read_cache:['fabric_id','*'],
  fabric_visual_enrichment_ledger:['ledger_id','*'],
  fabric_visual_enrichment_failures:['failure_id','*'],
  fabric_visual_enrichment_runs:['run_id','run_id'],
  browse_projection_control:['singleton','*'],
  browse_read_projection:['fabric_id','fabric_id,generation_id'],
  browse_projection_dirty:['fabric_id','fabric_id'],
};
const base=new URL(process.env.SUPABASE_URL||'https://invalid.invalid');
const key=process.env.SUPABASE_SECRET_KEY;
if(base.protocol!=='https:'||base.hostname!=='hqysjumypgeapgmqkcrx.supabase.co'||!key)throw Error('SNAPSHOT_CONFIG_REJECTED');
let requests=0;
async function read(table,offset=0,limit=500,count=false){
  if(!Object.hasOwn(tables,table))throw Error('SNAPSHOT_TABLE_REJECTED');
  const url=new URL(`/rest/v1/${table}`,base);
  url.searchParams.set('select',tables[table][1]);url.searchParams.set('order',tables[table][0]);
  url.searchParams.set('offset',String(offset));url.searchParams.set('limit',String(limit));
  const response=await fetch(url,{method:'GET',redirect:'error',signal:AbortSignal.timeout(120000),headers:{apikey:key,authorization:`Bearer ${key}`,'Accept-Profile':'curtainsuk_private',...(count?{Prefer:'count=exact'}:{})}});
  requests++;
  if(!response.ok)throw Error(`SNAPSHOT_READ_${table}_${response.status}`);
  const rows=await response.json();if(!Array.isArray(rows))throw Error('SNAPSHOT_NONARRAY');
  return {rows,count:count?Number(response.headers.get('content-range')?.split('/')[1]):null};
}
async function baseline(){
  const counts={};for(const table of Object.keys(tables))counts[table]=(await read(table,0,1,true)).count;
  return {observed_at:new Date().toISOString(),counts,control:(await read('browse_projection_control')).rows};
}
await mkdir(out,{recursive:true});
const before=await baseline();await writeFile(`${out}/baseline-before.json`,JSON.stringify(before,null,2));
const exports=[];
for(const table of Object.keys(tables)){
  const rows=[];for(let offset=0;;offset+=500){const page=(await read(table,offset)).rows;rows.push(...page);if(page.length<500)break;}
  if(rows.length!==before.counts[table])throw Error(`SNAPSHOT_COUNT_DRIFT_${table}`);
  const data=JSON.stringify(rows);await writeFile(`${out}/${table}.json`,data);
  exports.push({table,rows:rows.length,sha256:createHash('sha256').update(data).digest('hex')});
  console.log(JSON.stringify({table,rows:rows.length}));
}
const after=await baseline();await writeFile(`${out}/baseline-after.json`,JSON.stringify(after,null,2));
const countChanges=Object.keys(tables).filter(t=>before.counts[t]!==after.counts[t]);
await writeFile(`${out}/snapshot-proof.json`,JSON.stringify({mode:'READ_ONLY_IMPORT_REHEARSAL',requests,allowed_method:'GET',database_writes:0,rpc_calls:0,image_fetches:0,openai_calls:0,exports,count_changes:countChanges,control_changed:JSON.stringify(before.control)!==JSON.stringify(after.control)},null,2));
if(countChanges.length)throw Error('SNAPSHOT_PRODUCTION_COUNTS_CHANGED');
