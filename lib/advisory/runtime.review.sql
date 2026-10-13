-- LOCAL REVIEW ONLY. No production migration or Data API exposure authorised.
-- Apply after schema.review.sql in an isolated test database. A reviewed CLI-
-- generated migration and private server credentials are activation prerequisites.
-- Only the trusted backend can call this fixed command interface. Customer JWTs
-- cannot call it or edit accounting/leases. No dynamic SQL or catalogue writes.
create unique index advisory_start_request on advisory.consultations(owner_id, (state->>'startRequest'));
create table advisory.leases (
  owner_id uuid not null, resource text not null check(length(resource)<=100),
  token uuid not null, expires_at timestamptz not null,
  primary key(owner_id, resource)
);
create table advisory.usage_windows (
  owner_id uuid not null, window_start timestamptz not null, kind text not null,
  used integer not null check(used>=0), primary key(owner_id, window_start, kind)
);
create table advisory.evaluation_runs (
  id uuid primary key, enabled boolean not null default false,
  limit_micro bigint not null check(limit_micro between 1 and 5000000),
  used_micro bigint not null default 0 check(used_micro>=0),
  expires_at timestamptz not null
);
create table advisory.spend_reservations (
  id uuid primary key, run_id uuid not null references advisory.evaluation_runs(id),
  owner_id uuid not null, session_id uuid not null,
  reserved_micro bigint not null check(reserved_micro>0), charged_micro bigint not null check(charged_micro>=0),
  settled boolean not null default false, created_at timestamptz not null default now()
);
create index advisory_spend_session on advisory.spend_reservations(run_id,session_id);
alter table advisory.leases enable row level security;
alter table advisory.usage_windows enable row level security;
alter table advisory.evaluation_runs enable row level security;
alter table advisory.spend_reservations enable row level security;
revoke all on advisory.leases, advisory.usage_windows, advisory.evaluation_runs, advisory.spend_reservations from public,anon,authenticated;
grant usage on schema advisory to service_role;
grant select,insert,update,delete on all tables in schema advisory to service_role;
-- The previous review schema demonstrated owner RLS. Cloud operations now go
-- through the backend so clients cannot bypass leases, quotas or saved consent.
revoke all on advisory.consultations from authenticated,anon;

create function advisory.runtime(p_owner uuid,p_action text,p_payload jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
<<vars>>
declare
  result jsonb; row_state jsonb; lease_token uuid; row_count integer; current_revision integer;
  resource_key text; session_id uuid; reservation_id uuid; run_id uuid; held advisory.spend_reservations;
  amount bigint; session_used bigint; count_used integer;
begin
  if p_owner is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>401000 then
    raise exception 'INVALID_INPUT';
  end if;
  if p_action='lease' then
    resource_key:=p_payload->>'resource'; lease_token:=(p_payload->>'token')::uuid;
    insert into advisory.leases values(p_owner,resource_key,lease_token,clock_timestamp()+interval '300 seconds')
    on conflict(owner_id,resource) do update set token=excluded.token,expires_at=excluded.expires_at
      where advisory.leases.expires_at<=clock_timestamp()
    returning token into lease_token;
    if lease_token is null then raise exception 'CONSULTATION_BUSY'; end if;
    return jsonb_build_object('token',lease_token);
  elsif p_action='release' then
    delete from advisory.leases where owner_id=p_owner and resource=p_payload->>'resource' and token=(p_payload->>'token')::uuid;
    return '{}'::jsonb;
  elsif p_action='get' then
    select state into result from advisory.consultations where id=(p_payload->>'id')::uuid and owner_id=p_owner and expires_at>clock_timestamp();
    return result;
  elsif p_action='findStart' then
    select state into result from advisory.consultations where owner_id=p_owner and state->>'startRequest'=p_payload->>'requestId' and expires_at>clock_timestamp();
    return result;
  elsif p_action in ('commit','delete') then
    session_id:=(p_payload->>'id')::uuid;
    resource_key:=case when p_action='commit' and p_payload->'expected'='null'::jsonb then 'owner:'||p_owner::text else session_id::text end;
    -- Lock the lease row within this transaction: an expired worker cannot
    -- commit after a replacement worker acquired a new token (fencing).
    select token into lease_token from advisory.leases where owner_id=p_owner and resource=resource_key
      and token=(p_payload->>'token')::uuid and expires_at>clock_timestamp() for update;
    if lease_token is null then raise exception 'LEASE_LOST'; end if;
    if p_action='delete' then
      delete from advisory.consultations where id=session_id and owner_id=p_owner;
      return jsonb_build_object('deleted',true);
    end if;
    row_state:=p_payload->'state';
    if row_state->>'owner' is distinct from p_owner::text or row_state->>'id' is distinct from session_id::text then raise exception 'UNAUTHORISED'; end if;
    if to_timestamp((row_state->>'expiresAt')::double precision/1000)>clock_timestamp()+interval '91 days' then raise exception 'INVALID_INPUT'; end if;
    if p_payload->'expected'='null'::jsonb then
      select count(*) into count_used from advisory.consultations where owner_id=p_owner and expires_at>clock_timestamp();
      if count_used>=20 then raise exception 'SESSION_LIMIT'; end if;
      if (row_state->>'revision')::integer<>0 then raise exception 'REVISION_CONFLICT'; end if;
      insert into advisory.consultations(id,owner_id,revision,state,expires_at,consent_version)
        values(session_id,p_owner,0,row_state,to_timestamp((row_state->>'expiresAt')::double precision/1000),'advisory-preview-v1');
    else
      current_revision:=(p_payload->>'expected')::integer;
      if (row_state->>'revision')::integer<>current_revision+1 then raise exception 'REVISION_CONFLICT'; end if;
      update advisory.consultations set state=row_state,revision=current_revision+1,expires_at=to_timestamp((row_state->>'expiresAt')::double precision/1000)
        where id=session_id and owner_id=p_owner and revision=current_revision and expires_at>clock_timestamp();
      get diagnostics row_count=row_count;
      if row_count<>1 then raise exception 'REVISION_CONFLICT'; end if;
    end if;
    return '{}'::jsonb;
  elsif p_action='limit' then
    -- Both increments share a transaction. A rejected daily/minute limit rolls
    -- back the entire operation; callers cannot choose or reset these limits.
    insert into advisory.usage_windows values(p_owner,date_trunc('minute',clock_timestamp()),'minute',1)
      on conflict(owner_id,window_start,kind) do update set used=advisory.usage_windows.used+1 returning used into count_used;
    if count_used>12 then raise exception 'RATE_LIMITED'; end if;
    insert into advisory.usage_windows values(p_owner,date_trunc('day',clock_timestamp()),'day',1)
      on conflict(owner_id,window_start,kind) do update set used=advisory.usage_windows.used+1 returning used into count_used;
    if count_used>300 then raise exception 'RATE_LIMITED'; end if;
    return '{}'::jsonb;
  elsif p_action='reserve' then
    run_id:=(p_payload->>'runId')::uuid; session_id:=(p_payload->>'sessionId')::uuid;
    amount:=(p_payload->>'micro')::bigint; reservation_id:=(p_payload->>'id')::uuid;
    if amount is null or amount<=0 or amount>5000000 then raise exception 'INVALID_BUDGET'; end if;
    -- Serialise every reservation in this run before calculating session spend.
    perform 1 from advisory.evaluation_runs where id=run_id and enabled and expires_at>clock_timestamp() for update;
    if not found then raise exception 'BUDGET_EXHAUSTED'; end if;
    select coalesce(sum(r.charged_micro),0) into session_used from advisory.spend_reservations r where r.run_id=vars.run_id and r.session_id=vars.session_id;
    if session_used+amount>1000000 then raise exception 'BUDGET_EXHAUSTED'; end if;
    update advisory.evaluation_runs set used_micro=used_micro+amount where id=run_id and used_micro+amount<=limit_micro;
    if not found then raise exception 'BUDGET_EXHAUSTED'; end if;
    insert into advisory.spend_reservations values(reservation_id,run_id,p_owner,session_id,amount,amount,false,clock_timestamp());
    return jsonb_build_object('id',reservation_id);
  elsif p_action='settle' then
    -- Same lock order as reserve prevents deadlock between concurrent workers.
    select r.run_id into run_id from advisory.spend_reservations r where r.id=(p_payload->>'id')::uuid and r.owner_id=p_owner;
    perform 1 from advisory.evaluation_runs where id=run_id for update;
    select * into held from advisory.spend_reservations r where r.id=(p_payload->>'id')::uuid and r.owner_id=p_owner for update;
    if held.id is null or held.settled then raise exception 'INVALID_BUDGET_RECEIPT'; end if;
    amount:=coalesce((p_payload->>'micro')::bigint,held.reserved_micro);
    if amount<0 then raise exception 'INVALID_BUDGET_RECEIPT'; end if;
    update advisory.evaluation_runs set used_micro=used_micro+amount-held.charged_micro,enabled=enabled and amount<=held.reserved_micro where id=held.run_id;
    update advisory.spend_reservations set charged_micro=amount,settled=true where id=held.id;
    return jsonb_build_object('ceilingExceeded',amount>held.reserved_micro);
  elsif p_action='purgeExpired' then
    -- Bounded cleanup of this principal's advisory records only. No catalogue,
    -- Auth, Naila, pricing, supplier or commerce table is touched.
    delete from advisory.consultations where id in (select id from advisory.consultations where owner_id=p_owner and expires_at<=clock_timestamp() limit 20);
    delete from advisory.leases where owner_id=p_owner and expires_at<=clock_timestamp();
    delete from advisory.usage_windows where owner_id=p_owner and window_start<clock_timestamp()-interval '2 days';
    return '{}'::jsonb;
  else raise exception 'TOOL_NOT_ALLOWED';
  end if;
end $$;
revoke all on function advisory.runtime(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function advisory.runtime(uuid,text,jsonb) to service_role;
