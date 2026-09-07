-- CurtainsUK Phase 5B security hardening for durable staging reviews.
-- PostgreSQL owns timestamps and state-transition audit history. Browser roles
-- remain denied and service_role writes are constrained to narrow RPCs.

alter table curtainsuk_private.staging_review_requests
  add constraint staging_review_specialist_fixing_required
  check (
    window_type_slug not in ('apex-window', 'triangular-window', 'gable-end-window')
    or (
      fixing_position is not null
      and char_length(fixing_position) <= 200
      and char_length(regexp_replace(fixing_position, '[[:space:]]', '', 'g')) >= 3
    )
  );

create or replace function curtainsuk_private.set_staging_review_insert_timestamps()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.submitted_at := clock_timestamp();
  new.updated_at := new.submitted_at;
  return new;
end;
$$;

create trigger staging_review_request_insert_timestamps
before insert on curtainsuk_private.staging_review_requests
for each row execute function curtainsuk_private.set_staging_review_insert_timestamps();

create or replace function curtainsuk_private.audit_staging_review_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  transition_actor text;
  transition_reason text;
begin
  if (to_jsonb(new) - 'review_state' - 'updated_at')
      is distinct from (to_jsonb(old) - 'review_state' - 'updated_at') then
    raise exception 'staging review content is immutable after submission';
  end if;
  if new.review_state is not distinct from old.review_state then
    raise exception 'staging review updates must change review state';
  end if;

  transition_actor := nullif(trim(current_setting('curtainsuk.review_actor_id', true)), '');
  transition_reason := nullif(trim(current_setting('curtainsuk.review_reason', true)), '');
  if transition_actor is null or transition_reason is null then
    raise exception using errcode = '42501', message = 'review transition context is required';
  end if;
  new.updated_at := clock_timestamp();

  insert into curtainsuk_private.staging_review_request_events (
    event_id, request_id, review_state, actor_type, actor_id, reason, created_at
  ) values (
    gen_random_uuid(),
    new.request_id,
    new.review_state,
    'STAFF',
    transition_actor,
    transition_reason,
    new.updated_at
  );
  return new;
end;
$$;

create trigger staging_review_request_transition_audit
before update on curtainsuk_private.staging_review_requests
for each row execute function curtainsuk_private.audit_staging_review_transition();

drop function if exists curtainsuk_private.transition_staging_review_request(uuid, text, text, text, timestamptz);

create function curtainsuk_private.transition_staging_review_request(
  p_request_id uuid,
  p_review_state text,
  p_actor_id text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed curtainsuk_private.staging_review_requests;
begin
  if p_review_state not in ('IN_REVIEW', 'MORE_INFORMATION_REQUIRED', 'APPROVED', 'REJECTED')
     or nullif(trim(p_actor_id), '') is null
     or nullif(trim(p_reason), '') is null then
    raise exception 'invalid review transition';
  end if;

  perform set_config('curtainsuk.review_actor_id', trim(p_actor_id), true);
  perform set_config('curtainsuk.review_reason', trim(p_reason), true);
  update curtainsuk_private.staging_review_requests
  set review_state = p_review_state
  where request_id = p_request_id
    and review_state is distinct from p_review_state
  returning * into changed;
  if changed.request_id is null then
    if exists (
      select 1 from curtainsuk_private.staging_review_requests where request_id = p_request_id
    ) then
      raise exception 'review state is unchanged';
    end if;
    raise exception 'unknown review request';
  end if;

  return jsonb_build_object(
    'request_id', changed.request_id,
    'review_state', changed.review_state,
    'updated_at', changed.updated_at
  );
end;
$$;

drop function if exists curtainsuk_private.consume_staging_review_submission_slot(text, timestamptz, integer);

create function curtainsuk_private.consume_staging_review_submission_slot(
  p_fingerprint_sha256 text,
  p_limit integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  accepted boolean;
  database_now timestamptz := clock_timestamp();
  rate_window timestamptz;
begin
  if p_fingerprint_sha256 !~ '^[a-f0-9]{64}$' or p_limit < 1 or p_limit > 100 then
    raise exception 'invalid staging review rate-limit input';
  end if;
  rate_window := date_trunc('hour', database_now at time zone 'UTC') at time zone 'UTC';
  insert into curtainsuk_private.staging_review_submission_limits (
    fingerprint_sha256, window_started_at, submission_count, updated_at
  ) values (
    p_fingerprint_sha256, rate_window, 1, database_now
  )
  on conflict (fingerprint_sha256, window_started_at) do update set
    submission_count = curtainsuk_private.staging_review_submission_limits.submission_count + 1,
    updated_at = excluded.updated_at
  where curtainsuk_private.staging_review_submission_limits.submission_count < p_limit
  returning true into accepted;
  return coalesce(accepted, false);
end;
$$;

alter function curtainsuk_private.create_staging_review_request(jsonb) security definer;
alter function curtainsuk_private.create_staging_review_request(jsonb) set search_path = '';

revoke all on curtainsuk_private.staging_review_requests,
  curtainsuk_private.staging_review_request_events,
  curtainsuk_private.staging_review_submission_limits
from service_role;
grant select on curtainsuk_private.staging_review_requests,
  curtainsuk_private.staging_review_request_events
to service_role;

revoke execute on function curtainsuk_private.create_staging_review_request(jsonb)
  from public, anon, authenticated;
grant execute on function curtainsuk_private.create_staging_review_request(jsonb)
  to service_role;
revoke execute on function curtainsuk_private.consume_staging_review_submission_slot(text, integer)
  from public, anon, authenticated;
grant execute on function curtainsuk_private.consume_staging_review_submission_slot(text, integer)
  to service_role;
revoke execute on function curtainsuk_private.transition_staging_review_request(uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function curtainsuk_private.transition_staging_review_request(uuid, text, text, text)
  to service_role;

revoke execute on function curtainsuk_private.set_staging_review_insert_timestamps()
  from public, anon, authenticated, service_role;
revoke execute on function curtainsuk_private.audit_staging_review_transition()
  from public, anon, authenticated, service_role;

notify pgrst, 'reload schema';
