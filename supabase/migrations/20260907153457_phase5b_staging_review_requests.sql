-- CurtainsUK Phase 5B: durable staging review requests and private evidence.
-- Customer submissions enter through the server-authoritative staging API;
-- browser roles receive no direct database or storage access.

alter table curtainsuk_private.fabric_colourways
  add constraint fabric_colourways_review_identity_unique
  unique (fabric_id, supplier_id, supplier_sku);

create table curtainsuk_private.staging_review_requests (
  request_id uuid primary key,
  configuration_id uuid not null unique,
  window_type_slug text not null,
  measurement_basis text check (
    measurement_basis is null
    or measurement_basis in ('TRACK_WIDTH', 'POLE_USABLE_WIDTH')
  ),
  measurements jsonb not null check (jsonb_typeof(measurements) = 'object'),
  fabric_id text not null,
  supplier_id text not null,
  supplier_sku text not null,
  heading text not null check (
    heading in ('PENCIL_PLEAT', 'WAVE', 'EYELET', 'DOUBLE_PINCH', 'TRIPLE_PINCH', 'TAB_TOP')
  ),
  lining text not null check (
    lining in ('UNLINED', 'STANDARD', 'BLACKOUT', 'THERMAL')
  ),
  interlining text not null default 'NONE' check (interlining in ('NONE', 'INTERLINING')),
  construction text not null check (construction in ('PAIR', 'SINGLE')),
  stack_direction text not null check (stack_direction in ('LEFT', 'RIGHT', 'SPLIT', 'FIXED')),
  fixing_position text,
  availability_state text not null check (
    availability_state in (
      'FABRIC_AVAILABLE',
      'LIMITED_AVAILABILITY',
      'AVAILABLE_SOON',
      'AVAILABILITY_TO_BE_CONFIRMED',
      'TEMPORARILY_UNAVAILABLE',
      'NO_LONGER_AVAILABLE'
    )
  ),
  pricing_outcome text not null check (pricing_outcome in ('PRICE_WITH_REVIEW', 'MANUAL_QUOTE')),
  provisional_gross_price_minor integer check (provisional_gross_price_minor is null or provisional_gross_price_minor > 0),
  price_basis text not null default 'VAT_INCLUSIVE' check (price_basis = 'VAT_INCLUSIVE'),
  currency text not null default 'GBP' check (currency = 'GBP'),
  calculation_version text,
  evidence jsonb not null default '[]'::jsonb check (jsonb_typeof(evidence) = 'array'),
  customer_name text,
  customer_email text not null,
  customer_phone text,
  notes text,
  review_state text not null default 'PENDING' check (
    review_state in ('PENDING', 'IN_REVIEW', 'MORE_INFORMATION_REQUIRED', 'APPROVED', 'REJECTED')
  ),
  submitted_at timestamptz not null,
  updated_at timestamptz not null,
  constraint staging_review_fabric_identity_fk
    foreign key (fabric_id, supplier_id, supplier_sku)
    references curtainsuk_private.fabric_colourways (fabric_id, supplier_id, supplier_sku),
  constraint staging_review_manual_quote_has_no_price
    check (pricing_outcome <> 'MANUAL_QUOTE' or provisional_gross_price_minor is null),
  constraint staging_review_customer_email_not_blank
    check (length(trim(customer_email)) between 3 and 320)
);

create index staging_review_requests_state_submitted_idx
  on curtainsuk_private.staging_review_requests (review_state, submitted_at desc);
create index staging_review_requests_fabric_idx
  on curtainsuk_private.staging_review_requests (supplier_id, supplier_sku, submitted_at desc);

create table curtainsuk_private.staging_review_request_events (
  event_id uuid primary key,
  request_id uuid not null references curtainsuk_private.staging_review_requests (request_id),
  review_state text not null check (
    review_state in ('PENDING', 'IN_REVIEW', 'MORE_INFORMATION_REQUIRED', 'APPROVED', 'REJECTED')
  ),
  actor_type text not null check (actor_type in ('CUSTOMER_SUBMISSION', 'STAFF', 'SYSTEM')),
  actor_id text,
  reason text,
  created_at timestamptz not null
);

create index staging_review_request_events_history_idx
  on curtainsuk_private.staging_review_request_events (request_id, created_at);

-- Stores only an HMAC fingerprint, never the visitor's raw network address or
-- browser details. The API consumes a slot immediately before accepting files.
create table curtainsuk_private.staging_review_submission_limits (
  fingerprint_sha256 text not null check (fingerprint_sha256 ~ '^[a-f0-9]{64}$'),
  window_started_at timestamptz not null,
  submission_count integer not null check (submission_count > 0),
  updated_at timestamptz not null,
  primary key (fingerprint_sha256, window_started_at)
);

create or replace function curtainsuk_private.consume_staging_review_submission_slot(
  p_fingerprint_sha256 text,
  p_now timestamptz,
  p_limit integer
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  accepted boolean;
  rate_window timestamptz;
begin
  if p_fingerprint_sha256 !~ '^[a-f0-9]{64}$' or p_limit < 1 or p_limit > 100 then
    raise exception 'invalid staging review rate-limit input';
  end if;
  rate_window := date_trunc('hour', p_now);
  insert into curtainsuk_private.staging_review_submission_limits (
    fingerprint_sha256, window_started_at, submission_count, updated_at
  ) values (
    p_fingerprint_sha256, rate_window, 1, p_now
  )
  on conflict (fingerprint_sha256, window_started_at) do update set
    submission_count = curtainsuk_private.staging_review_submission_limits.submission_count + 1,
    updated_at = excluded.updated_at
  where curtainsuk_private.staging_review_submission_limits.submission_count < p_limit
  returning true into accepted;
  return coalesce(accepted, false);
end;
$$;

create or replace function curtainsuk_private.create_staging_review_request(p_request jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  inserted curtainsuk_private.staging_review_requests;
  created boolean := true;
begin
  insert into curtainsuk_private.staging_review_requests (
    request_id,
    configuration_id,
    window_type_slug,
    measurement_basis,
    measurements,
    fabric_id,
    supplier_id,
    supplier_sku,
    heading,
    lining,
    interlining,
    construction,
    stack_direction,
    fixing_position,
    availability_state,
    pricing_outcome,
    provisional_gross_price_minor,
    price_basis,
    currency,
    calculation_version,
    evidence,
    customer_name,
    customer_email,
    customer_phone,
    notes,
    review_state,
    submitted_at,
    updated_at
  ) values (
    (p_request->>'request_id')::uuid,
    (p_request->>'configuration_id')::uuid,
    p_request->>'window_type_slug',
    p_request->>'measurement_basis',
    p_request->'measurements',
    p_request->>'fabric_id',
    p_request->>'supplier_id',
    p_request->>'supplier_sku',
    p_request->>'heading',
    p_request->>'lining',
    coalesce(p_request->>'interlining', 'NONE'),
    p_request->>'construction',
    p_request->>'stack_direction',
    nullif(trim(p_request->>'fixing_position'), ''),
    p_request->>'availability_state',
    p_request->>'pricing_outcome',
    (p_request->>'provisional_gross_price_minor')::integer,
    'VAT_INCLUSIVE',
    coalesce(p_request->>'currency', 'GBP'),
    p_request->>'calculation_version',
    coalesce(p_request->'evidence', '[]'::jsonb),
    nullif(trim(p_request->>'customer_name'), ''),
    lower(trim(p_request->>'customer_email')),
    nullif(trim(p_request->>'customer_phone'), ''),
    nullif(trim(p_request->>'notes'), ''),
    'PENDING',
    (p_request->>'submitted_at')::timestamptz,
    (p_request->>'submitted_at')::timestamptz
  ) on conflict (configuration_id) do nothing
  returning * into inserted;

  if inserted.request_id is null then
    created := false;
    select * into inserted
    from curtainsuk_private.staging_review_requests
    where configuration_id = (p_request->>'configuration_id')::uuid;
  else
    insert into curtainsuk_private.staging_review_request_events (
      event_id, request_id, review_state, actor_type, actor_id, reason, created_at
    ) values (
      (p_request->>'event_id')::uuid,
      inserted.request_id,
      'PENDING',
      'CUSTOMER_SUBMISSION',
      null,
      'Submitted through the unpublished CurtainsUK staging journey',
      inserted.submitted_at
    );
  end if;

  return jsonb_build_object(
    'request_id', inserted.request_id,
    'configuration_id', inserted.configuration_id,
    'review_state', inserted.review_state,
    'submitted_at', inserted.submitted_at,
    'created', created
  );
end;
$$;

create or replace function curtainsuk_private.transition_staging_review_request(
  p_request_id uuid,
  p_review_state text,
  p_actor_id text,
  p_reason text,
  p_changed_at timestamptz
)
returns jsonb
language plpgsql
security invoker
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
  update curtainsuk_private.staging_review_requests
  set review_state = p_review_state,
      updated_at = p_changed_at
  where request_id = p_request_id
  returning * into changed;
  if changed.request_id is null then raise exception 'unknown review request'; end if;

  insert into curtainsuk_private.staging_review_request_events (
    event_id, request_id, review_state, actor_type, actor_id, reason, created_at
  ) values (
    gen_random_uuid(), changed.request_id, p_review_state, 'STAFF', trim(p_actor_id), trim(p_reason), p_changed_at
  );
  return jsonb_build_object('request_id', changed.request_id, 'review_state', changed.review_state, 'updated_at', changed.updated_at);
end;
$$;

revoke execute on function curtainsuk_private.create_staging_review_request(jsonb)
  from public, anon, authenticated;
grant execute on function curtainsuk_private.create_staging_review_request(jsonb)
  to service_role;
revoke execute on function curtainsuk_private.consume_staging_review_submission_slot(text, timestamptz, integer)
  from public, anon, authenticated;
grant execute on function curtainsuk_private.consume_staging_review_submission_slot(text, timestamptz, integer)
  to service_role;
revoke execute on function curtainsuk_private.transition_staging_review_request(uuid, text, text, text, timestamptz)
  from public, anon, authenticated;
grant execute on function curtainsuk_private.transition_staging_review_request(uuid, text, text, text, timestamptz)
  to service_role;

create trigger staging_review_request_events_append_only
before update or delete on curtainsuk_private.staging_review_request_events
for each row execute function curtainsuk_private.reject_supplier_audit_mutation();

alter table curtainsuk_private.staging_review_requests enable row level security;
alter table curtainsuk_private.staging_review_requests force row level security;
alter table curtainsuk_private.staging_review_request_events enable row level security;
alter table curtainsuk_private.staging_review_request_events force row level security;
alter table curtainsuk_private.staging_review_submission_limits enable row level security;
alter table curtainsuk_private.staging_review_submission_limits force row level security;

revoke all on curtainsuk_private.staging_review_requests,
  curtainsuk_private.staging_review_request_events,
  curtainsuk_private.staging_review_submission_limits
from public, anon, authenticated;

grant select, insert, update on curtainsuk_private.staging_review_requests to service_role;
grant select, insert on curtainsuk_private.staging_review_request_events to service_role;
grant select, insert, update on curtainsuk_private.staging_review_submission_limits to service_role;

-- Supabase Storage supports SQL-managed buckets. This bucket is private and is
-- only accessed by the server-side service client; no browser storage policy is
-- created. The 3 MB object cap leaves room beneath Vercel's 4.5 MB request cap.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'curtainsuk-review-evidence-staging',
  'curtainsuk-review-evidence-staging',
  false,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
