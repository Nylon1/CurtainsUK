import test from 'node:test';
import assert from 'node:assert/strict';
import {buildFixed140Mesh,imageUV,meshMetrics} from '../../lib/room-visualiser/runtime/fixed140-v1/fixed140_wave_core.mjs';
import {FIXED140_OPEN,buildFixed140OpenPosition,createFixed140TravelSolver} from '../../lib/room-visualiser/runtime/fixed140-v1/motion.mjs';

const columns=220,rows=24,stride=(rows+1)*(columns+1);
function rowLengths(position,width){
  let worst=0;
  for(let p=0;p<2;p++)for(let j=0;j<=rows;j++){
    let length=0;
    for(let i=1;i<=columns;i++){
      const a=3*(p*stride+j*(columns+1)+i),b=a-3;
      length+=Math.hypot(position[a]-position[b],position[a+2]-position[b+2]);
    }
    worst=Math.max(worst,Math.abs(length-width));
  }
  return worst;
}

test('five-Wave V1 stacks retain one cloth domain and exact source UVs from 1.7× through 2×',()=>{
  assert.equal(FIXED140_OPEN.stackWidthCm,28);
  for(const width of [120,135,137,140,150,160]){
    const closed=buildFixed140Mesh(width),flat=closed.flatPanelWidthCm;
    const uv=imageUV(closed,1400,1500),indices=closed.indices.slice(),closedBytes=closed.position.slice();
    const open=buildFixed140OpenPosition(closed.position,flat);
    const solve=createFixed140TravelSolver(closed.position,open,flat);
    assert.equal(open.length,closed.position.length);
    assert.deepEqual(solve(0),closed.position);
    assert.deepEqual(solve(1),open);
    let previous=1;
    for(const progress of [0,.1,.25,.5,.75,.9,1]){
      const pose=solve(progress);
      assert.ok(rowLengths(pose,flat)<.0001,`${width} cm, ${progress}: material arc length`);
      const leftLeading=pose[columns*3];
      assert.ok(leftLeading<=previous+1e-4,`${width} cm, ${progress}: leading edge advances`);
      previous=leftLeading;
      assert.ok(pose.every(Number.isFinite));
    }
    const leftOuter=open[0],leftInner=open[columns*3];
    const rightInner=open[stride*3],rightOuter=open[(stride+columns)*3];
    assert.ok(Math.abs(leftInner-leftOuter-FIXED140_OPEN.stackWidthCm)<1e-4);
    assert.ok(Math.abs(rightOuter-rightInner-FIXED140_OPEN.stackWidthCm)<1e-4);
    assert.equal(meshMetrics({...closed,position:open}).vertices,closed.position.length/3);
    assert.deepEqual(closed.position,closedBytes);
    assert.deepEqual(closed.indices,indices);
    assert.deepEqual(imageUV(closed,1400,1500),uv);
    assert.equal(closed.fullness,flat/70);
  }
});

test('intermediate delayed-hem and settling poses preserve flat row length',()=>{
  const closed=buildFixed140Mesh(140),open=buildFixed140OpenPosition(closed.position,140);
  const solve=createFixed140TravelSolver(closed.position,open,140);
  for(const [progress,hemProgress,settleDepthCm] of [[.25,.23,0],[.5,.48,0],[.75,.72,0],[1,.99,.12],[0,.01,-.1]]){
    const pose=solve(progress,undefined,{hemProgress,settleDepthCm});
    assert.ok(rowLengths(pose,140)<.0001);
    assert.ok(meshMetrics({...closed,position:pose}).maxVerticalStrain<.01);
  }
  assert.throws(()=>solve(-.01),/INVALID_FIXED140_TRAVEL_PROGRESS/);
  assert.throws(()=>solve(1.01),/INVALID_FIXED140_TRAVEL_PROGRESS/);
});
