-- Isolated regression fixtures. Every write rolls back; no supplier evidence or order survives.
begin;
do $$
declare
 src curtainsuk_private.supplier_snapshots%rowtype;
 e curtainsuk_private.supplier_promotion_events%rowtype;
 original_id text; id text; prior_id text; history_count integer; i integer; checked timestamptz; qty numeric; value jsonb;
begin
 select * into src from curtainsuk_private.supplier_snapshots where snapshot_id=(select source_snapshot_id from curtainsuk_private.daily_stock_snapshots where supplier_id='prestigious-textiles' and supplier_sku='4262/770' order by checked_at desc limit 1);
 original_id:=src.snapshot_id;
 if original_id is null then raise exception 'Real fixture absent'; end if;
 select * into e from curtainsuk_private.supplier_promotion_events where snapshot_id=original_id and promotion_state='APPROVED_FOR_PROJECTION' order by created_at desc limit 1;
 select count(*) into history_count from curtainsuk_private.daily_stock_snapshot_history;
 for i in 1..3 loop
  id:='rollback-readiness-'||gen_random_uuid();
  checked:=now()-case i when 1 then interval '2 hours' when 2 then interval '1 hour' else interval '3 hours' end;
  qty:=case i when 1 then 29.99 else 30 end;
  src.snapshot_id:=id; src.checked_at:=checked;src.aggregate_available_quantity:=qty;
  src.normalized_payload:=src.normalized_payload||jsonb_build_object('snapshot_id',id,'checked_at',checked,'aggregate_available_quantity',qty);
  insert into curtainsuk_private.supplier_snapshots select src.*;
  e.event_id:='rollback-approval-'||gen_random_uuid();e.snapshot_id:=id;e.created_at:=now();e.reason:='ROLLBACK ONLY regression fixture, not supplier evidence';
  insert into curtainsuk_private.supplier_promotion_events select e.*;
  perform curtainsuk_private.materialize_daily_stock();
  select x into value from jsonb_array_elements(curtainsuk_private.fabric_commercial_evidence(array['pt-4262-770'])) x;
  if value->>'stock' is distinct from (case i when 1 then 'TEMPORARILY_UNAVAILABLE' else 'FABRIC_AVAILABLE' end) then raise exception 'Stock floor/correction regression %: %',i,value; end if;
  if i=2 then prior_id:=id; end if;
  if i=3 and (select source_snapshot_id from curtainsuk_private.daily_stock_snapshots where supplier_id=src.supplier_id and supplier_sku=src.supplier_sku order by checked_at desc limit 1)<>prior_id then raise exception 'Older observation overwrote newer evidence'; end if;
 end loop;
 if (select count(*) from curtainsuk_private.daily_stock_snapshot_history)<history_count+2 then raise exception 'Correction history missing'; end if;
 if not exists(select 1 from curtainsuk_private.daily_stock_snapshot_history where source_snapshot_id=original_id) then raise exception 'Original evidence lost'; end if;
 begin
  update curtainsuk_private.daily_stock_snapshots set aggregate_metres=999999 where source_snapshot_id=prior_id;
  raise exception 'Unapproved correction accepted';
 exception when raise_exception then
  if sqlerrm<>'NEWER_APPROVED_STOCK_OBSERVATION_REQUIRED' then raise; end if;
 end;
 if has_function_privilege('anon','curtainsuk_private.fabric_commercial_evidence(text[])','execute') or has_function_privilege('authenticated','curtainsuk_private.daily_stock_health()','execute') then raise exception 'Private evidence exposed'; end if;
 if has_table_privilege('anon','curtainsuk_private.daily_stock_snapshot_history','select') then raise exception 'History exposed'; end if;
end $$;
rollback;
