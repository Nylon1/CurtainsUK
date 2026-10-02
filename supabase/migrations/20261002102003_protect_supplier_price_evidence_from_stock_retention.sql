CREATE OR REPLACE FUNCTION curtainsuk_private.compact_supplier_stock_evidence(p_supplier_id text, p_limit integer DEFAULT 1000, p_dry_run boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
 SET statement_timeout TO '120s'
 SET lock_timeout TO '10s'
AS $function$
declare
  v_adapter text;
  v_started timestamptz;
  v_completed timestamptz;
  v_expected integer;
  v_current integer;
  v_business integer := 0;
  v_price_expected integer := 0;
  v_price_current integer := 0;
  v_price_snapshots_protected integer := 0;
  v_candidates integer;
  v_daily_deleted integer := 0;
  v_history_deleted integer := 0;
  v_prev_links_cleared integer := 0;
  v_promotions_deleted integer := 0;
  v_prices_deleted integer := 0;
  v_batches_deleted integer := 0;
  v_snapshots_deleted integer := 0;
  v_n integer := 0;
  v_has_more boolean := false;
begin
  if p_supplier_id not in ('prestigious-textiles','sanderson-design-group') then
    raise exception 'STOCK_RETENTION_SUPPLIER_REQUIRED';
  end if;
  if p_limit < 1 or p_limit > 5000 then
    raise exception 'STOCK_RETENTION_LIMIT_1_TO_5000';
  end if;

  if session_user <> 'postgres' then
    if coalesce(
      nullif(current_setting('request.jwt.claim.role', true),''),
      (nullif(current_setting('request.jwt.claims', true),'')::jsonb ->> 'role')
    ) is distinct from 'service_role' then
      raise exception 'STOCK_RETENTION_SERVICE_ROLE_REQUIRED';
    end if;
  end if;

  v_adapter := case
    when p_supplier_id='prestigious-textiles' then 'pt-webtex-full-refresh'
    else 'sdg-trade-portal-full-refresh'
  end;

  perform pg_advisory_xact_lock(hashtext('curtainsuk-stock-retention-' || p_supplier_id));

  select started_at, completed_at, snapshots_appended
    into v_started, v_completed, v_expected
  from curtainsuk_private.supplier_sync_runs
  where supplier_id=p_supplier_id
    and adapter_id=v_adapter
    and status='SUCCEEDED'
  order by completed_at desc
  limit 1;

  if v_completed is null
     or v_completed < now() - curtainsuk_private.stock_validity_window() then
    raise exception 'STOCK_RETENTION_CURRENT_SUCCESS_REQUIRED';
  end if;

  create temporary table if not exists retention_current_snapshot_ids(
    snapshot_id text primary key
  ) on commit drop;
  truncate retention_current_snapshot_ids;

  insert into retention_current_snapshot_ids(snapshot_id)
  select distinct d.source_snapshot_id
  from curtainsuk_private.daily_stock_snapshots d
  where d.supplier_id=p_supplier_id
    and d.checked_at >= v_started
    and d.checked_at <= v_completed;

  select count(*) into v_current from retention_current_snapshot_ids;
  if v_current <> v_expected then
    raise exception 'STOCK_RETENTION_CURRENT_COVERAGE_MISMATCH expected %, found %',
      v_expected, v_current;
  end if;

  -- Stock retention must never decide the lifecycle of commercial price evidence.
  -- Fail closed while a currently commercial/price-verified SKU has lost its
  -- latest approved genuine price observation.
  select count(distinct c.supplier_sku)
    into v_price_expected
  from curtainsuk_private.fabric_colourways c
  where c.supplier_id=p_supplier_id
    and c.lifecycle_state<>'DISCONTINUED'
    and c.price_verification_status='VERIFIED'
    and (c.staging_catalog_visible or c.storefront_selectable);

  select count(distinct s.supplier_sku)
    into v_price_current
  from curtainsuk_private.supplier_snapshots s
  join curtainsuk_private.supplier_snapshot_prices p using(snapshot_id)
  where s.supplier_id=p_supplier_id
    and s.validation_status='VALIDATED'
    and s.checked_at<=now()
    and p.currency='GBP'
    and (case when s.supplier_id='prestigious-textiles'
              then p.standard_trade_price else p.cut_trade_price end)>0
    and (
      select e.promotion_state
      from curtainsuk_private.supplier_promotion_events e
      where e.snapshot_id=s.snapshot_id
      order by e.created_at desc,
        case e.promotion_state
          when 'EXPIRED' then 4
          when 'REJECTED' then 3
          when 'APPROVED_FOR_PROJECTION' then 2
          when 'VALIDATED' then 1
          else 0
        end desc,
        e.event_id desc
      limit 1
    )='APPROVED_FOR_PROJECTION'
    and exists (
      select 1
      from curtainsuk_private.fabric_colourways c
      where c.supplier_id=s.supplier_id
        and c.supplier_sku=s.supplier_sku
        and c.lifecycle_state<>'DISCONTINUED'
        and c.price_verification_status='VERIFIED'
        and (c.staging_catalog_visible or c.storefront_selectable)
    );

  if v_price_current <> v_price_expected then
    raise exception 'STOCK_RETENTION_PRICE_COVERAGE_MISMATCH expected %, found %',
      v_price_expected, v_price_current;
  end if;

  create temporary table if not exists retention_keep_snapshot_ids(
    snapshot_id text primary key
  ) on commit drop;
  truncate retention_keep_snapshot_ids;

  insert into retention_keep_snapshot_ids(snapshot_id)
  select snapshot_id from retention_current_snapshot_ids
  on conflict do nothing;

  -- Immutable business handoffs remain protected.
  insert into retention_keep_snapshot_ids(snapshot_id)
  select distinct scs.supplier_price_snapshot_id
  from curtainsuk_private.staging_configuration_snapshots scs
  join curtainsuk_private.supplier_snapshots s
    on s.snapshot_id=scs.supplier_price_snapshot_id
   and s.supplier_id=p_supplier_id
  on conflict do nothing;

  select count(distinct scs.supplier_price_snapshot_id)
    into v_business
  from curtainsuk_private.staging_configuration_snapshots scs
  join curtainsuk_private.supplier_snapshots s
    on s.snapshot_id=scs.supplier_price_snapshot_id
   and s.supplier_id=p_supplier_id;

  -- Preserve every genuine positive price-bearing snapshot. Stock compaction is
  -- intentionally forbidden from deleting commercial price history, whether
  -- currently approved, superseded or rejected.
  insert into retention_keep_snapshot_ids(snapshot_id)
  select distinct s.snapshot_id
  from curtainsuk_private.supplier_snapshots s
  join curtainsuk_private.supplier_snapshot_prices p using(snapshot_id)
  where s.supplier_id=p_supplier_id
    and p.currency='GBP'
    and (case when s.supplier_id='prestigious-textiles'
              then p.standard_trade_price else p.cut_trade_price end)>0
  on conflict do nothing;

  select count(*)
    into v_price_snapshots_protected
  from curtainsuk_private.supplier_snapshots s
  join curtainsuk_private.supplier_snapshot_prices p using(snapshot_id)
  where s.supplier_id=p_supplier_id
    and p.currency='GBP'
    and (case when s.supplier_id='prestigious-textiles'
              then p.standard_trade_price else p.cut_trade_price end)>0;

  create temporary table if not exists retention_candidate_snapshot_ids(
    snapshot_id text primary key
  ) on commit drop;
  truncate retention_candidate_snapshot_ids;

  insert into retention_candidate_snapshot_ids(snapshot_id)
  select s.snapshot_id
  from curtainsuk_private.supplier_snapshots s
  where s.supplier_id=p_supplier_id
    and not exists (
      select 1 from retention_keep_snapshot_ids k
      where k.snapshot_id=s.snapshot_id
    )
  limit p_limit;

  select count(*) into v_candidates from retention_candidate_snapshot_ids;

  if p_dry_run then
    return jsonb_build_object(
      'supplier',p_supplier_id,
      'dry_run',true,
      'latest_resolved',v_expected,
      'current_materialized_protected',v_current,
      'business_snapshot_refs_protected',v_business,
      'commercial_price_skus_required',v_price_expected,
      'commercial_price_skus_current',v_price_current,
      'price_snapshots_protected',v_price_snapshots_protected,
      'candidate_batch',v_candidates,
      'has_old_stock_evidence',v_candidates>0
    );
  end if;

  perform set_config('curtainsuk.retention_cleanup','on',true);

  if v_candidates > 0 then
    delete from curtainsuk_private.daily_stock_snapshots d
    using retention_candidate_snapshot_ids c
    where d.source_snapshot_id=c.snapshot_id;
    get diagnostics v_daily_deleted = row_count;

    delete from curtainsuk_private.daily_stock_snapshot_history h
    using retention_candidate_snapshot_ids c
    where h.source_snapshot_id=c.snapshot_id;
    get diagnostics v_history_deleted = row_count;

    update curtainsuk_private.supplier_promotion_events e
    set previous_approved_snapshot_id=null
    where e.previous_approved_snapshot_id in (
      select snapshot_id from retention_candidate_snapshot_ids
    );
    get diagnostics v_prev_links_cleared = row_count;

    delete from curtainsuk_private.supplier_promotion_events e
    using retention_candidate_snapshot_ids c
    where e.snapshot_id=c.snapshot_id;
    get diagnostics v_promotions_deleted = row_count;

    delete from curtainsuk_private.supplier_snapshot_prices p
    using retention_candidate_snapshot_ids c
    where p.snapshot_id=c.snapshot_id;
    get diagnostics v_prices_deleted = row_count;

    delete from curtainsuk_private.supplier_snapshot_batches b
    using retention_candidate_snapshot_ids c
    where b.snapshot_id=c.snapshot_id;
    get diagnostics v_batches_deleted = row_count;

    delete from curtainsuk_private.supplier_snapshots s
    using retention_candidate_snapshot_ids c
    where s.snapshot_id=c.snapshot_id;
    get diagnostics v_snapshots_deleted = row_count;

    if v_snapshots_deleted <> v_candidates then
      raise exception 'STOCK_RETENTION_DELETE_MISMATCH expected %, deleted %',
        v_candidates, v_snapshots_deleted;
    end if;
  end if;

  select exists(
    select 1
    from curtainsuk_private.supplier_snapshots s
    where s.supplier_id=p_supplier_id
      and not exists (
        select 1 from retention_keep_snapshot_ids k
        where k.snapshot_id=s.snapshot_id
      )
    limit 1
  ) into v_has_more;

  if not v_has_more then
    delete from curtainsuk_private.daily_stock_snapshots d
    where d.supplier_id=p_supplier_id
      and not exists (
        select 1 from retention_current_snapshot_ids c
        where c.snapshot_id=d.source_snapshot_id
      );
    get diagnostics v_n = row_count;
    v_daily_deleted := v_daily_deleted + v_n;

    delete from curtainsuk_private.daily_stock_snapshot_history h
    using curtainsuk_private.supplier_snapshots s
    where h.source_snapshot_id=s.snapshot_id
      and s.supplier_id=p_supplier_id
      and not exists (
        select 1 from retention_current_snapshot_ids c
        where c.snapshot_id=h.source_snapshot_id
      );
    get diagnostics v_n = row_count;
    v_history_deleted := v_history_deleted + v_n;
  end if;

  return jsonb_build_object(
    'supplier',p_supplier_id,
    'dry_run',false,
    'latest_resolved',v_expected,
    'current_materialized_protected',v_current,
    'business_snapshot_refs_protected',v_business,
    'commercial_price_skus_required',v_price_expected,
    'commercial_price_skus_current',v_price_current,
    'price_snapshots_protected',v_price_snapshots_protected,
    'daily_stock_rows_deleted',v_daily_deleted,
    'history_rows_deleted',v_history_deleted,
    'previous_approval_links_cleared',v_prev_links_cleared,
    'promotion_rows_deleted',v_promotions_deleted,
    'price_rows_deleted',v_prices_deleted,
    'batch_rows_deleted',v_batches_deleted,
    'supplier_snapshots_deleted',v_snapshots_deleted,
    'has_more',v_has_more
  );
end
$function$
;

revoke all on function curtainsuk_private.compact_supplier_stock_evidence(text,integer,boolean)
  from public, anon, authenticated;
grant execute on function curtainsuk_private.compact_supplier_stock_evidence(text,integer,boolean)
  to service_role;
