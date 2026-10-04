-- CurtainsUK Browse low-IO reliability:
-- 1) stock source changes dirty only affected Fabric Master IDs;
-- 2) zero-row stock statements create no dirty marker;
-- 3) bounded per-fabric dirtiness continues serving the last prepared generation;
-- 4) maintenance runs twice daily at 06:10 and 19:10 Europe/London.

CREATE OR REPLACE FUNCTION curtainsuk_private.browse_projection_mark_stock_dirty()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF current_setting('curtainsuk.retention_cleanup', true) = 'on' THEN
    RETURN NULL;
  END IF;

  PERFORM pg_advisory_xact_lock(4252026, 9248);

  IF TG_OP = 'INSERT' THEN
    INSERT INTO curtainsuk_private.browse_projection_dirty(fabric_id)
    SELECT DISTINCT f.fabric_id
    FROM new_rows r
    JOIN curtainsuk_private.fabric_colourways f
      ON f.supplier_id = r.supplier_id
     AND f.supplier_sku = r.supplier_sku
    WHERE f.fabric_id IS NOT NULL
    ON CONFLICT (fabric_id) DO UPDATE SET changed_at = excluded.changed_at;

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO curtainsuk_private.browse_projection_dirty(fabric_id)
    SELECT DISTINCT f.fabric_id
    FROM old_rows r
    JOIN curtainsuk_private.fabric_colourways f
      ON f.supplier_id = r.supplier_id
     AND f.supplier_sku = r.supplier_sku
    WHERE f.fabric_id IS NOT NULL
    ON CONFLICT (fabric_id) DO UPDATE SET changed_at = excluded.changed_at;

  ELSE
    INSERT INTO curtainsuk_private.browse_projection_dirty(fabric_id)
    SELECT DISTINCT f.fabric_id
    FROM (
      SELECT supplier_id, supplier_sku FROM old_rows
      UNION
      SELECT supplier_id, supplier_sku FROM new_rows
    ) r
    JOIN curtainsuk_private.fabric_colourways f
      ON f.supplier_id = r.supplier_id
     AND f.supplier_sku = r.supplier_sku
    WHERE f.fabric_id IS NOT NULL
    ON CONFLICT (fabric_id) DO UPDATE SET changed_at = excluded.changed_at;
  END IF;

  RETURN NULL;
END;
$function$;

REVOKE ALL ON FUNCTION curtainsuk_private.browse_projection_mark_stock_dirty()
  FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS browse_projection_source_dirty
  ON curtainsuk_private.daily_stock_snapshots;
DROP TRIGGER IF EXISTS browse_projection_source_dirty
  ON curtainsuk_private.daily_stock_usage;

DROP TRIGGER IF EXISTS browse_projection_stock_dirty_insert
  ON curtainsuk_private.daily_stock_snapshots;
DROP TRIGGER IF EXISTS browse_projection_stock_dirty_update
  ON curtainsuk_private.daily_stock_snapshots;
DROP TRIGGER IF EXISTS browse_projection_stock_dirty_delete
  ON curtainsuk_private.daily_stock_snapshots;
DROP TRIGGER IF EXISTS browse_projection_stock_dirty_insert
  ON curtainsuk_private.daily_stock_usage;
DROP TRIGGER IF EXISTS browse_projection_stock_dirty_update
  ON curtainsuk_private.daily_stock_usage;
DROP TRIGGER IF EXISTS browse_projection_stock_dirty_delete
  ON curtainsuk_private.daily_stock_usage;

CREATE TRIGGER browse_projection_stock_dirty_insert
  AFTER INSERT ON curtainsuk_private.daily_stock_snapshots
  REFERENCING NEW TABLE AS new_rows
  FOR EACH STATEMENT
  EXECUTE FUNCTION curtainsuk_private.browse_projection_mark_stock_dirty();

CREATE TRIGGER browse_projection_stock_dirty_update
  AFTER UPDATE ON curtainsuk_private.daily_stock_snapshots
  REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows
  FOR EACH STATEMENT
  EXECUTE FUNCTION curtainsuk_private.browse_projection_mark_stock_dirty();

CREATE TRIGGER browse_projection_stock_dirty_delete
  AFTER DELETE ON curtainsuk_private.daily_stock_snapshots
  REFERENCING OLD TABLE AS old_rows
  FOR EACH STATEMENT
  EXECUTE FUNCTION curtainsuk_private.browse_projection_mark_stock_dirty();

CREATE TRIGGER browse_projection_stock_dirty_insert
  AFTER INSERT ON curtainsuk_private.daily_stock_usage
  REFERENCING NEW TABLE AS new_rows
  FOR EACH STATEMENT
  EXECUTE FUNCTION curtainsuk_private.browse_projection_mark_stock_dirty();

CREATE TRIGGER browse_projection_stock_dirty_update
  AFTER UPDATE ON curtainsuk_private.daily_stock_usage
  REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows
  FOR EACH STATEMENT
  EXECUTE FUNCTION curtainsuk_private.browse_projection_mark_stock_dirty();

CREATE TRIGGER browse_projection_stock_dirty_delete
  AFTER DELETE ON curtainsuk_private.daily_stock_usage
  REFERENCING OLD TABLE AS old_rows
  FOR EACH STATEMENT
  EXECUTE FUNCTION curtainsuk_private.browse_projection_mark_stock_dirty();

CREATE OR REPLACE FUNCTION curtainsuk_private.search_retail_fabrics_prepared_v1(
  p_filters jsonb,
  p_page integer,
  p_size integer,
  p_guide_min integer,
  p_guide_max integer
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path TO ''
AS $function$
DECLARE
  active_generation uuid;
  projection_metadata jsonb;
  next_change timestamptz;
  knowledge_dirty boolean;
  projection_knowledge_stamp timestamptz;
  actual_knowledge_stamp timestamptz;
BEGIN
  SELECT c.active_generation,
         c.metadata,
         c.next_time_change_at,
         c.knowledge_cache_dirty,
         c.knowledge_cache_refreshed_at
    INTO active_generation,
         projection_metadata,
         next_change,
         knowledge_dirty,
         projection_knowledge_stamp
  FROM curtainsuk_private.browse_projection_control c
  WHERE c.singleton;

  SELECT max(refreshed_at)
    INTO actual_knowledge_stamp
  FROM curtainsuk_private.fabric_visual_knowledge_read_cache;

  -- A bounded queue of Fabric IDs is normal asynchronous maintenance and must
  -- not evict customers from the prepared read model. Fall back only when the
  -- whole generation is unsafe or globally invalidated.
  IF active_generation IS NULL
    OR now() >= next_change
    OR coalesce(knowledge_dirty, false)
    OR projection_knowledge_stamp IS DISTINCT FROM actual_knowledge_stamp
    OR EXISTS (
      SELECT 1
      FROM curtainsuk_private.browse_projection_dirty
      WHERE fabric_id = '*'
    )
  THEN
    RETURN curtainsuk_private.search_retail_fabrics(
      p_filters, p_page, p_size, p_guide_min, p_guide_max);
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
      SELECT p.*
      FROM curtainsuk_private.browse_read_projection p
      WHERE p.generation_id = active_generation
    ), matched AS (
      SELECT e.*
      FROM eligible e
      CROSS JOIN filter_values f
      WHERE
        (p_guide_min IS NULL OR e.guide_minor >= p_guide_min)
        AND (p_guide_max IS NULL OR e.guide_minor < p_guide_max)
        AND (
          coalesce(p_filters->>'query','') = ''
          OR upper(e.supplier_sku) = upper(left(p_filters->>'query',100))
          OR to_tsvector('simple',concat_ws(' ',e.brand,e.design,e.collection,e.colour_name))
            @@ plainto_tsquery('simple',left(p_filters->>'query',100))
        )
        AND (coalesce(p_filters->>'brand','') = '' OR e.brand = p_filters->>'brand')
        AND (coalesce(p_filters->>'collection','') = '' OR e.collection = p_filters->>'collection')
        AND (coalesce(p_filters->>'window','') = '' OR p_filters->>'window' = ANY(e.window_types))
        AND (
          coalesce(p_filters->>'sample','') = ''
          OR (p_filters->>'sample' = 'AVAILABLE' AND e.sample_current)
          OR (p_filters->>'sample' = 'UNAVAILABLE' AND NOT e.sample_current)
        )
        AND (
          coalesce(p_filters->>'availability','') = ''
          OR (p_filters->>'availability' IN ('CURRENT','AVAILABLE') AND e.stock_current)
          OR (p_filters->>'availability' IN ('CONFIRM','CHECK_AVAILABILITY') AND NOT e.stock_known)
          OR (p_filters->>'availability' = 'OUT_OF_STOCK' AND e.stock_known AND NOT e.stock_current)
        )
        AND (
          jsonb_array_length(f.colour) = 0
          OR EXISTS (
            SELECT 1
            FROM jsonb_array_elements_text(f.colour) v
            WHERE v = ANY(e.manufacturer_colour_families)
              OR v = e.visual_primary_colour
              OR e.visual_secondary_colours ? v
          )
        )
        AND (
          jsonb_array_length(f.pattern) = 0
          OR EXISTS (
            SELECT 1
            FROM jsonb_array_elements_text(f.pattern) v
            WHERE v = e.pattern_class OR e.motif ? v
          )
        )
        AND (
          jsonb_array_length(f.texture) = 0
          OR EXISTS (
            SELECT 1
            FROM jsonb_array_elements_text(f.texture) v
            WHERE e.visual_surface ? v
          )
        )
        AND (
          jsonb_array_length(f.finish) = 0
          OR EXISTS (
            SELECT 1
            FROM jsonb_array_elements_text(f.finish) v
            WHERE v = e.sheen_appearance
          )
        )
        AND (
          jsonb_array_length(f.character) = 0
          OR EXISTS (
            SELECT 1
            FROM jsonb_array_elements_text(f.character) v
            WHERE e.visual_character ? v
          )
        )
    ), page AS (
      SELECT fabric_id, guide_minor, brand, design, colour_name
      FROM matched
      ORDER BY brand, design, colour_name, fabric_id
      LIMIT greatest(1,least(p_size,48))
      OFFSET ((greatest(1,least(p_page,10000))-1)*greatest(1,least(p_size,48)))
    )
    SELECT jsonb_build_object(
      'ids',
        coalesce((
          SELECT jsonb_agg(fabric_id ORDER BY brand,design,colour_name,fabric_id)
          FROM page
        ),'[]'::jsonb),
      'guidePrices',
        coalesce((
          SELECT jsonb_object_agg(fabric_id,guide_minor)
          FROM page
          WHERE guide_minor > 0
        ),'{}'::jsonb),
      'total',(SELECT count(*) FROM matched),
      'brands',projection_metadata->'brands',
      'collections',projection_metadata->'collections',
      'facetOptions',projection_metadata->'facetOptions'
    )
  );
END;
$function$;

REVOKE ALL ON FUNCTION curtainsuk_private.search_retail_fabrics_prepared_v1(
  jsonb,integer,integer,integer,integer
) FROM public, anon, authenticated;

GRANT EXECUTE ON FUNCTION curtainsuk_private.search_retail_fabrics_prepared_v1(
  jsonb,integer,integer,integer,integer
) TO service_role;

-- One maintenance pass in the morning and one in the evening, year-round in
-- Europe/London. Candidate UTC hours cover GMT and BST; the local-hour guard
-- means exactly two executions do real work.
SELECT cron.unschedule('curtainsuk-browse-projection-refresh-v1')
WHERE EXISTS (
  SELECT 1 FROM cron.job
  WHERE jobname = 'curtainsuk-browse-projection-refresh-v1'
);

SELECT cron.schedule(
  'curtainsuk-browse-projection-refresh-v1',
  '10 5,6,18,19 * * *',
  $cron$
    SELECT curtainsuk_private.browse_projection_refresh_dirty(5000)
    WHERE extract(hour from now() at time zone 'Europe/London')::integer IN (6,19)
  $cron$
);
