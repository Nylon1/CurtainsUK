import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {prepareFirstBatch} from '../first-batch-plan.mjs';
import {prepareEligibleManifest,validateEligibleManifest} from '../eligible-manifest.mjs';
import {validateSourceManifest} from '../source-manifest.mjs';
import {prepareEligibleBatch,verifyEligibleResult,evidenceHash} from '../eligible-plan.mjs';
import {runEligibleInvocation,runEligiblePopulation} from '../eligible-runner.mjs';
import {createEligibleTransport} from '../eligible-transport.mjs';
import {safeKnowledge} from '../catalogue.mjs';
import {indexTerms} from '../knowledge-search.mjs';
import {OVERNIGHT_HOST_APPROVAL} from '../host-window-policy.mjs';
const captured=JSON.parse(await readFile(new URL('../../../artifacts/jane-first-index-batch-20261011/source.json',import.meta.url),'utf8'));
const oldManifest=JSON.parse(await readFile(new URL('../../../artifacts/jane-pro-readiness-20261011/source-manifest.json',import.meta.url),'utf8'));
const projectRef=oldManifest.projectRef,bundleHash='a'.repeat(64),implementationSha256='b'.repeat(64);
const digest=ids=>createHash('sha256').update(ids.join('\n')).digest('hex');
function fixture(count=123){
 const now=Date.now()+2000,stamp=new Date(now).toISOString(),oldId=randomUUID(),jobId=randomUUID();
 const ids=[...captured.records.slice(1).map(r=>r.fabric_id),...Array.from({length:count-5},(_,i)=>'synthetic-'+String(i).padStart(5,'0'))];
 const manifest=prepareEligibleManifest({policySha256:implementationSha256,candidates:{projectRef,ids,identity_count:count,identity_sha256:digest(ids),observed_at:stamp},publication:{classification:'PUBLICATION_RECONCILIATION_NOT_EXECUTION_APPROVAL',observedAt:stamp,candidateAndPublishedIds:ids,candidateAndPublishedCount:count,candidateAndPublishedSha256:digest(ids),unmappedUrls:[],receipts:[{url:'https://www.curtainsuk.com/sitemap_metaobject_pages_1.xml',status:200,sha256:implementationSha256}]}});
 const s=validateEligibleManifest(manifest);
 const historical={job:{id:oldId,processed:6,indexed:6,batches:1,complete:false,status:'ready',failures:0,source_snapshot:validateSourceManifest(oldManifest).snapshot,updated_at:new Date(now-2000).toISOString()},rows:captured.records.map(r=>({fabric_id:r.fabric_id,source_hash:indexTerms(safeKnowledge(r,r.visual,r.profile)).hash})),items:[]};
 historical.items=historical.rows.map(r=>({job_id:oldId,fabric_id:r.fabric_id,after_hash:r.source_hash,before_row:null,rolled_back:false}));
 const approval={approved:true,projectRef,schema:'advisory',purpose:'bounded-advisory-index-only',ownerApprovalReference:'LOCAL SYNTHETIC ONLY',sourceAttestationReference:'LOCAL SYNTHETIC ONLY',jobId,bundleHash,implementationSha256,sourceSnapshot:s.snapshot,expectedCount:count,maxBatches:20,expiresAt:new Date(now+3600000).toISOString(),eligiblePopulation:{startOffset:0,endOffset:count,canaryEnd:Math.min(120,count),historicalJobId:oldId,historicalSha256:evidenceHash(historical),unchangedIds:ids.slice(0,5)},temporaryRoleUse:{approved:true,member:'postgres',role:'advisory_indexer',grantor:'postgres',scope:'same-transaction-revoke-before-commit',ownerApprovalReference:'LOCAL SYNTHETIC ONLY'}};
 const canary={jobId,sourceSnapshot:s.snapshot,processed:Math.min(120,count),healthy:true,permissionRestored:true,historicalPreserved:true,exactHashes:true,publicationUnchanged:true,retailExclusionsVerified:true,newRows:Math.min(120,count)-5,evidenceReference:'LOCAL SYNTHETIC ONLY'};
 const records=ids.map(id=>structuredClone(captured.records.find(r=>r.fabric_id===id)??{fabric_id:id,colour_name:'Ivory',fabric_designs:{display_name:'Synthetic linen'}}));
 const input={manifest,approval,bundleHash,implementationSha256,historical,now,canary:null,checkpoint:{projectRef,observed_at:stamp,job:null},source:{projectRef,observed_at:stamp,records:records.slice(0,6)},attestation:{projectRef,observed_at:stamp,snapshot:s.snapshot,policySha256:manifest.policySha256,sourceUnchanged:true,publicationUnchanged:true,eligibleIds:ids.slice(0,6)},resources:{projectRef,source:'trusted-operator-telemetry',observedAt:now,windowMs:30000,cpuPercent:10,ioPercent:1,memoryPercent:62,diskPercent:50,connections:16,maxConnections:60,lockWaits:0,newDeadlocks:0,newDatabaseErrors:0,supplierRefreshActive:false},prerequisites:{projectRef,observedAt:stamp,backup:{completedAt:new Date(now-1000).toISOString(),recoverable:true,reference:'LOCAL SYNTHETIC BACKUP',recoveryOperator:'LOCAL TEST OPERATOR',acceptedRpoSeconds:86400},operatorAccess:{verified:true,exposedCredentialsRetired:true,reference:'LOCAL SYNTHETIC ACCESS'}}};
 return {input,records,canary};
}
async function setup(){
 const f=fixture(),a=f.input,db=new PGlite();
 await db.exec('create role anon;create role authenticated;create role service_role;');
 await db.exec(await readFile(new URL('../../../supabase/migrations/20261011142747_jane_isolated_advisory.sql',import.meta.url),'utf8'));
 const now=Date.now(),m=validateSourceManifest(oldManifest);
 await db.exec(prepareFirstBatch({manifest:oldManifest,source:{...captured,observed_at:new Date(now).toISOString()},attestation:{...oldManifest,observed_at:new Date(now).toISOString(),inventory_complete:true},approval:{...a.approval,jobId:a.historical.job.id,sourceSnapshot:m.snapshot,expectedCount:m.count,maxBatches:1,temporaryRoleUse:undefined},resources:{...a.resources,observedAt:now},bundleHash,now}).sql);
 const raw=async(sql,params=[])=>(await db.query(sql,params)).rows[0].value;
 const history=()=>raw("select jsonb_build_object('job',(select to_jsonb(j) from advisory.index_jobs j where id=$1),'items',(select jsonb_agg(to_jsonb(i) order by fabric_id) from advisory.index_job_items i where job_id=$1),'rows',(select jsonb_agg(to_jsonb(k) order by fabric_id) from advisory.knowledge_search k where fabric_id=any($2))) as value",[a.historical.job.id,captured.records.map(r=>r.fabric_id)]);
 a.historical=await history();a.approval.eligiblePopulation.historicalSha256=evidenceHash(a.historical);
 a.now=Date.now()+2000;a.prerequisites.backup.completedAt=new Date(a.now-1000).toISOString();
 await db.exec("update advisory.index_gate set next_at='-infinity';create role local_setup superuser;set session authorization local_setup;alter role postgres rename to supabase_admin;create role postgres nosuperuser createrole;set session authorization supabase_admin;grant advisory_indexer to postgres with admin true,inherit false,set false granted by supabase_admin;set session authorization postgres;");
 const owner=async fn=>{await db.exec('set session authorization supabase_admin');try{return await fn();}finally{await db.exec('set session authorization postgres');}};
 const job=()=>owner(()=>raw('select (select to_jsonb(j) from advisory.index_jobs j where id=$1) as value',[a.approval.jobId]));
 const readBack=async plan=>({job:await job(),historical:await owner(history),permissionRestored:(await db.query("select not pg_has_role('postgres','advisory_indexer','SET') and (select count(*) from pg_auth_members where roleid='advisory_indexer'::regrole)=1 as ok")).rows[0].ok,items:await owner(async()=>(await db.query('select k.fabric_id as id,k.source_hash as hash,i.after_hash as "receiptHash",i.before_row as "beforeRow",i.rolled_back as "rolledBack",i.fields from advisory.knowledge_search k join advisory.index_job_items i using(fabric_id) where i.job_id=$1 and k.fabric_id=any($2)',[a.approval.jobId,plan.ids])).rows)});
 const next=async()=>{const offset=(await job())?.processed??0;a.checkpoint.job=await job();a.source.records=f.records.slice(offset,offset+6);a.attestation.eligibleIds=a.manifest.ids.slice(offset,offset+6);return prepareEligibleBatch(a);};
 return {...f,db,owner,job,readBack,next};
}

test('120-second exception is bound to the approved eligible snapshot and keeps 60-second freshness',async()=>{
 const {input:a}=fixture();
 a.manifest=JSON.parse(await readFile(new URL('../../../artifacts/jane-eligible-scope-20261011/eligible-manifest.json',import.meta.url),'utf8'));
 const s=validateEligibleManifest(a.manifest),ids=a.manifest.ids.slice(0,6);
 a.approval={...a.approval,expectedCount:s.count,sourceSnapshot:s.snapshot,hostMonitoringApproval:OVERNIGHT_HOST_APPROVAL,eligiblePopulation:{...a.approval.eligiblePopulation,endOffset:s.count}};
 a.source.records=ids.map(id=>structuredClone(captured.records.find(r=>r.fabric_id===id)??{fabric_id:id,colour_name:'Synthetic unknown'}));
 a.attestation={...a.attestation,snapshot:s.snapshot,policySha256:a.manifest.policySha256,eligibleIds:ids};
 a.resources.windowMs=120000;
 const plan=prepareEligibleBatch(a);assert.deepEqual(plan.ids,ids);assert.equal(plan.deadline,new Date(a.now+60000).toISOString());
 assert.throws(()=>prepareEligibleBatch({...a,approval:{...a.approval,hostMonitoringApproval:undefined}}),/WINDOW_REQUIRED/);
 assert.throws(()=>prepareEligibleBatch({...a,resources:{...a.resources,windowMs:120001}}),/WINDOW_REQUIRED/);
 assert.throws(()=>prepareEligibleBatch({...a,resources:{...a.resources,observedAt:a.now-60001}}));
 assert.throws(()=>prepareEligibleBatch({...a,approval:{...a.approval,hostMonitoringApproval:{...OVERNIGHT_HOST_APPROVAL,sourceSnapshot:'another-snapshot'}}}),/APPROVAL_REQUIRED/);
});

test('eligible admission blocks stale backup, missing operator, hourly telemetry, source drift and changed no-op data',()=>{
 const {input:a}=fixture();assert.equal(prepareEligibleBatch(a).items.filter(i=>i.beforeRow).length,5);
 for(const changed of [
  {prerequisites:{...a.prerequisites,backup:{...a.prerequisites.backup,completedAt:a.historical.job.updated_at}}},
  {prerequisites:{...a.prerequisites,backup:{...a.prerequisites.backup,recoveryOperator:''}}},
  {prerequisites:{...a.prerequisites,operatorAccess:{...a.prerequisites.operatorAccess,exposedCredentialsRetired:false}}},
  {resources:{...a.resources,windowMs:3600000}},{resources:{...a.resources,supplierRefreshActive:true}},
  {resources:{...a.resources,newDatabaseErrors:1}},{attestation:{...a.attestation,publicationUnchanged:false}},
  {attestation:{...a.attestation,observed_at:new Date(a.now-60001).toISOString()}},
  {source:{...a.source,records:[...a.source.records].reverse()}},
  {source:{...a.source,records:a.source.records.map((r,i)=>i===0?{...r,colour_name:'changed'}:r)}},
  {approval:{...a.approval,maxBatches:21}},{checkpoint:{...a.checkpoint,job:{cursor:null}}}
 ])assert.throws(()=>prepareEligibleBatch({...a,...changed}));
});

test('actual SQL creates separate job, verifies five no-ops, enforces canary and preserves historical rows and role grants',async()=>{
 const f=await setup(),a=f.input;
 try{
  const first=await f.next();
  await assert.rejects(f.db.exec(first.sql.replace('reset role;','select 1/0;reset role;')),/division by zero/);await f.db.exec('rollback');
  assert.equal(await f.job(),null);assert.equal((await f.db.query("select pg_has_role('postgres','advisory_indexer','SET') as ok")).rows[0].ok,false);
  await f.db.exec(first.sql);assert.equal(verifyEligibleResult(first,await f.readBack(first)).unchanged,5);
  await assert.rejects(f.db.exec(first.sql),/INDEX_THROTTLED/);await f.db.exec('rollback');
  await f.owner(()=>f.db.exec("update advisory.index_gate set next_at='-infinity'"));
  await assert.rejects(f.db.exec(first.sql),/BOOTSTRAP_STATE_CHANGED/);await f.db.exec('rollback');
  for(let n=1;n<20;n++){
   const plan=await f.next();await f.db.exec(plan.sql);verifyEligibleResult(plan,await f.readBack(plan));
   await f.owner(()=>f.db.exec("update advisory.index_gate set next_at='-infinity'"));
  }
  assert.equal((await f.job()).processed,120);await assert.rejects(f.next(),/VERIFIED_ELIGIBLE_CANARY_REQUIRED/);
  a.canary=f.canary;const last=await f.next();assert.equal(last.ids.length,3);await f.db.exec(last.sql);
  const back=await f.readBack(last);assert.equal(verifyEligibleResult(last,back).complete,true);
  assert.deepEqual(back.historical,a.historical);
  assert.equal(await f.owner(async()=>(await f.db.query('select count(*)::int as n from advisory.knowledge_search')).rows[0].n),124);
  assert.equal(await f.owner(async()=>(await f.db.query('select count(*)::int as n from advisory.index_job_items where job_id=$1 and before_row is not null',[a.approval.jobId])).rows[0].n),5);
  for(const change of [{permissionRestored:false},{historical:{...back.historical,rows:[]}},{items:back.items.slice(1)}])assert.throws(()=>verifyEligibleResult(last,{...back,...change}),/OUTCOME_REQUIRES_REVIEW/);
 }finally{await f.db.close();}
});

test('historical drift, collision and active lease roll back eligible SQL without granting lasting access',async()=>{
 const f=await setup();
 try{
  const plan=await f.next();
  await f.owner(()=>f.db.query('update advisory.index_jobs set failures=1 where id=$1',[f.input.historical.job.id]));
  await assert.rejects(f.db.exec(plan.sql),/HISTORICAL_JOB_CHANGED/);await f.db.exec('rollback');
  await f.owner(()=>f.db.query('update advisory.index_jobs set failures=0 where id=$1',[f.input.historical.job.id]));
  await f.owner(()=>f.db.exec("update advisory.index_gate set token='11111111-1111-4111-8111-111111111111',lease_until=now()+interval '1 minute'"));
  await assert.rejects(f.db.exec(plan.sql),/INDEX_THROTTLED/);await f.db.exec('rollback');
  await f.owner(()=>f.db.exec('update advisory.index_gate set token=null,lease_until=null'));
  await f.owner(()=>f.db.query("insert into advisory.knowledge_search(fabric_id,document,colour,pattern,texture,composition,source_hash) values($1,'','','','','','unreviewed')",[plan.ids[5]]));
  await assert.rejects(f.db.exec(plan.sql),/duplicate key/);await f.db.exec('rollback');
  assert.equal(await f.job(),null);assert.equal((await f.db.query("select pg_has_role('postgres','advisory_indexer','SET') as ok")).rows[0].ok,false);
 }finally{await f.db.close();}
});

test('combined transport executes real eligible transaction and observes restored grants after COMMIT',async()=>{
 const f=await setup();
 try{
  const p=await f.next(),wire=[];
  const transport=createEligibleTransport({writeAhead:async e=>wire.push(e),
   readbackSql:()=>"begin read only;set local statement_timeout='3s';select jsonb_build_object('restored',not pg_has_role('postgres','advisory_indexer','SET')) as value;commit;",
   execute:async sql=>{const results=await f.db.exec(sql);return results.find(r=>r.rows?.[0]?.value)?.rows[0].value;}});
  transport.prepared(p);await transport.submit(p.sql);
  assert.equal((await transport.readBack(p)).restored,true);
  assert.equal(verifyEligibleResult(p,await f.readBack(p)).processed,6);
  assert.equal(wire.length,1);assert.ok(wire[0].sql.startsWith(p.sql+'\nbegin read only;'));
 }finally{await f.db.close();}
});

function runner(count=123){
 const f=fixture(count),a=f.input;let time=a.now,pending=null,job=null,committed=null,writes=0,held=false,canary=null,assessments=0;const progress=[];
 const options={...a,now:()=>time,journal:{exclusive:async fn=>{if(held)throw Error('operator locked');held=true;try{return await fn();}finally{held=false;}},pending:async()=>pending,prepared:async p=>{assert.equal(pending,null);pending=structuredClone(p);},verified:async p=>{assert.equal(p.sqlSha256,pending.sqlSha256);pending=null;}},
  wait:async ms=>{assert.equal(ms,5000);time+=ms;},readCheckpoint:async()=>({projectRef,observed_at:new Date(time).toISOString(),job:structuredClone(job)}),
  measure:async()=>({...a.resources,observedAt:time}),readPrerequisites:async()=>({...a.prerequisites,observedAt:new Date(time).toISOString()}),
  readCanary:async()=>canary,recordCanary:async r=>{canary=r;},assessCanary:async()=>{assessments++;assert.equal(writes,20);return f.canary;},
  onProgress:async p=>progress.push(p.processed),
  readBatch:async({checkpoint})=>{const offset=checkpoint.job?.processed??0;return {source:{projectRef,observed_at:new Date(time).toISOString(),records:f.records.slice(offset,offset+6)},attestation:{...a.attestation,observed_at:new Date(time).toISOString(),eligibleIds:a.manifest.ids.slice(offset,offset+6)}};},
  submit:async sql=>{assert.equal(sql,pending.sql);writes++;committed=structuredClone(pending);job={id:committed.jobId,source_snapshot:committed.sourceSnapshot,expected_count:committed.expectedCount,cursor:committed.cursor,processed:committed.cursor.offset,indexed:committed.cursor.offset,batches:Math.ceil(committed.cursor.offset/6),status:committed.complete?'exhausted':'ready',complete:committed.complete,failures:0};time+=10;},
  readBack:async()=>({job:structuredClone(job),historical:a.historical,permissionRestored:true,items:(committed?.items??[]).map(i=>({...i,receiptHash:i.hash,rolledBack:false}))})};
 return {options,progress,advanceTime:ms=>{time+=ms;},state:()=>({writes,pending,job,assessments})};
}

test('complete source, submission and readback duration still stops at ten seconds after verified commit',async()=>{
 const f=runner(),read=f.options.readBatch,submit=f.options.submit,back=f.options.readBack;
 f.options.readBatch=async p=>{f.advanceTime(3000);return read(p);};
 f.options.submit=async sql=>{f.advanceTime(3990);return submit(sql);};
 f.options.readBack=async p=>{f.advanceTime(3000);return back(p);};
 await assert.rejects(runEligibleInvocation(f.options),/INDEX_BATCH_LATENCY_STOP/);
 assert.equal(f.state().writes,1);assert.equal(f.state().job.processed,6);assert.equal(f.state().pending,null);
});

test('read-only pacing precedes fresh checkpoint and source evidence, and a pacing failure submits nothing',async()=>{
 const f=runner(6);let paced=false;const checkpoint=f.options.readCheckpoint;
 f.options.beforeAdmission=async()=>{f.advanceTime(70000);paced=true;};
 f.options.readCheckpoint=async()=>{assert.ok(paced);return checkpoint();};
 assert.equal((await runEligibleInvocation(f.options)).reason,'complete');assert.equal(f.state().writes,1);
 const g=runner();g.options.beforeAdmission=async()=>{throw Error('pacing stopped');};
 await assert.rejects(runEligibleInvocation(g.options),/pacing stopped/);assert.equal(g.state().writes,0);
});

test('one approval completes synthetic 11517 manifest in bounded invocations and reports every 1000',async()=>{
 const f=runner(11517);f.options.approval.expiresAt=new Date(f.options.now()+8*3600000).toISOString();
 const result=await runEligiblePopulation(f.options);
 assert.equal(result.complete,true);assert.equal(result.results.length,96);assert.equal(f.state().writes,1920);assert.equal(f.state().assessments,1);
 assert.ok(result.results.every(r=>r.receipts.length<=20));assert.deepEqual(f.progress,[1002,2004,3000,4002,5004,6000,7002,8004,9000,10002,11004,11517]);
 assert.equal(f.state().job.processed,11517);assert.equal(f.state().pending,null);
});

test('lost commit recovers exact readback without duplicate submission; uncommitted ambiguity stays stopped',async()=>{
 const f=runner(),submit=f.options.submit;let once=true;f.options.submit=async sql=>{await submit(sql);if(once){once=false;throw Error('lost commit response');}};
 await assert.rejects(runEligibleInvocation(f.options),/lost commit response/);
 const resumed=await runEligibleInvocation(f.options);assert.equal(resumed.receipts[0].recovered,true);assert.equal(f.state().writes,20);assert.equal(resumed.reason,'canary-review-required');
 const g=runner();g.options.submit=async()=>{throw Error('uncommitted transport failure');};
 await assert.rejects(runEligibleInvocation(g.options),/transport failure/);
 await assert.rejects(runEligibleInvocation(g.options),/OUTCOME_REQUIRES_REVIEW/);assert.equal(g.state().writes,0);assert.ok(g.state().pending);
});

test('unhealthy canary, missing backup, load and permission failures stop automatically without retries',async()=>{
 const f=runner();f.options.assessCanary=async()=>({healthy:false});await assert.rejects(runEligiblePopulation(f.options),/CANARY_REQUIRED/);assert.equal(f.state().writes,20);
 const g=runner();g.options.readPrerequisites=async()=>({});await assert.rejects(runEligiblePopulation(g.options),/PREREQUISITES_REQUIRED/);assert.equal(g.state().writes,0);
 const h=runner(),measure=h.options.measure;let samples=0;h.options.measure=async()=>({...await measure(),cpuPercent:++samples>1?80:10});await assert.rejects(runEligiblePopulation(h.options),/RESOURCE_STOP/);assert.equal(h.state().writes,1);
 const i=runner(),readBack=i.options.readBack;i.options.readBack=async()=>({...await readBack(),permissionRestored:false});await assert.rejects(runEligiblePopulation(i.options),/OUTCOME_REQUIRES_REVIEW/);assert.equal(i.state().writes,1);assert.ok(i.state().pending);
});

test('second operator is excluded and altered implementation or journal cannot submit a batch',async()=>{
 const f=runner();let entered,release;const ready=new Promise(r=>{entered=r;}),blocked=new Promise(r=>{release=r;});
 const read=f.options.readPrerequisites;f.options.readPrerequisites=async()=>{entered();await blocked;return read();};
 const first=runEligibleInvocation(f.options);await ready;
 await assert.rejects(runEligibleInvocation(f.options),/operator locked/);release();await first;assert.equal(f.state().writes,20);
 const g=runner();await assert.rejects(runEligibleInvocation({...g.options,implementationSha256:'c'.repeat(64)}),/IMPLEMENTATION_MISMATCH/);assert.equal(g.state().writes,0);
 const h=runner(),submit=h.options.submit;h.options.submit=async sql=>{await submit(sql);throw Error('lost response');};
 await assert.rejects(runEligibleInvocation(h.options),/lost response/);h.state().pending.sql+='-- tampered';
 await assert.rejects(runEligibleInvocation(h.options),/JOURNAL_REQUIRES_REVIEW/);assert.equal(h.state().writes,1);
});
