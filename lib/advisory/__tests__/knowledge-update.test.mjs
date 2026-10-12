import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {safeKnowledge} from '../catalogue.mjs';
import {createKnowledgeIndex,indexTerms} from '../knowledge-search.mjs';
import {createKnowledgeUpdateWorker} from '../knowledge-update-worker.mjs';
import {createExistingChangeReader,prepareUpdateManifest,reconcileKnowledgeSnapshot,requireUpdateCatchup,REQUIRED_UPDATE_COVERAGE} from '../knowledge-update-source.mjs';

const projectRef='hqysjumypgeapgmqkcrx',h='a'.repeat(64),from='2026-10-11T18:55:39.000Z',through='2026-10-12T19:00:00.000Z';
const event=(fabricId,sourceId=fabricId)=>({source:'catalogue',sourceId,fabricId,evidenceSha256:h,effect:'recheck'});
const manifest=events=>prepareUpdateManifest({projectRef,windowId:randomUUID(),from,through,closureSha256:h,events});
const safe=(id,colour='Warm ivory')=>safeKnowledge({fabric_id:id,colour_name:colour,fabric_designs:{display_name:'Woven',composition:[{material:'linen'}]}},null,null);
const current=(id,colour)=>({id,projectRef,identityVerified:true,projectionsReady:true,observedAt:new Date().toISOString(),sourceRevision:h,state:'eligible',record:safe(id,colour)});

test('change manifests deduplicate exact evidence, reject collisions and coalesce tied/out-of-order events by identity',()=>{
 const a=event('fabric-1','later'),b=event('fabric-1','earlier'),c=event('fabric-2');
 const input={projectRef,windowId:'same-window',from,through,closureSha256:h};
 const m=prepareUpdateManifest({...input,events:[a,c,b,a]});
 assert.deepEqual(m.ids,['fabric-1','fabric-2']);assert.equal(m.references.length,3);assert.equal(m.scheduleEnabled,false);
 assert.equal(m.hash,prepareUpdateManifest({...input,events:[b,a,c]}).hash);
 assert.throws(()=>manifest([a,{...a,evidenceSha256:'b'.repeat(64)}]),/CHANGE_EVIDENCE_CONFLICT/);
 assert.throws(()=>manifest(Array.from({length:121},(_,i)=>event('fabric-'+i))),/INVALID_UPDATE_MANIFEST/);
 assert.throws(()=>prepareUpdateManifest({...input,projectRef:'another-project',events:[a]}),/INVALID_UPDATE_MANIFEST/);
 const noops=manifest([{...a,effect:'ignore'}]);assert.deepEqual(noops.ids,[]);
});

test('reconciliation includes additions, changed hashes and withdrawals without rebuilding unchanged identities',()=>{
 const proof={projectRef,complete:true,identityVerified:true,projectionsReady:true,evidenceSha256:h,from,through};
 const baseline=[{id:'same',sourceHash:h},{id:'changed',sourceHash:h},{id:'withdrawn',sourceHash:h}];
 const after=[{id:'same',sourceHash:h},{id:'changed',sourceHash:'b'.repeat(64)},{id:'added',sourceHash:h}];
 const result=reconcileKnowledgeSnapshot({baseline,current:after,proof});
 assert.deepEqual(result.added,['added']);assert.deepEqual(result.changed,['changed']);assert.deepEqual(result.withdrawn,['withdrawn']);assert.equal(result.unchanged,1);assert.equal(result.hostedWrites,0);assert.equal(result.authoritativeDeletion,false);
 assert.throws(()=>reconcileKnowledgeSnapshot({baseline,current:[],proof:{...proof,complete:false}}),/RECONCILIATION_PROOF_REQUIRED/);
 assert.throws(()=>reconcileKnowledgeSnapshot({baseline,current:[...after,after[0]],proof}),/INVALID_RECONCILIATION_INPUT/);
});

test('launch/recommendation barrier requires coverage spanning changes made during initial population',()=>{
 const population={populationStartedAt:from,populationCompletedAt:through};
 const proof={projectRef,evidenceSha256:h,complete:true,projectionsReady:true,pendingChanges:0,unresolved:0,from,through,observedAt:through,coverage:Object.fromEntries(REQUIRED_UPDATE_COVERAGE.map(k=>[k,true]))};
 const at=Date.parse(through);
 assert.equal(requireUpdateCatchup(proof,population,at).launchApproved,false);
 for(const key of REQUIRED_UPDATE_COVERAGE)assert.throws(()=>requireUpdateCatchup({...proof,coverage:{...proof.coverage,[key]:false}},population,at),/UPDATE_CATCHUP_INCOMPLETE/);
 assert.throws(()=>requireUpdateCatchup({...proof,from:through},population,at),/UPDATE_CATCHUP_INCOMPLETE/);
 assert.throws(()=>requireUpdateCatchup({...proof,through:from},population,at),/UPDATE_CATCHUP_INCOMPLETE/);
 assert.throws(()=>requireUpdateCatchup({...proof,pendingChanges:1},population,at),/UPDATE_CATCHUP_INCOMPLETE/);
 assert.throws(()=>requireUpdateCatchup(proof,population,at+60001),/UPDATE_CATCHUP_INCOMPLETE/);
});

test('existing history readers execute bounded primary-key SQL and never read normalized/cost payloads',async()=>{
 const db=new PGlite();try{
  await db.exec(`create schema curtainsuk_private;
   create table curtainsuk_private.fabric_catalogue_observations(observation_id text primary key,fabric_id text,import_id text,merge_action text,lifecycle_state text,history_complete boolean,public_record_sha256 text,normalized_record jsonb);
   create table curtainsuk_private.fabric_hybrid_registration_events(event_id bigint primary key,fabric_id text,registration_id uuid,event_kind text,source_document_sha256 text);`);
  await db.query('insert into curtainsuk_private.fabric_catalogue_observations values($1,$2,$3,$4,$5,true,$6,$7)',['obs-1','fabric-1','run-1','UPDATE','DISCONTINUED',h,{wholesale_price:99}]);
  await db.query('insert into curtainsuk_private.fabric_hybrid_registration_events values(1,$1,$2,$3,$4)',['fabric-2',randomUUID(),'RETIRED',h]);
  const reader=createExistingChangeReader({query:db.query.bind(db)});
  const r=await reader.read('catalogue',['obs-1']);assert.equal(r[0].effect,'recheck');assert.doesNotMatch(JSON.stringify(r),/wholesale|99|normalized/);
  const v=await reader.read('hybrid',['1']);assert.equal(v[0].effect,'recheck');assert.equal(v[0].fabricId,'fabric-2');
  await assert.rejects(reader.read('catalogue',['missing']),/INCOMPLETE_CHANGE_HISTORY/);
  await assert.rejects(reader.read('hybrid',['1;delete']),/INVALID_CHANGE_RECORD_REQUEST/);
  await assert.rejects(reader.read('catalogue',Array(7).fill('obs-1')),/INVALID_CHANGE_RECORD_REQUEST/);
  await assert.rejects(reader.read('browse_projection_dirty',['obs-1']),/INVALID_CHANGE_RECORD_REQUEST/);
  await db.exec("update curtainsuk_private.fabric_catalogue_observations set history_complete=false");
  await assert.rejects(reader.read('catalogue',['obs-1']),/INCOMPLETE_CHANGE_HISTORY/);
 }finally{await db.close();}
});

test('disabled update connection and actual local PostgreSQL transaction/concurrency checks',async t=>{
 const db=new PGlite(),populationJob=randomUUID();let readOverride=null,verify=true,admission=true;
 const transactions=fn=>db.transaction(fn);
 const worker=(enabled=true)=>createKnowledgeUpdateWorker({transaction:transactions,enabled,admit:async()=>{if(!admission)throw Error('RESOURCE_STOP');return true;},readCurrent:async ids=>readOverride?readOverride(ids):ids.map(id=>current(id)),verifyCurrent:async()=>verify});
 const approval=m=>({projectRef,manifestHash:m.hash,approved:true,expiresAt:new Date(Date.now()+3600000).toISOString(),populationJob});
 const register=async ids=>{const m=manifest(ids.map(id=>event(id))),a=approval(m),r=await worker().register(m,a);return {...r,m,a};};
 const openGate=()=>db.exec("update advisory.index_gate set next_at='-infinity'");
 const job=async id=>(await db.query('select * from advisory.knowledge_update_jobs where id=$1',[id])).rows[0];
 try{
  await db.exec('create schema advisory;create role anon;create role authenticated;create role service_role;create role advisory_indexer;');
  for(const f of ['search.review.sql','index-worker.review.sql','knowledge-update.review.sql'])await db.exec(await readFile(new URL('../'+f,import.meta.url),'utf8'));
  await db.query("insert into advisory.index_jobs(id,source_snapshot,expected_count,processed,complete,status) values($1,'synthetic-completed-population',1,1,true,'exhausted')",[populationJob]);
  await t.test('disabled by default and rejected before any transaction',async()=>{
   let calls=0;const w=createKnowledgeUpdateWorker({transaction:()=>{calls++;}}),m=manifest([event('x')]);
   await assert.rejects(w.register(m,approval(m)),/AUTOMATIC_UPDATES_DISABLED/);assert.equal(calls,0);
  });
  await t.test('cannot register while initial population is active',async()=>{
   await db.query('update advisory.index_jobs set complete=false where id=$1',[populationJob]);
   await assert.rejects(register(['early']),/POPULATION_NOT_FINISHED/);
   await db.query('update advisory.index_jobs set complete=true where id=$1',[populationJob]);
  });
  await t.test('new identity, replayed registration and unchanged hash do not inflate or rewrite',async()=>{
   const j=await register(['new']);assert.equal((await worker().register(j.m,j.a)).jobId,j.jobId);
   assert.equal((await worker().step(j.jobId,j.a)).changed,1);await openGate();
   assert.equal((await worker().step(j.jobId,j.a)).replayed,true);
   const before=(await db.query("select indexed_at from advisory.knowledge_search where fabric_id='new'")).rows[0].indexed_at;
   const second=await register(['new']);const r=await worker().step(second.jobId,second.a);assert.equal(r.changed,0);
   assert.equal((await db.query("select indexed_at from advisory.knowledge_search where fabric_id='new'")).rows[0].indexed_at.getTime(),before.getTime());await openGate();
  });
  await t.test('changed source refreshes only relevant search terms and preserves historical receipts',async()=>{
   const j=await register(['new']);readOverride=ids=>ids.map(id=>current(id,'Muted olive'));
   const r=await worker().step(j.jobId,j.a);assert.equal(r.changed,1);
   const receipt=(await db.query('select * from advisory.knowledge_update_receipts where job_id=$1',[j.jobId])).rows[0];assert.equal(receipt.outcome,'update');assert.ok(receipt.before_row.document.includes('ivori'));
   assert.equal((await db.query('select count(*)::int as n from advisory.knowledge_update_receipts')).rows[0].n,3);
   readOverride=null;await openGate();
  });
  await t.test('verified withdrawal removes search entry and re-entry restores it',async()=>{
   const j=await register(['new']);readOverride=ids=>ids.map(id=>({...current(id),state:'withdrawn',record:null,authoritativeAbsence:true}));
   assert.equal((await worker().step(j.jobId,j.a)).removed,1);await openGate();
   assert.equal((await db.query("select count(*)::int as n from advisory.knowledge_search where fabric_id='new'")).rows[0].n,0);
   readOverride=null;const again=await register(['new']);assert.equal((await worker().step(again.jobId,again.a)).changed,1);await openGate();
  });
  await t.test('empty response, timeout/error and unverified absence never delete or advance',async()=>{
   const j=await register(['new']);
   for(const read of [()=>[],()=>{throw Error('UPSTREAM_FAILED');},ids=>ids.map(id=>({...current(id),state:'deleted',record:null}))]){
    readOverride=read;await assert.rejects(worker().step(j.jobId,j.a));assert.equal((await job(j.jobId)).cursor,0);await openGate();
   }
   assert.equal((await db.query("select count(*)::int as n from advisory.knowledge_search where fabric_id='new'")).rows[0].n,1);readOverride=null;
  });
  await t.test('stale projection, unknown eligibility and stale source revision block writes',async()=>{
   const j=await register(['stale']);
   for(const patch of [{projectionsReady:false},{state:'unknown'},{observedAt:new Date(Date.now()-61000).toISOString()},{record:{id:'stale',purchasable:true}}]){
    readOverride=ids=>ids.map(id=>({...current(id),...patch}));await assert.rejects(worker().step(j.jobId,j.a));assert.equal((await job(j.jobId)).cursor,0);await openGate();
   }
   readOverride=null;verify=false;await assert.rejects(worker().step(j.jobId,j.a),/UPDATE_SOURCE_CHANGED/);verify=true;await openGate();
  });
  await t.test('two worker instances cannot overlap while one holds shared gate',async()=>{
   const j=await register(['concurrent']);let resolve,started;const ready=new Promise(r=>started=r);
   readOverride=ids=>new Promise(r=>{resolve=()=>r(ids.map(id=>current(id)));started();});
   const first=worker().step(j.jobId,j.a);await ready;
   await assert.rejects(worker().step(j.jobId,j.a),/INDEX_THROTTLED/);resolve();assert.equal((await first).changed,1);readOverride=null;await openGate();
  });
  await t.test('transaction interruption rolls back every update, receipt and cursor',async()=>{
   const j=await register(['atomic-1','atomic-2']);
   await db.exec("alter table advisory.knowledge_update_receipts add constraint synthetic_failure check(fabric_id<>'atomic-2')");
   await assert.rejects(worker().step(j.jobId,j.a));assert.equal((await job(j.jobId)).cursor,0);
   assert.equal((await db.query("select count(*)::int as n from advisory.knowledge_search where fabric_id like 'atomic-%'")).rows[0].n,0);
   assert.equal((await db.query('select count(*)::int as n from advisory.knowledge_update_receipts where job_id=$1',[j.jobId])).rows[0].n,0);
   await db.exec('alter table advisory.knowledge_update_receipts drop constraint synthetic_failure');await openGate();
   assert.equal((await worker().step(j.jobId,j.a)).changed,2);await openGate();
  });
  await t.test('permission denial and unchanged source systems',async()=>{
   await db.exec('grant usage on schema advisory to anon,authenticated,advisory_indexer');
   for(const role of ['anon','authenticated','service_role']){
    await db.exec('set role '+role);await assert.rejects(db.query('select * from advisory.knowledge_update_jobs'));await db.exec('reset role');
   }
   await db.exec('set role advisory_indexer');assert.ok((await db.query('select * from advisory.knowledge_update_jobs')).rows.length>0);
   await assert.rejects(db.query('delete from advisory.knowledge_update_receipts'));await db.exec('reset role');
   assert.equal((await db.query('select processed from advisory.index_jobs where id=$1',[populationJob])).rows[0].processed,1);
  });
  await t.test('120 identities use at most 20 six-record steps with five-second shared pacing',async()=>{
   const j=await register(Array.from({length:120},(_,n)=>'bounded-'+n));const waits=[];
   const result=await worker().invoke(j.jobId,j.a,{wait:async ms=>{waits.push(ms);await openGate();}});
   assert.equal(result.length,20);assert.equal(result.at(-1).processed,120);assert.equal(result.at(-1).complete,true);assert.ok(result.every(r=>r.read===6));assert.ok(waits.every(ms=>ms===5000));assert.equal(waits.length,19);
   await assert.rejects(worker().invoke(j.jobId,j.a,{maxBatches:21}),/INDEX_INVOCATION_LIMIT/);await openGate();
  });
  await t.test('approval expiry and resource failure do not advance',async()=>{
   const j=await register(['guarded']);
   await assert.rejects(worker().step(j.jobId,{...j.a,expiresAt:from}),/UPDATE_APPROVAL_REQUIRED/);
   admission=false;await assert.rejects(worker().step(j.jobId,j.a),/RESOURCE_STOP/);admission=true;assert.equal((await job(j.jobId)).cursor,0);
  });
 }finally{await db.close();}
});
