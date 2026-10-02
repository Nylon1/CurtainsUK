create or replace function curtainsuk_private.browse_projection_mark_global_dirty()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  stock_run_id text;
  changed_snapshot_id text;
begin
  if current_setting('curtainsuk.retention_cleanup', true) = 'on' then
    return null;
  end if;

  if tg_table_name in ('supplier_snapshots','supplier_snapshot_prices','supplier_promotion_events') then
    if tg_table_name = 'supplier_snapshots' then
      stock_run_id := case when tg_op = 'DELETE' then old.run_id else new.run_id end;
    else
      changed_snapshot_id := case when tg_op = 'DELETE' then old.snapshot_id else new.snapshot_id end;
      select s.run_id into stock_run_id
      from curtainsuk_private.supplier_snapshots s
      where s.snapshot_id = changed_snapshot_id;
    end if;

    if stock_run_id like 'sdg-portal-routine:%'
       or stock_run_id like 'pt-webtex-routine:%'
       or stock_run_id like 'sdg-price-recovery%'
       or stock_run_id like 'pt-price-recovery%'
    then
      return null;
    end if;
  end if;

  perform pg_advisory_xact_lock(4252026, 9248);
  insert into curtainsuk_private.browse_projection_dirty(fabric_id)
    values ('*')
    on conflict (fabric_id) do update set changed_at = excluded.changed_at;
  return null;
end
$function$;
