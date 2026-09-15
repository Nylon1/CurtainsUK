-- Private operational corrections; manufacturer observations and order snapshots remain immutable.
begin;
create table curtainsuk_private.daily_stock_snapshot_history (
  supplier_id text not null, supplier_sku text not null, snapshot_date date not null,
  checked_at timestamptz not null, source_snapshot_id text primary key,
  aggregate_metres numeric not null, cut_price_minor integer, lifecycle_state text not null,
  recorded_at timestamptz not null default now()
);
alter table curtainsuk_private.daily_stock_snapshot_history enable row level security;
revoke all on curtainsuk_private.daily_stock_snapshot_history from public,anon,authenticated,service_role;
grant select,insert on curtainsuk_private.daily_stock_snapshot_history to service_role;
-- Backfill actual existing baselines; recorded_at is migration time, not fabricated observation/operator time.
insert into curtainsuk_private.daily_stock_snapshot_history
(supplier_id,supplier_sku,snapshot_date,checked_at,source_snapshot_id,aggregate_metres,cut_price_minor,lifecycle_state)
select supplier_id,supplier_sku,snapshot_date,checked_at,source_snapshot_id,aggregate_metres,cut_price_minor,lifecycle_state
from curtainsuk_private.daily_stock_snapshots;
create trigger daily_stock_history_immutable before update or delete on curtainsuk_private.daily_stock_snapshot_history
for each row execute function curtainsuk_private.reject_daily_stock_audit_mutation();

create function curtainsuk_private.audit_daily_stock_revision() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='UPDATE' then
  if (new.supplier_id,new.supplier_sku,new.snapshot_date) is distinct from (old.supplier_id,old.supplier_sku,old.snapshot_date)
    or new.checked_at<=old.checked_at or new.source_snapshot_id=old.source_snapshot_id then
   raise exception 'NEWER_APPROVED_STOCK_OBSERVATION_REQUIRED';
  end if;
  if not exists(select 1 from curtainsuk_private.supplier_snapshots s
    where s.snapshot_id=new.source_snapshot_id and s.supplier_id=new.supplier_id and s.supplier_sku=new.supplier_sku
    and s.checked_at=new.checked_at and s.checked_at<=now() and s.validation_status='VALIDATED'
    and (s.checked_at at time zone 'Europe/London')::date=new.snapshot_date
    and (s.normalized_payload->>'aggregate_available_quantity')::numeric=new.aggregate_metres
    and s.normalized_payload->>'stock_unit'='METRE'
    and coalesce(s.normalized_payload->>'lifecycle_state','UNKNOWN')=new.lifecycle_state
    and (select e.promotion_state from curtainsuk_private.supplier_promotion_events e where e.snapshot_id=s.snapshot_id order by e.created_at desc limit 1)='APPROVED_FOR_PROJECTION')
  then raise exception 'NEWER_APPROVED_STOCK_OBSERVATION_REQUIRED'; end if;
 end if;
 insert into curtainsuk_private.daily_stock_snapshot_history
 (supplier_id,supplier_sku,snapshot_date,checked_at,source_snapshot_id,aggregate_metres,cut_price_minor,lifecycle_state)
 values(new.supplier_id,new.supplier_sku,new.snapshot_date,new.checked_at,new.source_snapshot_id,new.aggregate_metres,new.cut_price_minor,new.lifecycle_state)
 on conflict do nothing;
 return new;
end $$;
revoke all on function curtainsuk_private.audit_daily_stock_revision() from public,anon,authenticated;
create trigger audit_daily_stock_revision before insert or update on curtainsuk_private.daily_stock_snapshots
for each row execute function curtainsuk_private.audit_daily_stock_revision();
grant update on curtainsuk_private.daily_stock_snapshots to service_role;
create trigger hide_corrected_discontinued_fabric after update on curtainsuk_private.daily_stock_snapshots
for each row execute function curtainsuk_private.hide_daily_discontinued_fabric();

create function curtainsuk_private.daily_stock_health() returns jsonb
language sql stable security invoker set search_path='' as $$
 with coverage as (
 select c.supplier_id,count(*) expected,
 count(s.supplier_sku) filter(where s.checked_at>=now()-interval '3 days' and s.checked_at<=now()) covered,
 max(s.checked_at) latest_source_checked_at
 from curtainsuk_private.fabric_colourways c
 left join lateral (select * from curtainsuk_private.daily_stock_snapshots s where s.supplier_id=c.supplier_id and s.supplier_sku=c.supplier_sku order by snapshot_date desc limit 1) s on true
 where c.lifecycle_state<>'DISCONTINUED' group by c.supplier_id)
 select coalesce(jsonb_agg(jsonb_build_object('supplier',supplier_id,'expected',expected,'covered',covered,
 'missing_or_stale',expected-covered,'latest_source_checked_at',latest_source_checked_at,
 'business_outcome',case when covered=0 then 'FAILED' when covered<expected then 'INCOMPLETE' else 'COMPLETE' end,
 'alert',case when covered=0 then 'NO_CURRENT_SUPPLIER_OBSERVATIONS' when covered<expected then 'PARTIAL_SUPPLIER_COVERAGE' else null end)),'[]'::jsonb) from coverage;
$$;
revoke all on function curtainsuk_private.daily_stock_health() from public,anon,authenticated;
grant execute on function curtainsuk_private.daily_stock_health() to service_role;

create function curtainsuk_private.fabric_commercial_evidence(p_ids text[]) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
 if coalesce(array_length(p_ids,1),0)>48 then raise exception 'RETAIL_PAGE_TOO_LARGE'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('fabric_id',c.fabric_id,
 'stale',coalesce(s.checked_at<now()-interval '3 days',true) or coalesce(s.checked_at>now(),false),
 'stock',case when c.lifecycle_state='DISCONTINUED' or s.lifecycle_state='DISCONTINUED' then 'NO_LONGER_AVAILABLE'
 when s.supplier_sku is null or s.checked_at<now()-interval '3 days' or s.checked_at>now() then 'AVAILABILITY_TO_BE_CONFIRMED'
 when s.aggregate_metres-coalesce(u.used,0)>=30 then 'FABRIC_AVAILABLE' else 'TEMPORARILY_UNAVAILABLE' end,
 'price_confirmed',exists(
 select 1 from curtainsuk_private.supplier_snapshots p join curtainsuk_private.supplier_snapshot_prices price using(snapshot_id)
 where p.supplier_id=c.supplier_id and p.supplier_sku=c.supplier_sku and p.validation_status='VALIDATED'
 and p.checked_at<=now()  and price.currency='GBP' and price.cut_trade_price>0
 and (select e.promotion_state from curtainsuk_private.supplier_promotion_events e where e.snapshot_id=p.snapshot_id order by e.created_at desc limit 1)='APPROVED_FOR_PROJECTION'
 ))),'[]'::jsonb) into result
 from curtainsuk_private.fabric_colourways c
 left join lateral (select * from curtainsuk_private.daily_stock_snapshots s where s.supplier_id=c.supplier_id and s.supplier_sku=c.supplier_sku order by snapshot_date desc limit 1) s on true
 left join lateral (select sum(metres) used from curtainsuk_private.daily_stock_usage u where u.supplier_id=c.supplier_id and u.supplier_sku=c.supplier_sku and u.confirmed_at>=s.checked_at) u on true
 where c.fabric_id=any(p_ids);
 return result;
end $$;
revoke all on function curtainsuk_private.fabric_commercial_evidence(text[]) from public,anon,authenticated;
grant execute on function curtainsuk_private.fabric_commercial_evidence(text[]) to service_role;
create table curtainsuk_private.daily_stock_materialization_events (
 event_id uuid primary key default gen_random_uuid(), attempted_at timestamptz not null default now(),
 results jsonb not null, coverage jsonb not null
);
alter table curtainsuk_private.daily_stock_materialization_events enable row level security;
revoke all on curtainsuk_private.daily_stock_materialization_events from public,anon,authenticated,service_role;
grant select,insert on curtainsuk_private.daily_stock_materialization_events to service_role;
create trigger materialization_history_immutable before update or delete on curtainsuk_private.daily_stock_materialization_events
for each row execute function curtainsuk_private.reject_daily_stock_audit_mutation();
create or replace function curtainsuk_private.materialize_daily_stock(p_now timestamptz default now()) returns jsonb
language plpgsql security invoker set search_path='' as $$
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
  where s.supplier_id=supplier and s.checked_at>=p_now-interval '3 days' and s.checked_at<=p_now
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
  values(supplier,d,p_now,case when exists(select 1 from curtainsuk_private.daily_stock_snapshots where supplier_id=supplier and checked_at>=p_now-interval '3 days' and checked_at<=p_now) then 'SUCCESS' else 'FAILED' end,(select count(distinct supplier_sku) from curtainsuk_private.daily_stock_snapshots where supplier_id=supplier and checked_at>=p_now-interval '3 days' and checked_at<=p_now),case when not exists(select 1 from curtainsuk_private.daily_stock_snapshots where supplier_id=supplier and checked_at>=p_now-interval '3 days' and checked_at<=p_now) then 'NO_CURRENT_SUPPLIER_OBSERVATIONS' end)
  on conflict(supplier_id,snapshot_date) do update set attempted_at=excluded.attempted_at,status=excluded.status,imported=excluded.imported,error_code=excluded.error_code;
  result:=result||jsonb_build_object('supplier',supplier,'imported',n);
 end loop;
 insert into curtainsuk_private.daily_stock_materialization_events(results,coverage) values(result,curtainsuk_private.daily_stock_health());
 return result;
end $$;
revoke all on function curtainsuk_private.materialize_daily_stock(timestamptz) from public,anon,authenticated;
grant execute on function curtainsuk_private.materialize_daily_stock(timestamptz) to service_role;

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
      coalesce(stock.checked_at<=now(),false) stock_known
    from curtainsuk_private.fabric_colourways c
    join curtainsuk_private.supplier_brands b on b.brand_id=c.brand_id
    join curtainsuk_private.fabric_designs d on d.design_id=c.design_id
    join curtainsuk_private.fabric_collections co on co.collection_id=d.collection_id
    left join curtainsuk_private.fabric_retail_profiles r on r.fabric_id=c.fabric_id
    left join lateral (select * from curtainsuk_private.daily_stock_snapshots st where st.supplier_id=c.supplier_id and st.supplier_sku=c.supplier_sku order by st.snapshot_date desc limit 1) stock on stock.checked_at>=now()-interval '3 days'
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
      and (coalesce(p_filters->>'sample','')='' or (p_filters->>'sample'='AVAILABLE' and stock_current) or (p_filters->>'sample'='UNAVAILABLE' and not stock_current))
      and (coalesce(p_filters->>'availability','')='' or (p_filters->>'availability' in ('CURRENT','AVAILABLE') and stock_current) or (p_filters->>'availability' in ('CONFIRM','CHECK_AVAILABILITY') and not stock_known) or (p_filters->>'availability'='OUT_OF_STOCK' and stock_known and not stock_current))
  ), page as (
    select fabric_id,brand,design,colour_name from matched order by brand,design,colour_name,fabric_id
    limit greatest(1,least(p_size,48)) offset ((greatest(1,least(p_page,10000))-1)*greatest(1,least(p_size,48)))
  ) select jsonb_build_object('ids',coalesce((select jsonb_agg(fabric_id order by brand,design,colour_name,fabric_id) from page),'[]'::jsonb),
    'total',(select count(*) from matched),
    'brands',(select coalesce(jsonb_agg(brand order by brand),'[]'::jsonb) from (select distinct brand from eligible) b),
    'collections',(select coalesce(jsonb_agg(collection order by collection),'[]'::jsonb) from (select distinct collection from eligible) co));
$function$;
CREATE OR REPLACE FUNCTION curtainsuk_private.promote_fabric_for_staging_projection(p_supplier_id text, p_supplier_sku text, p_snapshot_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not exists (
    select 1
    from curtainsuk_private.supplier_snapshots snapshot
    join curtainsuk_private.supplier_snapshot_prices price
      on price.snapshot_id = snapshot.snapshot_id
    where snapshot.snapshot_id = p_snapshot_id
      and snapshot.supplier_id = p_supplier_id
      and snapshot.supplier_sku = p_supplier_sku
      and snapshot.validation_status = 'VALIDATED'
      and snapshot.checked_at <= clock_timestamp()
      and snapshot.lifecycle_state <> 'DISCONTINUED'
      and price.cut_trade_price > 0
      and price.currency = 'GBP'
      and (
        select event.promotion_state
        from curtainsuk_private.supplier_promotion_events event
        where event.snapshot_id = snapshot.snapshot_id
        order by
          event.created_at desc,
          case event.promotion_state
            when 'EXPIRED' then 4
            when 'REJECTED' then 3
            when 'APPROVED_FOR_PROJECTION' then 2
            when 'VALIDATED' then 1
            else 0
          end desc,
          event.event_id desc
        limit 1
      ) = 'APPROVED_FOR_PROJECTION'
  ) then
    raise exception 'Genuine approved supplier cut price is required';
  end if;

  update curtainsuk_private.fabric_supplier_links
  set price_verification_status = 'VERIFIED'
  where supplier_id = p_supplier_id and supplier_sku = p_supplier_sku;

  update curtainsuk_private.fabric_colourways
  set price_verification_status = 'VERIFIED',
      storefront_selectable = true,
      updated_at = clock_timestamp()
  where supplier_id = p_supplier_id
    and supplier_sku = p_supplier_sku
    and lifecycle_state <> 'DISCONTINUED';
end;
$function$;
CREATE OR REPLACE FUNCTION curtainsuk_private.create_staging_configuration_snapshot(p_snapshot jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  outcome text := p_snapshot->>'pricing_outcome';
  request_record curtainsuk_private.staging_review_requests;
  revision_record curtainsuk_private.staging_review_request_revisions;
  inserted curtainsuk_private.staging_configuration_snapshots;
  current_price_snapshot_id text;
  private_key_pattern text := '"(supplier_?cost|standard_?trade_?price|cut_?trade_?price|gross_?margin|raw_?stock|batch_?reference|dye_?lot)"[[:space:]]*:';
begin
  if p_snapshot->'customer_summary' ? 'patternAllowance' then
    if jsonb_typeof(p_snapshot#>'{customer_summary,patternAllowance}') is distinct from 'object'
      or not coalesce((p_snapshot#>'{customer_summary,patternAllowance}') in (
        '{"provenance":"DEFAULT_PATTERN_ALLOWANCE","allowanceMm":500,"policyVersion":"curtainsuk-pattern-allowance-v1"}'::jsonb,
        '{"provenance":"PLAIN_NO_MATCH_REQUIRED","allowanceMm":0,"policyVersion":"curtainsuk-pattern-allowance-v1"}'::jsonb
      ),false) then raise exception 'Invalid checkout pattern provenance'; end if;
  end if;
  if p_snapshot->'customer_summary' ? 'consultationContext' then
    if jsonb_typeof(p_snapshot#>'{customer_summary,consultationContext}') is distinct from 'object' then raise exception 'Invalid checkout consultation provenance'; end if;
    if not (p_snapshot#>'{customer_summary,consultationContext}') ?& array['sessionId','strategyId','fabricMasterId','policyVersion','recommendationVersion']
      or exists(select 1 from jsonb_each(p_snapshot#>'{customer_summary,consultationContext}') e where e.key not in ('sessionId','strategyId','fabricMasterId','policyVersion','recommendationVersion') or jsonb_typeof(e.value)<>'string')
      or p_snapshot#>>'{customer_summary,consultationContext,fabricMasterId}' is distinct from p_snapshot->>'fabric_master_id'
      or not coalesce(p_snapshot#>>'{customer_summary,consultationContext,sessionId}' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',false)
      or not coalesce(p_snapshot#>>'{customer_summary,consultationContext,strategyId}' in ('overall','tonal','complementary','pattern-style','bold'),false)
      or not coalesce(p_snapshot#>>'{customer_summary,consultationContext,policyVersion}' ~ '^[a-zA-Z0-9._-]{1,100}$',false)
      or not coalesce((p_snapshot#>>'{customer_summary,consultationContext,recommendationVersion}' ~ '^sha256:[0-9a-f]{64}$') or (p_snapshot#>>'{customer_summary,consultationContext,recommendationVersion}' = 'initial:' || (p_snapshot#>>'{customer_summary,consultationContext,sessionId}')),false)
      or not exists(select 1 from curtainsuk_private.hci_staging_versions v where v.session_id::text=p_snapshot#>>'{customer_summary,consultationContext,sessionId}')
      then raise exception 'Invalid checkout consultation provenance'; end if;
  end if;
  if outcome not in ('INSTANT_PRICE', 'PRICE_WITH_REVIEW', 'MANUAL_QUOTE')
     or jsonb_typeof(p_snapshot->'measurements') <> 'object'
     or jsonb_typeof(p_snapshot->'customer_summary') <> 'object'
     or jsonb_typeof(p_snapshot->'customer_summary'->'measurements') <> 'object'
     or jsonb_typeof(p_snapshot->'customer_summary'->'fabric') <> 'object'
     or (p_snapshot->'measurements')::text ~* private_key_pattern
     or (p_snapshot->'customer_summary')::text ~* private_key_pattern
     or exists (
       select 1
       from jsonb_object_keys(p_snapshot->'measurements') as measurement_key(key)
       where measurement_key.key not in (
         'measurement_basis', 'coverage_width', 'finished_drop', 'recess_width', 'recess_height',
         'left_return', 'right_return', 'bay_segment_widths', 'bay_angles_degrees',
         'curve_arc_length', 'peak_height', 'left_vertical', 'right_vertical',
         'left_slope', 'right_slope', 'left_slope_angle_degrees',
         'right_slope_angle_degrees', 'door_width', 'door_height',
         'number_of_sections', 'track_or_pole_fitted'
       )
     )
     or exists (
       select 1
       from jsonb_object_keys(p_snapshot->'customer_summary') as summary_key(key)
       where summary_key.key not in (
         'windowType', 'measurements', 'fabric', 'heading', 'lining',
         'construction', 'availability', 'reviewState', 'vatIncluded',
         'deliveryShownSeparately', 'patternAllowance', 'consultationContext'
       )
     )
     or exists (
       select 1
       from jsonb_object_keys(p_snapshot->'customer_summary'->'fabric') as fabric_key(key)
       where fabric_key.key not in ('id', 'supplier', 'brand', 'collection', 'design', 'colour')
     )
     or not (p_snapshot->'customer_summary' ?& array[
       'windowType', 'measurements', 'fabric', 'heading', 'lining',
       'construction', 'availability', 'vatIncluded', 'deliveryShownSeparately'
     ])
     or p_snapshot->'customer_summary'->'measurements' is distinct from p_snapshot->'measurements'
     or p_snapshot->'customer_summary'->>'windowType' is distinct from p_snapshot->>'window_type_slug'
     or p_snapshot->'customer_summary'->>'heading' is distinct from p_snapshot->>'heading'
     or p_snapshot->'customer_summary'->>'lining' is distinct from p_snapshot->>'lining'
     or p_snapshot->'customer_summary'->>'construction' is distinct from p_snapshot->>'construction'
     or p_snapshot->'customer_summary'->>'availability' is distinct from p_snapshot->>'availability_state'
     or p_snapshot->'customer_summary'->'vatIncluded' is distinct from 'true'::jsonb
     or p_snapshot->'customer_summary'->'deliveryShownSeparately' is distinct from 'true'::jsonb
     or nullif(trim(p_snapshot->'customer_summary'->'fabric'->>'design'), '') is null
     or nullif(trim(p_snapshot->'customer_summary'->'fabric'->>'colour'), '') is null then
    raise exception 'Invalid or private checkout snapshot payload';
  end if;

  if outcome = 'INSTANT_PRICE' then
    if nullif(p_snapshot->>'review_request_id', '') is not null
       or nullif(p_snapshot->>'review_revision_id', '') is not null
       or p_snapshot->'customer_summary' ? 'reviewState' then
      raise exception 'Instant checkout cannot carry a review reference';
    end if;
  else
    select * into request_record
    from curtainsuk_private.staging_review_requests
    where request_id = (p_snapshot->>'review_request_id')::uuid
      and configuration_id = (p_snapshot->>'configuration_id')::uuid
    for share;
    if request_record.request_id is null or request_record.review_state <> 'READY_FOR_CHECKOUT' then
      raise exception 'Review is not ready for checkout';
    end if;
    if p_snapshot->'customer_summary'->>'reviewState' is distinct from 'READY_FOR_CHECKOUT' then
      raise exception 'Checkout summary does not match the approved review state';
    end if;
    if request_record.pricing_outcome is distinct from outcome then
      raise exception 'Checkout outcome does not match the approved review request';
    end if;
    if nullif(trim(p_snapshot->>'approval_reference'), '') is distinct from request_record.request_id::text then
      raise exception 'Checkout approval reference does not match the review request';
    end if;
    select * into revision_record
    from curtainsuk_private.staging_review_request_revisions
    where revision_id = (p_snapshot->>'review_revision_id')::uuid
      and request_id = request_record.request_id;
    if revision_record.revision_id is null
       or revision_record.final_net_amount_minor <> (p_snapshot->>'net_amount_minor')::integer
       or revision_record.final_vat_amount_minor <> (p_snapshot->>'vat_amount_minor')::integer
       or revision_record.final_gross_amount_minor <> (p_snapshot->>'customer_price_minor')::integer
       or revision_record.final_vat_rate_basis_points <> (p_snapshot->>'vat_rate_basis_points')::integer
       or revision_record.pricing_rule_version <> p_snapshot->>'pricing_rule_version' then
      raise exception 'Checkout price does not match the approved review revision';
    end if;
    if exists (
      select 1 from curtainsuk_private.staging_review_request_revisions newer
      where newer.request_id = request_record.request_id
        and newer.revision_number > revision_record.revision_number
    ) then
      raise exception 'Checkout revision is stale';
    end if;
    if p_snapshot->>'window_type_slug' is distinct from coalesce(
         nullif(trim(revision_record.specification->>'window_type_slug'), ''),
         request_record.window_type_slug
       )
       or p_snapshot->'measurements' is distinct from (case
         when jsonb_typeof(revision_record.specification->'measurements') = 'object'
           then revision_record.specification->'measurements'
         else request_record.measurements
       end)
       or p_snapshot->>'fabric_master_id' is distinct from coalesce(
         nullif(trim(revision_record.specification->>'fabric_id'), ''),
         request_record.fabric_id
       )
       or p_snapshot->>'supplier_sku' is distinct from coalesce(
         nullif(trim(revision_record.specification->>'supplier_sku'), ''),
         request_record.supplier_sku
       )
       or p_snapshot->>'heading' is distinct from coalesce(
         nullif(trim(revision_record.specification->>'heading'), ''),
         request_record.heading
       )
       or p_snapshot->>'lining' is distinct from coalesce(
         nullif(trim(revision_record.specification->>'lining'), ''),
         request_record.lining
       )
       or p_snapshot->>'construction' is distinct from coalesce(
         nullif(trim(revision_record.specification->>'construction'), ''),
         request_record.construction
       )
       or (p_snapshot->>'calculated_fabric_metres')::numeric is distinct from coalesce(
         nullif(revision_record.specification->>'calculated_fabric_metres', '')::numeric,
         request_record.calculated_fabric_metres
       )
       or not coalesce((
         p_snapshot->>'shipping_parcel_class' = 'STANDARD'
         or (p_snapshot->>'shipping_parcel_class' = 'SPECIALIST'
           and (p_snapshot->>'shipping_gross_amount_minor')::integer = (revision_record.specification->'delivery_confirmation'->>'gross_amount_minor')::integer
           and p_snapshot->>'shipping_region' = revision_record.specification->'delivery_confirmation'->>'region'
           and length(trim(revision_record.specification->'delivery_confirmation'->>'reason')) >= 3)
         or p_snapshot->>'shipping_parcel_class' = nullif(trim(revision_record.specification->>'shipping_parcel_class'), '')
       ), false) then
      raise exception 'Checkout configuration does not match the approved review revision';
    end if;
    if not exists (
      select 1
      from curtainsuk_private.fabric_colourways fabric
      where fabric.fabric_id = p_snapshot->>'fabric_master_id'
        and fabric.supplier_id = coalesce(
          nullif(trim(revision_record.specification->>'supplier_id'), ''),
          request_record.supplier_id
        )
        and fabric.supplier_sku = p_snapshot->>'supplier_sku'
    ) then
      raise exception 'Checkout fabric identity does not match the Fabric Master';
    end if;
  end if;

  if not exists (
    select 1
    from curtainsuk_private.fabric_colourways fabric
    where fabric.fabric_id = p_snapshot->>'fabric_master_id'
      and fabric.supplier_sku = p_snapshot->>'supplier_sku'
      and fabric.lifecycle_state <> 'DISCONTINUED'
      and (fabric.storefront_selectable or fabric.staging_catalog_visible)
  ) then
    raise exception 'Checkout fabric is not pricing-eligible in the Fabric Master';
  end if;

  -- Fabric Master flags are a catalogue projection, not durable proof that a
  -- supplier price remains current. Resolve and retain the exact latest
  -- approved supplier price observation used at handoff. A later price change
  -- cannot mutate this immutable link or the approved customer total.
  select supplier_snapshot.snapshot_id
  into current_price_snapshot_id
  from curtainsuk_private.fabric_colourways fabric
  join curtainsuk_private.supplier_snapshots supplier_snapshot
    on supplier_snapshot.supplier_id = fabric.supplier_id
   and supplier_snapshot.supplier_sku = fabric.supplier_sku
  join curtainsuk_private.supplier_snapshot_prices supplier_price
    on supplier_price.snapshot_id = supplier_snapshot.snapshot_id
  where fabric.fabric_id = p_snapshot->>'fabric_master_id'
    and fabric.supplier_sku = p_snapshot->>'supplier_sku'
    and supplier_snapshot.validation_status = 'VALIDATED'
    and supplier_snapshot.checked_at <= clock_timestamp()
    and supplier_snapshot.lifecycle_state <> 'DISCONTINUED'
    and supplier_price.cut_trade_price > 0
    and supplier_price.currency = 'GBP'
    and (
      select promotion.promotion_state
      from curtainsuk_private.supplier_promotion_events promotion
      where promotion.snapshot_id = supplier_snapshot.snapshot_id
      order by
        promotion.created_at desc,
        case promotion.promotion_state
          when 'EXPIRED' then 4
          when 'REJECTED' then 3
          when 'APPROVED_FOR_PROJECTION' then 2
          when 'VALIDATED' then 1
          else 0
        end desc,
        promotion.event_id desc
      limit 1
    ) = 'APPROVED_FOR_PROJECTION'
  order by supplier_snapshot.checked_at desc, supplier_snapshot.snapshot_id desc
  limit 1;
  if current_price_snapshot_id is null then
    raise exception 'Checkout approved supplier price is missing';
  end if;

  insert into curtainsuk_private.staging_configuration_snapshots (
    snapshot_id, configuration_id, review_request_id, review_revision_id,
    pricing_outcome, window_type_slug, measurements, fabric_master_id,
    supplier_sku, supplier_price_snapshot_id, heading, lining, construction, calculated_fabric_metres,
    pricing_rule_version, net_amount_minor, vat_amount_minor,
    customer_price_minor, vat_rate_basis_points, currency, availability_state, shipping_region, shipping_parcel_class,
    shipping_gross_amount_minor, goods_minimum_basis_minor, customer_summary,
    approval_reference, customer_accepted_at, recorded_at
  ) values (
    (p_snapshot->>'snapshot_id')::uuid,
    (p_snapshot->>'configuration_id')::uuid,
    nullif(p_snapshot->>'review_request_id', '')::uuid,
    nullif(p_snapshot->>'review_revision_id', '')::uuid,
    outcome,
    p_snapshot->>'window_type_slug',
    p_snapshot->'measurements',
    p_snapshot->>'fabric_master_id',
    p_snapshot->>'supplier_sku',
    current_price_snapshot_id,
    p_snapshot->>'heading',
    p_snapshot->>'lining',
    p_snapshot->>'construction',
    (p_snapshot->>'calculated_fabric_metres')::numeric,
    p_snapshot->>'pricing_rule_version',
    (p_snapshot->>'net_amount_minor')::integer,
    (p_snapshot->>'vat_amount_minor')::integer,
    (p_snapshot->>'customer_price_minor')::integer,
    (p_snapshot->>'vat_rate_basis_points')::integer,
    'GBP',
    p_snapshot->>'availability_state',
    p_snapshot->>'shipping_region',
    p_snapshot->>'shipping_parcel_class',
    (p_snapshot->>'shipping_gross_amount_minor')::integer,
    (p_snapshot->>'customer_price_minor')::integer,
    p_snapshot->'customer_summary',
    nullif(trim(p_snapshot->>'approval_reference'), ''),
    clock_timestamp(),
    clock_timestamp()
  ) returning * into inserted;

  return jsonb_build_object(
    'snapshot_id', inserted.snapshot_id,
    'configuration_id', inserted.configuration_id,
    'customer_price_minor', inserted.customer_price_minor,
    'shipping_gross_amount_minor', inserted.shipping_gross_amount_minor,
    'recorded_at', inserted.recorded_at
  );
end;
$function$;
commit;
