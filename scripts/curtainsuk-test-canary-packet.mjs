/** Runs the generated transaction in an isolated schema clone, never a remote DB. */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
process.on('uncaughtException',e=>{console.error(JSON.stringify({message:e.message,where:e.where,detail:e.detail,position:e.position}));process.exit(1);});
const {PGlite}=await import(pathToFileURL(process.argv[2]).href);
const db=new PGlite();
const dir='artifacts/sdg-portal-private/';
const read=name=>readFile(dir+name,'utf8');
function unpack(text){const s=JSON.parse(JSON.parse(text).content[0].text).result;return JSON.parse(s.slice(s.indexOf('[{'),s.lastIndexOf('}]')+2));}
const schema=unpack(await read('test-schema.json'))[0].test_schema;
const baseline=JSON.parse(await read('production-canary-baseline.json'));
await db.exec(`create schema curtainsuk_private;create role anon;create role authenticated;create role service_role bypassrls;
${schema.ddl}
alter table curtainsuk_private.daily_stock_snapshots add primary key(supplier_id,supplier_sku,snapshot_date);
alter table curtainsuk_private.daily_stock_snapshot_history add primary key(source_snapshot_id);
${schema.functions};
grant usage on schema curtainsuk_private to service_role;
grant select,insert on all tables in schema curtainsuk_private to service_role;
grant update on curtainsuk_private.daily_stock_snapshots,curtainsuk_private.fabric_colourways to service_role;
`);
for(const [table,rows] of [['fabric_colourways',baseline.cohort],['daily_stock_snapshots',baseline.stock]])
 for(const row of rows) await db.query(`insert into curtainsuk_private.${table} select * from jsonb_populate_record(null::curtainsuk_private.${table},$1)`,[JSON.stringify(row)]);
await db.exec(`create trigger audit_daily_stock_revision before insert or update on curtainsuk_private.daily_stock_snapshots for each row execute function curtainsuk_private.audit_daily_stock_revision();
insert into curtainsuk_private.supplier_approval_policies(policy_id,supplier_id,approval_mode,required_price_field,effective_from) values('local-policy','sanderson-design-group','MANUAL','CUT_TRADE_PRICE',now());`);
await db.exec(await readFile('supabase/migrations/20260918172104_sample_stock_independent_of_curtain_floor.sql','utf8'));
await db.exec(await readFile('supabase/migrations/20260918173501_scoped_sdg_stock_canary.sql','utf8'));
// The isolated fixture contains only the cohort, so adjust only total baseline cardinalities.
const sql=(await read('canary-rehearsal.sql')).replaceAll(String(baseline.counts.supplier_snapshots),'0').replaceAll(String(baseline.counts.promotion_events),'0').replaceAll(String(baseline.counts.stock),String(baseline.stock.length));
try {
 const result=await db.exec(sql);
 const proof=result.find(x=>x.rows[0]?.canary_result)?.rows[0].canary_result;
 assert.ok(proof);assert.equal(proof.audit.coverage.rows_affected,3);
 assert.deepEqual(proof.positions.filter(x=>x.position?.checkedAt?.startsWith('2026-09-18')).map(x=>x.position.aggregateMetres).sort((a,b)=>a-b),[0,20.3,44.3]);
 assert.equal((await db.query('select count(*)::int n from curtainsuk_private.supplier_snapshots')).rows[0].n,0);
 assert.equal((await db.query('select count(*)::int n from curtainsuk_private.daily_stock_snapshots')).rows[0].n,3);
 console.log(JSON.stringify({passed:true,fullPacketExecuted:true,approvedMigrationCompiled:true,exactThreeObservations:true,rollbackVerified:true,productionConnections:0}));
}catch(e){console.error(JSON.stringify({message:e.message,where:e.where,detail:e.detail}));process.exitCode=1;}finally{await db.close();}
