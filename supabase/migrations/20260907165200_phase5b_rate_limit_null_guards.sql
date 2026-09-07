-- Phase 5B follow-up: fail closed when a service caller omits either
-- server-generated input to the staging request rate limiter.

create or replace function curtainsuk_private.consume_staging_review_submission_slot(
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
  if p_fingerprint_sha256 is null
    or p_limit is null
    or p_fingerprint_sha256 !~ '^[a-f0-9]{64}$'
    or p_limit < 1
    or p_limit > 100
  then
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

revoke execute on function curtainsuk_private.consume_staging_review_submission_slot(text, integer)
  from public, anon, authenticated;
grant execute on function curtainsuk_private.consume_staging_review_submission_slot(text, integer)
  to service_role;

notify pgrst, 'reload schema';
