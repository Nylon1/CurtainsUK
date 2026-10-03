-- Authorized retry predicate correction only, with atomic cache and targeted Browse reconciliation.
-- No ledger, patch, failure-history, registration-contract or application changes.
SET LOCAL statement_timeout='5min';
SET LOCAL lock_timeout='5s';
SET LOCAL application_name='curtainsuk_retry_predicate_recovery_20261003';
DO $recovery$
DECLARE initial_generation uuid; expected_ids text[]:=ARRAY['sdg-f0753-01','sdg-f0753-02','sdg-f0753-03','sdg-f0753-04','sdg-f0753-05','sdg-f0753-06','sdg-f0753-07','sdg-f0753-08','sdg-f0753-09','sdg-f0753-10','sdg-f0753-100','sdg-f0753-101','sdg-f0753-11','sdg-f0753-12','sdg-f0753-13','sdg-f0753-14','sdg-f0753-15','sdg-f0753-16','sdg-f0753-17','sdg-f0753-18','sdg-f0753-19','sdg-f0753-20','sdg-f0753-21','sdg-f0753-22','sdg-f0753-23','sdg-f0753-24','sdg-f0753-25','sdg-f0753-26','sdg-f0753-27','sdg-f0753-28','sdg-f0753-29','sdg-f0753-30','sdg-f0753-31','sdg-f0753-32','sdg-f0753-33','sdg-f0753-34','sdg-f0753-35','sdg-f0753-36','sdg-f0753-37','sdg-f0753-38','sdg-f0753-39','sdg-f0753-40','sdg-f0753-41','sdg-f0753-42','sdg-f0753-43','sdg-f0753-44','sdg-f0753-45','sdg-f0753-46','sdg-f0753-47','sdg-f0753-48','sdg-f0753-49','sdg-f0753-50','sdg-f0753-51','sdg-f0753-52','sdg-f0753-53','sdg-f0753-54','sdg-f0753-55','sdg-f0753-56','sdg-f0753-57','sdg-f0753-58','sdg-f0753-59','sdg-f0753-60','sdg-f0753-61','sdg-f0753-62','sdg-f0753-63','sdg-f0753-64','sdg-f0753-65','sdg-f0753-66','sdg-f0753-67','sdg-f0753-68','sdg-f0753-69','sdg-f0753-70','sdg-f0753-71','sdg-f0753-72','sdg-f0753-73','sdg-f0753-74','sdg-f0753-75','sdg-f0753-76','sdg-f0753-77','sdg-f0753-78','sdg-f0753-79','sdg-f0753-80','sdg-f0753-81','sdg-f0753-82','sdg-f0753-83','sdg-f0753-84','sdg-f0753-85','sdg-f0753-86','sdg-f0753-87','sdg-f0753-88','sdg-f0753-89','sdg-f0753-90','sdg-f0753-91','sdg-f0753-92','sdg-f0753-93','sdg-f0753-94','sdg-f0753-95','sdg-f0753-96','sdg-f0753-97','sdg-f0753-98','sdg-f0753-99','sdg-f1239-01','sdg-f1239-02','sdg-f1239-03','sdg-f1239-04','sdg-f1239-05','sdg-f1239-06','sdg-f1239-07','sdg-f1239-08','sdg-f1239-09','sdg-f1239-10','sdg-f1239-11','sdg-f1239-12','sdg-f1239-13','sdg-f1239-14','sdg-f1239-15','sdg-f1239-16','sdg-f1239-17','sdg-f1239-18','sdg-f1239-19','sdg-f1239-20','sdg-f1239-21','sdg-f1239-22','sdg-f1239-23','sdg-f1239-24','sdg-f1239-25','sdg-f1239-26','sdg-f1239-27','sdg-f1239-28','sdg-f1239-29','sdg-f1239-30','sdg-f1239-31','sdg-f1239-32','sdg-f1239-33','sdg-f1239-34','sdg-f1239-35','sdg-f1239-36','sdg-f1239-37','sdg-f1239-38','sdg-f1239-39','sdg-f1239-40','sdg-f1239-41','sdg-f1239-42','sdg-f1239-43','sdg-f1239-44','sdg-f1239-45','sdg-f1239-46','sdg-f1239-47','sdg-f1239-48','sdg-f1239-49','sdg-f1239-50','sdg-f1239-51','sdg-f1239-52','sdg-f1239-53','sdg-f1239-54','sdg-f1239-55','sdg-f1239-56','sdg-f1239-57','sdg-f1239-58','sdg-f1239-59','sdg-f1239-60','sdg-f1239-61','sdg-f1239-62','sdg-f1239-63','sdg-f1239-64','sdg-f1239-65','sdg-f1239-66','sdg-f1320-01','sdg-f1320-02','sdg-f1320-03','sdg-f1320-04','sdg-f1320-05','sdg-f1320-06','sdg-f1320-07','sdg-f1321-01','sdg-f1321-02','sdg-f1321-03','sdg-f1321-04','sdg-f1321-05','sdg-f1321-06','sdg-f1787-01','sdg-f1787-02','sdg-f1787-03','sdg-f1787-04','sdg-f1787-05','sdg-f1787-06','sdg-f1788-01','sdg-f1788-02','sdg-f1788-03','sdg-f1788-04','sdg-f1788-05','sdg-f1788-06','sdg-f1788-07','sdg-f1788-08','sdg-f1788-09','sdg-f1788-10','sdg-f1788-11','sdg-f1790-01','sdg-f1790-02','sdg-f1790-03','sdg-f1790-04','sdg-f1790-05']::text[];
 changed_ids text[]; refresh_result jsonb; audit_result jsonb; rpc_result jsonb;
 source_differences bigint; cache_stamp timestamptz; initial_acl text; initial_owner oid; initial_options text;
BEGIN
 IF NOT pg_try_advisory_xact_lock(4252026,9248) THEN RAISE EXCEPTION 'BROWSE_LOCK_UNAVAILABLE_NO_WRITES'; END IF;
 LOCK TABLE curtainsuk_private.browse_projection_dirty IN SHARE ROW EXCLUSIVE MODE NOWAIT;
 LOCK TABLE curtainsuk_private.fabric_visual_enrichment_ledger,curtainsuk_private.fabric_visual_enrichment_failures,curtainsuk_private.fabric_visual_knowledge_patches IN SHARE MODE NOWAIT;
 IF EXISTS(SELECT 1 FROM curtainsuk_private.browse_projection_dirty) THEN RAISE EXCEPTION 'PREEXISTING_DIRTY_NO_WRITES'; END IF;
 IF EXISTS(SELECT 1 FROM curtainsuk_private.supplier_sync_runs WHERE adapter_id IN ('sdg-portal-product-detail','pt-webtex-stock-enquiry') AND created_at>=clock_timestamp()-interval '3 minutes') THEN RAISE EXCEPTION 'SUPPLIER_STOCK_ACTIVE_NO_WRITES'; END IF;
 SELECT active_generation INTO initial_generation FROM curtainsuk_private.browse_projection_control WHERE singleton FOR UPDATE;
 IF initial_generation IS NULL OR EXISTS(SELECT 1 FROM curtainsuk_private.browse_projection_control WHERE singleton AND (knowledge_cache_dirty OR knowledge_cache_refreshed_at IS DISTINCT FROM (SELECT max(refreshed_at) FROM curtainsuk_private.fabric_visual_knowledge_read_cache) OR now()>=next_time_change_at)) THEN RAISE EXCEPTION 'BASELINE_CACHE_NOT_CLEAN'; END IF;
 IF (SELECT count(*) FROM curtainsuk_private.browse_read_projection)<>11815 OR EXISTS(SELECT 1 FROM curtainsuk_private.browse_read_projection WHERE generation_id<>initial_generation) THEN RAISE EXCEPTION 'BROWSE_BASELINE_CHANGED'; END IF;
 IF md5(pg_get_viewdef('curtainsuk_private.fabric_visual_knowledge'::regclass,true))<>'c744561bcacc79e5dbfdd9fcad80fdd3' THEN RAISE EXCEPTION 'VIEW_CHANGED_SINCE_PROOF'; END IF;
 SELECT relacl::text,relowner,reloptions::text INTO initial_acl,initial_owner,initial_options FROM pg_class WHERE oid='curtainsuk_private.fabric_visual_knowledge'::regclass;
 rpc_result:=curtainsuk_private.search_retail_fabrics_prepared_v1('{}'::jsonb,1,24,null,null);
 IF (rpc_result->>'total')::integer<>11815 OR jsonb_array_length(rpc_result->'ids')<>24 THEN RAISE EXCEPTION 'BASELINE_RPC_FAILED'; END IF;
 CREATE TEMP TABLE fi_retry_before ON COMMIT DROP AS SELECT * FROM curtainsuk_private.fabric_visual_knowledge_read_cache;
 CREATE TEMP TABLE fi_retry_browse_unaffected ON COMMIT DROP AS SELECT fabric_id,md5(to_jsonb(p)::text) row_hash FROM curtainsuk_private.browse_read_projection p WHERE NOT fabric_id=ANY(expected_ids);
 IF (SELECT count(*) FROM fi_retry_before)<>11815 OR (SELECT count(*) FROM fi_retry_before WHERE knowledge_state='PENDING_EXTERNAL_RETRY')<>1561 OR (SELECT count(*) FROM fi_retry_before WHERE fabric_id=ANY(expected_ids) AND knowledge_state='PENDING_EXTERNAL_RETRY')<>202 THEN RAISE EXCEPTION 'EXPECTED_STATE_BASELINE_CHANGED'; END IF;
 EXECUTE $view$CREATE OR REPLACE VIEW curtainsuk_private.fabric_visual_knowledge AS WITH scope AS (
         SELECT fabric_visual_enrichment_scope.fabric_id,
            fabric_visual_enrichment_scope.supplier_id,
            fabric_visual_enrichment_scope.supplier_sku,
            fabric_visual_enrichment_scope.brand_id,
            fabric_visual_enrichment_scope.design_id,
            fabric_visual_enrichment_scope.image_type,
            fabric_visual_enrichment_scope.source_image_hash
           FROM curtainsuk_private.fabric_visual_enrichment_scope('CANONICAL_APPROVED_IMAGE'::text) fabric_visual_enrichment_scope(fabric_id, supplier_id, supplier_sku, brand_id, design_id, image_type, source_image_hash, source_image_url, source_image_rank, useful_image_count, already_approved, current_visual_digest, current_review_state, image_changed_after_analysis)
        ), designs AS (
         SELECT DISTINCT ON (fabric_visual_enrichment_ledger.supplier_id, fabric_visual_enrichment_ledger.brand_id, fabric_visual_enrichment_ledger.design_id) fabric_visual_enrichment_ledger.supplier_id,
            fabric_visual_enrichment_ledger.brand_id,
            fabric_visual_enrichment_ledger.design_id,
            fabric_visual_enrichment_ledger.ledger_id,
            fabric_visual_enrichment_ledger.output,
            fabric_visual_enrichment_ledger.approval_state,
            fabric_visual_enrichment_ledger.review_state,
            fabric_visual_enrichment_ledger.field_provenance
           FROM curtainsuk_private.fabric_visual_enrichment_ledger
          WHERE fabric_visual_enrichment_ledger.analysis_level = 'DESIGN'::text AND fabric_visual_enrichment_ledger.superseded_at IS NULL
          ORDER BY fabric_visual_enrichment_ledger.supplier_id, fabric_visual_enrichment_ledger.brand_id, fabric_visual_enrichment_ledger.design_id, fabric_visual_enrichment_ledger.imported_at DESC
        ), colourways AS (
         SELECT DISTINCT ON (fabric_visual_enrichment_ledger.fabric_id) fabric_visual_enrichment_ledger.fabric_id,
            fabric_visual_enrichment_ledger.ledger_id,
            fabric_visual_enrichment_ledger.output,
            fabric_visual_enrichment_ledger.approval_state,
            fabric_visual_enrichment_ledger.review_state,
            fabric_visual_enrichment_ledger.field_provenance
           FROM curtainsuk_private.fabric_visual_enrichment_ledger
          WHERE fabric_visual_enrichment_ledger.analysis_level = 'COLOURWAY'::text AND fabric_visual_enrichment_ledger.superseded_at IS NULL
          ORDER BY fabric_visual_enrichment_ledger.fabric_id, fabric_visual_enrichment_ledger.imported_at DESC
        ), resolved AS (
         SELECT DISTINCT ON (fabric_visual_enrichment_ledger.fabric_id) fabric_visual_enrichment_ledger.fabric_id,
            fabric_visual_enrichment_ledger.ledger_id,
            fabric_visual_enrichment_ledger.output,
            fabric_visual_enrichment_ledger.approval_state,
            fabric_visual_enrichment_ledger.review_state,
            fabric_visual_enrichment_ledger.field_provenance
           FROM curtainsuk_private.fabric_visual_enrichment_ledger
          WHERE fabric_visual_enrichment_ledger.analysis_level = 'RESOLVED'::text AND fabric_visual_enrichment_ledger.superseded_at IS NULL
          ORDER BY fabric_visual_enrichment_ledger.fabric_id, fabric_visual_enrichment_ledger.imported_at DESC
        ), pending_designs AS (
         SELECT DISTINCT fabric_visual_enrichment_failures.supplier_id,
            fabric_visual_enrichment_failures.context ->> 'design_id'::text AS design_id
           FROM curtainsuk_private.fabric_visual_enrichment_failures
          WHERE fabric_visual_enrichment_failures.failure_reason = 'OPENAI_RESPONSE_429'::text
        ), joined AS (
         SELECT s.fabric_id,
            s.supplier_id,
            s.supplier_sku,
            s.brand_id,
            s.design_id,
            s.image_type,
            s.source_image_hash,
            d.ledger_id AS design_ledger_id,
            (d.output -> 'candidate'::text) -> 'observations'::text AS design_observations,
            (d.output -> 'candidate'::text) -> 'reviewFlags'::text AS design_review_flags,
            d.approval_state AS design_approval_state,
            d.field_provenance AS design_field_provenance,
            c.ledger_id AS colourway_ledger_id,
            (c.output -> 'candidate'::text) -> 'observations'::text AS colourway_observations,
            (c.output -> 'candidate'::text) -> 'reviewFlags'::text AS colourway_review_flags,
            c.approval_state AS colourway_approval_state,
            c.field_provenance AS colourway_field_provenance,
            r.ledger_id AS resolved_ledger_id,
            (r.output -> 'candidate'::text) -> 'observations'::text AS resolved_observations,
            (r.output -> 'candidate'::text) -> 'reviewFlags'::text AS resolved_review_flags,
            r.approval_state AS resolved_approval_state,
            r.review_state AS resolved_review_state,
            r.output -> 'fieldProvenance'::text AS resolved_field_provenance,
            (EXISTS (
                SELECT 1
                FROM curtainsuk_private.fabric_visual_enrichment_failures f
                WHERE f.failure_reason = 'OPENAI_RESPONSE_429'
                  AND f.supplier_id = s.supplier_id
                  AND f.context ->> 'design_id' = s.design_id
                  AND NOT EXISTS (
                    SELECT 1
                    FROM curtainsuk_private.fabric_visual_enrichment_ledger recovery
                    JOIN curtainsuk_private.fabric_media_assets asset
                      ON asset.content_hash = s.source_image_hash
                    WHERE recovery.ledger_id = r.ledger_id
                      AND recovery.analysis_level = 'RESOLVED'
                      AND recovery.superseded_at IS NULL
                      AND recovery.fabric_id = s.fabric_id
                      AND recovery.supplier_id = s.supplier_id
                      AND recovery.supplier_sku = s.supplier_sku
                      AND recovery.brand_id = s.brand_id
                      AND recovery.design_id = s.design_id
                      AND recovery.image_type = s.image_type
                      AND recovery.source_image_hash = s.source_image_hash
                      AND recovery.source_image_url = asset.shopify_cdn_url
                      AND recovery.failure_reason IS NULL
                      AND recovery.analysed_at > f.failed_at
                      AND (
                        (recovery.approval_state = 'APPROVED'
                         AND recovery.review_state IN ('AUTO_APPROVED','HUMAN_APPROVED'))
                        OR (recovery.approval_state = 'PROPOSED'
                            AND recovery.review_state = 'REVIEW_REQUIRED')
                      )
                  )
            )) AS pending_retry
           FROM scope s
             LEFT JOIN designs d USING (supplier_id, brand_id, design_id)
             LEFT JOIN colourways c USING (fabric_id)
             LEFT JOIN resolved r USING (fabric_id)
        ), fields AS (
         SELECT j.fabric_id,
            j.supplier_id,
            j.supplier_sku,
            j.brand_id,
            j.design_id,
            j.image_type,
            j.source_image_hash,
            j.design_ledger_id,
            j.design_observations,
            j.design_review_flags,
            j.design_approval_state,
            j.design_field_provenance,
            j.colourway_ledger_id,
            j.colourway_observations,
            j.colourway_review_flags,
            j.colourway_approval_state,
            j.colourway_field_provenance,
            j.resolved_ledger_id,
            j.resolved_observations,
            j.resolved_review_flags,
            j.resolved_approval_state,
            j.resolved_review_state,
            j.resolved_field_provenance,
            j.pending_retry,
            jsonb_build_object('primaryColour', COALESCE(j.resolved_observations -> 'primaryColour'::text, j.colourway_observations -> 'primaryColour'::text, j.design_observations -> 'primaryColour'::text, '{"value": "unknown", "confidence": "REVIEW"}'::jsonb), 'secondaryColours', COALESCE(j.resolved_observations -> 'secondaryColours'::text, j.colourway_observations -> 'secondaryColours'::text, j.design_observations -> 'secondaryColours'::text, '{"value": [], "confidence": "REVIEW"}'::jsonb), 'colourTemperature', COALESCE(j.resolved_observations -> 'colourTemperature'::text, j.colourway_observations -> 'colourTemperature'::text, j.design_observations -> 'colourTemperature'::text, '{"value": "unknown", "confidence": "REVIEW"}'::jsonb), 'lightness', COALESCE(j.resolved_observations -> 'lightness'::text, j.colourway_observations -> 'lightness'::text, j.design_observations -> 'lightness'::text, '{"value": "unknown", "confidence": "REVIEW"}'::jsonb), 'saturation', COALESCE(j.resolved_observations -> 'saturation'::text, j.colourway_observations -> 'saturation'::text, j.design_observations -> 'saturation'::text, '{"value": "unknown", "confidence": "REVIEW"}'::jsonb), 'contrast', COALESCE(j.resolved_observations -> 'contrast'::text, j.colourway_observations -> 'contrast'::text, j.design_observations -> 'contrast'::text, '{"value": "unknown", "confidence": "REVIEW"}'::jsonb), 'colourComplexity', COALESCE(j.resolved_observations -> 'colourComplexity'::text, j.colourway_observations -> 'colourComplexity'::text, j.design_observations -> 'colourComplexity'::text, '{"value": "unknown", "confidence": "REVIEW"}'::jsonb), 'patternClass', COALESCE(j.resolved_observations -> 'patternClass'::text, j.design_observations -> 'patternClass'::text, j.colourway_observations -> 'patternClass'::text, '{"value": "unknown", "confidence": "REVIEW"}'::jsonb), 'motif', COALESCE(j.resolved_observations -> 'motif'::text, j.design_observations -> 'motif'::text, j.colourway_observations -> 'motif'::text, '{"value": [], "confidence": "REVIEW"}'::jsonb), 'patternScale', COALESCE(j.resolved_observations -> 'patternScale'::text, j.design_observations -> 'patternScale'::text, j.colourway_observations -> 'patternScale'::text, '{"value": "unknown", "confidence": "REVIEW"}'::jsonb), 'visualActivity', COALESCE(j.resolved_observations -> 'visualActivity'::text, j.colourway_observations -> 'visualActivity'::text, j.design_observations -> 'visualActivity'::text, '{"value": "unknown", "confidence": "REVIEW"}'::jsonb), 'directionality', COALESCE(j.resolved_observations -> 'directionality'::text, j.design_observations -> 'directionality'::text, j.colourway_observations -> 'directionality'::text, '{"value": "unknown", "confidence": "REVIEW"}'::jsonb), 'visualSurface', COALESCE(j.resolved_observations -> 'visualSurface'::text, j.design_observations -> 'visualSurface'::text, j.colourway_observations -> 'visualSurface'::text, '{"value": [], "confidence": "REVIEW"}'::jsonb), 'sheenAppearance', COALESCE(j.resolved_observations -> 'sheenAppearance'::text, j.design_observations -> 'sheenAppearance'::text, j.colourway_observations -> 'sheenAppearance'::text, '{"value": "unknown", "confidence": "REVIEW"}'::jsonb), 'visualWeight', COALESCE(j.resolved_observations -> 'visualWeight'::text, j.colourway_observations -> 'visualWeight'::text, j.design_observations -> 'visualWeight'::text, '{"value": "unknown", "confidence": "REVIEW"}'::jsonb), 'character', COALESCE(j.resolved_observations -> 'character'::text, j.colourway_observations -> 'character'::text, j.design_observations -> 'character'::text, '{"value": [], "confidence": "REVIEW"}'::jsonb)) AS visual_fields,
            COALESCE(j.resolved_field_provenance, j.colourway_field_provenance, j.design_field_provenance, '{}'::jsonb) AS provenance
           FROM joined j
        )
 SELECT fabric_id,
    supplier_id,
    supplier_sku,
    brand_id,
    design_id,
    image_type,
    source_image_hash,
        CASE
            WHEN pending_retry THEN 'PENDING_EXTERNAL_RETRY'::text
            WHEN resolved_ledger_id IS NULL AND design_ledger_id IS NULL AND colourway_ledger_id IS NULL THEN 'NO_USABLE_ENRICHMENT'::text
            WHEN resolved_ledger_id IS NOT NULL AND resolved_approval_state = 'APPROVED'::text AND (resolved_review_state = ANY (ARRAY['AUTO_APPROVED'::text, 'HUMAN_APPROVED'::text])) THEN 'COMPLETE'::text
            WHEN resolved_ledger_id IS NOT NULL OR design_ledger_id IS NOT NULL OR colourway_ledger_id IS NOT NULL THEN 'PARTIAL_GOVERNED'::text
            ELSE 'QUARANTINED'::text
        END AS knowledge_state,
    resolved_ledger_id,
    design_ledger_id,
    colourway_ledger_id,
    visual_fields,
    provenance,
    jsonb_build_object('designReviewFlags', COALESCE(design_review_flags, '[]'::jsonb), 'colourwayReviewFlags', COALESCE(colourway_review_flags, '[]'::jsonb), 'resolvedReviewFlags', COALESCE(resolved_review_flags, '[]'::jsonb)) AS review_context
   FROM fields$view$;
 IF EXISTS(SELECT 1 FROM pg_class WHERE oid='curtainsuk_private.fabric_visual_knowledge'::regclass AND (relacl::text IS DISTINCT FROM initial_acl OR relowner IS DISTINCT FROM initial_owner OR reloptions::text IS DISTINCT FROM initial_options)) THEN RAISE EXCEPTION 'VIEW_SECURITY_PROPERTIES_CHANGED'; END IF;
 REFRESH MATERIALIZED VIEW CONCURRENTLY curtainsuk_private.fabric_visual_knowledge_read_cache;
 IF EXISTS(SELECT 1 FROM fi_retry_before b FULL JOIN curtainsuk_private.fabric_visual_knowledge_read_cache a USING(fabric_id) WHERE b.fabric_id IS NULL OR a.fabric_id IS NULL OR a.supplier_id IS DISTINCT FROM b.supplier_id OR a.supplier_sku IS DISTINCT FROM b.supplier_sku OR a.visual_fields IS DISTINCT FROM b.visual_fields OR a.provenance IS DISTINCT FROM b.provenance) THEN RAISE EXCEPTION 'UNEXPECTED_FIELD_PROVENANCE_IDENTITY_OR_SCOPE_CHANGE'; END IF;
 SELECT array_agg(a.fabric_id ORDER BY a.fabric_id) INTO changed_ids FROM fi_retry_before b JOIN curtainsuk_private.fabric_visual_knowledge_read_cache a USING(fabric_id) WHERE a.knowledge_state IS DISTINCT FROM b.knowledge_state;
 IF changed_ids IS DISTINCT FROM expected_ids OR EXISTS(SELECT 1 FROM curtainsuk_private.fabric_visual_knowledge_read_cache WHERE fabric_id=ANY(expected_ids) AND knowledge_state<>'PARTIAL_GOVERNED') THEN RAISE EXCEPTION 'EXACT_202_STATE_TRANSITIONS_FAILED'; END IF;
 IF (SELECT count(*) FROM curtainsuk_private.fabric_visual_knowledge_read_cache WHERE knowledge_state='PENDING_EXTERNAL_RETRY')<>1359 OR (SELECT count(*) FROM curtainsuk_private.fabric_visual_knowledge_read_cache WHERE knowledge_state='COMPLETE')<>1040 OR (SELECT count(*) FROM curtainsuk_private.fabric_visual_knowledge_read_cache WHERE knowledge_state='PARTIAL_GOVERNED')<>9416 THEN RAISE EXCEPTION 'FINAL_FI_STATE_COUNTS_FAILED'; END IF;
 -- The view change emits no dirty trigger. Never discard a marker from another operation.
 IF EXISTS(SELECT 1 FROM curtainsuk_private.browse_projection_dirty) THEN RAISE EXCEPTION 'UNEXPECTED_DIRTY_MARKER'; END IF;
 SELECT max(refreshed_at) INTO cache_stamp FROM curtainsuk_private.fabric_visual_knowledge_read_cache;
 UPDATE curtainsuk_private.browse_projection_control SET knowledge_cache_refreshed_at=cache_stamp,knowledge_cache_dirty=false WHERE singleton;
 INSERT INTO curtainsuk_private.browse_projection_dirty(fabric_id) SELECT unnest(changed_ids);
 IF EXISTS(SELECT 1 FROM curtainsuk_private.browse_projection_dirty WHERE fabric_id='*') OR EXISTS(SELECT 1 FROM curtainsuk_private.browse_projection_control WHERE singleton AND (active_generation IS DISTINCT FROM initial_generation OR knowledge_cache_dirty OR knowledge_cache_refreshed_at IS DISTINCT FROM (SELECT max(refreshed_at) FROM curtainsuk_private.fabric_visual_knowledge_read_cache) OR now()>=next_time_change_at)) THEN RAISE EXCEPTION 'TARGETED_PATH_PRECONDITION_FAILED'; END IF;
 refresh_result:=curtainsuk_private.browse_projection_refresh_dirty(500);
 IF refresh_result ? 'skipped' OR refresh_result ? 'count' OR (refresh_result->>'refreshed')::integer IS DISTINCT FROM 202 OR refresh_result->>'generation' IS DISTINCT FROM initial_generation::text THEN RAISE EXCEPTION 'TARGETED_REFRESH_FAILED: %',refresh_result; END IF;
 WITH expected AS MATERIALIZED (SELECT to_jsonb(e) r FROM curtainsuk_private.browse_eligible_set_v1 e WHERE e.fabric_id=ANY(changed_ids)), actual AS MATERIALIZED (SELECT to_jsonb(p)-'generation_id' r FROM curtainsuk_private.browse_read_projection p WHERE p.fabric_id=ANY(changed_ids) AND generation_id=initial_generation), diffs AS ((SELECT r FROM expected EXCEPT SELECT r FROM actual) UNION ALL (SELECT r FROM actual EXCEPT SELECT r FROM expected)) SELECT count(*) INTO source_differences FROM diffs;
 IF source_differences<>0 OR (SELECT count(*) FROM curtainsuk_private.browse_read_projection WHERE fabric_id=ANY(changed_ids))<>202 THEN RAISE EXCEPTION 'TARGETED_BROWSE_PARITY_FAILED'; END IF;
 IF EXISTS(SELECT 1 FROM fi_retry_browse_unaffected b FULL JOIN (SELECT fabric_id,md5(to_jsonb(p)::text) row_hash FROM curtainsuk_private.browse_read_projection p WHERE NOT fabric_id=ANY(expected_ids)) a USING(fabric_id) WHERE b.fabric_id IS NULL OR a.fabric_id IS NULL OR a.row_hash IS DISTINCT FROM b.row_hash) THEN RAISE EXCEPTION 'UNEXPECTED_UNAFFECTED_BROWSE_ROW_CHANGE'; END IF;
 WITH joined AS MATERIALIZED (
 SELECT coalesce(k.fabric_id,e.fabric_id) AS fabric_id,k.fabric_id AS base_id,e.fabric_id AS enriched_id,
   k.visual_fields AS bv,e.visual_fields AS ev,k.provenance AS bp,e.provenance AS ep,
   k.knowledge_state AS bs,e.knowledge_state AS es,k.refreshed_at AS bt,e.refreshed_at AS et,
   p.patch_id,p.requested_missing_fields,p.new_values_only,p.confidence_per_new_field,p.provenance_per_new_field,
   k.supplier_id AS bi,e.supplier_id AS ei,k.supplier_sku AS bk,e.supplier_sku AS ek
 FROM curtainsuk_private.fabric_visual_knowledge_read_cache k
 FULL JOIN curtainsuk_private.fabric_visual_knowledge_enriched e USING(fabric_id)
 LEFT JOIN curtainsuk_private.fabric_visual_knowledge_patches p ON p.fabric_id=coalesce(k.fabric_id,e.fabric_id) AND p.retired_at IS NULL
), fields AS MATERIALIZED (
 SELECT j.fabric_id,f.key,(bv->f.key IS DISTINCT FROM ev->f.key) AS visual_changed,
   (bp->f.key IS DISTINCT FROM ep->f.key) AS provenance_changed,
   coalesce(f.key=ANY(requested_missing_fields),false) AS requested
 FROM joined j CROSS JOIN LATERAL (SELECT jsonb_object_keys(coalesce(bv,'{}')||coalesce(ev,'{}')||coalesce(bp,'{}')||coalesce(ep,'{}')) AS key) f
)
SELECT jsonb_build_object(
 'active_patches',(SELECT count(*) FROM curtainsuk_private.fabric_visual_knowledge_patches WHERE retired_at IS NULL),
 'retired_patches',(SELECT count(*) FROM curtainsuk_private.fabric_visual_knowledge_patches WHERE retired_at IS NOT NULL),
 'latest_artifact_active',(SELECT count(*) FROM curtainsuk_private.fabric_visual_knowledge_patches WHERE retired_at IS NULL AND source_artifact_reference @> '[{"run_id":"36964999798","artifact_id":"11210621127"}]'::jsonb),
 'differing_fabrics',count(*) FILTER(WHERE bv IS DISTINCT FROM ev OR bp IS DISTINCT FROM ep),
 'changed_field_instances',(SELECT count(*) FROM fields WHERE visual_changed),
 'changed_provenance_instances',(SELECT count(*) FROM fields WHERE provenance_changed),
 'differences_without_active_patches',count(*) FILTER(WHERE patch_id IS NULL AND (bv IS DISTINCT FROM ev OR bp IS DISTINCT FROM ep)),
 'active_patches_without_difference',count(*) FILTER(WHERE patch_id IS NOT NULL AND bv IS NOT DISTINCT FROM ev AND bp IS NOT DISTINCT FROM ep),
 'active_patches_without_base',(SELECT count(*) FROM curtainsuk_private.fabric_visual_knowledge_patches p WHERE retired_at IS NULL AND NOT EXISTS(SELECT 1 FROM joined j WHERE j.fabric_id=p.fabric_id AND j.base_id IS NOT NULL)),
 'knowledge_state_mismatches',count(*) FILTER(WHERE bs IS DISTINCT FROM es),
 'refreshed_at_mismatches',count(*) FILTER(WHERE bt IS DISTINCT FROM et),
 'identity_mismatches',count(*) FILTER(WHERE bi IS DISTINCT FROM ei OR bk IS DISTINCT FROM ek),
 'row_set_mismatches',count(*) FILTER(WHERE base_id IS NULL OR enriched_id IS NULL),
 'unrequested_field_changes',(SELECT count(*) FROM fields WHERE NOT requested AND (visual_changed OR provenance_changed)),
 'requested_fields_without_change',(SELECT count(*) FROM fields WHERE requested AND NOT visual_changed),
 'overlay_value_mismatches',count(*) FILTER(WHERE patch_id IS NOT NULL AND (ev IS DISTINCT FROM bv||(SELECT jsonb_object_agg(v.key,jsonb_build_object('value',v.value,'confidence',confidence_per_new_field->>v.key)) FROM jsonb_each(new_values_only) v) OR ep IS DISTINCT FROM bp||provenance_per_new_field)),
 'browse_rows',(SELECT count(*) FROM curtainsuk_private.browse_read_projection),
 'dirty_rows',(SELECT count(*) FROM curtainsuk_private.browse_projection_dirty),
 'control',(SELECT to_jsonb(c)-'metadata' FROM curtainsuk_private.browse_projection_control c),
 'checked_at',clock_timestamp()
) INTO audit_result FROM joined;
 IF (audit_result->>'browse_rows')::integer<>11815 OR (audit_result->>'dirty_rows')::integer<>0 OR audit_result->'control'->>'knowledge_cache_dirty' IS DISTINCT FROM 'false' OR audit_result->'control'->>'active_generation' IS DISTINCT FROM initial_generation::text OR (audit_result->>'active_patches')::integer<>958 OR (audit_result->>'retired_patches')::integer<>3 OR (audit_result->>'differing_fabrics')::integer<>958 OR (audit_result->>'changed_field_instances')::integer<>8957 THEN RAISE EXCEPTION 'PUBLICATION_GLOBAL_COUNTS_FAILED: %',audit_result; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_each_text(audit_result) a WHERE key IN ('differences_without_active_patches','active_patches_without_difference','active_patches_without_base','knowledge_state_mismatches','refreshed_at_mismatches','identity_mismatches','row_set_mismatches','unrequested_field_changes','requested_fields_without_change','overlay_value_mismatches') AND value IS DISTINCT FROM '0') THEN RAISE EXCEPTION 'OVERLAY_INVARIANT_FAILED: %',audit_result; END IF;
 rpc_result:=curtainsuk_private.search_retail_fabrics_prepared_v1('{}'::jsonb,1,24,null,null);
 IF (rpc_result->>'total')::integer<>11815 OR jsonb_array_length(rpc_result->'ids')<>24 THEN RAISE EXCEPTION 'FINAL_PREPARED_RPC_FAILED'; END IF;
 RAISE NOTICE 'RETRY_CORRECTION_VERIFIED: transitions=202 pending=1359 Browse=11815 targeted_refresh=%',refresh_result;
END $recovery$;

