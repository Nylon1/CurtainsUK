import test from 'node:test';
import assert from 'node:assert/strict';
import {measurementPlan,validMeasurement,finishedPlan} from './measure-plan.mjs';
test('recess record takes the smallest measurements without a fitting deduction',()=>{
 assert.deepEqual(measurementPlan('inside',{top:'140.2',middle:'140',bottom:'139.8',leftDrop:'140.3',centreDrop:'140.2',rightDrop:'140.4'}),{width:139.8,drop:140.2,complete:true,missing:[]});
});
test('outside adds only entered overlaps and does not add a headrail allowance to the drop',()=>{
 assert.deepEqual(measurementPlan('outside',{opening:'140.2',leftOverlap:'5.1',rightOverlap:'4.3',finishedDrop:'160'}),{width:149.6,drop:160,complete:true,missing:[]});
});
test('missing measurements are not silently treated as zero',()=>{
 const plan=measurementPlan('outside',{opening:'140',leftOverlap:'',rightOverlap:'5',finishedDrop:'160'});
 assert.equal(plan.width,null);assert.equal(plan.drop,160);assert.equal(plan.complete,false);
 assert.equal(measurementPlan('inside',{}).width,null);
});
test('rejects negative, nonfinite and sub-millimetre measurements while allowing deliberate zero overlap',()=>{
 for(const value of ['','-1','Infinity','NaN','140.22','1001',null,undefined])assert.equal(validMeasurement(value),false);
 assert.equal(validMeasurement('0'),false);assert.equal(validMeasurement('0',true),true);
 assert.equal(validMeasurement('140.2'),true);
 assert.equal(measurementPlan('outside',{opening:'140',leftOverlap:'0',rightOverlap:'0',finishedDrop:'150'}).width,140);
});

const recess={top:'140.2',middle:'140',bottom:'139.8',leftDrop:'140.3',centreDrop:'140.2',rightDrop:'140.4'};
test('approved fit choices deduct 5 or 10 mm total once, leaving the drop unchanged',()=>{
 assert.deepEqual(finishedPlan('inside',recess,'tight'),{width:139.3,drop:140.2,deductionMm:5,complete:true,invalidWidth:false});
 assert.deepEqual(finishedPlan('inside',recess,'loose'),{width:138.8,drop:140.2,deductionMm:10,complete:true,invalidWidth:false});
 assert.equal(finishedPlan('inside',recess,'tight').width,139.3);
 assert.equal(recess.bottom,'139.8');
});
test('no order width is shown before choosing a valid clearance',()=>{
 for(const choice of ['', 'invalid', 'toString']) {
  const plan=finishedPlan('inside',recess,choice);
  assert.equal(plan.width,null);assert.equal(plan.deductionMm,null);assert.equal(plan.complete,false);
 }
 assert.equal(finishedPlan('inside',{...recess,bottom:''},'tight').width,null);
 assert.equal(finishedPlan('inside',{...recess,top:'0.5'},'loose').invalidWidth,true);
});
test('switching to outside recess never carries over a recess deduction',()=>{
 assert.deepEqual(finishedPlan('outside',{opening:'140.2',leftOverlap:'5.1',rightOverlap:'4.3',finishedDrop:'160'},'loose'),{width:149.6,drop:160,deductionMm:0,complete:true,invalidWidth:false});
});
