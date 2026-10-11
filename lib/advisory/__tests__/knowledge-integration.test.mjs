import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {createKnowledgeIndex,indexTerms} from '../knowledge-search.mjs';
import {knowledgeQuery} from '../knowledge-query.mjs';
import {prepareKnowledgeChanges,createKnowledgeChangeSource,remainingPopulationPlan} from '../knowledge-changes.mjs';
import {createIndexWorker} from '../index-worker.mjs';
const projectRef='hqysjumypgeapgmqkcrx';
const event=(change={})=>({table:'fabric_designs',columns:['composition'],operation:'update',evidenceReference:'LOCAL SYNTHETIC publication receipt',evidenceSha256:'a'.repeat(64),projectionsReady:true,resolutionComplete:true,fabricIds:['test-olive'],...change});
const changeManifest=e=>prepareKnowledgeChanges({projectRef,events:e});
test('relevance uses actual indexed colour/tone/texture/pattern/composition and safe specifications',async()=>{
 const db=new PGlite();
 try{
  await db.exec('create schema advisory;create role anon;create role authenticated;create role service_role;');
  await db.exec(await readFile(new URL('../search.review.sql',import.meta.url),'utf8'));
  const index=createKnowledgeIndex({query:db.query.bind(db)});
  const records=[{id:'a-mention-only',description:'A collection with olive influences',colour:'Blue'},
   {id:'z-attribute-match',colour:'Olive',composition:[{material:'linen'}],visual:{colourTemperature:'warm',visualSurface:['matte woven'],patternClass:'plain'},fullWidthMm:1400,weightGsm:240,verticalRepeatMm:0},
   {id:'test-grey',colour:'Gray',visual:{visualSurface:['matt']},description:'Quiet neutral'},
   {id:'test-unknown',colour:null,visual:{},composition:[],weightGsm:null}];
  await index.updateBatch(records);
  const search=async(query,filters={})=>(await index.search({query,colour:'',pattern:'',texture:'',composition:'',...filters})).ids;
  assert.deepEqual(await search('olive'),['z-attribute-match','a-mention-only']);
  assert.deepEqual(await search('warm',{colour:'olive',pattern:'plain',texture:'matte',composition:'linen'}),['z-attribute-match']);
  for(const text of ['1400','240 gsm','0 mm vertical repeat'])assert.deepEqual(await search(text),['z-attribute-match']);
  assert.deepEqual(await search('grey'),['test-grey']);assert.deepEqual(await search('matte'),['test-grey','z-attribute-match']);
  for(const text of ['cotton','soundproof','unknown','the and','-olive'])assert.deepEqual(await search(text),[]);
  assert.deepEqual(await search('olive',{composition:'polyester'}),[]);
  assert.equal(knowledgeQuery('"warm grey" -blue'),'"warm grey" -blue');
  assert.doesNotMatch(JSON.stringify(indexTerms({...records[1],supplier_cost:999,price:800,stock:7})),/supplier_cost|price|stock/);
  const review=new URL('../../../artifacts/jane-knowledge-integration-20261011/',import.meta.url);
  const permissions=async()=>(await db.query("select proacl::text,prosecdef,proconfig from pg_proc where oid='advisory.search_knowledge(text,text,text,text,text)'::regprocedure")).rows[0];
  const originalPermissions=await permissions();assert.equal(originalPermissions.prosecdef,false);
  await db.exec(await readFile(new URL('ranking-review.sql',review),'utf8'));
  assert.deepEqual(await permissions(),originalPermissions);
  assert.deepEqual((await db.query("select fabric_id from advisory.search_knowledge('olive','','','','')")).rows.map(r=>r.fabric_id),await search('olive'));
  assert.deepEqual((await db.query("select fabric_id from advisory.search_knowledge('-olive','','','','')")).rows,[]);
  await db.exec(await readFile(new URL('ranking-rollback.sql',review),'utf8'));
  assert.deepEqual(await permissions(),originalPermissions);
  assert.deepEqual((await db.query("select fabric_id from advisory.search_knowledge('olive','','','','')")).rows.map(r=>r.fabric_id),['a-mention-only','z-attribute-match']);
 }finally{await db.close();}
});
test('change manifests exclude stock-only updates, deduplicate resolved dependencies and reject gaps/deletions',async()=>{
 const manifest=changeManifest([event(),event({table:'fabric_colourways',columns:['colour_name'],fabricIds:['test-olive','test-blue']}),event({table:'fabric_colourways',columns:['price_verification_status','updated_at']})]);
 assert.deepEqual(manifest.ids,['test-olive','test-blue']);assert.equal(manifest.ignoredEvents,1);assert.equal(manifest.approved,false);
 const source=createKnowledgeChangeSource({manifest,attest:async()=>({projectRef,changeHash:manifest.hash,evidenceVerified:true,projectionsReady:true,resolutionComplete:true,observed_at:new Date().toISOString()})});
 assert.equal(await source.verifySnapshot(source.snapshot),true);
 assert.deepEqual((await source.page({snapshot:source.snapshot})).ids,manifest.ids);
 assert.throws(()=>changeManifest([event({operation:'delete'})]),/TOMBSTONE/);
 assert.throws(()=>changeManifest([event({resolutionComplete:false})]),/RESOLUTION/);
 assert.throws(()=>changeManifest([event({projectionsReady:false})]),/RESOLUTION/);
 assert.throws(()=>changeManifest([event({table:'supplier_snapshots'})]),/INVALID/);
 assert.throws(()=>changeManifest([event({fabricIds:Array.from({length:121},(_,i)=>'test-'+i)})]),/RESOLUTION/);
 assert.throws(()=>createKnowledgeChangeSource({manifest:{...manifest,ids:['tampered']},attest:async()=>null}),/INTEGRITY/);
 assert.throws(()=>createKnowledgeChangeSource({manifest:null,attest:async()=>null}),/INTEGRITY/);
 await assert.rejects(source.page({snapshot:source.snapshot,cursor:{offset:0,changeHash:'foreign'}}),/CURSOR/);
 const stale=createKnowledgeChangeSource({manifest,attest:async()=>({projectRef,changeHash:manifest.hash,evidenceVerified:true,projectionsReady:true,resolutionComplete:true,observed_at:new Date(0).toISOString()})});
 assert.equal(await stale.verifySnapshot(stale.snapshot),false);
});
test('change-only refresh reuses transactional worker, skips unchanged vectors and recovers/rolls back safely',async()=>{
 const db=new PGlite();
 try{
  await db.exec('create role anon;create role authenticated;create role service_role;');
  await db.exec(await readFile(new URL('../../../supabase/migrations/20261011142747_jane_isolated_advisory.sql',import.meta.url),'utf8'));
  const index=createKnowledgeIndex({query:db.query.bind(db)});
  const before={id:'test-olive',colour:'olive',composition:[{material:'cotton'}]};await index.updateBatch([before,{id:'untouched',colour:'blue'}]);
  const untouched=(await db.query("select to_jsonb(k) value from advisory.knowledge_search k where fabric_id='untouched'")).rows[0].value;
  const manifest=changeManifest([event()]),source=createKnowledgeChangeSource({manifest,attest:async()=>({projectRef,changeHash:manifest.hash,evidenceVerified:true,projectionsReady:true,resolutionComplete:true,observed_at:new Date().toISOString()})});
  let reads=0,record=before;
  const worker=createIndexWorker({transaction:db.transaction.bind(db),catalogue:{lookupForIndex:async ids=>{assert.deepEqual(ids,['test-olive']);reads++;return [record];}},source});
  const job=async()=>{const id=randomUUID();await db.query('insert into advisory.index_jobs(id,source_snapshot,expected_count) values($1,$2,$3)',[id,source.snapshot,1]);await db.exec("update advisory.index_gate set next_at='-infinity'");return id;};
  const first=await job();assert.equal((await worker.step(first)).changed,0);await db.exec("update advisory.index_gate set next_at='-infinity'");assert.equal((await worker.step(first)).replayed,true);assert.equal(reads,1);
  record={...before,composition:[{material:'linen'}]};const second=await job();assert.equal((await worker.step(second)).changed,1);
  assert.equal((await db.query("select to_jsonb(k) value from advisory.knowledge_search k where fabric_id='untouched'")).rows[0].value.source_hash,untouched.source_hash);
  await db.exec("update advisory.index_gate set next_at='-infinity'");assert.equal((await worker.rollback(second)).complete,true);
  assert.equal((await db.query("select source_hash from advisory.knowledge_search where fabric_id='test-olive'")).rows[0].source_hash,indexTerms(before).hash);
  const failed=await job();record={id:'foreign'};await assert.rejects(worker.step(failed),/INCOMPLETE/);
  assert.equal((await db.query('select processed from advisory.index_jobs where id=$1',[failed])).rows[0].processed,0);
  record=before;await db.exec("update advisory.index_gate set next_at='-infinity'");assert.equal((await worker.step(failed)).changed,0);
 }finally{await db.close();}
});
test('remaining population is exactly 2813 batches, 141 invocations with a five-fabric final batch',()=>{
 const p=remainingPopulationPlan({total:16883,indexed:6});assert.equal(p.remaining,16877);assert.equal(p.batches,2813);assert.equal(p.invocations,141);assert.equal(p.finalBatchSize,5);assert.equal(p.pacingSeconds,14060);assert.equal(p.maximumNarrowFactRequests,8439);assert.equal(p.scheduleEnabled,false);
 assert.equal(remainingPopulationPlan({total:6,indexed:6}).batches,0);
});
