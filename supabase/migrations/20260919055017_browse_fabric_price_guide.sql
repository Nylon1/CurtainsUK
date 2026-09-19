-- Browse-only opt-in overload. The existing 3-argument search stays unchanged.
-- No supplier, stock, product, price or eligibility rows are changed.
CREATE OR REPLACE FUNCTION curtainsuk_private.search_retail_fabrics(p_filters jsonb, p_page integer, p_size integer, p_guide_min integer, p_guide_max integer)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  with approved_guides as materialized (
    -- Mirrors selectCurrentApprovedSupplierCostMinor: PT Standard / SDG Cut,
    -- latest validated, explicitly approved GBP evidence, no age-based price expiry.
    -- Prices are rounded to minor units before the approved x3 guide is applied.
    select distinct on (s.supplier_id,s.supplier_sku)
      s.supplier_id,s.supplier_sku,
      (round((case when s.supplier_id='prestigious-textiles' then p.standard_trade_price else p.cut_trade_price end)*100)*3)::bigint guide_minor
    from curtainsuk_private.supplier_snapshots s
    join curtainsuk_private.supplier_snapshot_prices p using(snapshot_id)
    where s.validation_status='VALIDATED' and s.checked_at<=now() and p.currency='GBP'
      and (case when s.supplier_id='prestigious-textiles' then p.standard_trade_price else p.cut_trade_price end)>0
      and (select e.promotion_state from curtainsuk_private.supplier_promotion_events e
        where e.snapshot_id=s.snapshot_id order by e.created_at desc limit 1)='APPROVED_FOR_PROJECTION'
    order by s.supplier_id,s.supplier_sku,s.checked_at desc,s.snapshot_id desc
  ), eligible as (
    select c.fabric_id,g.guide_minor,c.colour_name,c.sample_available,c.storefront_selectable,c.lifecycle_state,
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
    left join approved_guides g on g.supplier_id=c.supplier_id and g.supplier_sku=c.supplier_sku
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
      (p_guide_min is null or guide_minor>=p_guide_min)
      and (p_guide_max is null or guide_minor<p_guide_max) and
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
    select fabric_id,guide_minor,brand,design,colour_name from matched order by brand,design,colour_name,fabric_id
    limit greatest(1,least(p_size,48)) offset ((greatest(1,least(p_page,10000))-1)*greatest(1,least(p_size,48)))
  ) select jsonb_build_object('ids',coalesce((select jsonb_agg(fabric_id order by brand,design,colour_name,fabric_id) from page),'[]'::jsonb),
    'guidePrices',coalesce((select jsonb_object_agg(fabric_id,guide_minor) from page where guide_minor>0),'{}'::jsonb),
    'total',(select count(*) from matched),
    'brands',(select coalesce(jsonb_agg(brand order by brand),'[]'::jsonb) from (select distinct brand from eligible) b),
    'collections',(select coalesce(jsonb_agg(collection order by collection),'[]'::jsonb) from (select distinct collection from eligible) co));
$function$
;


revoke all on function curtainsuk_private.search_retail_fabrics(jsonb,integer,integer,integer,integer) from public,anon,authenticated;
grant execute on function curtainsuk_private.search_retail_fabrics(jsonb,integer,integer,integer,integer) to service_role;
comment on function curtainsuk_private.search_retail_fabrics(jsonb,integer,integer,integer,integer) is 'Browse-only customer guide; not a selling rate, quote or checkout price. Existing search/eligibility preserved. No raw prices in result.';
notify pgrst,'reload schema';
