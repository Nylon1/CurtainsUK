import test from 'node:test';
import assert from 'node:assert/strict';
import {SIZE,SPEC,foldPlan,foldPoint,visibleDrop,sourceUv,phaseForLift,coverage,clothRelief} from './geometry.mjs';
test('published standard odd-section method includes the bottom half-fold',()=>{
 const p=foldPlan('stacked');assert.equal(p.rodCount,3);assert.equal(p.halfSections,7);
 assert.ok(Math.abs(p.depth-.19)<1e-12);assert.ok(Math.abs(p.bottomHalf-.19)<1e-12);
 for(const [i,expected] of [.45,.83,1.21].entries())assert.ok(Math.abs(p.rodPositions[i]-expected)<1e-12);
 assert.ok(Math.abs(coverage(1).coveredCm-26)<1e-10);
});
test('cascade uses growing fold depths and agrees with rounded independent workroom output',()=>{
 const p=foldPlan('cascade');assert.equal(p.rodCount,3);
 // Sew Helpful calculator: 140 drop, 7 allowance, 2 step, 2 bottom flap, 2 cascade sections.
 // It rounds the top fold to 16.4 and compensates in the headrail (7.2). We retain exact 7.
 assert.ok(Math.abs(p.depth*100-16.4)<.05);
 const fromBottom=p.rodPositions.map(y=>(SIZE-y)*100).reverse();
 [22.4,63.2,100].forEach((value,i)=>assert.ok(Math.abs(fromBottom[i]-value)<.2));
 assert.ok(Math.abs(coverage(1,'cascade').coveredCm-29.42857142857)<1e-8);
 for(let i=1;i<p.sections.length;i++)assert.ok(Math.abs(p.sections[i].foldDepth-p.sections[i-1].foldDepth-.02)<1e-12);
});
test('plans preserve finished cloth length and choose rod count from the actual drop',()=>{
 for(const style of ['stacked','cascade'])for(const drop of [1,1.4,1.8,2.3]){
  const p=foldPlan(style,drop);assert.ok(p.depth>=SPEC.minDepth&&p.depth<=SPEC.maxDepth);
  assert.ok(Math.abs(p.sections.reduce((sum,s)=>sum+s.length,p.headrail+p.bottomHalf)-drop)<1e-12);
  assert.equal(p.halfSections,2*p.rodCount+1);
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

test('rod-pocket relief follows calculated positions without changing UV or coverage',()=>{
 for(const style of ['stacked','cascade']){
  const p=foldPlan(style);
  for(const rod of p.rodPositions){assert.ok(clothRelief(rod,style).shade<clothRelief(rod-.02,style).shade);}
  for(let i=0;i<=700;i++){const r=clothRelief(SIZE*i/700,style);assert.ok(Number.isFinite(r.depth));assert.ok(Math.abs(r.depth)<.012);assert.ok(r.shade>.8&&r.shade<1.1);}
 }
 assert.throws(()=>foldPlan('cascade',2.2),/No fold plan/);
});
