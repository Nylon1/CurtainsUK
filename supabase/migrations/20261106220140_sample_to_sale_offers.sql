-- Private bearer-code ledger. The code itself is never stored.
create table curtainsuk_private.sample_to_sale_offers (
  id uuid primary key,
  sample_order_gid text not null unique check (sample_order_gid ~ '^gid://shopify/Order/[0-9]+$'),
  customer_gid text not null unique check (customer_gid ~ '^gid://shopify/Customer/[0-9]+$'),
  code_hash text not null unique check (code_hash ~ '^[a-f0-9]{64}$'),
  issued_at timestamptz not null,
  expires_at timestamptz not null check (expires_at > issued_at and expires_at <= issued_at + interval '14 days'),
  state text not null default 'AVAILABLE' check (state in ('AVAILABLE','RESERVED','REDEEMED','REVOKED')),
  reservation_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table curtainsuk_private.sample_to_sale_redemptions (
  id text primary key check (id ~ '^[a-f0-9]{64}$'),
  offer_id uuid not null unique references curtainsuk_private.sample_to_sale_offers(id),
  amount_minor integer not null check (amount_minor > 0),
  contract jsonb not null,
  draft_gid text unique,
  paid_order_gid text unique,
  state text not null default 'RESERVED' check (state in ('RESERVED','REDEEMED','REVOKED')),
  created_at timestamptz not null default now(),
  redeemed_at timestamptz
);
alter table curtainsuk_private.sample_to_sale_offers add constraint sample_to_sale_reservation_fk foreign key(reservation_id) references curtainsuk_private.sample_to_sale_redemptions(id);
create index sample_to_sale_offer_expiry_idx on curtainsuk_private.sample_to_sale_offers(expires_at) where state='AVAILABLE';
alter table curtainsuk_private.sample_to_sale_offers enable row level security;
alter table curtainsuk_private.sample_to_sale_redemptions enable row level security;
revoke all on curtainsuk_private.sample_to_sale_offers,curtainsuk_private.sample_to_sale_redemptions from public,anon,authenticated;
grant select,insert,update on curtainsuk_private.sample_to_sale_offers,curtainsuk_private.sample_to_sale_redemptions to service_role;

-- The existing sample-credit reservation must recognise the extra, separately
-- verified promotion while preserving its single-use and exact-contract checks.
create or replace function curtainsuk_private.reserve_sample_credit(p_quote jsonb,p_contract jsonb) returns void
language plpgsql security invoker set search_path='' as $$
declare g curtainsuk_private.sample_credit_grants; r curtainsuk_private.sample_credit_redemptions;
  ids uuid[]; n integer:=0; qid text:=p_quote->>'reservationId';
  promo_minor integer:=coalesce((p_contract->'promotionQuote'->>'amountMinor')::integer,0);
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
    or (p_contract->'expected'->>'discountAmountMinor')::int<>(p_quote->>'amountMinor')::int+promo_minor then raise exception 'SAMPLE_CREDIT_INVALID'; end if;
  insert into curtainsuk_private.sample_credit_redemptions(id,digest,grant_ids,sample_count,amount_minor,contract)
    values(qid,p_quote->>'digest',ids,(p_quote->>'sampleCount')::int,(p_quote->>'amountMinor')::int,p_contract);
  update curtainsuk_private.sample_credit_grants set state='RESERVED',reservation_id=qid,updated_at=now() where id=any(ids);
end $$;

create function curtainsuk_private.reserve_sample_to_sale(p_contract jsonb) returns void
language plpgsql security invoker set search_path='' as $$
declare q jsonb:=p_contract->'promotionQuote'; offer curtainsuk_private.sample_to_sale_offers;
  existing curtainsuk_private.sample_to_sale_redemptions; rid text:=q->>'reservationId';
  credit_minor integer:=coalesce((p_contract->'sampleCreditQuote'->>'amountMinor')::integer,0);
begin
  if q is null or rid !~ '^[a-f0-9]{64}$' or (q->>'amountMinor')::integer<=0 then raise exception 'SAMPLE_TO_SALE_INVALID'; end if;
  if p_contract ? 'sampleCreditQuote' then perform curtainsuk_private.reserve_sample_credit(p_contract->'sampleCreditQuote',p_contract); end if;
  select * into offer from curtainsuk_private.sample_to_sale_offers where id=(q->>'offerId')::uuid for update;
  if not found or offer.code_hash<>q->>'codeHash' or offer.state not in ('AVAILABLE','RESERVED') or offer.expires_at<=now()
    or (offer.reservation_id is not null and offer.reservation_id<>rid) then raise exception 'SAMPLE_TO_SALE_UNAVAILABLE'; end if;
  if (p_contract->'expected'->>'discountAmountMinor')::integer<>(q->>'amountMinor')::integer+credit_minor
    or not exists(select 1 from jsonb_array_elements(p_contract->'input'->'customAttributes') a where a->>'key'='curtainsuk_sample_to_sale_id' and a->>'value'=rid) then raise exception 'SAMPLE_TO_SALE_INVALID'; end if;
  select * into existing from curtainsuk_private.sample_to_sale_redemptions where id=rid for update;
  if found then
    if existing.state<>'RESERVED' or existing.offer_id<>offer.id or existing.contract<>p_contract or existing.amount_minor<>(q->>'amountMinor')::integer then raise exception 'SAMPLE_TO_SALE_CONFLICT'; end if;
    return;
  end if;
  insert into curtainsuk_private.sample_to_sale_redemptions(id,offer_id,amount_minor,contract)
    values(rid,offer.id,(q->>'amountMinor')::integer,p_contract);
  update curtainsuk_private.sample_to_sale_offers set state='RESERVED',reservation_id=rid,updated_at=now() where id=offer.id;
end $$;

create function curtainsuk_private.redeem_sample_to_sale(p_id text,p_order_gid text) returns void
language plpgsql security invoker set search_path='' as $$
declare r curtainsuk_private.sample_to_sale_redemptions;
begin
  select * into r from curtainsuk_private.sample_to_sale_redemptions where id=p_id for update;
  if not found or r.state='REVOKED' or p_order_gid !~ '^gid://shopify/Order/[0-9]+$' then raise exception 'SAMPLE_TO_SALE_INVALID'; end if;
  if r.state='REDEEMED' then
    if r.paid_order_gid<>p_order_gid then raise exception 'SAMPLE_TO_SALE_REUSED'; end if;
    return;
  end if;
  update curtainsuk_private.sample_to_sale_redemptions set state='REDEEMED',paid_order_gid=p_order_gid,redeemed_at=now() where id=p_id;
  update curtainsuk_private.sample_to_sale_offers set state='REDEEMED',updated_at=now() where id=r.offer_id;
end $$;

revoke all on function curtainsuk_private.reserve_sample_to_sale(jsonb),curtainsuk_private.redeem_sample_to_sale(text,text) from public,anon,authenticated;
grant execute on function curtainsuk_private.reserve_sample_to_sale(jsonb),curtainsuk_private.redeem_sample_to_sale(text,text) to service_role;
