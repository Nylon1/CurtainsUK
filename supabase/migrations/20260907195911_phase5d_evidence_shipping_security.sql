-- CurtainsUK Phase 5D: evidence-security operations, configurable UK delivery
-- rates, and endpoint-specific rate limiting. This migration is deliberately
-- private/service-role only and does not enable payment or Shopify writes.

-- ---------------------------------------------------------------------------
-- Evidence scan-attempt history
-- ---------------------------------------------------------------------------

create table curtainsuk_private.staging_review_evidence_scan_attempts (
  attempt_id uuid primary key default gen_random_uuid(),
  evidence_id uuid not null references curtainsuk_private.staging_review_evidence (evidence_id) on delete restrict,
  actor_id uuid not null,
  scanner_provider text not null check (length(trim(scanner_provider)) between 1 and 100),
  verdict text not null check (verdict in ('CLEAN', 'MALICIOUS', 'UNAVAILABLE')),
  scanner_reference text check (scanner_reference is null or length(scanner_reference) between 1 and 255),
  failure_code text check (
    failure_code is null
    or failure_code in ('NOT_CONFIGURED', 'TIMEOUT', 'PROVIDER_ERROR', 'INVALID_RESPONSE')
  ),
  occurred_at timestamptz not null default clock_timestamp(),
  constraint staging_evidence_scan_attempt_failure_consistent check (
    (verdict = 'UNAVAILABLE' and failure_code is not null)
    or (verdict in ('CLEAN', 'MALICIOUS') and failure_code is null)
  )
);

create index staging_review_evidence_scan_history_idx
  on curtainsuk_private.staging_review_evidence_scan_attempts (evidence_id, occurred_at desc);

create trigger staging_review_evidence_scan_attempts_append_only
before update or delete on curtainsuk_private.staging_review_evidence_scan_attempts
for each row execute function curtainsuk_private.reject_curtainsuk_immutable_mutation();

create or replace function curtainsuk_private.record_staging_review_evidence_scan_attempt(p_result jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target curtainsuk_private.staging_review_evidence;
  verdict text := p_result->>'verdict';
  failure_code text := nullif(trim(p_result->>'failure_code'), '');
  next_state text;
  database_now timestamptz := clock_timestamp();
  attempt_id uuid := coalesce((p_result->>'attempt_id')::uuid, gen_random_uuid());
  event_id uuid := coalesce((p_result->>'event_id')::uuid, gen_random_uuid());
begin
  if verdict not in ('CLEAN', 'MALICIOUS', 'UNAVAILABLE')
     or (p_result->>'actor_id') is null
     or nullif(trim(p_result->>'scanner_provider'), '') is null
     or (verdict = 'UNAVAILABLE' and failure_code not in (
       'NOT_CONFIGURED', 'TIMEOUT', 'PROVIDER_ERROR', 'INVALID_RESPONSE'
     ))
     or (verdict <> 'UNAVAILABLE' and failure_code is not null)
     or (verdict <> 'UNAVAILABLE' and nullif(trim(p_result->>'detected_content_type'), '') is null)
     or (verdict = 'MALICIOUS' and nullif(trim(p_result->>'rejection_reason'), '') is null)
  then
    raise exception 'Invalid evidence scan attempt';
  end if;

  select * into target
  from curtainsuk_private.staging_review_evidence
  where evidence_id = (p_result->>'evidence_id')::uuid
  for update;

  if target.evidence_id is null or target.security_state <> 'QUARANTINED' then
    raise exception 'Evidence is unknown or no longer quarantined';
  end if;

  insert into curtainsuk_private.staging_review_evidence_scan_attempts (
    attempt_id, evidence_id, actor_id, scanner_provider, verdict,
    scanner_reference, failure_code, occurred_at
  ) values (
    attempt_id,
    target.evidence_id,
    (p_result->>'actor_id')::uuid,
    trim(p_result->>'scanner_provider'),
    verdict,
    nullif(left(trim(p_result->>'scanner_reference'), 255), ''),
    failure_code,
    database_now
  );

  if verdict in ('CLEAN', 'MALICIOUS') then
    next_state := case verdict when 'CLEAN' then 'CLEAN' else 'REJECTED' end;
    update curtainsuk_private.staging_review_evidence
    set security_state = next_state,
        detected_content_type = p_result->>'detected_content_type',
        scanner_provider = trim(p_result->>'scanner_provider'),
        scanner_reference = nullif(left(trim(p_result->>'scanner_reference'), 255), ''),
        scanned_at = database_now,
        rejection_reason = case
          when next_state = 'REJECTED' then trim(p_result->>'rejection_reason')
          else null
        end
    where evidence_id = target.evidence_id
      and security_state = 'QUARANTINED'
    returning * into target;
  end if;

  insert into curtainsuk_private.staging_review_evidence_access_log (
    event_id, evidence_id, actor_id, action, occurred_at, reason, metadata
  ) values (
    event_id,
    target.evidence_id,
    (p_result->>'actor_id')::uuid,
    'SCAN_RESULT',
    database_now,
    case when verdict = 'MALICIOUS' then trim(p_result->>'rejection_reason') else null end,
    jsonb_strip_nulls(jsonb_build_object(
      'attempt_id', attempt_id,
      'verdict', verdict,
      'security_state', case when verdict = 'UNAVAILABLE' then 'QUARANTINED' else next_state end,
      'scanner_provider', trim(p_result->>'scanner_provider'),
      'scanner_reference', nullif(left(trim(p_result->>'scanner_reference'), 255), ''),
      'failure_code', failure_code
    ))
  );

  return jsonb_build_object(
    'attempt_id', attempt_id,
    'evidence_id', target.evidence_id,
    'verdict', verdict,
    'security_state', case when verdict = 'UNAVAILABLE' then 'QUARANTINED' else next_state end,
    'occurred_at', database_now
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- One-time, short-lived staff evidence grants
-- ---------------------------------------------------------------------------

create table curtainsuk_private.staging_review_evidence_access_grants (
  grant_id uuid primary key default gen_random_uuid(),
  token_sha256 text not null unique check (token_sha256 ~ '^[a-f0-9]{64}$'),
  evidence_id uuid not null references curtainsuk_private.staging_review_evidence (evidence_id) on delete restrict,
  actor_id uuid not null,
  reason text not null check (length(trim(reason)) between 3 and 500),
  issued_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null,
  constraint staging_evidence_access_grant_expiry check (
    expires_at > issued_at and expires_at <= issued_at + interval '5 minutes'
  )
);

create index staging_review_evidence_access_grants_expiry_idx
  on curtainsuk_private.staging_review_evidence_access_grants (expires_at);
create index staging_review_evidence_access_grants_evidence_idx
  on curtainsuk_private.staging_review_evidence_access_grants (evidence_id, issued_at desc);

create table curtainsuk_private.staging_review_evidence_access_grant_uses (
  grant_id uuid primary key references curtainsuk_private.staging_review_evidence_access_grants (grant_id) on delete restrict,
  used_at timestamptz not null default clock_timestamp()
);

create trigger staging_review_evidence_access_grants_append_only
before update or delete on curtainsuk_private.staging_review_evidence_access_grants
for each row execute function curtainsuk_private.reject_curtainsuk_immutable_mutation();
create trigger staging_review_evidence_access_grant_uses_append_only
before update or delete on curtainsuk_private.staging_review_evidence_access_grant_uses
for each row execute function curtainsuk_private.reject_curtainsuk_immutable_mutation();

create or replace function curtainsuk_private.issue_staging_review_evidence_access_grant(p_grant jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target curtainsuk_private.staging_review_evidence;
  inserted curtainsuk_private.staging_review_evidence_access_grants;
  database_now timestamptz := clock_timestamp();
  requested_expiry timestamptz := (p_grant->>'expires_at')::timestamptz;
  normalized_reason text := trim(p_grant->>'reason');
begin
  if (p_grant->>'actor_id') is null
     or (p_grant->>'token_sha256') !~ '^[a-f0-9]{64}$'
     or length(normalized_reason) not between 3 and 500
     or requested_expiry < database_now + interval '10 seconds'
     or requested_expiry > database_now + interval '5 minutes'
  then
    raise exception 'Invalid evidence access grant';
  end if;

  select * into target
  from curtainsuk_private.staging_review_evidence
  where evidence_id = (p_grant->>'evidence_id')::uuid
  for share;

  if target.evidence_id is null
     or target.security_state <> 'CLEAN'
     or target.deleted_at is not null
     or target.retention_expires_at <= database_now then
    raise exception 'Evidence access denied';
  end if;

  insert into curtainsuk_private.staging_review_evidence_access_grants (
    grant_id, token_sha256, evidence_id, actor_id, reason, issued_at, expires_at
  ) values (
    coalesce((p_grant->>'grant_id')::uuid, gen_random_uuid()),
    lower(p_grant->>'token_sha256'),
    target.evidence_id,
    (p_grant->>'actor_id')::uuid,
    normalized_reason,
    database_now,
    requested_expiry
  ) returning * into inserted;

  insert into curtainsuk_private.staging_review_evidence_access_log (
    event_id, evidence_id, actor_id, action, occurred_at, reason, metadata
  ) values (
    coalesce((p_grant->>'event_id')::uuid, gen_random_uuid()),
    inserted.evidence_id,
    inserted.actor_id,
    'ISSUE_TOKEN',
    database_now,
    inserted.reason,
    jsonb_build_object('grant_id', inserted.grant_id, 'expires_at', inserted.expires_at)
  );

  return jsonb_build_object(
    'grant_id', inserted.grant_id,
    'issued_at', inserted.issued_at,
    'expires_at', inserted.expires_at
  );
end;
$$;

create or replace function curtainsuk_private.consume_staging_review_evidence_access_grant(
  p_token_sha256 text,
  p_evidence_id uuid,
  p_actor_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_grant curtainsuk_private.staging_review_evidence_access_grants;
  inserted_grant_id uuid;
  database_now timestamptz := clock_timestamp();
begin
  if p_token_sha256 is null
     or p_token_sha256 !~ '^[a-f0-9]{64}$'
     or p_evidence_id is null
     or p_actor_id is null then
    raise exception 'Invalid evidence access grant consumption';
  end if;

  select grants.* into selected_grant
  from curtainsuk_private.staging_review_evidence_access_grants grants
  join curtainsuk_private.staging_review_evidence evidence
    on evidence.evidence_id = grants.evidence_id
  where grants.token_sha256 = lower(p_token_sha256)
    and grants.evidence_id = p_evidence_id
    and grants.actor_id = p_actor_id
    and grants.expires_at > database_now
    and evidence.security_state = 'CLEAN'
    and evidence.deleted_at is null
    and evidence.retention_expires_at > database_now
  for update of grants;

  if selected_grant.grant_id is null then return false; end if;

  insert into curtainsuk_private.staging_review_evidence_access_grant_uses (grant_id, used_at)
  values (selected_grant.grant_id, database_now)
  on conflict (grant_id) do nothing
  returning grant_id into inserted_grant_id;

  return inserted_grant_id is not null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Append-only UK shipping rate configuration
-- ---------------------------------------------------------------------------

create table curtainsuk_private.staging_shipping_rate_versions (
  rate_version_id uuid primary key default gen_random_uuid(),
  region text not null check (region in ('UK_MAINLAND', 'HIGHLANDS_ISLANDS', 'NORTHERN_IRELAND')),
  parcel_class text not null check (parcel_class in ('STANDARD', 'OVERSIZE', 'SPECIALIST')),
  gross_amount_minor integer check (gross_amount_minor is null or gross_amount_minor > 0),
  currency text not null default 'GBP' check (currency = 'GBP'),
  status text not null check (status in ('AWAITING_OWNER_CONFIRMATION', 'VALIDATED', 'RETIRED')),
  supersedes_version_id uuid unique references curtainsuk_private.staging_shipping_rate_versions (rate_version_id) on delete restrict,
  actor_id uuid not null,
  reason text not null check (length(trim(reason)) between 3 and 1000),
  effective_from timestamptz not null,
  created_at timestamptz not null default clock_timestamp(),
  constraint staging_shipping_rate_status_amount check (
    (status = 'VALIDATED' and gross_amount_minor is not null)
    or (status in ('AWAITING_OWNER_CONFIRMATION', 'RETIRED') and gross_amount_minor is null)
  )
);

create index staging_shipping_rate_versions_lookup_idx
  on curtainsuk_private.staging_shipping_rate_versions (region, parcel_class, created_at desc);

create trigger staging_shipping_rate_versions_append_only
before update or delete on curtainsuk_private.staging_shipping_rate_versions
for each row execute function curtainsuk_private.reject_curtainsuk_immutable_mutation();

-- A non-authenticating system identity is used only to make the initial
-- placeholder rows auditable. It is not a credential or an application user.
insert into curtainsuk_private.staging_shipping_rate_versions (
  rate_version_id, region, parcel_class, gross_amount_minor, currency, status,
  supersedes_version_id, actor_id, reason, effective_from, created_at
)
select
  gen_random_uuid(),
  region,
  parcel_class,
  null,
  'GBP',
  'AWAITING_OWNER_CONFIRMATION',
  null,
  '00000000-0000-4000-8000-000000000052'::uuid,
  'Initial staging placeholder: commercial delivery rate requires owner confirmation',
  clock_timestamp(),
  clock_timestamp()
from unnest(array['UK_MAINLAND', 'HIGHLANDS_ISLANDS', 'NORTHERN_IRELAND']) region
cross join unnest(array['STANDARD', 'OVERSIZE', 'SPECIALIST']) parcel_class;

create or replace function curtainsuk_private.append_staging_shipping_rate_version(p_rate jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous curtainsuk_private.staging_shipping_rate_versions;
  inserted curtainsuk_private.staging_shipping_rate_versions;
  database_now timestamptz := clock_timestamp();
  requested_status text := p_rate->>'status';
  requested_amount integer := (p_rate->>'gross_amount_minor')::integer;
  normalized_reason text := trim(p_rate->>'reason');
begin
  if (p_rate->>'region') not in ('UK_MAINLAND', 'HIGHLANDS_ISLANDS', 'NORTHERN_IRELAND')
     or (p_rate->>'parcel_class') not in ('STANDARD', 'OVERSIZE', 'SPECIALIST')
     or requested_status not in ('AWAITING_OWNER_CONFIRMATION', 'VALIDATED', 'RETIRED')
     or (p_rate->>'actor_id') is null
     or length(normalized_reason) not between 3 and 1000
     or (requested_status = 'VALIDATED' and (requested_amount is null or requested_amount <= 0))
     or (requested_status <> 'VALIDATED' and requested_amount is not null)
  then
    raise exception 'Invalid staging shipping rate';
  end if;

  select * into previous
  from curtainsuk_private.staging_shipping_rate_versions
  where region = p_rate->>'region'
    and parcel_class = p_rate->>'parcel_class'
  order by created_at desc, rate_version_id desc
  limit 1;

  if previous.rate_version_id is null
     or previous.rate_version_id <> (p_rate->>'expected_current_rate_version_id')::uuid then
    raise exception 'Staging shipping rate changed; refresh before saving';
  end if;

  insert into curtainsuk_private.staging_shipping_rate_versions (
    rate_version_id, region, parcel_class, gross_amount_minor, currency, status,
    supersedes_version_id, actor_id, reason, effective_from, created_at
  ) values (
    coalesce((p_rate->>'rate_version_id')::uuid, gen_random_uuid()),
    p_rate->>'region',
    p_rate->>'parcel_class',
    requested_amount,
    'GBP',
    requested_status,
    previous.rate_version_id,
    (p_rate->>'actor_id')::uuid,
    normalized_reason,
    coalesce((p_rate->>'effective_from')::timestamptz, database_now),
    database_now
  ) returning * into inserted;

  return jsonb_build_object(
    'rate_version_id', inserted.rate_version_id,
    'region', inserted.region,
    'parcel_class', inserted.parcel_class,
    'gross_amount_minor', inserted.gross_amount_minor,
    'currency', inserted.currency,
    'status', inserted.status,
    'effective_from', inserted.effective_from,
    'created_at', inserted.created_at
  );
exception
  when unique_violation then
    raise exception 'Staging shipping rate changed; refresh before saving';
end;
$$;

-- ---------------------------------------------------------------------------
-- Signed Shopify mutation replay receipts
-- ---------------------------------------------------------------------------

create table curtainsuk_private.staging_shopify_proxy_replay_receipts (
  request_fingerprint_sha256 text primary key check (request_fingerprint_sha256 ~ '^[a-f0-9]{64}$'),
  shop text not null check (shop ~ '^[a-z0-9][a-z0-9-]*\.myshopify\.com$'),
  operation text not null check (operation in ('review-request', 'checkout-handoff')),
  signed_at timestamptz not null,
  expires_at timestamptz not null,
  received_at timestamptz not null default clock_timestamp(),
  constraint staging_shopify_proxy_replay_expiry check (
    expires_at > received_at and expires_at <= received_at + interval '15 minutes'
  )
);

create index staging_shopify_proxy_replay_expiry_idx
  on curtainsuk_private.staging_shopify_proxy_replay_receipts (expires_at);

create trigger staging_shopify_proxy_replay_receipts_append_only
before update or delete on curtainsuk_private.staging_shopify_proxy_replay_receipts
for each row execute function curtainsuk_private.reject_curtainsuk_immutable_mutation();

create or replace function curtainsuk_private.claim_staging_shopify_proxy_replay_receipt(
  p_request_fingerprint_sha256 text,
  p_shop text,
  p_operation text,
  p_signature_timestamp bigint,
  p_ttl_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_fingerprint text;
  database_now timestamptz := clock_timestamp();
  signed_at timestamptz;
begin
  if p_request_fingerprint_sha256 is null
     or p_request_fingerprint_sha256 !~ '^[a-f0-9]{64}$'
     or p_shop is null
     or lower(p_shop) !~ '^[a-z0-9][a-z0-9-]*\.myshopify\.com$'
     or p_operation not in ('review-request', 'checkout-handoff')
     or p_signature_timestamp is null
     or p_ttl_seconds is null
     or p_ttl_seconds < 30
     or p_ttl_seconds > 900 then
    raise exception 'Invalid Shopify replay receipt';
  end if;

  signed_at := to_timestamp(p_signature_timestamp);
  if signed_at < database_now - make_interval(secs => p_ttl_seconds)
     or signed_at > database_now + interval '60 seconds' then
    raise exception 'Expired Shopify replay receipt';
  end if;

  insert into curtainsuk_private.staging_shopify_proxy_replay_receipts (
    request_fingerprint_sha256, shop, operation, signed_at, expires_at, received_at
  ) values (
    lower(p_request_fingerprint_sha256), lower(p_shop), p_operation,
    signed_at, database_now + make_interval(secs => p_ttl_seconds), database_now
  )
  on conflict (request_fingerprint_sha256) do nothing
  returning request_fingerprint_sha256 into inserted_fingerprint;

  return inserted_fingerprint is not null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Endpoint-specific fixed-window application rate limiting
-- ---------------------------------------------------------------------------

create or replace function curtainsuk_private.consume_staging_endpoint_slot(
  p_fingerprint_sha256 text,
  p_limit integer,
  p_window_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  accepted boolean;
  current_count integer;
  database_now timestamptz := clock_timestamp();
  rate_window timestamptz;
  reset_at timestamptz;
begin
  if p_fingerprint_sha256 is null
     or p_fingerprint_sha256 !~ '^[a-f0-9]{64}$'
     or p_limit is null
     or p_limit < 1
     or p_limit > 5000
     or p_window_seconds is null
     or p_window_seconds < 10
     or p_window_seconds > 3600 then
    raise exception 'Invalid staging endpoint rate-limit input';
  end if;

  rate_window := to_timestamp(
    floor(extract(epoch from database_now) / p_window_seconds) * p_window_seconds
  );
  reset_at := rate_window + make_interval(secs => p_window_seconds);

  insert into curtainsuk_private.staging_review_submission_limits (
    fingerprint_sha256, window_started_at, submission_count, updated_at
  ) values (
    p_fingerprint_sha256, rate_window, 1, database_now
  )
  on conflict (fingerprint_sha256, window_started_at) do update set
    submission_count = curtainsuk_private.staging_review_submission_limits.submission_count + 1,
    updated_at = excluded.updated_at
  where curtainsuk_private.staging_review_submission_limits.submission_count < p_limit
  returning true, submission_count into accepted, current_count;

  if not coalesce(accepted, false) then
    select submission_count into current_count
    from curtainsuk_private.staging_review_submission_limits
    where fingerprint_sha256 = p_fingerprint_sha256
      and window_started_at = rate_window;
  end if;

  return jsonb_build_object(
    'accepted', coalesce(accepted, false),
    'limit', p_limit,
    'remaining', greatest(p_limit - coalesce(current_count, p_limit), 0),
    'retry_after_seconds', greatest(ceil(extract(epoch from reset_at - database_now))::integer, 1),
    'window_started_at', rate_window,
    'reset_at', reset_at
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Least privilege / private schema defence in depth
-- ---------------------------------------------------------------------------

alter table curtainsuk_private.staging_review_evidence_scan_attempts enable row level security;
alter table curtainsuk_private.staging_review_evidence_scan_attempts force row level security;
alter table curtainsuk_private.staging_review_evidence_access_grants enable row level security;
alter table curtainsuk_private.staging_review_evidence_access_grants force row level security;
alter table curtainsuk_private.staging_review_evidence_access_grant_uses enable row level security;
alter table curtainsuk_private.staging_review_evidence_access_grant_uses force row level security;
alter table curtainsuk_private.staging_shipping_rate_versions enable row level security;
alter table curtainsuk_private.staging_shipping_rate_versions force row level security;
alter table curtainsuk_private.staging_shopify_proxy_replay_receipts enable row level security;
alter table curtainsuk_private.staging_shopify_proxy_replay_receipts force row level security;

revoke all on curtainsuk_private.staging_review_evidence_scan_attempts,
  curtainsuk_private.staging_review_evidence_access_grants,
  curtainsuk_private.staging_review_evidence_access_grant_uses,
  curtainsuk_private.staging_shipping_rate_versions,
  curtainsuk_private.staging_shopify_proxy_replay_receipts
from public, anon, authenticated, service_role;

grant select on curtainsuk_private.staging_review_evidence_scan_attempts,
  curtainsuk_private.staging_review_evidence_access_grants,
  curtainsuk_private.staging_review_evidence_access_grant_uses,
  curtainsuk_private.staging_shipping_rate_versions,
  curtainsuk_private.staging_shopify_proxy_replay_receipts
to service_role;

revoke execute on function curtainsuk_private.record_staging_review_evidence_scan(jsonb)
  from service_role;

revoke execute on function curtainsuk_private.record_staging_review_evidence_scan_attempt(jsonb),
  curtainsuk_private.issue_staging_review_evidence_access_grant(jsonb),
  curtainsuk_private.consume_staging_review_evidence_access_grant(text, uuid, uuid),
  curtainsuk_private.append_staging_shipping_rate_version(jsonb),
  curtainsuk_private.claim_staging_shopify_proxy_replay_receipt(text, text, text, bigint, integer),
  curtainsuk_private.consume_staging_endpoint_slot(text, integer, integer)
from public, anon, authenticated, service_role;

grant execute on function curtainsuk_private.record_staging_review_evidence_scan_attempt(jsonb),
  curtainsuk_private.issue_staging_review_evidence_access_grant(jsonb),
  curtainsuk_private.consume_staging_review_evidence_access_grant(text, uuid, uuid),
  curtainsuk_private.append_staging_shipping_rate_version(jsonb),
  curtainsuk_private.claim_staging_shopify_proxy_replay_receipt(text, text, text, bigint, integer),
  curtainsuk_private.consume_staging_endpoint_slot(text, integer, integer)
to service_role;

notify pgrst, 'reload schema';
