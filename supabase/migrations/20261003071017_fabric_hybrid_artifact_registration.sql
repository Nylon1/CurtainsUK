-- Truthful hybrid/offline artifact route. Native ledger and its constraints stay intact.
CREATE TABLE curtainsuk_private.fabric_hybrid_artifacts (
 run_id text NOT NULL, artifact_id text NOT NULL, repository text NOT NULL,
 artifact_name text NOT NULL, archive_sha256 text NOT NULL CHECK (archive_sha256 ~ '^[a-f0-9]{64}$'),
 source_manifest_sha256 text NOT NULL CHECK (source_manifest_sha256 ~ '^[a-f0-9]{64}$'),
 source_commit_sha text NOT NULL CHECK (source_commit_sha ~ '^[a-f0-9]{40}$'),
 started_at timestamptz NOT NULL, finished_at timestamptz NOT NULL,
 completed_successfully boolean NOT NULL CHECK (completed_successfully),
 producer_prompt text NOT NULL, producer_schema text NOT NULL,
 model_id text NOT NULL, provenance_kind text NOT NULL DEFAULT 'HYBRID_OFFLINE_ARTIFACT' CHECK (provenance_kind='HYBRID_OFFLINE_ARTIFACT'),
 registered_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(run_id,artifact_id), CHECK (finished_at>=started_at)
);
CREATE TABLE curtainsuk_private.fabric_hybrid_documents (
 document_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 fabric_id text NOT NULL REFERENCES curtainsuk_private.fabric_colourways(fabric_id),
 run_id text NOT NULL, artifact_id text NOT NULL,
 source_document_text text NOT NULL,
 source_sha256 text NOT NULL CHECK (source_sha256 ~ '^[a-f0-9]{64}$'),
 staged_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 FOREIGN KEY(run_id,artifact_id) REFERENCES curtainsuk_private.fabric_hybrid_artifacts(run_id,artifact_id),
 UNIQUE(document_id,fabric_id),
 UNIQUE(fabric_id,run_id,artifact_id,source_sha256),
 CHECK (encode(extensions.digest(convert_to(source_document_text,'UTF8'),'sha256'),'hex')=source_sha256),
 CHECK (source_document_text::jsonb->>'fabric_id'=fabric_id)
);
CREATE TABLE curtainsuk_private.fabric_hybrid_registrations (
 registration_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 fabric_id text NOT NULL REFERENCES curtainsuk_private.fabric_colourways(fabric_id),
 document_id uuid NOT NULL,
 run_id text NOT NULL, artifact_id text NOT NULL,
 supplier_id text NOT NULL,supplier_sku text NOT NULL,brand_id text NOT NULL,design_id text NOT NULL,
 approved_image_type text NOT NULL,approved_image_hash text NOT NULL CHECK (approved_image_hash~'^[a-f0-9]{64}$'),
 approved_image_url text NOT NULL CHECK (approved_image_url~'^https://cdn[.]shopify[.]com/[^?#]+$'),
 baseline_visual_hash text NOT NULL CHECK (baseline_visual_hash~'^[a-f0-9]{64}$'),
 baseline_provenance_hash text NOT NULL CHECK (baseline_provenance_hash~'^[a-f0-9]{64}$'),
 baseline_provenance_origin text NOT NULL,
 source_manifest_entry jsonb NOT NULL,
 source_prompt_version text NOT NULL,source_schema_version text NOT NULL,source_vocabulary_version text NOT NULL,
 source_model text NOT NULL,source_analysis_at timestamptz,
 candidate jsonb NOT NULL,raw_field_provenance jsonb NOT NULL,
 delta_observations jsonb NOT NULL,delta_provenance_basis jsonb NOT NULL,
 review_state text NOT NULL CHECK (review_state IN ('AUTO_APPROVED','REVIEW_REQUIRED')),
 approval_state text NOT NULL CHECK (approval_state IN ('APPROVED','PROPOSED')),
 validation_policy text NOT NULL DEFAULT 'hybrid-artifact-v1-candidate-validated',
 active boolean NOT NULL DEFAULT false,retired_at timestamptz,
 registered_at timestamptz NOT NULL DEFAULT clock_timestamp(),activated_at timestamptz,
 FOREIGN KEY(document_id,fabric_id) REFERENCES curtainsuk_private.fabric_hybrid_documents(document_id,fabric_id),
 FOREIGN KEY(run_id,artifact_id) REFERENCES curtainsuk_private.fabric_hybrid_artifacts(run_id,artifact_id),
 UNIQUE(fabric_id,run_id,artifact_id),
 CHECK (NOT active OR (retired_at IS NULL AND activated_at IS NOT NULL)),
 CHECK (NOT active OR (approval_state='APPROVED' AND review_state='AUTO_APPROVED') OR (approval_state='PROPOSED' AND review_state='REVIEW_REQUIRED')),
 CHECK (source_analysis_at IS NULL),
 CHECK (source_manifest_entry->>'fabric_id'=fabric_id),
 CHECK (source_manifest_entry->'provenance'=raw_field_provenance),
 CHECK (jsonb_typeof(candidate)='object' AND jsonb_typeof(candidate->'observations')='object'),
 CHECK (jsonb_typeof(delta_observations)='object' AND jsonb_typeof(delta_provenance_basis)='object'),
 CHECK (delta_observations <> '{}'::jsonb)
);
CREATE UNIQUE INDEX fabric_hybrid_one_active_per_fabric ON curtainsuk_private.fabric_hybrid_registrations(fabric_id) WHERE active;
CREATE INDEX fabric_hybrid_pending_by_fabric ON curtainsuk_private.fabric_hybrid_registrations(fabric_id) WHERE active AND retired_at IS NULL;
CREATE TABLE curtainsuk_private.fabric_hybrid_registration_events (
 event_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 registration_id uuid NOT NULL REFERENCES curtainsuk_private.fabric_hybrid_registrations(registration_id),
 fabric_id text NOT NULL,
 event_kind text NOT NULL CHECK (event_kind IN ('STAGED','ACTIVATED','RETIRED')),
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 source_document_sha256 text NOT NULL
);
CREATE FUNCTION curtainsuk_private.fabric_hybrid_registration_event() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE docsha text;
BEGIN
 SELECT d.source_sha256 INTO docsha FROM curtainsuk_private.fabric_hybrid_documents d WHERE d.document_id=NEW.document_id;
 IF TG_OP='INSERT' THEN
   IF NEW.active OR NEW.activated_at IS NOT NULL OR NEW.retired_at IS NOT NULL THEN RAISE EXCEPTION 'REGISTRATION_MUST_STAGE_FIRST'; END IF;
   INSERT INTO curtainsuk_private.fabric_hybrid_registration_events(registration_id,fabric_id,event_kind,source_document_sha256) VALUES(NEW.registration_id,NEW.fabric_id,'STAGED',docsha);
 ELSE
   IF to_jsonb(NEW)-'active'-'activated_at'-'retired_at' IS DISTINCT FROM to_jsonb(OLD)-'active'-'activated_at'-'retired_at' THEN RAISE EXCEPTION 'IMMUTABLE_HYBRID_REGISTRATION'; END IF;
   IF NOT OLD.active AND NEW.active AND OLD.retired_at IS NULL AND NEW.activated_at IS NOT NULL THEN
      INSERT INTO curtainsuk_private.fabric_hybrid_registration_events(registration_id,fabric_id,event_kind,source_document_sha256) VALUES(NEW.registration_id,NEW.fabric_id,'ACTIVATED',docsha);
   ELSIF OLD.active AND NOT NEW.active AND OLD.retired_at IS NULL AND NEW.retired_at IS NOT NULL THEN
      INSERT INTO curtainsuk_private.fabric_hybrid_registration_events(registration_id,fabric_id,event_kind,source_document_sha256) VALUES(NEW.registration_id,NEW.fabric_id,'RETIRED',docsha);
   ELSE RAISE EXCEPTION 'INVALID_REGISTRATION_TRANSITION'; END IF;
 END IF;
 RETURN NULL;
END $function$;
CREATE TRIGGER fabric_hybrid_registration_event AFTER INSERT OR UPDATE ON curtainsuk_private.fabric_hybrid_registrations
FOR EACH ROW EXECUTE FUNCTION curtainsuk_private.fabric_hybrid_registration_event();
CREATE TRIGGER fabric_hybrid_knowledge_dirty AFTER UPDATE ON curtainsuk_private.fabric_hybrid_registrations
FOR EACH STATEMENT EXECUTE FUNCTION curtainsuk_private.browse_projection_mark_knowledge_dirty();
REVOKE ALL ON curtainsuk_private.fabric_hybrid_artifacts,curtainsuk_private.fabric_hybrid_documents,
curtainsuk_private.fabric_hybrid_registrations,curtainsuk_private.fabric_hybrid_registration_events FROM PUBLIC,anon,authenticated;
ALTER TABLE curtainsuk_private.fabric_hybrid_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE curtainsuk_private.fabric_hybrid_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE curtainsuk_private.fabric_hybrid_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE curtainsuk_private.fabric_hybrid_registration_events ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE VIEW curtainsuk_private.fabric_visual_knowledge AS
WITH native AS (
WITH scope AS (
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
            (EXISTS ( SELECT 1
                   FROM curtainsuk_private.fabric_visual_enrichment_failures f
                  WHERE f.failure_reason = 'OPENAI_RESPONSE_429'::text AND f.supplier_id = s.supplier_id AND (f.context ->> 'design_id'::text) = s.design_id AND NOT (EXISTS ( SELECT 1
                           FROM curtainsuk_private.fabric_visual_enrichment_ledger recovery
                             JOIN curtainsuk_private.fabric_media_assets asset ON asset.content_hash = s.source_image_hash
                          WHERE recovery.ledger_id = r.ledger_id AND recovery.analysis_level = 'RESOLVED'::text AND recovery.superseded_at IS NULL AND recovery.fabric_id = s.fabric_id AND recovery.supplier_id = s.supplier_id AND recovery.supplier_sku = s.supplier_sku AND recovery.brand_id = s.brand_id AND recovery.design_id = s.design_id AND recovery.image_type = s.image_type AND recovery.source_image_hash = s.source_image_hash AND recovery.source_image_url = asset.shopify_cdn_url AND recovery.failure_reason IS NULL AND recovery.analysed_at > f.failed_at AND (recovery.approval_state = 'APPROVED'::text AND (recovery.review_state = ANY (ARRAY['AUTO_APPROVED'::text, 'HUMAN_APPROVED'::text])) OR recovery.approval_state = 'PROPOSED'::text AND recovery.review_state = 'REVIEW_REQUIRED'::text))))) AS pending_retry
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
   FROM fields
)
SELECT n.fabric_id,n.supplier_id,n.supplier_sku,n.brand_id,n.design_id,n.image_type,n.source_image_hash,
 CASE WHEN h.registration_id IS NOT NULL THEN CASE WHEN h.review_state='AUTO_APPROVED' THEN 'COMPLETE'::text ELSE 'PARTIAL_GOVERNED'::text END ELSE n.knowledge_state END AS knowledge_state,
 n.resolved_ledger_id,n.design_ledger_id,n.colourway_ledger_id,
 CASE WHEN h.registration_id IS NOT NULL THEN n.visual_fields||h.delta_observations ELSE n.visual_fields END AS visual_fields,
 CASE WHEN h.registration_id IS NOT NULL THEN n.provenance||h.delta_provenance_basis ELSE n.provenance END AS provenance,
 n.review_context
FROM native n
LEFT JOIN LATERAL (
 SELECT r.registration_id,r.review_state,r.delta_observations,r.delta_provenance_basis
 FROM curtainsuk_private.fabric_hybrid_registrations r
 JOIN curtainsuk_private.fabric_hybrid_artifacts a ON a.run_id=r.run_id AND a.artifact_id=r.artifact_id
 JOIN curtainsuk_private.fabric_media_assets ma ON ma.content_hash=r.approved_image_hash
 WHERE r.fabric_id=n.fabric_id AND r.active AND r.retired_at IS NULL
   AND n.knowledge_state='PENDING_EXTERNAL_RETRY'
   AND r.supplier_id=n.supplier_id AND r.supplier_sku=n.supplier_sku
   AND r.brand_id=n.brand_id AND r.design_id=n.design_id
   AND r.approved_image_type=n.image_type AND r.approved_image_hash=n.source_image_hash
   AND r.approved_image_url=ma.shopify_cdn_url
   AND r.baseline_visual_hash=encode(extensions.digest(n.visual_fields::text,'sha256'),'hex')
   AND r.baseline_provenance_hash=encode(extensions.digest(n.provenance::text,'sha256'),'hex')
   AND a.completed_successfully AND a.started_at > ALL (
      SELECT f.failed_at FROM curtainsuk_private.fabric_visual_enrichment_failures f
      WHERE f.supplier_id=n.supplier_id AND f.context->>'design_id'=n.design_id AND f.failure_reason='OPENAI_RESPONSE_429'
   )
   AND EXISTS (SELECT 1 FROM curtainsuk_private.fabric_visual_enrichment_failures f
      WHERE f.supplier_id=n.supplier_id AND f.context->>'design_id'=n.design_id AND f.failure_reason='OPENAI_RESPONSE_429')
 LIMIT 1
) h ON true;
DO $proof$
DECLARE changed bigint;
BEGIN
 SELECT count(*) INTO changed FROM curtainsuk_private.fabric_visual_knowledge v
 JOIN curtainsuk_private.fabric_visual_knowledge_read_cache k USING(fabric_id)
 WHERE v.knowledge_state IS DISTINCT FROM k.knowledge_state OR v.visual_fields IS DISTINCT FROM k.visual_fields OR v.provenance IS DISTINCT FROM k.provenance;
 IF changed<>0 OR (SELECT count(*) FROM curtainsuk_private.fabric_visual_knowledge)<>11815
 OR (SELECT count(*) FROM curtainsuk_private.fabric_hybrid_registrations)<>0
 THEN RAISE EXCEPTION 'EMPTY_REGISTRATION_VIEW_REGRESSION: %',changed; END IF;
END $proof$;

