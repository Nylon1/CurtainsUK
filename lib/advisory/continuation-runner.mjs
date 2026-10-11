import {createHash} from 'node:crypto';
import {prepareContinuationBatch,verifyContinuationResult} from './continuation-plan.mjs';
import {validatePopulationApproval} from './index-population.mjs';
import {checkPopulationResources,RESOURCE_LIMITS} from './population-resources.mjs';
import {fail} from './contracts.mjs';
import {validateSourceManifest} from './source-manifest.mjs';

// Operator port only. No credentials, network implementation, cron, model tool
// or customer endpoint. The caller supplies reviewed read/submit capabilities.
// journal.exclusive must hold one durable process lock for this entire run;
// prepared() must flush the exact plan BEFORE a submission can start.
export async function runContinuationTranche({manifest,approval,bundleHash,implementationSha256,journal,readCheckpoint,readBatch,readBack,measure,submit,wait,now=()=>Date.now()}){
  const admit=()=>{
    validatePopulationApproval(approval,{bundleHash,now:now()});
    if(!/^[a-f0-9]{64}$/.test(implementationSha256??'')||approval.implementationSha256!==implementationSha256)fail('INDEX_IMPLEMENTATION_MISMATCH',403);
    const scope=approval.continuation;
    if(!scope||!Number.isInteger(scope.startOffset)||scope.startOffset<6||scope.startOffset%6||scope.endOffset!==Math.min(manifest.identity_count,scope.startOffset+6*approval.maxBatches))fail('CONTINUATION_SCOPE_REQUIRED',403);
  };
  admit();
  return journal.exclusive(async()=>{
    const receipts=[];
    const measured=async()=>{
      const sample=await measure();checkPopulationResources(sample,now());
      // A freshly opened dashboard with an hourly average is not fresh load
      // telemetry. Do not label that historical window as a current clearance.
      if(!Number.isFinite(sample.windowMs)||sample.windowMs<=0||sample.windowMs>60000)fail('CURRENT_RESOURCE_WINDOW_REQUIRED',503);
      return sample;
    };
    // Process loss or a lost COMMIT response is resolved by exact read-back.
    // A missing/mismatched receipt STOPS; the runner never blindly resubmits.
    const pending=await journal.pending();
    if(pending){
      if(pending.jobId!==approval.jobId||pending.bundleHash!==bundleHash||pending.approval.implementationSha256!==implementationSha256||pending.approval.continuation.startOffset!==approval.continuation?.startOffset||pending.approval.continuation.endOffset!==approval.continuation?.endOffset||createHash('sha256').update(pending.sql).digest('hex')!==pending.sqlSha256)fail('INDEX_JOURNAL_REQUIRES_REVIEW',409);
      const receipt=verifyContinuationResult(pending,await readBack(pending));
      await journal.verified(pending,receipt);receipts.push({...receipt,recovered:true});
      await wait(5000);
    }
    for(let n=0;n<approval.maxBatches;n++){
      admit();
      const checkpoint=await readCheckpoint();
      const offset=checkpoint?.job?.cursor?.offset;
      if(offset===approval.continuation.endOffset){
        const s=validateSourceManifest(manifest),j=checkpoint.job,age=now()-Date.parse(checkpoint.observed_at),complete=offset===s.count;
        if(checkpoint.projectRef!==manifest.projectRef||!Number.isFinite(age)||age<0||age>60000||j.id!==approval.jobId||j.source_snapshot!==s.snapshot||j.expected_count!==s.count||j.cursor.manifestHash!==s.hash||j.processed!==offset||j.indexed!==offset||j.batches!==approval.continuation.startingBatches+Math.ceil((offset-approval.continuation.startOffset)/6)||j.failures!==0||j.complete!==complete||j.status!==(complete?'exhausted':'ready'))fail('CONTINUATION_CHECKPOINT_CHANGED',409);
        return {receipts,stopped:true,reason:'approved-tranche-complete',offset};
      }
      const resources=await measured();
      const started=now();
      const input=await readBatch({checkpoint,manifest});
      const plan=prepareContinuationBatch({...input,manifest,checkpoint,resources,approval,bundleHash,now:now()});
      await journal.prepared(plan);
      // No retry even on a transport exception. The pending plan remains on
      // disk, and a later invocation must verify whether it actually committed.
      await submit(plan.sql);
      const receipt=verifyContinuationResult(plan,await readBack(plan));
      await journal.verified(plan,receipt);receipts.push(receipt);
      if(now()-started>=RESOURCE_LIMITS.batchMs)fail('INDEX_BATCH_LATENCY_STOP',503);
      await measured();
      if(receipt.processed===approval.continuation.endOffset)return {receipts,stopped:true,reason:'approved-tranche-complete',offset:receipt.processed};
      await wait(5000);
    }
    return {receipts,stopped:true,reason:'invocation-cap'};
  });
}
