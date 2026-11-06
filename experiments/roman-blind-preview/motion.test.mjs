import test from 'node:test';
import assert from 'node:assert/strict';
import {makeMotion,motionPosition,FULL_TRAVEL_MS} from './motion.mjs';
import {gatheringProfile,gatheringDepth,phaseForLift,SIZE} from './geometry.mjs';
test('full raise and lower take eight seconds without overshoot',()=>{
 for(const [from,to] of [[0,1],[1,0]]){
  const m=makeMotion(from,to,100);assert.equal(m.duration,8000);
  assert.equal(motionPosition(m,100),from);assert.equal(motionPosition(m,8100),to);
  assert.ok(Math.abs(motionPosition(m,4100)-.5)<1e-12);
  for(let t=0;t<=FULL_TRAVEL_MS;t+=100)assert.ok(motionPosition(m,100+t)>=0&&motionPosition(m,100+t)<=1);
  const start=Math.abs(motionPosition(m,200)-from),middle=Math.abs(motionPosition(m,4200)-motionPosition(m,4100));assert.ok(start<middle);
 }
});
test('midway and reversals use the current position without a jump',()=>{
 const up=makeMotion(0,1,0),current=motionPosition(up,3200),reverse=makeMotion(current,0,3200);
 assert.equal(motionPosition(reverse,3200),current);
 assert.equal(makeMotion(0,.5,0).duration,4000);
 assert.equal(motionPosition(reverse,3200+reverse.duration),0);
});
test('gathering creases are shallow, local and stationary at lift endpoints',()=>{
 for(const style of ['stacked','cascade']){
  let greatest=0;
  for(const lift of [0,.12,.35,.5,.8,1]){
   const phase=phaseForLift(lift,style);
   for(let i=0;i<=140;i++)for(const u of [0,.2,.45,.7,1]){
    const profile=gatheringProfile(SIZE*i/140,phase,style),d=gatheringDepth(u,profile);
    assert.ok(Number.isFinite(d)&&Math.abs(d)<.01);
    if(lift===0||lift===1)assert.ok(Math.abs(d)<1e-7);
    if(u===0||u===1)assert.ok(Math.abs(d)<1e-12);
    greatest=Math.max(greatest,d);
   }
  }
  assert.ok(greatest>.003);
 }
});
