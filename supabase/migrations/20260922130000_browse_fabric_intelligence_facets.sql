-- Governed Browse facets. Reads the existing customer-safe Fabric Knowledge cache only.
-- No Fabric Master, commercial, stock, pricing, eligibility or knowledge records are changed.
CREATE OR REPLACE FUNCTION curtainsuk_private.search_retail_fabrics(p_filters jsonb, p_page integer, p_size integer, p_guide_min integer, p_guide_max integer)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  with filter_values as (
    select
      case jsonb_typeof(coalesce(p_filters->'colour','null'::jsonb)) when 'array' then p_filters->'colour' when 'string' then jsonb_build_array(p_filters->'colour') else '[]'::jsonb end as colour,
      case jsonb_typeof(coalesce(p_filters->'pattern','null'::jsonb)) when 'array' then p_filters->'pattern' when 'string' then jsonb_build_array(p_filters->'pattern') else '[]'::jsonb end as pattern,
      case jsonb_typeof(coalesce(p_filters->'activity','null'::jsonb)) when 'array' then p_filters->'activity' when 'string' then jsonb_build_array(p_filters->'activity') else '[]'::jsonb end as activity,
      case jsonb_typeof(coalesce(p_filters->'texture','null'::jsonb)) when 'array' then p_filters->'texture' when 'string' then jsonb_build_array(p_filters->'texture') else '[]'::jsonb end as texture,
      case jsonb_typeof(coalesce(p_filters->'finish','null'::jsonb)) when 'array' then p_filters->'finish' when 'string' then jsonb_build_array(p_filters->'finish') else '[]'::jsonb end as finish,
      case jsonb_typeof(coalesce(p_filters->'character','null'::jsonb)) when 'array' then p_filters->'character' when 'string' then jsonb_build_array(p_filters->'character') else '[]'::jsonb end as character,
      case jsonb_typeof(coalesce(p_filters->'presence','null'::jsonb)) when 'array' then p_filters->'presence' when 'string' then jsonb_build_array(p_filters->'presence') else '[]'::jsonb end as presence
  ), approved_guides as materialized (
    select distinct on (s.supplier_id,s.supplier_sku)
      s.supplier_id,s.supplier_sku,
      (round((case when s.supplier_id='prestigious-textiles' then p.standard_trade_price else p.cut_trade_price end)*100)*3)::bigint guide_minor
    from curtainsuk_private.supplier_snapshots s
    join curtainsuk_private.supplier_snapshot_prices p using(snapshot_id)
    where s.validation_status='VALIDATED' and s.checked_at<=now() and p.currency='GBP'
      and (case when s.supplier_id='prestigious-textiles' then p.standard_trade_price else p.cut_trade_price end)>0
      and (select e.promotion_state from curtainsuk_private.supplier_promotion_events e where e.snapshot_id=s.snapshot_id order by e.created_at desc limit 1)='APPROVED_FOR_PROJECTION'
    order by s.supplier_id,s.supplier_sku,s.checked_at desc,s.snapshot_id desc
  ), eligible as (
    select c.fabric_id,c.supplier_sku,g.guide_minor,c.colour_name,c.sample_available,c.storefront_selectable,c.lifecycle_state,
      b.display_name brand,d.display_name design,co.display_name collection,
      r.window_types,
      lower(coalesce(vk.visual_fields->'primaryColour'->>'value','')) as primary_colour,
      case when jsonb_typeof(vk.visual_fields->'secondaryColours'->'value')='array' then vk.visual_fields->'secondaryColours'->'value' else '[]'::jsonb end as secondary_colours,
      lower(coalesce(vk.visual_fields->'patternClass'->>'value','')) as pattern_class,
      case when jsonb_typeof(vk.visual_fields->'motif'->'value')='array' then vk.visual_fields->'motif'->'value' else '[]'::jsonb end as motif,
      lower(coalesce(vk.visual_fields->'visualActivity'->>'value','')) as visual_activity,
      case when jsonb_typeof(vk.visual_fields->'visualSurface'->'value')='array' then vk.visual_fields->'visualSurface'->'value' else '[]'::jsonb end as visual_surface,
      lower(coalesce(vk.visual_fields->'sheenAppearance'->>'value','')) as sheen_appearance,
      case when jsonb_typeof(vk.visual_fields->'character'->'value')='array' then vk.visual_fields->'character'->'value' else '[]'::jsonb end as visual_character,
      lower(coalesce(vk.visual_fields->'visualWeight'->>'value','')) as visual_weight,
      coalesce(stock.checked_at<=now() and stock.lifecycle_state<>'DISCONTINUED' and stock.aggregate_metres-coalesce((select sum(u.metres) from curtainsuk_private.daily_stock_usage u where u.supplier_id=c.supplier_id and u.supplier_sku=c.supplier_sku and u.confirmed_at>=stock.checked_at),0)>=30,false) stock_current,
      coalesce(stock.checked_at<=now() and stock.lifecycle_state<>'DISCONTINUED' and stock.aggregate_metres-coalesce((select sum(u.metres) from curtainsuk_private.daily_stock_usage u where u.supplier_id=c.supplier_id and u.supplier_sku=c.supplier_sku and u.confirmed_at>=stock.checked_at),0)>0,false) sample_current,
      coalesce(stock.checked_at<=now(),false) stock_known
    from curtainsuk_private.fabric_colourways c
    left join approved_guides g on g.supplier_id=c.supplier_id and g.supplier_sku=c.supplier_sku
    join curtainsuk_private.supplier_brands b on b.brand_id=c.brand_id
    join curtainsuk_private.fabric_designs d on d.design_id=c.design_id
    join curtainsuk_private.fabric_collections co on co.collection_id=d.collection_id
    left join curtainsuk_private.fabric_retail_profiles r on r.fabric_id=c.fabric_id
    left join curtainsuk_private.fabric_visual_knowledge_read_cache vk on vk.fabric_id=c.fabric_id and vk.knowledge_state in ('COMPLETE','PARTIAL_GOVERNED')
    left join lateral (select * from curtainsuk_private.daily_stock_snapshots st where st.supplier_id=c.supplier_id and st.supplier_sku=c.supplier_sku order by st.snapshot_date desc limit 1) stock on stock.checked_at>=now()-curtainsuk_private.stock_validity_window()
    where c.staging_catalog_visible and c.lifecycle_state <> 'DISCONTINUED'
      and length(trim(c.supplier_sku)) > 0 and length(trim(c.colour_name)) > 0
      and length(trim(b.display_name)) > 0 and length(trim(d.display_name)) > 0
      and exists (select 1 from curtainsuk_private.fabric_media_mappings m join curtainsuk_private.fabric_media_assets a using(content_hash) where m.fabric_id=c.fabric_id and m.supplier_id=c.supplier_id and m.supplier_sku=c.supplier_sku and m.rights_state='APPROVED' and m.mapping_state='VERIFIED' and a.width > 0 and a.height > 0 and a.shopify_cdn_url ~ '^https://cdn[.]shopify[.]com/[^?#]+$')
  ), matched as (
    select e.* from eligible e cross join filter_values f where
      (p_guide_min is null or e.guide_minor>=p_guide_min) and (p_guide_max is null or e.guide_minor<p_guide_max)
      and (coalesce(p_filters->>'query','')='' or upper(e.supplier_sku)=upper(left(p_filters->>'query',100)) or to_tsvector('simple',concat_ws(' ',e.brand,e.design,e.collection,e.colour_name)) @@ plainto_tsquery('simple',left(p_filters->>'query',100)))
      and (coalesce(p_filters->>'brand','')='' or e.brand=p_filters->>'brand') and (coalesce(p_filters->>'collection','')='' or e.collection=p_filters->>'collection')
      and (coalesce(p_filters->>'window','')='' or p_filters->>'window'=any(e.window_types))
      and (coalesce(p_filters->>'sample','')='' or (p_filters->>'sample'='AVAILABLE' and e.sample_current) or (p_filters->>'sample'='UNAVAILABLE' and not e.sample_current))
      and (coalesce(p_filters->>'availability','')='' or (p_filters->>'availability' in ('CURRENT','AVAILABLE') and e.stock_current) or (p_filters->>'availability' in ('CONFIRM','CHECK_AVAILABILITY') and not e.stock_known) or (p_filters->>'availability'='OUT_OF_STOCK' and e.stock_known and not e.stock_current))
      and (jsonb_array_length(f.colour)=0 or exists (select 1 from jsonb_array_elements_text(f.colour) v where v=e.primary_colour or e.secondary_colours ? v))
      and (jsonb_array_length(f.pattern)=0 or exists (select 1 from jsonb_array_elements_text(f.pattern) v where v=e.pattern_class or e.motif ? v))
      and (jsonb_array_length(f.activity)=0 or exists (select 1 from jsonb_array_elements_text(f.activity) v where v=e.visual_activity))
      and (jsonb_array_length(f.texture)=0 or exists (select 1 from jsonb_array_elements_text(f.texture) v where e.visual_surface ? v))
      and (jsonb_array_length(f.finish)=0 or exists (select 1 from jsonb_array_elements_text(f.finish) v where v=e.sheen_appearance))
      and (jsonb_array_length(f.character)=0 or exists (select 1 from jsonb_array_elements_text(f.character) v where e.visual_character ? v))
      and (jsonb_array_length(f.presence)=0 or exists (select 1 from jsonb_array_elements_text(f.presence) v where v=e.visual_weight))
  ), page as (
    select fabric_id,guide_minor,brand,design,colour_name from matched order by brand,design,colour_name,fabric_id limit greatest(1,least(p_size,48)) offset ((greatest(1,least(p_page,10000))-1)*greatest(1,least(p_size,48)))
  ), knowledge_values as (
    select distinct e.fabric_id, x.key, lower(x.value) value from eligible e cross join lateral (
      select 'colour'::text key, value from jsonb_array_elements_text((case when e.primary_colour<>'' then jsonb_build_array(e.primary_colour) else '[]'::jsonb end) || e.secondary_colours)
      union all select 'pattern', value from jsonb_array_elements_text((case when e.pattern_class<>'' then jsonb_build_array(e.pattern_class) else '[]'::jsonb end) || e.motif)
      union all select 'activity', e.visual_activity where e.visual_activity<>''
      union all select 'texture', value from jsonb_array_elements_text(e.visual_surface)
      union all select 'finish', e.sheen_appearance where e.sheen_appearance<>''
      union all select 'character', value from jsonb_array_elements_text(e.visual_character)
      union all select 'presence', e.visual_weight where e.visual_weight<>''
    ) x where x.value<>'' and lower(x.value)<>'unknown'
  ), knowledge_options as (
    select key, jsonb_agg(jsonb_build_object('value',value,'label',value,'count',count) order by value) options from (select key,value,count(*) count from knowledge_values group by key,value) grouped group by key
  )
  select jsonb_build_object(
    'ids',coalesce((select jsonb_agg(fabric_id order by brand,design,colour_name,fabric_id) from page),'[]'::jsonb),
    'guidePrices',coalesce((select jsonb_object_agg(fabric_id,guide_minor) from page where guide_minor>0),'{}'::jsonb),
    'total',(select count(*) from matched),
    'brands',(select coalesce(jsonb_agg(brand order by brand),'[]'::jsonb) from (select distinct brand from eligible) b),
    'collections',(select coalesce(jsonb_agg(collection order by collection),'[]'::jsonb) from (select distinct collection from eligible) co),
    'knowledgeOptions',coalesce((select jsonb_object_agg(key,options) from knowledge_options),'{}'::jsonb)
  );
$function$
revoke all on function curtainsuk_private.search_retail_fabrics(jsonb,integer,integer,integer,integer) from public,anon,authenticated
grant execute on function curtainsuk_private.search_retail_fabrics(jsonb,integer,integer,integer,integer) to service_role
comment on function curtainsuk_private.search_retail_fabrics(jsonb,integer,integer,integer,integer) is 'Browse-only governed Fabric Knowledge facets. Reads approved cache values only; no price, stock, eligibility or source data is exposed.'
notify pgrst,'reload schema'