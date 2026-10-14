-- Four-specialist public budget, separate from Jane's approved daily run.
-- Review only: do not apply to the hosted project before backup and approval.
begin;
set local lock_timeout = '500ms';
set local statement_timeout = '3s';

create table advisory.specialist_daily_runs (
  utc_day date primary key,
  run_id uuid not null unique references advisory.evaluation_runs(id),
  created_at timestamptz not null default clock_timestamp()
);
alter table advisory.specialist_daily_runs enable row level security;
revoke all on advisory.specialist_daily_runs from public, anon, authenticated, service_role,
  advisory_runtime, advisory_indexer, advisory_retention;

-- Durable per-consultation total survives receipt retention for an active chat.
-- This contains only a random session UUID and spend units, and is removed
-- when the consultation is deleted or expires.
create table advisory.specialist_session_spend (
  session_id uuid primary key,
  used_micro bigint not null check (used_micro between 0 and 1000000)
);
alter table advisory.specialist_session_spend enable row level security;
revoke all on advisory.specialist_session_spend from public, anon, authenticated, service_role,
  advisory_runtime, advisory_indexer, advisory_retention;

create function advisory.ensure_specialist_daily_run() returns uuid
language plpgsql security definer set search_path = pg_catalog
as $$
declare
  observed_at timestamptz := clock_timestamp();
  day_utc date := (observed_at at time zone 'UTC')::date;
  next_midnight timestamptz := (day_utc + 1)::timestamp at time zone 'UTC';
  selected_id uuid;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('curtainsuk:specialists:public:' || day_utc::text, 0));
  select run_id into selected_id from advisory.specialist_daily_runs where utc_day = day_utc;
  if selected_id is null then
    selected_id := pg_catalog.gen_random_uuid();
    insert into advisory.evaluation_runs(id, enabled, limit_micro, used_micro, expires_at)
      values (selected_id, true, 5000000, 0, next_midnight);
    insert into advisory.specialist_daily_runs(utc_day, run_id) values (day_utc, selected_id);
  end if;
  if not exists (
    select 1 from advisory.evaluation_runs
    where id = selected_id and enabled and limit_micro = 5000000
      and used_micro between 0 and 5000000 and expires_at = next_midnight
  ) then
    raise exception 'SPECIALIST_DAILY_BUDGET_INVALID';
  end if;
  return selected_id;
end;
$$;
revoke all on function advisory.ensure_specialist_daily_run() from public, anon, authenticated, service_role;
grant execute on function advisory.ensure_specialist_daily_run() to advisory_runtime;

-- The original reserve function caps each run/session at US$1. This counter
-- also caps one consultation across UTC days and after old receipt cleanup.
create function advisory.guard_specialist_consultation_spend() returns trigger
language plpgsql security definer set search_path = pg_catalog
as $$
declare
  delta_micro bigint;
begin
  if tg_op = 'UPDATE' and (
    exists (select 1 from advisory.specialist_daily_runs where run_id = old.run_id)
    or exists (select 1 from advisory.specialist_daily_runs where run_id = new.run_id)
  ) then
    if new.run_id is distinct from old.run_id or new.session_id is distinct from old.session_id
       or new.owner_id is distinct from old.owner_id then
      raise exception 'INVALID_BUDGET_RECEIPT';
    end if;
  end if;
  if not exists (select 1 from advisory.specialist_daily_runs where run_id = new.run_id) then
    return new;
  end if;
  delta_micro := new.charged_micro - case when tg_op = 'UPDATE' then old.charged_micro else 0 end;
  if delta_micro = 0 then
    return new;
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    'curtainsuk:specialists:session:' || new.session_id::text, 0));
  if delta_micro > 0 then
    insert into advisory.specialist_session_spend(session_id,used_micro)
      values (new.session_id,delta_micro)
    on conflict (session_id) do update
      set used_micro = advisory.specialist_session_spend.used_micro + excluded.used_micro
      where advisory.specialist_session_spend.used_micro + excluded.used_micro between 0 and 1000000;
  else
    update advisory.specialist_session_spend
      set used_micro = used_micro + delta_micro
      where session_id = new.session_id and used_micro + delta_micro between 0 and 1000000;
  end if;
  if not found then
    raise exception 'BUDGET_EXHAUSTED';
  end if;
  return new;
end;
$$;
revoke all on function advisory.guard_specialist_consultation_spend() from public, anon, authenticated, service_role,
  advisory_runtime, advisory_indexer, advisory_retention;
create trigger advisory_specialist_consultation_spend_guard
before insert or update on advisory.spend_reservations
for each row execute function advisory.guard_specialist_consultation_spend();

create function advisory.purge_specialist_session_spend() returns trigger
language plpgsql security definer set search_path = pg_catalog
as $$
begin
  delete from advisory.specialist_session_spend where session_id = old.id;
  return old;
end;
$$;
revoke all on function advisory.purge_specialist_session_spend() from public, anon, authenticated, service_role,
  advisory_runtime, advisory_indexer, advisory_retention;
create trigger advisory_specialist_session_spend_cleanup
after delete on advisory.consultations
for each row execute function advisory.purge_specialist_session_spend();

commit;
