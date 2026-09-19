CREATE MATERIALIZED VIEW curtainsuk_private.fabric_visual_knowledge_read_cache AS
SELECT fabric_id,supplier_id,supplier_sku,knowledge_state,visual_fields,provenance,now() AS refreshed_at
FROM curtainsuk_private.fabric_visual_knowledge;
CREATE UNIQUE INDEX fabric_visual_knowledge_read_cache_id ON curtainsuk_private.fabric_visual_knowledge_read_cache(fabric_id);
REVOKE ALL ON curtainsuk_private.fabric_visual_knowledge_read_cache FROM PUBLIC,anon,authenticated;
GRANT SELECT ON curtainsuk_private.fabric_visual_knowledge_read_cache TO service_role;
CREATE OR REPLACE FUNCTION curtainsuk_private.search_retail_fabrics(p_filters jsonb, p_page integer, p_size integer, p_guide_min integer, p_guide_max integer)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  with knowledge as materialized (select fabric_id,visual_fields from curtainsuk_private.fabric_visual_knowledge_read_cache where knowledge_state in ('COMPLETE','PARTIAL_GOVERNED')), approved_guides as materialized (
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
    left join knowledge k on k.fabric_id=c.fabric_id
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
      (coalesce(p_filters->>'query','')='' or upper(supplier_sku)=upper(left(p_filters->>'query',100)) or to_tsvector('simple',concat_ws(' ',brand,design,collection,colour_name)) @@ plainto_tsquery('simple',left(p_filters->>'query',100)))
      and (coalesce(p_filters->>'brand','')='' or brand=p_filters->>'brand')
      and (coalesce(p_filters->>'collection','')='' or collection=p_filters->>'collection')
      and (coalesce(p_filters->>'colour','')='' or case when p_filters->>'knowledge'='1' then (knowledge_fields->'primaryColour'->>'value'=p_filters->>'colour' or coalesce(knowledge_fields->'secondaryColours'->'value','[]'::jsonb) ? (p_filters->>'colour')) else p_filters->>'colour'=any(colour_families) end)
      and (coalesce(p_filters->>'pattern','')='' or case when p_filters->>'knowledge'='1' then (knowledge_fields->'patternClass'->>'value'=p_filters->>'pattern' or coalesce(knowledge_fields->'motif'->'value','[]'::jsonb) ? (p_filters->>'pattern')) else p_filters->>'pattern'=any(patterns) end)
      and (coalesce(p_filters->>'character','')='' or case when p_filters->>'knowledge'='1' then (coalesce(knowledge_fields->'character'->'value','[]'::jsonb) ? (p_filters->>'character')) else p_filters->>'character'=any(characters) end)
      and (coalesce(p_filters->>'activity','')='' or knowledge_fields->'visualActivity'->>'value'=p_filters->>'activity')
      and (coalesce(p_filters->>'texture','')='' or coalesce(knowledge_fields->'visualSurface'->'value','[]'::jsonb) ? (p_filters->>'texture'))
      and (coalesce(p_filters->>'presence','')='' or knowledge_fields->'visualWeight'->>'value'=p_filters->>'presence')
      and (coalesce(p_filters->>'style','')='' or p_filters->>'style'=any(styles))
      and (coalesce(p_filters->>'window','')='' or p_filters->>'window'=any(window_types))
      and (coalesce(p_filters->>'sample','')='' or (p_filters->>'sample'='AVAILABLE' and sample_current) or (p_filters->>'sample'='UNAVAILABLE' and not sample_current))
      and (coalesce(p_filters->>'availability','')='' or (p_filters->>'availability' in ('CURRENT','AVAILABLE') and stock_current) or (p_filters->>'availability' in ('CONFIRM','CHECK_AVAILABILITY') and not stock_known) or (p_filters->>'availability'='OUT_OF_STOCK' and stock_known and not stock_current))
  ), knowledge_options as (
    select distinct e.fabric_id, f.dimension, v.value
    from eligible e cross join lateral (values
      ('colour',e.knowledge_fields->'primaryColour'->'value'),
      ('colour',e.knowledge_fields->'secondaryColours'->'value'),
      ('pattern',e.knowledge_fields->'patternClass'->'value'),
      ('pattern',e.knowledge_fields->'motif'->'value'),
      ('activity',e.knowledge_fields->'visualActivity'->'value'),
      ('texture',e.knowledge_fields->'visualSurface'->'value'),
      ('character',e.knowledge_fields->'character'->'value'),
      ('presence',e.knowledge_fields->'visualWeight'->'value')
    ) f(dimension, val)
    cross join lateral jsonb_array_elements_text(case jsonb_typeof(f.val)
      when 'array' then f.val when 'string' then jsonb_build_array(f.val) else '[]'::jsonb end) v(value)
    where lower(v.value) not in ('unknown','null','') and length(v.value)<=100
  ), option_counts as materialized (
    select dimension,value,count(*) as count,min(fabric_id) example_id from knowledge_options group by dimension,value
  ), page as (
    select fabric_id,guide_minor,brand,design,colour_name from matched order by brand,design,colour_name,fabric_id
    limit greatest(1,least(p_size,48)) offset ((greatest(1,least(p_page,10000))-1)*greatest(1,least(p_size,48)))
  ) select jsonb_build_object('ids',coalesce((select jsonb_agg(fabric_id order by brand,design,colour_name,fabric_id) from page),'[]'::jsonb),
    'guidePrices',coalesce((select jsonb_object_agg(fabric_id,guide_minor) from page where guide_minor>0),'{}'::jsonb),
    'total',(select count(*) from matched),
    'knowledgeOptions',case when p_filters->>'knowledge'='1' then coalesce((select jsonb_agg(jsonb_build_object(
      'key',o.dimension,'value',o.value,'count',o.count,'fabricId',o.example_id,
      'image',(select a.shopify_cdn_url from curtainsuk_private.fabric_media_mappings m
        join curtainsuk_private.fabric_media_assets a using(content_hash)
        join curtainsuk_private.fabric_colourways c on c.fabric_id=m.fabric_id and c.supplier_id=m.supplier_id and c.supplier_sku=m.supplier_sku
        where m.fabric_id=o.example_id and m.rights_state='APPROVED' and m.mapping_state='VERIFIED'
        order by (m.image_type='MAIN') desc,m.content_hash limit 1)
    ) order by o.dimension,o.value) from option_counts o),'[]'::jsonb) else '[]'::jsonb end,
    'brands',(select coalesce(jsonb_agg(brand order by brand),'[]'::jsonb) from (select distinct brand from eligible) b),
    'collections',(select coalesce(jsonb_agg(collection order by collection),'[]'::jsonb) from (select distinct collection from eligible) co));
$function$
;
CREATE OR REPLACE FUNCTION curtainsuk_private.fabric_visual_knowledge_payload()
RETURNS jsonb LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('fabric_id',fabric_id,'knowledge_state',knowledge_state,'visual_fields',visual_fields) ORDER BY fabric_id),'[]'::jsonb)
 FROM curtainsuk_private.fabric_visual_knowledge_read_cache WHERE knowledge_state IN ('COMPLETE','PARTIAL_GOVERNED');
$$;
