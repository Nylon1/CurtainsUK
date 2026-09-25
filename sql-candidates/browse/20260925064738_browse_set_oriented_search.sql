-- UNRELEASED SQL CANDIDATE. Do not put this file into migrations or deploy it.
-- Stage 1: set-oriented Browse-only projections of the existing approved
-- supplier guide and eligibility rules. Neither is an authority for Sample/MTM.
CREATE VIEW curtainsuk_private.browse_current_guide_prices_set_v1
WITH (security_invoker = true)
AS
WITH latest_promotion AS MATERIALIZED (
  SELECT DISTINCT ON (snapshot_id) snapshot_id, promotion_state
  FROM curtainsuk_private.supplier_promotion_events
  ORDER BY snapshot_id, created_at DESC, event_id DESC
)
SELECT DISTINCT ON (s.supplier_id, s.supplier_sku)
  s.supplier_id::text AS supplier_id,
  s.supplier_sku::text AS supplier_sku,
  (round((CASE WHEN s.supplier_id = 'prestigious-textiles'
    THEN p.standard_trade_price ELSE p.cut_trade_price END) * 100) * 3)::bigint AS guide_minor
FROM curtainsuk_private.supplier_snapshots s
JOIN curtainsuk_private.supplier_snapshot_prices p USING (snapshot_id)
JOIN latest_promotion e
  ON e.snapshot_id = s.snapshot_id
 AND e.promotion_state = 'APPROVED_FOR_PROJECTION'
WHERE s.validation_status = 'VALIDATED'
  AND s.checked_at <= now()
  AND p.currency = 'GBP'
  AND (CASE WHEN s.supplier_id = 'prestigious-textiles'
    THEN p.standard_trade_price ELSE p.cut_trade_price END) > 0
ORDER BY s.supplier_id, s.supplier_sku, s.checked_at DESC, s.snapshot_id DESC;

REVOKE ALL ON curtainsuk_private.browse_current_guide_prices_set_v1
  FROM public, anon, authenticated;
GRANT SELECT ON curtainsuk_private.browse_current_guide_prices_set_v1 TO service_role;

-- This view is private and is not a commercial authority for Sample or MTM.
CREATE VIEW curtainsuk_private.browse_eligible_set_v1
WITH (security_invoker = true)
AS
WITH approved_guides AS MATERIALIZED (
  SELECT * FROM curtainsuk_private.browse_current_guide_prices_set_v1
), media_eligible AS MATERIALIZED (
  SELECT DISTINCT m.fabric_id, m.supplier_id, m.supplier_sku
  FROM curtainsuk_private.fabric_media_mappings m
  JOIN curtainsuk_private.fabric_media_assets a USING (content_hash)
  WHERE m.rights_state = 'APPROVED'
    AND m.mapping_state = 'VERIFIED'
    AND a.width > 0 AND a.height > 0
    AND a.shopify_cdn_url ~ '^https://cdn[.]shopify[.]com/[^?#]+$'
), latest_stock AS MATERIALIZED (
  SELECT DISTINCT ON (supplier_id, supplier_sku)
    supplier_id, supplier_sku, snapshot_date, checked_at,
    lifecycle_state, aggregate_metres
  FROM curtainsuk_private.daily_stock_snapshots
  ORDER BY supplier_id, supplier_sku, snapshot_date DESC
), stock_balance AS MATERIALIZED (
  SELECT st.supplier_id, st.supplier_sku, st.checked_at,
    st.lifecycle_state, st.aggregate_metres,
    coalesce(sum(u.metres), 0) AS used_metres
  FROM latest_stock st
  LEFT JOIN curtainsuk_private.daily_stock_usage u
    ON u.supplier_id = st.supplier_id
   AND u.supplier_sku = st.supplier_sku
   AND u.confirmed_at >= st.checked_at
  GROUP BY st.supplier_id, st.supplier_sku, st.checked_at,
    st.lifecycle_state, st.aggregate_metres
)
SELECT c.fabric_id, c.supplier_id, c.supplier_sku, g.guide_minor,
  c.colour_name, b.display_name AS brand, d.display_name AS design,
  co.display_name AS collection, r.window_types,
  curtainsuk_private.manufacturer_colour_families(c.colour_name)
    AS manufacturer_colour_families,
  lower(coalesce(vk.visual_fields->'primaryColour'->>'value', ''))
    AS visual_primary_colour,
  CASE WHEN jsonb_typeof(vk.visual_fields->'secondaryColours'->'value') = 'array'
    THEN coalesce((SELECT jsonb_agg(lower(x.value))
      FROM jsonb_array_elements_text(vk.visual_fields->'secondaryColours'->'value') x(value)), '[]'::jsonb)
    ELSE '[]'::jsonb END AS visual_secondary_colours,
  lower(coalesce(vk.visual_fields->'patternClass'->>'value', '')) AS pattern_class,
  CASE WHEN jsonb_typeof(vk.visual_fields->'motif'->'value') = 'array'
    THEN coalesce((SELECT jsonb_agg(lower(x.value))
      FROM jsonb_array_elements_text(vk.visual_fields->'motif'->'value') x(value)), '[]'::jsonb)
    ELSE '[]'::jsonb END AS motif,
  CASE WHEN jsonb_typeof(vk.visual_fields->'visualSurface'->'value') = 'array'
    THEN coalesce((SELECT jsonb_agg(lower(x.value))
      FROM jsonb_array_elements_text(vk.visual_fields->'visualSurface'->'value') x(value)), '[]'::jsonb)
    ELSE '[]'::jsonb END AS visual_surface,
  lower(coalesce(vk.visual_fields->'sheenAppearance'->>'value', '')) AS sheen_appearance,
  CASE WHEN jsonb_typeof(vk.visual_fields->'character'->'value') = 'array'
    THEN coalesce((SELECT jsonb_agg(lower(x.value))
      FROM jsonb_array_elements_text(vk.visual_fields->'character'->'value') x(value)), '[]'::jsonb)
    ELSE '[]'::jsonb END AS visual_character,
  coalesce(stock.checked_at <= now()
    AND stock.lifecycle_state <> 'DISCONTINUED'
    AND stock.aggregate_metres - stock.used_metres >= 30, false) AS stock_current,
  coalesce(stock.checked_at <= now()
    AND stock.lifecycle_state <> 'DISCONTINUED'
    AND stock.aggregate_metres - stock.used_metres > 0, false) AS sample_current,
  coalesce(stock.checked_at <= now(), false) AS stock_known
FROM curtainsuk_private.fabric_colourways c
JOIN media_eligible m
  ON m.fabric_id = c.fabric_id
 AND m.supplier_id = c.supplier_id
 AND m.supplier_sku = c.supplier_sku
LEFT JOIN approved_guides g
  ON g.supplier_id = c.supplier_id::text
 AND g.supplier_sku = c.supplier_sku::text
JOIN curtainsuk_private.supplier_brands b ON b.brand_id = c.brand_id
JOIN curtainsuk_private.fabric_designs d ON d.design_id = c.design_id
JOIN curtainsuk_private.fabric_collections co ON co.collection_id = d.collection_id
LEFT JOIN curtainsuk_private.fabric_retail_profiles r ON r.fabric_id = c.fabric_id
LEFT JOIN curtainsuk_private.fabric_visual_knowledge_read_cache vk
  ON vk.fabric_id = c.fabric_id
 AND vk.knowledge_state IN ('COMPLETE', 'PARTIAL_GOVERNED')
LEFT JOIN stock_balance stock
  ON stock.supplier_id = c.supplier_id
 AND stock.supplier_sku = c.supplier_sku
 AND stock.checked_at >= now() - curtainsuk_private.stock_validity_window()
WHERE c.staging_catalog_visible
  AND c.lifecycle_state <> 'DISCONTINUED'
  AND length(trim(c.supplier_sku)) > 0
  AND length(trim(c.colour_name)) > 0
  AND length(trim(b.display_name)) > 0
  AND length(trim(d.display_name)) > 0;

REVOKE ALL ON curtainsuk_private.browse_eligible_set_v1
  FROM public, anon, authenticated;
GRANT SELECT ON curtainsuk_private.browse_eligible_set_v1 TO service_role;

-- Shadow direct RPC, deliberately not replacing the live RPC until exact JSON
-- parity and production-scale timing are proved. This is also the safe fallback
-- when the prepared projection reports any invalidation.
CREATE FUNCTION curtainsuk_private.search_retail_fabrics_direct_v1(
  p_filters jsonb, p_page integer, p_size integer,
  p_guide_min integer, p_guide_max integer
) RETURNS jsonb LANGUAGE sql STABLE SET search_path TO ''
  SET enable_nestloop TO off AS $function$
WITH filter_values AS (
  SELECT
    CASE jsonb_typeof(coalesce(p_filters->'colour','null'::jsonb)) WHEN 'array' THEN p_filters->'colour' WHEN 'string' THEN jsonb_build_array(p_filters->'colour') ELSE '[]'::jsonb END AS colour,
    CASE jsonb_typeof(coalesce(p_filters->'pattern','null'::jsonb)) WHEN 'array' THEN p_filters->'pattern' WHEN 'string' THEN jsonb_build_array(p_filters->'pattern') ELSE '[]'::jsonb END AS pattern,
    CASE jsonb_typeof(coalesce(p_filters->'texture','null'::jsonb)) WHEN 'array' THEN p_filters->'texture' WHEN 'string' THEN jsonb_build_array(p_filters->'texture') ELSE '[]'::jsonb END AS texture,
    CASE jsonb_typeof(coalesce(p_filters->'finish','null'::jsonb)) WHEN 'array' THEN p_filters->'finish' WHEN 'string' THEN jsonb_build_array(p_filters->'finish') ELSE '[]'::jsonb END AS finish,
    CASE jsonb_typeof(coalesce(p_filters->'character','null'::jsonb)) WHEN 'array' THEN p_filters->'character' WHEN 'string' THEN jsonb_build_array(p_filters->'character') ELSE '[]'::jsonb END AS character
), eligible AS MATERIALIZED (
  SELECT * FROM curtainsuk_private.browse_eligible_set_v1
), matched AS (
  SELECT e.* FROM eligible e CROSS JOIN filter_values f WHERE
    (p_guide_min IS NULL OR e.guide_minor>=p_guide_min) AND (p_guide_max IS NULL OR e.guide_minor<p_guide_max)
    AND (coalesce(p_filters->>'query','')='' OR upper(e.supplier_sku)=upper(left(p_filters->>'query',100)) OR to_tsvector('simple',concat_ws(' ',e.brand,e.design,e.collection,e.colour_name)) @@ plainto_tsquery('simple',left(p_filters->>'query',100)))
    AND (coalesce(p_filters->>'brand','')='' OR e.brand=p_filters->>'brand') AND (coalesce(p_filters->>'collection','')='' OR e.collection=p_filters->>'collection')
    AND (coalesce(p_filters->>'window','')='' OR p_filters->>'window'=ANY(e.window_types))
    AND (coalesce(p_filters->>'sample','')='' OR (p_filters->>'sample'='AVAILABLE' AND e.sample_current) OR (p_filters->>'sample'='UNAVAILABLE' AND NOT e.sample_current))
    AND (coalesce(p_filters->>'availability','')='' OR (p_filters->>'availability' IN ('CURRENT','AVAILABLE') AND e.stock_current) OR (p_filters->>'availability' IN ('CONFIRM','CHECK_AVAILABILITY') AND NOT e.stock_known) OR (p_filters->>'availability'='OUT_OF_STOCK' AND e.stock_known AND NOT e.stock_current))
    AND (jsonb_array_length(f.colour)=0 OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(f.colour) v WHERE v=ANY(e.manufacturer_colour_families) OR v=e.visual_primary_colour OR e.visual_secondary_colours ? v))
    AND (jsonb_array_length(f.pattern)=0 OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(f.pattern) v WHERE v=e.pattern_class OR e.motif ? v))
    AND (jsonb_array_length(f.texture)=0 OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(f.texture) v WHERE e.visual_surface ? v))
    AND (jsonb_array_length(f.finish)=0 OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(f.finish) v WHERE v=e.sheen_appearance))
    AND (jsonb_array_length(f.character)=0 OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(f.character) v WHERE e.visual_character ? v))
), page AS (
  SELECT fabric_id,guide_minor,brand,design,colour_name FROM matched ORDER BY brand,design,colour_name,fabric_id LIMIT greatest(1,least(p_size,48)) OFFSET ((greatest(1,least(p_page,10000))-1)*greatest(1,least(p_size,48)))
), facet_values AS (
  SELECT DISTINCT e.fabric_id,x.key,lower(x.value) value FROM eligible e CROSS JOIN LATERAL (
    SELECT 'colour',x.value FROM unnest(e.manufacturer_colour_families) x(value)
    UNION ALL SELECT 'colour',e.visual_primary_colour WHERE e.visual_primary_colour=ANY(ARRAY['white/cream','beige/taupe','grey','black','blue','green','pink','red','orange','yellow/gold','purple','brown','neutral','multicolour'])
    UNION ALL SELECT 'colour',x.value FROM jsonb_array_elements_text(e.visual_secondary_colours) x(value) WHERE lower(x.value)=ANY(ARRAY['white/cream','beige/taupe','grey','black','blue','green','pink','red','orange','yellow/gold','purple','brown','neutral','multicolour'])
    UNION ALL SELECT 'pattern',value FROM jsonb_array_elements_text((CASE WHEN e.pattern_class<>'' THEN jsonb_build_array(e.pattern_class) ELSE '[]'::jsonb END)||e.motif)
    UNION ALL SELECT 'texture',value FROM jsonb_array_elements_text(e.visual_surface)
    UNION ALL SELECT 'finish',e.sheen_appearance WHERE e.sheen_appearance<>''
    UNION ALL SELECT 'character',value FROM jsonb_array_elements_text(e.visual_character)
  ) x(key,value) WHERE x.value<>'' AND lower(x.value)<>'unknown'
), facet_options AS (
  SELECT key,jsonb_agg(jsonb_build_object('value',value,'label',value,'count',count) ORDER BY value) options FROM (
    SELECT key,value,count(*)::integer count FROM facet_values GROUP BY key,value HAVING count(*)>=12
  ) grouped GROUP BY key
)
SELECT jsonb_build_object(
  'ids',coalesce((SELECT jsonb_agg(fabric_id ORDER BY brand,design,colour_name,fabric_id) FROM page),'[]'::jsonb),
  'guidePrices',coalesce((SELECT jsonb_object_agg(fabric_id,guide_minor) FROM page WHERE guide_minor>0),'{}'::jsonb),
  'total',(SELECT count(*) FROM matched),
  'brands',(SELECT coalesce(jsonb_agg(brand ORDER BY brand),'[]'::jsonb) FROM (SELECT DISTINCT brand FROM eligible) b),
  'collections',(SELECT coalesce(jsonb_agg(collection ORDER BY collection),'[]'::jsonb) FROM (SELECT DISTINCT collection FROM eligible) co),
  'facetOptions',coalesce((SELECT jsonb_object_agg(key,options) FROM facet_options),'{}'::jsonb)
);
$function$;
REVOKE ALL ON FUNCTION curtainsuk_private.search_retail_fabrics_direct_v1(
  jsonb,integer,integer,integer,integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION curtainsuk_private.search_retail_fabrics_direct_v1(
  jsonb,integer,integer,integer,integer) TO service_role;
