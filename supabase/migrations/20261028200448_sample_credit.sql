-- Service-only ledger. Codes are bearer secrets; only their hashes are stored.
create table curtainsuk_private.sample_credit_grants (
  id uuid primary key default gen_random_uuid(),
  order_gid text not null unique check (order_gid ~ '^gid://shopify/Order/[0-9]+$'),
  order_name text not null,
  code_hash text not null unique check (code_hash ~ '^[a-f0-9]{64}$'),
  email text,
  units jsonb not null check (jsonb_typeof(units)='array' and jsonb_array_length(units) between 1 and 10),
  state text not null default 'AVAILABLE' check (state in ('AVAILABLE','RESERVED','REDEEMED','REVOKED')),
  reservation_id text,
  email_state text not null default 'PENDING' check (email_state in ('PENDING','SENDING','SENT','FAILED','NO_EMAIL','REVIEW')),
  email_started_at timestamptz,
  email_attempts integer not null default 0,
  email_provider_id text,
  issued_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table curtainsuk_private.sample_credit_redemptions (
  id text primary key check (id ~ '^[a-f0-9]{64}$'),
  digest text not null check (digest ~ '^[a-f0-9]{64}$'),
  grant_ids uuid[] not null check (cardinality(grant_ids) between 1 and 10),
  sample_count integer not null check (sample_count between 1 and 10),
  amount_minor integer not null check (amount_minor>0),
  contract jsonb not null,
  draft_gid text unique,
  paid_order_gid text unique,
  state text not null default 'RESERVED' check (state in ('RESERVED','REDEEMED','REVOKED')),
  created_at timestamptz not null default now(),
  redeemed_at timestamptz
);
alter table curtainsuk_private.sample_credit_grants add constraint sample_credit_reservation_fk foreign key(reservation_id) references curtainsuk_private.sample_credit_redemptions(id);
create index sample_credit_grants_reservation_idx on curtainsuk_private.sample_credit_grants(reservation_id) where reservation_id is not null;
create index sample_credit_pending_email_idx on curtainsuk_private.sample_credit_grants(issued_at) where email_state in ('PENDING','SENDING','FAILED');
alter table curtainsuk_private.sample_credit_grants enable row level security;
alter table curtainsuk_private.sample_credit_redemptions enable row level security;
revoke all on curtainsuk_private.sample_credit_grants,curtainsuk_private.sample_credit_redemptions from public,anon,authenticated;
grant select,insert,update on curtainsuk_private.sample_credit_grants,curtainsuk_private.sample_credit_redemptions to service_role;

-- Lock grants in deterministic order. A reservation is never released on a timeout:
-- its Shopify invoice can still be payable. Staff must first cancel that draft.
create function curtainsuk_private.reserve_sample_credit(p_quote jsonb,p_contract jsonb) returns void
language plpgsql security invoker set search_path='' as $$
declare g curtainsuk_private.sample_credit_grants; r curtainsuk_private.sample_credit_redemptions;
  ids uuid[]; n integer:=0; qid text:=p_quote->>'reservationId';
begin
  select array_agg((x->>'id')::uuid order by x->>'id') into ids from jsonb_array_elements(p_quote->'grants') x;
  if ids is null or cardinality(ids)>10 or (p_quote->>'sampleCount')::int not between 1 and 10 then raise exception 'SAMPLE_CREDIT_INVALID'; end if;
  for g in select * from curtainsuk_private.sample_credit_grants where id=any(ids) order by id for update loop
    n:=n+1;
    if g.state not in ('AVAILABLE','RESERVED') or (g.reservation_id is not null and g.reservation_id<>qid) then raise exception 'SAMPLE_CREDIT_UNAVAILABLE'; end if;
  end loop;
  if n<>cardinality(ids) or n<>(select count(distinct x) from unnest(ids) x) then raise exception 'SAMPLE_CREDIT_INVALID'; end if;
  select * into r from curtainsuk_private.sample_credit_redemptions where id=qid for update;
  if found then
    if r.state<>'RESERVED' or r.digest<>p_quote->>'digest' or r.grant_ids<>ids or r.contract<>p_contract or r.amount_minor<>(p_quote->>'amountMinor')::int then raise exception 'SAMPLE_CREDIT_CONFLICT'; end if;
    return;
  end if;
  if not exists(select 1 from jsonb_array_elements(p_contract->'input'->'customAttributes') a where a->>'key'='curtainsuk_sample_credit_id' and a->>'value'=qid)
    or (p_contract->'expected'->>'discountAmountMinor')::int<>(p_quote->>'amountMinor')::int then raise exception 'SAMPLE_CREDIT_INVALID'; end if;
  insert into curtainsuk_private.sample_credit_redemptions(id,digest,grant_ids,sample_count,amount_minor,contract)
    values(qid,p_quote->>'digest',ids,(p_quote->>'sampleCount')::int,(p_quote->>'amountMinor')::int,p_contract);
  update curtainsuk_private.sample_credit_grants set state='RESERVED',reservation_id=qid,updated_at=now() where id=any(ids);
end $$;

create function curtainsuk_private.redeem_sample_credit(p_id text,p_order_gid text) returns void
language plpgsql security invoker set search_path='' as $$
declare r curtainsuk_private.sample_credit_redemptions;
begin
  select * into r from curtainsuk_private.sample_credit_redemptions where id=p_id for update;
  if not found or r.state='REVOKED' or p_order_gid is null or p_order_gid !~ '^gid://shopify/Order/[0-9]+$' then raise exception 'SAMPLE_CREDIT_INVALID'; end if;
  if r.state='REDEEMED' then
    if r.paid_order_gid<>p_order_gid then raise exception 'SAMPLE_CREDIT_REUSED'; end if;
    return;
  end if;
  update curtainsuk_private.sample_credit_redemptions set state='REDEEMED',paid_order_gid=p_order_gid,redeemed_at=now() where id=p_id;
  update curtainsuk_private.sample_credit_grants set state='REDEEMED',updated_at=now() where reservation_id=p_id;
end $$;

create function curtainsuk_private.claim_sample_credit_email(p_id uuid) returns boolean
language plpgsql security invoker set search_path='' as $$
declare g curtainsuk_private.sample_credit_grants;
begin
  select * into g from curtainsuk_private.sample_credit_grants where id=p_id for update;
  if not found or g.state='REVOKED' or g.email_state in ('SENT','NO_EMAIL','REVIEW') then return false; end if;
  if g.email_started_at is not null and g.email_started_at<now()-interval '23 hours' then
    update curtainsuk_private.sample_credit_grants set email_state='REVIEW' where id=p_id;
    return false;
  end if;
  if g.email_state='SENDING' and g.updated_at>now()-interval '5 minutes' then return false; end if;
  update curtainsuk_private.sample_credit_grants set email_state='SENDING',email_started_at=coalesce(email_started_at,now()),email_attempts=email_attempts+1,updated_at=now() where id=p_id;
  return true;
end $$;

revoke all on function curtainsuk_private.reserve_sample_credit(jsonb,jsonb),curtainsuk_private.redeem_sample_credit(text,text),curtainsuk_private.claim_sample_credit_email(uuid) from public,anon,authenticated;
grant execute on function curtainsuk_private.reserve_sample_credit(jsonb,jsonb),curtainsuk_private.redeem_sample_credit(text,text),curtainsuk_private.claim_sample_credit_email(uuid) to service_role;
