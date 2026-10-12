import {createHash} from 'node:crypto';
import {fail} from './contracts.mjs';

const sha=text=>createHash('sha256').update(text).digest('hex');

// Trusted operator transport only. The original write transaction is unchanged.
// Its COMMIT precedes a separate READ ONLY transaction in one network request.
// The caller fsyncs this exact wire payload as well as the runner's original plan.
// No retries, credentials, schedules or customer/model-controlled SQL live here.
export function createEligibleTransport({execute,readbackSql,writeAhead,onTiming=async()=>{},now=()=>Date.now()}) {
 let prepared=null,attempted=false,cached=null;
 const check=plan=>{
  if(plan?.classification!=='ELIGIBLE_PLAN_NOT_EXECUTION'||sha(plan.sql)!==plan.sqlSha256||
   !plan.sql.startsWith("begin;\nset local statement_timeout='3s';")||!plan.sql.trimEnd().endsWith('commit;'))fail('INDEX_TRANSPORT_PLAN_INVALID',409);
 };
 const query=plan=>{
  const value=readbackSql(plan);
  if(typeof value!=='string'||!value.startsWith('begin read only;')||!value.trimEnd().endsWith('commit;'))fail('INDEX_TRANSPORT_READBACK_INVALID',409);
  return value;
 };
 return {
  prepared(plan){
   check(plan);
   if(prepared)fail('INDEX_TRANSPORT_PENDING',409);
   prepared=structuredClone(plan);attempted=false;
  },
  async submit(sql){
   if(!prepared||attempted||sql!==prepared.sql)fail('INDEX_TRANSPORT_SUBMISSION_MISMATCH',409);
   const plan=prepared,readback=query(plan),wire=sql+'\n'+readback;
   // Mark before any I/O: even a journal or transport failure cannot resubmit.
   attempted=true;
   await writeAhead({kind:'wire-prepared',at:new Date(now()).toISOString(),jobId:plan.jobId,
    planSha256:plan.sqlSha256,wireSha256:sha(wire),sql:wire});
   const started=now();
   try {
    const result=await execute(wire);
    if(!result||typeof result!=='object')fail('INDEX_TRANSPORT_RESPONSE_AMBIGUOUS',503);
    cached={planSha256:plan.sqlSha256,result};
   } finally {await onTiming({kind:'commit-and-readback',planSha256:plan.sqlSha256,durationMs:now()-started});}
  },
  async readBack(plan){
   check(plan);
   if(cached){
    if(cached.planSha256!==plan.sqlSha256)fail('INDEX_TRANSPORT_READBACK_MISMATCH',409);
    const result=cached.result;cached=null;prepared=null;attempted=false;return result;
   }
   // Recovery of an ambiguous submission is read-only, never a second write.
   const started=now();
   try {return await execute(query(plan));}
   finally {await onTiming({kind:'read-only-reconciliation',planSha256:plan.sqlSha256,durationMs:now()-started});}
  }
 };
}
