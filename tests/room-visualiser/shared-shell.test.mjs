import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import registry from '../../lib/room-visualiser/fixed140-assignments.json' with {type:'json'};
import {previewPlan} from '../../lib/room-visualiser/runtime/rooms/catalogue-client.mjs';

const [id,assignment]=Object.entries(registry.assignments)[0];
const record={id,roomPreview:{available:true,rendererProfile:'FIXED140_SINGLE_WIDTH_V1',assignment}};

test('the room catalogue routes only an explicit valid V1 assignment to the frozen profile',()=>{
  assert.equal(previewPlan(record).rendererProfile,'FIXED140_SINGLE_WIDTH_V1');
  assert.equal(previewPlan(record).assignment,assignment);
  assert.equal(previewPlan({...record,roomPreview:{...record.roomPreview,assignment:{...assignment,sourceHeightPx:1}}}).state,'unavailable');
  assert.equal(previewPlan({...record,roomPreview:{...record.roomPreview,assignment:{...assignment,sha256:'0'.repeat(64)}}}).state,'unavailable');
  assert.equal(previewPlan({...record,roomPreview:{...record.roomPreview,assignment:{...assignment,fabricId:'wrong'}}}).state,'unavailable');
  assert.equal(previewPlan({id:'sdg-f1541-01',horizontalRepeatMm:450,verticalRepeatMm:465}).engineId,'bergamot');
});

test('both profiles retain one shell and room catalogue; V1 loads only on its path',async()=>{
  const root=new URL('../../lib/room-visualiser/runtime/rooms/',import.meta.url);
  const [html,viewer,adapter,entry]=await Promise.all(['customer.html','viewer.mjs','fixed140-adapter.mjs','customer-entry.mjs'].map(file=>readFile(new URL(file,root),'utf8')));
  assert.match(html,/id="rooms"/);assert.match(html,/id="zones"/);assert.match(html,/id="change-fabric"/);
  assert.match(html,/data-view="full"[^>]*hidden/);
  assert.match(viewer,/createFixed140Adapter/);assert.match(viewer,/createCurtain\(renderer\)/);
  assert.match(adapter,/import\(new URL\('curtain\.mjs',base\)/);
  assert.match(adapter,/const MOUNT_Y=96/);
  assert.match(entry,/record\?previewPlan\(record\)\.engineId:null,record/);
  assert.doesNotMatch(viewer,/buildFixed140Mesh|imageUV|sourcePlan/);
});
