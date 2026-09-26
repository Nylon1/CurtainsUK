-- Durable, private orchestration state for Prestigious Textiles ingestion.
-- It records stage ownership only; existing governed import, media, commercial,
-- visual, knowledge, cache and browse workers remain the sole data writers.

begin;

create table curtainsuk_private.pt_ingestion_runs (
  run_id uuid primary key default gen_random_uuid(),
  batch_label text not null check(length(trim(batch_label)) between 1 and 160),
  manifest_sha256 text not null check(manifest_sha256 ~ '^[a-f0-9]{64}$'),
  source_bundle_sha256 text not null check(source_bundle_sha256 ~ '^[a-f0-9]{64}$'),
  requested_count integer not null check(requested_count between 1 and 10000),
  status text not null default 'RUNNING' check(status in ('RUNNING','PAUSED','COMPLETED','STOPPED_SYSTEMIC')),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  completed_at timestamptz,
  summary jsonb not null default '{}'::jsonb
);

create table curtainsuk_private.pt_ingestion_items (
  item_id uuid primary key default gen_random_uuid(),
  run_id uuid not null references curtainsuk_private.pt_ingestion_runs(run_id),
  supplier_id text not null default 'prestigious-textiles' check(supplier_id='prestigious-textiles'),
  supplier_sku text not null check(length(trim(supplier_sku)) between 1 and 100),
  fabric_id text,
  current_stage text not null default 'SOURCE_READY' check(current_stage in (
    'SOURCE_READY','MEDIA_READY','PRICE_APPROVED','KNOWLEDGE_READY','STOCK_READY','RELEASE_READY','RELEASED','EXCEPTION'
  )),
  work_state text not null default 'READY' check(work_state in ('READY','CLAIMED','RELEASED','EXCEPTION')),
  claim_token uuid,
  worker_id text,
  started_at timestamptz,
  heartbeat_at timestamptz,
  retry_count integer not null default 0 check(retry_count between 0 and 20),
  next_attempt_at timestamptz not null default clock_timestamp(),
  input_fingerprints jsonb not null default '{}'::jsonb,
  committed_fingerprints jsonb not null default '{}'::jsonb,
  committed_results jsonb not null default '{}'::jsonb,
  last_failure_code text check(last_failure_code is null or last_failure_code ~ '^[A-Z0-9_]{1,80}$'),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  unique(run_id,supplier_sku),
  check((work_state='CLAIMED') = (claim_token is not null and worker_id is not null and started_at is not null and heartbeat_at is not null)),
  check((current_stage='RELEASED') = (work_state='RELEASED')),
  check((current_stage='EXCEPTION') = (work_state='EXCEPTION'))
);
create index pt_ingestion_items_claimable on curtainsuk_private.pt_ingestion_items(run_id,current_stage,work_state,next_attempt_at,created_at);
create index pt_ingestion_items_heartbeat on curtainsuk_private.pt_ingestion_items(run_id,heartbeat_at) where work_state='CLAIMED';

create table curtainsuk_private.pt_ingestion_attempts (
  attempt_id uuid primary key default gen_random_uuid(),
  item_id uuid not null references curtainsuk_private.pt_ingestion_items(item_id),
  stage text not null check(stage in ('SOURCE_READY','MEDIA_READY','PRICE_APPROVED','KNOWLEDGE_READY','STOCK_READY','RELEASE_READY')),
  event text not null check(event in ('CLAIMED','HEARTBEAT','COMMITTED','RETRY_SCHEDULED','STALE_CLAIM_RELEASED','EXCEPTION')),
  claim_token uuid,
  worker_id text,
  retry_count integer not null check(retry_count between 0 and 20),
  detail jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default clock_timestamp()
);
create index pt_ingestion_attempts_item on curtainsuk_private.pt_ingestion_attempts(item_id,occurred_at);

alter table curtainsuk_private.pt_ingestion_runs enable row level security;
alter table curtainsuk_private.pt_ingestion_items enable row level security;
alter table curtainsuk_private.pt_ingestion_attempts enable row level security;
revoke all on curtainsuk_private.pt_ingestion_runs,curtainsuk_private.pt_ingestion_items,curtainsuk_private.pt_ingestion_attempts from public,anon,authenticated;
grant select,insert,update on curtainsuk_private.pt_ingestion_runs,curtainsuk_private.pt_ingestion_items to service_role;
grant select,insert on curtainsuk_private.pt_ingestion_attempts to service_role;

create trigger pt_ingestion_attempts_append_only
before update or delete on curtainsuk_private.pt_ingestion_attempts
for each row execute function curtainsuk_private.reject_curtainsuk_immutable_mutation();

create or replace function curtainsuk_private.pt_ingestion_next_stage(p_stage text)
returns text language sql immutable security invoker set search_path='' as $$
  select case p_stage
    when 'SOURCE_READY' then 'MEDIA_READY'
    when 'MEDIA_READY' then 'PRICE_APPROVED'
    when 'PRICE_APPROVED' then 'KNOWLEDGE_READY'
    when 'KNOWLEDGE_READY' then 'STOCK_READY'
    when 'STOCK_READY' then 'RELEASE_READY'
    when 'RELEASE_READY' then 'RELEASED'
    else null end
$$;

create or replace function curtainsuk_private.claim_pt_ingestion_items(
  p_run_id uuid,
  p_stage text,
  p_worker_id text,
  p_limit integer default 50,
  p_lease_seconds integer default 180
) returns table(item_id uuid, supplier_sku text, fabric_id text, claim_token uuid, retry_count integer, input_fingerprints jsonb)
language plpgsql security invoker set search_path='' as $$
declare
  v_limit integer;
begin
  if p_stage not in ('SOURCE_READY','MEDIA_READY','PRICE_APPROVED','KNOWLEDGE_READY','STOCK_READY','RELEASE_READY')
     or length(trim(coalesce(p_worker_id,'')))=0 or p_limit < 1 or p_limit > 1000
     or (p_stage='STOCK_READY' and p_limit > 100)
     or p_lease_seconds < 15 or p_lease_seconds > 900 then
    raise exception 'PT_INGESTION_CLAIM_ARGUMENT_INVALID';
  end if;
  if p_stage='PRICE_APPROVED' then
    perform pg_advisory_xact_lock(4252026, 20260926);
    v_limit:=1;
  else v_limit:=p_limit;
  end if;
  if not exists(select 1 from curtainsuk_private.pt_ingestion_runs where run_id=p_run_id and status='RUNNING') then
    raise exception 'PT_INGESTION_RUN_NOT_RUNNING';
  end if;

  -- Reclaim stale leases before selecting new work. Exhausted leases become
  -- exceptions; they can never remain claimed indefinitely.
  with stale_retry as (
    update curtainsuk_private.pt_ingestion_items
    set work_state='READY', claim_token=null, worker_id=null, started_at=null, heartbeat_at=null,
        retry_count=retry_count+1, next_attempt_at=clock_timestamp(), last_failure_code='CLAIM_HEARTBEAT_EXPIRED', updated_at=clock_timestamp()
    where run_id=p_run_id and current_stage=p_stage and work_state='CLAIMED'
      and heartbeat_at < clock_timestamp() - make_interval(secs=>p_lease_seconds)
      and retry_count < 20
    returning item_id,retry_count
  )
  insert into curtainsuk_private.pt_ingestion_attempts(item_id,stage,event,retry_count,detail)
  select item_id,p_stage,'STALE_CLAIM_RELEASED',retry_count,jsonb_build_object('lease_seconds',p_lease_seconds) from stale_retry;

  with stale_exhausted as (
    update curtainsuk_private.pt_ingestion_items
    set current_stage='EXCEPTION',work_state='EXCEPTION',claim_token=null,worker_id=null,started_at=null,heartbeat_at=null,
        last_failure_code='CLAIM_RETRY_EXHAUSTED',updated_at=clock_timestamp(),
        committed_results=jsonb_set(committed_results,array['exception'],jsonb_build_object('from_stage',p_stage,'failure_code','CLAIM_RETRY_EXHAUSTED','detail',jsonb_build_object('lease_seconds',p_lease_seconds)),true)
    where run_id=p_run_id and current_stage=p_stage and work_state='CLAIMED'
      and heartbeat_at < clock_timestamp() - make_interval(secs=>p_lease_seconds)
      and retry_count >= 20
    returning item_id,retry_count
  )
  insert into curtainsuk_private.pt_ingestion_attempts(item_id,stage,event,retry_count,detail)
  select item_id,p_stage,'EXCEPTION',retry_count,jsonb_build_object('failure_code','CLAIM_RETRY_EXHAUSTED','lease_seconds',p_lease_seconds) from stale_exhausted;

  return query
  with candidates as (
    select i.item_id
    from curtainsuk_private.pt_ingestion_items i
    where i.run_id=p_run_id and i.current_stage=p_stage and i.work_state='READY'
      and i.next_attempt_at <= clock_timestamp() and i.retry_count < 20
      and (p_stage<>'PRICE_APPROVED' or not exists (
        select 1 from curtainsuk_private.pt_ingestion_items active
        where active.run_id=p_run_id and active.current_stage='PRICE_APPROVED' and active.work_state='CLAIMED'
      ))
    order by i.created_at,i.supplier_sku
    limit v_limit for update skip locked
  ), claimed as (
    update curtainsuk_private.pt_ingestion_items i
    set work_state='CLAIMED',claim_token=gen_random_uuid(),worker_id=left(p_worker_id,160),started_at=clock_timestamp(),heartbeat_at=clock_timestamp(),updated_at=clock_timestamp(),last_failure_code=null
    from candidates c where i.item_id=c.item_id
    returning i.item_id,i.supplier_sku,i.fabric_id,i.claim_token,i.retry_count,i.input_fingerprints
  ), claim_log as (
    insert into curtainsuk_private.pt_ingestion_attempts(item_id,stage,event,claim_token,worker_id,retry_count)
    select item_id,p_stage,'CLAIMED',claim_token,left(p_worker_id,160),retry_count from claimed
  )
  select * from claimed;
end $$;

create or replace function curtainsuk_private.heartbeat_pt_ingestion_item(
  p_item_id uuid,p_stage text,p_claim_token uuid,p_worker_id text
) returns boolean language plpgsql security invoker set search_path='' as $$
declare v_retry integer;
begin
  update curtainsuk_private.pt_ingestion_items
  set heartbeat_at=clock_timestamp(),updated_at=clock_timestamp()
  where item_id=p_item_id and current_stage=p_stage and work_state='CLAIMED'
    and claim_token=p_claim_token and worker_id=p_worker_id
  returning retry_count into v_retry;
  if not found then return false; end if;
  insert into curtainsuk_private.pt_ingestion_attempts(item_id,stage,event,claim_token,worker_id,retry_count)
  values(p_item_id,p_stage,'HEARTBEAT',p_claim_token,p_worker_id,v_retry);
  return true;
end $$;

create or replace function curtainsuk_private.commit_pt_ingestion_stage(
  p_item_id uuid,p_stage text,p_claim_token uuid,p_worker_id text,p_input_sha256 text,p_result jsonb default '{}'::jsonb
) returns text language plpgsql security invoker set search_path='' as $$
declare v_next text; v_retry integer;
begin
  if p_input_sha256 !~ '^[a-f0-9]{64}$' or jsonb_typeof(p_result) <> 'object' then raise exception 'PT_INGESTION_COMMIT_ARGUMENT_INVALID'; end if;
  v_next:=curtainsuk_private.pt_ingestion_next_stage(p_stage);
  if v_next is null then raise exception 'PT_INGESTION_STAGE_INVALID'; end if;
  update curtainsuk_private.pt_ingestion_items
  set current_stage=v_next,
      work_state=case when v_next='RELEASED' then 'RELEASED' else 'READY' end,
      claim_token=null,worker_id=null,started_at=null,heartbeat_at=null,next_attempt_at=clock_timestamp(),
      committed_fingerprints=jsonb_set(committed_fingerprints,array[p_stage],to_jsonb(p_input_sha256),true),
      committed_results=jsonb_set(committed_results,array[p_stage],p_result,true),updated_at=clock_timestamp(),last_failure_code=null
  where item_id=p_item_id and current_stage=p_stage and work_state='CLAIMED'
    and claim_token=p_claim_token and worker_id=p_worker_id
  returning retry_count into v_retry;
  if not found then raise exception 'PT_INGESTION_CLAIM_LOST'; end if;
  insert into curtainsuk_private.pt_ingestion_attempts(item_id,stage,event,claim_token,worker_id,retry_count,detail)
  values(p_item_id,p_stage,'COMMITTED',p_claim_token,p_worker_id,v_retry,jsonb_build_object('input_sha256',p_input_sha256,'result',p_result));
  return v_next;
end $$;

create or replace function curtainsuk_private.retry_pt_ingestion_item(
  p_item_id uuid,p_stage text,p_claim_token uuid,p_worker_id text,p_failure_code text,p_backoff_seconds integer default 30
) returns boolean language plpgsql security invoker set search_path='' as $$
declare v_retry integer;
begin
  if p_failure_code !~ '^[A-Z0-9_]{1,80}$' or p_backoff_seconds < 0 or p_backoff_seconds > 3600 then raise exception 'PT_INGESTION_RETRY_ARGUMENT_INVALID'; end if;
  update curtainsuk_private.pt_ingestion_items
  set work_state='READY',claim_token=null,worker_id=null,started_at=null,heartbeat_at=null,retry_count=retry_count+1,
      next_attempt_at=clock_timestamp()+make_interval(secs=>p_backoff_seconds),last_failure_code=p_failure_code,updated_at=clock_timestamp()
  where item_id=p_item_id and current_stage=p_stage and work_state='CLAIMED' and claim_token=p_claim_token and worker_id=p_worker_id and retry_count<20
  returning retry_count into v_retry;
  if not found then return false; end if;
  insert into curtainsuk_private.pt_ingestion_attempts(item_id,stage,event,claim_token,worker_id,retry_count,detail)
  values(p_item_id,p_stage,'RETRY_SCHEDULED',p_claim_token,p_worker_id,v_retry,jsonb_build_object('failure_code',p_failure_code,'backoff_seconds',p_backoff_seconds));
  return true;
end $$;

create or replace function curtainsuk_private.exception_pt_ingestion_item(
  p_item_id uuid,p_stage text,p_claim_token uuid,p_worker_id text,p_failure_code text,p_detail jsonb default '{}'::jsonb
) returns boolean language plpgsql security invoker set search_path='' as $$
declare v_retry integer;
begin
  if p_failure_code !~ '^[A-Z0-9_]{1,80}$' or jsonb_typeof(p_detail)<>'object' then raise exception 'PT_INGESTION_EXCEPTION_ARGUMENT_INVALID'; end if;
  update curtainsuk_private.pt_ingestion_items
  set current_stage='EXCEPTION',work_state='EXCEPTION',claim_token=null,worker_id=null,started_at=null,heartbeat_at=null,last_failure_code=p_failure_code,updated_at=clock_timestamp(),
      committed_results=jsonb_set(committed_results,array['exception'],jsonb_build_object('from_stage',p_stage,'failure_code',p_failure_code,'detail',p_detail),true)
  where item_id=p_item_id and current_stage=p_stage and work_state='CLAIMED' and claim_token=p_claim_token and worker_id=p_worker_id
  returning retry_count into v_retry;
  if not found then return false; end if;
  insert into curtainsuk_private.pt_ingestion_attempts(item_id,stage,event,claim_token,worker_id,retry_count,detail)
  values(p_item_id,p_stage,'EXCEPTION',p_claim_token,p_worker_id,v_retry,jsonb_build_object('failure_code',p_failure_code,'detail',p_detail));
  return true;
end $$;

-- Requeue is deliberately explicit: identical committed governed input is a no-op;
-- a changed input restarts from that stage and retains the immutable attempt history.
create or replace function curtainsuk_private.requeue_pt_ingestion_item(
  p_item_id uuid,p_stage text,p_input_sha256 text,p_fabric_id text default null
) returns boolean language plpgsql security invoker set search_path='' as $$
declare v_existing text;
begin
  if p_stage not in ('SOURCE_READY','MEDIA_READY','PRICE_APPROVED','KNOWLEDGE_READY','STOCK_READY','RELEASE_READY') or p_input_sha256 !~ '^[a-f0-9]{64}$' then raise exception 'PT_INGESTION_REQUEUE_ARGUMENT_INVALID'; end if;
  select committed_fingerprints->>p_stage into v_existing from curtainsuk_private.pt_ingestion_items where item_id=p_item_id for update;
  if not found then raise exception 'PT_INGESTION_ITEM_NOT_FOUND'; end if;
  if v_existing=p_input_sha256 then return false; end if;
  update curtainsuk_private.pt_ingestion_items
  set current_stage=p_stage,work_state='READY',claim_token=null,worker_id=null,started_at=null,heartbeat_at=null,next_attempt_at=clock_timestamp(),
      input_fingerprints=jsonb_set(input_fingerprints,array[p_stage],to_jsonb(p_input_sha256),true),
      fabric_id=coalesce(p_fabric_id,fabric_id),last_failure_code=null,updated_at=clock_timestamp()
  where item_id=p_item_id;
  return true;
end $$;


create or replace function curtainsuk_private.start_pt_ingestion_run(
  p_batch_label text,p_manifest_sha256 text,p_source_bundle_sha256 text,p_items jsonb
) returns uuid language plpgsql security invoker set search_path='' as $$
declare v_run_id uuid; v_count integer;
begin
  if length(trim(coalesce(p_batch_label,'')))=0 or p_manifest_sha256 !~ '^[a-f0-9]{64}$' or p_source_bundle_sha256 !~ '^[a-f0-9]{64}$' or jsonb_typeof(p_items)<>'array' then
    raise exception 'PT_INGESTION_RUN_ARGUMENT_INVALID';
  end if;
  select count(*) into v_count from jsonb_array_elements(p_items);
  if v_count < 1 or v_count > 10000 or v_count<>(select count(distinct item->>'supplier_sku') from jsonb_array_elements(p_items) item)
    or exists(select 1 from jsonb_array_elements(p_items) item where
      coalesce(item->>'supplier_sku','') !~ '^[A-Za-z0-9/_ -]{1,100}$'
      or jsonb_typeof(coalesce(item->'input_fingerprints','{}'::jsonb))<>'object'
      or jsonb_typeof(coalesce(item->'committed_fingerprints','{}'::jsonb))<>'object'
      or jsonb_typeof(coalesce(item->'committed_results','{}'::jsonb))<>'object'
      or case when jsonb_typeof(coalesce(item->'committed_fingerprints','{}'::jsonb))='object' then exists(
        select 1 from jsonb_each_text(coalesce(item->'committed_fingerprints','{}'::jsonb)) fingerprint
        where fingerprint.key not in ('SOURCE_READY','MEDIA_READY','PRICE_APPROVED','KNOWLEDGE_READY','STOCK_READY','RELEASE_READY') or fingerprint.value !~ '^[a-f0-9]{64}$'
      ) else false end
      or coalesce(item->>'initial_stage','SOURCE_READY') not in ('SOURCE_READY','MEDIA_READY','PRICE_APPROVED','KNOWLEDGE_READY','STOCK_READY','RELEASE_READY','RELEASED','EXCEPTION')
      or (coalesce(item->>'initial_stage','SOURCE_READY')='MEDIA_READY' and not (coalesce(item->'committed_fingerprints','{}'::jsonb) ? 'SOURCE_READY'))
      or (coalesce(item->>'initial_stage','SOURCE_READY')='PRICE_APPROVED' and not (coalesce(item->'committed_fingerprints','{}'::jsonb) ?& array['SOURCE_READY','MEDIA_READY']))
      or (coalesce(item->>'initial_stage','SOURCE_READY')='KNOWLEDGE_READY' and not (coalesce(item->'committed_fingerprints','{}'::jsonb) ?& array['SOURCE_READY','MEDIA_READY','PRICE_APPROVED']))
      or (coalesce(item->>'initial_stage','SOURCE_READY')='STOCK_READY' and not (coalesce(item->'committed_fingerprints','{}'::jsonb) ?& array['SOURCE_READY','MEDIA_READY','PRICE_APPROVED','KNOWLEDGE_READY']))
      or (coalesce(item->>'initial_stage','SOURCE_READY')='RELEASE_READY' and not (coalesce(item->'committed_fingerprints','{}'::jsonb) ?& array['SOURCE_READY','MEDIA_READY','PRICE_APPROVED','KNOWLEDGE_READY','STOCK_READY']))
      or (coalesce(item->>'initial_stage','SOURCE_READY')='RELEASED' and not (coalesce(item->'committed_fingerprints','{}'::jsonb) ?& array['SOURCE_READY','MEDIA_READY','PRICE_APPROVED','KNOWLEDGE_READY','STOCK_READY','RELEASE_READY']))
      or (coalesce(item->>'initial_stage','SOURCE_READY')='EXCEPTION' and (coalesce(item->>'exception_code','') !~ '^[A-Z0-9_]{1,80}$' or jsonb_typeof(coalesce(item->'committed_results'->'exception','null'::jsonb))<>'object'))
    ) then
    raise exception 'PT_INGESTION_RUN_ITEMS_INVALID';
  end if;
  insert into curtainsuk_private.pt_ingestion_runs(batch_label,manifest_sha256,source_bundle_sha256,requested_count)
  values(left(trim(p_batch_label),160),p_manifest_sha256,p_source_bundle_sha256,v_count) returning run_id into v_run_id;
  insert into curtainsuk_private.pt_ingestion_items(run_id,supplier_sku,fabric_id,current_stage,work_state,input_fingerprints,committed_fingerprints,committed_results,last_failure_code)
  select v_run_id,item->>'supplier_sku',nullif(item->>'fabric_id',''),coalesce(item->>'initial_stage','SOURCE_READY'),
    case coalesce(item->>'initial_stage','SOURCE_READY') when 'RELEASED' then 'RELEASED' when 'EXCEPTION' then 'EXCEPTION' else 'READY' end,
    coalesce(item->'input_fingerprints','{}'::jsonb),coalesce(item->'committed_fingerprints','{}'::jsonb),coalesce(item->'committed_results','{}'::jsonb),
    case when coalesce(item->>'initial_stage','SOURCE_READY')='EXCEPTION' then item->>'exception_code' else null end
  from jsonb_array_elements(p_items) item;
  return v_run_id;
end $$;

create or replace function curtainsuk_private.stop_pt_ingestion_run(
  p_run_id uuid,p_failure_code text,p_detail jsonb default '{}'::jsonb
) returns boolean language plpgsql security invoker set search_path='' as $$
begin
  if p_failure_code !~ '^[A-Z0-9_]{1,80}$' or jsonb_typeof(p_detail)<>'object' then raise exception 'PT_INGESTION_STOP_ARGUMENT_INVALID'; end if;
  update curtainsuk_private.pt_ingestion_runs
  set status='STOPPED_SYSTEMIC',updated_at=clock_timestamp(),
      summary=summary || jsonb_build_object('systemic_failure_code',p_failure_code,'systemic_failure_detail',p_detail,'stopped_at',clock_timestamp())
  where run_id=p_run_id and status='RUNNING';
  return found;
end $$;
revoke all on function curtainsuk_private.pt_ingestion_next_stage(text) from public,anon,authenticated;
revoke all on function curtainsuk_private.claim_pt_ingestion_items(uuid,text,text,integer,integer) from public,anon,authenticated;
revoke all on function curtainsuk_private.heartbeat_pt_ingestion_item(uuid,text,uuid,text) from public,anon,authenticated;
revoke all on function curtainsuk_private.commit_pt_ingestion_stage(uuid,text,uuid,text,text,jsonb) from public,anon,authenticated;
revoke all on function curtainsuk_private.retry_pt_ingestion_item(uuid,text,uuid,text,text,integer) from public,anon,authenticated;
revoke all on function curtainsuk_private.exception_pt_ingestion_item(uuid,text,uuid,text,text,jsonb) from public,anon,authenticated;
revoke all on function curtainsuk_private.requeue_pt_ingestion_item(uuid,text,text,text) from public,anon,authenticated;
revoke all on function curtainsuk_private.start_pt_ingestion_run(text,text,text,jsonb) from public,anon,authenticated;
revoke all on function curtainsuk_private.stop_pt_ingestion_run(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function curtainsuk_private.pt_ingestion_next_stage(text),
 curtainsuk_private.claim_pt_ingestion_items(uuid,text,text,integer,integer),
 curtainsuk_private.heartbeat_pt_ingestion_item(uuid,text,uuid,text),
 curtainsuk_private.commit_pt_ingestion_stage(uuid,text,uuid,text,text,jsonb),
 curtainsuk_private.retry_pt_ingestion_item(uuid,text,uuid,text,text,integer),
 curtainsuk_private.exception_pt_ingestion_item(uuid,text,uuid,text,text,jsonb),
 curtainsuk_private.requeue_pt_ingestion_item(uuid,text,text,text),
 curtainsuk_private.start_pt_ingestion_run(text,text,text,jsonb),
 curtainsuk_private.stop_pt_ingestion_run(uuid,text,jsonb) to service_role;

commit;
