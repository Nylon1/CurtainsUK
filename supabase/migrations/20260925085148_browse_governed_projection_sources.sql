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
