import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {prepareFirstBatch} from '../first-batch-plan.mjs';
import {validateSourceManifest} from '../source-manifest.mjs';
import {createIndexWorker} from '../index-worker.mjs';
import {readIndexCoverage} from '../index-coverage.mjs';
const manifest=JSON.parse(await readFile(new URL('../../../artifacts/jane-pro-readiness-20261011/source-manifest.json',import.meta.url),'utf8'));
const captured=JSON.parse(await readFile(new URL('../../../artifacts/jane-first-index-batch-20261011/source.json',import.meta.url),'utf8'));
function input(){const now=Date.now(),bundleHash='a'.repeat(64);return {manifest,bundleHash,now,attestation:{...manifest,observed_at:new Date(now).toISOString()},source:{...captured,observed_at:new Date(now).toISOString()},resources:{projectRef:manifest.projectRef,source:'trusted-operator-telemetry',observedAt:now,cpuPercent:10,ioPercent:2,memoryPercent:65,diskPercent:50,connections:15,maxConnections:60,lockWaits:0,newDeadlocks:0,newDatabaseErrors:0,supplierRefreshActive:false},approval:{approved:true,projectRef:manifest.projectRef,schema:'advisory',purpose:'bounded-advisory-index-only',ownerApprovalReference:'LOCAL TEST ONLY',jobId:randomUUID(),sourceAttestationReference:'LOCAL TEST ONLY',sourceSnapshot:validateSourceManifest(manifest).snapshot,expectedCount:manifest.identity_count,bundleHash,maxBatches:1,expiresAt:new Date(now+300000).toISOString()}};}
async function database(){const db=new PGlite();await db.exec('create role anon;create role authenticated;create role service_role;');await db.exec(await readFile(new URL('../../../supabase/migrations/20261011142747_jane_isolated_advisory.sql',import.meta.url),'utf8'));return db;}
test('first batch refuses missing approval, stale source/telemetry, excess scope and crossed identity order',()=>{
 const a=input();assert.equal(prepareFirstBatch(a).ids.length,6);
 for(const change of [{approval:{...a.approval,approved:false}},{approval:{...a.approval,maxBatches:2}},{attestation:null},{attestation:{...a.attestation,identity_count:1}},{source:{...a.source,observed_at:new Date(a.now-60001).toISOString()}},{source:{...a.source,records:[...a.source.records].reverse()}},{resources:{...a.resources,ioPercent:null}},{resources:{...a.resources,connections:45}}])assert.throws(()=>prepareFirstBatch({...a,...change}));
});
test('atomic six-record SQL preserves worker checkpoint/rollback, rejects replay and never marks full coverage',async()=>{
 const db=await database(),a=input(),plan=prepareFirstBatch(a);
 try{
  await db.exec(plan.sql);const coverage=await readIndexCoverage({query:db.query.bind(db)},a.approval.jobId);
  assert.equal(coverage.processed,6);assert.equal(coverage.retained,6);assert.equal(coverage.expected_count,16883);assert.equal(coverage.complete,false);
  const hashes=(await db.query('select fabric_id,source_hash from advisory.knowledge_search order by fabric_id')).rows;assert.deepEqual(hashes,plan.items.map(i=>({fabric_id:i.id,source_hash:i.hash})));
  await db.exec("update advisory.index_gate set next_at='-infinity'");
  await assert.rejects(db.exec(plan.sql),/FIRST_BATCH_ALREADY_STARTED/);await db.exec('rollback');
  const worker=createIndexWorker({transaction:db.transaction.bind(db)});assert.deepEqual(await worker.rollback(a.approval.jobId),{restored:6,complete:true});
  assert.equal((await db.query('select count(*)::int n from advisory.knowledge_search')).rows[0].n,0);
 }finally{await db.close();}
});
test('late failure rolls back job, vectors, receipt rows and gate; supplier SQL characters remain data',async()=>{
 const db=await database(),a=input();a.source=structuredClone(a.source);a.source.records[0].colour_name="x'); drop schema advisory cascade; -- \\ $trial$";
 const plan=prepareFirstBatch(a);
 try{
  const broken=plan.sql.replace('update advisory.index_jobs set cursor=',"raise exception 'SYNTHETIC_INTERRUPTION'; update advisory.index_jobs set cursor=");
  await assert.rejects(db.exec(broken),/SYNTHETIC_INTERRUPTION/);await db.exec('rollback');
  assert.equal((await db.query('select count(*)::int n from advisory.index_jobs')).rows[0].n,0);assert.equal((await db.query('select count(*)::int n from advisory.knowledge_search')).rows[0].n,0);
  await db.exec(plan.sql);assert.equal((await db.query('select count(*)::int n from advisory.knowledge_search')).rows[0].n,6);
  await db.exec("update advisory.index_gate set next_at='-infinity'");
  const expired={...input(),now:Date.now()-120000};expired.source.observed_at=new Date(expired.now).toISOString();expired.attestation.observed_at=new Date(expired.now).toISOString();expired.resources.observedAt=expired.now;
  await assert.rejects(db.exec(prepareFirstBatch(expired).sql),/ATTESTATION_EXPIRED/);await db.exec('rollback');
 }finally{await db.close();}
});
test('explicit temporary role approval preserves original grants on success and interrupted transactions',async()=>{
 const db=await database();
 try{
  await db.exec('create role local_setup superuser;set session authorization local_setup;alter role postgres rename to supabase_admin;create role postgres nosuperuser createrole;set session authorization supabase_admin;grant advisory_indexer to postgres with admin true,inherit false,set false granted by supabase_admin;set session authorization postgres;');
  const acl=async()=>(await db.query("select roleid,member,grantor,admin_option,inherit_option,set_option from pg_auth_members where roleid='advisory_indexer'::regrole order by grantor")).rows;
  const before=await acl();assert.equal((await db.query("select pg_has_role('postgres','advisory_indexer','SET') as allowed")).rows[0].allowed,false);
  const a=input();await assert.rejects(db.exec(prepareFirstBatch(a).sql),/permission denied/);await db.exec('rollback');
  assert.throws(()=>prepareFirstBatch({...a,approval:{...a.approval,temporaryRoleUse:{approved:false}}}),/TEMPORARY_INDEX_ROLE_APPROVAL_REQUIRED/);
  a.approval.temporaryRoleUse={approved:true,member:'postgres',role:'advisory_indexer',grantor:'postgres',scope:'same-transaction-revoke-before-commit',ownerApprovalReference:'LOCAL TEST ONLY'};
  const plan=prepareFirstBatch(a),broken=plan.sql.replace('reset role;','select 1/0;reset role;');
  await assert.rejects(db.exec(broken),/division by zero/);await db.exec('rollback');assert.deepEqual(await acl(),before);
  await db.exec('set session authorization supabase_admin');assert.equal((await db.query('select count(*)::int n from advisory.index_jobs')).rows[0].n,0);await db.exec('set session authorization postgres');
  await db.exec(plan.sql);assert.deepEqual(await acl(),before);
  await db.exec('set session authorization supabase_admin');assert.equal((await db.query('select count(*)::int n from advisory.knowledge_search')).rows[0].n,6);
 }finally{await db.close();}
});
