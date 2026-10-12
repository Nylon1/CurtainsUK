import {fail} from './contracts.mjs';

// Read-only recovery only. The caller must prove there is no pending write and
// reconcile the last exact commit before the next invocation can be admitted.
const TRANSIENT=new Set(['INDEX_RESOURCE_STOP','INDEX_ACTIVITY_DRAIN','INDEX_ACTIVITY_CONFLICT','INDEX_ACTIVITY_PROLONGED','STALE_HOST_METRICS','CACHED_HOST_METRICS','HOST_METRICS_WINDOW_TOO_LONG','HOST_ADMISSION_WAIT_EXHAUSTED','TRANSIENT_RETAIL_READ','TRANSIENT_SQL_READ_TIMEOUT']);
export async function runWithReadOnlyRecovery({run,reconcile,wait,deadline,now=()=>Date.now(),onHold=async()=>{}}){
 if(!Number.isFinite(deadline))fail('OVERNIGHT_DEADLINE_REQUIRED',503);
 let holds=0;
 for(;;){
  if(now()>=deadline)fail('OVERNIGHT_DEADLINE',503);
  try{return await run();}catch(error){
   const code=error.code??error.message;
   if(!TRANSIENT.has(code))throw error;
   await onHold({code,holds:++holds,observedAt:new Date(now()).toISOString(),writesPermitted:false});
   await reconcile(); // any ambiguity, changed receipt, permission or access failure escapes
   if(now()>=deadline)fail('OVERNIGHT_DEADLINE',503);
   const retryAfterMs=Number.isFinite(error.retryAfterMs)?Math.max(0,error.retryAfterMs):0;
   const resumeAt=Math.min(deadline,now()+Math.max(code==='INDEX_ACTIVITY_DRAIN'?5000:15000,retryAfterMs));
   while(now()<resumeAt)await wait(Math.min(15000,resumeAt-now()));
  }
 }
}
