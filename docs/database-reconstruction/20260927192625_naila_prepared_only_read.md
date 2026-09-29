# Already-applied production definition: 20260927192625

> **Historical reference only. Already applied in production. Do not execute, source, feed to a migration runner, or move this file into supabase/migrations/.** This document is not a pending migration.

- Applied ledger: Supabase project hqysjumypgeapgmqkcrx, supabase_migrations.schema_migrations.
- Applied version: 20260927192625.
- Applied name: naila_prepared_only_read.
- Recorded source: statements[1] from the applied ledger, read-only capture on 2026-09-29.
- Protected source compared: Nylon1/CurtainsUK release/production at 4bcfc8bd13838372a3547af9b58e8cbe3bcd39d1.
- Object: curtainsuk_private.search_retail_fabrics_naila_v1(jsonb,integer,integer,integer,integer).
- Original recorded statement length: 6139 characters; MD5 of original recorded text: 450df8eb56faaf4f4d46ff279223d998.
- Reference text below: CRLF converted to LF only; 6030 UTF-8 bytes; SHA-256: 97e6dd6648621b1466c585b80794575dd11f6912304e4b9548a9fcf591ba17c5.
- Earlier read-only live definition evidence: pg_get_functiondef showed the recorded dollar-quoted function body after line-ending normalization; service-role EXECUTE was present. SHA-256 of the captured pg_get_* text after LF normalization: 0f96403e64afdfe89f66c31c4f53faa8440ae40fc8b21dd74e2722abc4aa54c9.

The SQL below is retained for source reconstruction and review. It has not been added to the active migration directory. The captured live-definition digest records introspection evidence; it is not a claim that PostgreSQL deparsed text is byte-identical to the recorded statement.

## Recorded applied SQL — do not run

```sql
-- Naila-only read: direct prepared projection query. No calls to either
-- search_retail_fabrics or search_retail_fabrics_prepared_v1; no refresh/writes.
-- Matching/order/facets are copied unchanged from the existing prepared SELECT,
-- with the Naila page-size cap of 24. Tests enforce SELECT parity.
CREATE FUNCTION curtainsuk_private.search_retail_fabrics_naila_v1(
  p_filters jsonb, p_page integer, p_size integer,
  p_guide_min integer, p_guide_max integer
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path TO '' AS $function$
DECLARE
  active_generation uuid;
  projection_metadata jsonb;
  next_change timestamptz;
  knowledge_dirty boolean;
BEGIN
  SELECT c.active_generation, c.metadata, c.next_time_change_at, c.knowledge_cache_dirty
    INTO active_generation, projection_metadata, next_change, knowledge_dirty
  FROM curtainsuk_private.browse_projection_control c WHERE c.singleton;
  IF active_generation IS NULL OR knowledge_dirty IS DISTINCT FROM false
    OR now() >= next_change
    OR EXISTS (SELECT 1 FROM curtainsuk_private.browse_projection_dirty LIMIT 1)
    OR NOT EXISTS (SELECT 1 FROM curtainsuk_private.browse_read_projection p WHERE p.generation_id = active_generation LIMIT 1)
  THEN
    RAISE EXCEPTION 'NAILA_PREPARED_BROWSE_UNAVAILABLE' USING ERRCODE = '55000';
  END IF;
  RETURN (
    WITH filter_values AS (
      SELECT
        CASE jsonb_typeof(coalesce(p_filters->'colour','null'::jsonb))
          WHEN 'array' THEN p_filters->'colour'
          WHEN 'string' THEN jsonb_build_array(p_filters->'colour')
          ELSE '[]'::jsonb END AS colour,
        CASE jsonb_typeof(coalesce(p_filters->'pattern','null'::jsonb))
          WHEN 'array' THEN p_filters->'pattern'
          WHEN 'string' THEN jsonb_build_array(p_filters->'pattern')
          ELSE '[]'::jsonb END AS pattern,
        CASE jsonb_typeof(coalesce(p_filters->'texture','null'::jsonb))
          WHEN 'array' THEN p_filters->'texture'
          WHEN 'string' THEN jsonb_build_array(p_filters->'texture')
          ELSE '[]'::jsonb END AS texture,
        CASE jsonb_typeof(coalesce(p_filters->'finish','null'::jsonb))
          WHEN 'array' THEN p_filters->'finish'
          WHEN 'string' THEN jsonb_build_array(p_filters->'finish')
          ELSE '[]'::jsonb END AS finish,
        CASE jsonb_typeof(coalesce(p_filters->'character','null'::jsonb))
          WHEN 'array' THEN p_filters->'character'
          WHEN 'string' THEN jsonb_build_array(p_filters->'character')
          ELSE '[]'::jsonb END AS character
    ), eligible AS (
      SELECT p.* FROM curtainsuk_private.browse_read_projection p
      WHERE p.generation_id = active_generation
    ), matched AS (
      SELECT e.* FROM eligible e CROSS JOIN filter_values f WHERE
        (p_guide_min IS NULL OR e.guide_minor >= p_guide_min)
        AND (p_guide_max IS NULL OR e.guide_minor < p_guide_max)
        AND (coalesce(p_filters->>'query','') = ''
          OR upper(e.supplier_sku) = upper(left(p_filters->>'query',100))
          OR to_tsvector('simple',concat_ws(' ',e.brand,e.design,e.collection,e.colour_name))
            @@ plainto_tsquery('simple',left(p_filters->>'query',100)))
        AND (coalesce(p_filters->>'brand','') = '' OR e.brand = p_filters->>'brand')
        AND (coalesce(p_filters->>'collection','') = '' OR e.collection = p_filters->>'collection')
        AND (coalesce(p_filters->>'window','') = '' OR p_filters->>'window' = ANY(e.window_types))
        AND (coalesce(p_filters->>'sample','') = ''
          OR (p_filters->>'sample' = 'AVAILABLE' AND e.sample_current)
          OR (p_filters->>'sample' = 'UNAVAILABLE' AND NOT e.sample_current))
        AND (coalesce(p_filters->>'availability','') = ''
          OR (p_filters->>'availability' IN ('CURRENT','AVAILABLE') AND e.stock_current)
          OR (p_filters->>'availability' IN ('CONFIRM','CHECK_AVAILABILITY') AND NOT e.stock_known)
          OR (p_filters->>'availability' = 'OUT_OF_STOCK' AND e.stock_known AND NOT e.stock_current))
        AND (jsonb_array_length(f.colour) = 0 OR EXISTS
          (SELECT 1 FROM jsonb_array_elements_text(f.colour) v
            WHERE v = ANY(e.manufacturer_colour_families)
              OR v = e.visual_primary_colour OR e.visual_secondary_colours ? v))
        AND (jsonb_array_length(f.pattern) = 0 OR EXISTS
          (SELECT 1 FROM jsonb_array_elements_text(f.pattern) v
            WHERE v = e.pattern_class OR e.motif ? v))
        AND (jsonb_array_length(f.texture) = 0 OR EXISTS
          (SELECT 1 FROM jsonb_array_elements_text(f.texture) v
            WHERE e.visual_surface ? v))
        AND (jsonb_array_length(f.finish) = 0 OR EXISTS
          (SELECT 1 FROM jsonb_array_elements_text(f.finish) v
            WHERE v = e.sheen_appearance))
        AND (jsonb_array_length(f.character) = 0 OR EXISTS
          (SELECT 1 FROM jsonb_array_elements_text(f.character) v
            WHERE e.visual_character ? v))
    ), page AS (
      SELECT fabric_id, guide_minor, brand, design, colour_name FROM matched
      ORDER BY brand, design, colour_name, fabric_id
      LIMIT greatest(1,least(p_size,24))
      OFFSET ((greatest(1,least(p_page,10000))-1)*greatest(1,least(p_size,24)))
    )
    SELECT jsonb_build_object(
      'ids', coalesce((SELECT jsonb_agg(fabric_id ORDER BY brand,design,colour_name,fabric_id)
        FROM page),'[]'::jsonb),
      'guidePrices', coalesce((SELECT jsonb_object_agg(fabric_id,guide_minor)
        FROM page WHERE guide_minor > 0),'{}'::jsonb),
      'total', (SELECT count(*) FROM matched),
      'brands', projection_metadata->'brands',
      'collections', projection_metadata->'collections',
      'facetOptions', projection_metadata->'facetOptions'
    )
  );
END;
$function$;
REVOKE ALL ON FUNCTION curtainsuk_private.search_retail_fabrics_naila_v1(jsonb,integer,integer,integer,integer)
  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION curtainsuk_private.search_retail_fabrics_naila_v1(jsonb,integer,integer,integer,integer)
  TO service_role;

```
