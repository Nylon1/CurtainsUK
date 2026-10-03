
create index if not exists supplier_promotion_events_previous_approved_idx
on curtainsuk_private.supplier_promotion_events(previous_approved_snapshot_id)
where previous_approved_snapshot_id is not null;

create or replace function curtainsuk_private.reject_supplier_audit_mutation()
returns trigger
language plpgsql
set search_path to ''
as $function$
begin
  if current_user = 'postgres'
     and current_setting('curtainsuk.retention_cleanup', true) = 'on' then
    if tg_op = 'DELETE' then return old; end if;
    if tg_op = 'UPDATE' then return new; end if;
  end if;
  raise exception 'Supplier intelligence records are append-only';
end
$function$;

create or replace function curtainsuk_private.reject_daily_stock_audit_mutation()
returns trigger
language plpgsql
set search_path to ''
as $function$
begin
  if current_user = 'postgres'
     and current_setting('curtainsuk.retention_cleanup', true) = 'on' then
    if tg_op = 'DELETE' then return old; end if;
    if tg_op = 'UPDATE' then return new; end if;
  end if;
  raise exception 'Daily stock refresh evidence is append-only';
end
$function$;

create or replace function curtainsuk_private.browse_projection_mark_global_dirty()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  stock_run_id text;
  changed_snapshot_id text;
begin
  if current_setting('curtainsuk.retention_cleanup', true) = 'on' then
    return null;
  end if;

  if tg_table_name in ('supplier_snapshots','supplier_snapshot_prices','supplier_promotion_events') then
    if tg_table_name = 'supplier_snapshots' then
      stock_run_id := case when tg_op = 'DELETE' then old.run_id else new.run_id end;
    else
      changed_snapshot_id := case when tg_op = 'DELETE' then old.snapshot_id else new.snapshot_id end;
      select s.run_id into stock_run_id
      from curtainsuk_private.supplier_snapshots s
      where s.snapshot_id = changed_snapshot_id;
    end if;

    if stock_run_id like 'sdg-portal-routine:%'
       or stock_run_id like 'pt-webtex-routine:%' then
      return null;
    end if;
  end if;

  perform pg_advisory_xact_lock(4252026, 9248);
  insert into curtainsuk_private.browse_projection_dirty(fabric_id)
    values ('*')
    on conflict (fabric_id) do update set changed_at = excluded.changed_at;
  return null;
end
$function$;

create or replace function curtainsuk_private.compact_supplier_stock_evidence(
  p_supplier_id text,
  p_limit integer default 1000,
  p_dry_run boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path to ''
set statement_timeout to '120s'
set lock_timeout to '10s'
as $function$
declare
  v_adapter text;
  v_started timestamptz;
  v_completed timestamptz;
  v_expected integer;
  v_current integer;
  v_business integer;
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

  create temporary table if not exists retention_keep_snapshot_ids(
    snapshot_id text primary key
  ) on commit drop;
  truncate retention_keep_snapshot_ids;

  insert into retention_keep_snapshot_ids(snapshot_id)
  select snapshot_id from retention_current_snapshot_ids
  on conflict do nothing;

  insert into retention_keep_snapshot_ids(snapshot_id)
  select distinct scs.supplier_price_snapshot_id
  from curtainsuk_private.staging_configuration_snapshots scs
  join curtainsuk_private.supplier_snapshots s
    on s.snapshot_id=scs.supplier_price_snapshot_id
   and s.supplier_id=p_supplier_id
  on conflict do nothing;

  select count(*) - v_current into v_business
  from retention_keep_snapshot_ids;

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
      'candidate_batch',v_candidates,
      'has_old_evidence',v_candidates>0
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
$function$;

revoke all on function curtainsuk_private.compact_supplier_stock_evidence(text,integer,boolean)
  from public, anon, authenticated;
grant execute on function curtainsuk_private.compact_supplier_stock_evidence(text,integer,boolean)
  to service_role;
