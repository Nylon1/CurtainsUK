-- Persist Shopify's validated create response before returning checkout to the buyer.
-- Existing immutable groups and one-shot creation claims remain unchanged.
begin;
create table curtainsuk_private.my_home_draft_receipts (
  checkout_kind text not null check (checkout_kind in ('CUSHION','SMART_TRACK')),
  idempotency_key text not null,
  owner_session_hash text not null check (owner_session_hash ~ '^[a-f0-9]{64}$'),
  idempotency_tag text not null,
  shopify_draft_order_gid text not null unique check (shopify_draft_order_gid ~ '^gid://shopify/DraftOrder/[0-9]+$'),
  created_at timestamptz not null default clock_timestamp(),
  primary key (checkout_kind,idempotency_key)
);
alter table curtainsuk_private.my_home_draft_receipts enable row level security;
alter table curtainsuk_private.my_home_draft_receipts force row level security;
revoke all on curtainsuk_private.my_home_draft_receipts from public,anon,authenticated;
grant select,insert on curtainsuk_private.my_home_draft_receipts to service_role;
create trigger my_home_draft_receipts_immutable before update or delete
  on curtainsuk_private.my_home_draft_receipts for each row
  execute function curtainsuk_private.reject_cushion_snapshot_mutation();

create function curtainsuk_private.record_my_home_draft_receipt(
  p_kind text,p_owner text,p_key text,p_tag text,p_draft_gid text
) returns void language plpgsql set search_path='' as $$
declare expected_tag text; receipt curtainsuk_private.my_home_draft_receipts;
begin
  if p_kind='SMART_TRACK' then
    select payload->'contract'->>'idempotencyTag' into expected_tag
      from curtainsuk_private.smart_track_checkout_groups
      where idempotency_key=p_key and owner_session_hash=p_owner;
  elsif p_kind='CUSHION' then
    select contract->>'idempotencyTag' into expected_tag
      from curtainsuk_private.cushion_checkout_groups
      where idempotency_key=p_key and owner_session_hash=p_owner;
  else raise exception 'MY_HOME_DRAFT_RECEIPT_KIND_INVALID';
  end if;
  if expected_tag is null or expected_tag is distinct from p_tag then
    raise exception 'MY_HOME_DRAFT_RECEIPT_IDENTITY_MISMATCH';
  end if;
  insert into curtainsuk_private.my_home_draft_receipts
    (checkout_kind,idempotency_key,owner_session_hash,idempotency_tag,shopify_draft_order_gid)
    values(p_kind,p_key,p_owner,p_tag,p_draft_gid)
    on conflict(checkout_kind,idempotency_key) do nothing;
  select * into receipt from curtainsuk_private.my_home_draft_receipts
    where checkout_kind=p_kind and idempotency_key=p_key;
  if receipt.owner_session_hash is distinct from p_owner
    or receipt.idempotency_tag is distinct from p_tag
    or receipt.shopify_draft_order_gid is distinct from p_draft_gid then
    raise exception 'MY_HOME_DRAFT_RECEIPT_CONFLICT';
  end if;
end $$;
revoke all on function curtainsuk_private.record_my_home_draft_receipt(text,text,text,text,text) from public,anon,authenticated;
grant execute on function curtainsuk_private.record_my_home_draft_receipt(text,text,text,text,text) to service_role;
commit;
