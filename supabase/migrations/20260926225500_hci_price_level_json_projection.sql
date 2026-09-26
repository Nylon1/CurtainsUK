-- Return the unchanged governed price-tier identity set as one JSON value so
-- PostgREST's row limit cannot truncate it and paging cannot repeatedly execute
-- the same supplier-price projection within one customer command.
CREATE OR REPLACE FUNCTION curtainsuk_private.retail_guide_price_level_fabric_ids_json(
  p_guide_min integer,
  p_guide_max integer
)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path TO ''
AS $function$
  SELECT coalesce(jsonb_agg(c.fabric_id::text ORDER BY c.fabric_id), '[]'::jsonb)
  FROM curtainsuk_private.fabric_colourways c
  JOIN curtainsuk_private.current_retail_guide_prices() g
    ON g.supplier_id = c.supplier_id::text
   AND g.supplier_sku = c.supplier_sku::text
  WHERE c.staging_catalog_visible
    AND c.lifecycle_state <> 'DISCONTINUED'
    AND g.guide_minor >= p_guide_min
    AND (p_guide_max IS NULL OR g.guide_minor < p_guide_max)
$function$;

REVOKE ALL ON FUNCTION curtainsuk_private.retail_guide_price_level_fabric_ids_json(integer, integer)
  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION curtainsuk_private.retail_guide_price_level_fabric_ids_json(integer, integer)
  TO service_role;

NOTIFY pgrst, 'reload schema';
