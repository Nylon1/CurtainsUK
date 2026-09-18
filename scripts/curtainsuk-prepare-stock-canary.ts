/** Local-only packet generation. It never opens a database or retrieves credentials. */
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {normalizeSupplierSnapshot} from '../lib/supplier-sync/normalize';
import {validateSupplierIntelligenceSnapshot} from '../lib/supplier-intelligence/validation';
import {createValidationEvent,createManualApprovalEvent} from '../lib/supplier-intelligence/promotion';
import type {DurableSupplierSnapshot} from '../lib/supplier-intelligence/types';

async function main(){
const dir='artifacts/sdg-portal-private/';
const evidenceText=await readFile(dir+'canary-ui-evidence-2026-09-18.json','utf8');
const evidence=JSON.parse(evidenceText);
const baseline=JSON.parse(await readFile(dir+'production-canary-baseline.json','utf8'));
const actor='554dcc42-4bb0-4db1-8ae8-d97413051548'; // Existing labelled Codex audit identity, not an application user.
const reason='Codex operator under explicit owner instruction in thread 01a0ab54-5b9d-7473-8b99-5ca8ecac9ad5 on 2026-09-18: controlled Production canary only. Fresh exact-SKU authenticated SDG Stock Detail UI available-now metres; no future/offsite stock, no supplier order, no synthetic stock, no scheduler or bulk import.';
const digest=createHash('sha256').update(evidenceText).digest('hex');
const sqlJson=(x:unknown)=>`'${JSON.stringify(x).replaceAll("'","''")}'::jsonb`;
const at=new Date();
assert.equal(evidence.observations.length,3);
assert.deepEqual(evidence.observations.map((o:any)=>o.supplierSku),['AARC520004','AARC520020','CCF0874-01']);
const items=evidence.observations.map((o:any)=>{
 const master=baseline.cohort.find((c:any)=>c.fabric_id===o.fabricId);
 assert.ok(master&&master.supplier_sku===o.supplierSku&&master.brand_id===o.brandId&&master.supplier_id==='sanderson-design-group');
 assert.equal(master.colour_name,o.colour);assert.equal(master.staging_catalog_visible,true);assert.equal(master.storefront_selectable,true);
 assert.ok(master.lifecycle_state!=='DISCONTINUED');assert.equal(o.unit,'Metres');
 assert.ok(Number.isFinite(o.primaryMetres)&&o.primaryMetres>=0);
 assert.ok(Date.parse(o.checkedAt)<=at.getTime()&&at.getTime()-Date.parse(o.checkedAt)<3600000,'Fresh recorded portal evidence required');
 const snapshot=normalizeSupplierSnapshot({snapshot_id:`sdg-canary:${o.supplierSku}:${digest.slice(0,16)}`,supplier_id:master.supplier_id,
 brand_id:o.brandId,supplier_sku:o.supplierSku,checked_at:o.checkedAt,stock_unit:'METRE',aggregate_available_quantity:o.primaryMetres,
 batches:null,lifecycle_state:'UNKNOWN',sample_available:null,
 source:{type:'MANUAL_PORTAL',name:'SDG authenticated trade portal Stock Detail UI',reference:o.url},verification_status:'VERIFIED'});
 const validation=validateSupplierIntelligenceSnapshot(snapshot,{known_supplier:true,known_sku:true,allowed_currencies:['GBP'],allowed_stock_units:['METRE'],required_price_field:'CUT_TRADE_PRICE',freshness_policies:[]},at);
 assert.equal(validation.status,'VALIDATED',validation.errors.join(','));
 const run={run_id:`${snapshot.snapshot_id}:run`,supplier_id:master.supplier_id,adapter_id:'sdg-stock-detail-ui-canary',mode:'SHADOW',source_type:'MANUAL_PORTAL',source_name:snapshot.source.name,started_at:o.checkedAt,completed_at:o.checkedAt,status:'SUCCEEDED',snapshots_received:1,snapshots_appended:1,error_code:null,shopify_writes:0,production_schedule_created:false};
 const payload={...snapshot,run_id:run.run_id,source_type:snapshot.source.type,source_name:snapshot.source.name,source_reference:snapshot.source.reference,validation_status:validation.status,validation_errors:validation.errors,stock_expires_at:validation.stock_expires_at,price_expires_at:null,lifecycle_expires_at:null,normalized_payload:snapshot};
 const event=createValidationEvent(snapshot.snapshot_id,validation,new Date(at.getTime()-1).toISOString());
 const approval=createManualApprovalEvent({snapshot:payload as unknown as DurableSupplierSnapshot,validation,approvedBy:actor,approvedAt:at.toISOString(),reason:`${reason} Evidence SHA256 ${digest}.`,previousApprovedSnapshotId:null});
 return {observation:o,run,payload,event,approval,scope:{fabric_id:o.fabricId,supplier_id:master.supplier_id,supplier_sku:o.supplierSku,snapshot_id:snapshot.snapshot_id}};
});
assert.ok(items[0].observation.primaryMetres>=30&&items[1].observation.primaryMetres>0&&items[1].observation.primaryMetres<30&&items[2].observation.primaryMetres===0);
const scope=items.map((i:any)=>i.scope);
const ids=items.map((i:any)=>i.payload.snapshot_id);
const sqlIds=ids.map((id:string)=>`'${id.replaceAll("'","''")}'`).join(',');
const tableHash=(table:string,filter='true')=>`(select md5(coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'')) from curtainsuk_private.${table} r where ${filter})`;
const beforeHashes=['daily_stock_snapshots','daily_stock_runs','daily_stock_usage','fabric_colourways'].map(t=>tableHash(t));
const afterHashes=[tableHash('daily_stock_snapshots',`source_snapshot_id not in (${sqlIds})`),...['daily_stock_runs','daily_stock_usage','fabric_colourways'].map(t=>tableHash(t))];
const expectedCommercial=[['sdg-aarc520004','FABRIC_AVAILABLE',true],['sdg-aarc520020','TEMPORARILY_UNAVAILABLE',true],['sdg-ccf0874-01','TEMPORARILY_UNAVAILABLE',false],['sdg-zald332703','AVAILABILITY_TO_BE_CONFIRMED',false]];
const sql=`begin isolation level serializable;
set local lock_timeout='2s'; set local statement_timeout='30s';
-- Administrative locks prevent concurrent source/stock edits for this short canary transaction.
lock table curtainsuk_private.daily_stock_snapshots,curtainsuk_private.daily_stock_runs,curtainsuk_private.daily_stock_usage,
curtainsuk_private.supplier_snapshots,curtainsuk_private.supplier_promotion_events,curtainsuk_private.fabric_colourways in share row exclusive mode;
set local role service_role;
do $canary$
declare before_hashes text[]; after_hashes text[]; result jsonb; commercial jsonb; row jsonb; counts_before bigint[];
begin
 if extract(hour from now() at time zone 'Europe/London')=6 then raise exception 'CANARY_SCHEDULER_WINDOW_BLOCKED'; end if;
 if exists(select 1 from curtainsuk_private.daily_stock_snapshots where supplier_id='sanderson-design-group' and supplier_sku in ('AARC520004','AARC520020','CCF0874-01') and snapshot_date='2026-09-18') then raise exception 'CANARY_EXPECTED_INSERT_BASELINE_CHANGED'; end if;
 if (select jsonb_agg(to_jsonb(c) order by c.fabric_id) from curtainsuk_private.fabric_colourways c where c.fabric_id in ('sdg-aarc520004','sdg-aarc520020','sdg-ccf0874-01','sdg-zald332703')) is distinct from ${sqlJson([...baseline.cohort].sort((a:any,b:any)=>a.fabric_id.localeCompare(b.fabric_id)))} then raise exception 'CANARY_MASTER_BASELINE_CHANGED'; end if;
 if exists(select 1 from curtainsuk_private.daily_stock_snapshots where supplier_id='sanderson-design-group' and supplier_sku='ZALD332703') then raise exception 'CANARY_UNKNOWN_CONTROL_CHANGED'; end if;
 if not exists(select 1 from curtainsuk_private.supplier_approval_policies where supplier_id='sanderson-design-group' and approval_mode='MANUAL') then raise exception 'CANARY_MANUAL_POLICY_REQUIRED'; end if;
 if (select count(*) from curtainsuk_private.supplier_snapshots)<>${baseline.counts.supplier_snapshots} or (select count(*) from curtainsuk_private.supplier_promotion_events)<>${baseline.counts.promotion_events} or (select count(*) from curtainsuk_private.daily_stock_snapshots)<>${baseline.counts.stock} then raise exception 'CANARY_BASELINE_COUNT_CHANGED'; end if;
 before_hashes:=array[${beforeHashes.join(',')}];
 counts_before:=array[(select count(*) from curtainsuk_private.supplier_sync_runs),(select count(*) from curtainsuk_private.supplier_snapshot_prices),(select count(*) from curtainsuk_private.supplier_snapshot_batches),(select count(*) from curtainsuk_private.daily_stock_snapshot_history),(select count(*) from curtainsuk_private.daily_stock_materialization_events)];
 ${items.map((i:any)=>`if '${i.payload.checked_at}'::timestamptz<now()-interval '1 hour' or '${i.payload.checked_at}'::timestamptz>now() then raise exception 'CANARY_FRESH_READ_REQUIRED'; end if;
 perform curtainsuk_private.append_validated_supplier_snapshot(${sqlJson(i.run)},${sqlJson(i.payload)},${sqlJson(i.event)});
 insert into curtainsuk_private.supplier_promotion_events(event_id,snapshot_id,promotion_state,actor_type,actor_id,reason,rejection_reason,previous_approved_snapshot_id,created_at)
 select e.event_id,e.snapshot_id,e.promotion_state,e.actor_type,e.actor_id,e.reason,e.rejection_reason,
 (select s.snapshot_id from curtainsuk_private.supplier_snapshots s where s.supplier_id='sanderson-design-group' and s.supplier_sku='${i.scope.supplier_sku}' and s.snapshot_id<>e.snapshot_id and (select p.promotion_state from curtainsuk_private.supplier_promotion_events p where p.snapshot_id=s.snapshot_id order by p.created_at desc limit 1)='APPROVED_FOR_PROJECTION' order by s.checked_at desc limit 1),e.created_at
 from jsonb_populate_record(null::curtainsuk_private.supplier_promotion_events,${sqlJson(i.approval)}) e;`).join('\n')}
 result:=curtainsuk_private.materialize_sdg_stock_canary(${sqlJson(scope)},'${actor}');
 if (result->>'rows_affected')::integer<>3 then raise exception 'CANARY_WRONG_ROW_COUNT'; end if;
 after_hashes:=array[${afterHashes.join(',')}];
 if before_hashes is distinct from after_hashes then raise exception 'CANARY_UNEXPECTED_MATERIALISATION_EFFECT'; end if;
 if (select count(*) from curtainsuk_private.supplier_snapshots)<>${baseline.counts.supplier_snapshots}+3 or (select count(*) from curtainsuk_private.supplier_promotion_events)<>${baseline.counts.promotion_events}+6 or (select count(*) from curtainsuk_private.daily_stock_snapshots)<>${baseline.counts.stock}+3 or
 array[(select count(*) from curtainsuk_private.supplier_sync_runs),(select count(*) from curtainsuk_private.supplier_snapshot_prices),(select count(*) from curtainsuk_private.supplier_snapshot_batches),(select count(*) from curtainsuk_private.daily_stock_snapshot_history),(select count(*) from curtainsuk_private.daily_stock_materialization_events)] is distinct from array[counts_before[1]+3,counts_before[2]+3,counts_before[3],counts_before[4]+3,counts_before[5]+1] then raise exception 'CANARY_UNEXPECTED_MUTATION_COUNT'; end if;
 commercial:=curtainsuk_private.fabric_commercial_evidence(array['sdg-aarc520004','sdg-aarc520020','sdg-ccf0874-01','sdg-zald332703']);
 ${expectedCommercial.map(([id,stock,sample])=>`select value into row from jsonb_array_elements(commercial) where value->>'fabric_id'='${id}';
 if row is null or row->>'stock'<>'${stock}' or (row->>'sample_stock_available')::boolean is distinct from ${sample} then raise exception 'CANARY_JOURNEY_STATE_MISMATCH_${id}'; end if;`).join('\n')}
end $canary$;
select jsonb_build_object('mode','SCOPED_CANARY','positions',(select jsonb_agg(jsonb_build_object('fabric_id',c.fabric_id,'supplier_sku',c.supplier_sku,'position',curtainsuk_private.daily_stock_position(c.supplier_id,c.supplier_sku))) from curtainsuk_private.fabric_colourways c where fabric_id in ('sdg-aarc520004','sdg-aarc520020','sdg-ccf0874-01','sdg-zald332703')),'commercial',curtainsuk_private.fabric_commercial_evidence(array['sdg-aarc520004','sdg-aarc520020','sdg-ccf0874-01','sdg-zald332703']),'audit',(select to_jsonb(e) from curtainsuk_private.daily_stock_materialization_events e where coverage->>'mode'='EXACT_SDG_CANARY' order by attempted_at desc limit 1)) as canary_result;
ROLLBACK;
`;
await writeFile(dir+'canary-packet.json',JSON.stringify({preparedAt:at.toISOString(),operator:actor,evidenceSha256:digest,scope,items},null,2));
await writeFile(dir+'canary-rehearsal.sql',sql);
await writeFile(dir+'canary-commit.sql',sql.replace(/ROLLBACK;\s*$/,'COMMIT;\n'));
await writeFile(dir+'rollback-functions.sql','begin;\n'+baseline.functions.filter((f:any)=>f.name!=='materialize_daily_stock').map((f:any)=>f.definition+';').join('\n')+'\ndrop function if exists curtainsuk_private.materialize_sdg_stock_canary(jsonb,uuid);\ncommit;\n');
console.log(JSON.stringify({prepared:true,productionWrites:0,operator:actor,scope,evidenceSha256:digest}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
