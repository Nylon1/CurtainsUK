// Operator-only SQL connector port for the existing index checkpoint protocol.
// No connection discovery, migrations, login provisioning or automatic retries.
import {createHash} from 'node:crypto';
import {safeKnowledge} from './catalogue.mjs';
import {indexTerms} from './knowledge-search.mjs';
import {knowledgeReceiptFields} from './index-worker.mjs';
import {validatePopulationApproval} from './index-population.mjs';
import {validateSourceManifest} from './source-manifest.mjs';
import {checkPopulationResources} from './population-resources.mjs';
import {fail} from './contracts.mjs';
const literal=v=>"convert_from(decode('"+Buffer.from(String(v)).toString('hex')+"','hex'),'UTF8')";
const fresh=(value,now)=>Number.isFinite(Date.parse(value))&&Date.parse(value)<=now&&now-Date.parse(value)<=60000;

export function prepareContinuationBatch({manifest,source,attestation,checkpoint,approval,bundleHash,resources,now=Date.now()}){
 validatePopulationApproval(approval,{bundleHash,now});checkPopulationResources(resources,now);
 const summary=validateSourceManifest(manifest),scope=approval.continuation;
 if(!scope||!Number.isSafeInteger(scope.startOffset)||scope.startOffset<6||scope.startOffset%6!==0||!Number.isSafeInteger(scope.startingBatches)||scope.startingBatches<1||scope.endOffset!==Math.min(summary.count,scope.startOffset+6*approval.maxBatches)||scope.endOffset<=scope.startOffset||approval.sourceSnapshot!==summary.snapshot||approval.expectedCount!==summary.count)fail('CONTINUATION_SCOPE_REQUIRED',403);
 const role=approval.temporaryRoleUse;
 if(role?.approved!==true||role.member!=='postgres'||role.role!=='advisory_indexer'||role.grantor!=='postgres'||role.scope!=='same-transaction-revoke-before-commit'||!role.ownerApprovalReference)fail('TEMPORARY_INDEX_ROLE_APPROVAL_REQUIRED',403);
 const j=checkpoint?.job,offset=j?.cursor?.offset;
 if(checkpoint?.projectRef!==manifest.projectRef||!fresh(checkpoint.observed_at,now)||j?.id!==approval.jobId||j.source_snapshot!==summary.snapshot||j.expected_count!==summary.count||j.status!=='ready'||j.complete!==false||j.failures!==0||!Number.isSafeInteger(offset)||offset<scope.startOffset||offset>=scope.endOffset||offset%6!==0||j.processed!==offset||j.indexed!==offset||j.batches!==scope.startingBatches+(offset-scope.startOffset)/6||JSON.stringify(Object.keys(j.cursor).sort())!==JSON.stringify(['manifestHash','offset'])||j.cursor.manifestHash!==summary.hash)fail('CONTINUATION_CHECKPOINT_CHANGED',409);
 if(attestation?.projectRef!==manifest.projectRef||attestation.inventory_complete!==true||attestation.identity_count!==summary.count||attestation.identity_sha256!==summary.hash||!fresh(attestation.observed_at,now))fail('SOURCE_COVERAGE_CHANGED',503);
 const end=Math.min(offset+6,scope.endOffset),ids=manifest.ids.slice(offset,end);
 if(source?.projectRef!==manifest.projectRef||!fresh(source.observed_at,now)||!Array.isArray(source.records)||JSON.stringify(source.records.map(r=>r.fabric_id))!==JSON.stringify(ids))fail('CONTINUATION_SOURCE_MISMATCH',503);
 const records=source.records.map(r=>safeKnowledge(r,r.visual,r.profile)),terms=records.map(indexTerms);
 const items=records.map((r,i)=>({id:r.id,hash:terms[i].hash,fields:knowledgeReceiptFields(r)}));
 const cursor={manifestHash:summary.hash,offset:end},complete=end===summary.count;
 const deadline=new Date(Math.min(...[source.observed_at,attestation.observed_at,checkpoint.observed_at].map(t=>Date.parse(t)+60000),resources.observedAt+60000,Date.parse(approval.expiresAt))).toISOString();
 const inserts=terms.map((t,i)=>`
 insert into advisory.index_job_items(job_id,fabric_id,before_row,after_hash,fields)
 values(${literal(j.id)}::uuid,${literal(t.id)},null,${literal(t.hash)},${literal(JSON.stringify(items[i].fields))}::jsonb);
 insert into advisory.knowledge_search(fabric_id,document,colour,pattern,texture,composition,source_hash)
 values(${literal(t.id)},to_tsvector('english',${literal(t.text)}),to_tsvector('english',${literal(t.colour)}),to_tsvector('english',${literal(t.pattern)}),to_tsvector('english',${literal(t.texture)}),to_tsvector('english',${literal(t.composition)}),${literal(t.hash)});`).join('\n');
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
 if clock_timestamp()>=${literal(deadline)}::timestamptz then raise exception 'CONTINUATION_ATTESTATION_EXPIRED'; end if;
 select * into strict g from advisory.index_gate where id=1 for update nowait;
 if (g.token is not null and g.lease_until>clock_timestamp()) or g.next_at>clock_timestamp() then raise exception 'INDEX_THROTTLED'; end if;
 select * into strict j from advisory.index_jobs where id=${literal(j.id)}::uuid for update nowait;
 if j.cursor is distinct from ${literal(JSON.stringify(j.cursor))}::jsonb or j.source_snapshot is distinct from ${literal(summary.snapshot)} or j.expected_count is distinct from ${summary.count} or j.processed<>${offset} or j.indexed<>${offset} or j.batches<>${j.batches} or j.status<>'ready' or j.complete or j.failures<>0 then raise exception 'CONTINUATION_CHECKPOINT_CHANGED'; end if;
 -- A prior receipt or search-row collision aborts this transaction. This port
 -- inserts new identities only; the existing worker handles reviewed refreshes.
${inserts}
 update advisory.index_jobs set cursor=${literal(JSON.stringify(cursor))}::jsonb,processed=${end},indexed=${end},batches=batches+1,complete=${complete},status='${complete?'exhausted':'ready'}',updated_at=clock_timestamp() where id=j.id;
 update advisory.index_gate set token=null,lease_until=null,next_at=clock_timestamp()+interval '5 seconds' where id=1;
end $batch$;
select jsonb_build_object('jobId',id,'processed',processed,'indexed',indexed,'batches',batches,'complete',complete,'cursor',cursor,'status',status,'expected',expected_count,'checked_at',clock_timestamp()) as receipt from advisory.index_jobs where id=${literal(j.id)}::uuid;
reset role;
revoke advisory_indexer from postgres granted by postgres;
do $scope$ begin
 if pg_has_role('postgres','advisory_indexer','SET') or (select count(*) from pg_auth_members where roleid='advisory_indexer'::regrole)<>1 or not exists(select 1 from pg_auth_members where roleid='advisory_indexer'::regrole and member='postgres'::regrole and grantor='supabase_admin'::regrole and admin_option and not inherit_option and not set_option) then raise exception 'INDEX_OPERATOR_PERMISSION_RESTORE_FAILED'; end if;
end $scope$;
commit;
`;
 return {version:1,classification:'CONTINUATION_PLAN_NOT_EXECUTION',jobId:j.id,ids,items,fromOffset:offset,cursor,expectedCount:summary.count,sourceSnapshot:summary.snapshot,complete,bundleHash,approval,deadline,sql,sqlSha256:createHash('sha256').update(sql).digest('hex')};
}

// A restarted operator must inspect durable state, never blindly replay SQL.
// Verification is read-only and must include exactly the submitted batch IDs.
export function verifyContinuationResult(plan,{job,items,permissionRestored}){
 const expectedBatches=plan.approval.continuation.startingBatches+Math.ceil((plan.cursor.offset-plan.approval.continuation.startOffset)/6);
 if(permissionRestored!==true||job?.id!==plan.jobId||job.source_snapshot!==plan.sourceSnapshot||job.expected_count!==plan.expectedCount||job.processed!==plan.cursor.offset||job.indexed!==plan.cursor.offset||job.cursor?.offset!==plan.cursor.offset||job.cursor?.manifestHash!==plan.cursor.manifestHash||job.complete!==plan.complete||job.status!==(plan.complete?'exhausted':'ready')||job.batches!==expectedBatches||job.failures!==0||!Array.isArray(items)||items.length!==plan.items.length||plan.items.some(p=>!items.some(i=>i.id===p.id&&i.hash===p.hash&&i.receiptHash===p.hash&&i.rolledBack===false&&i.beforeRow===null&&Object.keys(i.fields??{}).length===Object.keys(p.fields).length&&Object.entries(p.fields).every(([k,v])=>i.fields[k]===v))))fail('INDEX_COMMIT_OUTCOME_REQUIRES_REVIEW',503);
 return {processed:job.processed,indexed:job.indexed,batches:job.batches,complete:job.complete,permissionRestored:true};
}
