import {test} from 'node:test';
import assert from 'node:assert/strict';
import registry from '../../lib/room-visualiser/fixed100-assignments.json' with {type:'json'};
import {buildFixed140Mesh,imageUV,sourcePlan,FIXED140} from '../../lib/room-visualiser/runtime/rooms/fixed100-core.mjs';

test('209 candidates use their recorded width and a 100 cm source crop',()=>{
  const assignments=Object.values(registry.assignments);
  assert.equal(assignments.length,209);
  assert.equal(assignments.filter(item=>item.sourceTopPx===275).length,185);
  for(const item of assignments){
    assert.match(item.sourceImage,/^https:\/\/cdn\.shopify\.com\/s\/files\/1\/0256\/4551\/4861\/files\/cuk-fabric-[a-f0-9]{64}\.jpg$/);
    assert.ok(item.sourceWidthPx>=700&&item.sourceHeightPx>=700);
    assert.ok((item.sourceHeightPx-item.sourceTopPx)*item.usableWidthCm>=item.sourceWidthPx*100);
  }
});

test('cropped source UVs skip the label without changing horizontal scale',()=>{
  assert.equal(FIXED140.dropCm,100);
  const width=138,sourceWidth=1366,sourceHeight=1366,top=275;
  const plan=sourcePlan(sourceWidth,sourceHeight,width,top);
  assert.ok(plan.dropCovered);
  assert.equal(plan.pixelsPerCmX,plan.pixelsPerCmY);
  assert.equal(plan.sourceTopPx,top);
  const mesh=buildFixed140Mesh(width),uv=imageUV(mesh,sourceWidth,sourceHeight,top);
  assert.ok(mesh.position.length>0);
  assert.ok(uv.every(Number.isFinite));
  assert.ok(Math.abs(uv[1]-(1-top/sourceHeight))<1e-6);
  assert.ok(Math.min(...uv.filter((_,i)=>i%2===1))>=0);
});
