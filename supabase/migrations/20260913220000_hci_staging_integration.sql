-- Staging only: private immutable HCI versions, never accessible to browser roles.
create table curtainsuk_private.hci_staging_versions (
 owner uuid not null, session_id uuid not null, revision integer not null check(revision between 0 and 200),
 request_id uuid not null, request_digest text not null,
 private_state jsonb not null, presentation jsonb not null,
 created_at timestamptz not null default now(),
 primary key(owner,session_id,revision), unique(owner,request_id)
);
alter table curtainsuk_private.hci_staging_versions enable row level security;
revoke all on curtainsuk_private.hci_staging_versions from public,anon,authenticated;
grant select,insert,delete on curtainsuk_private.hci_staging_versions to service_role;
create function curtainsuk_private.hci_staging_read(p_owner uuid,p_session uuid,p_request uuid) returns jsonb
language sql security invoker set search_path='' as $$
 select to_jsonb(v) from curtainsuk_private.hci_staging_versions v
 where owner=p_owner and session_id=p_session and created_at>now()-interval '7 days'
 order by (request_id=p_request) desc,revision desc limit 1;
$$;
create function curtainsuk_private.hci_staging_commit(p_owner uuid,p_session uuid,p_request uuid,p_digest text,p_expected integer,p_state jsonb,p_view jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare prior curtainsuk_private.hci_staging_versions; latest integer;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_owner::text||p_session::text,0));
 select * into prior from curtainsuk_private.hci_staging_versions where owner=p_owner and request_id=p_request;
 if found then
   if prior.session_id<>p_session or prior.request_digest<>p_digest then raise exception 'HCI_SESSION_CONFLICT'; end if;
   return prior.presentation;
 end if;
 select max(revision) into latest from curtainsuk_private.hci_staging_versions where owner=p_owner and session_id=p_session;
 if coalesce(latest,-1)<>p_expected then raise exception 'HCI_SESSION_CONFLICT'; end if;
 if octet_length(p_state::text)>2000000 or octet_length(p_view::text)>32768 then raise exception 'HCI_STATE_LIMIT'; end if;
 if p_state->>'sessionId'<>p_session::text or p_view->>'sessionId'<>p_session::text then raise exception 'HCI_IDENTITY_INVALID'; end if;
 insert into curtainsuk_private.hci_staging_versions(owner,session_id,revision,request_id,request_digest,private_state,presentation)
 values(p_owner,p_session,p_expected+1,p_request,p_digest,p_state,p_view);
 return p_view;
end;
$$;
revoke all on function curtainsuk_private.hci_staging_read(uuid,uuid,uuid) from public,anon,authenticated;
revoke all on function curtainsuk_private.hci_staging_commit(uuid,uuid,uuid,text,integer,jsonb,jsonb) from public,anon,authenticated;
grant execute on function curtainsuk_private.hci_staging_read(uuid,uuid,uuid) to service_role;
grant execute on function curtainsuk_private.hci_staging_commit(uuid,uuid,uuid,text,integer,jsonb,jsonb) to service_role;
