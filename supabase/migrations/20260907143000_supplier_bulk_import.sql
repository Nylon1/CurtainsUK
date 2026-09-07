-- CurtainsUK Phase 4F: supplier-neutral atomic bulk append.
-- No supplier-commercial values are embedded in this migration.

insert into curtainsuk_private.suppliers (supplier_id, display_name)
values ('sanderson-design-group', 'Sanderson Design Group')
on conflict (supplier_id) do nothing;

create or replace function curtainsuk_private.append_supplier_snapshot_batch(
  p_run jsonb,
  p_items jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  item_row record;
  batch_row record;
  snapshot jsonb;
  validation_event jsonb;
  item_count integer;
begin
  if jsonb_typeof(p_items) <> 'array' then
    raise exception 'p_items must be an array';
  end if;
  item_count := jsonb_array_length(p_items);
  if item_count = 0
     or (p_run->>'snapshots_received')::integer <> item_count
     or (p_run->>'snapshots_appended')::integer <> item_count then
    raise exception 'run snapshot count does not match bulk payload';
  end if;

  insert into curtainsuk_private.supplier_sync_runs
    (run_id, supplier_id, adapter_id, mode, source_type, source_name, started_at, completed_at, status,
     snapshots_received, snapshots_appended, error_code, shopify_writes, production_schedule_created)
  values
    (p_run->>'run_id', p_run->>'supplier_id', p_run->>'adapter_id', p_run->>'mode', p_run->>'source_type',
     p_run->>'source_name', (p_run->>'started_at')::timestamptz, (p_run->>'completed_at')::timestamptz,
     p_run->>'status', (p_run->>'snapshots_received')::integer, (p_run->>'snapshots_appended')::integer,
     p_run->>'error_code', (p_run->>'shopify_writes')::integer, (p_run->>'production_schedule_created')::boolean);

  for item_row in select value from jsonb_array_elements(p_items)
  loop
    snapshot := item_row.value->'snapshot';
    validation_event := item_row.value->'validation_event';

    if snapshot->>'supplier_id' <> p_run->>'supplier_id'
       or snapshot->>'run_id' <> p_run->>'run_id'
       or validation_event->>'snapshot_id' <> snapshot->>'snapshot_id' then
      raise exception 'bulk payload identity mismatch';
    end if;

    insert into curtainsuk_private.supplier_snapshots
      (snapshot_id, supplier_id, brand_id, supplier_sku, run_id, checked_at, stock_unit,
       aggregate_available_quantity, next_due_date, next_due_quantity, sample_available, lifecycle_state,
       source_type, source_name, source_reference, verification_status, validation_status, validation_errors,
       stock_expires_at, price_expires_at, lifecycle_expires_at, normalized_payload)
    values
      (snapshot->>'snapshot_id', snapshot->>'supplier_id', snapshot->>'brand_id', snapshot->>'supplier_sku',
       snapshot->>'run_id', (snapshot->>'checked_at')::timestamptz, snapshot->>'stock_unit',
       (snapshot->>'aggregate_available_quantity')::numeric, (snapshot->>'next_due_date')::date,
       (snapshot->>'next_due_quantity')::numeric, (snapshot->>'sample_available')::boolean,
       snapshot->>'lifecycle_state', snapshot->>'source_type', snapshot->>'source_name',
       snapshot->>'source_reference', snapshot->>'verification_status', snapshot->>'validation_status',
       snapshot->'validation_errors', (snapshot->>'stock_expires_at')::timestamptz,
       (snapshot->>'price_expires_at')::timestamptz, (snapshot->>'lifecycle_expires_at')::timestamptz,
       snapshot->'normalized_payload');

    if snapshot->>'validation_status' = 'VALIDATED' then
      insert into curtainsuk_private.supplier_snapshot_prices
        (snapshot_id, standard_trade_price, cut_trade_price, currency)
      values
        (snapshot->>'snapshot_id', (snapshot->>'standard_trade_price')::numeric,
         (snapshot->>'cut_trade_price')::numeric, snapshot->>'currency');

      if jsonb_typeof(snapshot->'batches') = 'array' then
        for batch_row in
          select value, ordinality - 1 as batch_ordinal
          from jsonb_array_elements(snapshot->'batches') with ordinality
        loop
          insert into curtainsuk_private.supplier_snapshot_batches
            (snapshot_id, batch_ordinal, batch_reference, batch_available_quantity, pieces)
          values
            (snapshot->>'snapshot_id', batch_row.batch_ordinal, batch_row.value->>'batch_reference',
             (batch_row.value->>'batch_available_quantity')::numeric, (batch_row.value->>'pieces')::integer);
        end loop;
      end if;
    end if;

    insert into curtainsuk_private.supplier_promotion_events
      (event_id, snapshot_id, promotion_state, actor_type, actor_id, reason, rejection_reason,
       previous_approved_snapshot_id, created_at)
    values
      (validation_event->>'event_id', validation_event->>'snapshot_id', validation_event->>'promotion_state',
       validation_event->>'actor_type', (validation_event->>'actor_id')::uuid, validation_event->>'reason',
       validation_event->>'rejection_reason', validation_event->>'previous_approved_snapshot_id',
       (validation_event->>'created_at')::timestamptz);
  end loop;
end;
$$;

revoke execute on function curtainsuk_private.append_supplier_snapshot_batch(jsonb, jsonb) from public, anon, authenticated;
grant execute on function curtainsuk_private.append_supplier_snapshot_batch(jsonb, jsonb) to service_role;
