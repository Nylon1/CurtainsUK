import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID,randomBytes} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {createIndexWorker} from '../index-worker.mjs';
import {createCatalogue,safeKnowledge} from '../catalogue.mjs';
import {createKnowledgeIndex} from '../knowledge-search.mjs';
import {readIndexCoverage} from '../index-coverage.mjs';
import {createPrivateAdvisoryRpc} from '../private-rpc.mjs';
import {CloudSessionStore} from '../cloud-store.mjs';
import {createSessionCipher} from '../session-cipher.mjs';

test('existing-project bundle isolates roles, pooled owners, retention and throttled rollback',async()=>{
 const db=new PGlite(),a=randomUUID(),b=randomUUID();let at=Date.now(),inside=false;
 const next=()=>{at+=310000;};
 try{
  await db.exec("create role authenticated;create role anon;create role service_role bypassrls;create schema auth;create function auth.uid() returns uuid language sql stable as $$select null::uuid$$;");
  for(const f of ['schema','runtime','search','index-worker','operations'])await db.exec(await readFile(new URL('../'+f+'.review.sql',import.meta.url),'utf8'));
  // Same pooled backend, two verified owners. Runtime cannot inherit a previous
  // request's identity, write catalogue data or use the indexer/retention role.
  const transaction=fn=>db.transaction(async tx=>{await tx.exec('set local role advisory_runtime');return fn(tx);});
  const rpc=createPrivateAdvisoryRpc({transaction,projectRef:'hqysjumypgeapgmqkcrx'});
  const cipher=createSessionCipher({activeKeyId:'local',keys:{local:randomBytes(32)}});
  const ownerA=new CloudSessionStore({ownerId:a,rpc,cipher}),ownerB=new CloudSessionStore({ownerId:b,rpc,cipher});
  const record={id:randomUUID(),owner:a,revision:0,saved:true,expiresAt:Date.now()+60000,startRequest:randomUUID(),messages:[{text:'synthetic private room'}]};
  await ownerA.locked('owner:'+a,()=>ownerA.commit(record,null));
  assert.deepEqual(await ownerA.get(record.id),record);assert.equal(await ownerB.get(record.id),null);
  assert.equal((await db.query("select nullif(current_setting('advisory.owner',true),'') as owner")).rows[0].owner,null);
  await transaction(async tx=>{assert.equal((await tx.query('select count(*)::int n from advisory.consultations')).rows[0].n,0);});
  for(const role of ['anon','authenticated','service_role','advisory_indexer'])await assert.rejects(db.transaction(async tx=>{await tx.exec('set local role '+role);await tx.query('select * from advisory.consultations');}),/permission denied/);
  await assert.rejects(transaction(tx=>tx.query("insert into advisory.index_jobs(id,source_snapshot) values($1,'forbidden')",[randomUUID()])),/permission denied/);
  await assert.rejects(createPrivateAdvisoryRpc({transaction:db.transaction.bind(db),projectRef:'hqysjumypgeapgmqkcrx'})({p_owner:a,p_action:'get',p_payload:{id:record.id}}),/UNSCOPED_DATABASE_ROLE/);
  const expired={...record,id:randomUUID(),expiresAt:Date.now()-10000,startRequest:randomUUID()};
  await db.query("insert into advisory.consultations(id,owner_id,revision,state,consent_version,expires_at) values($1,$2,0,$3,'advisory-preview-v1',$4)",[expired.id,a,cipher.seal(expired),new Date(expired.expiresAt).toISOString()]);
  const purge=await db.transaction(async tx=>{await tx.exec('set local role advisory_retention');return (await tx.query('select advisory.purge_expired() as result')).rows[0].result;});
  assert.equal(purge.sessions,1);assert.deepEqual(await ownerA.get(record.id),record);
  await assert.rejects(transaction(tx=>tx.query('select advisory.purge_expired()')),/permission denied/);
  // Shared lease must block another job before it touches any source. Upstream
  // calls must happen outside SQL transactions; a crash leaves resumable state.
  const id=randomUUID(),id2=randomUUID();
  await db.query("insert into advisory.index_jobs(id,source_snapshot,expected_count) values($1,'fixture',2),($2,'fixture',2)",[id,id2]);
  const indexTx=fn=>db.transaction(async tx=>{inside=true;await tx.exec('set local role advisory_indexer');try{return await fn(tx);}finally{inside=false;}});
  let resolveRead,reads=0;
  const source={page:async()=>{assert.equal(inside,false);reads++;return new Promise(r=>{resolveRead=r;});},verifySnapshot:async()=>true};
  const records=[{id:'fixture-1',colour:'Olive',description:'natural texture'},{id:'fixture-2',colour:'Ivory'}];
  const catalogue={lookupForIndex:async()=>{assert.equal(inside,false);return records;}};
  const worker=()=>createIndexWorker({transaction:indexTx,catalogue,source,now:()=>at});
  const pending=worker().step(id);
  while(!resolveRead)await new Promise(r=>setTimeout(r,1));
  await assert.rejects(worker().step(id2),/INDEX_THROTTLED/);assert.equal(reads,1);
  resolveRead({ids:records.map(r=>r.id),cursor:'fixture-2',snapshot:'fixture',done:true});
  assert.equal((await pending).complete,true);
  const coverage=await readIndexCoverage({query:db.query.bind(db)},id);assert.equal(coverage.complete,true);assert.equal(coverage.fields.description,1);assert.equal(coverage.retained,2);
  await assert.rejects(worker().rollback(id),/INDEX_THROTTLED/);next();
  const journal=(await db.query('select fields from advisory.index_job_items where job_id=$1 order by fabric_id',[id])).rows;
  assert.equal(journal[0].fields.description,true);assert.equal(journal[1].fields.description,false);
  // Conflicting edits cannot be silently overwritten by rollback.
  await db.query("update advisory.knowledge_search set source_hash='different' where fabric_id='fixture-2'");
  await assert.rejects(worker().rollback(id),/INDEX_ROLLBACK_CONFLICT/);
  assert.equal((await db.query('select count(*)::int n from advisory.knowledge_search')).rows[0].n,2);
  await db.query("update advisory.knowledge_search set source_hash=(select after_hash from advisory.index_job_items where job_id=$1 and fabric_id='fixture-2') where fabric_id='fixture-2'",[id]);
  assert.deepEqual(await worker().rollback(id),{restored:2,complete:true});next();
  const removed=await readIndexCoverage({query:db.query.bind(db)},id);assert.equal(removed.complete,false);assert.equal(removed.retained,0);assert.equal(removed.observed,2);
  assert.equal((await db.query('select count(*)::int n from advisory.knowledge_search')).rows[0].n,0);
  await assert.rejects(worker().step(id),/INDEX_JOB_STOPPED/);
  // Restores an existing row byte-for-byte, including vectors/index timestamp.
  await db.exec("insert into advisory.knowledge_search values('fixture-1','old'::tsvector,''::tsvector,''::tsvector,''::tsvector,''::tsvector,'old',now())");
  const before=(await db.query('select to_jsonb(k) as row from advisory.knowledge_search k')).rows[0].row;
  const second=worker().step(id2);resolveRead=null;while(!resolveRead)await new Promise(r=>setTimeout(r,1));resolveRead({ids:records.map(r=>r.id),cursor:'fixture-2',snapshot:'fixture',done:true});await second;next();
  assert.equal((await worker().rollback(id2)).complete,true);
  assert.deepEqual((await db.query('select to_jsonb(k) as row from advisory.knowledge_search k')).rows[0].row,before);
  const sample=JSON.parse(await readFile(new URL('../../../artifacts/jane-completion/bounded-master-source.json',import.meta.url),'utf8'));
  const safe=sample.rows.map(r=>safeKnowledge(r,r.visual,r.profile));
  const localIndex=createKnowledgeIndex({query:db.query.bind(db)});
  assert.equal((await localIndex.updateBatch(safe)).changed,5);
  assert.equal((await localIndex.updateBatch(safe)).changed,0);
  assert.equal((await localIndex.search({query:'shambala',colour:'',pattern:'',texture:'',composition:'polyester'})).ids.length,4);
  assert.ok(safe.every(r=>r.purchasable===false));
 }finally{await db.close();}
});

test('degraded catalogue lookup cannot poison the governed index or reuse its weak cache',async()=>{
 let broken=true,calls=0;
 const catalogue=createCatalogue({url:'https://hqysjumypgeapgmqkcrx.supabase.co',key:'fixture',fetchImpl:async url=>{
  calls++;const u=new URL(url);
  if(u.pathname.endsWith('fabric_colourways'))return Response.json([{fabric_id:'fixture-1',colour_name:'Ivory'}]);
  if(broken)return new Response('temporary failure',{status:503});
  return Response.json([]);
 }});
 assert.equal((await catalogue.lookup(['fixture-1'])).length,1);
 await assert.rejects(catalogue.lookupForIndex(['fixture-1']),/KNOWLEDGE_UNAVAILABLE/);
 broken=false;assert.equal((await catalogue.lookupForIndex(['fixture-1'])).length,1);assert.equal(calls,9);
});

test('expired indexing workers cannot commit or release replacement leases',async()=>{
 const db=new PGlite(),a=randomUUID(),b=randomUUID();let at=Date.now();const pending=[];
 try{
  await db.exec('create schema advisory;create role anon;create role authenticated;create role service_role;');
  for(const f of ['search','index-worker'])await db.exec(await readFile(new URL('../'+f+'.review.sql',import.meta.url),'utf8'));
  await db.query("insert into advisory.index_jobs(id,source_snapshot,expected_count) values($1,'a',1),($2,'b',1)",[a,b]);
  const source={page:({snapshot})=>new Promise(resolve=>pending.push(()=>resolve({ids:['fixture-'+snapshot],cursor:{after:snapshot},snapshot,done:true}))),verifySnapshot:async()=>true};
  const make=()=>createIndexWorker({transaction:db.transaction.bind(db),now:()=>at,source,catalogue:{lookupForIndex:async ids=>ids.map(id=>({id,colour:'Olive'}))}});
  await assert.rejects(make().step(a,{sourceSnapshot:'wrong',expectedCount:1}),/INDEX_APPROVAL_SOURCE_MISMATCH/);assert.equal(pending.length,0);
  const first=make().step(a);while(pending.length<1)await new Promise(r=>setTimeout(r,1));
  at+=31000;const second=make().step(b);while(pending.length<2)await new Promise(r=>setTimeout(r,1));
  const replacement=(await db.query('select token from advisory.index_gate')).rows[0].token;
  pending[0]();await assert.rejects(first,/INDEX_LEASE_LOST/);
  assert.equal((await db.query('select token from advisory.index_gate')).rows[0].token,replacement);
  pending[1]();assert.equal((await second).complete,true);
  assert.equal((await db.query('select processed from advisory.index_jobs where id=$1',[a])).rows[0].processed,0);
  await assert.rejects(make().step(a),/INDEX_THROTTLED/);at+=5001;
  const retry=make().step(a);while(pending.length<3)await new Promise(r=>setTimeout(r,1));pending[2]();assert.equal((await retry).complete,true);
 }finally{await db.close();}
});
