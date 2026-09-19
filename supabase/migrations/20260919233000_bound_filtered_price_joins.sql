CREATE OR REPLACE FUNCTION curtainsuk_private.search_retail_fabrics(p_filters jsonb, p_page integer, p_size integer, p_guide_min integer, p_guide_max integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
 SET jit TO off
 SET enable_nestloop TO off
 SET work_mem TO '32MB'
AS $function$
DECLARE result jsonb;
BEGIN
EXECUTE $query$ with knowledge as materialized (select fabric_id,visual_fields from curtainsuk_private.fabric_visual_knowledge_read_cache where knowledge_state in ('COMPLETE','PARTIAL_GOVERNED')), latest_promotions as materialized (
 select distinct on(snapshot_id) snapshot_id,promotion_state from curtainsuk_private.supplier_promotion_events order by snapshot_id,created_at desc
 ), approved_snapshots as materialized (
 select s.snapshot_id,s.supplier_id,s.supplier_sku,s.checked_at,s.validation_status from curtainsuk_private.supplier_snapshots s join latest_promotions e using(snapshot_id)
 where s.validation_status='VALIDATED' and s.checked_at<=now() and e.promotion_state='APPROVED_FOR_PROJECTION' and ($4 IS NOT NULL OR $5 IS NOT NULL)
 ), approved_guides as materialized (
    -- Mirrors selectCurrentApprovedSupplierCostMinor: PT Standard / SDG Cut,
    -- latest validated, explicitly approved GBP evidence, no age-based price expiry.
    -- Prices are rounded to minor units before the approved x3 guide is applied.
    select distinct on (s.supplier_id,s.supplier_sku)
      s.supplier_id,s.supplier_sku,
      (round((case when s.supplier_id='prestigious-textiles' then p.standard_trade_price else p.cut_trade_price end)*100)*3)::bigint guide_minor
    from approved_snapshots s
    join curtainsuk_private.supplier_snapshot_prices p using(snapshot_id)
    where s.validation_status='VALIDATED' and s.checked_at<=now() and p.currency='GBP'
      and (case when s.supplier_id='prestigious-textiles' then p.standard_trade_price else p.cut_trade_price end)>0
    order by s.supplier_id,s.supplier_sku,s.checked_at desc,s.snapshot_id desc
  ), eligible as (
    select c.fabric_id,c.supplier_sku,g.guide_minor,c.colour_name,c.sample_available,c.storefront_selectable,c.lifecycle_state,
      b.display_name brand,d.display_name design,co.display_name collection,
      r.colour_families,r.patterns,r.characters,r.styles,r.window_types,
      coalesce(k.visual_fields,'{}'::jsonb) knowledge_fields,
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
    left join knowledge k on k.fabric_id=c.fabric_id AND (coalesce($1->>'colour','')<>'' OR coalesce($1->>'pattern','')<>'' OR coalesce($1->>'character','')<>'' OR coalesce($1->>'activity','')<>'' OR coalesce($1->>'texture','')<>'' OR coalesce($1->>'presence','')<>'')
    left join lateral (select * from curtainsuk_private.daily_stock_snapshots st where st.supplier_id=c.supplier_id and st.supplier_sku=c.supplier_sku order by st.snapshot_date desc limit 1) stock on (coalesce($1->>'sample','')<>'' OR coalesce($1->>'availability','')<>'') AND stock.checked_at>=now()-curtainsuk_private.stock_validity_window()
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
    select fabric_id,supplier_sku,guide_minor,brand,design,colour_name from eligible e where
      ($4 is null or guide_minor>=$4)
      and ($5 is null or guide_minor<$5) and
      (coalesce($1->>'query','')='' or upper(supplier_sku)=upper(left($1->>'query',100)) or to_tsvector('simple',concat_ws(' ',brand,design,collection,colour_name)) @@ plainto_tsquery('simple',left($1->>'query',100)))
      and (coalesce($1->>'brand','')='' or brand=$1->>'brand')
      and (coalesce($1->>'collection','')='' or collection=$1->>'collection')
      and (coalesce($1->>'colour','')='' or case when $1->>'knowledge'='1' then (knowledge_fields->'primaryColour'->>'value'=$1->>'colour' or coalesce(knowledge_fields->'secondaryColours'->'value','[]'::jsonb) ? ($1->>'colour')) else $1->>'colour'=any(colour_families) end)
      and (coalesce($1->>'pattern','')='' or case when $1->>'knowledge'='1' then (knowledge_fields->'patternClass'->>'value'=$1->>'pattern' or coalesce(knowledge_fields->'motif'->'value','[]'::jsonb) ? ($1->>'pattern')) else $1->>'pattern'=any(patterns) end)
      and (coalesce($1->>'character','')='' or case when $1->>'knowledge'='1' then (coalesce(knowledge_fields->'character'->'value','[]'::jsonb) ? ($1->>'character')) else $1->>'character'=any(characters) end)
      and (coalesce($1->>'activity','')='' or knowledge_fields->'visualActivity'->>'value'=$1->>'activity')
      and (coalesce($1->>'texture','')='' or coalesce(knowledge_fields->'visualSurface'->'value','[]'::jsonb) ? ($1->>'texture'))
      and (coalesce($1->>'presence','')='' or knowledge_fields->'visualWeight'->>'value'=$1->>'presence')
      and (coalesce($1->>'style','')='' or $1->>'style'=any(styles))
      and (coalesce($1->>'window','')='' or $1->>'window'=any(window_types))
      and (coalesce($1->>'sample','')='' or ($1->>'sample'='AVAILABLE' and sample_current) or ($1->>'sample'='UNAVAILABLE' and not sample_current))
      and (coalesce($1->>'availability','')='' or ($1->>'availability' in ('CURRENT','AVAILABLE') and stock_current) or ($1->>'availability' in ('CONFIRM','CHECK_AVAILABILITY') and not stock_known) or ($1->>'availability'='OUT_OF_STOCK' and stock_known and not stock_current))
  ), page as (
    select fabric_id,supplier_sku,guide_minor,brand,design,colour_name from matched order by brand,design,colour_name,fabric_id
    limit greatest(1,least($3,48)) offset ((greatest(1,least($2,10000))-1)*greatest(1,least($3,48)))
  ) select jsonb_build_object('ids',coalesce((select jsonb_agg(fabric_id order by brand,design,colour_name,fabric_id) from page),'[]'::jsonb),
    'guidePrices',coalesce((select jsonb_object_agg(pg.fabric_id,price.guide_minor) from page pg
join curtainsuk_private.fabric_colourways c on c.fabric_id=pg.fabric_id
cross join lateral (select (round((case when s.supplier_id='prestigious-textiles' then p.standard_trade_price else p.cut_trade_price end)*100)*3)::bigint guide_minor
from curtainsuk_private.supplier_snapshots s join curtainsuk_private.supplier_snapshot_prices p using(snapshot_id)
where s.supplier_id=c.supplier_id and s.supplier_sku=c.supplier_sku
and s.validation_status='VALIDATED' and s.checked_at<=now() and p.currency='GBP'
and (case when s.supplier_id='prestigious-textiles' then p.standard_trade_price else p.cut_trade_price end)>0
and (select e.promotion_state from curtainsuk_private.supplier_promotion_events e where e.snapshot_id=s.snapshot_id order by e.created_at desc limit 1)='APPROVED_FOR_PROJECTION'
order by s.checked_at desc,s.snapshot_id desc limit 1) price where price.guide_minor>0),'{}'::jsonb),
    'total',(select count(*) from matched),
    'knowledgeOptions',case when $1->>'knowledge'='1' then (select data->'knowledgeOptions' from curtainsuk_private.fabric_knowledge_discovery_cache) else '[]'::jsonb end,
    'brands',(select data->'brands' from curtainsuk_private.fabric_knowledge_discovery_cache),
    'collections',(select data->'collections' from curtainsuk_private.fabric_knowledge_discovery_cache)) $query$ INTO result USING p_filters,p_page,p_size,p_guide_min,p_guide_max;
RETURN result;
END;
$function$;
