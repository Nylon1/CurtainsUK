// Offline release preparation. Reads reviewed source-copy masters and writes
// immutable runtime derivatives; customer requests never invoke this script.
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import sharp from 'sharp';

const [batchFile]=process.argv.slice(2);
if(!batchFile)throw Error('Pass an externally reviewed batch JSON path.');
const batch=JSON.parse(await readFile(resolve(batchFile),'utf8'));
if(!Array.isArray(batch)||!batch.length||batch.length>50)throw Error('Expected a nonempty controlled batch of at most 50.');
const root=resolve('lib/room-visualiser');
const manifest=JSON.parse(await readFile(join(root,'assets.json'),'utf8'));
const known=new Set(manifest.fabrics.map(f=>f.fabricId));
const staged=[];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
for(const row of batch){
  if(!/^(pt|sdg)-[a-z0-9-]+$/i.test(row.fabric_id)||known.has(row.fabric_id))throw Error(`Duplicate/invalid fabric: ${row.fabric_id}`);
  if(/PARK WEST|LYRA|Paper Straw Stripe/i.test(row.design)||/HALF|OFFSET|STAGGER|BRICK/i.test(row.pattern_match_type||row.retailMatch||''))throw Error(`Held geometry: ${row.design}`);
  if(row.retailFound!==true||row.retailHRepeatCm!==row.h_repeat_cm||row.retailVRepeatCm!==row.v_repeat_cm)throw Error(`Live catalogue repeat mismatch: ${row.fabric_id}`);
  if(!Number.isFinite(row.h_repeat_cm)||row.h_repeat_cm<=0||!Number.isFinite(row.v_repeat_cm)||row.v_repeat_cm<=0)throw Error(`Invalid repeat: ${row.fabric_id}`);
  // This source set was an automated scale proposal, not customer eligibility.
  // The release gate requires a strong multi-anchor vertical consensus and
  // exact live manufacturer metadata. Weak H evidence needs a stricter V gate;
  // contradictory H evidence is never accepted.
  const corroborated=row.horizontal_crosscheck==='CORROBORATES'&&row.anchor_consensus>=.95&&row.matched_vertical_anchors>=100;
  const verticalFirst=row.horizontal_crosscheck==='INCONCLUSIVE'&&row.anchor_consensus>=.98&&row.matched_vertical_anchors>=120;
  if(row.registration_confidence!=='AUTOMATED_VERTICAL_FIRST_PROPOSAL'||(!corroborated&&!verticalFirst))throw Error(`Insufficient scale evidence: ${row.fabric_id}`);
  if(!Number.isFinite(row.pixels_per_cm)||row.pixels_per_cm<=0||!Number.isFinite(row.detected_v_repeat_px)||Math.abs(row.detected_v_repeat_px-row.v_repeat_cm*row.pixels_per_cm)>.05)throw Error(`Physical vertical repeat mismatch: ${row.fabric_id}`);
  const original=await readFile(resolve(row.master));
  if(hash(original)!==row.master_sha256)throw Error(`Frozen master hash changed: ${row.fabric_id}`);
  const meta=await sharp(original).metadata();
  if(meta.width<2048||meta.height<1113)throw Error(`Master too small: ${row.fabric_id}`);
  if(Math.abs(meta.width-row.pixels_per_cm*460)>.51||Math.abs(meta.height-row.pixels_per_cm*250)>.51)throw Error(`Physical master coverage mismatch: ${row.fabric_id}`);
  const bytes=await sharp(original).resize(2048,1113,{fit:'fill',kernel:'lanczos3'}).webp({quality:92,effort:5}).toBuffer();
  const derivative=await sharp(bytes).metadata();
  if(derivative.width!==2048||derivative.height!==1113||derivative.format!=='webp')throw Error(`Bad derivative: ${row.fabric_id}`);
  const sha256=hash(bytes),image=`textures/${sha256}.webp`;
  staged.push({bytes,image,entry:{id:row.fabric_id,fabricId:row.fabric_id,mode:'patterned',hRepeat:row.h_repeat_cm,vRepeat:row.v_repeat_cm,image,sha256,encodedBytes:bytes.length,pixelSize:[2048,1113],physicalClothCm:[460,250],sourceMasterSha256:row.master_sha256,calibration:{kind:'multiple-repeats',repeatsH:460/row.h_repeat_cm,repeatsV:250/row.v_repeat_cm,sourcePixelsPerCm:row.pixels_per_cm,detectedVRepeatPx:row.detected_v_repeat_px,anchorConsensus:row.anchor_consensus,matchedAnchors:row.matched_vertical_anchors,horizontalCrosscheck:row.horizontal_crosscheck}}});
  known.add(row.fabric_id);
}
await mkdir(join(root,'runtime/textures'),{recursive:true});
for(const {bytes,image} of staged)await writeFile(join(root,'runtime',image),bytes);
manifest.fabrics.push(...staged.map(s=>s.entry));
await writeFile(join(root,'assets.json'),JSON.stringify(manifest,null,2)+'\n');
const fabrics=`export const FABRICS = ${JSON.stringify(manifest.fabrics)};\nfor(const fabric of FABRICS){fabric.image=new URL(fabric.image,import.meta.url).href;fabric.name=fabric.id;}\n`;
await writeFile(join(root,'runtime/fabrics.mjs'),fabrics);
const contractFile=join(root,'runtime/rooms/catalogue-contract.mjs');
const contract=await readFile(contractFile,'utf8');
const links=Object.fromEntries(manifest.fabrics.map(f=>[f.fabricId,f.id]));
const line=`export const CALIBRATION_LINKS=Object.freeze(${JSON.stringify(links)});`;
const updated=contract.replace(/^export const CALIBRATION_LINKS=.*;$/m,line);
if(updated===contract)throw Error('Catalogue link update failed.');
await writeFile(contractFile,updated);
console.log(JSON.stringify({added:staged.length,manifestTotal:manifest.fabrics.length,encodedBytes:staged.reduce((n,s)=>n+s.bytes.length,0),ids:staged.map(s=>s.entry.fabricId)},null,2));
