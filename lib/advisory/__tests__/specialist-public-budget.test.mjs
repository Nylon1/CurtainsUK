import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';

const migration=name=>new URL(`../../../supabase/migrations/${name}`,import.meta.url);

test('four specialists have one private UTC daily budget independent of Jane',async()=>{
  const db=new PGlite();
  try{
    await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
    for(const name of ['20261011142747_jane_isolated_advisory.sql','20261013210935_jane_continuous_daily_budget.sql','20261014102247_specialist_public_daily_budget.sql'])
      await db.exec(await readFile(migration(name),'utf8'));
    const jane=(await db.query('select advisory.ensure_public_daily_run() as id')).rows[0].id;
    const specialist=(await db.query('select advisory.ensure_specialist_daily_run() as id')).rows[0].id;
    assert.notEqual(specialist,jane);
    assert.equal((await db.query('select advisory.ensure_specialist_daily_run() as id')).rows[0].id,specialist);
    const ledger=(await db.query(`select d.utc_day,d.run_id,r.enabled,r.limit_micro,r.used_micro,
      r.expires_at at time zone 'UTC' as expiry from advisory.specialist_daily_runs d
      join advisory.evaluation_runs r on r.id=d.run_id`)).rows[0];
    assert.equal(ledger.run_id,specialist);
    assert.equal(ledger.limit_micro,5_000_000);
    assert.equal(ledger.used_micro,0);
    assert.equal(ledger.enabled,true);
    assert.equal(new Date(ledger.expiry+'Z').toISOString().slice(11),'00:00:00.000Z');
    const earlier=randomUUID(),session=randomUUID(),owner=randomUUID();
    await db.query("insert into advisory.evaluation_runs(id,enabled,limit_micro,expires_at) values($1,true,5000000,clock_timestamp()+interval '1 day')",[earlier]);
    await db.query("insert into advisory.specialist_daily_runs(utc_day,run_id) values((clock_timestamp() at time zone 'UTC')::date-1,$1)",[earlier]);
    await db.query('insert into advisory.spend_reservations(id,run_id,owner_id,session_id,reserved_micro,charged_micro) values($1,$2,$3,$4,800000,800000)',[randomUUID(),earlier,owner,session]);
    const receipt=randomUUID();
    await assert.rejects(db.query('insert into advisory.spend_reservations(id,run_id,owner_id,session_id,reserved_micro,charged_micro) values($1,$2,$3,$4,250000,250000)',[receipt,specialist,owner,session]),/BUDGET_EXHAUSTED/);
    await db.query('insert into advisory.spend_reservations(id,run_id,owner_id,session_id,reserved_micro,charged_micro) values($1,$2,$3,$4,200000,200000)',[receipt,specialist,owner,session]);
    await assert.rejects(db.query('update advisory.spend_reservations set charged_micro=250000 where id=$1',[receipt]),/BUDGET_EXHAUSTED/);
    assert.equal((await db.query('select charged_micro from advisory.spend_reservations where id=$1',[receipt])).rows[0].charged_micro,200000);
    assert.equal((await db.query('select used_micro from advisory.specialist_session_spend where session_id=$1',[session])).rows[0].used_micro,1_000_000);
    // A settled call may cost less than its reservation. The refund must free
    // capacity without violating the table's non-negative check constraint.
    await db.query('update advisory.spend_reservations set charged_micro=150000,settled=true where id=$1',[receipt]);
    assert.equal((await db.query('select used_micro from advisory.specialist_session_spend where session_id=$1',[session])).rows[0].used_micro,950_000);
    await assert.rejects(db.query('update advisory.spend_reservations set session_id=$2 where id=$1',[receipt,randomUUID()]),/INVALID_BUDGET_RECEIPT/);
    await db.query('insert into advisory.spend_reservations(id,run_id,owner_id,session_id,reserved_micro,charged_micro) values($1,$2,$3,$4,50000,50000)',[randomUUID(),specialist,owner,session]);
    assert.equal((await db.query('select used_micro from advisory.specialist_session_spend where session_id=$1',[session])).rows[0].used_micro,1_000_000);
    // Old detailed receipts can be purged without resetting a live session cap.
    await db.query('delete from advisory.spend_reservations where run_id=$1',[earlier]);
    await assert.rejects(db.query('insert into advisory.spend_reservations(id,run_id,owner_id,session_id,reserved_micro,charged_micro) values($1,$2,$3,$4,10000,10000)',[randomUUID(),specialist,owner,session]),/BUDGET_EXHAUSTED/);
    const untouched=(await db.query('select used_micro from advisory.evaluation_runs where id=$1',[jane])).rows[0].used_micro;
    assert.equal(untouched,0);
    await db.exec('set role advisory_runtime');
    assert.equal((await db.query('select advisory.ensure_specialist_daily_run() as id')).rows[0].id,specialist);
    await assert.rejects(db.query('select * from advisory.specialist_daily_runs'),/permission denied/);
    await assert.rejects(db.query('select * from advisory.specialist_session_spend'),/permission denied/);
    await db.exec('reset role; set role authenticated');
    await assert.rejects(db.query('select advisory.ensure_specialist_daily_run()'),/permission denied/);
    await assert.rejects(db.query('select * from advisory.specialist_daily_runs'),/permission denied/);
    await assert.rejects(db.query('select * from advisory.specialist_session_spend'),/permission denied/);
    await db.exec('reset role; set role service_role');
    await assert.rejects(db.query('select advisory.ensure_specialist_daily_run()'),/permission denied/);
    await db.exec('reset role');
    const expiry='2100-01-01T00:00:00.000Z';
    await db.query(`insert into advisory.consultations(id,owner_id,revision,state,consent_version,expires_at)
      values($1,$2,0,$3,'advisory-preview-v1',$4)`,[session,owner,JSON.stringify({id:session,owner,revision:0,saved:true,expiresAt:Date.parse(expiry)}),expiry]);
    await db.query('delete from advisory.consultations where id=$1',[session]);
    assert.equal((await db.query('select count(*)::int as count from advisory.specialist_session_spend where session_id=$1',[session])).rows[0].count,0);
    await db.query('update advisory.evaluation_runs set limit_micro=4000000 where id=$1',[specialist]);
    await assert.rejects(db.query('select advisory.ensure_specialist_daily_run()'),/SPECIALIST_DAILY_BUDGET_INVALID/);
  }finally{await db.close();}
});
