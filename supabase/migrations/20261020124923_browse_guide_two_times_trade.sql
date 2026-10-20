-- Owner-approved Browse guide: approved supplier trade price, rounded to pennies, times two.
-- Browse/adviser guide only. Supplier selection, stock, MTM and checkout are unchanged.
-- Serialize with existing projection writers and publish a reconciled new generation
-- in the same transaction. No interval with old prepared prices and new direct prices.
BEGIN;
SELECT pg_advisory_xact_lock(4252026, 9248);

CREATE OR REPLACE FUNCTION curtainsuk_private.current_retail_guide_prices()
 RETURNS TABLE(supplier_id text, supplier_sku text, guide_minor bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  SELECT DISTINCT ON (s.supplier_id, s.supplier_sku)
    s.supplier_id::text, s.supplier_sku::text,
    (round((CASE WHEN s.supplier_id='prestigious-textiles' THEN coalesce(nullif(p.cut_trade_price,0),p.standard_trade_price) ELSE p.cut_trade_price END)*100)*2)::bigint
  FROM curtainsuk_private.supplier_snapshots s
  JOIN curtainsuk_private.supplier_snapshot_prices p USING(snapshot_id)
  WHERE s.validation_status='VALIDATED' AND s.checked_at<=now() AND p.currency='GBP'
    AND ((s.supplier_id='prestigious-textiles' AND (coalesce(p.cut_trade_price,0)>0 OR coalesce(p.standard_trade_price,0)>0)) OR (s.supplier_id<>'prestigious-textiles' AND p.cut_trade_price>0))
    AND (SELECT e.promotion_state FROM curtainsuk_private.supplier_promotion_events e
      WHERE e.snapshot_id=s.snapshot_id ORDER BY e.created_at DESC, e.event_id DESC LIMIT 1)='APPROVED_FOR_PROJECTION'
  ORDER BY s.supplier_id, s.supplier_sku, CASE WHEN s.supplier_id='prestigious-textiles' AND coalesce(p.cut_trade_price,0)>0 THEN 0 WHEN s.supplier_id='prestigious-textiles' AND coalesce(p.standard_trade_price,0)>0 THEN 1 ELSE 2 END, s.checked_at DESC, s.snapshot_id DESC
$function$;
REVOKE ALL ON FUNCTION curtainsuk_private.current_retail_guide_prices() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION curtainsuk_private.current_retail_guide_prices() TO service_role;

CREATE OR REPLACE VIEW curtainsuk_private.browse_current_guide_prices_set_v1
WITH (security_invoker = true)
AS
 WITH latest_promotion AS MATERIALIZED (
         SELECT DISTINCT ON (supplier_promotion_events.snapshot_id) supplier_promotion_events.snapshot_id,
            supplier_promotion_events.promotion_state
           FROM curtainsuk_private.supplier_promotion_events
          ORDER BY supplier_promotion_events.snapshot_id, supplier_promotion_events.created_at DESC, supplier_promotion_events.event_id DESC
        )
 SELECT DISTINCT ON (s.supplier_id, s.supplier_sku) s.supplier_id,
    s.supplier_sku,
    (round(
        CASE
            WHEN s.supplier_id = 'prestigious-textiles'::text AND p.cut_trade_price > 0::numeric AND s.snapshot_id ~~ 'pt-pdf-cut:%'::text AND s.source_type = 'OTHER'::text AND s.source_name = 'Prestigious Textiles August 2026 Price List; owner-confirmed Cut Price'::text THEN p.cut_trade_price
            WHEN s.supplier_id = 'prestigious-textiles'::text THEN p.standard_trade_price
            ELSE p.cut_trade_price
        END * 100::numeric) * 2::numeric)::bigint AS guide_minor
   FROM curtainsuk_private.supplier_snapshots s
     JOIN curtainsuk_private.supplier_snapshot_prices p USING (snapshot_id)
     JOIN latest_promotion e ON e.snapshot_id = s.snapshot_id AND e.promotion_state = 'APPROVED_FOR_PROJECTION'::text
  WHERE s.validation_status = 'VALIDATED'::text AND s.checked_at <= now() AND p.currency = 'GBP'::text AND (s.supplier_id = 'prestigious-textiles'::text AND (p.standard_trade_price > 0::numeric OR p.cut_trade_price > 0::numeric AND s.snapshot_id ~~ 'pt-pdf-cut:%'::text AND s.source_type = 'OTHER'::text AND s.source_name = 'Prestigious Textiles August 2026 Price List; owner-confirmed Cut Price'::text) OR s.supplier_id <> 'prestigious-textiles'::text AND p.cut_trade_price > 0::numeric)
  ORDER BY s.supplier_id, s.supplier_sku, (
        CASE
            WHEN s.supplier_id = 'prestigious-textiles'::text AND p.cut_trade_price > 0::numeric AND s.snapshot_id ~~ 'pt-pdf-cut:%'::text AND s.source_type = 'OTHER'::text AND s.source_name = 'Prestigious Textiles August 2026 Price List; owner-confirmed Cut Price'::text THEN 0
            WHEN s.supplier_id = 'prestigious-textiles'::text AND p.standard_trade_price > 0::numeric THEN 1
            ELSE 2
        END), s.checked_at DESC, s.snapshot_id DESC;
REVOKE ALL ON curtainsuk_private.browse_current_guide_prices_set_v1 FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON curtainsuk_private.browse_current_guide_prices_set_v1 TO service_role;


-- Existing refresh reconciles every prepared row against the eligible source.
SELECT curtainsuk_private.browse_projection_refresh_full();
COMMIT;
