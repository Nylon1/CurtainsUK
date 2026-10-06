// One offline queue pass: classify -> build -> quality/provenance gate -> stage.
// A protected release deploys staged assets; --verify-live then checks public
// catalogue eligibility and immutable CDN bytes. Customer requests never build.
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import sharp from 'sharp';
import {classify,assessPlain,assessStraight,verifyRetail,makeEntry,RUNTIME_SIZE,WIDTH_CM,DROP_CM,MAX_BATCH_SIZE} from './core.mjs';
import {normaliseLedger,recordHold} from './ledger.mjs';

const values=process.argv.slice(2);
const arg=name=>{const i=values.indexOf(`--${name}`);return i<0?null:values[i+1]};
const queuePath=arg('queue');if(!queuePath)throw Error('Pass --queue <read-only evidence JSONL>');
const output=resolve(arg('report')||'room-visualiser-publication-report.json');
const stage=values.includes('--stage'),verify=values.includes('--verify-live');
if(stage&&verify)throw Error('Use either --stage or --verify-live');
const ledgerPath=arg('ledger');
if((stage||verify)&&!ledgerPath)throw Error('Stage and live verification require --ledger');
const batchSize=Number(arg('batch-size')||25);
if(!Number.isInteger(batchSize)||batchSize<1||batchSize>MAX_BATCH_SIZE)throw Error(`Batch size must be 1–${MAX_BATCH_SIZE}`);
const root=resolve('lib/room-visualiser');
const manifestPath=join(root,'assets.json');
const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
const known=new Map(manifest.fabrics.map(f=>[f.fabricId,f]));
let ledger=null;
if(ledgerPath){
  ledger=normaliseLedger(JSON.parse(await readFile(resolve(ledgerPath),'utf8')),[...known.keys()]);
  if(ledger.staged.length&&stage)throw Error('Verify or resolve the pending staged batch before staging another');
}
const rows=(await readFile(resolve(queuePath),'utf8')).split(/\r?\n/).filter(Boolean).map(JSON.parse);
if(new Set(rows.map(row=>row.fabricId)).size!==rows.length)throw Error('Duplicate fabric ID in publication queue');
const sourceHash=buffer=>createHash('sha256').update(buffer).digest('hex');
const results=[],staged=[];
let newHolds=0,attempted=0;
const reason=(row,mode,status,detail)=>({fabricId:row.fabricId,designId:row.designId,mode,status,reason:detail||null});
function hold(row,mode,detail,persist=false){
  results.push(reason(row,mode,'HOLD',detail));
  if(persist&&ledger&&stage){recordHold(ledger,row.fabricId,detail);newHolds++;}
}
const retailUrl=id=>`https://www.curtainsuk.com/apps/curtainsuk-decision/catalog?view=retail&visualiser=1&fabric=${encodeURIComponent(id)}`;
async function boundedFetch(url,limit=22_000_000){
  const response=await fetch(url,{signal:AbortSignal.timeout(30_000),headers:{Accept:url.includes('/catalog?')?'application/json':'image/jpeg'}});
  if(!response.ok)throw Error(`HTTP_${response.status}`);
  if(Number(response.headers.get('content-length'))>limit)throw Error('SOURCE_TOO_LARGE');
  const body=Buffer.from(await response.arrayBuffer());
  if(body.length>limit)throw Error('SOURCE_TOO_LARGE');
  return {response,body};
}
function hexRgb(hex){return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));}
function stableNoise(x,y,seed){let n=(Math.imul(x+seed,374761393)+Math.imul(y+seed,668265263))|0;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295-.5;}
async function plainDerivative(row,source){
  const meta=await sharp(source).metadata();
  if(meta.format!=='jpeg'||meta.width<700||meta.height<700)throw Error('SOURCE_NOT_FLAT_JPEG');
  const left=Math.round(meta.width*.12),top=Math.round(meta.height*.19);
  const roi=await sharp(source).extract({left,top,width:Math.round(meta.width*.76),height:Math.round(meta.height*.67)}).resize(80,80).raw().toBuffer({resolveWithObject:true});
  const target=hexRgb(row.plainEvidence.representativeColour);
  const pixels=[];for(let i=0;i<roi.data.length;i+=roi.info.channels) pixels.push([roi.data[i],roi.data[i+1],roi.data[i+2]]);
  const med=target.map((_,c)=>pixels.map(p=>p[c]).sort((a,b)=>a-b)[Math.floor(pixels.length/2)]);
  const error=Math.sqrt(target.reduce((n,c,i)=>n+(c-med[i])**2,0));
  if(error>35)throw Error(`SOURCE_COLOUR_MISMATCH_${error.toFixed(1)}`);
  const [width,height]=RUNTIME_SIZE,raw=Buffer.alloc(width*height*3),seed=parseInt(sourceHash(source).slice(0,8),16);
  const tone=Math.min(.6,row.plainEvidence.tonalStrength);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const variation=(3+tone*6)*(stableNoise(x>>2,y>>2,seed)*.7+stableNoise(x,y,seed)*.3)
      +1.25*Math.sin(x*Math.PI/2)*Math.cos(y*Math.PI/2);
    const i=(y*width+x)*3;for(let c=0;c<3;c++)raw[i+c]=Math.max(0,Math.min(255,Math.round(target[c]+variation)));
  }
  const bytes=await sharp(raw,{raw:{width,height,channels:3}}).webp({quality:92,effort:5}).toBuffer();
  const stats=await sharp(bytes).stats();
  if(stats.channels.slice(0,3).some((channel,i)=>Math.abs(channel.mean-target[i])>2))throw Error('DERIVATIVE_COLOUR_DRIFT');
  return {bytes,sourceSha256:sourceHash(source),quality:{sourceMedianRgb:med,derivedRgb:target,sourceColourDistance:error}};
}
async function straightDerivative(row){
  const e=row.straightEvidence,master=await readFile(resolve(e.master));
  if(sourceHash(master)!==e.masterSha256)throw Error('MASTER_HASH_MISMATCH');
  const meta=await sharp(master).metadata();
  if(meta.width<2048||meta.height<1113)throw Error('MASTER_TOO_SMALL');
  if(Math.abs(meta.width-e.pixelsPerCm*WIDTH_CM)>.51||Math.abs(meta.height-e.pixelsPerCm*DROP_CM)>.51)
    throw Error('MASTER_PHYSICAL_EXTENT_MISMATCH');
  const bytes=await sharp(master).resize(...RUNTIME_SIZE,{fit:'fill',kernel:'lanczos3'}).webp({quality:92,effort:5}).toBuffer();
  return {bytes,sourceSha256:e.sourceSha256,quality:{masterSha256:e.masterSha256,masterSize:[meta.width,meta.height],
    repeatsH:WIDTH_CM/row.hRepeatCm,repeatsV:DROP_CM/row.vRepeatCm}};
}
async function liveCheck(row,entry){
  const build=JSON.parse(await readFile(join(root,'build.json'),'utf8'));
  const imagePath=entry.image.startsWith('/')?entry.image:`${build.assetBase}${entry.image}`;
  const [catalogue,asset]=await Promise.all([boundedFetch(retailUrl(row.fabricId),3_000_000),boundedFetch(`https://curtainsuk-production-api.vercel.app${imagePath}`,4_000_000)]);
  const fabric=JSON.parse(catalogue.body.toString()).fabric;
  const mismatch=verifyRetail(row,fabric,entry.mode==='plain'?'plain':'straight');
  if(mismatch)throw Error(mismatch);
  if(fabric.roomPreview?.available!==true||fabric.roomPreview?.url!==`/pages/room-visualiser?fabric=${encodeURIComponent(row.fabricId)}`)throw Error('PUBLIC_PREVIEW_UNAVAILABLE');
  if(sourceHash(asset.body)!==entry.sha256||asset.body.length!==entry.encodedBytes)throw Error('CDN_HASH_MISMATCH');
  const metadata=await sharp(asset.body).metadata();
  if(metadata.format!=='webp'||metadata.width!==RUNTIME_SIZE[0]||metadata.height!==RUNTIME_SIZE[1])throw Error('CDN_FORMAT_OR_DIMENSIONS_MISMATCH');
  if(asset.response.headers.get('cache-control')!=='public, max-age=31536000, immutable'||asset.response.headers.get('content-type')!=='image/webp')throw Error('CDN_CACHE_OR_MIME_MISMATCH');
  return {cache:asset.response.headers.get('x-vercel-cache'),bytes:asset.body.length};
}
for(const row of rows){
  const classification=classify(row),mode=classification.mode;
  if(known.has(row.fabricId)){
    const entry=known.get(row.fabricId);
    const pending=ledger?.staged.includes(row.fabricId);
    if(verify&&pending){
      try{results.push({...reason(row,mode,'PUBLISHED'),live:await liveCheck(row,entry)});}
      catch(error){results.push(reason(row,mode,'LIVE_FAULT',String(error.message)));}
    }else results.push(reason(row,mode,pending?'STAGED':'PUBLISHED'));
    continue;
  }
  if(ledger?.holds[row.fabricId]){hold(row,mode,ledger.holds[row.fabricId]);continue;}
  if(mode==='hold'){hold(row,mode,classification.reason);continue;}
  const gate=mode==='plain'?assessPlain(row):assessStraight(row);
  if(gate){hold(row,mode,gate);continue;}
  if(!stage||staged.length>=batchSize){results.push(reason(row,mode,'REMAINING'));continue;}
  attempted++;
  try{
    const catalogue=JSON.parse((await boundedFetch(retailUrl(row.fabricId),3_000_000)).body.toString());
    const retailGate=verifyRetail(row,catalogue.fabric,mode);
    if(retailGate){hold(row,mode,retailGate,true);continue;}
    const built=mode==='plain'?await plainDerivative(row,(await boundedFetch(row.sourceUrl)).body):await straightDerivative(row);
    const metadata=await sharp(built.bytes).metadata();
    if(metadata.format!=='webp'||metadata.width!==RUNTIME_SIZE[0]||metadata.height!==RUNTIME_SIZE[1])throw Error('DERIVATIVE_SIZE_OR_FORMAT');
    const sha256=sourceHash(built.bytes),image=`/room-visualiser/textures/${sha256}.webp`;
    const entry=makeEntry(row,mode,image,sha256,built.bytes.length,built.sourceSha256);
    staged.push({row,entry,bytes:built.bytes,quality:built.quality});
    results.push({...reason(row,mode,'STAGED'),sha256,encodedBytes:built.bytes.length,quality:built.quality});
  }catch(error){hold(row,mode,`BUILD_OR_SOURCE:${error.message}`,true);}
}
if(staged.length){
  const textures=resolve('public/room-visualiser/textures');await mkdir(textures,{recursive:true});
  for(const item of staged)await writeFile(join(textures,item.entry.sha256+'.webp'),item.bytes);
  manifest.fabrics.push(...staged.map(item=>item.entry));
  await writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
  const fabrics=`export const FABRICS = ${JSON.stringify(manifest.fabrics)};\nfor(const fabric of FABRICS){fabric.image=new URL(fabric.image,import.meta.url).href;fabric.name=fabric.id;}\n`;
  await writeFile(join(root,'runtime/fabrics.mjs'),fabrics);
  const contractFile=join(root,'runtime/rooms/catalogue-contract.mjs'),contract=await readFile(contractFile,'utf8');
  const links=Object.fromEntries(manifest.fabrics.map(f=>[f.fabricId,f.id]));
  const updated=contract.replace(/^export const CALIBRATION_LINKS=.*;$/m,`export const CALIBRATION_LINKS=Object.freeze(${JSON.stringify(links)});`);
  if(updated===contract)throw Error('Catalogue link update failed');
  await writeFile(contractFile,updated);
  ledger.staged.push(...staged.map(item=>item.row.fabricId));
}
if(stage&&(staged.length||newHolds))await writeFile(resolve(ledgerPath),JSON.stringify(ledger,null,2)+'\n');
if(verify&&ledger?.staged.length){
  const good=new Set(results.filter(item=>item.status==='PUBLISHED').map(item=>item.fabricId));
  ledger.published.push(...ledger.staged.filter(id=>good.has(id)));
  ledger.staged=ledger.staged.filter(id=>!good.has(id));
  await writeFile(resolve(ledgerPath),JSON.stringify(ledger,null,2)+'\n');
}
const count=status=>results.filter(item=>item.status===status).length;
const reasons=Object.entries(results.filter(item=>item.status==='HOLD').reduce((all,item)=>{all[item.reason]=(all[item.reason]||0)+1;return all;},{})).sort((a,b)=>b[1]-a[1]);
const report={queue:resolve(queuePath),processed:rows.length,attempted,newlyHeld:newHolds,staged:count('STAGED'),published:count('PUBLISHED'),held:count('HOLD'),remaining:count('REMAINING'),liveFaults:count('LIVE_FAULT'),liveVisualiserTotal:ledger?.published.length??count('PUBLISHED'),manifestTotal:manifest.fabrics.length,
  holdReasons:Object.fromEntries(reasons),stagedFabricIds:staged.map(item=>item.row.fabricId),results};
await writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({processed:report.processed,staged:report.staged,published:report.published,held:report.held,remaining:report.remaining,liveVisualiserTotal:report.liveVisualiserTotal,manifestTotal:report.manifestTotal,holdReasons:report.holdReasons,report:output},null,2));
if(report.liveFaults)process.exitCode=1;
