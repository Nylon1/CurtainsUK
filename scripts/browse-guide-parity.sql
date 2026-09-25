WITH latest_promotion AS MATERIALIZED (
  SELECT DISTINCT ON (snapshot_id) snapshot_id, promotion_state
  FROM curtainsuk_private.supplier_promotion_events
  ORDER BY snapshot_id, created_at DESC, event_id DESC
), candidate AS MATERIALIZED (
  SELECT DISTINCT ON (s.supplier_id, s.supplier_sku)
    s.supplier_id::text AS supplier_id,
    s.supplier_sku::text AS supplier_sku,
    (round((CASE
      WHEN s.supplier_id = 'prestigious-textiles' AND p.cut_trade_price > 0 THEN p.cut_trade_price
      WHEN s.supplier_id = 'prestigious-textiles' THEN p.standard_trade_price
      ELSE p.cut_trade_price END) * 100) * 3)::bigint AS guide_minor
  FROM curtainsuk_private.supplier_snapshots s
  JOIN curtainsuk_private.supplier_snapshot_prices p USING (snapshot_id)
  JOIN latest_promotion e
    ON e.snapshot_id = s.snapshot_id
   AND e.promotion_state = 'APPROVED_FOR_PROJECTION'
  WHERE s.validation_status = 'VALIDATED'
    AND s.checked_at <= now()
    AND p.currency = 'GBP'
    AND (CASE
      WHEN s.supplier_id = 'prestigious-textiles' THEN coalesce(p.cut_trade_price, p.standard_trade_price)
      ELSE p.cut_trade_price END) > 0
  ORDER BY s.supplier_id, s.supplier_sku,
    CASE WHEN s.supplier_id = 'prestigious-textiles' AND p.cut_trade_price > 0 THEN 0 ELSE 1 END,
    s.checked_at DESC, s.snapshot_id DESC
), old_rows AS MATERIALIZED (
  SELECT * FROM curtainsuk_private.current_retail_guide_prices()
)
SELECT
  (SELECT count(*) FROM candidate) AS candidate_count,
  (SELECT count(*) FROM old_rows) AS old_count,
  (SELECT count(*) FROM (SELECT * FROM candidate EXCEPT SELECT * FROM old_rows) x) AS candidate_only,
  (SELECT count(*) FROM (SELECT * FROM old_rows EXCEPT SELECT * FROM candidate) x) AS old_only;
