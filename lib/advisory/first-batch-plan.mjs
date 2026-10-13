// Operator-only bootstrap for one approved six-identity trial through a SQL
// connector. No new LOGIN, grants, schema objects, source writes or scheduler.
// Subsequent population uses the existing checkpoint worker, after new approval.
import {createHash} from 'node:crypto';
import {safeKnowledge} from './catalogue.mjs';
import {indexTerms} from './knowledge-search.mjs';
import {knowledgeFields} from './index-worker.mjs';
import {validatePopulationApproval} from './index-population.mjs';
import {validateSourceManifest} from './source-manifest.mjs';
import {checkPopulationResources} from './population-resources.mjs';
import {fail} from './contracts.mjs';

// Hex encoding keeps supplier text outside SQL syntax, including backslashes,
// quotes and dollar delimiters. No model-supplied SQL or identifiers accepted.
const literal=value=>"convert_from(decode('"+Buffer.from(String(value)).toString('hex')+"','hex'),'UTF8')";
export function prepareFirstBatch({manifest,source,attestation,approval,bundleHash,resources,now=Date.now()}){
 validatePopulationApproval(approval,{bundleHash,now});checkPopulationResources(resources,now);
 const summary=validateSourceManifest(manifest),ids=manifest.ids.slice(0,6);
 const attestedAt=Date.parse(attestation?.observed_at);
 if(attestation?.projectRef!==manifest.projectRef||attestation.inventory_complete!==true||attestation.identity_count!==summary.count||attestation.identity_sha256!==summary.hash||!Number.isFinite(attestedAt)||attestedAt>now||now-attestedAt>60000)fail('SOURCE_COVERAGE_CHANGED',503);
 const at=Date.parse(source?.observed_at);
 if(approval.maxBatches!==1||approval.expectedCount!==summary.count||approval.sourceSnapshot!==summary.snapshot||source?.projectRef!==manifest.projectRef||!Number.isFinite(at)||at>now||now-at>60000||!Array.isArray(source.records)||source.records.length!==6||JSON.stringify(source.records.map(r=>r.fabric_id))!==JSON.stringify(ids))fail('FIRST_BATCH_SOURCE_MISMATCH',503);
 const records=source.records.map(r=>safeKnowledge(r,r.visual,r.profile));
 const terms=records.map(indexTerms),items=records.map(r=>({id:r.id,hash:indexTerms(r).hash,fields:knowledgeFields(r)}));
 const cursor={manifestHash:summary.hash,offset:6};
 const deadline=new Date(Math.min(at+60000,attestedAt+60000,resources.observedAt+60000,Date.parse(approval.expiresAt))).toISOString();
 // This option is a separate permission boundary. A normal population approval
 // never enables it implicitly. The grantor-qualified revoke preserves the
 // pre-existing supabase_admin -> postgres ADMIN-only membership.
 const temporaryRoleUse=approval.temporaryRoleUse;
 if(temporaryRoleUse!==undefined&&(temporaryRoleUse.approved!==true||temporaryRoleUse.member!=='postgres'||temporaryRoleUse.role!=='advisory_indexer'||temporaryRoleUse.grantor!=='postgres'||temporaryRoleUse.scope!=='same-transaction-revoke-before-commit'||!temporaryRoleUse.ownerApprovalReference))fail('TEMPORARY_INDEX_ROLE_APPROVAL_REQUIRED',403);
 const permissionBefore=temporaryRoleUse?`do $scope$ begin
 if current_user<>'postgres' or session_user<>'postgres' or pg_has_role('postgres','advisory_indexer','SET') then raise exception 'INDEX_OPERATOR_PERMISSION_STATE_CHANGED'; end if;
 if (select count(*) from pg_auth_members where roleid='advisory_indexer'::regrole)<>1 or not exists(select 1 from pg_auth_members where roleid='advisory_indexer'::regrole and member='postgres'::regrole and grantor='supabase_admin'::regrole and admin_option and not inherit_option and not set_option) then raise exception 'INDEX_OPERATOR_PERMISSION_STATE_CHANGED'; end if;
end $scope$;
grant advisory_indexer to postgres with admin false,inherit false,set true granted by postgres;`:'';
 const permissionAfter=temporaryRoleUse?`reset role;
revoke advisory_indexer from postgres granted by postgres;
do $scope$ begin
 if pg_has_role('postgres','advisory_indexer','SET') or (select count(*) from pg_auth_members where roleid='advisory_indexer'::regrole)<>1 or not exists(select 1 from pg_auth_members where roleid='advisory_indexer'::regrole and member='postgres'::regrole and grantor='supabase_admin'::regrole and admin_option and not inherit_option and not set_option) then raise exception 'INDEX_OPERATOR_PERMISSION_RESTORE_FAILED'; end if;
end $scope$;`:'';
 const insert=terms.map((t,i)=>`
 insert into advisory.index_job_items(job_id,fabric_id,before_row,after_hash,fields)
 values(${literal(approval.jobId)}::uuid,${literal(t.id)},null,${literal(t.hash)},${literal(JSON.stringify(items[i].fields))}::jsonb);
 insert into advisory.knowledge_search(fabric_id,document,colour,pattern,texture,composition,source_hash)
 values(${literal(t.id)},to_tsvector('english',${literal(t.text)}),to_tsvector('english',${literal(t.colour)}),to_tsvector('english',${literal(t.pattern)}),to_tsvector('english',${literal(t.texture)}),to_tsvector('english',${literal(t.composition)}),${literal(t.hash)});`).join('\n');
 const sql=`begin;
set local statement_timeout='3s';
set local lock_timeout='500ms';
set local idle_in_transaction_session_timeout='5s';
${permissionBefore}
set local role advisory_indexer;
do $trial$
declare g advisory.index_gate%rowtype;
begin
 if current_user <> 'advisory_indexer' then raise exception 'UNSCOPED_INDEX_ROLE'; end if;
 if clock_timestamp() >= ${literal(deadline)}::timestamptz then raise exception 'FIRST_BATCH_ATTESTATION_EXPIRED'; end if;
 select * into strict g from advisory.index_gate where id=1 for update nowait;
 if (g.token is not null and g.lease_until>clock_timestamp()) or g.next_at>clock_timestamp() then raise exception 'INDEX_THROTTLED'; end if;
 if exists(select 1 from advisory.index_jobs limit 1) or exists(select 1 from advisory.knowledge_search limit 1) then raise exception 'FIRST_BATCH_ALREADY_STARTED_REVIEW_CHECKPOINT'; end if;
 insert into advisory.index_jobs(id,source_snapshot,expected_count)
 values(${literal(approval.jobId)}::uuid,${literal(summary.snapshot)},${summary.count});
 ${insert}
 update advisory.index_jobs set cursor=${literal(JSON.stringify(cursor))}::jsonb,processed=6,indexed=6,batches=1,complete=false,status='ready',updated_at=clock_timestamp() where id=${literal(approval.jobId)}::uuid;
 update advisory.index_gate set token=null,lease_until=null,next_at=clock_timestamp()+interval '5 seconds' where id=1;
end $trial$;
select jsonb_build_object('jobId',id,'processed',processed,'indexed',indexed,'batches',batches,'complete',complete,'cursor',cursor,'status',status,'expected',expected_count,'role',current_user,'checked_at',clock_timestamp()) as receipt from advisory.index_jobs where id=${literal(approval.jobId)}::uuid;
${permissionAfter}
commit;
`;
 return {version:1,classification:'APPROVED_FIRST_BATCH_SQL_NOT_EXECUTION',jobId:approval.jobId,ids,items,cursor,sourceSnapshot:summary.snapshot,expectedCount:summary.count,bundleHash,approval,deadline,sql,sqlSha256:createHash('sha256').update(sql).digest('hex'),records};
}
