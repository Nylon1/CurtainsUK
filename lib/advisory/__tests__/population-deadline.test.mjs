import test from 'node:test';
import assert from 'node:assert/strict';
import {UNTIL_COMPLETE_APPROVAL,populationDeadline} from '../population-deadline.mjs';
import {validatePopulationApproval} from '../index-population.mjs';
import {runWithReadOnlyRecovery} from '../operator-recovery.mjs';
const now=Date.parse('2026-10-12T12:00:00Z'),bundleHash='a'.repeat(64);
const approved=()=>({...UNTIL_COMPLETE_APPROVAL,approved:true,schema:'advisory',purpose:'bounded-advisory-index-only',ownerApprovalReference:'Direct owner instruction recorded on PR',sourceAttestationReference:'Fresh operator source attestation',bundleHash,maxBatches:20,expiresAt:null,completionApproval:{...UNTIL_COMPLETE_APPROVAL}});

test('ordinary approvals retain finite, future, at-most-24-hour expiry',()=>{
 for(const expiresAt of [null,undefined,Infinity,'invalid',new Date(now).toISOString(),new Date(now+86400001).toISOString()])assert.throws(()=>populationDeadline({expiresAt},now));
 assert.equal(populationDeadline({expiresAt:new Date(now+86400000).toISOString()},now),now+86400000);
});
test('no-deadline approval is bound to this project, existing job, source, count and direct owner record',()=>{
 const a=approved();assert.equal(populationDeadline(a,now),Infinity);assert.equal(populationDeadline(a,now+30*86400000),Infinity);
 for(const field of ['projectRef','jobId','sourceSnapshot','expectedCount'])assert.throws(()=>populationDeadline({...a,[field]:'different'},now));
 for(const field of Object.keys(UNTIL_COMPLETE_APPROVAL))assert.throws(()=>populationDeadline({...a,completionApproval:{...a.completionApproval,[field]:'different'}},now));
 assert.throws(()=>populationDeadline({...a,completionApproval:{...a.completionApproval,ignoreResources:true}},now));
 assert.throws(()=>populationDeadline({...a,expiresAt:new Date(now+10000).toISOString()},now));
});
test('until-complete keeps required approval, schema, purpose, bundle and invocation bounds',()=>{
 const a=approved();assert.equal(validatePopulationApproval(a,{bundleHash,now}),a);
 for(const patch of [{approved:false},{schema:'public'},{purpose:'other'},{maxBatches:21},{maxBatches:0},{bundleHash:'b'.repeat(64)},{sourceAttestationReference:''},{executionProhibited:true}])assert.throws(()=>validatePopulationApproval({...a,...patch},{bundleHash,now}));
});
test('unscoped infinite recovery deadline cannot run or reconcile anything',async()=>{
 let touched=false;await assert.rejects(runWithReadOnlyRecovery({deadline:Infinity,run:async()=>{touched=true;},reconcile:async()=>{touched=true;},wait:async()=>{}}),/DEADLINE_REQUIRED/);assert.equal(touched,false);
});
test('authorised recovery can cross the old cutoff while reconciling and respecting retry pacing',async()=>{
 let time=Date.parse('2026-10-12T09:59:59Z'),calls=0;const sequence=[];
 const result=await runWithReadOnlyRecovery({deadline:Infinity,operationApproval:approved(),now:()=>time,run:async()=>{sequence.push('admit');if(++calls===1)throw Error('INDEX_RESOURCE_STOP');return 'completed';},reconcile:async()=>sequence.push('exact-readback'),wait:async ms=>{assert.ok(ms<=15000);time+=ms;sequence.push('wait');}});
 assert.equal(result,'completed');assert.deepEqual(sequence,['admit','exact-readback','wait','admit']);assert.ok(time>Date.parse('2026-10-12T10:00:00Z'));
});
test('until-complete never recovers permission, ambiguous commit, or failed reconciliation',async()=>{
 for(const code of ['CONNECTOR_ERROR','INDEX_COMMIT_OUTCOME_REQUIRES_REVIEW','INDEX_BATCH_LATENCY_STOP']){let calls=0;await assert.rejects(runWithReadOnlyRecovery({deadline:Infinity,operationApproval:approved(),run:async()=>{calls++;throw Error(code);},reconcile:async()=>assert.fail(),wait:async()=>assert.fail()}),new RegExp(code));assert.equal(calls,1);}
 let calls=0;await assert.rejects(runWithReadOnlyRecovery({deadline:Infinity,operationApproval:approved(),run:async()=>{calls++;throw Error('INDEX_RESOURCE_STOP');},reconcile:async()=>{throw Error('PENDING_WRITE');},wait:async()=>assert.fail()}),/PENDING_WRITE/);assert.equal(calls,1);
});
