-- Synthetic checks are separate from customer activity and server faults.
-- Only the authenticated monitor ingestion route can write through service_role.
create table curtainsuk_private.customer_synthetic_monitor_runs (
  run_id bigint not null check (run_id > 0),
  attempt integer not null check (attempt between 1 and 100),
  started_at timestamptz not null,
  completed_at timestamptz not null,
  expected_next_at timestamptz not null,
  workflow_sha text not null check (workflow_sha ~ '^[a-f0-9]{40}$'),
  source_sha text not null check (source_sha ~ '^[a-f0-9]{40}$'),
  deployment_sha text check (deployment_sha is null or deployment_sha ~ '^[a-f0-9]{40}$'),
  deployment_id text check (deployment_id is null or deployment_id ~ '^[A-Za-z0-9_-]{1,80}$'),
  report jsonb not null,
  received_at timestamptz not null default now(),
  primary key (run_id, attempt),
  constraint synthetic_run_times check (started_at <= completed_at and completed_at < expected_next_at)
);
create index customer_synthetic_monitor_runs_recent
  on curtainsuk_private.customer_synthetic_monitor_runs (completed_at desc);
alter table curtainsuk_private.customer_synthetic_monitor_runs enable row level security;
alter table curtainsuk_private.customer_synthetic_monitor_runs force row level security;
revoke all on curtainsuk_private.customer_synthetic_monitor_runs from public, anon, authenticated;
grant select, insert, delete on curtainsuk_private.customer_synthetic_monitor_runs to service_role;

create table curtainsuk_private.customer_synthetic_findings (
  check_id text primary key check (check_id ~ '^[a-z][a-z0-9-]{1,63}$'),
  name text not null,
  feature text not null,
  route_path text not null,
  severity text not null check (severity in ('CRITICAL', 'HIGH', 'MEDIUM')),
  reason text not null,
  state text not null check (state in ('OPEN', 'RESOLVED')),
  occurrences integer not null check (occurrences > 0),
  first_detected_at timestamptz not null,
  last_detected_at timestamptz not null,
  recovered_at timestamptz,
  source_sha text not null,
  deployment_sha text,
  deployment_id text
);
create index customer_synthetic_findings_open
  on curtainsuk_private.customer_synthetic_findings (severity, last_detected_at desc)
  where state = 'OPEN';
alter table curtainsuk_private.customer_synthetic_findings enable row level security;
alter table curtainsuk_private.customer_synthetic_findings force row level security;
revoke all on curtainsuk_private.customer_synthetic_findings from public, anon, authenticated;
grant select, insert, update on curtainsuk_private.customer_synthetic_findings to service_role;

create table curtainsuk_private.customer_synthetic_check_registry (
  check_id text primary key check (check_id ~ '^[a-z][a-z0-9-]{1,63}$'),
  name text not null,
  feature text not null,
  route_path text not null,
  first_seen_at timestamptz not null,
  last_seen_at timestamptz not null
);
alter table curtainsuk_private.customer_synthetic_check_registry enable row level security;
alter table curtainsuk_private.customer_synthetic_check_registry force row level security;
revoke all on curtainsuk_private.customer_synthetic_check_registry from public, anon, authenticated;
grant select, insert, update on curtainsuk_private.customer_synthetic_check_registry to service_role;

-- The run and its incident transitions commit together. A repeated run/attempt
-- cannot inflate occurrence counts or clear an incident twice.
create function curtainsuk_private.record_customer_synthetic_run(
  p_run_id bigint, p_attempt integer, p_started_at timestamptz,
  p_completed_at timestamptz, p_expected_next_at timestamptz,
  p_workflow_sha text, p_source_sha text, p_deployment_sha text,
  p_deployment_id text, p_report jsonb
) returns void language plpgsql security invoker set search_path = '' as $$
declare item jsonb;
begin
  insert into curtainsuk_private.customer_synthetic_monitor_runs
    (run_id, attempt, started_at, completed_at, expected_next_at,
     workflow_sha, source_sha, deployment_sha, deployment_id, report)
  values (p_run_id, p_attempt, p_started_at, p_completed_at, p_expected_next_at,
    p_workflow_sha, p_source_sha, p_deployment_sha, p_deployment_id, p_report);
  for item in select value from jsonb_array_elements(p_report -> 'checks') loop
    insert into curtainsuk_private.customer_synthetic_check_registry as registry
      (check_id, name, feature, route_path, first_seen_at, last_seen_at)
    values (item ->> 'id', item ->> 'name', item ->> 'feature', item ->> 'route',
      p_completed_at, p_completed_at)
    on conflict (check_id) do update set
      name = excluded.name, feature = excluded.feature,
      route_path = excluded.route_path, last_seen_at = p_completed_at;
    if item ->> 'status' = 'FAIL' then
      insert into curtainsuk_private.customer_synthetic_findings as finding
        (check_id, name, feature, route_path, severity, reason, state,
         occurrences, first_detected_at, last_detected_at, recovered_at,
         source_sha, deployment_sha, deployment_id)
      values (item ->> 'id', item ->> 'name', item ->> 'feature', item ->> 'route',
        item ->> 'severity', item ->> 'reason', 'OPEN', 1,
        p_completed_at, p_completed_at, null,
        p_source_sha, p_deployment_sha, p_deployment_id)
      on conflict (check_id) do update set
        name = excluded.name, feature = excluded.feature,
        route_path = excluded.route_path, severity = excluded.severity,
        reason = excluded.reason, state = 'OPEN',
        occurrences = case when finding.state = 'OPEN' then finding.occurrences + 1 else 1 end,
        first_detected_at = case when finding.state = 'OPEN' then finding.first_detected_at else p_completed_at end,
        last_detected_at = p_completed_at, recovered_at = null,
        source_sha = p_source_sha, deployment_sha = p_deployment_sha,
        deployment_id = p_deployment_id;
    else
      update curtainsuk_private.customer_synthetic_findings
      set state = 'RESOLVED', recovered_at = p_completed_at
      where check_id = item ->> 'id' and state = 'OPEN';
    end if;
  end loop;
end $$;
revoke all on function curtainsuk_private.record_customer_synthetic_run(bigint, integer, timestamptz,
  timestamptz, timestamptz, text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function curtainsuk_private.record_customer_synthetic_run(bigint, integer, timestamptz,
  timestamptz, timestamptz, text, text, text, text, jsonb) to service_role;

-- Standalone no-consent technical faults must not inflate visitor journeys.
create or replace function curtainsuk_private.customer_journey_summary(p_days integer default 7)
returns jsonb language sql stable set search_path = '' as $$
  with recent as (
    select kind, name, page_path, journey_id, channel, release
    from curtainsuk_private.customer_journey_events
    where occurred_at >= now() - (least(greatest(p_days, 1), 30) || ' days')::interval
  ), totals as (
    select count(*) filter (where name = 'VISIT_START') as visits,
      count(*) filter (where name = 'PAGE_VIEW') as page_views,
      count(*) filter (where name = 'CART_ADD') as cart_adds,
      count(*) filter (where name = 'CART_VIEW') as cart_views,
      count(*) filter (where name = 'CHECKOUT_START') as checkout_starts,
      count(*) filter (where kind = 'ERROR') as errors,
      count(*) filter (where kind = 'PERFORMANCE') as slow_events,
      count(distinct journey_id) filter (where release not like '%-fault') as journeys
    from recent
  ), pages as (
    select page_path, count(*) as views
    from recent where name = 'PAGE_VIEW'
    group by page_path order by views desc, page_path limit 30
  ), paid as (
    select distinct shopify_order_gid from (
      select shopify_order_gid from curtainsuk_private.mtm_paid_orders
        where paid_at >= now() - (least(greatest(p_days, 1), 30) || ' days')::interval
      union all
      select shopify_order_gid from curtainsuk_private.cushion_paid_manifests
        where created_at >= now() - (least(greatest(p_days, 1), 30) || ' days')::interval
      union all
      select shopify_order_gid from curtainsuk_private.smart_track_paid_manifests
        where created_at >= now() - (least(greatest(p_days, 1), 30) || ' days')::interval
    ) paid_order_ids
  ), channels as (
    select channel, count(*) as visits
    from recent where name = 'VISIT_START' and channel is not null
    group by channel order by visits desc, channel
  )
  select jsonb_build_object(
    'visits', totals.visits, 'journeys', totals.journeys,
    'pageViews', totals.page_views, 'cartAdds', totals.cart_adds,
    'cartViews', totals.cart_views, 'checkoutStarts', totals.checkout_starts,
    'errors', totals.errors, 'slowEvents', totals.slow_events,
    'paidOrders', (select count(*) from paid),
    'channels', coalesce((select jsonb_agg(jsonb_build_object('name', channel, 'visits', visits) order by visits desc, channel) from channels), '[]'::jsonb),
    'topPages', coalesce((select jsonb_agg(jsonb_build_object('path', page_path, 'views', views) order by views desc, page_path) from pages), '[]'::jsonb)
  ) from totals;
$$;
notify pgrst, 'reload schema';
select cron.schedule(
  'curtainsuk-synthetic-monitor-retention',
  '31 3 * * *',
  $$delete from curtainsuk_private.customer_synthetic_monitor_runs
    where completed_at < now() - interval '90 days'$$
);
