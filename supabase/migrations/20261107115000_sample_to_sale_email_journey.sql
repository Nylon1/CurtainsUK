-- Private, one-message-per-stage marketing outbox and immediate local suppression.
create table curtainsuk_private.sample_to_sale_messages (
  customer_gid text not null check (customer_gid ~ '^gid://shopify/Customer/[0-9]+$'),
  stage text not null check (stage in ('check_in','inspiration','offer','reminder')),
  sample_order_gid text not null check (sample_order_gid ~ '^gid://shopify/Order/[0-9]+$'),
  state text not null default 'PENDING' check (state in ('PENDING','SENDING','SENT','FAILED','REVIEW')),
  recipient text not null,
  attempts integer not null default 0,
  started_at timestamptz,
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  provider_id text,
  primary key (customer_gid,stage)
);
create table curtainsuk_private.sample_to_sale_unsubscribes (
  customer_gid text primary key check (customer_gid ~ '^gid://shopify/Customer/[0-9]+$'),
  unsubscribed_at timestamptz not null default now()
);
alter table curtainsuk_private.sample_to_sale_messages enable row level security;
alter table curtainsuk_private.sample_to_sale_unsubscribes enable row level security;
revoke all on curtainsuk_private.sample_to_sale_messages, curtainsuk_private.sample_to_sale_unsubscribes from public,anon,authenticated;
grant select,insert,update on curtainsuk_private.sample_to_sale_messages,curtainsuk_private.sample_to_sale_unsubscribes to service_role;

create function curtainsuk_private.claim_sample_to_sale_message(p_customer_gid text,p_stage text,p_sample_order_gid text,p_recipient text) returns boolean
language plpgsql security invoker set search_path='' as $$
declare m curtainsuk_private.sample_to_sale_messages;
begin
  if p_customer_gid !~ '^gid://shopify/Customer/[0-9]+$' or p_sample_order_gid !~ '^gid://shopify/Order/[0-9]+$'
    or p_stage not in ('check_in','inspiration','offer','reminder') or p_recipient !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'SAMPLE_TO_SALE_MESSAGE_INVALID';
  end if;
  if exists(select 1 from curtainsuk_private.sample_to_sale_unsubscribes where customer_gid=p_customer_gid) then return false; end if;
  insert into curtainsuk_private.sample_to_sale_messages(customer_gid,stage,sample_order_gid,recipient)
    values(p_customer_gid,p_stage,p_sample_order_gid,p_recipient) on conflict do nothing;
  select * into m from curtainsuk_private.sample_to_sale_messages where customer_gid=p_customer_gid and stage=p_stage for update;
  if m.sample_order_gid<>p_sample_order_gid or m.recipient<>p_recipient or m.state in ('SENT','REVIEW') then return false; end if;
  if m.started_at is not null and m.started_at<now()-interval '23 hours' then
    update curtainsuk_private.sample_to_sale_messages set state='REVIEW',updated_at=now() where customer_gid=p_customer_gid and stage=p_stage;
    return false;
  end if;
  if m.state='SENDING' and m.updated_at>now()-interval '5 minutes' then return false; end if;
  update curtainsuk_private.sample_to_sale_messages set state='SENDING',started_at=coalesce(started_at,now()),attempts=attempts+1,updated_at=now()
    where customer_gid=p_customer_gid and stage=p_stage;
  return true;
end $$;
revoke all on function curtainsuk_private.claim_sample_to_sale_message(text,text,text,text) from public,anon,authenticated;
grant execute on function curtainsuk_private.claim_sample_to_sale_message(text,text,text,text) to service_role;
