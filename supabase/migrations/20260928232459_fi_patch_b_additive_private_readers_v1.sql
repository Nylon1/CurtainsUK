-- PATCH B REVIEW ONLY. Do not apply until the owner approves the migration.
-- The active Browse generation is built from browse_current_guide_prices_set_v1,
-- which uses the same approved-snapshot, promotion and Prestigious Textiles
-- cut-price precedence as current_retail_guide_prices(). No price is cached
-- past its existing dirty/next-change guard. An incomplete generation uses the
-- current governed reader, so FI never silently loses a fabric.
CREATE FUNCTION curtainsuk_private.fi_retail_guide_price_level_fabric_ids_v1(
  p_guide_min integer, p_guide_max integer
) RETURNS jsonb
LANGUAGE plpgsql STABLE SET search_path TO ''
AS $function$
DECLARE
  active_generation uuid;
  next_change timestamptz;
  knowledge_dirty boolean;
  projection_usable boolean;
BEGIN
  SELECT c.active_generation, c.next_time_change_at, c.knowledge_cache_dirty
    INTO active_generation, next_change, knowledge_dirty
  FROM curtainsuk_private.browse_projection_control c WHERE c.singleton;

  projection_usable := active_generation IS NOT NULL AND next_change IS NOT NULL
    AND knowledge_dirty IS FALSE AND now() < next_change
    AND NOT EXISTS (SELECT 1 FROM curtainsuk_private.browse_projection_dirty LIMIT 1)
    AND EXISTS (SELECT 1 FROM curtainsuk_private.browse_read_projection p
      WHERE p.generation_id = active_generation LIMIT 1);

  IF projection_usable THEN
    -- The Browse source has additional media/identity gates. Check that those
    -- gates have not omitted any currently visible Fabric Master identity.
    -- The rare incomplete case must use the original complete price reader.
    projection_usable := NOT EXISTS (
      SELECT 1 FROM curtainsuk_private.fabric_colourways c
      LEFT JOIN curtainsuk_private.browse_read_projection p
        ON p.generation_id = active_generation AND p.fabric_id = c.fabric_id
      WHERE c.staging_catalog_visible AND c.lifecycle_state <> 'DISCONTINUED'
        AND p.fabric_id IS NULL
    );
  END IF;

  IF projection_usable IS DISTINCT FROM true THEN
    RETURN curtainsuk_private.retail_guide_price_level_fabric_ids_json(
      p_guide_min, p_guide_max);
  END IF;

  RETURN (
    SELECT coalesce(jsonb_agg(p.fabric_id::text ORDER BY p.fabric_id), '[]'::jsonb)
    FROM curtainsuk_private.browse_read_projection p
    JOIN curtainsuk_private.fabric_colourways c ON c.fabric_id = p.fabric_id
    WHERE p.generation_id = active_generation
      AND c.staging_catalog_visible AND c.lifecycle_state <> 'DISCONTINUED'
      AND p.guide_minor >= p_guide_min
      AND (p_guide_max IS NULL OR p.guide_minor < p_guide_max)
  );
END
$function$;

REVOKE ALL ON FUNCTION curtainsuk_private.fi_retail_guide_price_level_fabric_ids_v1(integer, integer)
  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION curtainsuk_private.fi_retail_guide_price_level_fabric_ids_v1(integer, integer)
  TO service_role;

-- The existing set-based prepared evidence was compared against the existing
-- fabric_commercial_evidence result for every real fabric in all four price
-- cohorts (11,806 identities, zero field differences). FI uses that bounded
-- read when its generation is current and complete. If it is unavailable,
-- the original evidence function remains authoritative for the same IDs.
-- The gateway still applies the unchanged fabricReadiness predicate.
CREATE FUNCTION curtainsuk_private.fi_bulk_commercial_evidence_v1(p_ids text[])
RETURNS jsonb
LANGUAGE plpgsql STABLE SET search_path TO ''
AS $function$
DECLARE
  result jsonb := '[]'::jsonb;
  position integer;
BEGIN
  IF coalesce(array_length(p_ids, 1), 0) > 240 THEN
    RAISE EXCEPTION 'FI_COMMERCIAL_PAGE_TOO_LARGE';
  END IF;
  IF p_ids IS NULL OR cardinality(p_ids) = 0 THEN RETURN result; END IF;

  BEGIN
    RETURN curtainsuk_private.naila_prepared_commercial_readiness_v1(p_ids);
  EXCEPTION WHEN SQLSTATE '55000' THEN
    -- A dirty/incomplete Browse generation must never provide stale or partial
    -- commercial evidence. Re-read the current governed source for this batch.
    NULL;
  END;

  FOR position IN 1..coalesce(array_length(p_ids, 1), 0) BY 48 LOOP
    result := result || curtainsuk_private.fabric_commercial_evidence(p_ids[position:position + 47]);
  END LOOP;
  RETURN result;
END
$function$;

REVOKE ALL ON FUNCTION curtainsuk_private.fi_bulk_commercial_evidence_v1(text[])
  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION curtainsuk_private.fi_bulk_commercial_evidence_v1(text[])
  TO service_role;