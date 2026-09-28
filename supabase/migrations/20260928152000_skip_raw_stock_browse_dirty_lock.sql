-- Routine stock evidence is not itself a Browse stock source.
-- Browse eligibility reads stock from daily_stock_snapshots, which already
-- marks the Browse projection dirty when materialisation changes stock.
--
-- Raw supplier snapshots, null price-shell rows, validation events and
-- stock-policy approval events were all taking the global Browse advisory
-- lock before materialisation. A concurrent Browse refresh can hold that lock
-- for tens of seconds, causing otherwise healthy SDG/PT stock refreshes to
-- fail on lock_timeout. Skip only the two routine stock run families here;
-- all price, lifecycle and non-routine supplier changes retain the existing
-- global dirty behaviour.

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
  if TG_TABLE_NAME in ('supplier_snapshots','supplier_snapshot_prices','supplier_promotion_events') then
    if TG_TABLE_NAME = 'supplier_snapshots' then
      stock_run_id := case when TG_OP = 'DELETE' then OLD.run_id else NEW.run_id end;
    else
      changed_snapshot_id := case when TG_OP = 'DELETE' then OLD.snapshot_id else NEW.snapshot_id end;
      select s.run_id into stock_run_id
      from curtainsuk_private.supplier_snapshots s
      where s.snapshot_id = changed_snapshot_id;
    end if;

    if stock_run_id like 'sdg-portal-routine:%'
       or stock_run_id like 'pt-webtex-routine:%' then
      return null;
    end if;
  end if;

  perform pg_advisory_xact_lock(4252026, 9248);
  insert into curtainsuk_private.browse_projection_dirty(fabric_id)
    values ('*')
    on conflict (fabric_id) do update set changed_at = excluded.changed_at;
  return null;
end;
$function$;

notify pgrst, 'reload config';
