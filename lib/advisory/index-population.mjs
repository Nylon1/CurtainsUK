import {EXISTING_PROJECT_REF} from './hosted-test.mjs';
import {fail,UUID} from './contracts.mjs';
import {INDEX_LIMITS} from './index-worker.mjs';
import {populationDeadline} from './population-deadline.mjs';
// Pure admission check. This module does not discover credentials, connect to a
// project, create a job or infer approval from a successful local test.
export function validatePopulationApproval(a,{bundleHash,now=Date.now()}={}){
  if(a?.executionProhibited===true)fail('INDEX_SCOPE_SUPERSEDED',403);
  if(typeof a?.sourceSnapshot!=='string'||a.sourceSnapshot.length>256)fail('INDEX_POPULATION_APPROVAL_REQUIRED',403);
  if(a?.approved!==true||a.projectRef!==EXISTING_PROJECT_REF||a.schema!=='advisory'||a.purpose!=='bounded-advisory-index-only'||!a.ownerApprovalReference||!new RegExp(UUID).test(a.jobId??'')||!a.sourceAttestationReference||typeof a.sourceSnapshot!=='string'||!a.sourceSnapshot.trim()||!Number.isSafeInteger(a.expectedCount)||a.expectedCount<0||a.bundleHash!==bundleHash||!/^[a-f0-9]{64}$/.test(bundleHash??'')||!Number.isInteger(a.maxBatches)||a.maxBatches<1||a.maxBatches>INDEX_LIMITS.maxInvocationBatches)fail('INDEX_POPULATION_APPROVAL_REQUIRED',403);
  populationDeadline(a,now);
  return a;
}
export function populationPlan(expectedCount){
  if(!Number.isSafeInteger(expectedCount)||expectedCount<0)fail('EXACT_SOURCE_COUNT_REQUIRED');
  const batches=Math.ceil(expectedCount/6)+1; // includes a possible empty EOF page
  return {projectRef:EXISTING_PROJECT_REF,schema:'advisory',approved:false,expectedCount,batchSize:6,
    maximumBatches:batches,maximumSourceRequests:batches*4,maximumResponseBytes:batches*1000000,
    minimumPacingSeconds:batches*5,maximumBatchesPerInvocation:20,maximumIdentitiesPerInvocation:120,
    note:'Upper bounds for one successful traversal, excluding controlled retries and source reconciliation. Not an I/O benchmark or approval.'};
}
// Invoke again with the same job to resume its durable checkpoint. The shared
// worker gate enforces pacing even if another application instance starts.
export async function runPopulationSlice({approval,bundleHash,worker,wait,now=()=>Date.now()}){
  validatePopulationApproval(approval,{bundleHash,now:now()});const receipts=[];
  for(let i=0;i<approval.maxBatches;i++){
    validatePopulationApproval(approval,{bundleHash,now:now()});
    const result=await worker.step(approval.jobId,{sourceSnapshot:approval.sourceSnapshot,expectedCount:approval.expectedCount});receipts.push(result);
    if(result.sourceExhausted||result.complete||i===approval.maxBatches-1)break;
    await wait(INDEX_LIMITS.intervalMs);
  }
  return {jobId:approval.jobId,receipts,stopped:true};
}
