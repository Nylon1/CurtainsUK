-- Private, anonymous storefront journey telemetry. Never store URL queries,
-- form values, customer identity, request bodies, or browser error messages.
create table curtainsuk_private.customer_journey_events (
  event_id uuid primary key,
  journey_id uuid not null,
  request_id uuid not null,
  occurred_at timestamptz not null default now(),
  kind text not null check (kind in ('PAGE', 'ACTION', 'ERROR', 'PERFORMANCE')),
  page_path text not null check (length(page_path) between 1 and 160),
  name text not null check (name ~ '^[A-Z][A-Z0-9_]{1,63}$'),
  code text check (code is null or code ~ '^[A-Z][A-Z0-9_]{1,63}$'),
  status smallint check (status is null or status between 100 and 599),
  release text not null check (length(release) between 1 and 80),
  browser text not null check (browser in ('Chrome', 'Edge', 'Firefox', 'Safari', 'Other')),
  channel text check (channel in ('Direct', 'Search', 'Social', 'Paid', 'Email', 'Referral', 'Unknown')),
  source text not null check (source in ('STOREFRONT', 'APP_PROXY')),
  constraint journey_error_code_required check (kind <> 'ERROR' or code is not null)
);

create index customer_journey_events_journey_time
  on curtainsuk_private.customer_journey_events (journey_id, occurred_at, event_id);
create index customer_journey_events_recent_errors
  on curtainsuk_private.customer_journey_events (occurred_at desc)
  where kind = 'ERROR';
create index customer_journey_events_recent_pages
  on curtainsuk_private.customer_journey_events (occurred_at desc)
  where kind = 'PAGE';
create index customer_journey_events_recent_names
  on curtainsuk_private.customer_journey_events (name, occurred_at desc);
create index customer_journey_events_recent_all
  on curtainsuk_private.customer_journey_events (occurred_at desc);

alter table curtainsuk_private.customer_journey_events enable row level security;
alter table curtainsuk_private.customer_journey_events force row level security;
revoke all on curtainsuk_private.customer_journey_events from public, anon, authenticated;
grant select, insert, delete on curtainsuk_private.customer_journey_events to service_role;

-- One email alert per anonymous journey. No address is stored here; the
-- destination is a private deployment setting. The alert row expires with
-- the referenced event after 30 days.
create table curtainsuk_private.customer_visit_alerts (
  journey_id uuid primary key,
  event_id uuid not null unique references curtainsuk_private.customer_journey_events(event_id) on delete cascade,
  state text not null default 'PENDING' check (state in ('PENDING', 'SENT', 'FAILED')),
  attempted_at timestamptz,
  sent_at timestamptz,
  provider_email_id text,
  failure_code text check (failure_code is null or failure_code ~ '^[A-Z][A-Z0-9_]{1,63}$')
);
alter table curtainsuk_private.customer_visit_alerts enable row level security;
alter table curtainsuk_private.customer_visit_alerts force row level security;
revoke all on curtainsuk_private.customer_visit_alerts from public, anon, authenticated;
grant select, insert, update on curtainsuk_private.customer_visit_alerts to service_role;

-- Server faults are separate from consented visitor journeys. Route templates
-- and fixed codes only; no request URL, body, IP, headers or exception text.
create table curtainsuk_private.customer_operational_errors (
  error_id uuid primary key,
  occurred_at timestamptz not null default now(),
  request_id uuid not null,
  route_path text not null check (length(route_path) between 1 and 160),
  code text not null check (code ~ '^[A-Z][A-Z0-9_]{1,63}$'),
  status smallint not null check (status between 500 and 599),
  release text not null check (length(release) between 1 and 80),
  source text not null check (source in ('UNHANDLED', 'HANDLED'))
);
create index customer_operational_errors_recent on curtainsuk_private.customer_operational_errors (occurred_at desc);
alter table curtainsuk_private.customer_operational_errors enable row level security;
alter table curtainsuk_private.customer_operational_errors force row level security;
revoke all on curtainsuk_private.customer_operational_errors from public, anon, authenticated;
grant select, insert, delete on curtainsuk_private.customer_operational_errors to service_role;

create function curtainsuk_private.customer_journey_summary(p_days integer default 7)
returns jsonb language sql stable set search_path = '' as $$
  with recent as (
    select kind, name, page_path, journey_id, channel
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
      count(distinct journey_id) as journeys
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
revoke all on function curtainsuk_private.customer_journey_summary(integer) from public, anon, authenticated;
grant execute on function curtainsuk_private.customer_journey_summary(integer) to service_role;

-- Anonymous visit timelines are short-lived. The staff view is deliberately
-- limited to the retained period; this job is part of the migration, not a
-- temporary deployment setting.
select cron.schedule(
  'curtainsuk-customer-journey-retention',
  '17 3 * * *',
  $$delete from curtainsuk_private.customer_journey_events where occurred_at < now() - interval '30 days'$$
);
select cron.schedule(
  'curtainsuk-operational-error-retention',
  '23 3 * * *',
  $$delete from curtainsuk_private.customer_operational_errors where occurred_at < now() - interval '30 days'$$
);
