CREATE OR REPLACE FUNCTION curtainsuk_private.browse_projection_next_time_change()
RETURNS timestamptz LANGUAGE sql STABLE SET search_path TO '' AS $function$
WITH latest_stock AS MATERIALIZED (
  SELECT DISTINCT ON (supplier_id, supplier_sku)
    supplier_id, supplier_sku, snapshot_date, checked_at
  FROM curtainsuk_private.daily_stock_snapshots
  ORDER BY supplier_id, supplier_sku, snapshot_date DESC
)
SELECT coalesce(min(change_at), 'infinity'::timestamptz) FROM (
  SELECT checked_at AS change_at FROM latest_stock
    WHERE checked_at > now()
  UNION ALL
  SELECT checked_at + curtainsuk_private.stock_validity_window()
    FROM latest_stock
    WHERE checked_at <= now()
      AND checked_at + curtainsuk_private.stock_validity_window() > now()
  UNION ALL
  SELECT checked_at FROM curtainsuk_private.supplier_snapshots
    WHERE checked_at > now()
) boundaries;
$function$;