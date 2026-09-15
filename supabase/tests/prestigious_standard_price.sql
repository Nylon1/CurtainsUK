-- Read-only post-migration assertions. No supplier or order evidence is modified.
do $$
declare definition text; result jsonb; n text;
begin
 foreach n in array array['fabric_commercial_evidence','create_staging_configuration_snapshot','promote_fabric_for_staging_projection'] loop
  select pg_get_functiondef(p.oid) into definition from pg_proc p join pg_namespace s on s.oid=p.pronamespace where s.nspname='curtainsuk_private' and p.proname=n;
  if definition not like '%standard_trade_price else %cut_trade_price end)%' then raise exception 'Supplier-specific price gate absent: %',n; end if;
 end loop;
 if has_function_privilege('anon','curtainsuk_private.fabric_commercial_evidence(text[])','execute') then raise exception 'Private commercial data exposed'; end if;
 select curtainsuk_private.fabric_commercial_evidence(array['pt-3526-912','pt-8838-142']) into result;
 if jsonb_array_length(result)<>2 or exists(select 1 from jsonb_array_elements(result) e where not (e->>'price_confirmed')::boolean) then raise exception 'Pilot control prices not ready'; end if;
 if not exists(select 1 from curtainsuk_private.supplier_snapshot_prices where snapshot_id='pt-webtex-pilot:8def0dbb8aafc667:3526/912' and standard_trade_price=24.40 and cut_trade_price is null)
 or not exists(select 1 from curtainsuk_private.supplier_snapshot_prices where snapshot_id='pt-webtex-pilot:8def0dbb8aafc667:8838/142' and standard_trade_price=10.40 and cut_trade_price is null) then raise exception 'Pilot control evidence changed'; end if;
end $$;
