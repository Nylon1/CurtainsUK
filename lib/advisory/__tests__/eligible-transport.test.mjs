import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {createEligibleTransport} from '../eligible-transport.mjs';

const sha=s=>createHash('sha256').update(s).digest('hex');
const makePlan=sql=>({classification:'ELIGIBLE_PLAN_NOT_EXECUTION',jobId:'synthetic',sql,sqlSha256:sha(sql)});
const plan=makePlan("begin;\nset local statement_timeout='3s';\nselect 1;\ncommit;");
const readbackSql=()=>"begin read only;set local statement_timeout='3s';select 2 as value;commit;";

test('one request contains unchanged commit then read-only verification, fsynced first and hash bound',async()=>{
 const events=[],timings=[],result={job:{processed:12}};
 const t=createEligibleTransport({readbackSql,writeAhead:async e=>events.push(e),execute:async sql=>{
  assert.equal(events.length,1);assert.equal(events[0].sql,sql);assert.equal(events[0].wireSha256,sha(sql));
  assert.equal(events[0].planSha256,plan.sqlSha256);assert.equal(sql,plan.sql+'\n'+readbackSql());return result;
 },onTiming:async t=>timings.push(t)});
 t.prepared(plan);await t.submit(plan.sql);
 await assert.rejects(t.readBack({...plan,sql:plan.sql+'\n',sqlSha256:sha(plan.sql+'\n')}),/READBACK_MISMATCH/);
 assert.deepEqual(await t.readBack(plan),result);assert.equal(timings.length,1);
 t.prepared(plan); // previous cached receipt was consumed
});

test('failed journal and lost or empty commit responses cannot be resubmitted',async()=>{
 for(const mode of ['journal','lost','empty']){
  let writes=0,reads=0;
  const t=createEligibleTransport({readbackSql,writeAhead:async()=>{if(mode==='journal')throw Error('fsync failed');},execute:async sql=>{
   if(sql.startsWith('begin read only;')){reads++;return {job:{processed:12}};}
   writes++;if(mode==='lost')throw Error('response lost');return null;
  }});
  t.prepared(plan);await assert.rejects(t.submit(plan.sql));
  await assert.rejects(t.submit(plan.sql),/SUBMISSION_MISMATCH/);
  await t.readBack(plan);assert.equal(writes,mode==='journal'?0:1);assert.equal(reads,1);
 }
});

test('recovery without cached submission is read-only and invalid plans fail closed',async()=>{
 const calls=[];
 const t=createEligibleTransport({readbackSql,writeAhead:async()=>assert.fail('unexpected write'),execute:async sql=>{calls.push(sql);return {job:{processed:6}};}});
 await t.readBack(plan);assert.deepEqual(calls,[readbackSql()]);
 assert.throws(()=>t.prepared({...plan,sqlSha256:'f'.repeat(64)}),/PLAN_INVALID/);
 await assert.rejects(t.submit(plan.sql),/SUBMISSION_MISMATCH/);
});

test('Postgres readback failure after COMMIT leaves committed row for read-only recovery',async()=>{
 const db=new PGlite();
 try{
  await db.exec('create table synthetic_receipts(id int primary key)');
  const p=makePlan("begin;\nset local statement_timeout='3s';\ninsert into synthetic_receipts values(1);\ncommit;");
  let calls=0;
  const t=createEligibleTransport({readbackSql:()=>"begin read only;select 1/0;commit;",writeAhead:async()=>{},execute:async sql=>{calls++;return db.exec(sql);}});
  t.prepared(p);await assert.rejects(t.submit(p.sql),/division by zero/);
  await db.exec('rollback');
  assert.equal((await db.query('select count(*)::int as n from synthetic_receipts')).rows[0].n,1);
  await assert.rejects(t.submit(p.sql));assert.equal(calls,1);
 }finally{await db.close();}
});
