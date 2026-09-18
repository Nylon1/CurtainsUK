-- One commercial supplier-stock window for the existing private projections.
-- Historical supplier observation timestamps and approval evidence are not rewritten.
begin;
create or replace function curtainsuk_private.stock_validity_window() returns interval
language sql immutable set search_path='' as $$ select interval '96 hours' $$;
revoke all on function curtainsuk_private.stock_validity_window() from public,anon,authenticated;
grant execute on function curtainsuk_private.stock_validity_window() to service_role;

-- Existing health report also exposes zero and unknown counts for operations.
CREATE OR REPLACE FUNCTION curtainsuk_private.daily_stock_health()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
 with coverage as (
 select c.supplier_id,count(*) expected,
 count(s.supplier_sku) filter(where s.checked_at>=now()-curtainsuk_private.stock_validity_window() and s.checked_at<=now()) covered,
 count(s.supplier_sku) filter(where s.checked_at>=now()-curtainsuk_private.stock_validity_window() and s.checked_at<=now() and s.aggregate_metres=0) zero,
 max(s.checked_at) latest_source_checked_at
 from curtainsuk_private.fabric_colourways c
 left join lateral (select * from curtainsuk_private.daily_stock_snapshots s where s.supplier_id=c.supplier_id and s.supplier_sku=c.supplier_sku order by snapshot_date desc limit 1) s on true
 where c.lifecycle_state<>'DISCONTINUED' group by c.supplier_id)
 select coalesce(jsonb_agg(jsonb_build_object('supplier',supplier_id,'expected',expected,'covered',covered,
 'missing_or_stale',expected-covered,'unknown',expected-covered,'zero',zero,'latest_source_checked_at',latest_source_checked_at,
 'business_outcome',case when covered=0 then 'FAILED' when covered<expected then 'INCOMPLETE' else 'COMPLETE' end,
 'alert',case when covered=0 then 'NO_CURRENT_SUPPLIER_OBSERVATIONS' when covered<expected then 'PARTIAL_SUPPLIER_COVERAGE' else null end)),'[]'::jsonb) from coverage;
$function$
;

-- Updated existing fabric_commercial_evidence; only the freshness interval differs.
CREATE OR REPLACE FUNCTION curtainsuk_private.fabric_commercial_evidence(p_ids text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare result jsonb;
begin
 if coalesce(array_length(p_ids,1),0)>48 then raise exception 'RETAIL_PAGE_TOO_LARGE'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('fabric_id',c.fabric_id,
 'stale',coalesce(s.checked_at<now()-curtainsuk_private.stock_validity_window(),true) or coalesce(s.checked_at>now(),false),
 'stock',case when c.lifecycle_state='DISCONTINUED' or s.lifecycle_state='DISCONTINUED' then 'NO_LONGER_AVAILABLE'
 when s.supplier_sku is null or s.checked_at<now()-curtainsuk_private.stock_validity_window() or s.checked_at>now() then 'AVAILABILITY_TO_BE_CONFIRMED'
 when s.aggregate_metres-coalesce(u.used,0)>=30 then 'FABRIC_AVAILABLE' else 'TEMPORARILY_UNAVAILABLE' end,
 'sample_stock_available',coalesce(s.checked_at>=now()-curtainsuk_private.stock_validity_window() and s.checked_at<=now()
   and c.lifecycle_state<>'DISCONTINUED' and s.lifecycle_state<>'DISCONTINUED'
   and s.aggregate_metres-coalesce(u.used,0)>0,false),
 'price_confirmed',exists(
 select 1 from curtainsuk_private.supplier_snapshots p join curtainsuk_private.supplier_snapshot_prices price using(snapshot_id)
 where p.supplier_id=c.supplier_id and p.supplier_sku=c.supplier_sku and p.validation_status='VALIDATED'
 and p.checked_at<=now()  and price.currency='GBP' and (case when p.supplier_id='prestigious-textiles' then price.standard_trade_price else price.cut_trade_price end)>0
 and (select e.promotion_state from curtainsuk_private.supplier_promotion_events e where e.snapshot_id=p.snapshot_id order by e.created_at desc limit 1)='APPROVED_FOR_PROJECTION'
 ))),'[]'::jsonb) into result
 from curtainsuk_private.fabric_colourways c
 left join lateral (select * from curtainsuk_private.daily_stock_snapshots s where s.supplier_id=c.supplier_id and s.supplier_sku=c.supplier_sku order by snapshot_date desc limit 1) s on true
 left join lateral (select sum(metres) used from curtainsuk_private.daily_stock_usage u where u.supplier_id=c.supplier_id and u.supplier_sku=c.supplier_sku and u.confirmed_at>=s.checked_at) u on true
 where c.fabric_id=any(p_ids);
 return result;
end $function$
;

-- Updated existing materialize_daily_stock; only the freshness interval differs.
CREATE OR REPLACE FUNCTION curtainsuk_private.materialize_daily_stock(p_now timestamp with time zone DEFAULT now())
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare supplier text; n integer; d date := (p_now at time zone 'Europe/London')::date; result jsonb := '[]';
begin
 perform pg_advisory_xact_lock(hashtext('curtainsuk-daily-stock-'||d));
 foreach supplier in array array['prestigious-textiles','sanderson-design-group'] loop

  insert into curtainsuk_private.daily_stock_snapshots
  select distinct on(s.supplier_id,s.supplier_sku) s.supplier_id,s.supplier_sku,(s.checked_at at time zone 'Europe/London')::date,s.checked_at,s.snapshot_id,
    (s.normalized_payload->>'aggregate_available_quantity')::numeric,
    case when s.normalized_payload->>'currency'='GBP' and (s.normalized_payload->>'cut_trade_price')::numeric>0 then round((s.normalized_payload->>'cut_trade_price')::numeric*100)::integer end,
    coalesce(s.normalized_payload->>'lifecycle_state','UNKNOWN')
  from curtainsuk_private.supplier_snapshots s
  where s.supplier_id=supplier and s.checked_at>=p_now-curtainsuk_private.stock_validity_window() and s.checked_at<=p_now
    and s.validation_status='VALIDATED' and s.normalized_payload->>'stock_unit'='METRE'
    and (s.normalized_payload->>'aggregate_available_quantity')::numeric>=0
    and (select e.promotion_state from curtainsuk_private.supplier_promotion_events e where e.snapshot_id=s.snapshot_id order by e.created_at desc limit 1)='APPROVED_FOR_PROJECTION'
  order by s.supplier_id,s.supplier_sku,s.checked_at desc
  on conflict(supplier_id,supplier_sku,snapshot_date) do update set
   checked_at=excluded.checked_at,source_snapshot_id=excluded.source_snapshot_id,
   aggregate_metres=excluded.aggregate_metres,cut_price_minor=excluded.cut_price_minor,lifecycle_state=excluded.lifecycle_state
  where excluded.checked_at>daily_stock_snapshots.checked_at;
  get diagnostics n = row_count;
  insert into curtainsuk_private.daily_stock_runs(supplier_id,snapshot_date,attempted_at,status,imported,error_code)
  values(supplier,d,p_now,case when exists(select 1 from curtainsuk_private.daily_stock_snapshots where supplier_id=supplier and checked_at>=p_now-curtainsuk_private.stock_validity_window() and checked_at<=p_now) then 'SUCCESS' else 'FAILED' end,(select count(distinct supplier_sku) from curtainsuk_private.daily_stock_snapshots where supplier_id=supplier and checked_at>=p_now-curtainsuk_private.stock_validity_window() and checked_at<=p_now),case when not exists(select 1 from curtainsuk_private.daily_stock_snapshots where supplier_id=supplier and checked_at>=p_now-curtainsuk_private.stock_validity_window() and checked_at<=p_now) then 'NO_CURRENT_SUPPLIER_OBSERVATIONS' end)
  on conflict(supplier_id,snapshot_date) do update set attempted_at=excluded.attempted_at,status=excluded.status,imported=excluded.imported,error_code=excluded.error_code;
  result:=result||jsonb_build_object('supplier',supplier,'imported',n);
 end loop;
 insert into curtainsuk_private.daily_stock_materialization_events(results,coverage) values(result,curtainsuk_private.daily_stock_health());
 return result;
end $function$
;

-- Updated existing materialize_sdg_stock_canary; only the freshness interval differs.
CREATE OR REPLACE FUNCTION curtainsuk_private.materialize_sdg_stock_canary(p_scope jsonb, p_operator uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
 item jsonb; s curtainsuk_private.supplier_snapshots%rowtype; n integer; expected integer;
 outcome jsonb; outcomes jsonb := '[]'; audit_id uuid; t timestamptz := now();
begin
 if p_operator is null then raise exception 'CANARY_OPERATOR_REQUIRED'; end if;
 if p_scope is null or jsonb_typeof(p_scope)<>'array' then raise exception 'CANARY_EXPLICIT_SCOPE_REQUIRED'; end if;
 expected := jsonb_array_length(p_scope);
 if expected<1 or expected>3 then raise exception 'CANARY_SCOPE_LIMIT_1_TO_3'; end if;
 for item in select value from jsonb_array_elements(p_scope) loop
  if jsonb_typeof(item)<>'object' or
     (select count(*) from jsonb_object_keys(item))<>4 or
     not (item ?& array['fabric_id','supplier_id','supplier_sku','snapshot_id']) or
     exists(select 1 from jsonb_each(item) e where jsonb_typeof(e.value)<>'string' or length(trim(e.value #>> '{}'))=0) or
     item->>'supplier_id'<>'sanderson-design-group'
  then raise exception 'CANARY_EXACT_IDENTITY_REQUIRED'; end if;
 end loop;
 if (select count(distinct value->>'fabric_id') from jsonb_array_elements(p_scope))<>expected or
    (select count(distinct value->>'supplier_sku') from jsonb_array_elements(p_scope))<>expected or
    (select count(distinct value->>'snapshot_id') from jsonb_array_elements(p_scope))<>expected
 then raise exception 'CANARY_DUPLICATE_IDENTITY'; end if;

 -- Same lock as the existing materialiser; retain locks through the caller's transaction.
 perform pg_advisory_xact_lock(hashtext('curtainsuk-daily-stock-'||(t at time zone 'Europe/London')::date));
 -- A serializable caller transaction gives one consistent evidence/approval view
 -- without granting mutation privileges on immutable supplier history.
 if current_setting('transaction_isolation')<>'serializable' then raise exception 'CANARY_SERIALIZABLE_TRANSACTION_REQUIRED'; end if;
 for item in select value from jsonb_array_elements(p_scope) loop
  select * into s from curtainsuk_private.supplier_snapshots where snapshot_id=item->>'snapshot_id';
  if not found then raise exception 'CANARY_SOURCE_NOT_FOUND'; end if;
  if s.supplier_id is distinct from item->>'supplier_id' or s.supplier_sku is distinct from item->>'supplier_sku' or
     (select count(*) from curtainsuk_private.fabric_colourways c where c.supplier_id=s.supplier_id and c.supplier_sku=s.supplier_sku)<>1 or
     not exists(select 1 from curtainsuk_private.fabric_colourways c where c.fabric_id=item->>'fabric_id'
       and c.supplier_id=s.supplier_id and c.supplier_sku=s.supplier_sku and c.brand_id=s.brand_id
       and c.lifecycle_state in ('CURRENT','UNKNOWN'))
  then raise exception 'CANARY_MASTER_IDENTITY_MISMATCH'; end if;
  if s.validation_status<>'VALIDATED' or s.verification_status<>'VERIFIED' or
     s.source_type<>'MANUAL_PORTAL' or not (
       (s.source_name='SDG authenticated trade portal Product/detail' and s.source_reference='sdg:Product/detail:'||s.supplier_sku) or
       (s.source_name='SDG authenticated trade portal Stock Detail UI' and s.source_reference='https://trade.sandersondesigngroup.com/search/'||s.supplier_sku)
     ) or s.source_reference is null or
     s.checked_at>t or s.checked_at<t-curtainsuk_private.stock_validity_window() or s.stock_unit is distinct from 'METRE' or
     s.lifecycle_state not in ('CURRENT','UNKNOWN') or
     s.normalized_payload->>'stock_unit' is distinct from 'METRE' or
     jsonb_typeof(s.normalized_payload->'aggregate_available_quantity') is distinct from 'number' or
     s.aggregate_available_quantity is null or s.aggregate_available_quantity<0 or
     s.aggregate_available_quantity is distinct from (s.normalized_payload->>'aggregate_available_quantity')::numeric or
     s.normalized_payload->>'supplier_id' is distinct from s.supplier_id or
     s.normalized_payload->>'supplier_sku' is distinct from s.supplier_sku or
     s.normalized_payload->>'snapshot_id' is distinct from s.snapshot_id or
     (s.normalized_payload->>'checked_at')::timestamptz is distinct from s.checked_at or
     s.normalized_payload->>'lifecycle_state' is distinct from s.lifecycle_state
  then raise exception 'CANARY_INVALID_SOURCE_EVIDENCE'; end if;
  if not exists(select 1 from curtainsuk_private.supplier_promotion_events e
      where e.snapshot_id=s.snapshot_id and e.created_at=(select max(x.created_at) from curtainsuk_private.supplier_promotion_events x where x.snapshot_id=s.snapshot_id)
      group by e.snapshot_id having count(*)=1 and bool_and(e.promotion_state='APPROVED_FOR_PROJECTION'
        and e.actor_type='MANUAL_STAFF' and e.actor_id=p_operator and e.created_at<=t))
  then raise exception 'CANARY_CURRENT_OPERATOR_APPROVAL_REQUIRED'; end if;
  if exists(select 1 from curtainsuk_private.supplier_snapshots other
      where other.supplier_id=s.supplier_id and other.supplier_sku=s.supplier_sku and other.snapshot_id<>s.snapshot_id
      and other.checked_at>=s.checked_at and other.validation_status='VALIDATED'
      and (select e.promotion_state from curtainsuk_private.supplier_promotion_events e where e.snapshot_id=other.snapshot_id order by e.created_at desc limit 1)='APPROVED_FOR_PROJECTION')
  then raise exception 'CANARY_NOT_LATEST_APPROVED_SOURCE'; end if;
  -- Fail instead of claiming success for an older, tied or already-applied observation.
  if exists(select 1 from curtainsuk_private.daily_stock_snapshots d where d.supplier_id=s.supplier_id
       and d.supplier_sku=s.supplier_sku and d.checked_at>=s.checked_at)
  then raise exception 'CANARY_NEWER_OBSERVATION_REQUIRED'; end if;
 end loop;

 for item in select value from jsonb_array_elements(p_scope) loop
  select * into strict s from curtainsuk_private.supplier_snapshots where snapshot_id=item->>'snapshot_id';
  insert into curtainsuk_private.daily_stock_snapshots
    (supplier_id,supplier_sku,snapshot_date,checked_at,source_snapshot_id,aggregate_metres,cut_price_minor,lifecycle_state)
  values (s.supplier_id,s.supplier_sku,(s.checked_at at time zone 'Europe/London')::date,s.checked_at,s.snapshot_id,
    s.aggregate_available_quantity,
    case when s.normalized_payload->>'currency'='GBP' and (s.normalized_payload->>'cut_trade_price')::numeric>0 then round((s.normalized_payload->>'cut_trade_price')::numeric*100)::integer end,
    s.lifecycle_state)
  on conflict(supplier_id,supplier_sku,snapshot_date) do update set
    checked_at=excluded.checked_at,source_snapshot_id=excluded.source_snapshot_id,aggregate_metres=excluded.aggregate_metres,
    cut_price_minor=excluded.cut_price_minor,lifecycle_state=excluded.lifecycle_state
  where excluded.checked_at>daily_stock_snapshots.checked_at
  returning jsonb_build_object('fabric_id',item->>'fabric_id','supplier_id',supplier_id,'supplier_sku',supplier_sku,
    'snapshot_id',source_snapshot_id,'snapshot_date',snapshot_date,'checked_at',checked_at,'aggregate_metres',aggregate_metres) into outcome;
  get diagnostics n=row_count;
  if n<>1 then raise exception 'CANARY_MATERIALIZATION_SCOPE_MISMATCH'; end if;
  outcomes:=outcomes||jsonb_build_array(outcome);
 end loop;
 if jsonb_array_length(outcomes)<>expected then raise exception 'CANARY_MATERIALIZATION_SCOPE_MISMATCH'; end if;
 insert into curtainsuk_private.daily_stock_materialization_events(results,coverage)
 values(outcomes,jsonb_build_object('mode','EXACT_SDG_CANARY','operator_id',p_operator,'scope',p_scope,'rows_affected',expected))
 returning event_id into audit_id;
 return jsonb_build_object('event_id',audit_id,'rows_affected',expected,'results',outcomes);
end $function$
;

-- Updated existing search_retail_fabrics; only the freshness interval differs.
CREATE OR REPLACE FUNCTION curtainsuk_private.search_retail_fabrics(p_filters jsonb DEFAULT '{}'::jsonb, p_page integer DEFAULT 1, p_size integer DEFAULT 24)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  with eligible as (
    select c.fabric_id,c.colour_name,c.sample_available,c.storefront_selectable,c.lifecycle_state,
      b.display_name brand,d.display_name design,co.display_name collection,
      r.colour_families,r.patterns,r.characters,r.styles,r.window_types,
      coalesce(stock.checked_at<=now() and stock.lifecycle_state<>'DISCONTINUED'
      and stock.aggregate_metres-coalesce((select sum(u.metres) from curtainsuk_private.daily_stock_usage u
        where u.supplier_id=c.supplier_id and u.supplier_sku=c.supplier_sku and u.confirmed_at>=stock.checked_at),0)>=30
      ,false) stock_current,
      coalesce(stock.checked_at<=now() and stock.lifecycle_state<>'DISCONTINUED'
      and stock.aggregate_metres-coalesce((select sum(u.metres) from curtainsuk_private.daily_stock_usage u
        where u.supplier_id=c.supplier_id and u.supplier_sku=c.supplier_sku and u.confirmed_at>=stock.checked_at),0)>0
      ,false) sample_current,
      coalesce(stock.checked_at<=now(),false) stock_known
    from curtainsuk_private.fabric_colourways c
    join curtainsuk_private.supplier_brands b on b.brand_id=c.brand_id
    join curtainsuk_private.fabric_designs d on d.design_id=c.design_id
    join curtainsuk_private.fabric_collections co on co.collection_id=d.collection_id
    left join curtainsuk_private.fabric_retail_profiles r on r.fabric_id=c.fabric_id
    left join lateral (select * from curtainsuk_private.daily_stock_snapshots st where st.supplier_id=c.supplier_id and st.supplier_sku=c.supplier_sku order by st.snapshot_date desc limit 1) stock on stock.checked_at>=now()-curtainsuk_private.stock_validity_window()
    where c.staging_catalog_visible and c.lifecycle_state <> 'DISCONTINUED'
      and length(trim(c.supplier_sku)) > 0 and length(trim(c.colour_name)) > 0
      and length(trim(b.display_name)) > 0 and length(trim(d.display_name)) > 0
      and exists (select 1 from curtainsuk_private.fabric_media_mappings m
        join curtainsuk_private.fabric_media_assets a using(content_hash)
        where m.fabric_id=c.fabric_id and m.supplier_id=c.supplier_id and m.supplier_sku=c.supplier_sku
          and m.rights_state='APPROVED' and m.mapping_state='VERIFIED'
          and a.width > 0 and a.height > 0
          and a.shopify_cdn_url ~ '^https://cdn[.]shopify[.]com/[^?#]+$')
  ), matched as (
    select * from eligible e where
      (coalesce(p_filters->>'query','')='' or to_tsvector('simple',concat_ws(' ',brand,design,collection,colour_name)) @@ plainto_tsquery('simple',left(p_filters->>'query',100)))
      and (coalesce(p_filters->>'brand','')='' or brand=p_filters->>'brand')
      and (coalesce(p_filters->>'collection','')='' or collection=p_filters->>'collection')
      and (coalesce(p_filters->>'colour','')='' or p_filters->>'colour'=any(colour_families))
      and (coalesce(p_filters->>'pattern','')='' or p_filters->>'pattern'=any(patterns))
      and (coalesce(p_filters->>'character','')='' or p_filters->>'character'=any(characters))
      and (coalesce(p_filters->>'style','')='' or p_filters->>'style'=any(styles))
      and (coalesce(p_filters->>'window','')='' or p_filters->>'window'=any(window_types))
      and (coalesce(p_filters->>'sample','')='' or (p_filters->>'sample'='AVAILABLE' and sample_current) or (p_filters->>'sample'='UNAVAILABLE' and not sample_current))
      and (coalesce(p_filters->>'availability','')='' or (p_filters->>'availability' in ('CURRENT','AVAILABLE') and stock_current) or (p_filters->>'availability' in ('CONFIRM','CHECK_AVAILABILITY') and not stock_known) or (p_filters->>'availability'='OUT_OF_STOCK' and stock_known and not stock_current))
  ), page as (
    select fabric_id,brand,design,colour_name from matched order by brand,design,colour_name,fabric_id
    limit greatest(1,least(p_size,48)) offset ((greatest(1,least(p_page,10000))-1)*greatest(1,least(p_size,48)))
  ) select jsonb_build_object('ids',coalesce((select jsonb_agg(fabric_id order by brand,design,colour_name,fabric_id) from page),'[]'::jsonb),
    'total',(select count(*) from matched),
    'brands',(select coalesce(jsonb_agg(brand order by brand),'[]'::jsonb) from (select distinct brand from eligible) b),
    'collections',(select coalesce(jsonb_agg(collection order by collection),'[]'::jsonb) from (select distinct collection from eligible) co));
$function$
;

insert into curtainsuk_private.supplier_freshness_policies (policy_id,supplier_id,source_type,data_type,freshness_minutes,effective_from)
values
 ('pt-webtex-stock-96h-20260918','prestigious-textiles','MANUAL_PORTAL','STOCK',5760,'2026-09-18T00:00:00Z'),
 ('sdg-portal-stock-96h-20260918','sanderson-design-group','MANUAL_PORTAL','STOCK',5760,'2026-09-18T00:00:00Z')
on conflict (policy_id) do nothing;

-- Owner-authorised unattended SDG stock observations may be approved by a
-- narrow policy. The supplier-wide manual approval policy for price and other
-- evidence is unchanged. This does not create stock or alter observations.
create function curtainsuk_private.approve_sdg_portal_stock_run(p_run_id text)
returns integer language plpgsql security invoker set search_path='' as $$
declare expected integer;
begin
 if current_user <> 'service_role' then raise exception 'SDG_SERVICE_ROLE_REQUIRED'; end if;
 if p_run_id is null or p_run_id !~ '^sdg-portal-routine:[a-f0-9-]{36}:[0-9]{3}$' then raise exception 'SDG_ROUTINE_RUN_ID_REQUIRED'; end if;
 perform pg_advisory_xact_lock(hashtext('curtainsuk-sdg-stock-approval-'||p_run_id));
 select r.snapshots_appended into expected from curtainsuk_private.supplier_sync_runs r
 where r.run_id=p_run_id and r.supplier_id='sanderson-design-group'
 and r.adapter_id='sdg-portal-product-detail' and r.source_type='MANUAL_PORTAL'
 and r.source_name='SDG authenticated trade portal Product/detail'
 and r.status='SUCCEEDED' and r.snapshots_received=r.snapshots_appended;
 if expected is null or expected<1 or expected>100 then raise exception 'SDG_ROUTINE_BATCH_REQUIRED'; end if;
 if (select count(*) from curtainsuk_private.supplier_snapshots s where s.run_id=p_run_id)<>expected then raise exception 'SDG_ROUTINE_SNAPSHOT_COUNT_MISMATCH'; end if;
 if exists (
  select 1 from curtainsuk_private.supplier_snapshots s
  where s.run_id=p_run_id and (
   s.supplier_id<>'sanderson-design-group' or s.brand_id='sdg-zoffany'
   or s.validation_status<>'VALIDATED' or s.verification_status<>'VERIFIED'
   or s.source_type<>'MANUAL_PORTAL' or s.source_name<>'SDG authenticated trade portal Product/detail'
   or s.source_reference is distinct from 'sdg:Product/detail:'||s.supplier_sku
   or s.checked_at>now() or s.checked_at<now()-curtainsuk_private.stock_validity_window()
   or s.stock_unit<>'METRE' or s.aggregate_available_quantity is null or s.aggregate_available_quantity<0
   or s.normalized_payload->>'snapshot_id' is distinct from s.snapshot_id
   or s.normalized_payload->>'supplier_sku' is distinct from s.supplier_sku
   or s.normalized_payload->>'stock_unit' is distinct from 'METRE'
   or (s.normalized_payload->>'checked_at')::timestamptz is distinct from s.checked_at
   or (s.normalized_payload->>'aggregate_available_quantity')::numeric is distinct from s.aggregate_available_quantity
   or s.lifecycle_state not in ('CURRENT','UNKNOWN')
   or exists(select 1 from curtainsuk_private.supplier_snapshot_prices p where p.snapshot_id=s.snapshot_id and (p.standard_trade_price is not null or p.cut_trade_price is not null))
   or (select count(*) from curtainsuk_private.fabric_colourways c where c.supplier_id=s.supplier_id and c.supplier_sku=s.supplier_sku and c.brand_id=s.brand_id and c.lifecycle_state in ('CURRENT','UNKNOWN'))<>1
  )
 ) then raise exception 'SDG_ROUTINE_EVIDENCE_NOT_APPROVABLE'; end if;
 if exists(select 1 from curtainsuk_private.supplier_snapshots s join curtainsuk_private.supplier_promotion_events e on e.snapshot_id=s.snapshot_id
   where s.run_id=p_run_id and e.promotion_state in ('REJECTED','EXPIRED')) then raise exception 'SDG_ROUTINE_REJECTED_EVIDENCE'; end if;
 insert into curtainsuk_private.supplier_promotion_events
 (event_id,snapshot_id,promotion_state,actor_type,actor_id,reason,rejection_reason,previous_approved_snapshot_id,created_at)
 select s.snapshot_id||':sdg-routine-policy',s.snapshot_id,'APPROVED_FOR_PROJECTION','POLICY',null,
 'Owner-approved exact-SKU SDG portal stock-only policy; current primary metres, 96-hour expiry, no inferred price or lifecycle.',null,
 (select prior.snapshot_id from curtainsuk_private.supplier_snapshots prior where prior.supplier_id=s.supplier_id and prior.supplier_sku=s.supplier_sku and prior.snapshot_id<>s.snapshot_id
   and (select e.promotion_state from curtainsuk_private.supplier_promotion_events e where e.snapshot_id=prior.snapshot_id order by e.created_at desc limit 1)='APPROVED_FOR_PROJECTION'
   order by prior.checked_at desc limit 1),now()
 from curtainsuk_private.supplier_snapshots s where s.run_id=p_run_id
 on conflict (event_id) do nothing;
 if (select count(*) from curtainsuk_private.supplier_snapshots s join curtainsuk_private.supplier_promotion_events e on e.snapshot_id=s.snapshot_id and e.event_id=s.snapshot_id||':sdg-routine-policy' where s.run_id=p_run_id) <> expected then raise exception 'SDG_ROUTINE_APPROVAL_COUNT_MISMATCH'; end if;
 return expected;
end $$;
revoke all on function curtainsuk_private.approve_sdg_portal_stock_run(text) from public,anon,authenticated;
grant execute on function curtainsuk_private.approve_sdg_portal_stock_run(text) to service_role;
commit;
