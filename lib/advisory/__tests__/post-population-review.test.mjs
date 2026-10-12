import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewPopulatedRetrieval} from '../post-population-review.mjs';
import {REQUIRED_UPDATE_COVERAGE} from '../knowledge-update-source.mjs';
import {safeKnowledge} from '../catalogue.mjs';
const at=Date.now(),start=new Date(at-3600000).toISOString(),end=new Date(at).toISOString();
const ready=()=>({now:()=>at,coverage:{observedAt:end,complete:true,expected:11517,processed:11517,verified:11517,duplicateIds:0,unresolvedWrites:0},population:{populationStartedAt:start,populationCompletedAt:end},reconciliation:{projectRef:'hqysjumypgeapgmqkcrx',evidenceSha256:'a'.repeat(64),complete:true,projectionsReady:true,pendingChanges:0,unresolved:0,from:start,through:end,observedAt:end,coverage:Object.fromEntries(REQUIRED_UPDATE_COVERAGE.map(k=>[k,true]))}});
test('recommendation checks cannot run against a partial or unreconciled population',async()=>{
 let calls=0;const catalogue={descriptive:async()=>{calls++;}};
 const a=ready();a.coverage.processed=6642;
 await assert.rejects(reviewPopulatedRetrieval({...a,catalogue}),/POPULATION_REVIEW_NOT_READY/);
 const b=ready();b.reconciliation.coverage.description=false;
 await assert.rejects(reviewPopulatedRetrieval({...b,catalogue}),/UPDATE_CATCHUP_INCOMPLETE/);assert.equal(calls,0);
});
test('post-population retrieval is bounded, paced and explicitly waits for human design review',async()=>{
 const waits=[],calls=[];const catalogue={descriptive:async args=>{calls.push(args);return {fabrics:[safeKnowledge({fabric_id:'fixture-ivory',colour_name:'ivory'},null,null)]};}};
 const r=await reviewPopulatedRetrieval({...ready(),catalogue,wait:async ms=>waits.push(ms)});
 assert.equal(calls.length,6);assert.deepEqual(waits,[5000,5000,5000,5000,5000]);assert.equal(r.paidCalls,0);assert.equal(r.launchApproved,false);assert.equal(r.realModelEvaluation.scenarios,20);assert.ok(r.results.every(x=>x.status==='HUMAN_RELEVANCE_REVIEW_REQUIRED'));
});
test('failed knowledge lookup is evidence of failure and prevents further reads',async()=>{
 let count=0;const r=await reviewPopulatedRetrieval({...ready(),catalogue:{descriptive:async()=>{count++;throw Error('unavailable');}},wait:async()=>{}});
 assert.equal(count,1);assert.equal(r.results[0].status,'LOOKUP_FAILED');assert.equal(r.launchApproved,false);
});
