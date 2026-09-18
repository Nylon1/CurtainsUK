begin;
create function curtainsuk_private.materialize_pt_stock_canary(p_scope jsonb, p_operator uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 item jsonb; s curtainsuk_private.supplier_snapshots%rowtype; n integer; expected integer;
 outcome jsonb; outcomes jsonb := '[]'; audit_id uuid; t timestamptz := now();
begin
 if p_operator is null then raise exception 'CANARY_OPERATOR_REQUIRED'; end if;
 if p_scope is null or jsonb_typeof(p_scope)<>'array' then raise exception 'CANARY_EXPLICIT_SCOPE_REQUIRED'; end if;
 expected := jsonb_array_length(p_scope);
 if expected<1 or expected>3 then raise exception 'CANARY_SCOPE_LIMIT_1_TO_3'; end if;
 for item in select value from jsonb_array_elements(p_scope) loop
  if jsonb_typeof(item)<>'object' or
     (select count(*) from jsonb_object_keys(item))<>4 or
     not (item ?& array['fabric_id','supplier_id','supplier_sku','snapshot_id']) or
     exists(select 1 from jsonb_each(item) e where jsonb_typeof(e.value)<>'string' or length(trim(e.value #>> '{}'))=0) or
     item->>'supplier_id'<>'prestigious-textiles'
  then raise exception 'CANARY_EXACT_IDENTITY_REQUIRED'; end if;
 end loop;
 if (select count(distinct value->>'fabric_id') from jsonb_array_elements(p_scope))<>expected or
    (select count(distinct value->>'supplier_sku') from jsonb_array_elements(p_scope))<>expected or
    (select count(distinct value->>'snapshot_id') from jsonb_array_elements(p_scope))<>expected
 then raise exception 'CANARY_DUPLICATE_IDENTITY'; end if;

 -- Same lock as the existing materialiser; retain locks through the caller's transaction.
 perform pg_advisory_xact_lock(hashtext('curtainsuk-daily-stock-'||(t at time zone 'Europe/London')::date));
 -- A serializable caller transaction gives one consistent evidence/approval view
 -- without granting mutation privileges on immutable supplier history.
 if current_setting('transaction_isolation')<>'serializable' then raise exception 'CANARY_SERIALIZABLE_TRANSACTION_REQUIRED'; end if;
 for item in select value from jsonb_array_elements(p_scope) loop
  select * into s from curtainsuk_private.supplier_snapshots where snapshot_id=item->>'snapshot_id';
  if not found then raise exception 'CANARY_SOURCE_NOT_FOUND'; end if;
  if s.supplier_id is distinct from item->>'supplier_id' or s.supplier_sku is distinct from item->>'supplier_sku' or
     (select count(*) from curtainsuk_private.fabric_colourways c where c.supplier_id=s.supplier_id and c.supplier_sku=s.supplier_sku)<>1 or
     not exists(select 1 from curtainsuk_private.fabric_colourways c where c.fabric_id=item->>'fabric_id'
       and c.supplier_id=s.supplier_id and c.supplier_sku=s.supplier_sku and c.brand_id=s.brand_id
       and c.lifecycle_state in ('CURRENT','UNKNOWN'))
  then raise exception 'CANARY_MASTER_IDENTITY_MISMATCH'; end if;
  if s.validation_status<>'VALIDATED' or s.verification_status<>'VERIFIED' or
     s.source_type<>'MANUAL_PORTAL' or not (
       (s.source_name='Prestigious Webtex authenticated Stock Enquiry' and right(s.source_reference,length(s.supplier_sku)+1)=':'||s.supplier_sku and left(s.source_reference,10)='pt:Webtex:')
     ) or s.source_reference is null or
     s.checked_at>t or s.checked_at<t-curtainsuk_private.stock_validity_window() or s.stock_unit is distinct from 'METRE' or
     s.lifecycle_state not in ('CURRENT','UNKNOWN') or
     s.normalized_payload->>'stock_unit' is distinct from 'METRE' or
     jsonb_typeof(s.normalized_payload->'aggregate_available_quantity') is distinct from 'number' or
     s.aggregate_available_quantity is null or s.aggregate_available_quantity<0 or
     s.aggregate_available_quantity is distinct from (s.normalized_payload->>'aggregate_available_quantity')::numeric or
     s.normalized_payload->>'supplier_id' is distinct from s.supplier_id or
     s.normalized_payload->>'supplier_sku' is distinct from s.supplier_sku or
     s.normalized_payload->>'snapshot_id' is distinct from s.snapshot_id or
     (s.normalized_payload->>'checked_at')::timestamptz is distinct from s.checked_at or
     s.normalized_payload->>'lifecycle_state' is distinct from s.lifecycle_state
  then raise exception 'CANARY_INVALID_SOURCE_EVIDENCE'; end if;
  if not exists(select 1 from curtainsuk_private.supplier_promotion_events e
      where e.snapshot_id=s.snapshot_id and e.created_at=(select max(x.created_at) from curtainsuk_private.supplier_promotion_events x where x.snapshot_id=s.snapshot_id)
      group by e.snapshot_id having count(*)=1 and bool_and(e.promotion_state='APPROVED_FOR_PROJECTION'
        and e.actor_type='MANUAL_STAFF' and e.actor_id=p_operator and e.created_at<=t))
  then raise exception 'CANARY_CURRENT_OPERATOR_APPROVAL_REQUIRED'; end if;
  if exists(select 1 from curtainsuk_private.supplier_snapshots other
      where other.supplier_id=s.supplier_id and other.supplier_sku=s.supplier_sku and other.snapshot_id<>s.snapshot_id
      and other.checked_at>=s.checked_at and other.validation_status='VALIDATED'
      and (select e.promotion_state from curtainsuk_private.supplier_promotion_events e where e.snapshot_id=other.snapshot_id order by e.created_at desc limit 1)='APPROVED_FOR_PROJECTION')
  then raise exception 'CANARY_NOT_LATEST_APPROVED_SOURCE'; end if;
  -- Fail instead of claiming success for an older, tied or already-applied observation.
  if exists(select 1 from curtainsuk_private.daily_stock_snapshots d where d.supplier_id=s.supplier_id
       and d.supplier_sku=s.supplier_sku and d.checked_at>=s.checked_at)
  then raise exception 'CANARY_NEWER_OBSERVATION_REQUIRED'; end if;
 end loop;

 for item in select value from jsonb_array_elements(p_scope) loop
  select * into strict s from curtainsuk_private.supplier_snapshots where snapshot_id=item->>'snapshot_id';
  insert into curtainsuk_private.daily_stock_snapshots
    (supplier_id,supplier_sku,snapshot_date,checked_at,source_snapshot_id,aggregate_metres,cut_price_minor,lifecycle_state)
  values (s.supplier_id,s.supplier_sku,(s.checked_at at time zone 'Europe/London')::date,s.checked_at,s.snapshot_id,
    s.aggregate_available_quantity,
    case when s.normalized_payload->>'currency'='GBP' and (s.normalized_payload->>'cut_trade_price')::numeric>0 then round((s.normalized_payload->>'cut_trade_price')::numeric*100)::integer end,
    s.lifecycle_state)
  on conflict(supplier_id,supplier_sku,snapshot_date) do update set
    checked_at=excluded.checked_at,source_snapshot_id=excluded.source_snapshot_id,aggregate_metres=excluded.aggregate_metres,
    cut_price_minor=excluded.cut_price_minor,lifecycle_state=excluded.lifecycle_state
  where excluded.checked_at>daily_stock_snapshots.checked_at
  returning jsonb_build_object('fabric_id',item->>'fabric_id','supplier_id',supplier_id,'supplier_sku',supplier_sku,
    'snapshot_id',source_snapshot_id,'snapshot_date',snapshot_date,'checked_at',checked_at,'aggregate_metres',aggregate_metres) into outcome;
  get diagnostics n=row_count;
  if n<>1 then raise exception 'CANARY_MATERIALIZATION_SCOPE_MISMATCH'; end if;
  outcomes:=outcomes||jsonb_build_array(outcome);
 end loop;
 if jsonb_array_length(outcomes)<>expected then raise exception 'CANARY_MATERIALIZATION_SCOPE_MISMATCH'; end if;
 insert into curtainsuk_private.daily_stock_materialization_events(results,coverage)
 values(outcomes,jsonb_build_object('mode','EXACT_PT_CANARY','operator_id',p_operator,'scope',p_scope,'rows_affected',expected))
 returning event_id into audit_id;
 return jsonb_build_object('event_id',audit_id,'rows_affected',expected,'results',outcomes);
end $$;
revoke all on function curtainsuk_private.materialize_pt_stock_canary(jsonb,uuid) from public,anon,authenticated;
grant execute on function curtainsuk_private.materialize_pt_stock_canary(jsonb,uuid) to service_role;

create function curtainsuk_private.approve_pt_webtex_stock_run(p_run_id text)
returns integer language plpgsql security invoker set search_path='' as $$
declare expected integer;
begin
 if current_user <> 'service_role' then raise exception 'PT_SERVICE_ROLE_REQUIRED'; end if;
 if p_run_id is null or p_run_id !~ '^pt-webtex-routine:[a-f0-9-]{36}:[0-9]{3}$' then raise exception 'PT_ROUTINE_RUN_ID_REQUIRED'; end if;
 perform pg_advisory_xact_lock(hashtext('curtainsuk-pt-stock-approval-'||p_run_id));
 select r.snapshots_appended into expected from curtainsuk_private.supplier_sync_runs r
 where r.run_id=p_run_id and r.supplier_id='prestigious-textiles'
 and r.adapter_id='pt-webtex-stock-enquiry' and r.source_type='MANUAL_PORTAL'
 and r.source_name='Prestigious Webtex authenticated Stock Enquiry'
 and r.status='SUCCEEDED' and r.snapshots_received=r.snapshots_appended;
 if expected is null or expected<1 or expected>100 then raise exception 'PT_ROUTINE_BATCH_REQUIRED'; end if;
 if (select count(*) from curtainsuk_private.supplier_snapshots s where s.run_id=p_run_id)<>expected then raise exception 'PT_ROUTINE_SNAPSHOT_COUNT_MISMATCH'; end if;
 if exists (
  select 1 from curtainsuk_private.supplier_snapshots s
  where s.run_id=p_run_id and (
   s.supplier_id<>'prestigious-textiles' or s.brand_id<>'prestigious-textiles'
   or s.validation_status<>'VALIDATED' or s.verification_status<>'VERIFIED'
   or s.source_type<>'MANUAL_PORTAL' or s.source_name<>'Prestigious Webtex authenticated Stock Enquiry'
   or s.source_reference is null or left(s.source_reference,10)<>'pt:Webtex:' or right(s.source_reference,length(s.supplier_sku)+1)<>':'||s.supplier_sku
   or s.checked_at>now() or s.checked_at<now()-curtainsuk_private.stock_validity_window()
   or s.stock_unit<>'METRE' or s.aggregate_available_quantity is null or s.aggregate_available_quantity<0
   or s.normalized_payload->>'snapshot_id' is distinct from s.snapshot_id
   or s.normalized_payload->>'supplier_sku' is distinct from s.supplier_sku
   or s.normalized_payload->>'stock_unit' is distinct from 'METRE'
   or (s.normalized_payload->>'checked_at')::timestamptz is distinct from s.checked_at
   or (s.normalized_payload->>'aggregate_available_quantity')::numeric is distinct from s.aggregate_available_quantity
   or s.lifecycle_state not in ('CURRENT','UNKNOWN')
   or exists(select 1 from curtainsuk_private.supplier_snapshot_prices p where p.snapshot_id=s.snapshot_id and (p.standard_trade_price is not null or p.cut_trade_price is not null))
   or (select count(*) from curtainsuk_private.fabric_colourways c where c.supplier_id=s.supplier_id and c.supplier_sku=s.supplier_sku and c.brand_id=s.brand_id and c.lifecycle_state in ('CURRENT','UNKNOWN'))<>1
  )
 ) then raise exception 'PT_ROUTINE_EVIDENCE_NOT_APPROVABLE'; end if;
 if exists(select 1 from curtainsuk_private.supplier_snapshots s join curtainsuk_private.supplier_promotion_events e on e.snapshot_id=s.snapshot_id
   where s.run_id=p_run_id and e.promotion_state in ('REJECTED','EXPIRED')) then raise exception 'PT_ROUTINE_REJECTED_EVIDENCE'; end if;
 insert into curtainsuk_private.supplier_promotion_events
 (event_id,snapshot_id,promotion_state,actor_type,actor_id,reason,rejection_reason,previous_approved_snapshot_id,created_at)
 select s.snapshot_id||':pt-routine-policy',s.snapshot_id,'APPROVED_FOR_PROJECTION','POLICY',null,
 'Owner-approved exact-SKU PT Webtex stock-only policy; current primary metres, 96-hour expiry, no inferred price or lifecycle.',null,
 (select prior.snapshot_id from curtainsuk_private.supplier_snapshots prior where prior.supplier_id=s.supplier_id and prior.supplier_sku=s.supplier_sku and prior.snapshot_id<>s.snapshot_id
   and (select e.promotion_state from curtainsuk_private.supplier_promotion_events e where e.snapshot_id=prior.snapshot_id order by e.created_at desc limit 1)='APPROVED_FOR_PROJECTION'
   order by prior.checked_at desc limit 1),now()
 from curtainsuk_private.supplier_snapshots s where s.run_id=p_run_id
 on conflict (event_id) do nothing;
 if (select count(*) from curtainsuk_private.supplier_snapshots s join curtainsuk_private.supplier_promotion_events e on e.snapshot_id=s.snapshot_id and e.event_id=s.snapshot_id||':pt-routine-policy' where s.run_id=p_run_id) <> expected then raise exception 'PT_ROUTINE_APPROVAL_COUNT_MISMATCH'; end if;
 return expected;
end $$;
revoke all on function curtainsuk_private.approve_pt_webtex_stock_run(text) from public,anon,authenticated;
grant execute on function curtainsuk_private.approve_pt_webtex_stock_run(text) to service_role;

-- Materialise only the exact approved PT batch. The supplier-wide daily
-- materialiser also touches SDG, so this PT path deliberately leaves it alone.
create function curtainsuk_private.materialize_pt_webtex_stock_run(p_run_id text)
returns integer language plpgsql security invoker set search_path='' as $$
declare expected integer; applied integer; d date := (now() at time zone 'Europe/London')::date;
begin
 if current_user <> 'service_role' then raise exception 'PT_SERVICE_ROLE_REQUIRED'; end if;
 if p_run_id is null or p_run_id !~ '^pt-webtex-routine:[a-f0-9-]{36}:[0-9]{3}$' then raise exception 'PT_ROUTINE_RUN_ID_REQUIRED'; end if;
 perform pg_advisory_xact_lock(hashtext('curtainsuk-daily-stock-'||d));
 select r.snapshots_appended into expected from curtainsuk_private.supplier_sync_runs r
 where r.run_id=p_run_id and r.supplier_id='prestigious-textiles' and r.adapter_id='pt-webtex-stock-enquiry'
 and r.status='SUCCEEDED' and r.snapshots_received=r.snapshots_appended;
 if expected is null or expected<1 or expected>100 then raise exception 'PT_ROUTINE_BATCH_REQUIRED'; end if;
 if (select count(*) from curtainsuk_private.supplier_snapshots s
   join curtainsuk_private.supplier_promotion_events e on e.snapshot_id=s.snapshot_id
    and e.event_id=s.snapshot_id||':pt-routine-policy' and e.promotion_state='APPROVED_FOR_PROJECTION'
   where s.run_id=p_run_id and s.supplier_id='prestigious-textiles' and s.validation_status='VALIDATED'
    and s.verification_status='VERIFIED' and s.checked_at<=now()
    and s.checked_at>=now()-curtainsuk_private.stock_validity_window()
    and s.stock_unit='METRE' and s.aggregate_available_quantity>=0) <> expected
 then raise exception 'PT_MATERIALISATION_EVIDENCE_MISMATCH'; end if;
 if exists(select 1 from curtainsuk_private.supplier_snapshots s
   join curtainsuk_private.daily_stock_snapshots d on d.supplier_id=s.supplier_id and d.supplier_sku=s.supplier_sku
   where s.run_id=p_run_id and d.checked_at>=s.checked_at)
 then raise exception 'PT_NEWER_OBSERVATION_REQUIRED'; end if;
 insert into curtainsuk_private.daily_stock_snapshots
 (supplier_id,supplier_sku,snapshot_date,checked_at,source_snapshot_id,aggregate_metres,cut_price_minor,lifecycle_state)
 select s.supplier_id,s.supplier_sku,(s.checked_at at time zone 'Europe/London')::date,s.checked_at,s.snapshot_id,
  s.aggregate_available_quantity,null,s.lifecycle_state
 from curtainsuk_private.supplier_snapshots s where s.run_id=p_run_id
 on conflict(supplier_id,supplier_sku,snapshot_date) do update set
  checked_at=excluded.checked_at,source_snapshot_id=excluded.source_snapshot_id,
  aggregate_metres=excluded.aggregate_metres,cut_price_minor=excluded.cut_price_minor,
  lifecycle_state=excluded.lifecycle_state
 where excluded.checked_at>daily_stock_snapshots.checked_at;
 get diagnostics applied=row_count;
 if applied<>expected then raise exception 'PT_MATERIALISATION_COUNT_MISMATCH'; end if;
 insert into curtainsuk_private.daily_stock_materialization_events(results,coverage)
 values(jsonb_build_array(jsonb_build_object('supplier','prestigious-textiles','imported',applied,'run_id',p_run_id)),
  jsonb_build_object('mode','EXACT_PT_RUN','run_id',p_run_id,'rows_affected',applied));
 return applied;
end $$;
revoke all on function curtainsuk_private.materialize_pt_webtex_stock_run(text) from public,anon,authenticated;
grant execute on function curtainsuk_private.materialize_pt_webtex_stock_run(text) to service_role;
commit;
