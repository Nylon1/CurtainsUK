import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';

const base = new URL('../../../supabase/migrations/20261011142747_jane_isolated_advisory.sql', import.meta.url);
const extension = new URL('../../../supabase/migrations/20261013210935_jane_continuous_daily_budget.sql', import.meta.url);

test('one private UTC daily ledger stays capped and cannot be created by customer roles', async () => {
  const db = new PGlite();
  try {
    await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
    await db.exec(await readFile(base, 'utf8'));
    await db.exec(await readFile(extension, 'utf8'));
    const first = (await db.query('select advisory.ensure_public_daily_run() as id')).rows[0].id;
    const second = (await db.query('select advisory.ensure_public_daily_run() as id')).rows[0].id;
    assert.equal(first, second);
    const record = (await db.query(`select d.utc_day, d.run_id, r.enabled, r.limit_micro, r.used_micro,
      r.expires_at at time zone 'UTC' as expiry from advisory.public_daily_runs d
      join advisory.evaluation_runs r on r.id=d.run_id`)).rows[0];
    assert.equal(record.run_id, first);
    assert.equal(record.limit_micro, 5_000_000);
    assert.equal(record.used_micro, 0);
    assert.equal(record.enabled, true);
    assert.equal(new Date(record.expiry + 'Z').toISOString().slice(11), '00:00:00.000Z');
    assert.equal((await db.query('select count(*)::int as count from advisory.public_daily_runs')).rows[0].count, 1);
    const previousRun = randomUUID(), session = randomUUID(), owner = randomUUID();
    await db.query("insert into advisory.evaluation_runs(id,enabled,limit_micro,expires_at) values($1,true,5000000,clock_timestamp()+interval '1 day')", [previousRun]);
    // Previous production dates used an env-supplied ledger and have no row
    // in public_daily_runs; their consultation spend must still count.
    await db.query('insert into advisory.spend_reservations(id,run_id,owner_id,session_id,reserved_micro,charged_micro) values($1,$2,$3,$4,800000,800000)', [randomUUID(), previousRun, owner, session]);
    const currentReceipt = randomUUID();
    await assert.rejects(db.query('insert into advisory.spend_reservations(id,run_id,owner_id,session_id,reserved_micro,charged_micro) values($1,$2,$3,$4,250000,250000)', [currentReceipt, first, owner, session]), /BUDGET_EXHAUSTED/);
    await db.query('insert into advisory.spend_reservations(id,run_id,owner_id,session_id,reserved_micro,charged_micro) values($1,$2,$3,$4,200000,200000)', [currentReceipt, first, owner, session]);
    await assert.rejects(db.query('update advisory.spend_reservations set charged_micro=250000 where id=$1', [currentReceipt]), /BUDGET_EXHAUSTED/);
    assert.equal((await db.query('select charged_micro from advisory.spend_reservations where id=$1', [currentReceipt])).rows[0].charged_micro, 200000);
    await db.exec('set role advisory_runtime');
    assert.equal((await db.query('select advisory.ensure_public_daily_run() as id')).rows[0].id, first);
    await assert.rejects(db.query('select * from advisory.public_daily_runs'), /permission denied/);
    await db.exec('reset role');
    await db.exec('set role authenticated');
    await assert.rejects(db.query('select advisory.ensure_public_daily_run()'), /permission denied/);
    await assert.rejects(db.query('select * from advisory.public_daily_runs'), /permission denied/);
    await db.exec('reset role; set role service_role');
    await assert.rejects(db.query('select advisory.ensure_public_daily_run()'), /permission denied/);
    await assert.rejects(db.query('select * from advisory.public_daily_runs'), /permission denied/);
    await db.exec('reset role');
    await db.query('update advisory.evaluation_runs set limit_micro=4000000 where id=$1', [first]);
    await assert.rejects(db.query('select advisory.ensure_public_daily_run()'), /PUBLIC_DAILY_BUDGET_INVALID/);
  } finally {
    await db.close();
  }
});
