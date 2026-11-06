import test from 'node:test';
import assert from 'node:assert/strict';
import {measurementPlan,validMeasurement} from './measure-plan.mjs';
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
