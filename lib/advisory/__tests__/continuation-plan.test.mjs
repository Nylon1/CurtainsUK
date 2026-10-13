import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {prepareFirstBatch} from '../first-batch-plan.mjs';
import {prepareContinuationBatch,verifyContinuationResult} from '../continuation-plan.mjs';
import {createIndexWorker,knowledgeFields} from '../index-worker.mjs';
import {readIndexCoverage} from '../index-coverage.mjs';
import {validateSourceManifest} from '../source-manifest.mjs';
const manifest=JSON.parse(await readFile(new URL('../../../artifacts/jane-pro-readiness-20261011/source-manifest.json',import.meta.url),'utf8'));
const captured=JSON.parse(await readFile(new URL('../../../artifacts/jane-first-index-batch-20261011/source.json',import.meta.url),'utf8'));
const summary=validateSourceManifest(manifest),bundleHash='a'.repeat(64);
function input(offset=6,customManifest=manifest){
 const now=Date.now(),m=validateSourceManifest(customManifest),projectRef=customManifest.projectRef;
 const approval={approved:true,projectRef,schema:'advisory',purpose:'bounded-advisory-index-only',ownerApprovalReference:'LOCAL SYNTHETIC TEST ONLY',jobId:randomUUID(),sourceAttestationReference:'LOCAL ONLY',sourceSnapshot:m.snapshot,expectedCount:m.count,bundleHash,maxBatches:20,expiresAt:new Date(now+600000).toISOString(),continuation:{startOffset:6,startingBatches:1,endOffset:Math.min(126,m.count)},temporaryRoleUse:{approved:true,member:'postgres',role:'advisory_indexer',grantor:'postgres',scope:'same-transaction-revoke-before-commit',ownerApprovalReference:'LOCAL SYNTHETIC TEST ONLY'}};
 const source={projectRef,observed_at:new Date(now).toISOString(),records:customManifest.ids.slice(offset,offset+6).map((id,i)=>({...structuredClone(captured.records[i]),fabric_id:id}))};
 return {manifest:customManifest,source,attestation:{...customManifest,observed_at:new Date(now).toISOString()},approval,bundleHash,now,checkpoint:{projectRef,observed_at:new Date(now).toISOString(),job:{id:approval.jobId,cursor:{offset,manifestHash:m.hash},processed:offset,indexed:offset,batches:offset/6,complete:false,status:'ready',failures:0,expected_count:m.count,source_snapshot:m.snapshot}},resources:{projectRef,source:'trusted-operator-telemetry',observedAt:now,cpuPercent:10,ioPercent:2,memoryPercent:60,diskPercent:50,connections:15,maxConnections:60,lockWaits:0,newDeadlocks:0,newDatabaseErrors:0,supplierRefreshActive:false}};
}
async function setup(a=input()){
 const db=new PGlite();await db.exec('create role anon;create role authenticated;create role service_role;');
 await db.exec(await readFile(new URL('../../../supabase/migrations/20261011142747_jane_isolated_advisory.sql',import.meta.url),'utf8'));
 const preparedAt=Date.now();
 await db.exec(prepareFirstBatch({...a,now:preparedAt,source:{...captured,observed_at:new Date(preparedAt).toISOString()},approval:{...a.approval,maxBatches:1,temporaryRoleUse:undefined}}).sql);
 await db.exec("update advisory.index_gate set next_at='-infinity';create role local_setup superuser;set session authorization local_setup;alter role postgres rename to supabase_admin;create role postgres nosuperuser createrole;set session authorization supabase_admin;grant advisory_indexer to postgres with admin true,inherit false,set false granted by supabase_admin;set session authorization postgres;");
 const owner=async fn=>{await db.exec('set session authorization supabase_admin');try{return await fn();}finally{await db.exec('set session authorization postgres');}};
 const job=()=>owner(async()=>(await db.query('select * from advisory.index_jobs where id=$1',[a.approval.jobId])).rows[0]);
 const advance=()=>owner(()=>db.exec("update advisory.index_gate set next_at='-infinity'"));
 const acl=async()=>(await db.query("select pg_has_role('postgres','advisory_indexer','SET') as can_set,(select count(*)::int from pg_auth_members where roleid='advisory_indexer'::regrole) as memberships")).rows[0];
 return {db,owner,job,advance,acl};
}
test('unknown values are excluded from meaningful field coverage, including empty array members',()=>{
 const f=knowledgeFields({id:'x',colour:'Unknown',description:' ',composition:[{material:'unknown'}],careInstructions:['unknown',''],fullWidthMm:-1,verticalRepeatMm:0,visual:{colourTemperature:'unknown',lightness:' UNKNOWN ',patternClass:'unknown',patternScale:'unknown',visualSurface:['unknown'],character:['']}});
 for(const key of ['colour','description','composition','care','width','tone','pattern','patternScale','texture'])assert.equal(f[key],false,key);
 assert.equal(f.verticalRepeat,true);assert.equal(knowledgeFields({visual:{colourTemperature:'unknown',lightness:'light'}}).tone,true);
});
test('continuation refuses old approval, scope overrun, stale evidence, wrong IDs and changed checkpoints',()=>{
 const a=input();assert.equal(prepareContinuationBatch(a).ids.length,6);
 for(const change of [{approval:{...a.approval,approved:false}},{approval:{...a.approval,continuation:undefined}},{approval:{...a.approval,maxBatches:21}},{approval:{...a.approval,temporaryRoleUse:undefined}},{approval:{...a.approval,continuation:{...a.approval.continuation,endOffset:132}}},{checkpoint:{...a.checkpoint,observed_at:new Date(a.now-60001).toISOString()}},{checkpoint:{...a.checkpoint,job:{...a.checkpoint.job,processed:12}}},{source:{...a.source,records:[...a.source.records].reverse()}},{resources:{...a.resources,cpuPercent:80}},{attestation:{...a.attestation,identity_count:1}}])assert.throws(()=>prepareContinuationBatch({...a,...change}));
 assert.throws(()=>prepareContinuationBatch(input(126)),/CHECKPOINT_CHANGED/);
});
test('20 resumable connector batches preserve original worker format, ACLs and truthful legacy coverage',async()=>{
 const a=input(),s=await setup(a);
 try{
  for(let n=0;n<20;n++){
   const b=input(6+n*6);b.approval=a.approval;b.checkpoint.job=await s.job();
   const plan=prepareContinuationBatch(b);await s.db.exec(plan.sql);
   assert.deepEqual(await s.acl(),{can_set:false,memberships:1});
   const actual=await s.job();assert.equal(actual.processed,12+n*6);assert.equal(actual.complete,false);
   await s.advance();
   // Ambiguous-submit recovery inspects hashes/checkpoint, never submits twice.
   const items=await s.owner(async()=>(await s.db.query('select k.fabric_id as id,k.source_hash as hash,i.after_hash as "receiptHash",i.rolled_back as "rolledBack",i.before_row as "beforeRow",i.fields from advisory.knowledge_search k join advisory.index_job_items i using(fabric_id) where i.job_id=$1 and k.fabric_id=any($2)',[a.approval.jobId,plan.ids])).rows);
   assert.equal(verifyContinuationResult(plan,{job:actual,items,permissionRestored:true}).processed,actual.processed);
   assert.throws(()=>verifyContinuationResult(plan,{job:actual,items:items.slice(1),permissionRestored:true}),/OUTCOME_REQUIRES_REVIEW/);
   if(n===0){await assert.rejects(s.db.exec(plan.sql),/CHECKPOINT_CHANGED/);await s.db.exec('rollback');assert.deepEqual(await s.acl(),{can_set:false,memberships:1});}
  }
  const coverage=await s.owner(()=>readIndexCoverage({query:s.db.query.bind(s.db)},a.approval.jobId));
  assert.equal(coverage.retained,126);assert.equal(coverage.reviewed_field_receipts,120);assert.equal(coverage.legacy_field_receipts,6);assert.equal(coverage.fieldCoverageComplete,false);assert.equal(coverage.fields.tone,40);assert.equal(coverage.fields.patternScale,0);
  const beyond=input(126);beyond.approval=a.approval;beyond.checkpoint.job=await s.job();assert.throws(()=>prepareContinuationBatch(beyond),/CHECKPOINT_CHANGED/);
  // The existing direct worker can resume the identical checkpoint, no reset.
  const nextIds=manifest.ids.slice(126,132);const worker=createIndexWorker({transaction:fn=>s.owner(()=>s.db.transaction(fn)),catalogue:{lookup:async ids=>ids.map(id=>({id,colour:'ivory'}))},source:{page:async({cursor,snapshot})=>({ids:nextIds,cursor:{...cursor,offset:132},done:false,snapshot}),verifySnapshot:async()=>true}});
  assert.equal((await worker.step(a.approval.jobId)).processed,132);
 }finally{await s.db.close();}
});
test('active gate, late failure, changed null denominator and supplier SQL text cannot bypass the transaction',async()=>{
 const a=input(),s=await setup(a);
 try{
  a.source.records[0].colour_name="'); drop schema advisory cascade; -- $batch$ \\";
  const plan=prepareContinuationBatch(a);
  await s.owner(()=>s.db.exec("update advisory.index_gate set token='11111111-1111-4111-8111-111111111111',lease_until=now()+interval '1 minute'"));
  await assert.rejects(s.db.exec(plan.sql),/INDEX_THROTTLED/);await s.db.exec('rollback');
  await s.owner(()=>s.db.exec('update advisory.index_gate set token=null,lease_until=null'));
  await s.owner(()=>s.db.exec('update advisory.index_jobs set expected_count=null'));
  await assert.rejects(s.db.exec(plan.sql),/CHECKPOINT_CHANGED/);await s.db.exec('rollback');
  await s.owner(()=>s.db.query('update advisory.index_jobs set expected_count=$1',[summary.count]));
  await assert.rejects(s.db.exec(plan.sql.replace('reset role;','select 1/0;reset role;')),/division by zero/);await s.db.exec('rollback');
  assert.equal((await s.job()).processed,6);assert.deepEqual(await s.acl(),{can_set:false,memberships:1});
  await s.db.exec(plan.sql);assert.equal((await s.job()).processed,12);assert.deepEqual(await s.acl(),{can_set:false,memberships:1});
  await s.advance();
  const restored=await s.owner(()=>createIndexWorker({transaction:s.db.transaction.bind(s.db)}).rollback(a.approval.jobId));assert.equal(restored.restored,6);
  assert.equal((await s.job()).status,'rolling_back');
 }finally{await s.db.close();}
});
test('final short batch requires fresh whole-manifest attestation before declaring complete',async()=>{
 const ids=manifest.ids.slice(0,11),m={...manifest,ids,identity_count:11,last_id:ids.at(-1),identity_sha256:createHash('sha256').update(ids.join('\n')).digest('hex')};
 const a=input(6,m),s=await setup(a);
 try{const plan=prepareContinuationBatch(a);assert.equal(plan.ids.length,5);await s.db.exec(plan.sql);const job=await s.job();assert.equal(job.processed,11);assert.equal(job.complete,true);assert.equal(job.status,'exhausted');}finally{await s.db.close();}
});
