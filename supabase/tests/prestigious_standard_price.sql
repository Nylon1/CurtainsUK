-- Read-only post-migration assertions. No supplier or order evidence is modified.
do $$
declare definition text; n text;
begin
 foreach n in array array['fabric_commercial_evidence','create_staging_configuration_snapshot','promote_fabric_for_staging_projection','current_retail_guide_prices'] loop
  select pg_get_functiondef(p.oid) into definition from pg_proc p join pg_namespace s on s.oid=p.pronamespace where s.nspname='curtainsuk_private' and p.proname=n;
  if definition not like '%cut_trade_price%' or definition not like '%standard_trade_price%' then raise exception 'PT Standard selection / Cut-only eligibility gate absent: %',n; end if;
 end loop;
 if has_function_privilege('anon','curtainsuk_private.fabric_commercial_evidence(text[])','execute') then raise exception 'Private commercial data exposed'; end if;
 select pg_get_viewdef('curtainsuk_private.browse_current_guide_prices_set_v1'::regclass,true) into definition;
if definition not like '%cut_trade_price%' or definition not like '%standard_trade_price%' then raise exception 'Browse PT Standard selection / Cut-only source is invalid'; end if;
 if not exists(select 1 from curtainsuk_private.supplier_approval_policies where supplier_id='prestigious-textiles' and approval_mode='MANUAL' and required_price_field='CUT_TRADE_PRICE') then raise exception 'PT manual approval policy must require Cut Price'; end if;
end $$;
