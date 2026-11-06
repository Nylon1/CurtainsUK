import test from 'node:test';
import assert from 'node:assert/strict';
import {romanEstimate} from './roman-price-core.mjs';
import {MTM_PRODUCTION_PRICING_RULE_SET as rules} from '../../lib/decision-engine/seed/production-pricing-rules.ts';
const input={width:140,drop:140,lining:'STANDARD',fold:'stacked'};
const fabric={usableWidthMm:1420,supplierCostPerMetre:{amountMinor:1000},patternMatchType:'RANDOM_MATCH'};
test('Roman estimate uses one flat fabric width, lining width requirement, rail, margin and VAT',()=>{
 // 1.8m fabric (£18), 3.5m lining (£14), £25 making, £24.01 rail = £81.01 direct.
 const result=romanEstimate(input,fabric,rules);
 assert.equal(result.totalMinor,15000);
 assert.equal(result.includesVat,true);
 assert.equal(result.ruleVersion,rules.version);
 assert.equal('supplierCostPerMetre' in result,false);
});
test('blackout changes the lining rate; cascade does not invent an unapproved surcharge',()=>{
 assert.equal(romanEstimate({...input,lining:'BLACKOUT'},fabric,rules).totalMinor,16200);
 assert.equal(romanEstimate({...input,fold:'cascade'},fabric,rules).totalMinor,15000);
});
test('finished width selects the next verified rail tier at the exact boundary',()=>{
 const a=romanEstimate({...input,width:140},fabric,rules),b=romanEstimate({...input,width:140.1},fabric,rules);
 assert.equal(a.totalMinor,15000);assert.equal(b.totalMinor,15400);
 assert.equal(romanEstimate({...input,width:180.1},fabric,rules).status,'review');
});
test('unsupported matching, absent supplier cost and invalid input never produce a numeric price',()=>{
 for(const f of [{...fabric,patternMatchType:'HALF_DROP_MATCH'},{...fabric,supplierCostPerMetre:null},{...fabric,usableWidthMm:0}])assert.equal(romanEstimate(input,f,rules).totalMinor,null);
 for(const change of [{width:0},{width:NaN},{width:140.01},{drop:Infinity},{lining:'FREE'},{fold:'unknown'}])assert.equal(romanEstimate({...input,...change},fabric,rules).totalMinor,null);
});
test('straight repeat rounds the cut before metre increments, without mutating shared rules',()=>{
 const before=JSON.stringify(rules);
 const result=romanEstimate(input,{...fabric,patternMatchType:'STRAIGHT_MATCH',verticalRepeatMm:600},rules);
 assert.equal(result.totalMinor,15000);
 const larger=romanEstimate({...input,drop:146},{...fabric,patternMatchType:'STRAIGHT_MATCH',verticalRepeatMm:600},rules);
 assert.ok(larger.totalMinor>result.totalMinor);assert.equal(JSON.stringify(rules),before);
});
