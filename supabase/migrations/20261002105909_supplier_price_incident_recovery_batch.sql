create or replace function curtainsuk_private.append_supplier_price_incident_recovery_batch(
  p_run jsonb,
  p_items jsonb
)
returns integer
language plpgsql
security definer
set search_path to ''
set statement_timeout to '120s'
set lock_timeout to '10s'
as $function$
declare
  v_supplier text := p_run->>'supplier_id';
  v_adapter text := p_run->>'adapter_id';
  v_source text := p_run->>'source_name';
  v_expected_source text;
  v_expected_adapter text;
  item_row record;
  snapshot jsonb;
  v_count integer;
begin
  if jsonb_typeof(p_items) <> 'array' then
    raise exception 'PRICE_RECOVERY_ITEMS_ARRAY_REQUIRED';
  end if;
  v_count := jsonb_array_length(p_items);
  if v_count < 1 or v_count > 25 then
    raise exception 'PRICE_RECOVERY_BATCH_1_TO_25_REQUIRED';
  end if;

  if v_supplier='sanderson-design-group' then
    v_expected_source := 'SDG authenticated trade portal Product/detail live price recovery';
    v_expected_adapter := 'sdg-live-price-recovery-resume';
  elsif v_supplier='prestigious-textiles' then
    v_expected_source := 'Prestigious Webtex live price recovery after stock-retention incident';
    v_expected_adapter := 'pt-live-price-recovery-resume';
  else
    raise exception 'PRICE_RECOVERY_SUPPLIER_REQUIRED';
  end if;

  if v_adapter is distinct from v_expected_adapter
     or v_source is distinct from v_expected_source
     or p_run->>'source_type' is distinct from 'MANUAL_PORTAL'
     or p_run->>'status' is distinct from 'SUCCEEDED'
     or (p_run->>'snapshots_received')::integer <> v_count
     or (p_run->>'snapshots_appended')::integer <> v_count
     or (p_run->>'shopify_writes')::integer <> 0
     or (p_run->>'production_schedule_created')::boolean then
    raise exception 'PRICE_RECOVERY_RUN_CONTRACT_INVALID';
  end if;

  for item_row in select value from jsonb_array_elements(p_items)
  loop
    snapshot := item_row.value->'snapshot';
    if snapshot->>'supplier_id' is distinct from v_supplier
       or snapshot->>'run_id' is distinct from p_run->>'run_id'
       or snapshot->>'source_type' is distinct from 'MANUAL_PORTAL'
       or snapshot->>'source_name' is distinct from v_expected_source
       or snapshot->>'verification_status' is distinct from 'VERIFIED'
       or snapshot->>'validation_status' is distinct from 'VALIDATED'
       or snapshot->>'currency' is distinct from 'GBP'
       or snapshot->>'stock_unit' is not null
       or snapshot->>'aggregate_available_quantity' is not null
       or snapshot->>'checked_at' is null
       or (snapshot->>'checked_at')::timestamptz > clock_timestamp()
       or item_row.value->'validation_event'->>'snapshot_id' is distinct from snapshot->>'snapshot_id'
    then
      raise exception 'PRICE_RECOVERY_SNAPSHOT_CONTRACT_INVALID';
    end if;

    if v_supplier='sanderson-design-group' then
      if coalesce((snapshot->>'cut_trade_price')::numeric,0) <= 0
         or snapshot->>'standard_trade_price' is not null
         or snapshot->>'source_reference' not like 'sdg:Product/detail:price:%'
      then raise exception 'SDG_PRICE_RECOVERY_EVIDENCE_INVALID'; end if;
    else
      if coalesce((snapshot->>'standard_trade_price')::numeric,0) <= 0
         or snapshot->>'source_reference' not like 'webtex-product:%'
      then raise exception 'PT_PRICE_RECOVERY_EVIDENCE_INVALID'; end if;
    end if;
  end loop;

  -- Suppress the normal per-statement global Browse dirty trigger during the
  -- incident batch. Recovery marks Browse dirty once after full verification.
  perform set_config('curtainsuk.retention_cleanup','on',true);

  perform curtainsuk_private.append_supplier_snapshot_batch(p_run,p_items);

  insert into curtainsuk_private.supplier_promotion_events
    (event_id,snapshot_id,promotion_state,actor_type,actor_id,reason,rejection_reason,previous_approved_snapshot_id,created_at)
  select
    (item.value->'snapshot'->>'snapshot_id')||':incident-recovery-policy',
    item.value->'snapshot'->>'snapshot_id',
    'APPROVED_FOR_PROJECTION',
    'POLICY',
    null,
    case when v_supplier='sanderson-design-group'
      then 'Completed 2026-10-02 SDG price incident recovery from fresh authorised Product/detail price:true evidence. No inference, stock write, supplier order or Shopify write.'
      else 'Completed 2026-10-02 PT price incident recovery from fresh authorised Webtex product-detail Standard Price evidence. No inference, stock write, supplier order or Shopify write.'
    end,
    null,
    null,
    clock_timestamp()
  from jsonb_array_elements(p_items) item
  on conflict (event_id) do nothing;

  return v_count;
end
$function$;

revoke all on function curtainsuk_private.append_supplier_price_incident_recovery_batch(jsonb,jsonb)
  from public, anon, authenticated;
grant execute on function curtainsuk_private.append_supplier_price_incident_recovery_batch(jsonb,jsonb)
  to service_role;
