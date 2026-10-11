import {fail} from './contracts.mjs';
import {EXISTING_PROJECT_REF} from './hosted-test.mjs';
import {runPopulationSlice,validatePopulationApproval} from './index-population.mjs';

// Deliberately conservative starting ceilings. Pro storage does not imply
// unlimited compute. Telemetry is operator/server input, never customer input.
export const RESOURCE_LIMITS=Object.freeze({maxAgeMs:60000,cpuPercent:60,ioPercent:50,memoryPercent:80,diskPercent:85,connectionPercent:70,batchMs:10000});
export function checkPopulationResources(sample,now=Date.now()){
  if(sample?.projectRef!==EXISTING_PROJECT_REF||!Number.isFinite(sample.observedAt)||sample.observedAt>now||now-sample.observedAt>RESOURCE_LIMITS.maxAgeMs||sample.source!=='trusted-operator-telemetry')fail('FRESH_RESOURCE_MEASUREMENTS_REQUIRED',503);
  for(const name of ['cpuPercent','ioPercent','memoryPercent','diskPercent']){
    if(!Number.isFinite(sample[name])||sample[name]<0||sample[name]>100)fail('FRESH_RESOURCE_MEASUREMENTS_REQUIRED',503);
    if(sample[name]>=RESOURCE_LIMITS[name])fail('INDEX_RESOURCE_STOP',503);
  }
  if(!Number.isInteger(sample.connections)||sample.connections<0||!Number.isInteger(sample.maxConnections)||sample.maxConnections<1||sample.connections>sample.maxConnections)fail('FRESH_RESOURCE_MEASUREMENTS_REQUIRED',503);
  if(100*sample.connections/sample.maxConnections>=RESOURCE_LIMITS.connectionPercent)fail('INDEX_RESOURCE_STOP',503);
  for(const name of ['lockWaits','newDeadlocks','newDatabaseErrors']){
    if(!Number.isInteger(sample[name])||sample[name]<0)fail('FRESH_RESOURCE_MEASUREMENTS_REQUIRED',503);
    if(sample[name]>0)fail('INDEX_RESOURCE_STOP',503);
  }
  if(sample.supplierRefreshActive!==false)fail('INDEX_RESOURCE_STOP',503);
  return {observedAt:sample.observedAt,accepted:true};
}

// The hosted operator must use this wrapper. It never discovers credentials,
// creates a job, schedules more invocations or assumes approval from Pro status.
export async function runMonitoredPopulationSlice({approval,bundleHash,worker,source,measure,wait,now=()=>Date.now()}){
  validatePopulationApproval(approval,{bundleHash,now:now()});
  if(source.snapshot!==approval.sourceSnapshot||source.expectedCount!==approval.expectedCount||typeof measure!=='function')fail('INDEX_APPROVAL_SOURCE_MISMATCH',403);
  checkPopulationResources(await measure(),now());
  if(!await source.verifySnapshot(approval.sourceSnapshot,{signal:AbortSignal.timeout(3000)}))fail('SOURCE_COVERAGE_CHANGED',503);
  const telemetry=[];
  const result=await runPopulationSlice({approval,bundleHash,wait,now,worker:{async step(...args){
    telemetry.push(checkPopulationResources(await measure(),now()));
    const receipt=await worker.step(...args);
    // A slow successful batch has already checkpointed. Stop here, retaining
    // that checkpoint; do not repeat it or continue into another expensive read.
    if(receipt.elapsedMs>=RESOURCE_LIMITS.batchMs)fail('INDEX_BATCH_LATENCY_STOP',503);
    return receipt;
  }}});
  return {...result,telemetry};
}
