create or replace function curtainsuk_private.materialize_daily_stock(p_now timestamptz default now()) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare supplier text; n integer; d date := (p_now at time zone 'Europe/London')::date; result jsonb := '[]';
begin
 perform pg_advisory_xact_lock(hashtext('curtainsuk-daily-stock-'||d));
 foreach supplier in array array['prestigious-textiles','sanderson-design-group'] loop

  insert into curtainsuk_private.daily_stock_snapshots
  select distinct on(s.supplier_id,s.supplier_sku) s.supplier_id,s.supplier_sku,d,s.checked_at,s.snapshot_id,
    (s.normalized_payload->>'aggregate_available_quantity')::numeric,
    case when s.normalized_payload->>'currency'='GBP' and (s.normalized_payload->>'cut_trade_price')::numeric>0 then round((s.normalized_payload->>'cut_trade_price')::numeric*100)::integer end,
    coalesce(s.normalized_payload->>'lifecycle_state','UNKNOWN')
  from curtainsuk_private.supplier_snapshots s
  where s.supplier_id=supplier and (s.checked_at at time zone 'Europe/London')::date=d and s.checked_at<=p_now
    and s.normalized_payload->>'stock_unit'='METRE'
    and (s.normalized_payload->>'aggregate_available_quantity')::numeric>=0
    and (select e.promotion_state from curtainsuk_private.supplier_promotion_events e where e.snapshot_id=s.snapshot_id order by e.created_at desc limit 1)='APPROVED_FOR_PROJECTION'
  order by s.supplier_id,s.supplier_sku,s.checked_at desc
  on conflict do nothing;
  get diagnostics n = row_count;
  insert into curtainsuk_private.daily_stock_runs(supplier_id,snapshot_date,attempted_at,status,imported,error_code)
  values(supplier,d,p_now,case when exists(select 1 from curtainsuk_private.daily_stock_snapshots where supplier_id=supplier and snapshot_date=d) then 'SUCCESS' else 'FAILED' end,(select count(*) from curtainsuk_private.daily_stock_snapshots where supplier_id=supplier and snapshot_date=d),case when not exists(select 1 from curtainsuk_private.daily_stock_snapshots where supplier_id=supplier and snapshot_date=d) then 'NO_CURRENT_SUPPLIER_OBSERVATIONS' end)
  on conflict(supplier_id,snapshot_date) do update set attempted_at=excluded.attempted_at,status=excluded.status,imported=excluded.imported,error_code=excluded.error_code;
  result:=result||jsonb_build_object('supplier',supplier,'imported',n);
 end loop;
 return result;
end $$;
revoke all on function curtainsuk_private.materialize_daily_stock(timestamptz) from public,anon,authenticated;
grant execute on function curtainsuk_private.materialize_daily_stock(timestamptz) to service_role;
