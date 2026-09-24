-- High-coverage governed Browse facet projection. It deliberately excludes colour
-- until the private knowledge cache has useful catalogue-wide colour coverage.
-- This complete replacement is safe whether the earlier clean projection is present or not.
CREATE OR REPLACE FUNCTION curtainsuk_private.search_retail_fabrics(
  p_filters jsonb, p_page integer, p_size integer, p_guide_min integer, p_guide_max integer
) RETURNS jsonb
LANGUAGE sql STABLE SET search_path TO '' AS $function$
WITH filter_values AS (
  SELECT
    CASE jsonb_typeof(coalesce(p_filters->'pattern','null'::jsonb)) WHEN 'array' THEN p_filters->'pattern' WHEN 'string' THEN jsonb_build_array(p_filters->'pattern') ELSE '[]'::jsonb END AS pattern,
    CASE jsonb_typeof(coalesce(p_filters->'texture','null'::jsonb)) WHEN 'array' THEN p_filters->'texture' WHEN 'string' THEN jsonb_build_array(p_filters->'texture') ELSE '[]'::jsonb END AS texture,
    CASE jsonb_typeof(coalesce(p_filters->'finish','null'::jsonb)) WHEN 'array' THEN p_filters->'finish' WHEN 'string' THEN jsonb_build_array(p_filters->'finish') ELSE '[]'::jsonb END AS finish,
    CASE jsonb_typeof(coalesce(p_filters->'character','null'::jsonb)) WHEN 'array' THEN p_filters->'character' WHEN 'string' THEN jsonb_build_array(p_filters->'character') ELSE '[]'::jsonb END AS character
), approved_guides AS MATERIALIZED (
  SELECT * FROM curtainsuk_private.current_retail_guide_prices()
), eligible AS (
  SELECT c.fabric_id,c.supplier_id,c.supplier_sku,g.guide_minor,c.colour_name,
    b.display_name brand,d.display_name design,co.display_name collection,r.window_types,
    lower(coalesce(vk.visual_fields->'patternClass'->>'value','')) AS pattern_class,
    CASE WHEN jsonb_typeof(vk.visual_fields->'motif'->'value')='array' THEN
      coalesce((SELECT jsonb_agg(lower(x.value)) FROM jsonb_array_elements_text(vk.visual_fields->'motif'->'value') x(value)),'[]'::jsonb) ELSE '[]'::jsonb END AS motif,
    CASE WHEN jsonb_typeof(vk.visual_fields->'visualSurface'->'value')='array' THEN
      coalesce((SELECT jsonb_agg(lower(x.value)) FROM jsonb_array_elements_text(vk.visual_fields->'visualSurface'->'value') x(value)),'[]'::jsonb) ELSE '[]'::jsonb END AS visual_surface,
    lower(coalesce(vk.visual_fields->'sheenAppearance'->>'value','')) AS sheen_appearance,
    CASE WHEN jsonb_typeof(vk.visual_fields->'character'->'value')='array' THEN
      coalesce((SELECT jsonb_agg(lower(x.value)) FROM jsonb_array_elements_text(vk.visual_fields->'character'->'value') x(value)),'[]'::jsonb) ELSE '[]'::jsonb END AS visual_character,
    coalesce(stock.checked_at<=now() AND stock.lifecycle_state<>'DISCONTINUED' AND stock.aggregate_metres-coalesce((SELECT sum(u.metres) FROM curtainsuk_private.daily_stock_usage u WHERE u.supplier_id=c.supplier_id AND u.supplier_sku=c.supplier_sku AND u.confirmed_at>=stock.checked_at),0)>=30,false) AS stock_current,
    coalesce(stock.checked_at<=now() AND stock.lifecycle_state<>'DISCONTINUED' AND stock.aggregate_metres-coalesce((SELECT sum(u.metres) FROM curtainsuk_private.daily_stock_usage u WHERE u.supplier_id=c.supplier_id AND u.supplier_sku=c.supplier_sku AND u.confirmed_at>=stock.checked_at),0)>0,false) AS sample_current,
    coalesce(stock.checked_at<=now(),false) AS stock_known
  FROM curtainsuk_private.fabric_colourways c
  LEFT JOIN approved_guides g ON g.supplier_id=c.supplier_id::text AND g.supplier_sku=c.supplier_sku::text
  JOIN curtainsuk_private.supplier_brands b ON b.brand_id=c.brand_id
  JOIN curtainsuk_private.fabric_designs d ON d.design_id=c.design_id
  JOIN curtainsuk_private.fabric_collections co ON co.collection_id=d.collection_id
  LEFT JOIN curtainsuk_private.fabric_retail_profiles r ON r.fabric_id=c.fabric_id
  LEFT JOIN curtainsuk_private.fabric_visual_knowledge_read_cache vk ON vk.fabric_id=c.fabric_id AND vk.knowledge_state IN ('COMPLETE','PARTIAL_GOVERNED')
  LEFT JOIN LATERAL (SELECT * FROM curtainsuk_private.daily_stock_snapshots st WHERE st.supplier_id=c.supplier_id AND st.supplier_sku=c.supplier_sku ORDER BY st.snapshot_date DESC LIMIT 1) stock ON stock.checked_at>=now()-curtainsuk_private.stock_validity_window()
  WHERE c.staging_catalog_visible AND c.lifecycle_state <> 'DISCONTINUED'
    AND length(trim(c.supplier_sku))>0 AND length(trim(c.colour_name))>0 AND length(trim(b.display_name))>0 AND length(trim(d.display_name))>0
    AND EXISTS (SELECT 1 FROM curtainsuk_private.fabric_media_mappings m JOIN curtainsuk_private.fabric_media_assets a USING(content_hash) WHERE m.fabric_id=c.fabric_id AND m.supplier_id=c.supplier_id AND m.supplier_sku=c.supplier_sku AND m.rights_state='APPROVED' AND m.mapping_state='VERIFIED' AND a.width>0 AND a.height>0 AND a.shopify_cdn_url ~ '^https://cdn[.]shopify[.]com/[^?#]+$')
), matched AS (
  SELECT e.* FROM eligible e CROSS JOIN filter_values f WHERE
    (p_guide_min IS NULL OR e.guide_minor>=p_guide_min) AND (p_guide_max IS NULL OR e.guide_minor<p_guide_max)
    AND (coalesce(p_filters->>'query','')='' OR upper(e.supplier_sku)=upper(left(p_filters->>'query',100)) OR to_tsvector('simple',concat_ws(' ',e.brand,e.design,e.collection,e.colour_name)) @@ plainto_tsquery('simple',left(p_filters->>'query',100)))
    AND (coalesce(p_filters->>'brand','')='' OR e.brand=p_filters->>'brand') AND (coalesce(p_filters->>'collection','')='' OR e.collection=p_filters->>'collection')
    AND (coalesce(p_filters->>'window','')='' OR p_filters->>'window'=ANY(e.window_types))
    AND (coalesce(p_filters->>'sample','')='' OR (p_filters->>'sample'='AVAILABLE' AND e.sample_current) OR (p_filters->>'sample'='UNAVAILABLE' AND NOT e.sample_current))
    AND (coalesce(p_filters->>'availability','')='' OR (p_filters->>'availability' IN ('CURRENT','AVAILABLE') AND e.stock_current) OR (p_filters->>'availability' IN ('CONFIRM','CHECK_AVAILABILITY') AND NOT e.stock_known) OR (p_filters->>'availability'='OUT_OF_STOCK' AND e.stock_known AND NOT e.stock_current))
    AND (jsonb_array_length(f.pattern)=0 OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(f.pattern) v WHERE v=e.pattern_class OR e.motif ? v))
    AND (jsonb_array_length(f.texture)=0 OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(f.texture) v WHERE e.visual_surface ? v))
    AND (jsonb_array_length(f.finish)=0 OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(f.finish) v WHERE v=e.sheen_appearance))
    AND (jsonb_array_length(f.character)=0 OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(f.character) v WHERE e.visual_character ? v))
), page AS (
  SELECT fabric_id,guide_minor,brand,design,colour_name FROM matched ORDER BY brand,design,colour_name,fabric_id LIMIT greatest(1,least(p_size,48)) OFFSET ((greatest(1,least(p_page,10000))-1)*greatest(1,least(p_size,48)))
), knowledge_values AS (
  SELECT DISTINCT e.fabric_id,x.key,lower(x.value) value FROM eligible e CROSS JOIN LATERAL (
SELECT 'pattern',value FROM jsonb_array_elements_text((CASE WHEN e.pattern_class<>'' THEN jsonb_build_array(e.pattern_class) ELSE '[]'::jsonb END)||e.motif)
    UNION ALL SELECT 'texture',value FROM jsonb_array_elements_text(e.visual_surface)
    UNION ALL SELECT 'finish',e.sheen_appearance WHERE e.sheen_appearance<>''
    UNION ALL SELECT 'character',value FROM jsonb_array_elements_text(e.visual_character)
  ) x WHERE x.value<>'' AND lower(x.value)<>'unknown'
), knowledge_coverage AS (
  SELECT key,count(DISTINCT fabric_id)::integer coverage FROM knowledge_values GROUP BY key
), knowledge_options AS (
  SELECT key,jsonb_agg(jsonb_build_object('value',value,'label',value,'count',count) ORDER BY value) options FROM (
    SELECT key,value,count(*)::integer count FROM knowledge_values GROUP BY key,value HAVING count(*)>=12
  ) grouped GROUP BY key
)
SELECT jsonb_build_object(
  'ids',coalesce((SELECT jsonb_agg(fabric_id ORDER BY brand,design,colour_name,fabric_id) FROM page),'[]'::jsonb),
  'guidePrices',coalesce((SELECT jsonb_object_agg(fabric_id,guide_minor) FROM page WHERE guide_minor>0),'{}'::jsonb),
  'total',(SELECT count(*) FROM matched),
  'brands',(SELECT coalesce(jsonb_agg(brand ORDER BY brand),'[]'::jsonb) FROM (SELECT DISTINCT brand FROM eligible) b),
  'collections',(SELECT coalesce(jsonb_agg(collection ORDER BY collection),'[]'::jsonb) FROM (SELECT DISTINCT collection FROM eligible) co),
  'knowledgeOptions',coalesce((SELECT jsonb_object_agg(o.key,o.options) FROM knowledge_options o JOIN knowledge_coverage c USING(key) WHERE c.coverage>=100),'{}'::jsonb)
);
$function$;

REVOKE ALL ON FUNCTION curtainsuk_private.search_retail_fabrics(jsonb,integer,integer,integer,integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION curtainsuk_private.search_retail_fabrics(jsonb,integer,integer,integer,integer) TO service_role;
COMMENT ON FUNCTION curtainsuk_private.search_retail_fabrics(jsonb,integer,integer,integer,integer) IS 'High-coverage Browse facets from current Fabric Master, guide-price helper, approved media, stock projection, and private Fabric Knowledge cache; colour remains absent until governed coverage is useful.';
NOTIFY pgrst, 'reload schema';