import {createHash} from 'node:crypto';
import {sameEvidence,verifyEligibleResult,evidenceHash} from './eligible-plan.mjs';
import {fail} from './contracts.mjs';

// Explicit operator reconciliation, never an automatic write retry. Only an
// expired post-canary INSERT plan can be retired. Keep the exact original plan
// and both independent readbacks in the append-only journal. A future attempt
// must obtain all admission evidence again and generate different, fresh SQL.
export function verifyUncommittedPlan(plan,evidence,now=Date.now()){
 const reject=()=>fail('INDEX_UNCOMMITTED_REQUIRES_REVIEW',409);
 const valid=p=>p?.classification==='ELIGIBLE_PLAN_NOT_EXECUTION'&&typeof p.sql==='string'&&createHash('sha256').update(p.sql).digest('hex')===p.sqlSha256;
 const previous=evidence?.previousPlan,observations=evidence?.observations;
 if(!valid(plan)||!valid(previous)||plan.fromOffset<120||previous.cursor.offset!==plan.fromOffset||previous.jobId!==plan.jobId||previous.sourceSnapshot!==plan.sourceSnapshot||previous.bundleHash!==plan.bundleHash||previous.approval.implementationSha256!==plan.approval.implementationSha256||!sameEvidence(previous.historical,plan.historical))reject();
 if(!Array.isArray(plan.ids)||plan.ids.length!==6||new Set(plan.ids).size!==6||plan.cursor.offset!==plan.fromOffset+6||plan.items?.length!==6||plan.items.some((i,n)=>i.id!==plan.ids[n]||i.beforeRow!==null)||!Array.isArray(observations)||observations.length!==2)reject();
 const deadline=Date.parse(plan.deadline),encoded=Buffer.from(plan.deadline).toString('hex');
 if(!Number.isFinite(deadline)||!plan.sql.includes("if clock_timestamp()>=convert_from(decode('"+encoded+"','hex'),'UTF8')::timestamptz then raise exception 'ELIGIBLE_ATTESTATION_EXPIRED'; end if;")||!plan.sql.includes("set local statement_timeout='3s';")||!plan.sql.includes("set local idle_in_transaction_session_timeout='5s';"))reject();
 const verified=verifyEligibleResult(previous,evidence.previousReadback);
 if(verified.processed!==plan.fromOffset)reject();
 let firstTime;
 for(const [n,o] of observations.entries()){
  const time=Date.parse(o.observedAt);
  if(!Number.isFinite(time)||time<deadline+30000||time>now||now-time>60000||o.projectRef!==plan.approval.projectRef||o.oldTransactions!==0||o.preparedTransactions!==0||o.permissionRestored!==true||!sameEvidence(o.historical,plan.historical)||!sameEvidence(o.job,evidence.previousReadback.job)||!Array.isArray(o.knowledgeRows)||o.knowledgeRows.length!==0||!Array.isArray(o.jobItems)||o.jobItems.length!==0||(o.items!==null&&(!Array.isArray(o.items)||o.items.length!==0)))reject();
  if(n===0)firstTime=time;else if(time-firstTime<5000)reject();
 }
 return {outcome:'expired-uncommitted',sqlSha256:plan.sqlSha256,jobId:plan.jobId,processed:verified.processed,evidenceSha256:evidenceHash(evidence),databaseWrites:0};
}
