-- UNRELEASED SQL CANDIDATE. Do not put this file into migrations or deploy it.
-- Stage 2: private, generation-based Browse read model. Customer commerce never
-- reads this table as production price, stock or order authority.
CREATE TABLE curtainsuk_private.browse_read_projection AS
SELECT NULL::uuid AS generation_id, e.*
FROM curtainsuk_private.browse_eligible_set_v1 e WITH NO DATA;
ALTER TABLE curtainsuk_private.browse_read_projection
  ALTER COLUMN generation_id SET NOT NULL,
  ALTER COLUMN fabric_id SET NOT NULL,
  ADD CONSTRAINT browse_read_projection_pkey PRIMARY KEY (generation_id, fabric_id);
CREATE INDEX browse_read_projection_sort_idx
  ON curtainsuk_private.browse_read_projection
  (generation_id, brand, design, colour_name, fabric_id);
CREATE INDEX browse_read_projection_price_idx
  ON curtainsuk_private.browse_read_projection (generation_id, guide_minor);

CREATE TABLE curtainsuk_private.browse_projection_control (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  active_generation uuid,
  refreshed_at timestamptz,
  next_time_change_at timestamptz NOT NULL DEFAULT '-infinity',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
INSERT INTO curtainsuk_private.browse_projection_control(singleton) VALUES (true);

CREATE TABLE curtainsuk_private.browse_projection_dirty (
  fabric_id text PRIMARY KEY,
  changed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE curtainsuk_private.browse_read_projection ENABLE ROW LEVEL SECURITY;
ALTER TABLE curtainsuk_private.browse_read_projection FORCE ROW LEVEL SECURITY;
ALTER TABLE curtainsuk_private.browse_projection_control ENABLE ROW LEVEL SECURITY;
ALTER TABLE curtainsuk_private.browse_projection_control FORCE ROW LEVEL SECURITY;
ALTER TABLE curtainsuk_private.browse_projection_dirty ENABLE ROW LEVEL SECURITY;
ALTER TABLE curtainsuk_private.browse_projection_dirty FORCE ROW LEVEL SECURITY;
REVOKE ALL ON curtainsuk_private.browse_read_projection,
  curtainsuk_private.browse_projection_control,
  curtainsuk_private.browse_projection_dirty FROM public, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON curtainsuk_private.browse_read_projection,
  curtainsuk_private.browse_projection_control,
  curtainsuk_private.browse_projection_dirty TO service_role;

-- Counts and option vocabulary are calculated from the full eligible catalogue,
-- not the customer's current filters. Preserve the existing HAVING >= 12 rule.
CREATE FUNCTION curtainsuk_private.browse_projection_metadata(p_generation uuid)
RETURNS jsonb LANGUAGE sql STABLE SET search_path TO '' AS $function$
WITH eligible AS (
  SELECT * FROM curtainsuk_private.browse_read_projection
  WHERE generation_id = p_generation
), facet_values AS (
  SELECT DISTINCT e.fabric_id, x.key, lower(x.value) AS value
  FROM eligible e CROSS JOIN LATERAL (
    SELECT 'colour' AS key, x.value FROM unnest(e.manufacturer_colour_families) x(value)
    UNION ALL SELECT 'colour', e.visual_primary_colour
      WHERE e.visual_primary_colour = ANY(ARRAY['white/cream','beige/taupe','grey','black','blue','green','pink','red','orange','yellow/gold','purple','brown','neutral','multicolour'])
    UNION ALL SELECT 'colour', x.value FROM jsonb_array_elements_text(e.visual_secondary_colours) x(value)
      WHERE lower(x.value) = ANY(ARRAY['white/cream','beige/taupe','grey','black','blue','green','pink','red','orange','yellow/gold','purple','brown','neutral','multicolour'])
    UNION ALL SELECT 'pattern', value FROM jsonb_array_elements_text(
      (CASE WHEN e.pattern_class <> '' THEN jsonb_build_array(e.pattern_class) ELSE '[]'::jsonb END) || e.motif)
    UNION ALL SELECT 'texture', value FROM jsonb_array_elements_text(e.visual_surface)
    UNION ALL SELECT 'finish', e.sheen_appearance WHERE e.sheen_appearance <> ''
    UNION ALL SELECT 'character', value FROM jsonb_array_elements_text(e.visual_character)
  ) x(key, value)
  WHERE x.value <> '' AND lower(x.value) <> 'unknown'
), facet_options AS (
  SELECT key, jsonb_agg(jsonb_build_object('value',value,'label',value,'count',count) ORDER BY value) AS options
  FROM (SELECT key,value,count(*)::integer AS count FROM facet_values
    GROUP BY key,value HAVING count(*) >= 12) grouped
  GROUP BY key
)
SELECT jsonb_build_object(
  'brands', (SELECT coalesce(jsonb_agg(brand ORDER BY brand),'[]'::jsonb)
    FROM (SELECT DISTINCT brand FROM eligible) b),
  'collections', (SELECT coalesce(jsonb_agg(collection ORDER BY collection),'[]'::jsonb)
    FROM (SELECT DISTINCT collection FROM eligible) co),
  'facetOptions', coalesce((SELECT jsonb_object_agg(key,options) FROM facet_options),'{}'::jsonb)
);
$function$;

-- A time boundary can change old Browse price/stock semantics without a write.
-- This boundary is deliberately conservative: an unnecessary refresh/fallback
-- is preferable to showing stale availability or guide-price filtering.
CREATE FUNCTION curtainsuk_private.browse_projection_next_time_change()
RETURNS timestamptz LANGUAGE sql STABLE SET search_path TO '' AS $function$
SELECT coalesce(min(change_at), 'infinity'::timestamptz) FROM (
  SELECT checked_at AS change_at FROM curtainsuk_private.daily_stock_snapshots
    WHERE checked_at > now()
  UNION ALL
  SELECT checked_at + curtainsuk_private.stock_validity_window()
    FROM curtainsuk_private.daily_stock_snapshots
    WHERE checked_at <= now()
      AND checked_at + curtainsuk_private.stock_validity_window() > now()
  UNION ALL
  SELECT checked_at FROM curtainsuk_private.supplier_snapshots
    WHERE checked_at > now()
) boundaries;
$function$;

-- Triggers and refreshes take the same transaction lock. A full generation is
-- built and reconciled while source changes are briefly blocked, then the
-- active pointer and dirty queue change atomically at commit.
CREATE FUNCTION curtainsuk_private.browse_projection_refresh_full()
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO ''
  SET enable_nestloop TO off AS $function$
DECLARE
  next_generation uuid := gen_random_uuid();
  source_count bigint;
  projected_count bigint;
  result_metadata jsonb;
BEGIN
  PERFORM pg_advisory_xact_lock(4252026, 9248);
  INSERT INTO curtainsuk_private.browse_read_projection
    SELECT next_generation, e.* FROM curtainsuk_private.browse_eligible_set_v1 e;
  SELECT count(*) INTO source_count FROM curtainsuk_private.browse_eligible_set_v1;
  SELECT count(*) INTO projected_count FROM curtainsuk_private.browse_read_projection
    WHERE generation_id = next_generation;
  IF source_count <> projected_count OR EXISTS (
    (SELECT to_jsonb(e) FROM curtainsuk_private.browse_eligible_set_v1 e
      EXCEPT SELECT to_jsonb(p) - 'generation_id'
        FROM curtainsuk_private.browse_read_projection p WHERE p.generation_id = next_generation)
    UNION ALL
    (SELECT to_jsonb(p) - 'generation_id'
        FROM curtainsuk_private.browse_read_projection p WHERE p.generation_id = next_generation
      EXCEPT SELECT to_jsonb(e) FROM curtainsuk_private.browse_eligible_set_v1 e)
  ) THEN
    RAISE EXCEPTION 'BROWSE_PROJECTION_RECONCILIATION_FAILED';
  END IF;
  SELECT curtainsuk_private.browse_projection_metadata(next_generation)
    INTO result_metadata;
  UPDATE curtainsuk_private.browse_projection_control
    SET active_generation = next_generation, refreshed_at = now(),
        next_time_change_at = curtainsuk_private.browse_projection_next_time_change(),
        metadata = result_metadata
    WHERE singleton;
  DELETE FROM curtainsuk_private.browse_projection_dirty;
  DELETE FROM curtainsuk_private.browse_read_projection
    WHERE generation_id <> next_generation;
  RETURN jsonb_build_object('generation',next_generation,'count',projected_count);
END;
$function$;

REVOKE ALL ON FUNCTION curtainsuk_private.browse_projection_metadata(uuid),
  curtainsuk_private.browse_projection_next_time_change(),
  curtainsuk_private.browse_projection_refresh_full()
  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION curtainsuk_private.browse_projection_metadata(uuid),
  curtainsuk_private.browse_projection_next_time_change(),
  curtainsuk_private.browse_projection_refresh_full() TO service_role;

CREATE FUNCTION curtainsuk_private.browse_projection_mark_fabric_dirty()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE changed_id text;
BEGIN
  PERFORM pg_advisory_xact_lock(4252026, 9248);
  IF TG_OP <> 'INSERT' THEN
    changed_id := to_jsonb(OLD)->>'fabric_id';
    IF changed_id IS NOT NULL THEN
      INSERT INTO curtainsuk_private.browse_projection_dirty(fabric_id)
        VALUES (changed_id)
        ON CONFLICT (fabric_id) DO UPDATE SET changed_at = excluded.changed_at;
    END IF;
  END IF;
  IF TG_OP <> 'DELETE' THEN
    changed_id := to_jsonb(NEW)->>'fabric_id';
    IF changed_id IS NOT NULL THEN
      INSERT INTO curtainsuk_private.browse_projection_dirty(fabric_id)
        VALUES (changed_id)
        ON CONFLICT (fabric_id) DO UPDATE SET changed_at = excluded.changed_at;
    END IF;
  END IF;
  RETURN NULL;
END;
$function$;

CREATE FUNCTION curtainsuk_private.browse_projection_mark_global_dirty()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
BEGIN
  PERFORM pg_advisory_xact_lock(4252026, 9248);
  INSERT INTO curtainsuk_private.browse_projection_dirty(fabric_id)
    VALUES ('*')
    ON CONFLICT (fabric_id) DO UPDATE SET changed_at = excluded.changed_at;
  RETURN NULL;
END;
$function$;

REVOKE ALL ON FUNCTION curtainsuk_private.browse_projection_mark_fabric_dirty(),
  curtainsuk_private.browse_projection_mark_global_dirty()
  FROM public, anon, authenticated;

-- Direct Fabric Master, retail profile, media-map and governed Knowledge edits
-- can be refreshed for just the affected Fabric Master IDs.
DO $install$
DECLARE source_table text;
BEGIN
  FOREACH source_table IN ARRAY ARRAY[
    'fabric_colourways','fabric_retail_profiles',
    'fabric_visual_knowledge_read_cache','fabric_media_mappings'
  ] LOOP
    EXECUTE format('CREATE TRIGGER browse_projection_fabric_dirty
      AFTER INSERT OR UPDATE OR DELETE ON curtainsuk_private.%I
      FOR EACH ROW EXECUTE FUNCTION curtainsuk_private.browse_projection_mark_fabric_dirty()', source_table);
    EXECUTE format('CREATE TRIGGER browse_projection_fabric_truncated
      AFTER TRUNCATE ON curtainsuk_private.%I
      FOR EACH STATEMENT EXECUTE FUNCTION curtainsuk_private.browse_projection_mark_global_dirty()', source_table);
  END LOOP;
END;
$install$;

-- Supplier price/promotion, stock, media-asset and design-level changes are
-- less safely attributable to one Fabric Master. They require full reconcile.
DO $install$
DECLARE source_table text;
BEGIN
  FOREACH source_table IN ARRAY ARRAY[
    'supplier_snapshots','supplier_snapshot_prices','supplier_promotion_events',
    'daily_stock_snapshots','daily_stock_usage','fabric_media_assets',
    'supplier_brands','fabric_designs','fabric_collections'
  ] LOOP
    EXECUTE format('CREATE TRIGGER browse_projection_source_dirty
      AFTER INSERT OR UPDATE OR DELETE ON curtainsuk_private.%I
      FOR EACH STATEMENT EXECUTE FUNCTION curtainsuk_private.browse_projection_mark_global_dirty()', source_table);
    EXECUTE format('CREATE TRIGGER browse_projection_source_truncated
      AFTER TRUNCATE ON curtainsuk_private.%I
      FOR EACH STATEMENT EXECUTE FUNCTION curtainsuk_private.browse_projection_mark_global_dirty()', source_table);
  END LOOP;
END;
$install$;

CREATE FUNCTION curtainsuk_private.browse_projection_refresh_dirty(p_limit integer DEFAULT 500)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO ''
  SET enable_nestloop TO off AS $function$
DECLARE
  generation uuid;
  ids text[];
  result_metadata jsonb;
BEGIN
  PERFORM pg_advisory_xact_lock(4252026, 9248);
  SELECT active_generation INTO generation
    FROM curtainsuk_private.browse_projection_control WHERE singleton FOR UPDATE;
  IF generation IS NULL
    OR EXISTS (SELECT 1 FROM curtainsuk_private.browse_projection_dirty WHERE fabric_id = '*')
    OR EXISTS (SELECT 1 FROM curtainsuk_private.browse_projection_control
      WHERE singleton AND now() >= next_time_change_at)
  THEN
    RETURN curtainsuk_private.browse_projection_refresh_full();
  END IF;
  SELECT array_agg(fabric_id) INTO ids FROM (
    SELECT fabric_id FROM curtainsuk_private.browse_projection_dirty
    ORDER BY changed_at, fabric_id LIMIT greatest(1, least(p_limit, 5000))
  ) queued;
  IF ids IS NULL THEN
    RETURN jsonb_build_object('generation',generation,'refreshed',0);
  END IF;
  DELETE FROM curtainsuk_private.browse_read_projection
    WHERE generation_id = generation AND fabric_id = ANY(ids);
  INSERT INTO curtainsuk_private.browse_read_projection
    SELECT generation, e.* FROM curtainsuk_private.browse_eligible_set_v1 e
    WHERE e.fabric_id = ANY(ids);
  SELECT curtainsuk_private.browse_projection_metadata(generation)
    INTO result_metadata;
  UPDATE curtainsuk_private.browse_projection_control
    SET refreshed_at = now(),
        next_time_change_at = curtainsuk_private.browse_projection_next_time_change(),
        metadata = result_metadata
    WHERE singleton;
  DELETE FROM curtainsuk_private.browse_projection_dirty
    WHERE fabric_id = ANY(ids);
  RETURN jsonb_build_object('generation',generation,'refreshed',cardinality(ids));
END;
$function$;
REVOKE ALL ON FUNCTION curtainsuk_private.browse_projection_refresh_dirty(integer)
  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION curtainsuk_private.browse_projection_refresh_dirty(integer)
  TO service_role;

-- Shadow RPC. The production gateway continues using search_retail_fabrics
-- until full JSON parity and gateway regressions are approved. Dirty/expired
-- projections fall back to the existing authoritative Browse RPC, never the
-- slower set-oriented shadow candidate.
CREATE FUNCTION curtainsuk_private.search_retail_fabrics_prepared_v1(
  p_filters jsonb, p_page integer, p_size integer,
  p_guide_min integer, p_guide_max integer
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path TO '' AS $function$
DECLARE
  active_generation uuid;
  projection_metadata jsonb;
  next_change timestamptz;
BEGIN
  SELECT c.active_generation, c.metadata, c.next_time_change_at
    INTO active_generation, projection_metadata, next_change
  FROM curtainsuk_private.browse_projection_control c WHERE c.singleton;
  IF active_generation IS NULL OR now() >= next_change
    OR EXISTS (SELECT 1 FROM curtainsuk_private.browse_projection_dirty LIMIT 1)
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
      LIMIT greatest(1,least(p_size,48))
      OFFSET ((greatest(1,least(p_page,10000))-1)*greatest(1,least(p_size,48)))
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
REVOKE ALL ON FUNCTION curtainsuk_private.search_retail_fabrics_prepared_v1(
  jsonb,integer,integer,integer,integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION curtainsuk_private.search_retail_fabrics_prepared_v1(
  jsonb,integer,integer,integer,integer) TO service_role;

-- Source-controlled scheduler declaration. It does not run until this migration
-- is deliberately deployed, after parity. Missing/stale projection remains
-- fail-safe through the shadow RPC's direct-query fallback.
SELECT cron.schedule('curtainsuk-browse-projection-refresh-v1', '* * * * *',
  'SELECT curtainsuk_private.browse_projection_refresh_dirty(500)');
