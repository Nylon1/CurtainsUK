import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {verifyUncommittedPlan} from '../uncommitted-plan.mjs';
import {createIndexJournal} from '../index-journal.mjs';

function fixture(){
 const now=Date.now(),deadline=new Date(now-90000).toISOString();
 const sql="begin;\nset local statement_timeout='3s';\nset local idle_in_transaction_session_timeout='5s';\nif clock_timestamp()>=convert_from(decode('"+Buffer.from(deadline).toString('hex')+"','hex'),'UTF8')::timestamptz then raise exception 'ELIGIBLE_ATTESTATION_EXPIRED'; end if;\ncommit;";
 const approval={projectRef:'synthetic-project',implementationSha256:'a'.repeat(64)};
 const plan={classification:'ELIGIBLE_PLAN_NOT_EXECUTION',jobId:'synthetic-job',sourceSnapshot:'synthetic-snapshot',expectedCount:1230,bundleHash:'b'.repeat(64),approval,historical:{test:true},fromOffset:120,cursor:{offset:126,manifestHash:'c'.repeat(64)},complete:false,deadline,sql,sqlSha256:createHash('sha256').update(sql).digest('hex'),ids:Array.from({length:6},(_,n)=>'synthetic-'+n)};
 plan.items=plan.ids.map(id=>({id,hash:'d'.repeat(64),fields:{identity:true},beforeRow:null}));
 const previousPlan={...structuredClone(plan),fromOffset:114,cursor:{...plan.cursor,offset:120},items:plan.items.map(i=>({...i,id:'previous-'+i.id}))};
 const job={id:plan.jobId,source_snapshot:plan.sourceSnapshot,expected_count:1230,processed:120,indexed:120,batches:20,cursor:previousPlan.cursor,complete:false,status:'ready',failures:0};
 const previousReadback={job,historical:plan.historical,permissionRestored:true,items:previousPlan.items.map(i=>({...i,receiptHash:i.hash,rolledBack:false}))};
 const observations=[-10000,-1000].map(delta=>({projectRef:approval.projectRef,observedAt:new Date(now+delta).toISOString(),job:structuredClone(job),historical:plan.historical,permissionRestored:true,oldTransactions:0,preparedTransactions:0,knowledgeRows:[],jobItems:[],items:null}));
 return {plan,evidence:{previousPlan,previousReadback,observations},now};
}

test('expired uncommitted reconciliation requires exact prior receipt and two independent drained readbacks',()=>{
 const f=fixture(),r=verifyUncommittedPlan(f.plan,f.evidence,f.now);
 assert.equal(r.outcome,'expired-uncommitted');assert.equal(r.processed,120);assert.equal(r.databaseWrites,0);
 assert.match(r.evidenceSha256,/^[a-f0-9]{64}$/);
});

test('uncertain, committed, partial, stale, in-flight or mismatched evidence cannot retire a plan',()=>{
 const mutations=[
  f=>f.plan.sql+='-- changed',f=>f.plan.deadline=new Date(f.now).toISOString(),
  f=>f.plan.fromOffset=0,f=>f.plan.ids[1]=f.plan.ids[0],f=>f.plan.items[0].beforeRow={},
  f=>f.evidence.previousPlan.jobId='another',f=>f.evidence.previousReadback.items.pop(),
  f=>f.evidence.observations.pop(),f=>f.evidence.observations[1].observedAt=f.evidence.observations[0].observedAt,
  f=>f.evidence.observations[0].observedAt=new Date(f.now-60001).toISOString(),
  f=>f.evidence.observations[1].observedAt=new Date(f.now+1).toISOString(),
  f=>f.evidence.observations[0].oldTransactions=1,f=>f.evidence.observations[1].preparedTransactions=1,
  f=>f.evidence.observations[1].knowledgeRows=[{fabric_id:f.plan.ids[0]}],
  f=>f.evidence.observations[1].jobItems=[{fabric_id:f.plan.ids[0]}],
  f=>f.evidence.observations[1].job.processed=126,f=>f.evidence.observations[1].permissionRestored=false,
  f=>f.evidence.observations[1].projectRef='another',f=>f.evidence.observations[1].historical={},
 ];
 for(const mutate of mutations){const f=fixture();mutate(f);assert.throws(()=>verifyUncommittedPlan(f.plan,f.evidence,f.now));}
});

test('journal preserves prepared SQL and resolution evidence, requires lock, rejects duplicate resolution and reopens cleanly',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'jane-uncommitted-test-')),journal=createIndexJournal(dir),f=fixture();
 try{
  await assert.rejects(journal.resolveUncommitted(f.plan,f.evidence),/LOCK_REQUIRED/);
  await journal.exclusive(async()=>{
   await journal.prepared(f.plan);const before=await readFile(path.join(dir,'journal.jsonl'),'utf8');
   await assert.rejects(journal.resolveUncommitted({...f.plan,sqlSha256:'e'.repeat(64)},f.evidence),/REQUIRES_REVIEW/);
   const invalid=structuredClone(f.evidence);invalid.observations[1].knowledgeRows=[{}];
   await assert.rejects(journal.resolveUncommitted(f.plan,invalid),/REQUIRES_REVIEW/);
   assert.equal(await readFile(path.join(dir,'journal.jsonl'),'utf8'),before);
   await journal.resolveUncommitted(f.plan,f.evidence);
   assert.ok((await readFile(path.join(dir,'journal.jsonl'),'utf8')).startsWith(before));
   assert.equal(await journal.pending(),null);
   await assert.rejects(journal.resolveUncommitted(f.plan,f.evidence),/REQUIRES_REVIEW/);
  });
  await assert.rejects(createIndexJournal(dir).exclusive(()=>journal.pending()),/LOCK_REQUIRED/);
  const reopened=createIndexJournal(dir);await reopened.exclusive(async()=>assert.equal(await reopened.pending(),null));
 }finally{await rm(dir,{recursive:true,force:true});}
});
