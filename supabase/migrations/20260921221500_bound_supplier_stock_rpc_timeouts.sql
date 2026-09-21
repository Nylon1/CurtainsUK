-- Supplier stock automation runs through PostgREST as service_role.
-- service_role inherits authenticator's 8s statement_timeout unless a function
-- provides a bounded override. Normal 100-identity stock batches can exceed
-- that threshold, causing HTTP 500s after successful supplier retrieval.
--
-- Keep the override scoped to the stock evidence/approval RPCs rather than
-- widening the timeout for all service-role API traffic.

alter function curtainsuk_private.append_supplier_snapshot_batch(jsonb, jsonb)
  set statement_timeout = '30s';

alter function curtainsuk_private.approve_sdg_portal_stock_run(text)
  set statement_timeout = '30s';

alter function curtainsuk_private.approve_pt_webtex_stock_run(text)
  set statement_timeout = '30s';

-- Approval policies repeatedly address snapshots by routine batch run_id.
-- Indexing this predicate keeps batch approval bounded as evidence history grows.
create index if not exists supplier_snapshots_run_id_idx
  on curtainsuk_private.supplier_snapshots(run_id);

notify pgrst, 'reload config';
