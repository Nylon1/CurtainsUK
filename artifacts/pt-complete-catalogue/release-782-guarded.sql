BEGIN;
SET LOCAL statement_timeout = '10min';
SET LOCAL lock_timeout = '60s';
SELECT pg_advisory_xact_lock(4252026, 9248);

CREATE TEMP TABLE pt_release_cohort ON COMMIT DROP AS
SELECT DISTINCT c.fabric_id, c.supplier_sku
FROM curtainsuk_private.fabric_colourways c
WHERE c.supplier_id = 'prestigious-textiles'
  AND NOT c.staging_catalog_visible
  AND c.lifecycle_state <> 'DISCONTINUED'
  AND EXISTS (
    SELECT 1
    FROM curtainsuk_private.fabric_media_mappings m
    JOIN curtainsuk_private.fabric_media_assets a ON a.content_hash = m.content_hash
    WHERE m.fabric_id = c.fabric_id
      AND m.image_type = 'MAIN'
      AND m.rights_state = 'APPROVED'
      AND m.mapping_state = 'VERIFIED'
      AND a.shopify_cdn_url ~ '^https://cdn[.]shopify[.]com/'
  )
  AND EXISTS (
    SELECT 1
    FROM curtainsuk_private.supplier_snapshots s
    JOIN curtainsuk_private.supplier_snapshot_prices p USING (snapshot_id)
    WHERE s.supplier_id = c.supplier_id
      AND s.supplier_sku = c.supplier_sku
      AND s.validation_status = 'VALIDATED'
      AND s.source_name = 'Prestigious Textiles August 2026 Price List; owner-confirmed Cut Price'
      AND p.cut_trade_price > 0
      AND p.standard_trade_price IS NULL
      AND (
        SELECT e.promotion_state
        FROM curtainsuk_private.supplier_promotion_events e
        WHERE e.snapshot_id = s.snapshot_id
        ORDER BY e.created_at DESC
        LIMIT 1
      ) = 'APPROVED_FOR_PROJECTION'
  )
  AND EXISTS (
    SELECT 1
    FROM curtainsuk_private.daily_stock_snapshots d
    WHERE d.supplier_id = c.supplier_id
      AND d.supplier_sku = c.supplier_sku
      AND d.checked_at >= now() - curtainsuk_private.stock_validity_window()
      AND d.checked_at <= now()
      AND d.lifecycle_state <> 'DISCONTINUED'
  );

DO $guard$
DECLARE cohort_count integer;
DECLARE cohort_md5 text;
BEGIN
  SELECT count(*), md5(string_agg(supplier_sku || '|' || fabric_id, E'\n' ORDER BY supplier_sku, fabric_id))
  INTO cohort_count, cohort_md5
  FROM pt_release_cohort;
  IF cohort_count <> 782 OR cohort_md5 <> 'cd74877d44c0a83c6e5339cf95088aa3' THEN
    RAISE EXCEPTION 'PT_RELEASE_COHORT_CHANGED count=% md5=%', cohort_count, cohort_md5;
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pt_release_cohort c
    LEFT JOIN curtainsuk_private.fabric_visual_enrichment_ledger l
      ON l.fabric_id = c.fabric_id
     AND l.analysis_level = 'RESOLVED'
     AND l.superseded_at IS NULL
    WHERE l.fabric_id IS NULL
  ) THEN
    RAISE EXCEPTION 'PT_RELEASE_VISUAL_ENRICHMENT_INCOMPLETE';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobid = 2 AND NOT active) THEN
    RAISE EXCEPTION 'BROWSE_SCHEDULER_NOT_PAUSED';
  END IF;
END $guard$;

UPDATE curtainsuk_private.fabric_colourways
SET lifecycle_state = 'DISCONTINUED',
    staging_catalog_visible = false,
    storefront_selectable = false,
    updated_at = now()
WHERE supplier_id = 'prestigious-textiles'
  AND supplier_sku IN ('5758/159', '5758/284')
  AND lifecycle_state <> 'DISCONTINUED';

UPDATE curtainsuk_private.fabric_colourways c
SET staging_catalog_visible = true,
    updated_at = now()
FROM pt_release_cohort r
WHERE c.fabric_id = r.fabric_id
  AND NOT c.staging_catalog_visible;

DO $guard$
BEGIN
  IF (SELECT count(*) FROM curtainsuk_private.fabric_visual_knowledge k JOIN pt_release_cohort r USING (fabric_id)
      WHERE k.knowledge_state IN ('COMPLETE', 'PARTIAL_GOVERNED')) <> 782 THEN
    RAISE EXCEPTION 'PT_RELEASE_FABRIC_KNOWLEDGE_INCOMPLETE';
  END IF;
END $guard$;

CREATE TEMP TABLE pt_browse_reconciliation ON COMMIT DROP AS
SELECT curtainsuk_private.browse_projection_refresh_full() AS result;

DO $guard$
BEGIN
  IF (SELECT count(*) FROM curtainsuk_private.fabric_visual_knowledge_read_cache k JOIN pt_release_cohort r USING (fabric_id)
      WHERE k.knowledge_state IN ('COMPLETE', 'PARTIAL_GOVERNED')) <> 782 THEN
    RAISE EXCEPTION 'PT_RELEASE_KNOWLEDGE_CACHE_INCOMPLETE';
  END IF;
  IF (SELECT count(*) FROM curtainsuk_private.browse_read_projection p
      JOIN curtainsuk_private.browse_projection_control ctl ON ctl.singleton AND p.generation_id = ctl.active_generation
      JOIN pt_release_cohort r USING (fabric_id)) <> 782 THEN
    RAISE EXCEPTION 'PT_RELEASE_BROWSE_PROJECTION_INCOMPLETE';
  END IF;
END $guard$;

SELECT cron.alter_job(2, active := true);

SELECT
  (SELECT count(*) FROM pt_release_cohort) AS newly_released,
  (SELECT count(*) FROM curtainsuk_private.fabric_colourways WHERE supplier_id = 'prestigious-textiles' AND staging_catalog_visible AND lifecycle_state <> 'DISCONTINUED') AS total_pt_live,
  (SELECT count(*) FROM (SELECT supplier_sku FROM curtainsuk_private.fabric_colourways WHERE supplier_id = 'prestigious-textiles' GROUP BY supplier_sku HAVING count(*) > 1) duplicates) AS duplicate_skus,
  (SELECT count(*) FROM curtainsuk_private.fabric_visual_knowledge k JOIN pt_release_cohort r USING (fabric_id) WHERE k.knowledge_state IN ('COMPLETE', 'PARTIAL_GOVERNED')) AS fabric_knowledge,
  (SELECT count(*) FROM curtainsuk_private.fabric_visual_knowledge_read_cache k JOIN pt_release_cohort r USING (fabric_id) WHERE k.knowledge_state IN ('COMPLETE', 'PARTIAL_GOVERNED')) AS knowledge_cache,
  (SELECT count(*) FROM curtainsuk_private.browse_read_projection p JOIN curtainsuk_private.browse_projection_control ctl ON ctl.singleton AND p.generation_id = ctl.active_generation JOIN pt_release_cohort r USING (fabric_id)) AS browse_projection,
  (SELECT active FROM cron.job WHERE jobid = 2) AS browse_scheduler_active,
  (SELECT active_generation FROM curtainsuk_private.browse_projection_control WHERE singleton) AS active_generation,
  (SELECT result FROM pt_browse_reconciliation) AS reconciliation;

COMMIT;
