/** Isolated PostgreSQL/WASM proof. No network/database credentials or Production connection. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const modulePath = process.argv[2];
if (!modulePath) throw new Error('Supply the installed @electric-sql/pglite/dist/index.js path');
const { PGlite } = await import(pathToFileURL(modulePath).href);
const db = new PGlite();
const read = name => readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), 'utf8');
const source = await read('20260907043049_supplier_intelligence_approval_gate.sql');
const daily = await read('20260913054411_phase5n_daily_stock_and_bay_instant.sql');
const history = await read('20260915121859_fabric_commercial_readiness.sql');
const scoped = await read('20260918173501_scoped_sdg_stock_canary.sql');
await db.exec(`create schema curtainsuk_private; create role anon; create role authenticated;
 create role service_role bypassrls; grant usage on schema curtainsuk_private to service_role;
 create table curtainsuk_private.supplier_sync_runs(run_id text primary key);
 create table curtainsuk_private.fabric_colourways(fabric_id text primary key,supplier_id text,supplier_sku text,brand_id text,lifecycle_state text);
 ${source.slice(source.indexOf('create table curtainsuk_private.supplier_snapshots'),source.indexOf('create or replace function curtainsuk_private.append_validated_supplier_snapshot'))}
 ${daily.slice(daily.indexOf('create table curtainsuk_private.daily_stock_snapshots'),daily.indexOf('-- Materializes'))}
 ${history.slice(history.indexOf('create table curtainsuk_private.daily_stock_snapshot_history'),history.indexOf('create trigger daily_stock_history_immutable'))}
 ${await read('20260915122801_stock_revision_source_consistency.sql')}
 create trigger audit_daily_stock_revision before insert or update on curtainsuk_private.daily_stock_snapshots
 for each row execute function curtainsuk_private.audit_daily_stock_revision();
 create table curtainsuk_private.daily_stock_materialization_events(event_id uuid primary key default gen_random_uuid(),attempted_at timestamptz default now(),results jsonb,coverage jsonb);
 grant select on all tables in schema curtainsuk_private to service_role;
 grant insert,update on curtainsuk_private.daily_stock_snapshots to service_role;
 grant insert on curtainsuk_private.daily_stock_snapshot_history,curtainsuk_private.daily_stock_materialization_events to service_role;
`);
await db.exec(scoped);
const sampleMigration=await read('20260918172104_sample_stock_independent_of_curtain_floor.sql');
await db.exec(sampleMigration.slice(sampleMigration.indexOf('CREATE OR REPLACE FUNCTION'),sampleMigration.indexOf('CREATE OR REPLACE FUNCTION curtainsuk_private.search_retail_fabrics')));
const actor = '00000000-0000-4000-8000-000000000001';
await db.exec(`insert into curtainsuk_private.supplier_sync_runs values ('isolated-fixture');`);
const checked = new Date(Date.now()-60000).toISOString();
async function seed(sku,metres) {
 const snapshot={snapshot_id:`test:${sku}`,supplier_id:'sanderson-design-group',supplier_sku:sku,brand_id:'sdg-test',
 checked_at:checked,stock_unit:'METRE',aggregate_available_quantity:metres,lifecycle_state:'UNKNOWN',currency:null,cut_trade_price:null};
 await db.query(`insert into curtainsuk_private.fabric_colourways values ($1,'sanderson-design-group',$2,'sdg-test','UNKNOWN')`,[`fabric:${sku}`,sku]);
 await db.query(`insert into curtainsuk_private.supplier_snapshots
 (snapshot_id,supplier_id,supplier_sku,brand_id,run_id,checked_at,stock_unit,aggregate_available_quantity,lifecycle_state,source_type,source_name,source_reference,verification_status,validation_status,normalized_payload)
 values($1,'sanderson-design-group',$2,'sdg-test','isolated-fixture',$3,'METRE',$4,'UNKNOWN','MANUAL_PORTAL','SDG authenticated trade portal Product/detail',$5,'VERIFIED','VALIDATED',$6)`,
 [snapshot.snapshot_id,sku,checked,metres,`sdg:Product/detail:${sku}`,JSON.stringify(snapshot)]);
 await db.query(`insert into curtainsuk_private.supplier_promotion_events(event_id,snapshot_id,promotion_state,actor_type,actor_id,reason)
 values($1,$2,'APPROVED_FOR_PROJECTION','MANUAL_STAFF',$3,'Isolated test fixture only')`,[`approval:${sku}`,snapshot.snapshot_id,actor]);
 return {fabric_id:`fabric:${sku}`,supplier_id:'sanderson-design-group',supplier_sku:sku,snapshot_id:snapshot.snapshot_id};
}
const scope=[await seed('HIGH',40),await seed('LOW',12),await seed('ZERO',0)];
await seed('OUTSIDE',150);
await db.exec(`insert into curtainsuk_private.fabric_colourways values ('fabric:UNKNOWN','sanderson-design-group','UNKNOWN','sdg-zoffany','UNKNOWN');`);
const call=(list=scope,operator=actor)=>db.query('select curtainsuk_private.materialize_sdg_stock_canary($1::jsonb,$2::uuid) result',[JSON.stringify(list),operator]);
const mutations=async()=> (await db.query(`select
 (select count(*) from curtainsuk_private.daily_stock_snapshots)::int stock,
 (select count(*) from curtainsuk_private.daily_stock_snapshot_history)::int history,
 (select count(*) from curtainsuk_private.daily_stock_materialization_events)::int events,
 (select count(*) from curtainsuk_private.daily_stock_runs)::int runs`)).rows[0];
let passed=0;
async function reject(name,operation,pattern) {
 await db.exec('begin isolation level serializable');
 try { await assert.rejects(operation,pattern); } finally { await db.exec('rollback'); }
 assert.deepEqual(await mutations(),{stock:0,history:0,events:0,runs:0});
 passed++; console.log(`PASS ${name}`);
}
await reject('null scope',()=>call(null),/EXPLICIT_SCOPE/);
await reject('object scope',()=>call({}),/EXPLICIT_SCOPE/);
await reject('empty scope',()=>call([]),/SCOPE_LIMIT/);
await reject('oversized scope',()=>call([...scope,scope[0]]),/SCOPE_LIMIT/);
await reject('duplicate identities',()=>call([scope[0],scope[0]]),/DUPLICATE/);
await reject('missing exact fabric identity',()=>call([{supplier_id:'sanderson-design-group',supplier_sku:'HIGH',snapshot_id:'test:HIGH'}]),/EXACT_IDENTITY/);
await reject('foreign supplier',()=>call([{...scope[0],supplier_id:'prestigious-textiles'}]),/EXACT_IDENTITY/);
await reject('mismatched master identity',()=>call([{...scope[0],fabric_id:'fabric:LOW'}]),/MASTER_IDENTITY/);
await reject('unknown source',()=>call([{...scope[0],snapshot_id:'absent'}]),/SOURCE_NOT_FOUND/);
await reject('missing operator',()=>call(scope,null),/OPERATOR_REQUIRED/);
await reject('different approving operator',()=>call(scope,'00000000-0000-4000-8000-000000000002'),/OPERATOR_APPROVAL/);
for (const [name,change] of [
 ['wrong unit',`stock_unit='YARD'`],['missing quantity',`aggregate_available_quantity=null`],
 ['negative quantity',`aggregate_available_quantity=-1`],['future timestamp',`checked_at=now()+interval '1 minute'`],
 ['stale timestamp',`checked_at=now()-interval '73 hours'`],['discontinued source',`lifecycle_state='DISCONTINUED'`],
 ['invalid validation',`validation_status='FAILED'`],['unverified source',`verification_status='UNVERIFIED'`],
 ['quantity mismatch',`normalized_payload=jsonb_set(normalized_payload,'{aggregate_available_quantity}','42')`],
 ['missing payload timestamp',`normalized_payload=normalized_payload-'checked_at'`],
 ['wrong source reference',`source_reference='other'`]
]) await reject(name,async()=>{await db.exec(`update curtainsuk_private.supplier_snapshots set ${change} where snapshot_id='test:LOW'`);await call();},/INVALID_SOURCE/);
await reject('revoked approval',async()=>{await db.exec(`update curtainsuk_private.supplier_promotion_events set promotion_state='REJECTED',rejection_reason='test' where snapshot_id='test:LOW'`);await call();},/OPERATOR_APPROVAL/);
await reject('ambiguous approval time',async()=>{await db.exec(`insert into curtainsuk_private.supplier_promotion_events select event_id||'-tie',snapshot_id,promotion_state,actor_type,actor_id,reason,rejection_reason,previous_approved_snapshot_id,created_at from curtainsuk_private.supplier_promotion_events where snapshot_id='test:LOW'`);await call();},/OPERATOR_APPROVAL/);
await reject('discontinued Fabric Master',async()=>{await db.exec(`update curtainsuk_private.fabric_colourways set lifecycle_state='DISCONTINUED' where fabric_id='fabric:LOW'`);await call();},/MASTER_IDENTITY/);
await reject('ambiguous Fabric Master identity',async()=>{await db.exec(`insert into curtainsuk_private.fabric_colourways select 'duplicate',supplier_id,supplier_sku,brand_id,lifecycle_state from curtainsuk_private.fabric_colourways where fabric_id='fabric:LOW'`);await call();},/MASTER_IDENTITY/);
await reject('newer approved source blocks selected older source',async()=>{
 await db.exec(`insert into curtainsuk_private.supplier_snapshots select (jsonb_populate_record(null::curtainsuk_private.supplier_snapshots,to_jsonb(s)||jsonb_build_object('snapshot_id','newer:LOW','checked_at',now()-interval '10 seconds'))).* from curtainsuk_private.supplier_snapshots s where snapshot_id='test:LOW';
 insert into curtainsuk_private.supplier_promotion_events select (jsonb_populate_record(null::curtainsuk_private.supplier_promotion_events,to_jsonb(e)||jsonb_build_object('event_id','approval:newer:LOW','snapshot_id','newer:LOW'))).* from curtainsuk_private.supplier_promotion_events e where snapshot_id='test:LOW';`);await call();
},/NOT_LATEST/);
await reject('anonymous execution',async()=>{await db.exec('set local role anon');await call();},/permission denied/);
await reject('authenticated execution',async()=>{await db.exec('set local role authenticated');await call();},/permission denied/);
await reject('later row failure rolls back earlier stock and audit writes',async()=>{
 await db.exec(`create function curtainsuk_private.test_reject_zero() returns trigger language plpgsql as $$begin if new.supplier_sku='ZERO' then raise exception 'TEST_LATE_FAILURE'; end if;return new;end$$;
 create trigger zz_test_late before insert on curtainsuk_private.daily_stock_snapshots for each row execute function curtainsuk_private.test_reject_zero();`);await call();
},/TEST_LATE_FAILURE/);
await assert.rejects(()=>call(),/SERIALIZABLE_TRANSACTION/);
passed++; console.log('PASS default-isolation invocation rejected');
await db.exec('begin isolation level serializable; set local role service_role;');
const result=(await call()).rows[0].result;
assert.equal(result.rows_affected,3);
assert.deepEqual(result.results.map(x=>x.supplier_sku),['HIGH','LOW','ZERO']);
assert.deepEqual(result.results.map(x=>x.aggregate_metres),[40,12,0]);
assert.deepEqual(await mutations(),{stock:3,history:3,events:1,runs:0});
assert.equal((await db.query(`select count(*)::int n from curtainsuk_private.daily_stock_snapshots where supplier_sku in ('OUTSIDE','UNKNOWN')`)).rows[0].n,0);
await db.exec('rollback');
assert.deepEqual(await mutations(),{stock:0,history:0,events:0,runs:0});
passed++; console.log('PASS service-role scoped execution, audit, out-of-scope isolation and transaction rollback');
await db.exec('begin isolation level serializable;');
await call();
await db.exec('commit');
assert.deepEqual(await mutations(),{stock:3,history:3,events:1,runs:0});
await db.exec('begin isolation level serializable;');
await assert.rejects(()=>call(),/NEWER_OBSERVATION/);
await db.exec('rollback');
assert.deepEqual(await mutations(),{stock:3,history:3,events:1,runs:0});
passed++; console.log('PASS committed isolated execution and repeat rejection');
const commercial=(await db.query(`select curtainsuk_private.fabric_commercial_evidence(array['fabric:HIGH','fabric:LOW','fabric:ZERO','fabric:UNKNOWN']) result`)).rows[0].result;
const byId=Object.fromEntries(commercial.map(x=>[x.fabric_id,x]));
assert.equal(byId['fabric:HIGH'].stock,'FABRIC_AVAILABLE');assert.equal(byId['fabric:HIGH'].sample_stock_available,true);
assert.equal(byId['fabric:LOW'].stock,'TEMPORARILY_UNAVAILABLE');assert.equal(byId['fabric:LOW'].sample_stock_available,true);
assert.equal(byId['fabric:ZERO'].stock,'TEMPORARILY_UNAVAILABLE');assert.equal(byId['fabric:ZERO'].sample_stock_available,false);
assert.equal(byId['fabric:UNKNOWN'].stock,'AVAILABILITY_TO_BE_CONFIRMED');assert.equal(byId['fabric:UNKNOWN'].sample_stock_available,false);
passed++; console.log('PASS approved commercial-evidence migration: high, low, zero, unknown');
await db.exec(`insert into curtainsuk_private.supplier_snapshots select (jsonb_populate_record(null::curtainsuk_private.supplier_snapshots,to_jsonb(s)||jsonb_build_object('snapshot_id','updated:HIGH','checked_at',now()-interval '10 seconds','source_name','SDG authenticated trade portal Stock Detail UI','source_reference','https://trade.sandersondesigngroup.com/search/HIGH','normalized_payload',s.normalized_payload||jsonb_build_object('snapshot_id','updated:HIGH','checked_at',now()-interval '10 seconds')))).* from curtainsuk_private.supplier_snapshots s where snapshot_id='test:HIGH';
 insert into curtainsuk_private.supplier_promotion_events select (jsonb_populate_record(null::curtainsuk_private.supplier_promotion_events,to_jsonb(e)||jsonb_build_object('event_id','approval:updated:HIGH','snapshot_id','updated:HIGH'))).* from curtainsuk_private.supplier_promotion_events e where snapshot_id='test:HIGH';`);
await db.exec('begin isolation level serializable; set local role service_role;');
const updated=(await call([{...scope[0],snapshot_id:'updated:HIGH'}])).rows[0].result;
assert.equal(updated.rows_affected,1);
assert.deepEqual(await mutations(),{stock:3,history:4,events:2,runs:0});
await db.exec('rollback');
assert.deepEqual(await mutations(),{stock:3,history:3,events:1,runs:0});
passed++;console.log('PASS newer UI observation updates only selected row and preserves original audit history');
await db.close();
console.log(JSON.stringify({passed,productionConnections:0,syntheticDataLocation:'in-memory isolated PGlite only'}));
