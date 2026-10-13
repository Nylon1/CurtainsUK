// Existing-schema SQL connector binding. Adds only a separate eligible job,
// receipts and missing search rows; no migrations, source writes or refreshes.
import {createHash} from 'node:crypto';
import {safeKnowledge} from './catalogue.mjs';
import {indexTerms} from './knowledge-search.mjs';
import {knowledgeReceiptFields} from './index-worker.mjs';
import {validatePopulationApproval} from './index-population.mjs';
import {validateEligibleManifest} from './eligible-manifest.mjs';
import {checkPopulationResources} from './population-resources.mjs';
import {checkEligiblePrerequisites} from './eligible-admission.mjs';
import {fail,UUID} from './contracts.mjs';
import {hostWindowLimit} from './host-window-policy.mjs';
import {hostSampleMaxAge,eligibleBatchMaxMs} from './eligible-limit-policy.mjs';
import {populationDeadline} from './population-deadline.mjs';

const literal=v=>"convert_from(decode('"+Buffer.from(String(v)).toString('hex')+"','hex'),'UTF8')";
const json=v=>literal(JSON.stringify(v))+'::jsonb';
const fresh=(t,now)=>Number.isFinite(Date.parse(t))&&Date.parse(t)<=now&&now-Date.parse(t)<=60000;
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
export const sameEvidence=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
export const evidenceHash=v=>createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex');

export function validateEligibleApproval({manifest,approval,bundleHash,historical,now=Date.now()}) {
 validatePopulationApproval(approval,{bundleHash,now});
 hostSampleMaxAge(approval.hostMonitoringApproval);eligibleBatchMaxMs(approval);
 const s=validateEligibleManifest(manifest), p=approval.eligiblePopulation, h=historical;
 if(approval.hostMonitoringApproval!==undefined){hostWindowLimit(approval.hostMonitoringApproval);if(approval.hostMonitoringApproval.sourceSnapshot!==s.snapshot)fail('HOST_WINDOW_APPROVAL_REQUIRED',403);}
 if(!p||p.startOffset!==0||p.endOffset!==s.count||p.canaryEnd!==Math.min(120,s.count)||approval.expectedCount!==s.count||approval.sourceSnapshot!==s.snapshot||!new RegExp(UUID).test(p.historicalJobId??'')||p.historicalJobId===approval.jobId||p.historicalSha256!==evidenceHash(h))fail('ELIGIBLE_SCOPE_REQUIRED',403);
 if(h?.job?.id!==p.historicalJobId||h.job.processed!==6||h.job.indexed!==6||h.job.batches!==1||h.job.complete!==false||h.job.failures!==0||h.job.status!=='ready'||!h.job.source_snapshot.startsWith('master-identities-sha256:')||!Array.isArray(h.items)||!Array.isArray(h.rows)||h.items.length!==6||h.rows.length!==6||new Set(h.rows.map(r=>r.fabric_id)).size!==6||new Set(h.items.map(r=>r.fabric_id)).size!==6||h.items.some(i=>i.job_id!==h.job.id||i.rolled_back!==false||i.before_row!==null||!h.rows.some(r=>r.fabric_id===i.fabric_id&&r.source_hash===i.after_hash)))fail('HISTORICAL_BASELINE_REQUIRED',409);
 const noops=manifest.ids.filter(id=>h.rows.some(r=>r.fabric_id===id));
 if(noops.length!==5||!sameEvidence(noops,p.unchangedIds)||noops.some(id=>manifest.ids.indexOf(id)>=p.canaryEnd))fail('EXACT_FIVE_NOOPS_REQUIRED',409);
 const r=approval.temporaryRoleUse;
 if(r?.approved!==true||r.member!=='postgres'||r.role!=='advisory_indexer'||r.grantor!=='postgres'||r.scope!=='same-transaction-revoke-before-commit'||!r.ownerApprovalReference)fail('TEMPORARY_INDEX_ROLE_APPROVAL_REQUIRED',403);
 return s;
}

export function checkEligibleCheckpoint(checkpoint,{manifest,approval,summary,now=Date.now()}) {
 if(checkpoint?.projectRef!==manifest.projectRef||!fresh(checkpoint.observed_at,now))fail('ELIGIBLE_CHECKPOINT_CHANGED',409);
 const j=checkpoint.job;
 if(j===null){if(approval.completionApproval)fail('EXISTING_COMPLETION_JOB_REQUIRED',409);return 0;} // Until-complete approval cannot bootstrap another job.
 const offset=j?.cursor?.offset,complete=offset===summary.count;
 if(j?.id!==approval.jobId||j.source_snapshot!==summary.snapshot||j.expected_count!==summary.count||!Number.isSafeInteger(offset)||offset<6||offset>summary.count||(!complete&&offset%6!==0)||j.cursor.manifestHash!==summary.hash||Object.keys(j.cursor).sort().join(',')!=='manifestHash,offset'||j.processed!==offset||j.indexed!==offset||j.batches!==Math.ceil(offset/6)||j.failures!==0||j.complete!==complete||j.status!==(complete?'exhausted':'ready'))fail('ELIGIBLE_CHECKPOINT_CHANGED',409);
 return offset;
}

export function prepareEligibleBatch({manifest,source,attestation,checkpoint,approval,bundleHash,resources,prerequisites,historical,canary,now=Date.now()}) {
 const summary=validateEligibleApproval({manifest,approval,bundleHash,historical,now});
 checkEligiblePrerequisites(prerequisites,historical,now);checkPopulationResources(resources,now,approval.hostMonitoringApproval);
 if(!Number.isFinite(resources.windowMs)||resources.windowMs<=0||resources.windowMs>hostWindowLimit(approval.hostMonitoringApproval))fail('CURRENT_RESOURCE_WINDOW_REQUIRED',503);
 const offset=checkEligibleCheckpoint(checkpoint,{manifest,approval,summary,now});
 if(offset===summary.count)fail('ELIGIBLE_JOB_COMPLETE',409);
 if(offset>=approval.eligiblePopulation.canaryEnd)checkCanary(canary,{approval,summary});
 const end=Math.min(offset+6,summary.count),ids=manifest.ids.slice(offset,end);
 if(attestation?.projectRef!==manifest.projectRef||!fresh(attestation.observed_at,now)||attestation.snapshot!==summary.snapshot||attestation.policySha256!==manifest.policySha256||attestation.sourceUnchanged!==true||attestation.publicationUnchanged!==true||!sameEvidence(attestation.eligibleIds,ids))fail('ELIGIBILITY_CHANGED_REVIEW_REQUIRED',503);
 if(source?.projectRef!==manifest.projectRef||!fresh(source.observed_at,now)||!Array.isArray(source.records)||!sameEvidence(source.records.map(r=>r.fabric_id),ids))fail('ELIGIBLE_SOURCE_MISMATCH',503);
 const records=source.records.map(r=>safeKnowledge(r,r.visual,r.profile)),terms=records.map(indexTerms);
 const items=records.map((r,i)=>{
  const beforeRow=historical.rows.find(row=>row.fabric_id===r.id)??null;
  if(beforeRow&&beforeRow.source_hash!==terms[i].hash)fail('EXISTING_ELIGIBLE_ROW_CHANGED',409);
  return {id:r.id,hash:terms[i].hash,fields:knowledgeReceiptFields(r),beforeRow};
 });
 const deadline=new Date(Math.min(...[source.observed_at,attestation.observed_at,checkpoint.observed_at,prerequisites.observedAt].map(t=>Date.parse(t)+60000),resources.observedAt+hostSampleMaxAge(approval.hostMonitoringApproval),populationDeadline(approval,now))).toISOString();
 const cursor={manifestHash:summary.hash,offset:end},complete=end===summary.count;
 const historicalGuard=`
 perform 1 from advisory.index_jobs where id=${literal(historical.job.id)}::uuid for share nowait;
 perform 1 from advisory.index_job_items where job_id=${literal(historical.job.id)}::uuid for share nowait;
 if (select to_jsonb(old_job) from advisory.index_jobs old_job where id=${literal(historical.job.id)}::uuid) is distinct from ${json(historical.job)}
 or (select jsonb_agg(to_jsonb(i) order by fabric_id) from advisory.index_job_items i where job_id=${literal(historical.job.id)}::uuid) is distinct from ${json([...historical.items].sort((a,b)=>a.fabric_id.localeCompare(b.fabric_id)))} then raise exception 'HISTORICAL_JOB_CHANGED'; end if;
 ${historical.rows.map(r=>`perform 1 from advisory.knowledge_search where fabric_id=${literal(r.fabric_id)} for share nowait;
 if (select to_jsonb(k) from advisory.knowledge_search k where fabric_id=${literal(r.fabric_id)}) is distinct from ${json(r)} then raise exception 'HISTORICAL_SEARCH_ROW_CHANGED'; end if;`).join('\n')}`;
 const inserts=terms.map((t,i)=>`
 insert into advisory.index_job_items(job_id,fabric_id,before_row,after_hash,fields)
 values(${literal(approval.jobId)}::uuid,${literal(t.id)},${items[i].beforeRow===null?'null':json(items[i].beforeRow)},${literal(t.hash)},${json(items[i].fields)});
 ${items[i].beforeRow?'-- Verified unchanged search row: receipt only, no UPDATE.':`insert into advisory.knowledge_search(fabric_id,document,colour,pattern,texture,composition,source_hash)
 values(${literal(t.id)},to_tsvector('english',${literal(t.text)}),to_tsvector('english',${literal(t.colour)}),to_tsvector('english',${literal(t.pattern)}),to_tsvector('english',${literal(t.texture)}),to_tsvector('english',${literal(t.composition)}),${literal(t.hash)});`}`).join('\n');
 const sql=`begin;
set local statement_timeout='3s';
set local lock_timeout='500ms';
set local idle_in_transaction_session_timeout='5s';
do $scope$ begin
 if current_user<>'postgres' or session_user<>'postgres' or pg_has_role('postgres','advisory_indexer','SET') then raise exception 'INDEX_OPERATOR_PERMISSION_STATE_CHANGED'; end if;
 if (select count(*) from pg_auth_members where roleid='advisory_indexer'::regrole)<>1 or not exists(select 1 from pg_auth_members where roleid='advisory_indexer'::regrole and member='postgres'::regrole and grantor='supabase_admin'::regrole and admin_option and not inherit_option and not set_option) then raise exception 'INDEX_OPERATOR_PERMISSION_STATE_CHANGED'; end if;
end $scope$;
grant advisory_indexer to postgres with admin false,inherit false,set true granted by postgres;
set local role advisory_indexer;
do $batch$
declare g advisory.index_gate%rowtype; j advisory.index_jobs%rowtype;
begin
 if current_user<>'advisory_indexer' then raise exception 'UNSCOPED_INDEX_ROLE'; end if;
 if clock_timestamp()>=${literal(deadline)}::timestamptz then raise exception 'ELIGIBLE_ATTESTATION_EXPIRED'; end if;
 select * into strict g from advisory.index_gate where id=1 for update nowait;
 if (g.token is not null and g.lease_until>clock_timestamp()) or g.next_at>clock_timestamp() then raise exception 'INDEX_THROTTLED'; end if;
 ${historicalGuard}
 ${offset===0?`if exists(select 1 from advisory.index_jobs where id<>${literal(historical.job.id)}::uuid) then raise exception 'ELIGIBLE_BOOTSTRAP_STATE_CHANGED'; end if;
 insert into advisory.index_jobs(id,source_snapshot,expected_count) values(${literal(approval.jobId)}::uuid,${literal(summary.snapshot)},${summary.count});`:''}
 select * into strict j from advisory.index_jobs where id=${literal(approval.jobId)}::uuid for update nowait;
 if j.cursor is distinct from ${offset===0?'null':json(checkpoint.job.cursor)} or j.source_snapshot is distinct from ${literal(summary.snapshot)} or j.expected_count is distinct from ${summary.count} or j.processed<>${offset} or j.indexed<>${offset} or j.batches<>${Math.ceil(offset/6)} or j.status<>'ready' or j.complete or j.failures<>0 then raise exception 'ELIGIBLE_CHECKPOINT_CHANGED'; end if;
 ${inserts}
 update advisory.index_jobs set cursor=${json(cursor)},processed=${end},indexed=${end},batches=batches+1,complete=${complete},status='${complete?'exhausted':'ready'}',updated_at=clock_timestamp() where id=j.id;
 update advisory.index_gate set token=null,lease_until=null,next_at=clock_timestamp()+interval '5 seconds' where id=1;
end $batch$;
reset role;
revoke advisory_indexer from postgres granted by postgres;
do $scope$ begin
 if pg_has_role('postgres','advisory_indexer','SET') or (select count(*) from pg_auth_members where roleid='advisory_indexer'::regrole)<>1 or not exists(select 1 from pg_auth_members where roleid='advisory_indexer'::regrole and member='postgres'::regrole and grantor='supabase_admin'::regrole and admin_option and not inherit_option and not set_option) then raise exception 'INDEX_OPERATOR_PERMISSION_RESTORE_FAILED'; end if;
end $scope$;
commit;
`;
 return {version:1,classification:'ELIGIBLE_PLAN_NOT_EXECUTION',jobId:approval.jobId,ids,items,fromOffset:offset,cursor,expectedCount:summary.count,sourceSnapshot:summary.snapshot,complete,bundleHash,approval,historical,deadline,sql,sqlSha256:createHash('sha256').update(sql).digest('hex')};
}

export function checkCanary(c,{approval,summary}) {
 if(c?.jobId!==approval.jobId||c.sourceSnapshot!==summary.snapshot||c.processed!==approval.eligiblePopulation.canaryEnd||c.healthy!==true||c.permissionRestored!==true||c.historicalPreserved!==true||c.exactHashes!==true||c.publicationUnchanged!==true||c.retailExclusionsVerified!==true||c.newRows!==c.processed-5||!c.evidenceReference)fail('VERIFIED_ELIGIBLE_CANARY_REQUIRED',503);
 return c;
}

export function verifyEligibleResult(plan,{job,items,historical,permissionRestored}) {
 if(permissionRestored!==true||!sameEvidence(historical,plan.historical)||job?.id!==plan.jobId||job.source_snapshot!==plan.sourceSnapshot||job.expected_count!==plan.expectedCount||job.processed!==plan.cursor.offset||job.indexed!==plan.cursor.offset||!sameEvidence(job.cursor,plan.cursor)||job.complete!==plan.complete||job.status!==(plan.complete?'exhausted':'ready')||job.batches!==Math.ceil(plan.cursor.offset/6)||job.failures!==0||!Array.isArray(items)||items.length!==plan.items.length||new Set(items.map(i=>i.id)).size!==items.length||plan.items.some(p=>!items.some(i=>i.id===p.id&&i.hash===p.hash&&i.receiptHash===p.hash&&i.rolledBack===false&&sameEvidence(i.beforeRow,p.beforeRow)&&sameEvidence(i.fields,p.fields))))fail('INDEX_COMMIT_OUTCOME_REQUIRES_REVIEW',503);
 return {processed:job.processed,indexed:job.indexed,batches:job.batches,complete:job.complete,permissionRestored:true,unchanged:plan.items.filter(i=>i.beforeRow!==null).length};
}
