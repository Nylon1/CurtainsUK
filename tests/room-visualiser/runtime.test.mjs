import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {SPEC,buildWaveMesh,meshMetrics,texturePlan,textureCoordinate} from '../../lib/room-visualiser/runtime/core.mjs';
import {buildOpenMesh} from '../../lib/room-visualiser/runtime/open.mjs';
import {createTravelSolver} from '../../lib/room-visualiser/runtime/rooms/travel-poses.mjs';
import {createTravelController} from '../../lib/room-visualiser/runtime/rooms/travel-controller.mjs';
import {cameraForView} from '../../lib/room-visualiser/runtime/rooms/views.mjs';
import {previewPlan} from '../../lib/room-visualiser/runtime/rooms/catalogue-contract.mjs';
import {FABRICS} from '../../lib/room-visualiser/runtime/fabrics.mjs';
const root=new URL('../../lib/room-visualiser/',import.meta.url);
const manifest=JSON.parse(await readFile(new URL('assets.json',root)));
const closed=buildWaveMesh(),opened=buildOpenMesh(closed),solve=createTravelSolver(closed.position,opened.position);
const digest=a=>createHash('sha256').update(a).digest('hex');
const identity=()=>digest(Buffer.concat([closed.position,closed.flatPosition,closed.uv,closed.indices].map(a=>Buffer.from(a.buffer))));
test('engine, travel, fixed cameras, lighting and four GLBs match frozen source hashes',async()=>{
 const hashes=JSON.parse(await readFile(new URL('frozen-source-hashes.json',root)));
 for(const [file,hash] of Object.entries(hashes)){const bytes=await readFile(new URL('runtime/'+file,root));assert.equal(digest(file.endsWith('.mjs')?bytes.toString().replaceAll('\r\n','\n'):bytes),hash,file);}
});
test('frozen closed binary matches the approved geometry and physical dimensions',async()=>{
 assert.equal(identity(),'851ff54103f396d076cdf1179bf480e5533e1e140d965b637cc598880eca4f24');
 assert.equal(digest(await readFile(new URL('runtime/mesh.bin',root))),identity());
 assert.equal(SPEC.flatWidth,460);assert.equal(SPEC.drop,250);assert.equal(SPEC.finishedWidth,230);assert.equal(SPEC.fullness,2);
 assert.equal(closed.position.length/3,22050);assert.equal(closed.indices.length/3,43008);
 assert.deepEqual(closed.uv,opened.uv);assert.deepEqual(closed.indices,opened.indices);
});
test('intermediate motion preserves row lengths, material edges, UVs and exact endpoints',()=>{
 const before=identity();assert.deepEqual(solve(0),closed.position);assert.deepEqual(solve(1),opened.position);
 for(const p of [0,.1,.25,.5,.75,.9,1]){
  const position=solve(p),metrics=meshMetrics({...closed,position});
  for(const n of metrics.renderedRowLengthCm)assert.ok(Math.abs(n-230)<.0001);
  for(const n of metrics.renderedEdgeRangeCm)assert.ok(Math.abs(n-230/SPEC.columns)<.00001);
  assert.ok(metrics.maximumVerticalStrain<.0002);
 }
 assert.equal(identity(),before);
});
test('Bergamot repeat count and complete cloth domain are resolution independent',()=>{
 const plan=texturePlan(FABRICS.find(f=>f.id==='bergamot'));
 assert.equal(plan.horizontalPair,460/45);assert.equal(plan.horizontalPanel,230/45);assert.equal(plan.vertical,250/46.5);
 const end=textureCoordinate(460,250,plan);assert.ok(Math.abs(end[0]-1)<1e-12);assert.ok(Math.abs(end[1]-1)<1e-12);
 for(const f of FABRICS.filter(f=>f.mode==='patterned')){
  const p=texturePlan(f);assert.ok(Math.abs(p.sourceCm[0]-460)<1e-9);assert.ok(Math.abs(p.sourceCm[1]-250)<1e-9);
 }
});
test('only explicitly approved IDs and unchanged repeat metadata qualify',()=>{
 for(const f of FABRICS){const r={id:f.fabricId,horizontalRepeatMm:f.hRepeat*10,verticalRepeatMm:f.vRepeat*10};assert.equal(previewPlan(r,FABRICS).state,'ready');
  if(f.mode==='patterned'){assert.equal(previewPlan({...r,verticalRepeatMm:r.verticalRepeatMm+1},FABRICS).state,'unavailable');assert.equal(previewPlan({...r,patternMatchType:'HALF_DROP'},FABRICS).state,'unavailable');}}
 for(const id of ['pt-4270-147','lyra','park-west','paper-straw-stripe','unapproved'])assert.equal(previewPlan({id},FABRICS).state,'unavailable');
 assert.equal(previewPlan({id:'sdg-f1239-30'},FABRICS).state,'ready');
});
test('invalid repeats fail safely and plain mode has no invented repeat requirement',()=>{
 const f=FABRICS[0];for(const n of [0,-1,NaN])assert.equal(texturePlan({...f,vRepeat:n}).state,'fallback');
 assert.equal(texturePlan({...f,hRepeat:null}).reason,'MISSING_REPEAT_METADATA');assert.equal(texturePlan({mode:'plain'}).state,'plain');
});
test('runtime derivatives match approved bytes and all patterned assets are 2048 x 1113',async()=>{
 for(const f of manifest.fabrics){const bytes=await readFile(new URL('runtime/'+f.image,root));assert.equal(digest(bytes),f.sha256);assert.equal(bytes.length,f.encodedBytes);
  if(f.mode==='patterned'){const m=await sharp(bytes).metadata();assert.equal(m.width,2048);assert.equal(m.height,1113);assert.equal(m.format,'webp');}}
});
test('expanded designs preserve the measured physical repeat and live identity contract',()=>{
 const ids=new Set(),names=new Set();
 for(const f of manifest.fabrics){
  assert.ok(!ids.has(f.fabricId));ids.add(f.fabricId);
  assert.ok(!names.has(f.id));names.add(f.id);
  if(!f.sourceMasterSha256)continue;
  assert.equal(f.mode,'patterned');assert.deepEqual(f.physicalClothCm,[460,250]);
  assert.equal(f.calibration.repeatsH,460/f.hRepeat);
  assert.equal(f.calibration.repeatsV,250/f.vRepeat);
  assert.ok(Math.abs(f.calibration.detectedVRepeatPx-f.calibration.sourcePixelsPerCm*f.vRepeat)<.05);
  assert.ok(f.calibration.anchorConsensus>=.95&&f.calibration.matchedAnchors>=100);
  assert.ok(f.calibration.horizontalCrosscheck==='CORROBORATES'&&f.calibration.anchorConsensus>=.95||f.calibration.horizontalCrosscheck==='INCONCLUSIVE'&&f.calibration.anchorConsensus>=.98&&f.calibration.matchedAnchors>=120);
  const record={id:f.fabricId,horizontalRepeatMm:f.hRepeat*10,verticalRepeatMm:f.vRepeat*10};
  assert.equal(previewPlan(record,FABRICS).engineId,f.id);
  assert.equal(previewPlan({...record,verticalRepeatMm:record.verticalRepeatMm+1},FABRICS).state,'unavailable');
 }
 for(const id of ['park-west','lyra','paper-straw-stripe'])assert.equal(previewPlan({id},FABRICS).state,'unavailable');
});
test('fixed views are independent of geometry and exclude microscope controls',()=>{
 const before=identity();for(const room of ['living','bedroom','lounge','office']){assert.ok(cameraForView(room,'room'));assert.equal(cameraForView(room,'curtain').fov,36);assert.throws(()=>cameraForView(room,'detail'));}assert.equal(identity(),before);
});
test('source and deployed assets match, with no masters or jigsaw builder in runtime',async()=>{
 const build=JSON.parse(await readFile(new URL('build.json',root)));
 for(const file of ['core.mjs','open.mjs','motion.mjs','rooms/views.mjs','rooms/travel-poses.mjs','mesh.bin','open.bin'])assert.deepEqual(await readFile(new URL('runtime/'+file,root)),await readFile(new URL('../../public'+build.assetBase+file,root)));
 const runtime=await readFile(new URL('runtime/rooms/curtain-component.mjs',root),'utf8');assert.match(runtime,/previous\?\.dispose\(\)/);assert.match(runtime,/request!==serial.*texture.dispose/);
 const viewer=await readFile(new URL('runtime/rooms/viewer.mjs',root),'utf8');assert.doesNotMatch(viewer,/kind:'fabric'|T.Cache.enabled=true/);
});
