create or replace function curtainsuk_private.materialize_sdg_portal_stock_run(p_run_id text)
returns integer
language plpgsql
set search_path to ''
set statement_timeout to '30s'
set lock_timeout to '30s'
as $function$
declare
  expected integer;
  applied integer;
  verified integer;
  d date := (now() at time zone 'Europe/London')::date;
begin
  if current_user <> 'service_role' then
    raise exception 'SDG_SERVICE_ROLE_REQUIRED';
  end if;

  if p_run_id is null or p_run_id !~ '^sdg-portal-routine:[a-f0-9-]{36}:[0-9]{3}$' then
    raise exception 'SDG_ROUTINE_RUN_ID_REQUIRED';
  end if;

  perform pg_advisory_xact_lock(hashtext('curtainsuk-daily-stock-' || d));

  select r.snapshots_appended
    into expected
  from curtainsuk_private.supplier_sync_runs r
  where r.run_id = p_run_id
    and r.supplier_id = 'sanderson-design-group'
    and r.adapter_id = 'sdg-portal-product-detail'
    and r.source_type = 'MANUAL_PORTAL'
    and r.source_name = 'SDG authenticated trade portal Product/detail'
    and r.status = 'SUCCEEDED'
    and r.snapshots_received = r.snapshots_appended;

  if expected is null or expected < 1 or expected > 100 then
    raise exception 'SDG_ROUTINE_BATCH_REQUIRED';
  end if;

  if (
    select count(*)
    from curtainsuk_private.supplier_snapshots s
    join curtainsuk_private.supplier_promotion_events e
      on e.snapshot_id = s.snapshot_id
     and e.event_id = s.snapshot_id || ':sdg-routine-policy'
     and e.promotion_state = 'APPROVED_FOR_PROJECTION'
    where s.run_id = p_run_id
      and s.supplier_id = 'sanderson-design-group'
      and s.validation_status = 'VALIDATED'
      and s.verification_status = 'VERIFIED'
      and s.source_type = 'MANUAL_PORTAL'
      and s.source_name = 'SDG authenticated trade portal Product/detail'
      and s.checked_at <= now()
      and s.checked_at >= now() - curtainsuk_private.stock_validity_window()
      and s.stock_unit = 'METRE'
      and s.aggregate_available_quantity >= 0
  ) <> expected then
    raise exception 'SDG_MATERIALISATION_EVIDENCE_MISMATCH';
  end if;

  if exists (
    select 1
    from curtainsuk_private.supplier_snapshots s
    join curtainsuk_private.daily_stock_snapshots ds
      on ds.supplier_id = s.supplier_id
     and ds.supplier_sku = s.supplier_sku
     and ds.snapshot_date = (s.checked_at at time zone 'Europe/London')::date
    where s.run_id = p_run_id
      and ds.checked_at > s.checked_at
  ) then
    raise exception 'SDG_NEWER_OBSERVATION_REQUIRED';
  end if;

  insert into curtainsuk_private.daily_stock_snapshots
    (supplier_id, supplier_sku, snapshot_date, checked_at, source_snapshot_id,
     aggregate_metres, cut_price_minor, lifecycle_state)
  select
    s.supplier_id,
    s.supplier_sku,
    (s.checked_at at time zone 'Europe/London')::date,
    s.checked_at,
    s.snapshot_id,
    s.aggregate_available_quantity,
    case
      when s.normalized_payload->>'currency' = 'GBP'
       and (s.normalized_payload->>'cut_trade_price')::numeric > 0
      then round((s.normalized_payload->>'cut_trade_price')::numeric * 100)::integer
    end,
    s.lifecycle_state
  from curtainsuk_private.supplier_snapshots s
  where s.run_id = p_run_id
  on conflict (supplier_id, supplier_sku, snapshot_date) do update
  set checked_at = excluded.checked_at,
      source_snapshot_id = excluded.source_snapshot_id,
      aggregate_metres = excluded.aggregate_metres,
      cut_price_minor = excluded.cut_price_minor,
      lifecycle_state = excluded.lifecycle_state
  where excluded.checked_at > daily_stock_snapshots.checked_at;

  get diagnostics applied = row_count;

  select count(*)
    into verified
  from curtainsuk_private.supplier_snapshots s
  join curtainsuk_private.daily_stock_snapshots ds
    on ds.supplier_id = s.supplier_id
   and ds.supplier_sku = s.supplier_sku
   and ds.snapshot_date = (s.checked_at at time zone 'Europe/London')::date
  where s.run_id = p_run_id
    and ds.source_snapshot_id = s.snapshot_id
    and ds.checked_at = s.checked_at
    and ds.aggregate_metres = s.aggregate_available_quantity
    and ds.lifecycle_state = s.lifecycle_state
    and ds.cut_price_minor is not distinct from
      case
        when s.normalized_payload->>'currency' = 'GBP'
         and (s.normalized_payload->>'cut_trade_price')::numeric > 0
        then round((s.normalized_payload->>'cut_trade_price')::numeric * 100)::integer
      end;

  if verified <> expected then
    raise exception 'SDG_MATERIALISATION_COUNT_MISMATCH';
  end if;

  insert into curtainsuk_private.daily_stock_materialization_events(results, coverage)
  values (
    jsonb_build_array(jsonb_build_object(
      'supplier', 'sanderson-design-group',
      'imported', expected,
      'rows_changed', applied,
      'run_id', p_run_id
    )),
    jsonb_build_object(
      'mode', 'EXACT_SDG_RUN',
      'run_id', p_run_id,
      'rows_verified', verified,
      'rows_changed', applied
    )
  );

  return verified;
end
$function$;

revoke all on function curtainsuk_private.materialize_sdg_portal_stock_run(text)
  from public, anon, authenticated;
grant execute on function curtainsuk_private.materialize_sdg_portal_stock_run(text)
  to service_role;
