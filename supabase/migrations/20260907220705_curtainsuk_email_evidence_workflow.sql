-- Launch evidence is exchanged in the store mailbox. Only audited statuses live here.
create table curtainsuk_private.staging_review_email_evidence_events (
  event_id uuid primary key default gen_random_uuid(),
  event_number bigint generated always as identity unique,
  request_id uuid not null references curtainsuk_private.staging_review_requests(request_id),
  revision_id uuid not null references curtainsuk_private.staging_review_request_revisions(revision_id),
  evidence_state text not null check (evidence_state in ('EVIDENCE_NOT_RECEIVED','EVIDENCE_RECEIVED','EVIDENCE_REVIEWED')),
  actor_id uuid,
  reason text not null check (length(trim(reason)) between 3 and 2000),
  created_at timestamptz not null default clock_timestamp()
);
create index on curtainsuk_private.staging_review_email_evidence_events(request_id,event_number desc);
alter table curtainsuk_private.staging_review_email_evidence_events enable row level security;
revoke all on curtainsuk_private.staging_review_email_evidence_events from public, anon, authenticated, service_role;
grant select on curtainsuk_private.staging_review_email_evidence_events to service_role;
create function curtainsuk_private.reject_email_evidence_mutation() returns trigger
language plpgsql set search_path = '' as $$ begin raise exception 'Email evidence audit is immutable'; end; $$;
create trigger email_evidence_immutable before update or delete on curtainsuk_private.staging_review_email_evidence_events
for each row execute function curtainsuk_private.reject_email_evidence_mutation();

create function curtainsuk_private.create_staging_email_review_request(p_request jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare receipt jsonb; revision uuid;
begin
  if coalesce(p_request->'evidence','[]'::jsonb) <> '[]'::jsonb or p_request ? 'evidence_security' then
    raise exception 'Launch uploads are disabled';
  end if;
  perform set_config('curtainsuk.calculated_fabric_metres',coalesce(p_request->>'calculated_fabric_metres',''),true);
  receipt := curtainsuk_private.create_staging_review_request((p_request - 'calculated_fabric_metres') || jsonb_build_object('evidence','[]'::jsonb));
  if coalesce((receipt->>'created')::boolean,false) then
    select revision_id into strict revision from curtainsuk_private.staging_review_request_revisions
    where request_id=(receipt->>'request_id')::uuid order by revision_number desc limit 1;
    insert into curtainsuk_private.staging_review_email_evidence_events(request_id,revision_id,evidence_state,reason)
    values ((receipt->>'request_id')::uuid,revision,'EVIDENCE_NOT_RECEIVED','Request created; photos and drawings are handled separately by email');
  end if;
  return receipt;
end; $$;

-- Former upload RPC cannot be reactivated by an environment variable.
create or replace function curtainsuk_private.create_staging_review_request_with_evidence(p_request jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$ begin raise exception 'Launch uploads are disabled'; end; $$;

create function curtainsuk_private.record_staging_email_evidence(
 p_request_id uuid,p_state text,p_revision_id uuid,p_expected_event_id uuid,p_actor_id uuid,p_reason text
) returns void language plpgsql security definer set search_path = '' as $$
declare request_state text; latest_revision uuid; last_event curtainsuk_private.staging_review_email_evidence_events;
begin
  if p_state is null or p_state not in ('EVIDENCE_NOT_RECEIVED','EVIDENCE_RECEIVED','EVIDENCE_REVIEWED')
     or p_actor_id is null or p_reason is null or length(trim(p_reason)) not between 3 and 2000 then
    raise exception 'Invalid email evidence input';
  end if;
  select review_state into request_state from curtainsuk_private.staging_review_requests where request_id=p_request_id for update;
  if request_state is null then raise exception 'Unknown review request'; end if;
  if request_state not in ('PENDING','NEEDS_INFORMATION','UNDER_REVIEW') then raise exception 'Invalid email evidence: reopen the review first'; end if;
  select revision_id into latest_revision from curtainsuk_private.staging_review_request_revisions where request_id=p_request_id order by revision_number desc limit 1;
  select * into last_event from curtainsuk_private.staging_review_email_evidence_events where request_id=p_request_id order by event_number desc limit 1;
  if p_revision_id is distinct from latest_revision or p_expected_event_id is distinct from last_event.event_id then raise exception 'Review changed since it was loaded'; end if;
  if p_state='EVIDENCE_REVIEWED' and (coalesce(last_event.evidence_state,'EVIDENCE_NOT_RECEIVED')='EVIDENCE_NOT_RECEIVED' or request_state <> 'UNDER_REVIEW') then
    raise exception 'Invalid email evidence: record receipt and start staff review first';
  end if;
  if p_state=last_event.evidence_state and p_revision_id=last_event.revision_id then raise exception 'Invalid email evidence: status is unchanged'; end if;
  insert into curtainsuk_private.staging_review_email_evidence_events(request_id,revision_id,evidence_state,actor_id,reason)
  values(p_request_id,p_revision_id,p_state,p_actor_id,trim(p_reason));
end; $$;

revoke all on function curtainsuk_private.create_staging_email_review_request(jsonb), curtainsuk_private.record_staging_email_evidence(uuid,text,uuid,uuid,uuid,text), curtainsuk_private.reject_email_evidence_mutation() from public,anon,authenticated;
grant execute on function curtainsuk_private.create_staging_email_review_request(jsonb), curtainsuk_private.record_staging_email_evidence(uuid,text,uuid,uuid,uuid,text) to service_role;

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
    select * into latest_revision
    from curtainsuk_private.staging_review_request_revisions
    where request_id = old.request_id
    order by revision_number desc
    limit 1;
    if (old.window_type_slug in ('apex-window','triangular-window','gable-end-window','awkward-unusual-window','dormer-window','curved-bow-window','corner-window')
        or latest_revision.specification->>'window_type_slug' in ('apex-window','triangular-window','gable-end-window','awkward-unusual-window','dormer-window','curved-bow-window','corner-window')
        or exists(select 1 from curtainsuk_private.staging_review_email_evidence_events where request_id=old.request_id and actor_id is not null))
       and not exists (
         select 1 from (select * from curtainsuk_private.staging_review_email_evidence_events where request_id=old.request_id order by event_number desc limit 1) email
         where email.evidence_state='EVIDENCE_REVIEWED' and email.revision_id=latest_revision.revision_id
       ) then raise exception 'Email evidence must be reviewed for the current revision before approval'; end if;
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
    ) not in ('STANDARD', 'LARGE', 'OVERSIZE', 'SPECIALIST') then
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
