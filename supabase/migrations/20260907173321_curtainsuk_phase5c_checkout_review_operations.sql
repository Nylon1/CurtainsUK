-- CurtainsUK Phase 5C: durable staff review operations, immutable checkout
-- snapshots, staging checkout contracts, and private evidence quarantine.
-- All objects remain in the service-role-only curtainsuk_private schema.

create or replace function curtainsuk_private.reject_curtainsuk_immutable_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'CurtainsUK record is immutable';
end;
$$;

revoke execute on function curtainsuk_private.reject_curtainsuk_immutable_mutation()
  from public, anon, authenticated, service_role;

-- READY_FOR_BULK_IMPORT database-clock gate. apply_fabric_catalogue_batch writes
-- its run row before touching the Fabric Master, so this trigger rejects the
-- complete transaction when either caller timestamp is more than five minutes
-- ahead of the authoritative database clock. It also protects direct service
-- role inserts. A failed future-dated import therefore cannot mutate catalogue
-- records. Boundary fixture: clock+5m is accepted; clock+5m+1s is rejected.
create or replace function curtainsuk_private.enforce_fabric_catalogue_import_database_clock()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  database_now timestamptz := clock_timestamp();
begin
  if new.imported_at > database_now + interval '5 minutes' then
    raise exception 'catalogue imported_at is ahead of the database clock';
  end if;
  if new.source_observed_at > database_now + interval '5 minutes' then
    raise exception 'catalogue source_observed_at is ahead of the database clock';
  end if;
  return new;
end;
$$;

drop trigger if exists fabric_catalogue_import_database_clock
  on curtainsuk_private.fabric_catalogue_import_runs;
create trigger fabric_catalogue_import_database_clock
before insert on curtainsuk_private.fabric_catalogue_import_runs
for each row execute function curtainsuk_private.enforce_fabric_catalogue_import_database_clock();

revoke execute on function curtainsuk_private.enforce_fabric_catalogue_import_database_clock()
  from public, anon, authenticated, service_role;

-- Fail closed when promoting a supplier price into the Fabric Master. Historical
-- approval events do not count after a later rejection/expiry, and a missing or
-- expired price expiry is never interpreted as current commercial truth.
create or replace function curtainsuk_private.promote_fabric_for_staging_projection(
  p_supplier_id text,
  p_supplier_sku text,
  p_snapshot_id text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from curtainsuk_private.supplier_snapshots snapshot
    join curtainsuk_private.supplier_snapshot_prices price
      on price.snapshot_id = snapshot.snapshot_id
    where snapshot.snapshot_id = p_snapshot_id
      and snapshot.supplier_id = p_supplier_id
      and snapshot.supplier_sku = p_supplier_sku
      and snapshot.validation_status = 'VALIDATED'
      and snapshot.verification_status = 'VERIFIED'
      and snapshot.lifecycle_state <> 'DISCONTINUED'
      and price.cut_trade_price > 0
      and price.currency = 'GBP'
      and snapshot.price_expires_at is not null
      and snapshot.price_expires_at > clock_timestamp()
      and (
        select event.promotion_state
        from curtainsuk_private.supplier_promotion_events event
        where event.snapshot_id = snapshot.snapshot_id
        order by
          event.created_at desc,
          case event.promotion_state
            when 'EXPIRED' then 4
            when 'REJECTED' then 3
            when 'APPROVED_FOR_PROJECTION' then 2
            when 'VALIDATED' then 1
            else 0
          end desc,
          event.event_id desc
        limit 1
      ) = 'APPROVED_FOR_PROJECTION'
  ) then
    raise exception 'Latest approved, current, verified supplier cut price is required';
  end if;

  update curtainsuk_private.fabric_supplier_links
  set price_verification_status = 'VERIFIED'
  where supplier_id = p_supplier_id and supplier_sku = p_supplier_sku;

  update curtainsuk_private.fabric_colourways
  set price_verification_status = 'VERIFIED',
      storefront_selectable = true,
      updated_at = clock_timestamp()
  where supplier_id = p_supplier_id
    and supplier_sku = p_supplier_sku
    and lifecycle_state = 'CURRENT';
end;
$$;

revoke execute on function curtainsuk_private.promote_fabric_for_staging_projection(text, text, text)
  from public, anon, authenticated;
grant execute on function curtainsuk_private.promote_fabric_for_staging_projection(text, text, text)
  to service_role;

alter table curtainsuk_private.staging_review_requests
  add column calculated_fabric_metres numeric(12, 3)
  check (calculated_fabric_metres is null or calculated_fabric_metres > 0);

-- The original Phase 5B create RPC has a fixed column list. The new atomic
-- wrapper passes this server-calculated value through transaction-local context
-- so it is captured on INSERT without permitting a later mutation.
create or replace function curtainsuk_private.capture_staging_review_calculated_metres()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  metres_text text := nullif(current_setting('curtainsuk.calculated_fabric_metres', true), '');
begin
  if metres_text is not null then
    new.calculated_fabric_metres := metres_text::numeric;
  end if;
  if new.calculated_fabric_metres is not null and new.calculated_fabric_metres <= 0 then
    raise exception 'Calculated fabric metres must be positive';
  end if;
  return new;
end;
$$;

create trigger staging_review_capture_calculated_metres
before insert on curtainsuk_private.staging_review_requests
for each row execute function curtainsuk_private.capture_staging_review_calculated_metres();

revoke execute on function curtainsuk_private.capture_staging_review_calculated_metres()
  from public, anon, authenticated, service_role;

-- Canonical private evidence records. The legacy JSON summary remains on the
-- request temporarily for backwards compatibility, but is never authoritative.
create table curtainsuk_private.staging_review_evidence (
  evidence_id uuid primary key default gen_random_uuid(),
  request_id uuid not null references curtainsuk_private.staging_review_requests (request_id) on delete restrict,
  kind text not null check (kind in ('PHOTO', 'DRAWING')),
  file_name text not null check (length(trim(file_name)) between 1 and 255),
  object_path text not null unique check (length(trim(object_path)) between 3 and 1024),
  claimed_content_type text not null check (
    claimed_content_type in ('image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf')
  ),
  detected_content_type text check (
    detected_content_type is null
    or detected_content_type in ('image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf')
  ),
  size_bytes bigint not null check (size_bytes between 1 and 3145728),
  sha256_hex text not null check (sha256_hex ~ '^[a-f0-9]{64}$'),
  security_state text not null default 'QUARANTINED' check (
    security_state in ('QUARANTINED', 'CLEAN', 'REJECTED', 'DELETION_REQUESTED', 'DELETED')
  ),
  scanner_provider text,
  scanner_reference text,
  scanned_at timestamptz,
  rejection_reason text,
  retention_expires_at timestamptz not null,
  deletion_requested_by uuid,
  deletion_requested_at timestamptz,
  deletion_reason text,
  deleted_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  constraint staging_review_evidence_retention_after_creation
    check (retention_expires_at > created_at),
  constraint staging_review_evidence_clean_has_scan
    check (
      security_state <> 'CLEAN'
      or (
        scanned_at is not null
        and scanner_provider is not null
        and detected_content_type is not null
        and detected_content_type = claimed_content_type
      )
    ),
  constraint staging_review_evidence_rejected_has_reason
    check (security_state <> 'REJECTED' or (scanned_at is not null and rejection_reason is not null)),
  constraint staging_review_evidence_deletion_has_audit
    check (
      security_state not in ('DELETION_REQUESTED', 'DELETED')
      or (
        deletion_requested_by is not null
        and deletion_requested_at is not null
        and deletion_reason is not null
      )
    ),
  constraint staging_review_evidence_deleted_has_timestamp
    check ((security_state = 'DELETED') = (deleted_at is not null))
);

create index staging_review_evidence_request_idx
  on curtainsuk_private.staging_review_evidence (request_id, created_at);
create index staging_review_evidence_state_idx
  on curtainsuk_private.staging_review_evidence (security_state, updated_at);
create index staging_review_evidence_retention_idx
  on curtainsuk_private.staging_review_evidence (retention_expires_at)
  where security_state <> 'DELETED';

create table curtainsuk_private.staging_review_evidence_access_log (
  event_id uuid primary key,
  evidence_id uuid not null references curtainsuk_private.staging_review_evidence (evidence_id) on delete restrict,
  actor_id uuid not null,
  action text not null check (action in ('ISSUE_TOKEN', 'DOWNLOAD', 'DELETE_REQUESTED', 'DELETED', 'SCAN_RESULT')),
  occurred_at timestamptz not null default clock_timestamp(),
  reason text,
  request_fingerprint text check (
    request_fingerprint is null or request_fingerprint ~ '^[a-f0-9]{64}$'
  ),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object')
);

create index staging_review_evidence_access_history_idx
  on curtainsuk_private.staging_review_evidence_access_log (evidence_id, occurred_at);

create trigger staging_review_evidence_access_log_append_only
before update or delete on curtainsuk_private.staging_review_evidence_access_log
for each row execute function curtainsuk_private.reject_curtainsuk_immutable_mutation();

create or replace function curtainsuk_private.enforce_staging_review_evidence_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (to_jsonb(new) - array[
        'security_state', 'scanner_provider', 'scanner_reference', 'scanned_at',
        'rejection_reason', 'deletion_requested_by', 'deletion_requested_at',
        'deletion_reason', 'deleted_at', 'updated_at', 'detected_content_type'
      ]) is distinct from (to_jsonb(old) - array[
        'security_state', 'scanner_provider', 'scanner_reference', 'scanned_at',
        'rejection_reason', 'deletion_requested_by', 'deletion_requested_at',
        'deletion_reason', 'deleted_at', 'updated_at', 'detected_content_type'
      ]) then
    raise exception 'Evidence identity and file metadata are immutable';
  end if;
  if new.security_state = old.security_state then
    raise exception 'Evidence updates must change security state';
  end if;
  if not (
    (old.security_state = 'QUARANTINED' and new.security_state in ('CLEAN', 'REJECTED', 'DELETION_REQUESTED'))
    or (old.security_state in ('CLEAN', 'REJECTED') and new.security_state = 'DELETION_REQUESTED')
    or (old.security_state = 'DELETION_REQUESTED' and new.security_state = 'DELETED')
  ) then
    raise exception 'Invalid evidence security-state transition';
  end if;
  new.updated_at := clock_timestamp();
  return new;
end;
$$;

create trigger staging_review_evidence_transition_guard
before update on curtainsuk_private.staging_review_evidence
for each row execute function curtainsuk_private.enforce_staging_review_evidence_transition();

revoke execute on function curtainsuk_private.enforce_staging_review_evidence_transition()
  from public, anon, authenticated, service_role;

create or replace function curtainsuk_private.register_staging_review_evidence(p_records jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  item jsonb;
  inserted_count integer := 0;
begin
  if jsonb_typeof(p_records) <> 'array' or jsonb_array_length(p_records) < 1 or jsonb_array_length(p_records) > 9 then
    raise exception 'Evidence registration requires one to nine records';
  end if;
  for item in select value from jsonb_array_elements(p_records)
  loop
    insert into curtainsuk_private.staging_review_evidence (
      evidence_id, request_id, kind, file_name, object_path,
      claimed_content_type, size_bytes, sha256_hex, security_state,
      retention_expires_at, created_at, updated_at
    ) values (
      coalesce((item->>'evidence_id')::uuid, gen_random_uuid()),
      (item->>'request_id')::uuid,
      item->>'kind',
      item->>'file_name',
      item->>'object_path',
      item->>'claimed_content_type',
      (item->>'size_bytes')::bigint,
      lower(item->>'sha256_hex'),
      'QUARANTINED',
      (item->>'retention_expires_at')::timestamptz,
      clock_timestamp(),
      clock_timestamp()
    );
    inserted_count := inserted_count + 1;
  end loop;
  return jsonb_build_object('registered', inserted_count);
end;
$$;

create or replace function curtainsuk_private.record_staging_review_evidence_access(p_event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted curtainsuk_private.staging_review_evidence_access_log;
begin
  insert into curtainsuk_private.staging_review_evidence_access_log (
    event_id, evidence_id, actor_id, action, occurred_at, reason, request_fingerprint, metadata
  ) values (
    coalesce((p_event->>'event_id')::uuid, gen_random_uuid()),
    (p_event->>'evidence_id')::uuid,
    (p_event->>'actor_id')::uuid,
    p_event->>'action',
    clock_timestamp(),
    nullif(trim(p_event->>'reason'), ''),
    nullif(lower(trim(p_event->>'request_fingerprint')), ''),
    coalesce(p_event->'metadata', '{}'::jsonb)
  ) returning * into inserted;
  return jsonb_build_object('event_id', inserted.event_id, 'occurred_at', inserted.occurred_at);
end;
$$;

create or replace function curtainsuk_private.record_staging_review_evidence_scan(p_result jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target curtainsuk_private.staging_review_evidence;
  verdict text := p_result->>'verdict';
  next_state text;
  database_now timestamptz := clock_timestamp();
  event_id uuid := coalesce((p_result->>'event_id')::uuid, gen_random_uuid());
begin
  if verdict not in ('CLEAN', 'MALICIOUS')
     or (p_result->>'actor_id') is null
     or nullif(trim(p_result->>'scanner_provider'), '') is null
     or nullif(trim(p_result->>'detected_content_type'), '') is null then
    raise exception 'Invalid evidence scan result';
  end if;
  next_state := case verdict when 'CLEAN' then 'CLEAN' else 'REJECTED' end;
  if next_state = 'REJECTED' and nullif(trim(p_result->>'rejection_reason'), '') is null then
    raise exception 'Rejected evidence requires a reason';
  end if;

  update curtainsuk_private.staging_review_evidence
  set security_state = next_state,
      detected_content_type = p_result->>'detected_content_type',
      scanner_provider = trim(p_result->>'scanner_provider'),
      scanner_reference = nullif(trim(p_result->>'scanner_reference'), ''),
      scanned_at = database_now,
      rejection_reason = case
        when next_state = 'REJECTED' then trim(p_result->>'rejection_reason')
        else null
      end
  where evidence_id = (p_result->>'evidence_id')::uuid
    and security_state = 'QUARANTINED'
  returning * into target;

  if target.evidence_id is null then
    raise exception 'Evidence is unknown or no longer quarantined';
  end if;

  insert into curtainsuk_private.staging_review_evidence_access_log (
    event_id, evidence_id, actor_id, action, occurred_at, reason, metadata
  ) values (
    event_id,
    target.evidence_id,
    (p_result->>'actor_id')::uuid,
    'SCAN_RESULT',
    database_now,
    nullif(trim(p_result->>'rejection_reason'), ''),
    jsonb_build_object(
      'verdict', verdict,
      'security_state', target.security_state,
      'scanner_provider', target.scanner_provider,
      'scanner_reference', target.scanner_reference,
      'detected_content_type', target.detected_content_type
    )
  );

  return jsonb_build_object(
    'evidence_id', target.evidence_id,
    'security_state', target.security_state,
    'scanned_at', target.scanned_at,
    'event_id', event_id
  );
end;
$$;

-- Evidence deletion state and its audit event are committed atomically. Object
-- storage deletion remains outside PostgreSQL, so completion is idempotent when
-- a committed response is lost and the caller retries after removing the object.
create or replace function curtainsuk_private.request_staging_review_evidence_deletion(
  p_evidence_id uuid,
  p_actor_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target curtainsuk_private.staging_review_evidence;
  database_now timestamptz := clock_timestamp();
  audit_event_id uuid := gen_random_uuid();
  normalized_reason text := trim(p_reason);
begin
  if p_evidence_id is null
     or p_actor_id is null
     or length(normalized_reason) not between 3 and 1000 then
    raise exception 'Invalid evidence deletion request';
  end if;

  select * into target
  from curtainsuk_private.staging_review_evidence
  where evidence_id = p_evidence_id
  for update;

  if target.evidence_id is null then
    raise exception 'Unknown evidence';
  end if;
  if target.security_state = 'DELETION_REQUESTED'
     and target.deletion_requested_by = p_actor_id
     and target.deletion_reason = normalized_reason then
    return jsonb_build_object(
      'evidence_id', target.evidence_id,
      'security_state', target.security_state,
      'deletion_requested_at', target.deletion_requested_at
    );
  end if;
  if target.security_state not in ('QUARANTINED', 'CLEAN', 'REJECTED') then
    raise exception 'Evidence cannot be requested for deletion from its current state';
  end if;

  update curtainsuk_private.staging_review_evidence
  set security_state = 'DELETION_REQUESTED',
      deletion_requested_by = p_actor_id,
      deletion_requested_at = database_now,
      deletion_reason = normalized_reason
  where evidence_id = p_evidence_id
  returning * into target;

  insert into curtainsuk_private.staging_review_evidence_access_log (
    event_id, evidence_id, actor_id, action, occurred_at, reason, metadata
  ) values (
    audit_event_id, target.evidence_id, p_actor_id, 'DELETE_REQUESTED',
    database_now, normalized_reason, '{}'::jsonb
  );

  return jsonb_build_object(
    'evidence_id', target.evidence_id,
    'security_state', target.security_state,
    'deletion_requested_at', target.deletion_requested_at,
    'event_id', audit_event_id
  );
end;
$$;

create or replace function curtainsuk_private.complete_staging_review_evidence_deletion(
  p_evidence_id uuid,
  p_actor_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target curtainsuk_private.staging_review_evidence;
  database_now timestamptz := clock_timestamp();
  audit_event_id uuid := gen_random_uuid();
  normalized_reason text := trim(p_reason);
begin
  if p_evidence_id is null
     or p_actor_id is null
     or length(normalized_reason) not between 3 and 1000 then
    raise exception 'Invalid evidence deletion completion';
  end if;

  select * into target
  from curtainsuk_private.staging_review_evidence
  where evidence_id = p_evidence_id
  for update;

  if target.evidence_id is null then
    raise exception 'Unknown evidence';
  end if;
  if target.security_state = 'DELETED' then
    return jsonb_build_object(
      'evidence_id', target.evidence_id,
      'security_state', target.security_state,
      'deleted_at', target.deleted_at
    );
  end if;
  if target.security_state <> 'DELETION_REQUESTED' then
    raise exception 'Evidence deletion was not requested';
  end if;

  update curtainsuk_private.staging_review_evidence
  set security_state = 'DELETED',
      deleted_at = database_now
  where evidence_id = p_evidence_id
  returning * into target;

  insert into curtainsuk_private.staging_review_evidence_access_log (
    event_id, evidence_id, actor_id, action, occurred_at, reason, metadata
  ) values (
    audit_event_id, target.evidence_id, p_actor_id, 'DELETED',
    database_now, normalized_reason, '{}'::jsonb
  );

  return jsonb_build_object(
    'evidence_id', target.evidence_id,
    'security_state', target.security_state,
    'deleted_at', target.deleted_at,
    'event_id', audit_event_id
  );
end;
$$;

-- Submitted customer content remains untouched. Every customer submission and
-- staff amendment is represented as an immutable revision instead.
create table curtainsuk_private.staging_review_request_revisions (
  revision_id uuid primary key default gen_random_uuid(),
  request_id uuid not null references curtainsuk_private.staging_review_requests (request_id) on delete restrict,
  revision_number integer not null check (revision_number > 0),
  previous_revision_id uuid references curtainsuk_private.staging_review_request_revisions (revision_id) on delete restrict,
  revision_kind text not null check (revision_kind in ('CUSTOMER_SUBMISSION', 'STAFF_AMENDMENT')),
  specification jsonb not null check (jsonb_typeof(specification) = 'object'),
  final_net_amount_minor integer check (final_net_amount_minor is null or final_net_amount_minor > 0),
  final_vat_amount_minor integer check (final_vat_amount_minor is null or final_vat_amount_minor >= 0),
  final_gross_amount_minor integer check (final_gross_amount_minor is null or final_gross_amount_minor > 0),
  final_vat_rate_basis_points integer check (
    final_vat_rate_basis_points is null or final_vat_rate_basis_points = 2000
  ),
  currency text not null default 'GBP' check (currency = 'GBP'),
  pricing_rule_version text,
  actor_type text not null check (actor_type in ('CUSTOMER', 'STAFF', 'SYSTEM')),
  actor_id text,
  reason text not null check (length(trim(reason)) between 3 and 2000),
  created_at timestamptz not null default clock_timestamp(),
  unique (request_id, revision_number),
  constraint staging_review_revision_price_complete check (
    (
      final_net_amount_minor is null
      and final_vat_amount_minor is null
      and final_gross_amount_minor is null
      and final_vat_rate_basis_points is null
    )
    or (
      final_net_amount_minor is not null
      and final_vat_amount_minor is not null
      and final_gross_amount_minor is not null
      and final_vat_rate_basis_points = 2000
      and final_net_amount_minor + final_vat_amount_minor = final_gross_amount_minor
      and final_gross_amount_minor % 100 = 0
      and final_net_amount_minor = round(
        final_gross_amount_minor::numeric * 10000 / (10000 + final_vat_rate_basis_points)
      )::integer
      and pricing_rule_version is not null
    )
  ),
  constraint staging_review_revision_chain check (
    (revision_kind = 'CUSTOMER_SUBMISSION' and revision_number = 1 and previous_revision_id is null)
    or (revision_kind = 'STAFF_AMENDMENT' and revision_number > 1 and previous_revision_id is not null)
  )
);

create index staging_review_request_revisions_history_idx
  on curtainsuk_private.staging_review_request_revisions (request_id, revision_number);

create trigger staging_review_request_revisions_append_only
before update or delete on curtainsuk_private.staging_review_request_revisions
for each row execute function curtainsuk_private.reject_curtainsuk_immutable_mutation();

insert into curtainsuk_private.staging_review_request_revisions (
  request_id, revision_number, previous_revision_id, revision_kind, specification,
  final_net_amount_minor, final_vat_amount_minor, final_gross_amount_minor,
  currency, pricing_rule_version, actor_type, actor_id, reason, created_at
)
select
  request_id,
  1,
  null,
  'CUSTOMER_SUBMISSION',
  jsonb_build_object(
    'window_type_slug', window_type_slug,
    'measurement_basis', measurement_basis,
    'measurements', measurements,
    'fabric_id', fabric_id,
    'supplier_id', supplier_id,
    'supplier_sku', supplier_sku,
    'heading', heading,
    'lining', lining,
    'interlining', interlining,
    'construction', construction,
    'stack_direction', stack_direction,
    'fixing_position', fixing_position,
    'availability_state', availability_state,
    'pricing_outcome', pricing_outcome,
    'provisional_gross_price_minor', provisional_gross_price_minor,
    'calculated_fabric_metres', calculated_fabric_metres,
    'evidence', evidence,
    'customer_name', customer_name,
    'customer_email', customer_email,
    'customer_phone', customer_phone,
    'notes', notes
  ),
  null,
  null,
  null,
  currency,
  calculation_version,
  'CUSTOMER',
  null,
  'Original customer submission',
  submitted_at
from curtainsuk_private.staging_review_requests
on conflict (request_id, revision_number) do nothing;

create or replace function curtainsuk_private.capture_staging_review_customer_revision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into curtainsuk_private.staging_review_request_revisions (
    request_id, revision_number, previous_revision_id, revision_kind, specification,
    currency, pricing_rule_version, actor_type, reason, created_at
  ) values (
    new.request_id,
    1,
    null,
    'CUSTOMER_SUBMISSION',
    jsonb_build_object(
      'window_type_slug', new.window_type_slug,
      'measurement_basis', new.measurement_basis,
      'measurements', new.measurements,
      'fabric_id', new.fabric_id,
      'supplier_id', new.supplier_id,
      'supplier_sku', new.supplier_sku,
      'heading', new.heading,
      'lining', new.lining,
      'interlining', new.interlining,
      'construction', new.construction,
      'stack_direction', new.stack_direction,
      'fixing_position', new.fixing_position,
      'availability_state', new.availability_state,
      'pricing_outcome', new.pricing_outcome,
      'provisional_gross_price_minor', new.provisional_gross_price_minor,
      'calculated_fabric_metres', new.calculated_fabric_metres,
      'evidence', new.evidence,
      'customer_name', new.customer_name,
      'customer_email', new.customer_email,
      'customer_phone', new.customer_phone,
      'notes', new.notes
    ),
    new.currency,
    new.calculation_version,
    'CUSTOMER',
    'Original customer submission',
    new.submitted_at
  );
  return new;
end;
$$;

create trigger staging_review_customer_revision_on_insert
after insert on curtainsuk_private.staging_review_requests
for each row execute function curtainsuk_private.capture_staging_review_customer_revision();

revoke execute on function curtainsuk_private.capture_staging_review_customer_revision()
  from public, anon, authenticated, service_role;

create or replace function curtainsuk_private.append_staging_review_revision(p_revision jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target curtainsuk_private.staging_review_requests;
  previous curtainsuk_private.staging_review_request_revisions;
  inserted curtainsuk_private.staging_review_request_revisions;
  price_net integer;
  price_vat integer;
  price_gross integer;
  price_vat_rate integer;
begin
  select * into target
  from curtainsuk_private.staging_review_requests
  where request_id = (p_revision->>'request_id')::uuid
  for update;
  if target.request_id is null then raise exception 'Unknown review request'; end if;
  if target.review_state not in ('PENDING', 'NEEDS_INFORMATION', 'UNDER_REVIEW') then
    raise exception 'Review must be open before amendment';
  end if;
  if jsonb_typeof(p_revision->'specification') <> 'object'
     or nullif(trim(p_revision->>'actor_id'), '') is null
     or length(trim(p_revision->>'reason')) not between 3 and 2000 then
    raise exception 'Invalid review amendment';
  end if;

  price_net := (p_revision->>'final_net_amount_minor')::integer;
  price_vat := (p_revision->>'final_vat_amount_minor')::integer;
  price_gross := (p_revision->>'final_gross_amount_minor')::integer;
  price_vat_rate := (p_revision->>'final_vat_rate_basis_points')::integer;
  if (price_net is null) <> (price_vat is null)
     or (price_net is null) <> (price_gross is null)
     or (price_net is null) <> (price_vat_rate is null)
     or (price_net is not null and (
       price_net <= 0 or price_vat < 0 or price_gross <= 0
       or price_net + price_vat <> price_gross
       or price_vat_rate <> 2000
       or price_gross % 100 <> 0
       or price_net <> round(price_gross::numeric * 10000 / (10000 + price_vat_rate))::integer
       or nullif(trim(p_revision->>'pricing_rule_version'), '') is null
     )) then
    raise exception 'Invalid final price snapshot';
  end if;

  select * into previous
  from curtainsuk_private.staging_review_request_revisions
  where request_id = target.request_id
  order by revision_number desc
  limit 1;

  if nullif(p_revision->>'expected_state', '') is null
     or nullif(p_revision->>'expected_latest_revision_id', '') is null
     or target.review_state <> p_revision->>'expected_state'
     or previous.revision_id <> (p_revision->>'expected_latest_revision_id')::uuid then
    raise exception 'Review changed since it was loaded';
  end if;

  insert into curtainsuk_private.staging_review_request_revisions (
    revision_id, request_id, revision_number, previous_revision_id, revision_kind,
    specification, final_net_amount_minor, final_vat_amount_minor,
    final_gross_amount_minor, final_vat_rate_basis_points, currency, pricing_rule_version, actor_type,
    actor_id, reason, created_at
  ) values (
    coalesce((p_revision->>'revision_id')::uuid, gen_random_uuid()),
    target.request_id,
    previous.revision_number + 1,
    previous.revision_id,
    'STAFF_AMENDMENT',
    p_revision->'specification',
    price_net,
    price_vat,
    price_gross,
    price_vat_rate,
    'GBP',
    nullif(trim(p_revision->>'pricing_rule_version'), ''),
    'STAFF',
    trim(p_revision->>'actor_id'),
    trim(p_revision->>'reason'),
    clock_timestamp()
  ) returning * into inserted;

  return jsonb_build_object(
    'revision_id', inserted.revision_id,
    'request_id', inserted.request_id,
    'revision_number', inserted.revision_number,
    'previous_revision_id', inserted.previous_revision_id,
    'created_at', inserted.created_at
  );
end;
$$;

-- Migrate legacy state vocabulary to the six-state Phase 5C workflow.
drop trigger if exists staging_review_request_transition_audit
  on curtainsuk_private.staging_review_requests;
drop trigger if exists staging_review_request_events_append_only
  on curtainsuk_private.staging_review_request_events;

alter table curtainsuk_private.staging_review_requests
  drop constraint if exists staging_review_requests_review_state_check;
alter table curtainsuk_private.staging_review_request_events
  drop constraint if exists staging_review_request_events_review_state_check;

update curtainsuk_private.staging_review_requests
set review_state = case review_state
  when 'IN_REVIEW' then 'UNDER_REVIEW'
  when 'MORE_INFORMATION_REQUIRED' then 'NEEDS_INFORMATION'
  else review_state
end;
update curtainsuk_private.staging_review_request_events
set review_state = case review_state
  when 'IN_REVIEW' then 'UNDER_REVIEW'
  when 'MORE_INFORMATION_REQUIRED' then 'NEEDS_INFORMATION'
  else review_state
end;

create trigger staging_review_request_events_append_only
before update or delete on curtainsuk_private.staging_review_request_events
for each row execute function curtainsuk_private.reject_supplier_audit_mutation();

alter table curtainsuk_private.staging_review_requests
  add constraint staging_review_requests_review_state_check check (
    review_state in ('PENDING', 'NEEDS_INFORMATION', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'READY_FOR_CHECKOUT')
  );
alter table curtainsuk_private.staging_review_request_events
  add constraint staging_review_request_events_review_state_check check (
    review_state in ('PENDING', 'NEEDS_INFORMATION', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'READY_FOR_CHECKOUT')
  );

create or replace function curtainsuk_private.audit_staging_review_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  transition_actor text;
  transition_reason text;
  latest_revision curtainsuk_private.staging_review_request_revisions;
  evidence_summary_count integer;
  evidence_record_count integer;
begin
  if (to_jsonb(new) - 'review_state' - 'updated_at')
      is distinct from (to_jsonb(old) - 'review_state' - 'updated_at') then
    raise exception 'Staging review content is immutable after submission';
  end if;
  if new.review_state is not distinct from old.review_state then
    raise exception 'Staging review updates must change review state';
  end if;
  if not (
    (old.review_state = 'PENDING' and new.review_state in ('NEEDS_INFORMATION', 'UNDER_REVIEW', 'REJECTED'))
    or (old.review_state = 'NEEDS_INFORMATION' and new.review_state in ('UNDER_REVIEW', 'REJECTED'))
    or (old.review_state = 'UNDER_REVIEW' and new.review_state in ('NEEDS_INFORMATION', 'APPROVED', 'REJECTED'))
    or (old.review_state = 'APPROVED' and new.review_state in ('UNDER_REVIEW', 'READY_FOR_CHECKOUT', 'REJECTED'))
  ) then
    raise exception 'Invalid review state transition';
  end if;

  if new.review_state in ('APPROVED', 'READY_FOR_CHECKOUT') then
    evidence_summary_count := jsonb_array_length(old.evidence);
    select count(*) into evidence_record_count
    from curtainsuk_private.staging_review_evidence
    where request_id = old.request_id;
    if evidence_summary_count <> evidence_record_count
       or exists (
         select 1 from curtainsuk_private.staging_review_evidence
         where request_id = old.request_id
           and (
             security_state <> 'CLEAN'
             or deleted_at is not null
             or retention_expires_at <= clock_timestamp()
           )
       ) then
      raise exception 'All review evidence must be clean before approval';
    end if;
    if old.window_type_slug in ('apex-window', 'triangular-window', 'gable-end-window')
       and not exists (
         select 1
         from curtainsuk_private.staging_review_evidence
         where request_id = old.request_id
           and kind = 'PHOTO'
           and security_state = 'CLEAN'
           and deleted_at is null
           and retention_expires_at > clock_timestamp()
       ) then
      raise exception 'Specialist review requires clean, current photographic evidence';
    end if;
    select * into latest_revision
    from curtainsuk_private.staging_review_request_revisions
    where request_id = old.request_id
    order by revision_number desc
    limit 1;
    if latest_revision.final_gross_amount_minor is null or latest_revision.final_gross_amount_minor <= 0 then
      raise exception 'A reviewed final price is required before approval';
    end if;
  end if;

  if new.review_state = 'READY_FOR_CHECKOUT' then
    if coalesce(
      nullif(trim(latest_revision.specification->>'availability_state'), ''),
      old.availability_state
    ) not in ('FABRIC_AVAILABLE', 'LIMITED_AVAILABILITY') then
      raise exception 'Fabric availability must be acceptable before checkout readiness';
    end if;
    if not exists (
      select 1
      from curtainsuk_private.fabric_colourways fabric
      where fabric.fabric_id = coalesce(
          nullif(trim(latest_revision.specification->>'fabric_id'), ''),
          old.fabric_id
        )
        and fabric.supplier_id = coalesce(
          nullif(trim(latest_revision.specification->>'supplier_id'), ''),
          old.supplier_id
        )
        and fabric.supplier_sku = coalesce(
          nullif(trim(latest_revision.specification->>'supplier_sku'), ''),
          old.supplier_sku
        )
        and fabric.price_verification_status = 'VERIFIED'
        and fabric.lifecycle_state = 'CURRENT'
        and fabric.storefront_selectable
    ) then
      raise exception 'Fabric is not pricing-eligible for checkout readiness';
    end if;
    if coalesce(
      nullif(latest_revision.specification->>'calculated_fabric_metres', '')::numeric,
      old.calculated_fabric_metres
    ) is null or coalesce(
      nullif(latest_revision.specification->>'calculated_fabric_metres', '')::numeric,
      old.calculated_fabric_metres
    ) <= 0 then
      raise exception 'Calculated fabric metres are required before checkout readiness';
    end if;
    if coalesce(
      nullif(trim(latest_revision.specification->>'shipping_parcel_class'), ''),
      ''
    ) not in ('STANDARD', 'OVERSIZE', 'SPECIALIST') then
      raise exception 'An approved shipping parcel class is required before checkout readiness';
    end if;
  end if;

  transition_actor := nullif(trim(current_setting('curtainsuk.review_actor_id', true)), '');
  transition_reason := nullif(trim(current_setting('curtainsuk.review_reason', true)), '');
  if transition_actor is null or transition_reason is null then
    raise exception using errcode = '42501', message = 'Review transition context is required';
  end if;
  new.updated_at := clock_timestamp();

  insert into curtainsuk_private.staging_review_request_events (
    event_id, request_id, review_state, actor_type, actor_id, reason, created_at
  ) values (
    gen_random_uuid(), new.request_id, new.review_state, 'STAFF',
    transition_actor, transition_reason, new.updated_at
  );
  return new;
end;
$$;

drop function if exists curtainsuk_private.transition_staging_review_request(uuid, text, text, text);

create function curtainsuk_private.transition_staging_review_request(
  p_request_id uuid,
  p_review_state text,
  p_actor_id text,
  p_reason text,
  p_expected_state text,
  p_expected_latest_revision_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed curtainsuk_private.staging_review_requests;
  current_state text;
  latest_revision_id uuid;
begin
  if p_review_state not in ('NEEDS_INFORMATION', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'READY_FOR_CHECKOUT')
     or p_expected_state is null
     or p_expected_state not in ('PENDING', 'NEEDS_INFORMATION', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'READY_FOR_CHECKOUT')
     or p_expected_latest_revision_id is null
     or nullif(trim(p_actor_id), '') is null
     or length(trim(p_reason)) not between 3 and 2000 then
    raise exception 'Invalid review transition';
  end if;
  select review_state into current_state
  from curtainsuk_private.staging_review_requests
  where request_id = p_request_id
  for update;
  if current_state is null then raise exception 'Unknown review request'; end if;
  select revision_id into latest_revision_id
  from curtainsuk_private.staging_review_request_revisions
  where request_id = p_request_id
  order by revision_number desc
  limit 1;
  if current_state <> p_expected_state or latest_revision_id <> p_expected_latest_revision_id then
    raise exception 'Review changed since it was loaded';
  end if;
  perform set_config('curtainsuk.review_actor_id', trim(p_actor_id), true);
  perform set_config('curtainsuk.review_reason', trim(p_reason), true);
  update curtainsuk_private.staging_review_requests
  set review_state = p_review_state
  where request_id = p_request_id
    and review_state is distinct from p_review_state
  returning * into changed;
  if changed.request_id is null then
    if exists (select 1 from curtainsuk_private.staging_review_requests where request_id = p_request_id) then
      raise exception 'Review state is unchanged';
    end if;
    raise exception 'Unknown review request';
  end if;
  return jsonb_build_object(
    'request_id', changed.request_id,
    'review_state', changed.review_state,
    'updated_at', changed.updated_at
  );
end;
$$;

create trigger staging_review_request_transition_audit
before update on curtainsuk_private.staging_review_requests
for each row execute function curtainsuk_private.audit_staging_review_transition();

-- Once a configuration is eligible for checkout, its exact customer-safe
-- configuration and price are snapshotted. A later supplier price change cannot
-- mutate this record or the resulting handoff.
create table curtainsuk_private.staging_configuration_snapshots (
  snapshot_id uuid primary key,
  configuration_id uuid not null unique,
  review_request_id uuid references curtainsuk_private.staging_review_requests (request_id) on delete restrict,
  review_revision_id uuid references curtainsuk_private.staging_review_request_revisions (revision_id) on delete restrict,
  pricing_outcome text not null check (pricing_outcome in ('INSTANT_PRICE', 'PRICE_WITH_REVIEW', 'MANUAL_QUOTE')),
  window_type_slug text not null,
  measurements jsonb not null check (jsonb_typeof(measurements) = 'object'),
  fabric_master_id text not null references curtainsuk_private.fabric_colourways (fabric_id) on delete restrict,
  supplier_sku text not null,
  supplier_price_snapshot_id text not null references curtainsuk_private.supplier_snapshots (snapshot_id) on delete restrict,
  heading text not null,
  lining text not null,
  construction text not null check (construction in ('PAIR', 'SINGLE')),
  calculated_fabric_metres numeric(12, 3) not null check (calculated_fabric_metres > 0),
  pricing_rule_version text not null check (length(trim(pricing_rule_version)) > 0),
  net_amount_minor integer not null check (net_amount_minor > 0),
  vat_amount_minor integer not null check (vat_amount_minor >= 0),
  customer_price_minor integer not null check (customer_price_minor > 0),
  vat_rate_basis_points integer not null check (vat_rate_basis_points = 2000),
  currency text not null default 'GBP' check (currency = 'GBP'),
  availability_state text not null check (availability_state in ('FABRIC_AVAILABLE', 'LIMITED_AVAILABILITY')),
  shipping_region text not null check (shipping_region in ('UK_MAINLAND', 'HIGHLANDS_ISLANDS', 'NORTHERN_IRELAND')),
  shipping_parcel_class text not null check (shipping_parcel_class in ('STANDARD', 'OVERSIZE', 'SPECIALIST')),
  shipping_gross_amount_minor integer not null check (shipping_gross_amount_minor > 0),
  goods_minimum_basis_minor integer not null check (goods_minimum_basis_minor = customer_price_minor),
  customer_summary jsonb not null check (jsonb_typeof(customer_summary) = 'object'),
  approval_reference text,
  customer_accepted_at timestamptz not null,
  recorded_at timestamptz not null default clock_timestamp(),
  constraint staging_configuration_price_arithmetic check (
    net_amount_minor + vat_amount_minor = customer_price_minor
    and customer_price_minor % 100 = 0
    and net_amount_minor = round(
      customer_price_minor::numeric * 10000 / (10000 + vat_rate_basis_points)
    )::integer
  ),
  constraint staging_configuration_review_references check (
    (
      pricing_outcome = 'INSTANT_PRICE'
      and review_request_id is null
      and review_revision_id is null
      and approval_reference is null
    )
    or (
      pricing_outcome in ('PRICE_WITH_REVIEW', 'MANUAL_QUOTE')
      and review_request_id is not null
      and review_revision_id is not null
      and nullif(trim(approval_reference), '') is not null
    )
  )
);

create index staging_configuration_snapshots_review_idx
  on curtainsuk_private.staging_configuration_snapshots (review_request_id)
  where review_request_id is not null;
create index staging_configuration_snapshots_created_idx
  on curtainsuk_private.staging_configuration_snapshots (recorded_at desc);

create trigger staging_configuration_snapshots_append_only
before update or delete on curtainsuk_private.staging_configuration_snapshots
for each row execute function curtainsuk_private.reject_curtainsuk_immutable_mutation();

create or replace function curtainsuk_private.create_staging_configuration_snapshot(p_snapshot jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  outcome text := p_snapshot->>'pricing_outcome';
  request_record curtainsuk_private.staging_review_requests;
  revision_record curtainsuk_private.staging_review_request_revisions;
  inserted curtainsuk_private.staging_configuration_snapshots;
  current_price_snapshot_id text;
  private_key_pattern text := '"(supplier_?cost|standard_?trade_?price|cut_?trade_?price|gross_?margin|raw_?stock|batch_?reference|dye_?lot)"[[:space:]]*:';
begin
  if outcome not in ('INSTANT_PRICE', 'PRICE_WITH_REVIEW', 'MANUAL_QUOTE')
     or jsonb_typeof(p_snapshot->'measurements') <> 'object'
     or jsonb_typeof(p_snapshot->'customer_summary') <> 'object'
     or jsonb_typeof(p_snapshot->'customer_summary'->'measurements') <> 'object'
     or jsonb_typeof(p_snapshot->'customer_summary'->'fabric') <> 'object'
     or (p_snapshot->'measurements')::text ~* private_key_pattern
     or (p_snapshot->'customer_summary')::text ~* private_key_pattern
     or exists (
       select 1
       from jsonb_object_keys(p_snapshot->'measurements') as measurement_key(key)
       where measurement_key.key not in (
         'measurement_basis', 'coverage_width', 'finished_drop', 'recess_width', 'recess_height',
         'left_return', 'right_return', 'bay_segment_widths', 'bay_angles_degrees',
         'curve_arc_length', 'peak_height', 'left_vertical', 'right_vertical',
         'left_slope', 'right_slope', 'left_slope_angle_degrees',
         'right_slope_angle_degrees', 'door_width', 'door_height',
         'number_of_sections', 'track_or_pole_fitted'
       )
     )
     or exists (
       select 1
       from jsonb_object_keys(p_snapshot->'customer_summary') as summary_key(key)
       where summary_key.key not in (
         'windowType', 'measurements', 'fabric', 'heading', 'lining',
         'construction', 'availability', 'reviewState', 'vatIncluded',
         'deliveryShownSeparately'
       )
     )
     or exists (
       select 1
       from jsonb_object_keys(p_snapshot->'customer_summary'->'fabric') as fabric_key(key)
       where fabric_key.key not in ('id', 'supplier', 'brand', 'collection', 'design', 'colour')
     )
     or not (p_snapshot->'customer_summary' ?& array[
       'windowType', 'measurements', 'fabric', 'heading', 'lining',
       'construction', 'availability', 'vatIncluded', 'deliveryShownSeparately'
     ])
     or p_snapshot->'customer_summary'->'measurements' is distinct from p_snapshot->'measurements'
     or p_snapshot->'customer_summary'->>'windowType' is distinct from p_snapshot->>'window_type_slug'
     or p_snapshot->'customer_summary'->>'heading' is distinct from p_snapshot->>'heading'
     or p_snapshot->'customer_summary'->>'lining' is distinct from p_snapshot->>'lining'
     or p_snapshot->'customer_summary'->>'construction' is distinct from p_snapshot->>'construction'
     or p_snapshot->'customer_summary'->>'availability' is distinct from p_snapshot->>'availability_state'
     or p_snapshot->'customer_summary'->'vatIncluded' is distinct from 'true'::jsonb
     or p_snapshot->'customer_summary'->'deliveryShownSeparately' is distinct from 'true'::jsonb
     or nullif(trim(p_snapshot->'customer_summary'->'fabric'->>'design'), '') is null
     or nullif(trim(p_snapshot->'customer_summary'->'fabric'->>'colour'), '') is null then
    raise exception 'Invalid or private checkout snapshot payload';
  end if;

  if outcome = 'INSTANT_PRICE' then
    if nullif(p_snapshot->>'review_request_id', '') is not null
       or nullif(p_snapshot->>'review_revision_id', '') is not null
       or p_snapshot->'customer_summary' ? 'reviewState' then
      raise exception 'Instant checkout cannot carry a review reference';
    end if;
  else
    select * into request_record
    from curtainsuk_private.staging_review_requests
    where request_id = (p_snapshot->>'review_request_id')::uuid
      and configuration_id = (p_snapshot->>'configuration_id')::uuid
    for share;
    if request_record.request_id is null or request_record.review_state <> 'READY_FOR_CHECKOUT' then
      raise exception 'Review is not ready for checkout';
    end if;
    if p_snapshot->'customer_summary'->>'reviewState' is distinct from 'READY_FOR_CHECKOUT' then
      raise exception 'Checkout summary does not match the approved review state';
    end if;
    if request_record.pricing_outcome is distinct from outcome then
      raise exception 'Checkout outcome does not match the approved review request';
    end if;
    if nullif(trim(p_snapshot->>'approval_reference'), '') is distinct from request_record.request_id::text then
      raise exception 'Checkout approval reference does not match the review request';
    end if;
    select * into revision_record
    from curtainsuk_private.staging_review_request_revisions
    where revision_id = (p_snapshot->>'review_revision_id')::uuid
      and request_id = request_record.request_id;
    if revision_record.revision_id is null
       or revision_record.final_net_amount_minor <> (p_snapshot->>'net_amount_minor')::integer
       or revision_record.final_vat_amount_minor <> (p_snapshot->>'vat_amount_minor')::integer
       or revision_record.final_gross_amount_minor <> (p_snapshot->>'customer_price_minor')::integer
       or revision_record.final_vat_rate_basis_points <> (p_snapshot->>'vat_rate_basis_points')::integer
       or revision_record.pricing_rule_version <> p_snapshot->>'pricing_rule_version' then
      raise exception 'Checkout price does not match the approved review revision';
    end if;
    if exists (
      select 1 from curtainsuk_private.staging_review_request_revisions newer
      where newer.request_id = request_record.request_id
        and newer.revision_number > revision_record.revision_number
    ) then
      raise exception 'Checkout revision is stale';
    end if;
    if p_snapshot->>'window_type_slug' is distinct from coalesce(
         nullif(trim(revision_record.specification->>'window_type_slug'), ''),
         request_record.window_type_slug
       )
       or p_snapshot->'measurements' is distinct from (case
         when jsonb_typeof(revision_record.specification->'measurements') = 'object'
           then revision_record.specification->'measurements'
         else request_record.measurements
       end)
       or p_snapshot->>'fabric_master_id' is distinct from coalesce(
         nullif(trim(revision_record.specification->>'fabric_id'), ''),
         request_record.fabric_id
       )
       or p_snapshot->>'supplier_sku' is distinct from coalesce(
         nullif(trim(revision_record.specification->>'supplier_sku'), ''),
         request_record.supplier_sku
       )
       or p_snapshot->>'heading' is distinct from coalesce(
         nullif(trim(revision_record.specification->>'heading'), ''),
         request_record.heading
       )
       or p_snapshot->>'lining' is distinct from coalesce(
         nullif(trim(revision_record.specification->>'lining'), ''),
         request_record.lining
       )
       or p_snapshot->>'construction' is distinct from coalesce(
         nullif(trim(revision_record.specification->>'construction'), ''),
         request_record.construction
       )
       or (p_snapshot->>'calculated_fabric_metres')::numeric is distinct from coalesce(
         nullif(revision_record.specification->>'calculated_fabric_metres', '')::numeric,
         request_record.calculated_fabric_metres
       )
       or p_snapshot->>'shipping_parcel_class' is distinct from nullif(
         trim(revision_record.specification->>'shipping_parcel_class'),
         ''
       ) then
      raise exception 'Checkout configuration does not match the approved review revision';
    end if;
    if not exists (
      select 1
      from curtainsuk_private.fabric_colourways fabric
      where fabric.fabric_id = p_snapshot->>'fabric_master_id'
        and fabric.supplier_id = coalesce(
          nullif(trim(revision_record.specification->>'supplier_id'), ''),
          request_record.supplier_id
        )
        and fabric.supplier_sku = p_snapshot->>'supplier_sku'
    ) then
      raise exception 'Checkout fabric identity does not match the Fabric Master';
    end if;
  end if;

  if not exists (
    select 1
    from curtainsuk_private.fabric_colourways fabric
    where fabric.fabric_id = p_snapshot->>'fabric_master_id'
      and fabric.supplier_sku = p_snapshot->>'supplier_sku'
      and fabric.price_verification_status = 'VERIFIED'
      and fabric.lifecycle_state = 'CURRENT'
      and fabric.storefront_selectable
  ) then
    raise exception 'Checkout fabric is not pricing-eligible in the Fabric Master';
  end if;

  -- Fabric Master flags are a catalogue projection, not durable proof that a
  -- supplier price remains current. Resolve and retain the exact latest
  -- approved supplier price observation used at handoff. A later price change
  -- cannot mutate this immutable link or the approved customer total.
  select supplier_snapshot.snapshot_id
  into current_price_snapshot_id
  from curtainsuk_private.fabric_colourways fabric
  join curtainsuk_private.supplier_snapshots supplier_snapshot
    on supplier_snapshot.supplier_id = fabric.supplier_id
   and supplier_snapshot.supplier_sku = fabric.supplier_sku
  join curtainsuk_private.supplier_snapshot_prices supplier_price
    on supplier_price.snapshot_id = supplier_snapshot.snapshot_id
  where fabric.fabric_id = p_snapshot->>'fabric_master_id'
    and fabric.supplier_sku = p_snapshot->>'supplier_sku'
    and supplier_snapshot.validation_status = 'VALIDATED'
    and supplier_snapshot.verification_status = 'VERIFIED'
    and supplier_snapshot.lifecycle_state <> 'DISCONTINUED'
    and supplier_snapshot.price_expires_at is not null
    and supplier_snapshot.price_expires_at > clock_timestamp()
    and supplier_price.cut_trade_price > 0
    and supplier_price.currency = 'GBP'
    and (
      select promotion.promotion_state
      from curtainsuk_private.supplier_promotion_events promotion
      where promotion.snapshot_id = supplier_snapshot.snapshot_id
      order by
        promotion.created_at desc,
        case promotion.promotion_state
          when 'EXPIRED' then 4
          when 'REJECTED' then 3
          when 'APPROVED_FOR_PROJECTION' then 2
          when 'VALIDATED' then 1
          else 0
        end desc,
        promotion.event_id desc
      limit 1
    ) = 'APPROVED_FOR_PROJECTION'
  order by supplier_snapshot.checked_at desc, supplier_snapshot.snapshot_id desc
  limit 1;
  if current_price_snapshot_id is null then
    raise exception 'Checkout supplier price approval is missing or expired';
  end if;

  insert into curtainsuk_private.staging_configuration_snapshots (
    snapshot_id, configuration_id, review_request_id, review_revision_id,
    pricing_outcome, window_type_slug, measurements, fabric_master_id,
    supplier_sku, supplier_price_snapshot_id, heading, lining, construction, calculated_fabric_metres,
    pricing_rule_version, net_amount_minor, vat_amount_minor,
    customer_price_minor, vat_rate_basis_points, currency, availability_state, shipping_region, shipping_parcel_class,
    shipping_gross_amount_minor, goods_minimum_basis_minor, customer_summary,
    approval_reference, customer_accepted_at, recorded_at
  ) values (
    (p_snapshot->>'snapshot_id')::uuid,
    (p_snapshot->>'configuration_id')::uuid,
    nullif(p_snapshot->>'review_request_id', '')::uuid,
    nullif(p_snapshot->>'review_revision_id', '')::uuid,
    outcome,
    p_snapshot->>'window_type_slug',
    p_snapshot->'measurements',
    p_snapshot->>'fabric_master_id',
    p_snapshot->>'supplier_sku',
    current_price_snapshot_id,
    p_snapshot->>'heading',
    p_snapshot->>'lining',
    p_snapshot->>'construction',
    (p_snapshot->>'calculated_fabric_metres')::numeric,
    p_snapshot->>'pricing_rule_version',
    (p_snapshot->>'net_amount_minor')::integer,
    (p_snapshot->>'vat_amount_minor')::integer,
    (p_snapshot->>'customer_price_minor')::integer,
    (p_snapshot->>'vat_rate_basis_points')::integer,
    'GBP',
    p_snapshot->>'availability_state',
    p_snapshot->>'shipping_region',
    p_snapshot->>'shipping_parcel_class',
    (p_snapshot->>'shipping_gross_amount_minor')::integer,
    (p_snapshot->>'customer_price_minor')::integer,
    p_snapshot->'customer_summary',
    nullif(trim(p_snapshot->>'approval_reference'), ''),
    clock_timestamp(),
    clock_timestamp()
  ) returning * into inserted;

  return jsonb_build_object(
    'snapshot_id', inserted.snapshot_id,
    'configuration_id', inserted.configuration_id,
    'customer_price_minor', inserted.customer_price_minor,
    'shipping_gross_amount_minor', inserted.shipping_gross_amount_minor,
    'recorded_at', inserted.recorded_at
  );
end;
$$;

create table curtainsuk_private.staging_checkout_handoffs (
  handoff_id uuid primary key,
  snapshot_id uuid not null unique references curtainsuk_private.staging_configuration_snapshots (snapshot_id) on delete restrict,
  handoff_mode text not null default 'SHOPIFY_DRAFT_ORDER_EXACT_PRICE' check (handoff_mode = 'SHOPIFY_DRAFT_ORDER_EXACT_PRICE'),
  status text not null default 'PREPARED' check (status = 'PREPARED'),
  payment_enabled boolean not null default false check (payment_enabled = false),
  shopify_write_performed boolean not null default false check (shopify_write_performed = false),
  checkout_url text check (checkout_url is null),
  prepared_by text not null,
  contract jsonb not null check (jsonb_typeof(contract) = 'object'),
  prepared_at timestamptz not null default clock_timestamp()
);

create index staging_checkout_handoffs_prepared_idx
  on curtainsuk_private.staging_checkout_handoffs (prepared_at desc);

create trigger staging_checkout_handoffs_append_only
before update or delete on curtainsuk_private.staging_checkout_handoffs
for each row execute function curtainsuk_private.reject_curtainsuk_immutable_mutation();

create or replace function curtainsuk_private.prepare_staging_checkout_handoff(
  p_snapshot_id uuid,
  p_handoff_id uuid,
  p_prepared_by text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  source curtainsuk_private.staging_configuration_snapshots;
  inserted curtainsuk_private.staging_checkout_handoffs;
begin
  if nullif(trim(p_prepared_by), '') is null then raise exception 'Checkout actor is required'; end if;
  select * into source
  from curtainsuk_private.staging_configuration_snapshots
  where snapshot_id = p_snapshot_id;
  if source.snapshot_id is null then raise exception 'Unknown configuration snapshot'; end if;

  insert into curtainsuk_private.staging_checkout_handoffs (
    handoff_id, snapshot_id, handoff_mode, status, payment_enabled,
    shopify_write_performed, checkout_url, prepared_by, contract, prepared_at
  ) values (
    p_handoff_id,
    source.snapshot_id,
    'SHOPIFY_DRAFT_ORDER_EXACT_PRICE',
    'PREPARED',
    false,
    false,
    null,
    trim(p_prepared_by),
    jsonb_build_object(
      'environment', 'STAGING',
      'payment_enabled', false,
      'shopify_write_performed', false,
      'checkout_url', null,
      'configuration_snapshot_id', source.snapshot_id,
      'configuration_id', source.configuration_id,
      'pricing_outcome', source.pricing_outcome,
      'pricing_rule_version', source.pricing_rule_version,
      'review_request_id', source.review_request_id,
      'review_revision_id', source.review_revision_id,
      'approval_reference', source.approval_reference,
      'fabric_master_id', source.fabric_master_id,
      'supplier_sku', source.supplier_sku,
      'net_amount_minor', source.net_amount_minor,
      'vat_amount_minor', source.vat_amount_minor,
      'vat_rate_basis_points', source.vat_rate_basis_points,
      'goods_gross_amount_minor', source.customer_price_minor,
      'shipping_region', source.shipping_region,
      'shipping_parcel_class', source.shipping_parcel_class,
      'shipping_gross_amount_minor', source.shipping_gross_amount_minor,
      'currency', source.currency,
      'customer_accepted_at', source.customer_accepted_at,
      'snapshot_recorded_at', source.recorded_at,
      'customer_summary', source.customer_summary
    ),
    clock_timestamp()
  ) returning * into inserted;

  return jsonb_build_object(
    'handoff_id', inserted.handoff_id,
    'snapshot_id', inserted.snapshot_id,
    'status', inserted.status,
    'payment_enabled', inserted.payment_enabled,
    'shopify_write_performed', inserted.shopify_write_performed,
    'checkout_url', inserted.checkout_url,
    'prepared_at', inserted.prepared_at
  );
end;
$$;

-- Atomic customer submission wrapper. Storage objects are uploaded first, but
-- the request row, immutable customer revision, and canonical quarantine rows
-- commit or roll back together. This prevents an unreviewable request if
-- canonical evidence registration fails after request creation.
create or replace function curtainsuk_private.create_staging_review_request_with_evidence(p_request jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  receipt jsonb;
  evidence_security jsonb := coalesce(p_request->'evidence_security', '[]'::jsonb);
begin
  if jsonb_typeof(evidence_security) <> 'array'
     or jsonb_array_length(evidence_security) <> jsonb_array_length(coalesce(p_request->'evidence', '[]'::jsonb)) then
    raise exception 'Canonical evidence does not match the submitted evidence summary';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(evidence_security) secure_item
    where (secure_item->>'request_id')::uuid is distinct from (p_request->>'request_id')::uuid
       or secure_item->>'kind' not in ('PHOTO', 'DRAWING')
       or secure_item->>'object_path' !~* (
         '^' || (p_request->>'request_id')::uuid::text || '/'
         || lower(secure_item->>'kind') || '-'
         || (secure_item->>'evidence_id')::uuid::text
         || case
           when secure_item->>'kind' = 'PHOTO' then '\.(jpg|png|webp|heic|heif)$'
           else '\.(jpg|png|webp|heic|heif|pdf)$'
         end
       )
       or (secure_item->>'retention_expires_at')::timestamptz <= clock_timestamp()
       or (secure_item->>'retention_expires_at')::timestamptz
         > clock_timestamp() + interval '3650 days 5 minutes'
       or not exists (
         select 1
         from jsonb_array_elements(coalesce(p_request->'evidence', '[]'::jsonb)) summary_item
         where summary_item->>'object_path' = secure_item->>'object_path'
           and summary_item->>'kind' = secure_item->>'kind'
           and summary_item->>'file_name' = secure_item->>'file_name'
           and summary_item->>'content_type' = secure_item->>'claimed_content_type'
           and (summary_item->>'size_bytes')::bigint = (secure_item->>'size_bytes')::bigint
       )
  ) or exists (
    select 1
    from jsonb_array_elements(coalesce(p_request->'evidence', '[]'::jsonb)) summary_item
    where not exists (
      select 1
      from jsonb_array_elements(evidence_security) secure_item
      where secure_item->>'object_path' = summary_item->>'object_path'
        and secure_item->>'kind' = summary_item->>'kind'
        and secure_item->>'file_name' = summary_item->>'file_name'
        and secure_item->>'claimed_content_type' = summary_item->>'content_type'
        and (secure_item->>'size_bytes')::bigint = (summary_item->>'size_bytes')::bigint
    )
  ) then
    raise exception 'Canonical evidence identity does not match the submitted evidence summary';
  end if;
  if (p_request->>'window_type_slug') in ('apex-window', 'triangular-window', 'gable-end-window')
     and not exists (
       select 1
       from jsonb_array_elements(evidence_security) secure_item
       where secure_item->>'kind' = 'PHOTO'
     ) then
    raise exception 'Specialist review requires photographic evidence';
  end if;

  perform set_config(
    'curtainsuk.calculated_fabric_metres',
    coalesce(p_request->>'calculated_fabric_metres', ''),
    true
  );
  receipt := curtainsuk_private.create_staging_review_request(p_request - 'evidence_security' - 'calculated_fabric_metres');
  if coalesce((receipt->>'created')::boolean, false) and jsonb_array_length(evidence_security) > 0 then
    perform curtainsuk_private.register_staging_review_evidence(evidence_security);
  end if;
  return receipt;
end;
$$;

-- The immutable snapshot and disabled-payment handoff are one transaction. A
-- transient failure can therefore never strand a snapshot that cannot be
-- retried because of its unique configuration identity.
create or replace function curtainsuk_private.create_staging_checkout_snapshot_and_handoff(
  p_snapshot jsonb,
  p_handoff_id uuid,
  p_prepared_by text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  snapshot_receipt jsonb;
  handoff_receipt jsonb;
begin
  snapshot_receipt := curtainsuk_private.create_staging_configuration_snapshot(p_snapshot);
  handoff_receipt := curtainsuk_private.prepare_staging_checkout_handoff(
    (snapshot_receipt->>'snapshot_id')::uuid,
    p_handoff_id,
    p_prepared_by
  );
  return jsonb_build_object(
    'snapshot_id', snapshot_receipt->>'snapshot_id',
    'configuration_id', snapshot_receipt->>'configuration_id',
    'handoff_id', handoff_receipt->>'handoff_id',
    'status', handoff_receipt->>'status',
    'payment_enabled', false,
    'shopify_write_performed', false,
    'checkout_url', null,
    'prepared_at', handoff_receipt->>'prepared_at'
  );
end;
$$;

-- Private schema defense in depth. There are deliberately no anon/authenticated
-- policies and no public evidence RPCs.
alter table curtainsuk_private.staging_review_evidence enable row level security;
alter table curtainsuk_private.staging_review_evidence force row level security;
alter table curtainsuk_private.staging_review_evidence_access_log enable row level security;
alter table curtainsuk_private.staging_review_evidence_access_log force row level security;
alter table curtainsuk_private.staging_review_request_revisions enable row level security;
alter table curtainsuk_private.staging_review_request_revisions force row level security;
alter table curtainsuk_private.staging_configuration_snapshots enable row level security;
alter table curtainsuk_private.staging_configuration_snapshots force row level security;
alter table curtainsuk_private.staging_checkout_handoffs enable row level security;
alter table curtainsuk_private.staging_checkout_handoffs force row level security;

revoke all on curtainsuk_private.staging_review_evidence,
  curtainsuk_private.staging_review_evidence_access_log,
  curtainsuk_private.staging_review_request_revisions,
  curtainsuk_private.staging_configuration_snapshots,
  curtainsuk_private.staging_checkout_handoffs
from public, anon, authenticated, service_role;

grant select on curtainsuk_private.staging_review_evidence,
  curtainsuk_private.staging_review_evidence_access_log
to service_role;
grant select on curtainsuk_private.staging_review_request_revisions,
  curtainsuk_private.staging_configuration_snapshots,
  curtainsuk_private.staging_checkout_handoffs
to service_role;

revoke execute on function curtainsuk_private.register_staging_review_evidence(jsonb),
  curtainsuk_private.record_staging_review_evidence_access(jsonb),
  curtainsuk_private.record_staging_review_evidence_scan(jsonb),
  curtainsuk_private.request_staging_review_evidence_deletion(uuid, uuid, text),
  curtainsuk_private.complete_staging_review_evidence_deletion(uuid, uuid, text),
  curtainsuk_private.append_staging_review_revision(jsonb),
  curtainsuk_private.create_staging_configuration_snapshot(jsonb),
  curtainsuk_private.prepare_staging_checkout_handoff(uuid, uuid, text),
  curtainsuk_private.create_staging_review_request_with_evidence(jsonb),
  curtainsuk_private.create_staging_checkout_snapshot_and_handoff(jsonb, uuid, text),
  curtainsuk_private.transition_staging_review_request(uuid, text, text, text, text, uuid)
from public, anon, authenticated, service_role;

grant execute on function curtainsuk_private.record_staging_review_evidence_access(jsonb),
  curtainsuk_private.record_staging_review_evidence_scan(jsonb),
  curtainsuk_private.request_staging_review_evidence_deletion(uuid, uuid, text),
  curtainsuk_private.complete_staging_review_evidence_deletion(uuid, uuid, text),
  curtainsuk_private.append_staging_review_revision(jsonb),
  curtainsuk_private.create_staging_review_request_with_evidence(jsonb),
  curtainsuk_private.create_staging_checkout_snapshot_and_handoff(jsonb, uuid, text),
  curtainsuk_private.transition_staging_review_request(uuid, text, text, text, text, uuid)
to service_role;

-- All new submissions must use the atomic wrapper so a request cannot be
-- committed without its canonical evidence and calculated-metre snapshot.
revoke execute on function curtainsuk_private.create_staging_review_request(jsonb)
  from service_role;

notify pgrst, 'reload schema';
