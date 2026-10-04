
-- Run only after the full 1,359-fabric read-only reconciliation succeeds.
-- Each invocation atomically activates the six cross-artifact canaries or the
-- next 100 staged registrations, refreshes FI cache, and targets Browse rows.
-- Re-running after completion is a no-op. Never run against a changed baseline.
BEGIN;
SET LOCAL statement_timeout = '8min';
SET LOCAL lock_timeout = '5s';
SET LOCAL application_name = 'curtainsuk_hybrid_publish_batch';
DO $publication$
DECLARE
  target_ids text[];
  batch_label text;
  batch_size integer;
  changed_ids text[];
  initial_generation uuid;
  initial_browse_count bigint;
  cache_stamp timestamptz;
  refresh_result jsonb;
  bad_count bigint;
BEGIN
  IF NOT pg_try_advisory_xact_lock(4252026,9248) THEN
    RAISE EXCEPTION 'BROWSE_LOCK_UNAVAILABLE';
  END IF;
  LOCK TABLE curtainsuk_private.browse_projection_dirty IN SHARE ROW EXCLUSIVE MODE NOWAIT;
  LOCK TABLE curtainsuk_private.fabric_hybrid_registrations IN SHARE ROW EXCLUSIVE MODE NOWAIT;
  LOCK TABLE curtainsuk_private.fabric_colourways,
    curtainsuk_private.fabric_media_mappings,
    curtainsuk_private.fabric_media_assets,
    curtainsuk_private.fabric_visual_enrichment_ledger,
    curtainsuk_private.fabric_visual_enrichment_failures,
    curtainsuk_private.fabric_visual_knowledge_patches IN SHARE MODE NOWAIT;
  IF (SELECT count(*) FROM curtainsuk_private.fabric_hybrid_registrations)<>1358 THEN
    RAISE EXCEPTION 'STAGED_COHORT_CHANGED_RECONCILE_AGAIN';
  END IF;
  IF (SELECT count(*) FROM curtainsuk_private.fabric_hybrid_registrations WHERE active)=0 THEN
    target_ids:=ARRAY['sdg-ccf0865-01','sdg-ccf0865-02','sdg-ccf0871-02','sdg-ddvc237000','sdg-ddvc237003','sdg-ddvc237021']::text[];
    batch_label:='canary';
  ELSE
    IF (SELECT count(*) FROM curtainsuk_private.fabric_hybrid_registrations
        WHERE fabric_id=ANY(ARRAY['sdg-ccf0865-01','sdg-ccf0865-02','sdg-ccf0871-02',
          'sdg-ddvc237000','sdg-ddvc237003','sdg-ddvc237021']::text[]) AND active)<>6 THEN
      RAISE EXCEPTION 'CANARY_COHORT_INCOMPLETE';
    END IF;
    SELECT array_agg(fabric_id ORDER BY fabric_id) INTO target_ids FROM (
      SELECT fabric_id FROM curtainsuk_private.fabric_hybrid_registrations
      WHERE NOT active AND retired_at IS NULL ORDER BY fabric_id LIMIT 100
    ) queued;
    batch_label:='bounded';
  END IF;
  IF target_ids IS NULL THEN
    RAISE NOTICE 'HYBRID_BATCH_NOOP: no inactive staged registrations';
    RETURN;
  END IF;
  batch_size:=cardinality(target_ids);
  SELECT active_generation INTO initial_generation
    FROM curtainsuk_private.browse_projection_control WHERE singleton FOR UPDATE;
  SELECT count(*) INTO initial_browse_count FROM curtainsuk_private.browse_read_projection;
  IF batch_size<1 OR batch_size>100 OR
     (SELECT count(DISTINCT id) FROM unnest(target_ids) id) <> batch_size OR
     (SELECT count(*) FROM curtainsuk_private.browse_projection_dirty) <> 0 OR
     md5(pg_get_viewdef('curtainsuk_private.fabric_visual_knowledge'::regclass,true))
       <> '9d144f2ce0ca8aa81b9f7c9ad4a27ab2' OR
     initial_generation IS NULL OR initial_browse_count <> 11815 OR
     EXISTS (SELECT 1 FROM curtainsuk_private.browse_projection_control WHERE singleton AND
       (knowledge_cache_dirty OR knowledge_cache_refreshed_at IS DISTINCT FROM
          (SELECT max(refreshed_at) FROM curtainsuk_private.fabric_visual_knowledge_read_cache)
        OR now() >= next_time_change_at)) OR
     EXISTS (SELECT 1 FROM curtainsuk_private.supplier_sync_runs
       WHERE adapter_id IN ('sdg-portal-product-detail','pt-webtex-stock-enquiry')
         AND created_at >= clock_timestamp()-interval '3 minutes')
  THEN RAISE EXCEPTION 'UNCLEAN_PUBLICATION_BASELINE'; END IF;

  CREATE TEMP TABLE fi_before ON COMMIT DROP AS
    SELECT fabric_id,supplier_id,supplier_sku,knowledge_state,visual_fields,provenance
    FROM curtainsuk_private.fabric_visual_knowledge_read_cache;
  CREATE UNIQUE INDEX fi_before_id ON fi_before(fabric_id);

  -- All staged source documents, native baselines, image bindings, catalogue
  -- identities and every proposed missing field are checked again under lock.
  SELECT count(*) INTO bad_count
  FROM curtainsuk_private.fabric_hybrid_registrations r
  JOIN curtainsuk_private.fabric_hybrid_documents d ON d.document_id=r.document_id
  JOIN curtainsuk_private.fabric_hybrid_artifacts artifact
    ON artifact.run_id=r.run_id AND artifact.artifact_id=r.artifact_id
  JOIN fi_before k ON k.fabric_id=r.fabric_id
  JOIN curtainsuk_private.fabric_colourways c ON c.fabric_id=r.fabric_id
  LEFT JOIN curtainsuk_private.fabric_visual_knowledge_patches p
    ON p.fabric_id=r.fabric_id AND p.retired_at IS NULL
  LEFT JOIN LATERAL (
    SELECT m.image_type,m.content_hash,a.shopify_cdn_url
    FROM curtainsuk_private.fabric_media_mappings m
    JOIN curtainsuk_private.fabric_media_assets a ON a.content_hash=m.content_hash
    WHERE m.fabric_id=r.fabric_id AND m.supplier_id=r.supplier_id
      AND m.supplier_sku=r.supplier_sku AND m.rights_state='APPROVED'
      AND m.mapping_state='VERIFIED' AND a.width>0 AND a.height>0
      AND a.shopify_cdn_url ~ '^https://cdn[.]shopify[.]com/[^?#]+$'
    ORDER BY CASE m.image_type WHEN 'MAIN' THEN 0 WHEN 'SWATCH' THEN 1
      WHEN 'DETAIL' THEN 2 WHEN 'ROOM' THEN 3 ELSE 4 END,m.content_hash LIMIT 1
  ) approved ON true
  WHERE r.fabric_id=ANY(target_ids) AND
    (r.active OR r.retired_at IS NOT NULL OR r.activated_at IS NOT NULL OR
     p.patch_id IS NOT NULL OR k.knowledge_state <> 'PENDING_EXTERNAL_RETRY' OR
     k.supplier_id IS DISTINCT FROM r.supplier_id OR
     k.supplier_sku IS DISTINCT FROM r.supplier_sku OR
     c.supplier_id IS DISTINCT FROM r.supplier_id OR
     c.supplier_sku IS DISTINCT FROM r.supplier_sku OR
     c.brand_id IS DISTINCT FROM r.brand_id OR
     c.design_id IS DISTINCT FROM r.design_id OR
     c.staging_catalog_visible IS DISTINCT FROM true OR
     c.lifecycle_state='DISCONTINUED' OR
     length(trim(c.supplier_sku))=0 OR length(trim(c.colour_name))=0 OR
     length(trim(c.brand_id))=0 OR length(trim(c.design_id))=0 OR
     approved.image_type IS DISTINCT FROM r.approved_image_type OR
     approved.content_hash IS DISTINCT FROM r.approved_image_hash OR
     approved.shopify_cdn_url IS DISTINCT FROM r.approved_image_url OR
     artifact.completed_successfully IS DISTINCT FROM true OR
     artifact.source_manifest_sha256 IS DISTINCT FROM
       'e31c872b24468d617cba5b485e38e9c4b8ef080e6001cea0bd5b8a0031cc63fd' OR
     NOT EXISTS (SELECT 1 FROM curtainsuk_private.fabric_visual_enrichment_failures f
       WHERE f.supplier_id=r.supplier_id AND f.context->>'design_id'=r.design_id
         AND f.failure_reason='OPENAI_RESPONSE_429') OR
     EXISTS (SELECT 1 FROM curtainsuk_private.fabric_visual_enrichment_failures f
       WHERE f.supplier_id=r.supplier_id AND f.context->>'design_id'=r.design_id
         AND f.failure_reason='OPENAI_RESPONSE_429' AND f.failed_at>=artifact.started_at) OR
     encode(extensions.digest(k.visual_fields::text,'sha256'),'hex') <> r.baseline_visual_hash OR
     encode(extensions.digest(k.provenance::text,'sha256'),'hex') <> r.baseline_provenance_hash OR
     d.run_id IS DISTINCT FROM r.run_id OR d.artifact_id IS DISTINCT FROM r.artifact_id OR
     d.fabric_id IS DISTINCT FROM r.fabric_id OR
     encode(extensions.digest(convert_to(d.source_document_text,'UTF8'),'sha256'),'hex') <> d.source_sha256 OR
     COALESCE(d.source_document_text::jsonb->'final_v1_compatible_reading',
       d.source_document_text::jsonb->'v1_compatible_reading') IS DISTINCT FROM r.candidate OR
     r.source_manifest_entry->'provenance' IS DISTINCT FROM r.raw_field_provenance OR
     r.source_analysis_at IS NOT NULL OR
     NOT ((r.review_state='AUTO_APPROVED' AND r.approval_state='APPROVED') OR
       (r.review_state='REVIEW_REQUIRED' AND r.approval_state='PROPOSED')) OR
     EXISTS (SELECT 1 FROM jsonb_each(r.delta_observations) proposed(key,value)
       WHERE (k.visual_fields->proposed.key->>'confidence') IS DISTINCT FROM 'REVIEW'
         OR (CASE WHEN proposed.key IN ('secondaryColours','motif','visualSurface','character')
              THEN k.visual_fields->proposed.key->'value'='[]'::jsonb
              ELSE k.visual_fields->proposed.key->'value'='"unknown"'::jsonb END) IS DISTINCT FROM true
         OR r.candidate->'observations'->proposed.key IS DISTINCT FROM proposed.value
          OR COALESCE(r.raw_field_provenance->proposed.key->>'source_basis',
               r.raw_field_provenance->>proposed.key)
             IS DISTINCT FROM r.delta_provenance_basis->>proposed.key)
    );
  IF bad_count<>0 OR
     (SELECT count(*) FROM curtainsuk_private.fabric_hybrid_registrations
      WHERE fabric_id=ANY(target_ids))<>batch_size OR
      (SELECT count(*) FROM fi_before WHERE fabric_id=ANY(target_ids))<>batch_size
  THEN RAISE EXCEPTION 'LIVE_SOURCE_GUARD_FAILED: %',bad_count; END IF;

  UPDATE curtainsuk_private.fabric_hybrid_registrations
    SET active=true,activated_at=clock_timestamp()
    WHERE fabric_id=ANY(target_ids) AND NOT active AND retired_at IS NULL;
  SELECT array_agg(fabric_id ORDER BY fabric_id) INTO changed_ids
    FROM curtainsuk_private.fabric_hybrid_registrations
    WHERE fabric_id=ANY(target_ids) AND active;
  IF changed_ids IS DISTINCT FROM
     (SELECT array_agg(id ORDER BY id) FROM unnest(target_ids) id) OR
     (SELECT count(*) FROM curtainsuk_private.fabric_hybrid_registration_events e
      JOIN curtainsuk_private.fabric_hybrid_registrations r USING(registration_id)
       WHERE r.fabric_id=ANY(target_ids) AND e.event_kind='ACTIVATED')<>batch_size
  THEN RAISE EXCEPTION 'REGISTRATION_ACTIVATION_MISMATCH'; END IF;
  IF (SELECT count(*) FROM curtainsuk_private.browse_projection_dirty)<>0 OR
     NOT (SELECT knowledge_cache_dirty FROM curtainsuk_private.browse_projection_control WHERE singleton)
  THEN RAISE EXCEPTION 'UNEXPECTED_DIRTY_STATE_AFTER_ACTIVATION'; END IF;

  REFRESH MATERIALIZED VIEW CONCURRENTLY curtainsuk_private.fabric_visual_knowledge_read_cache;
  SELECT count(*) INTO bad_count FROM fi_before b
  FULL JOIN curtainsuk_private.fabric_visual_knowledge_read_cache a USING(fabric_id)
  LEFT JOIN curtainsuk_private.fabric_hybrid_registrations r
    ON r.fabric_id=a.fabric_id AND r.fabric_id=ANY(target_ids)
  WHERE b.fabric_id IS NULL OR a.fabric_id IS NULL OR
    a.supplier_id IS DISTINCT FROM b.supplier_id OR
    a.supplier_sku IS DISTINCT FROM b.supplier_sku OR
    (b.fabric_id=ANY(target_ids) AND (
       a.knowledge_state IS DISTINCT FROM
         (CASE WHEN r.review_state='AUTO_APPROVED' THEN 'COMPLETE' ELSE 'PARTIAL_GOVERNED' END) OR
       a.visual_fields IS DISTINCT FROM (b.visual_fields||r.delta_observations) OR
       a.provenance IS DISTINCT FROM (b.provenance||r.delta_provenance_basis))) OR
    (NOT b.fabric_id=ANY(target_ids) AND (
       a.knowledge_state IS DISTINCT FROM b.knowledge_state OR
       a.visual_fields IS DISTINCT FROM b.visual_fields OR
       a.provenance IS DISTINCT FROM b.provenance));
  IF bad_count<>0 THEN RAISE EXCEPTION 'FI_CACHE_PARITY_FAILURE: %',bad_count; END IF;
  IF (SELECT count(*) FROM curtainsuk_private.fabric_visual_knowledge_read_cache a
      JOIN fi_before b USING(fabric_id) WHERE a.knowledge_state IS DISTINCT FROM b.knowledge_state)
      <>batch_size THEN RAISE EXCEPTION 'STATE_TRANSITION_COUNT_FAILURE'; END IF;
  IF (SELECT count(*) FROM curtainsuk_private.browse_projection_dirty)<>0
  THEN RAISE EXCEPTION 'OTHER_BROWSE_DIRTY_MARKER'; END IF;
  SELECT max(refreshed_at) INTO cache_stamp
    FROM curtainsuk_private.fabric_visual_knowledge_read_cache;
  UPDATE curtainsuk_private.browse_projection_control
    SET knowledge_cache_refreshed_at=cache_stamp,knowledge_cache_dirty=false
    WHERE singleton;
  INSERT INTO curtainsuk_private.browse_projection_dirty(fabric_id)
    SELECT unnest(changed_ids);
  IF EXISTS(SELECT 1 FROM curtainsuk_private.browse_projection_dirty WHERE fabric_id='*') OR
     EXISTS(SELECT 1 FROM curtainsuk_private.browse_projection_control WHERE singleton AND
       (active_generation IS DISTINCT FROM initial_generation OR knowledge_cache_dirty OR
        knowledge_cache_refreshed_at IS DISTINCT FROM
          (SELECT max(refreshed_at) FROM curtainsuk_private.fabric_visual_knowledge_read_cache) OR
        now()>=next_time_change_at))
  THEN RAISE EXCEPTION 'TARGETED_PATH_PRECONDITION_FAILED'; END IF;
  refresh_result:=curtainsuk_private.browse_projection_refresh_dirty(500);
  IF refresh_result ? 'skipped' OR refresh_result ? 'count' OR
      (refresh_result->>'refreshed')::integer IS DISTINCT FROM batch_size OR
     refresh_result->>'generation' IS DISTINCT FROM initial_generation::text
  THEN RAISE EXCEPTION 'TARGETED_BROWSE_REFRESH_FAILED: %',refresh_result; END IF;
  -- refresh_dirty changes only changed_ids by definition; verify every target
  -- exists in the unchanged generation. Full FI row parity was checked above.
  IF (SELECT count(*) FROM curtainsuk_private.browse_read_projection
      WHERE generation_id=initial_generation AND fabric_id=ANY(changed_ids))<>batch_size
  THEN RAISE EXCEPTION 'TARGETED_BROWSE_IDS_MISSING'; END IF;
  IF (SELECT count(*) FROM curtainsuk_private.browse_read_projection)<>initial_browse_count OR
     EXISTS(SELECT 1 FROM curtainsuk_private.browse_projection_dirty) OR
     EXISTS(SELECT 1 FROM curtainsuk_private.browse_projection_control
       WHERE singleton AND (active_generation IS DISTINCT FROM initial_generation OR knowledge_cache_dirty))
  THEN RAISE EXCEPTION 'FINAL_BROWSE_CONTROL_FAILED'; END IF;
  RAISE NOTICE 'HYBRID_BATCH_RECEIPT: %',
     jsonb_build_object('batch',batch_label,'activated',cardinality(changed_ids),
      'targeted_refresh',refresh_result,'browse_rows',initial_browse_count,
      'dirty',0,'cache_stamp',cache_stamp);
END $publication$;
COMMIT;
SELECT jsonb_build_object('batch','current',
  'active_hybrid',(SELECT count(*) FROM curtainsuk_private.fabric_hybrid_registrations WHERE active),
  'pending',(SELECT count(*) FROM curtainsuk_private.fabric_visual_knowledge_read_cache
    WHERE knowledge_state='PENDING_EXTERNAL_RETRY'),
  'browse_rows',(SELECT count(*) FROM curtainsuk_private.browse_read_projection),
  'dirty',(SELECT count(*) FROM curtainsuk_private.browse_projection_dirty),
  'control',(SELECT jsonb_build_object('generation',active_generation,
    'knowledge_cache_dirty',knowledge_cache_dirty) FROM curtainsuk_private.browse_projection_control
    WHERE singleton)) AS publication_receipt;
