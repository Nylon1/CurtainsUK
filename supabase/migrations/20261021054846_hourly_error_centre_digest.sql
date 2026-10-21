-- One private hourly digest replaces per-visit email. Historical visit alert
-- receipts remain until their existing journey retention deletes them.
create table curtainsuk_private.customer_hourly_digests (
  hour_start timestamptz primary key,
  state text not null check (state in ('SENDING', 'SENT', 'FAILED')),
  attempted_at timestamptz not null,
  sent_at timestamptz,
  provider_email_id text,
  failure_code text check (failure_code is null or failure_code ~ '^[A-Z][A-Z0-9_]{1,63}$'),
  constraint digest_hour_boundary check (hour_start = date_trunc('hour', hour_start))
);
alter table curtainsuk_private.customer_hourly_digests enable row level security;
alter table curtainsuk_private.customer_hourly_digests force row level security;
revoke all on curtainsuk_private.customer_hourly_digests from public, anon, authenticated;
grant select, insert, update, delete on curtainsuk_private.customer_hourly_digests to service_role;

-- Atomic claim permits a retry after a stalled or failed attempt, but never
-- after a sent receipt. Resend's stable hourly key covers ambiguous replies.
create function curtainsuk_private.claim_customer_hourly_digest(p_hour_start timestamptz)
returns boolean language plpgsql volatile set search_path = '' as $$
declare claimed boolean;
begin
  if p_hour_start is null or p_hour_start <> date_trunc('hour', p_hour_start)
    or p_hour_start >= date_trunc('hour', now())
    or p_hour_start < date_trunc('hour', now()) - interval '48 hours' then
    raise exception 'INVALID_DIGEST_HOUR';
  end if;
  insert into curtainsuk_private.customer_hourly_digests (hour_start, state, attempted_at)
    values (p_hour_start, 'SENDING', now())
    on conflict (hour_start) do update
      set state = 'SENDING', attempted_at = now(), failure_code = null
      where curtainsuk_private.customer_hourly_digests.state in ('FAILED', 'SENDING')
        and curtainsuk_private.customer_hourly_digests.attempted_at < now() - interval '8 minutes'
        and curtainsuk_private.customer_hourly_digests.attempted_at > now() - interval '23 hours'
    returning true into claimed;
  return coalesce(claimed, false);
end;
$$;
revoke all on function curtainsuk_private.claim_customer_hourly_digest(timestamptz) from public, anon, authenticated;
grant execute on function curtainsuk_private.claim_customer_hourly_digest(timestamptz) to service_role;

-- The email contains bounded, anonymous aggregates and fixed error codes.
-- Exact, redacted technical detail remains in the authenticated dashboard.
create function curtainsuk_private.customer_hourly_digest_summary(p_hour_start timestamptz)
returns jsonb language sql stable set search_path = '' as $$
  with recent as (
    select kind, name, page_path, code, channel, journey_id
    from curtainsuk_private.customer_journey_events
    where occurred_at >= p_hour_start and occurred_at < p_hour_start + interval '1 hour'
  ), totals as (
    select count(*) filter (where name = 'VISIT_START') as visits,
      count(distinct journey_id) as journeys,
      count(*) filter (where name = 'PAGE_VIEW') as page_views,
      count(*) filter (where name = 'CART_ADD') as cart_adds,
      count(*) filter (where name = 'CART_VIEW') as cart_views,
      count(*) filter (where name = 'CHECKOUT_START') as checkout_starts,
      count(*) filter (where kind = 'ERROR') as browser_errors,
      count(*) filter (where kind = 'PERFORMANCE') as slow_loads
    from recent
  ), pages as (
    select page_path, count(*) as views from recent where name = 'PAGE_VIEW'
    group by page_path order by views desc, page_path limit 5
  ), channels as (
    select channel, count(*) as visits from recent
    where name = 'VISIT_START' and channel is not null
    group by channel order by visits desc, channel limit 5
  ), browser_error_groups as (
    select code, page_path, count(*) as occurrences from recent where kind = 'ERROR'
    group by code, page_path order by occurrences desc, code, page_path limit 5
  ), service_errors as (
    select code, route_path, count(*) as occurrences
    from curtainsuk_private.customer_operational_errors
    where occurred_at >= p_hour_start and occurred_at < p_hour_start + interval '1 hour'
    group by code, route_path order by occurrences desc, code, route_path limit 5
  ), service_total as (
    select count(*) as errors from curtainsuk_private.customer_operational_errors
    where occurred_at >= p_hour_start and occurred_at < p_hour_start + interval '1 hour'
  ), paid as (
    select distinct shopify_order_gid from (
      select shopify_order_gid from curtainsuk_private.mtm_paid_orders
        where paid_at >= p_hour_start and paid_at < p_hour_start + interval '1 hour'
      union all
      select shopify_order_gid from curtainsuk_private.cushion_paid_manifests
        where created_at >= p_hour_start and created_at < p_hour_start + interval '1 hour'
      union all
      select shopify_order_gid from curtainsuk_private.smart_track_paid_manifests
        where created_at >= p_hour_start and created_at < p_hour_start + interval '1 hour'
    ) order_ids
  )
  select jsonb_build_object(
    'visits', totals.visits, 'journeys', totals.journeys, 'pageViews', totals.page_views,
    'cartAdds', totals.cart_adds, 'cartViews', totals.cart_views,
    'checkoutStarts', totals.checkout_starts, 'paidOrders', (select count(*) from paid),
    'browserErrors', totals.browser_errors, 'serviceErrors', (select errors from service_total),
    'slowLoads', totals.slow_loads,
    'topPages', coalesce((select jsonb_agg(jsonb_build_object('path', page_path, 'views', views) order by views desc, page_path) from pages), '[]'::jsonb),
    'channels', coalesce((select jsonb_agg(jsonb_build_object('name', channel, 'visits', visits) order by visits desc, channel) from channels), '[]'::jsonb),
    'browserErrorGroups', coalesce((select jsonb_agg(jsonb_build_object('code', code, 'path', page_path, 'count', occurrences) order by occurrences desc, code, page_path) from browser_error_groups), '[]'::jsonb),
    'serviceErrorGroups', coalesce((select jsonb_agg(jsonb_build_object('code', code, 'path', route_path, 'count', occurrences) order by occurrences desc, code, route_path) from service_errors), '[]'::jsonb)
  ) from totals;
$$;
revoke all on function curtainsuk_private.customer_hourly_digest_summary(timestamptz) from public, anon, authenticated;
grant execute on function curtainsuk_private.customer_hourly_digest_summary(timestamptz) to service_role;

select cron.schedule(
  'curtainsuk-hourly-digest-receipt-retention',
  '29 3 * * *',
  $$delete from curtainsuk_private.customer_hourly_digests where hour_start < now() - interval '35 days'$$
);
