create unique index if not exists supplier_snapshots_sdg_price_recovery_once_per_sku
on curtainsuk_private.supplier_snapshots(supplier_id,supplier_sku)
where supplier_id='sanderson-design-group'
  and source_name='SDG authenticated trade portal Product/detail live price recovery';
