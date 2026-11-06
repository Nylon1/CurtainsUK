import test from 'node:test';
import assert from 'node:assert/strict';
import {SIZE,SPEC,foldPlan,foldPoint,visibleDrop,sourceUv,phaseForLift,coverage} from './geometry.mjs';
test('workroom inputs preserve cloth length and meet the target fold depth',()=>{
 for(const style of ['stacked','cascade']){
  const plan=foldPlan(style);assert.equal(plan.count,4);assert.equal(plan.headrail,.07);
  assert.ok(plan.depth>=SPEC.minDepth&&plan.depth<=SPEC.maxDepth);
  assert.ok(Math.abs(plan.sections.reduce((sum,s)=>sum+s.length,plan.headrail)-SIZE)<1e-12);
  assert.equal(plan.increment,style==='cascade'?.02:0);
  assert.ok(Math.abs(coverage(1,style).coveredCm-(plan.headrail+plan.depth+plan.increment*3)*100)<1e-9);
 }
});
test('full-width square keeps the same physical scale in both directions',()=>{
 const a=sourceUv(.2,.3,1.42),b=sourceUv(.3,.4,1.42);
 assert.ok(Math.abs((b[0]-a[0])+(b[1]-a[1]))<1e-12);
 assert.throws(()=>sourceUv(0,0,1.37));
 for(const s of [0,.7,1.4])for(const x of [0,.7,1.4])for(const uv of sourceUv(x,s,1.42))assert.ok(uv>=0&&uv<=1);
});
test('both styles lower fully and raise monotonically without leaving the window',()=>{
 for(const style of ['stacked','cascade']){
  let last=SIZE;
  for(let p=0;p<=1.00001;p+=.025){
   const level=Math.min(1,p),phase=phaseForLift(level,style);let actual=0;
   for(let row=0;row<=700;row++){
    const point=foldPoint(row/700*SIZE,level,phase,style);
    assert.ok(Number.isFinite(point.down)&&Number.isFinite(point.depth));
    assert.ok(point.down>-.001&&point.down<=SIZE+.001);actual=Math.max(actual,point.down);
   }
   assert.ok(actual<=last+.001);last=actual;
   assert.ok(Math.abs(actual-visibleDrop(level,style))<.003);
   const c=coverage(level,style);assert.ok(Math.abs(c.coveredCm+c.clearCm-140)<1e-9);
  }
 }
});
test('halfway means half the available travel and cascade covers more at the top',()=>{
 for(const style of ['stacked','cascade'])assert.ok(Math.abs(visibleDrop(.5,style)-(visibleDrop(0,style)+visibleDrop(1,style))/2)<1e-9);
 assert.ok(coverage(1,'cascade').coveredCm>coverage(1,'stacked').coveredCm);
});
