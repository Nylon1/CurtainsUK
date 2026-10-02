-- Empty, private, additive Fabric Intelligence overlay. Do not seed patches here.
-- This migration does not alter the enrichment ledger or knowledge-state view.

CREATE FUNCTION curtainsuk_private.fabric_visual_overlay_patch_valid(
  p_requested text[], p_values jsonb, p_confidence jsonb, p_provenance jsonb
) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path TO '' AS $function$
DECLARE
  field_name text;
  field_value jsonb;
  member jsonb;
  allowed text[];
  seen_fields text[] := ARRAY[]::text[];
  seen_values text[];
  member_text text;
BEGIN
  IF p_requested IS NULL OR cardinality(p_requested) = 0
     OR jsonb_typeof(p_values) IS DISTINCT FROM 'object'
     OR jsonb_typeof(p_confidence) IS DISTINCT FROM 'object'
     OR jsonb_typeof(p_provenance) IS DISTINCT FROM 'object'
     OR p_values = '{}'::jsonb THEN
    RETURN false;
  END IF;

  FOREACH field_name IN ARRAY p_requested LOOP
    IF field_name IS NULL OR field_name = ANY(seen_fields) OR field_name NOT IN (
      'primaryColour','secondaryColours','colourTemperature','lightness',
      'saturation','contrast','colourComplexity','patternClass','motif',
      'visualActivity','visualSurface','sheenAppearance','visualWeight','character'
    ) THEN
      RETURN false;
    END IF;
    seen_fields := array_append(seen_fields, field_name);
  END LOOP;

  IF EXISTS (
    (SELECT key FROM jsonb_object_keys(p_values) AS v(key)
       EXCEPT SELECT key FROM jsonb_object_keys(p_confidence) AS c(key))
    UNION ALL
    (SELECT key FROM jsonb_object_keys(p_confidence) AS c(key)
       EXCEPT SELECT key FROM jsonb_object_keys(p_values) AS v(key))
    UNION ALL
    (SELECT key FROM jsonb_object_keys(p_values) AS v(key)
       EXCEPT SELECT key FROM jsonb_object_keys(p_provenance) AS p(key))
    UNION ALL
    (SELECT key FROM jsonb_object_keys(p_provenance) AS p(key)
       EXCEPT SELECT key FROM jsonb_object_keys(p_values) AS v(key))
  ) THEN
    RETURN false;
  END IF;
  IF EXISTS (
    SELECT requested.field_name FROM unnest(p_requested) AS requested(field_name)
    EXCEPT SELECT value_field.key FROM jsonb_object_keys(p_values) AS value_field(key)
  ) THEN
    RETURN false;
  END IF;

  FOR field_name, field_value IN SELECT key, value FROM jsonb_each(p_values) LOOP
    IF NOT field_name = ANY(p_requested)
       OR p_confidence->>field_name NOT IN ('HIGH','MEDIUM')
       OR p_provenance->>field_name NOT IN (
         'MANUFACTURER','IMAGE','BOTH','AI_ESTIMATE_IMAGE_SUPPORTED'
       ) THEN
      RETURN false;
    END IF;

    allowed := CASE field_name
      WHEN 'primaryColour' THEN ARRAY['white','cream','beige','taupe','brown','grey','black','blue','green','red','pink','purple','orange','yellow','gold']
      WHEN 'secondaryColours' THEN ARRAY['white','cream','beige','taupe','brown','grey','black','blue','green','red','pink','purple','orange','yellow','gold']
      WHEN 'colourTemperature' THEN ARRAY['warm','cool','balanced']
      WHEN 'lightness' THEN ARRAY['light','mid-tone','deep','mixed']
      WHEN 'saturation' THEN ARRAY['muted','balanced','saturated','mixed']
      WHEN 'contrast' THEN ARRAY['very-low','low','medium','high','very-high']
      WHEN 'colourComplexity' THEN ARRAY['monochromatic','tonal','limited-palette','multicolour']
      WHEN 'patternClass' THEN ARRAY['plain','textured-plain','subtle-pattern','stripe','geometric','botanical','traditional-motif','abstract','statement']
      WHEN 'motif' THEN ARRAY['leaf','flower','tree','bird','animal','stripe','check','geometric','abstract','architectural','landscape','ornamental','damask','paisley','ikat']
      WHEN 'visualActivity' THEN ARRAY['minimal','low','balanced','busy','statement']
      WHEN 'visualSurface' THEN ARRAY['smooth','subtle-texture','visible-weave','pile-like','relief','boucle-like','slubbed']
      WHEN 'sheenAppearance' THEN ARRAY['matte','low','gentle','lustrous']
      WHEN 'visualWeight' THEN ARRAY['airy','light','balanced','substantial','rich']
      WHEN 'character' THEN ARRAY['calm','refined','luxurious','relaxed','natural','decorative','expressive','playful','dramatic','understated','sophisticated','graphic']
      ELSE NULL
    END;
    IF allowed IS NULL THEN RETURN false; END IF;

    IF field_name IN ('secondaryColours','motif','visualSurface','character') THEN
      IF jsonb_typeof(field_value) IS DISTINCT FROM 'array'
         OR jsonb_array_length(field_value) = 0 THEN
        RETURN false;
      END IF;
      seen_values := ARRAY[]::text[];
      FOR member IN SELECT value FROM jsonb_array_elements(field_value) AS e(value) LOOP
        IF jsonb_typeof(member) IS DISTINCT FROM 'string' THEN RETURN false; END IF;
        member_text := member #>> '{}';
        IF member_text <> ALL(allowed) OR member_text = ANY(seen_values) THEN RETURN false; END IF;
        seen_values := array_append(seen_values, member_text);
      END LOOP;
    ELSE
      IF jsonb_typeof(field_value) IS DISTINCT FROM 'string'
         OR (field_value #>> '{}') <> ALL(allowed) THEN
        RETURN false;
      END IF;
    END IF;
  END LOOP;
  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION curtainsuk_private.fabric_visual_overlay_patch_valid(
  text[],jsonb,jsonb,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION curtainsuk_private.fabric_visual_overlay_patch_valid(
  text[],jsonb,jsonb,jsonb) TO service_role;

CREATE TABLE curtainsuk_private.fabric_visual_knowledge_patches (
  patch_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fabric_id text NOT NULL REFERENCES curtainsuk_private.fabric_colourways(fabric_id),
  supplier_id text NOT NULL,
  supplier_sku text NOT NULL,
  brand_id text NOT NULL,
  design_id text NOT NULL,
  approved_image_type text NOT NULL,
  approved_image_hash text NOT NULL,
  approved_image_url text NOT NULL,
  base_visual_fields_hash text NOT NULL,
  base_provenance_hash text NOT NULL,
  requested_missing_fields text[] NOT NULL,
  new_values_only jsonb NOT NULL,
  confidence_per_new_field jsonb NOT NULL,
  provenance_per_new_field jsonb NOT NULL,
  source_manifest_digest text NOT NULL,
  source_artifact_reference jsonb NOT NULL,
  registered_at timestamptz NOT NULL DEFAULT now(),
  retired_at timestamptz,
  CONSTRAINT fabric_visual_overlay_hashes CHECK (
    base_visual_fields_hash ~ '^[a-f0-9]{64}$'
    AND base_provenance_hash ~ '^[a-f0-9]{64}$'
    AND source_manifest_digest ~ '^[a-f0-9]{64}$'
    AND approved_image_hash ~ '^[a-f0-9]{64}$'
  ),
  CONSTRAINT fabric_visual_overlay_identity CHECK (
    length(trim(supplier_id)) > 0 AND length(trim(supplier_sku)) > 0
    AND length(trim(brand_id)) > 0 AND length(trim(design_id)) > 0
    AND approved_image_type IN ('MAIN','SWATCH','DETAIL','ROOM','ADDITIONAL')
    AND approved_image_url ~ '^https://cdn[.]shopify[.]com/[^?#]+$'
  ),
  CONSTRAINT fabric_visual_overlay_source CHECK (
    jsonb_typeof(source_artifact_reference) = 'array'
    AND jsonb_array_length(source_artifact_reference) > 0
  ),
  CONSTRAINT fabric_visual_overlay_values CHECK (
    curtainsuk_private.fabric_visual_overlay_patch_valid(
      requested_missing_fields,new_values_only,
      confidence_per_new_field,provenance_per_new_field
    )
  ),
  CONSTRAINT fabric_visual_overlay_retirement CHECK (
    retired_at IS NULL OR retired_at >= registered_at
  )
);
CREATE UNIQUE INDEX fabric_visual_knowledge_patches_active_fabric
  ON curtainsuk_private.fabric_visual_knowledge_patches(fabric_id)
  WHERE retired_at IS NULL;

ALTER TABLE curtainsuk_private.fabric_visual_knowledge_patches ENABLE ROW LEVEL SECURITY;
ALTER TABLE curtainsuk_private.fabric_visual_knowledge_patches FORCE ROW LEVEL SECURITY;
REVOKE ALL ON curtainsuk_private.fabric_visual_knowledge_patches
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON curtainsuk_private.fabric_visual_knowledge_patches TO service_role;

CREATE VIEW curtainsuk_private.fabric_visual_knowledge_enriched
WITH (security_invoker = true) AS
SELECT k.fabric_id, k.supplier_id, k.supplier_sku, k.knowledge_state,
  CASE WHEN guard.can_apply THEN k.visual_fields || delta.observations
       ELSE k.visual_fields END AS visual_fields,
  CASE WHEN guard.can_apply THEN k.provenance || p.provenance_per_new_field
       ELSE k.provenance END AS provenance,
  k.refreshed_at
FROM curtainsuk_private.fabric_visual_knowledge_read_cache k
LEFT JOIN curtainsuk_private.fabric_visual_knowledge_patches p
  ON p.fabric_id = k.fabric_id AND p.retired_at IS NULL
LEFT JOIN curtainsuk_private.fabric_colourways c ON c.fabric_id = k.fabric_id
LEFT JOIN LATERAL (
  SELECT m.image_type, m.content_hash, a.shopify_cdn_url
  FROM curtainsuk_private.fabric_media_mappings m
  JOIN curtainsuk_private.fabric_media_assets a ON a.content_hash = m.content_hash
  WHERE p.patch_id IS NOT NULL
    AND m.fabric_id = k.fabric_id AND m.supplier_id = k.supplier_id
    AND m.supplier_sku = k.supplier_sku
    AND m.rights_state = 'APPROVED' AND m.mapping_state = 'VERIFIED'
    AND a.width > 0 AND a.height > 0
    AND a.shopify_cdn_url ~ '^https://cdn[.]shopify[.]com/[^?#]+$'
  ORDER BY CASE m.image_type WHEN 'MAIN' THEN 0 WHEN 'SWATCH' THEN 1
    WHEN 'DETAIL' THEN 2 WHEN 'ROOM' THEN 3 ELSE 4 END, m.content_hash
  LIMIT 1
) approved ON true
LEFT JOIN LATERAL (
  SELECT jsonb_object_agg(v.key,
    jsonb_build_object('value',v.value,'confidence',p.confidence_per_new_field->>v.key)
  ) AS observations
  FROM jsonb_each(p.new_values_only) AS v(key,value)
) delta ON p.patch_id IS NOT NULL
CROSS JOIN LATERAL (
  SELECT coalesce(
    p.patch_id IS NOT NULL
    AND k.knowledge_state = 'PARTIAL_GOVERNED'
    AND k.fabric_id = p.fabric_id
    AND k.supplier_id = p.supplier_id AND k.supplier_sku = p.supplier_sku
    AND c.supplier_id = p.supplier_id AND c.supplier_sku = p.supplier_sku
    AND c.brand_id = p.brand_id AND c.design_id = p.design_id
    AND c.staging_catalog_visible AND c.lifecycle_state <> 'DISCONTINUED'
    AND length(trim(c.supplier_sku)) > 0 AND length(trim(c.colour_name)) > 0
    AND length(trim(c.brand_id)) > 0 AND length(trim(c.design_id)) > 0
    AND approved.image_type = p.approved_image_type
    AND approved.content_hash = p.approved_image_hash
    AND approved.shopify_cdn_url = p.approved_image_url
    AND encode(extensions.digest(k.visual_fields::text,'sha256'),'hex') = p.base_visual_fields_hash
    AND encode(extensions.digest(k.provenance::text,'sha256'),'hex') = p.base_provenance_hash
    AND curtainsuk_private.fabric_visual_overlay_patch_valid(
      p.requested_missing_fields,p.new_values_only,
      p.confidence_per_new_field,p.provenance_per_new_field)
    AND NOT EXISTS (
      SELECT 1 FROM unnest(p.requested_missing_fields) AS requested(field_name)
      WHERE k.visual_fields->requested.field_name->>'confidence' IS DISTINCT FROM 'REVIEW'
         OR CASE
           WHEN requested.field_name IN ('secondaryColours','motif','visualSurface','character')
             THEN jsonb_typeof(k.visual_fields->requested.field_name->'value') = 'array'
               AND jsonb_array_length(k.visual_fields->requested.field_name->'value') = 0
           ELSE jsonb_typeof(k.visual_fields->requested.field_name->'value') = 'string'
             AND k.visual_fields->requested.field_name->>'value' = 'unknown'
         END IS DISTINCT FROM true
    ), false
  ) AS can_apply
) guard;

REVOKE ALL ON curtainsuk_private.fabric_visual_knowledge_enriched
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON curtainsuk_private.fabric_visual_knowledge_enriched TO service_role;

-- An empty table produces no trigger event and no Browse refresh.
-- Future INSERT/UPDATE/DELETE/TRUNCATE marks a single global dirty row.
-- Existing browse_projection_refresh_dirty() then performs one full reconciliation.
CREATE TRIGGER browse_projection_patch_global_dirty
  AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE
  ON curtainsuk_private.fabric_visual_knowledge_patches
  FOR EACH STATEMENT
  EXECUTE FUNCTION curtainsuk_private.browse_projection_mark_global_dirty();
