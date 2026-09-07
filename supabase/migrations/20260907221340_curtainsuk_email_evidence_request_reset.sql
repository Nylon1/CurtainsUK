-- Staff may explicitly request optional evidence from the initial system status.
create or replace function curtainsuk_private.record_staging_email_evidence(
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
  if p_state=last_event.evidence_state and p_revision_id=last_event.revision_id and last_event.actor_id is not null then raise exception 'Invalid email evidence: status is unchanged'; end if;
  insert into curtainsuk_private.staging_review_email_evidence_events(request_id,revision_id,evidence_state,actor_id,reason)
  values(p_request_id,p_revision_id,p_state,p_actor_id,trim(p_reason));
end; $$;
