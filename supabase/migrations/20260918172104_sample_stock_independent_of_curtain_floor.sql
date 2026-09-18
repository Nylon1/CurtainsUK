-- Samples use fresh, positive available-now metres; curtains retain the >=30m commercial floor.
-- Existing exact identity, image, lifecycle, 72-hour and confirmed-usage rules remain.
begin;
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
 'stale',coalesce(s.checked_at<now()-interval '3 days',true) or coalesce(s.checked_at>now(),false),
 'stock',case when c.lifecycle_state='DISCONTINUED' or s.lifecycle_state='DISCONTINUED' then 'NO_LONGER_AVAILABLE'
 when s.supplier_sku is null or s.checked_at<now()-interval '3 days' or s.checked_at>now() then 'AVAILABILITY_TO_BE_CONFIRMED'
 when s.aggregate_metres-coalesce(u.used,0)>=30 then 'FABRIC_AVAILABLE' else 'TEMPORARILY_UNAVAILABLE' end,
 'sample_stock_available',coalesce(s.checked_at>=now()-interval '3 days' and s.checked_at<=now()
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
      and (coalesce(p_filters->>'sample','')='' or (p_filters->>'sample'='AVAILABLE' and sample_current) or (p_filters->>'sample'='UNAVAILABLE' and not sample_current))
      and (coalesce(p_filters->>'availability','')='' or (p_filters->>'availability' in ('CURRENT','AVAILABLE') and stock_current) or (p_filters->>'availability' in ('CONFIRM','CHECK_AVAILABILITY') and not stock_known) or (p_filters->>'availability'='OUT_OF_STOCK' and stock_known and not stock_current))
  ), page as (
    select fabric_id,brand,design,colour_name from matched order by brand,design,colour_name,fabric_id
    limit greatest(1,least(p_size,48)) offset ((greatest(1,least(p_page,10000))-1)*greatest(1,least(p_size,48)))
  ) select jsonb_build_object('ids',coalesce((select jsonb_agg(fabric_id order by brand,design,colour_name,fabric_id) from page),'[]'::jsonb),
    'total',(select count(*) from matched),
    'brands',(select coalesce(jsonb_agg(brand order by brand),'[]'::jsonb) from (select distinct brand from eligible) b),
    'collections',(select coalesce(jsonb_agg(collection order by collection),'[]'::jsonb) from (select distinct collection from eligible) co));
$function$;
commit;
