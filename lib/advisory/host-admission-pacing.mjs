import {hostResourceWindow} from './host-metrics.mjs';
import {RESOURCE_LIMITS} from './population-resources.mjs';
import {EXISTING_PROJECT_REF} from './hosted-test.mjs';
import {fail} from './contracts.mjs';
import {hostSampleMaxAge} from './eligible-limit-policy.mjs';

// Read-only pacing BEFORE checkpoint, backup and source admission. This never
// supplies resource clearance or changes a source timestamp. All original
// admission and immediate post-commit checks still run independently.
export const HOST_PACING=Object.freeze({startAgeMs:30000,maxWaitMs:90000,pollMs:5000});
export async function waitForHostAdmission({readHost,wait,deadline,approval,now=()=>Date.now(),onWait=async()=>{}}){
 const started=now(),maxAgeMs=hostSampleMaxAge(approval),startAgeMs=maxAgeMs-30000;let lastSample=-Infinity;
 if(!Number.isFinite(deadline))fail('HOST_PACING_DEADLINE_REQUIRED',503);
 for(;;){
  if(now()>=deadline)fail('OVERNIGHT_DEADLINE',503);
  const {previous,current}=await readHost(),time=now();
  if(time>=deadline)fail('OVERNIGHT_DEADLINE',503);
  if(time-started>HOST_PACING.maxWaitMs)fail('HOST_ADMISSION_WAIT_EXHAUSTED',503);
  if(!previous||!current||[previous,current].some(s=>s.projectRef!==EXISTING_PROJECT_REF||!Number.isFinite(s.sampledAt)||!Number.isFinite(s.receivedAt)||s.sampledAt>s.receivedAt||s.receivedAt>time)||current.sampledAt<lastSample)fail('INVALID_HOST_PACING_SAMPLE',503);
  lastSample=current.sampledAt;
  const ageMs=time-current.sampledAt;
  // A stale cached payload during this bounded idle wait is never admission.
  // Once fresh, the existing validator checks counters, topology and window.
  if(ageMs<=maxAgeMs){
   const r=hostResourceWindow(previous,current,time,approval);
   for(const key of ['cpuPercent','ioPercent','memoryPercent','diskPercent'])if(r[key]>=RESOURCE_LIMITS[key])fail('INDEX_RESOURCE_STOP',503);
   if(ageMs<=startAgeMs)return {sampledAt:current.sampledAt,ageMs,waitedMs:time-started};
  }
  if(time-started>=HOST_PACING.maxWaitMs)fail('HOST_ADMISSION_WAIT_EXHAUSTED',503);
  await onWait({sampledAt:current.sampledAt,ageMs,waitedMs:time-started});
  await wait(Math.min(HOST_PACING.pollMs,HOST_PACING.maxWaitMs-(time-started),deadline-time));
 }
}
