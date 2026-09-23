-- One private, customer-guide-only projection. It mirrors the already approved
-- PT Standard / SDG Cut policy; it never exposes supplier prices to the browser.
CREATE OR REPLACE FUNCTION curtainsuk_private.current_retail_guide_prices()
RETURNS TABLE(supplier_id text, supplier_sku text, guide_minor bigint)
LANGUAGE sql STABLE SET search_path TO '' AS $function$
  SELECT DISTINCT ON (s.supplier_id, s.supplier_sku)
    s.supplier_id::text, s.supplier_sku::text,
    (round((CASE WHEN s.supplier_id='prestigious-textiles' THEN p.standard_trade_price ELSE p.cut_trade_price END)*100)*3)::bigint
  FROM curtainsuk_private.supplier_snapshots s
  JOIN curtainsuk_private.supplier_snapshot_prices p USING(snapshot_id)
  WHERE s.validation_status='VALIDATED' AND s.checked_at<=now() AND p.currency='GBP'
    AND (CASE WHEN s.supplier_id='prestigious-textiles' THEN p.standard_trade_price ELSE p.cut_trade_price END)>0
    AND (SELECT e.promotion_state FROM curtainsuk_private.supplier_promotion_events e
      WHERE e.snapshot_id=s.snapshot_id ORDER BY e.created_at DESC, e.event_id DESC LIMIT 1)='APPROVED_FOR_PROJECTION'
  ORDER BY s.supplier_id, s.supplier_sku, s.checked_at DESC, s.snapshot_id DESC
$function$;

REVOKE ALL ON FUNCTION curtainsuk_private.current_retail_guide_prices() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION curtainsuk_private.current_retail_guide_prices() TO service_role;

CREATE OR REPLACE FUNCTION curtainsuk_private.retail_guide_price_level_fabric_ids(p_guide_min integer, p_guide_max integer)
RETURNS TABLE(fabric_id text)
LANGUAGE sql STABLE SET search_path TO '' AS $function$
  SELECT c.fabric_id::text
  FROM curtainsuk_private.fabric_colourways c
  JOIN curtainsuk_private.current_retail_guide_prices() g
    ON g.supplier_id=c.supplier_id::text AND g.supplier_sku=c.supplier_sku::text
  WHERE c.staging_catalog_visible AND c.lifecycle_state <> 'DISCONTINUED'
    AND g.guide_minor >= p_guide_min
    AND (p_guide_max IS NULL OR g.guide_minor < p_guide_max)
  ORDER BY c.fabric_id
$function$;

REVOKE ALL ON FUNCTION curtainsuk_private.retail_guide_price_level_fabric_ids(integer,integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION curtainsuk_private.retail_guide_price_level_fabric_ids(integer,integer) TO service_role;

-- Reconcile the existing bulk Browse guide projection with the same helper.
CREATE OR REPLACE FUNCTION curtainsuk_private.search_retail_fabrics(p_filters jsonb, p_page integer, p_size integer, p_guide_min integer, p_guide_max integer)
 RETURNS jsonb LANGUAGE sql STABLE SET search_path TO '' AS $function$
  WITH approved_guides AS MATERIALIZED (SELECT * FROM curtainsuk_private.current_retail_guide_prices()), eligible AS (
    SELECT c.fabric_id,c.supplier_sku,g.guide_minor,c.colour_name,c.sample_available,c.storefront_selectable,c.lifecycle_state,
      b.display_name brand,d.display_name design,co.display_name collection,
      r.colour_families,r.patterns,r.characters,r.styles,r.window_types,
      coalesce(stock.checked_at<=now() AND stock.lifecycle_state<>'DISCONTINUED'
        AND stock.aggregate_metres-coalesce((SELECT sum(u.metres) FROM curtainsuk_private.daily_stock_usage u WHERE u.supplier_id=c.supplier_id AND u.supplier_sku=c.supplier_sku AND u.confirmed_at>=stock.checked_at),0)>=30,false) stock_current,
      coalesce(stock.checked_at<=now() AND stock.lifecycle_state<>'DISCONTINUED'
        AND stock.aggregate_metres-coalesce((SELECT sum(u.metres) FROM curtainsuk_private.daily_stock_usage u WHERE u.supplier_id=c.supplier_id AND u.supplier_sku=c.supplier_sku AND u.confirmed_at>=stock.checked_at),0)>0,false) sample_current,
      coalesce(stock.checked_at<=now(),false) stock_known
    FROM curtainsuk_private.fabric_colourways c
    LEFT JOIN approved_guides g ON g.supplier_id=c.supplier_id::text AND g.supplier_sku=c.supplier_sku::text
    JOIN curtainsuk_private.supplier_brands b ON b.brand_id=c.brand_id
    JOIN curtainsuk_private.fabric_designs d ON d.design_id=c.design_id
    JOIN curtainsuk_private.fabric_collections co ON co.collection_id=d.collection_id
    LEFT JOIN curtainsuk_private.fabric_retail_profiles r ON r.fabric_id=c.fabric_id
    LEFT JOIN LATERAL (SELECT * FROM curtainsuk_private.daily_stock_snapshots st WHERE st.supplier_id=c.supplier_id AND st.supplier_sku=c.supplier_sku ORDER BY st.snapshot_date DESC LIMIT 1) stock ON stock.checked_at>=now()-curtainsuk_private.stock_validity_window()
    WHERE c.staging_catalog_visible AND c.lifecycle_state <> 'DISCONTINUED'
      AND length(trim(c.supplier_sku))>0 AND length(trim(c.colour_name))>0 AND length(trim(b.display_name))>0 AND length(trim(d.display_name))>0
      AND EXISTS (SELECT 1 FROM curtainsuk_private.fabric_media_mappings m JOIN curtainsuk_private.fabric_media_assets a USING(content_hash) WHERE m.fabric_id=c.fabric_id AND m.supplier_id=c.supplier_id AND m.supplier_sku=c.supplier_sku AND m.rights_state='APPROVED' AND m.mapping_state='VERIFIED' AND a.width>0 AND a.height>0 AND a.shopify_cdn_url ~ '^https://cdn[.]shopify[.]com/[^?#]+$')
  ), matched AS (
    SELECT * FROM eligible e WHERE (p_guide_min IS NULL OR guide_minor>=p_guide_min) AND (p_guide_max IS NULL OR guide_minor<p_guide_max)
      AND (coalesce(p_filters->>'query','')='' OR upper(supplier_sku)=upper(left(p_filters->>'query',100)) OR to_tsvector('simple',concat_ws(' ',brand,design,collection,colour_name)) @@ plainto_tsquery('simple',left(p_filters->>'query',100)))
      AND (coalesce(p_filters->>'brand','')='' OR brand=p_filters->>'brand') AND (coalesce(p_filters->>'collection','')='' OR collection=p_filters->>'collection')
      AND (coalesce(p_filters->>'colour','')='' OR p_filters->>'colour'=ANY(colour_families)) AND (coalesce(p_filters->>'pattern','')='' OR p_filters->>'pattern'=ANY(patterns))
      AND (coalesce(p_filters->>'character','')='' OR p_filters->>'character'=ANY(characters)) AND (coalesce(p_filters->>'style','')='' OR p_filters->>'style'=ANY(styles))
      AND (coalesce(p_filters->>'window','')='' OR p_filters->>'window'=ANY(window_types))
      AND (coalesce(p_filters->>'sample','')='' OR (p_filters->>'sample'='AVAILABLE' AND sample_current) OR (p_filters->>'sample'='UNAVAILABLE' AND NOT sample_current))
      AND (coalesce(p_filters->>'availability','')='' OR (p_filters->>'availability' IN ('CURRENT','AVAILABLE') AND stock_current) OR (p_filters->>'availability' IN ('CONFIRM','CHECK_AVAILABILITY') AND NOT stock_known) OR (p_filters->>'availability'='OUT_OF_STOCK' AND stock_known AND NOT stock_current))
  ), page AS (SELECT fabric_id,guide_minor,brand,design,colour_name FROM matched ORDER BY brand,design,colour_name,fabric_id LIMIT greatest(1,least(p_size,48)) OFFSET ((greatest(1,least(p_page,10000))-1)*greatest(1,least(p_size,48))))
  SELECT jsonb_build_object('ids',coalesce((SELECT jsonb_agg(fabric_id ORDER BY brand,design,colour_name,fabric_id) FROM page),'[]'::jsonb),'guidePrices',coalesce((SELECT jsonb_object_agg(fabric_id,guide_minor) FROM page WHERE guide_minor>0),'{}'::jsonb),'total',(SELECT count(*) FROM matched),'brands',(SELECT coalesce(jsonb_agg(brand ORDER BY brand),'[]'::jsonb) FROM (SELECT DISTINCT brand FROM eligible) b),'collections',(SELECT coalesce(jsonb_agg(collection ORDER BY collection),'[]'::jsonb) FROM (SELECT DISTINCT collection FROM eligible) co))
$function$;

REVOKE ALL ON FUNCTION curtainsuk_private.search_retail_fabrics(jsonb,integer,integer,integer,integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION curtainsuk_private.search_retail_fabrics(jsonb,integer,integer,integer,integer) TO service_role;
NOTIFY pgrst, 'reload schema';
