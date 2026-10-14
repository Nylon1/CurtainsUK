-- One UTC-day spending ledger for Jane, created only when a paid reply needs it.
-- The existing reservation function still enforces US$5 per run and US$1 per
-- consultation. No public, customer or service-role table access is added.
begin;
set local lock_timeout = '500ms';
set local statement_timeout = '3s';

create table advisory.public_daily_runs (
  utc_day date primary key,
  run_id uuid not null unique references advisory.evaluation_runs(id),
  created_at timestamptz not null default clock_timestamp()
);
alter table advisory.public_daily_runs enable row level security;
revoke all on advisory.public_daily_runs from public, anon, authenticated, service_role,
  advisory_runtime, advisory_indexer, advisory_retention;

create function advisory.ensure_public_daily_run() returns uuid
language plpgsql security definer set search_path = pg_catalog
as $$
declare
  observed_at timestamptz := clock_timestamp();
  day_utc date := (observed_at at time zone 'UTC')::date;
  next_midnight timestamptz := (day_utc + 1)::timestamp at time zone 'UTC';
  selected_id uuid;
begin
  -- Serialise the first request of a day across Vercel instances. This lock
  -- is transaction-scoped and does not touch any catalogue or customer row.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('curtainsuk:jane:public:' || day_utc::text, 0));
  select run_id into selected_id from advisory.public_daily_runs where utc_day = day_utc;
  if selected_id is null then
    selected_id := pg_catalog.gen_random_uuid();
    insert into advisory.evaluation_runs(id, enabled, limit_micro, used_micro, expires_at)
      values (selected_id, true, 5000000, 0, next_midnight);
    insert into advisory.public_daily_runs(utc_day, run_id) values (day_utc, selected_id);
  end if;
  if not exists (
    select 1 from advisory.evaluation_runs
    where id = selected_id and enabled and limit_micro = 5000000
      and used_micro between 0 and 5000000 and expires_at = next_midnight
  ) then
    raise exception 'PUBLIC_DAILY_BUDGET_INVALID';
  end if;
  return selected_id;
end;
$$;
revoke all on function advisory.ensure_public_daily_run() from public, anon, authenticated, service_role;
grant execute on function advisory.ensure_public_daily_run() to advisory_runtime;

-- The original per-run guard covers one consultation within one day. A saved
-- consultation can cross midnight, so enforce its US$1 ceiling across every
-- public daily run as well. Include legacy dated public receipts from before
-- this migration; session UUIDs are unique to each consultation. Existing
-- private evaluation receipts are not changed.
create index advisory_spend_session_global on advisory.spend_reservations(session_id);
create function advisory.guard_public_consultation_spend() returns trigger
language plpgsql security definer set search_path = pg_catalog
as $$
declare
  prior_micro bigint;
begin
  if not exists (select 1 from advisory.public_daily_runs where run_id = new.run_id) then
    return new;
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    'curtainsuk:jane:session:' || new.session_id::text, 0));
  select coalesce(sum(r.charged_micro), 0) into prior_micro
  from advisory.spend_reservations r
  where r.session_id = new.session_id and r.id <> new.id;
  if prior_micro + new.charged_micro > 1000000 then
    raise exception 'BUDGET_EXHAUSTED';
  end if;
  return new;
end;
$$;
revoke all on function advisory.guard_public_consultation_spend() from public, anon, authenticated, service_role,
  advisory_runtime, advisory_indexer, advisory_retention;
create trigger advisory_public_consultation_spend_guard
before insert or update of charged_micro on advisory.spend_reservations
for each row execute function advisory.guard_public_consultation_spend();

commit;
