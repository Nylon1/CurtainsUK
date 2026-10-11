-- OWNER APPROVAL REQUIRED. Existing hqysjumypgeapgmqkcrx project only.
-- No index population, customer rows, LOGIN credentials, membership, cron,
-- API exposure or public activation. All six reviewed parts are atomic.
begin;
set local lock_timeout='500ms';
set local statement_timeout='3s';
do $$begin
 if exists(select 1 from pg_namespace where nspname='advisory') or exists(select 1 from pg_roles where rolname in ('advisory_runtime','advisory_indexer','advisory_retention','advisory_auth_verifier')) then
   raise exception 'ADVISORY_OBJECT_CONFLICT_REVIEW_REQUIRED';
 end if;
 if (select count(*) from information_schema.columns where table_schema='auth' and table_name='sessions' and ((column_name in ('id','user_id') and udt_name='uuid') or (column_name='not_after' and udt_name='timestamptz')))<>3 then
   raise exception 'AUTH_SCHEMA_PREFLIGHT_REQUIRED';
 end if;
end $$;

-- BEGIN lib/advisory/schema.review.sql
-- REVIEW DESIGN ONLY. Never applied to production. Local PostgreSQL tests only.
-- Authenticated caller is a verified Supabase JWT, not an owner supplied by UI.
-- No service-role grants, anon access, catalogue writes or existing-table edits.
create schema advisory;
revoke all on schema advisory from public;
grant usage on schema advisory to authenticated;
create table advisory.consultations (
  id uuid primary key,
  owner_id uuid not null,
  revision integer not null check (revision >= 0),
  state jsonb not null check ((
    jsonb_typeof(state) = 'object' and octet_length(state::text) <= 400000
    and state ?& array['id','owner','revision','saved','expiresAt']
    and state->>'id' = id::text and state->>'owner' = owner_id::text
    and (state->>'revision')::integer = revision and state->'saved' = 'true'::jsonb
  ) is true),
  consent_version text not null check (consent_version = 'advisory-preview-v1'),
  expires_at timestamptz not null check ((expires_at = to_timestamp((state->>'expiresAt')::double precision / 1000)) is true),
  created_at timestamptz not null default now()
);
create index advisory_consultations_owner_expiry on advisory.consultations(owner_id, expires_at);
alter table advisory.consultations enable row level security;
alter table advisory.consultations force row level security;
revoke all on advisory.consultations from public;
grant select, insert, update, delete on advisory.consultations to authenticated;
create policy consultation_read on advisory.consultations for select to authenticated
  using (owner_id = (select auth.uid()) and expires_at > now());
create policy consultation_create on advisory.consultations for insert to authenticated
  with check (owner_id = (select auth.uid()) and expires_at > now() and expires_at <= now() + interval '91 days');
create policy consultation_update on advisory.consultations for update to authenticated
  using (owner_id = (select auth.uid()) and expires_at > now())
  with check (owner_id = (select auth.uid()) and expires_at > now() and expires_at <= now() + interval '91 days');
create policy consultation_delete on advisory.consultations for delete to authenticated
  using (owner_id = (select auth.uid()));
-- Before cloud activation: reviewed migration via Supabase CLI, distributed
-- session lease/idempotency, authenticated recovery, expiry worker, private
-- API schema exposure decision, and encrypted backup/deletion procedures.
-- END lib/advisory/schema.review.sql

-- BEGIN lib/advisory/runtime.review.sql
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
-- END lib/advisory/runtime.review.sql

-- BEGIN lib/advisory/search.review.sql
-- LOCAL REVIEW ONLY. Small derived index, not a duplicate product catalogue.
-- No production DDL, refresh triggers, bulk backfill or supplier changes run.
create table advisory.knowledge_search (
  fabric_id text primary key check(fabric_id ~ '^[A-Za-z0-9][A-Za-z0-9-]{0,149}$'),
  document tsvector not null,
  colour tsvector not null, pattern tsvector not null,
  texture tsvector not null, composition tsvector not null,
  source_hash text not null, indexed_at timestamptz not null default now()
);
create index advisory_knowledge_terms on advisory.knowledge_search using gin(document);
create index advisory_knowledge_colour on advisory.knowledge_search using gin(colour);
create index advisory_knowledge_pattern on advisory.knowledge_search using gin(pattern);
create index advisory_knowledge_texture on advisory.knowledge_search using gin(texture);
create index advisory_knowledge_composition on advisory.knowledge_search using gin(composition);
alter table advisory.knowledge_search enable row level security;
revoke all on advisory.knowledge_search from public,anon,authenticated;
grant select,insert,update,delete on advisory.knowledge_search to service_role;
-- No raw descriptions/images/prices/costs/eligibility stored in this index.
-- Retrieved identities must be rehydrated and retail eligibility revalidated.
create function advisory.search_knowledge(p_query text,p_colour text,p_pattern text,p_texture text,p_composition text)
returns table(fabric_id text) language plpgsql stable security invoker
set search_path='' set statement_timeout='2s' as $$
begin
  if p_query is null or length(trim(p_query))<2 or length(p_query)>100
    or p_colour is null or length(p_colour)>50 or p_pattern is null or length(p_pattern)>50
    or p_texture is null or length(p_texture)>50 or p_composition is null or length(p_composition)>50 then raise exception 'INVALID_INPUT'; end if;
  return query select k.fabric_id from advisory.knowledge_search k
    where k.document @@ websearch_to_tsquery('english',p_query)
      and (p_colour='' or k.colour @@ websearch_to_tsquery('english',p_colour))
      and (p_pattern='' or k.pattern @@ websearch_to_tsquery('english',p_pattern))
      and (p_texture='' or k.texture @@ websearch_to_tsquery('english',p_texture))
      and (p_composition='' or k.composition @@ websearch_to_tsquery('english',p_composition))
    order by k.fabric_id limit 6;
end $$;
revoke all on function advisory.search_knowledge(text,text,text,text,text) from public,anon,authenticated;
grant execute on function advisory.search_knowledge(text,text,text,text,text) to service_role;
-- END lib/advisory/search.review.sql

-- BEGIN lib/advisory/index-worker.review.sql
-- Isolated test/review DDL only; never executed against production.
create table advisory.index_jobs (
 id uuid primary key, source_snapshot text not null check(length(source_snapshot) between 1 and 256), expected_count integer check(expected_count>=0),
 cursor jsonb check(octet_length(cursor::text)<=2048), processed integer not null default 0, indexed integer not null default 0,
 complete boolean not null default false, batches integer not null default 0,
 status text not null default 'ready' check(status in ('ready','exhausted','rolling_back','rolled_back')),
 failures integer not null default 0, last_error text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table advisory.index_jobs enable row level security;
revoke all on advisory.index_jobs from public,anon,authenticated;
grant select,insert,update on advisory.index_jobs to service_role;
-- Per-job identity receipts prevent duplicate pages inflating coverage counts.
create table advisory.index_job_items (
 job_id uuid not null references advisory.index_jobs(id) on delete cascade,
 fabric_id text not null, before_row jsonb, after_hash text not null,
 fields jsonb not null default '{}', rolled_back boolean not null default false,
 write_sequence bigint generated always as identity,
 primary key(job_id,fabric_id)
);
alter table advisory.index_job_items enable row level security;
revoke all on advisory.index_job_items from public,anon,authenticated;
grant select,insert,update on advisory.index_job_items to service_role;
-- One I/O gate across every indexing job. No network inside transactions.
create table advisory.index_gate (
 id integer primary key check(id=1), token uuid, lease_until timestamptz,
 next_at timestamptz not null default '-infinity'
);
insert into advisory.index_gate(id) values(1);
alter table advisory.index_gate enable row level security;
revoke all on advisory.index_gate from public,anon,authenticated;
grant select,update on advisory.index_gate to service_role;
-- END lib/advisory/index-worker.review.sql

-- BEGIN lib/advisory/operations.review.sql
-- REVIEW ONLY, final advisory-storage grants. Existing project, advisory schema only.
-- No LOGIN passwords, memberships, Auth changes, schedules or API exposure.
create role advisory_runtime nologin noinherit;
create role advisory_indexer nologin noinherit;
create role advisory_retention nologin noinherit;
revoke all on schema advisory from public,anon,authenticated,service_role;
revoke all on all tables in schema advisory from public,anon,authenticated,service_role;
revoke all on all functions in schema advisory from public,anon,authenticated,service_role;
grant usage on schema advisory to advisory_runtime,advisory_indexer,advisory_retention;
grant select,insert,update,delete on advisory.consultations,advisory.leases,advisory.usage_windows,advisory.spend_reservations to advisory_runtime;
grant select,update on advisory.evaluation_runs to advisory_runtime;
grant execute on function advisory.runtime(uuid,text,jsonb) to advisory_runtime;
create policy advisory_runtime_consultations on advisory.consultations to advisory_runtime
 using(owner_id=nullif(current_setting('advisory.owner',true),'')::uuid)
 with check(owner_id=nullif(current_setting('advisory.owner',true),'')::uuid);
create policy advisory_runtime_leases on advisory.leases to advisory_runtime
 using(owner_id=nullif(current_setting('advisory.owner',true),'')::uuid)
 with check(owner_id=nullif(current_setting('advisory.owner',true),'')::uuid);
create policy advisory_runtime_windows on advisory.usage_windows to advisory_runtime
 using(owner_id=nullif(current_setting('advisory.owner',true),'')::uuid)
 with check(owner_id=nullif(current_setting('advisory.owner',true),'')::uuid);
create policy advisory_runtime_spend on advisory.spend_reservations to advisory_runtime
 using(owner_id=nullif(current_setting('advisory.owner',true),'')::uuid)
 with check(owner_id=nullif(current_setting('advisory.owner',true),'')::uuid);
-- Shared run accounting must be locked across owners. Only trusted backend has
-- this role; the HTTP boundary cannot choose owner, SQL or spend values.
create policy advisory_runtime_runs on advisory.evaluation_runs to advisory_runtime using(true) with check(true);
grant select on advisory.knowledge_search to advisory_runtime;
create policy advisory_runtime_knowledge on advisory.knowledge_search for select to advisory_runtime using(true);
grant execute on function advisory.search_knowledge(text,text,text,text,text) to advisory_runtime;
grant select,insert,update,delete on advisory.knowledge_search to advisory_indexer;
grant select,insert,update on advisory.index_jobs,advisory.index_job_items to advisory_indexer;
grant select,update on advisory.index_gate to advisory_indexer;
grant usage on sequence advisory.index_job_items_write_sequence_seq to advisory_indexer;
create policy advisory_index_knowledge on advisory.knowledge_search to advisory_indexer using(true) with check(true);
create policy advisory_index_jobs on advisory.index_jobs to advisory_indexer using(true) with check(true);
create policy advisory_index_items on advisory.index_job_items to advisory_indexer using(true) with check(true);
create policy advisory_index_gate on advisory.index_gate to advisory_indexer using(true) with check(true);
-- Retention is separate from customer requests and never depends on a return
-- visit. One invocation deletes at most 20 rows from each table. No scheduler.
create index advisory_retention_sessions on advisory.consultations(expires_at);
create index advisory_retention_leases on advisory.leases(expires_at);
create index advisory_retention_windows on advisory.usage_windows(window_start);
create index advisory_retention_spend on advisory.spend_reservations(created_at);
grant select,delete on advisory.consultations,advisory.leases,advisory.usage_windows,advisory.spend_reservations to advisory_retention;
grant select on advisory.evaluation_runs to advisory_retention;
-- PostgreSQL requires UPDATE on at least one column for FOR UPDATE SKIP LOCKED.
-- Limit it to expiry fields; RLS rejects moving expired records into the future.
grant update(expires_at) on advisory.consultations,advisory.leases to advisory_retention;
grant update(window_start) on advisory.usage_windows to advisory_retention;
grant update(created_at) on advisory.spend_reservations to advisory_retention;
create policy advisory_retention_sessions on advisory.consultations to advisory_retention using(expires_at<clock_timestamp());
create policy advisory_retention_leases on advisory.leases to advisory_retention using(expires_at<clock_timestamp());
create policy advisory_retention_windows on advisory.usage_windows to advisory_retention using(window_start<clock_timestamp()-interval '2 days');
create policy advisory_retention_spend on advisory.spend_reservations to advisory_retention using(created_at<clock_timestamp()-interval '90 days');
create policy advisory_retention_runs on advisory.evaluation_runs for select to advisory_retention using(expires_at<clock_timestamp());
create function advisory.purge_expired() returns jsonb language plpgsql security invoker
set search_path='' set statement_timeout='3s' as $$
declare sessions integer; leases integer; windows integer; receipts integer;
begin
 delete from advisory.consultations where id in (select id from advisory.consultations where expires_at<clock_timestamp() order by expires_at limit 20 for update skip locked);
 get diagnostics sessions=row_count;
 delete from advisory.leases where (owner_id,resource) in (select owner_id,resource from advisory.leases where expires_at<clock_timestamp() order by expires_at limit 20 for update skip locked);
 get diagnostics leases=row_count;
 delete from advisory.usage_windows where (owner_id,window_start,kind) in (select owner_id,window_start,kind from advisory.usage_windows where window_start<clock_timestamp()-interval '2 days' order by window_start limit 20 for update skip locked);
 get diagnostics windows=row_count;
 -- Unsettled crash receipts are already charged at their reserved ceiling.
 -- Removing identifying receipts never reduces the retained aggregate spend.
 delete from advisory.spend_reservations where id in (select id from advisory.spend_reservations where created_at<clock_timestamp()-interval '90 days' and run_id in (select id from advisory.evaluation_runs where expires_at<clock_timestamp()) order by created_at limit 20 for update skip locked);
 get diagnostics receipts=row_count;
 return jsonb_build_object('sessions',sessions,'leases',leases,'windows',windows,'receipts',receipts);
end $$;
revoke all on function advisory.purge_expired() from public,anon,authenticated,service_role;
grant execute on function advisory.purge_expired() to advisory_retention;
-- END lib/advisory/operations.review.sql

-- BEGIN lib/advisory/auth-session.review.sql
-- REVIEW ONLY. Explicit additional read grant, separate from advisory storage.
-- Validate these existing Auth columns before migration approval. Never writes
-- to Auth, changes its policies, creates customers or exposes Auth to browsers.
create role advisory_auth_verifier nologin noinherit;
grant usage on schema auth to advisory_auth_verifier;
grant select(id,user_id,not_after) on auth.sessions to advisory_auth_verifier;
-- Rollback only these new privileges/role after disabling its server credential.
-- Do not revoke any pre-existing application's Auth access.
-- END lib/advisory/auth-session.review.sql

-- Final defence against deployment-specific default grants on new sequences.
revoke all on all sequences in schema advisory from public,anon,authenticated,service_role;
commit;
