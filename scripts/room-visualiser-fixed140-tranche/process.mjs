/** Resumable, unpublished V1 source preparation. No catalogue or assignment writes. */
import {readFile,readdir,appendFile,mkdir,writeFile,rename,stat,unlink} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {assertUnassigned,physicalWidth,preflight,sourceKind,sourceReviewReason,validateV1} from './policy.mjs';
import {editorialBandSignal} from './source-quality.mjs';

const args=process.argv.slice(2);
const option=(name,fallback)=>{const i=args.indexOf(`--${name}`);return i<0?fallback:args[i+1];};
const snapshot=resolve(option('snapshot',''));
const output=resolve(option('output',''));
const browseDir=resolve(option('browse-dir',''));
const limit=Number(option('limit','1000'));
const stopAfter=Number(option('stop-after','1000'));
const batchSize=Number(option('batch-size','100'));
const concurrency=Number(option('concurrency','8'));
if(!args.includes('--snapshot')||!args.includes('--output')||!args.includes('--browse-dir')||!Number.isSafeInteger(limit)||limit<1||
   !Number.isSafeInteger(stopAfter)||stopAfter<1||stopAfter>limit||
   !Number.isSafeInteger(batchSize)||batchSize<1||batchSize>250||
   !Number.isSafeInteger(concurrency)||concurrency<1||concurrency>16)
  throw Error('Usage: node process.mjs --snapshot <browse-selected-catalogue.jsonl> --browse-dir <private-browse-snapshot-dir> --output <private-dir> --limit <count> [--batch-size 100] [--concurrency 8]');
const rows=(await readFile(snapshot,'utf8')).trim().split(/\r?\n/).map(JSON.parse);
if(rows.length!==limit||new Set(rows.map(r=>r.fabric_id)).size!==limit||
   rows.some((r,i)=>r.candidate_order!==i+1))throw Error(`Snapshot must contain exactly ${limit} unique ordered candidates`);
const browseFiles=(await readdir(browseDir)).filter(name=>/^browse-ids-\d{3}\.jsonl$/.test(name)).sort();
if(!browseFiles.length)throw Error('Current Browse ID snapshot is required');
const browseIds=new Set();
for(const name of browseFiles){
  for(const line of (await readFile(join(browseDir,name),'utf8')).trim().split(/\r?\n/)){
    const id=JSON.parse(line).fabric_id;
    if(!id||browseIds.has(id))throw Error('Browse ID snapshot has invalid or duplicate IDs');
    browseIds.add(id);
  }
}
const generation=rows[0].browse_generation;
if(!generation||rows.some(row=>row.browse_generation!==generation||!browseIds.has(row.fabric_id)))
  throw Error('Tranche includes an ID outside the selected active Browse generation');
const manifest=JSON.parse(await readFile(resolve('lib/room-visualiser/assets.json'),'utf8'));
const standardIds=new Set(manifest.fabrics.map(f=>f.fabricId));
if(standardIds.size!==3137)throw Error('STANDARD manifest count changed; reselect tranche');
const assignedBytes=await readFile(resolve('lib/room-visualiser/fixed140-assignments.json'));
const assignedIds=new Set(Object.keys(JSON.parse(assignedBytes).assignments));
if(assignedIds.size!==2940)throw Error('Existing V1 assignment count changed; reselect tranche');
assertUnassigned(rows,standardIds,assignedIds);
const standardHash=createHash('sha256').update(await readFile(resolve('lib/room-visualiser/assets.json'))).digest('hex');
const assignedHash=createHash('sha256').update(assignedBytes).digest('hex');
const snapshotHash=createHash('sha256').update(await readFile(snapshot)).digest('hex');
await mkdir(output,{recursive:true});
await mkdir(join(output,'prepared-assets'),{recursive:true});
const ledgerPath=join(output,'ledger.jsonl');
let completed=[];
try{completed=(await readFile(ledgerPath,'utf8')).trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);}
catch(error){if(error.code!=='ENOENT')throw error;}
if(completed.some((r,i)=>r.candidate_order!==i+1||r.fabric_id!==rows[i].fabric_id||
  r.standard_manifest_sha256!==standardHash||r.v1_assignments_sha256!==assignedHash||
  r.snapshot_sha256!==snapshotHash))
  throw Error('Ledger is not a prefix of this exact tranche snapshot and live visualiser manifests');
const prepared=join(output,'prepared-assets');
const checkpointPath=join(output,'checkpoint.json');
async function checkpoint(){
  const counts=Object.fromEntries(['V1_PASS','SOURCE_REVIEW','INSUFFICIENT_COVERAGE','BAD_SOURCE_IMAGE','V1_RUNTIME_FAILURE']
    .map(state=>[state,completed.filter(row=>row.state===state).length]));
  const temporary=checkpointPath+`.${process.pid}.part`;
  await writeFile(temporary,JSON.stringify({processed:completed.length,limit,snapshot_sha256:snapshotHash,
    standard_manifest_sha256:standardHash,v1_assignments_sha256:assignedHash,
    counts,last_fabric_id:completed.at(-1)?.fabric_id},null,2)+'\n');
  await rename(temporary,checkpointPath);
}
async function processOne(row){
  const base={candidate_order:row.candidate_order,fabric_id:row.fabric_id,supplier:row.supplier_id,
    design_id:row.design_id,design:row.design,colourway:row.colour_name,
    lifecycle_state:row.lifecycle_state,width:physicalWidth(row),source_url:row.source_url,
    source_sha256:null,source_width_px:null,source_height_px:null,source_height_cm:null,
    asset_path:null,asset_bytes:0,standard_manifest_sha256:standardHash,
    v1_assignments_sha256:assignedHash,snapshot_sha256:snapshotHash,
    checked_at:new Date().toISOString()};
  const issue=preflight(row,standardIds);
  if(issue)return {...base,state:'SOURCE_REVIEW',reason:issue};
  let bytes;
  try{
    const response=await fetch(row.source_url,{signal:AbortSignal.timeout(25000),headers:{'Accept':'image/jpeg,image/webp'}});
    if(!response.ok)return {...base,state:'BAD_SOURCE_IMAGE',reason:`SOURCE_HTTP_${response.status}`};
    if(Number(response.headers.get('content-length'))>20_000_000)
      return {...base,state:'SOURCE_REVIEW',reason:'SOURCE_ABOVE_20_MB'};
    bytes=Buffer.from(await response.arrayBuffer());
  }catch(error){return {...base,state:'SOURCE_REVIEW',reason:`SOURCE_FETCH_${error.name||'ERROR'}`};}
  const hash=createHash('sha256').update(bytes).digest('hex');
  base.source_sha256=hash;
  base.asset_bytes=bytes.length;
  const kind=sourceKind(bytes);
  if(!kind)return {...base,state:'BAD_SOURCE_IMAGE',reason:'NOT_JPEG_OR_WEBP'};
  let meta;
  try{meta=await sharp(bytes,{limitInputPixels:100_000_000,failOn:'error'}).metadata();}
  catch(error){return {...base,state:'BAD_SOURCE_IMAGE',reason:`DECODE_FAILED:${error.message}`};}
  if(!['jpeg','webp'].includes(meta.format))
    return {...base,state:'BAD_SOURCE_IMAGE',reason:'UNEXPECTED_DECODED_FORMAT'};
  base.source_width_px=meta.width;base.source_height_px=meta.height;
  base.source_height_cm=meta.height*base.width.cm/meta.width;
  const geometry=validateV1(row,meta.width,meta.height);
  if(geometry.state!=='V1_PASS')
    return {...base,state:geometry.state,reason:geometry.reason,mesh:geometry.mesh??null};
  const review=sourceReviewReason(row,meta);
  if(review)return {...base,state:'SOURCE_REVIEW',reason:review,mesh:geometry.mesh};
  const sourceSignal=await editorialBandSignal(bytes);
  if(sourceSignal.suspect)return {...base,state:'SOURCE_REVIEW',reason:'EDITORIAL_BAND_SUSPECTED',
    source_quality_signal:sourceSignal,mesh:geometry.mesh};
  const assetName=`${hash}.${kind.extension}`;
  const target=join(prepared,assetName);
  try{
    await stat(target);
    const existing=await readFile(target);
    if(!existing.equals(bytes))throw Error('HASH_ADDRESS_COLLISION');
  }catch(error){
    if(error.code!=='ENOENT')return {...base,state:'V1_RUNTIME_FAILURE',reason:error.message};
    const temporary=target+`.${process.pid}.part`;
    try{await writeFile(temporary,bytes,{flag:'wx'});await rename(temporary,target);}
    catch(writeError){await unlink(temporary).catch(()=>{});return {...base,state:'V1_RUNTIME_FAILURE',reason:`ASSET_PREPARE:${writeError.message}`};}
  }
  return {...base,state:'V1_PASS',reason:null,mesh:geometry.mesh,
    asset_path:`/room-visualiser/fixed140/${assetName}`,asset_bytes:bytes.length};
}
const started=Date.now();
for(let batchStart=completed.length;batchStart<stopAfter;batchStart+=batchSize){
  const end=Math.min(stopAfter,batchStart+batchSize),pending=new Map();
  let next=batchStart;
  function start(){while(next<end&&pending.size<concurrency){
    const index=next++;
    pending.set(index,processOne(rows[index]).catch(error=>({
      candidate_order:rows[index].candidate_order,fabric_id:rows[index].fabric_id,
      state:'V1_RUNTIME_FAILURE',reason:`PROCESSOR_EXCEPTION:${error.message}`,
      standard_manifest_sha256:standardHash,v1_assignments_sha256:assignedHash,
      snapshot_sha256:snapshotHash,checked_at:new Date().toISOString(),
    })));
  }}
  start();
  for(let index=batchStart;index<end;index++){
    const result=await pending.get(index);
    pending.delete(index);
    await appendFile(ledgerPath,JSON.stringify(result)+'\n');
    completed.push(result);
    await checkpoint();
    start();
    if(completed.length%25===0)console.log(JSON.stringify({processed:completed.length,last:result.fabric_id,
      elapsedSeconds:Math.round((Date.now()-started)/1000)}));
  }
}
await checkpoint();
const counts=Object.fromEntries(['V1_PASS','SOURCE_REVIEW','INSUFFICIENT_COVERAGE','BAD_SOURCE_IMAGE','V1_RUNTIME_FAILURE']
  .map(state=>[state,completed.filter(row=>row.state===state).length]));
console.log(JSON.stringify({processed:completed.length,counts,elapsedSeconds:Math.round((Date.now()-started)/1000)}));
