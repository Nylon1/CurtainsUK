import {createHash} from 'node:crypto';
import {prepareEligibleBatch,verifyEligibleResult,validateEligibleApproval,checkEligibleCheckpoint,checkCanary} from './eligible-plan.mjs';
import {checkEligiblePrerequisites} from './eligible-admission.mjs';
import {checkPopulationResources,RESOURCE_LIMITS} from './population-resources.mjs';
import {fail} from './contracts.mjs';
import {hostWindowLimit} from './host-window-policy.mjs';

// Ports belong to a trusted operator. There is deliberately no customer/model
// endpoint, credential discovery, schedule, migration or retry loop here.
export async function runEligibleInvocation(options) {
 const {manifest,approval,bundleHash,implementationSha256,historical,journal,readCheckpoint,readBatch,readBack,measure,readPrerequisites,readCanary,submit,wait,now=()=>Date.now(),onProgress=async()=>{},beforeAdmission=async()=>{}}=options;
 const admit=()=>{
  if(!/^[a-f0-9]{64}$/.test(implementationSha256??'')||approval.implementationSha256!==implementationSha256)fail('INDEX_IMPLEMENTATION_MISMATCH',403);
  return validateEligibleApproval({manifest,approval,bundleHash,historical,now:now()});
 };
 const measured=async()=>{
  const r=await measure();checkPopulationResources(r,now());
  if(!Number.isFinite(r.windowMs)||r.windowMs<=0||r.windowMs>hostWindowLimit(approval.hostMonitoringApproval))fail('CURRENT_RESOURCE_WINDOW_REQUIRED',503);
  return r;
 };
 admit();
 return journal.exclusive(async()=>{
  const receipts=[];
  const acknowledge=async(plan,result,recovered=false)=>{
   const receipt=verifyEligibleResult(plan,result);
   await journal.verified(plan,receipt);receipts.push({...receipt,recovered});
   if(Math.floor(plan.fromOffset/1000)<Math.floor(receipt.processed/1000)||receipt.complete)await onProgress({...receipt,jobId:approval.jobId,expectedCount:manifest.identity_count});
   return receipt;
  };
  const pending=await journal.pending();
  if(pending){
   if(pending.classification!=='ELIGIBLE_PLAN_NOT_EXECUTION'||pending.jobId!==approval.jobId||pending.bundleHash!==bundleHash||pending.sourceSnapshot!==approval.sourceSnapshot||pending.approval.implementationSha256!==implementationSha256||pending.approval.eligiblePopulation.historicalSha256!==approval.eligiblePopulation.historicalSha256||createHash('sha256').update(pending.sql).digest('hex')!==pending.sqlSha256)fail('INDEX_JOURNAL_REQUIRES_REVIEW',409);
   await acknowledge(pending,await readBack(pending),true);
   await wait(5000);
  }
  while(receipts.length<approval.maxBatches){
   admit();await beforeAdmission(); // idle read-only pacing, before fresh evidence
   const summary=admit(),checkpoint=await readCheckpoint(),offset=checkEligibleCheckpoint(checkpoint,{manifest,approval,summary,now:now()});
   if(offset===summary.count)return {receipts,offset,reason:'complete'};
   const canary=await readCanary();
   if(offset===approval.eligiblePopulation.canaryEnd&&!canary)return {receipts,offset,reason:'canary-review-required'};
   if(offset>=approval.eligiblePopulation.canaryEnd)checkCanary(canary,{approval,summary});
   const prerequisites=await readPrerequisites();checkEligiblePrerequisites(prerequisites,historical,now());
   const resources=await measured(),started=now();
   const input=await readBatch({checkpoint,manifest});
   const plan=prepareEligibleBatch({...input,manifest,checkpoint,resources,prerequisites,historical,canary,approval,bundleHash,now:now()});
   await journal.prepared(plan); // fsync before the only submission attempt
   await submit(plan.sql);
   const receipt=await acknowledge(plan,await readBack(plan));
   if(now()-started>=RESOURCE_LIMITS.batchMs)fail('INDEX_BATCH_LATENCY_STOP',503);
   await measured();
   if(receipt.complete)return {receipts,offset:receipt.processed,reason:'complete'};
   if(receipt.processed===approval.eligiblePopulation.canaryEnd)return {receipts,offset:receipt.processed,reason:'canary-review-required'};
   if(receipts.length<approval.maxBatches)await wait(5000);
  }
  return {receipts,offset:receipts.at(-1)?.processed,reason:'invocation-cap'};
 });
}

// One owner-approved initial population, split into bounded invocations. A
// safety exception escapes immediately. Restart requires operator review; this
// function never retries failed/ambiguous writes or increases throughput.
export async function runEligiblePopulation(options) {
 const results=[],maximumInvocations=Math.ceil(options.manifest.identity_count/(6*options.approval.maxBatches))+2;
 for(let n=0;n<maximumInvocations;n++){
  const result=await runEligibleInvocation(options);results.push(result);
  if(result.reason==='complete')return {complete:true,results};
  if(result.reason==='canary-review-required'){
   const summary=validateEligibleApproval({...options,now:options.now?.()??Date.now()});
   const receipt=await options.assessCanary({jobId:options.approval.jobId,sourceSnapshot:summary.snapshot,processed:options.approval.eligiblePopulation.canaryEnd});
   checkCanary(receipt,{approval:options.approval,summary});
   await options.recordCanary(receipt); // durable read-back required next invocation
  }
  await options.wait(5000);
 }
 fail('INDEX_INVOCATION_BUDGET_EXHAUSTED',503);
}
