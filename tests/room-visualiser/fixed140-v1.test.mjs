import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {FIXED140,RENDERER_PROFILE,buildFixed140Mesh,imageUV,meshMetrics,sourcePlan} from '../../lib/room-visualiser/runtime/fixed140-v1/fixed140_single_width_v1.mjs';
import {cameraForFixed140View} from '../../lib/room-visualiser/runtime/fixed140-v1/views.mjs';
import {buildWaveMesh} from '../../lib/room-visualiser/runtime/core.mjs';

const root=new URL('../../',import.meta.url);
const fixture=JSON.parse(await readFile(new URL('tests/room-visualiser/fixtures/fixed140-single-width-v1.json',root)));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const binary=array=>Buffer.from(array.buffer,array.byteOffset,array.byteLength);

test('frozen experimental core and visual comparison are unchanged',async()=>{
  const core=await readFile(new URL('lib/room-visualiser/runtime/fixed140-v1/fixed140_wave_core.mjs',root));
  assert.equal(sha(Buffer.from(core.toString('utf8').replace(/\r\n/g,'\n'))),fixture.frozenCoreSha256);
  assert.equal(sha(await readFile(new URL(fixture.baseline.file,root))),fixture.baseline.sha256);
  assert.equal(RENDERER_PROFILE,'FIXED140_SINGLE_WIDTH_V1');
  assert.deepEqual(FIXED140,{finishedPairWidthCm:140,finishedPanelWidthCm:70,dropCm:120,panels:2,wavesPerPanel:5,columns:220,rows:24});
});

test('all six approved widths retain source scale, centred crop, topology and arc length',()=>{
  let indexHash;
  for(const row of fixture.cases){
    const mesh=buildFixed140Mesh(row.widthCm);
    const [width,height]=row.sourceDimensionsPx;
    const uv=imageUV(mesh,width,height);
    assert.deepEqual(sourcePlan(width,height,row.widthCm),row.sourcePlan);
    assert.deepEqual(meshMetrics(mesh),row.metrics);
    assert.deepEqual({position:sha(binary(mesh.position)),materialCm:sha(binary(mesh.materialCm)),indices:sha(binary(mesh.indices)),uv:sha(binary(uv))},row.hashes);
    indexHash??=row.hashes.indices;
    assert.equal(row.hashes.indices,indexHash);
    assert.equal(meshMetrics(mesh).wavePitchCm,14);
    assert.equal(mesh.flatPanelWidthCm,Math.min(row.widthCm,140));
  }
});

test('bad V1 source dimensions cannot silently stretch or extend',()=>{
  const mesh=buildFixed140Mesh(135);
  assert.throws(()=>imageUV(mesh,1350,1100),/Insufficient source height/);
  for(const width of [0,-1,69,201,NaN])assert.throws(()=>buildFixed140Mesh(width),/Unsupported physical fabric width/);
});

test('all V1 views use camera composition only, and STANDARD core remains 460 by 250',async()=>{
  const source=await readFile(new URL('lib/room-visualiser/runtime/fixed140-v1/entry.mjs',root),'utf8');
  const frame=source.split('function frame(){')[1]?.split('for(const button')[0];
  assert.ok(frame);
  assert.match(frame,/applyFixed140View\(/);
  assert.doesNotMatch(frame,/createFixed140Curtain|buildFixed140Mesh|imageUV|dispose\(/);
  for(const view of ['room','curtain','full'])assert.ok(cameraForFixed140View(view,1.6).position);
  assert.throws(()=>cameraForFixed140View('other',1.6),/INVALID_FIXED140_VIEW/);
  const standard=buildWaveMesh();
  assert.equal(standard.position.length/3,22050);
  assert.equal(standard.indices.length/3,43008);
  const standardEntry=await readFile(new URL('lib/room-visualiser/runtime/rooms/customer-entry.mjs',root),'utf8');
  assert.doesNotMatch(standardEntry,/fixed140-v1/i);
  assert.match(standardEntry,/import\('\.\/viewer\.mjs'\)/);
});

test('STANDARD curtain engineering and catalogue eligibility remain byte-identical',async()=>{
  const expected={
    'lib/room-visualiser/runtime/rooms/curtain-component.mjs':'4c3eac6caa999cb085a55c9940c0d33cf5aba08bb6359df7cf0fa6a77ce453aa',
    'lib/room-visualiser/assets.json':'c685b3f40d5abe740d6e6fba94c50e4586c41ba60ef92083c30b57324ce2a740',
  };
  for(const [file,hash] of Object.entries(expected)){
    const source=await readFile(new URL(file,root),'utf8');
    assert.equal(sha(Buffer.from(source.replace(/\r\n/g,'\n'))),hash,file);
  }
});
