-- Supplier stock RPCs run through PostgREST as service_role.
-- service_role inherits authenticator's 8s lock_timeout when it has no role
-- override. Stock approval writes fire browse-projection dirty triggers that
-- take a shared advisory transaction lock; transient contention can therefore
-- abort otherwise healthy stock refreshes at ~8 seconds.
--
-- Keep the longer lock wait scoped to the supplier stock pipeline rather than
-- widening lock_timeout globally for all API traffic.

alter function curtainsuk_private.append_supplier_snapshot_batch(jsonb, jsonb)
  set lock_timeout = '30s';

alter function curtainsuk_private.approve_sdg_portal_stock_run(text)
  set lock_timeout = '30s';

alter function curtainsuk_private.approve_pt_webtex_stock_run(text)
  set lock_timeout = '30s';

alter function curtainsuk_private.materialize_daily_stock(timestamptz)
  set lock_timeout = '30s';

notify pgrst, 'reload config';
