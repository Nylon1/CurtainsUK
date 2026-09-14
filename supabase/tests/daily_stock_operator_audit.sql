-- Everything rolls back: no fabricated operator or stock refresh is retained.
begin;
do $$
declare actor uuid:=gen_random_uuid(); result jsonb; event uuid; before_rows jsonb; after_rows jsonb;
begin
 select jsonb_agg(to_jsonb(s) order by supplier_id,supplier_sku,snapshot_date) into before_rows from curtainsuk_private.daily_stock_snapshots s;
 result:=curtainsuk_private.materialize_daily_stock_for_operator(actor);
 event:=(result->>'event_id')::uuid;
 if not exists(select 1 from curtainsuk_private.daily_stock_refresh_events where event_id=event and operator_id=actor and completed_at is not null and snapshot_date=(now() at time zone 'Europe/London')::date) then raise exception 'Missing operator/date evidence'; end if;
 if result->>'operator_id'<>actor::text or jsonb_array_length(result->'supplier_results')<>2 then raise exception 'Invalid result'; end if;
 begin
   update curtainsuk_private.daily_stock_refresh_events set operator_id=gen_random_uuid() where event_id=event;
   raise exception 'Mutable audit';
 exception when raise_exception then
   if sqlerrm<>'Daily stock refresh evidence is append-only' then raise; end if;
 end;
 begin
   perform curtainsuk_private.materialize_daily_stock_for_operator(null);
   raise exception 'Null operator accepted';
 exception when raise_exception then
   if sqlerrm<>'Authenticated operator required' then raise; end if;
 end;
 if has_function_privilege('anon','curtainsuk_private.materialize_daily_stock_for_operator(uuid)','execute') or has_function_privilege('authenticated','curtainsuk_private.materialize_daily_stock_for_operator(uuid)','execute') then raise exception 'Public refresh permission'; end if;
 if has_table_privilege('anon','curtainsuk_private.daily_stock_refresh_events','select') or has_table_privilege('authenticated','curtainsuk_private.daily_stock_refresh_events','select') then raise exception 'Public audit permission'; end if;
 if not (select relrowsecurity from pg_class where oid='curtainsuk_private.daily_stock_refresh_events'::regclass) then raise exception 'RLS disabled'; end if;
 select jsonb_agg(to_jsonb(s) order by supplier_id,supplier_sku,snapshot_date) into after_rows from curtainsuk_private.daily_stock_snapshots s;
 if before_rows is distinct from after_rows then raise exception 'Existing baseline changed or pending observations require separate review'; end if;
end $$;
rollback;
