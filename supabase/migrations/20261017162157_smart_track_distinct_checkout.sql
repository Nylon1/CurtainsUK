-- Candidate only: no feature flag, production setting or payment activation.
begin;
create table curtainsuk_private.smart_track_checkout_groups (
  idempotency_key text primary key check(idempotency_key ~ '^[A-Za-z0-9-]{8,100}$'),
  owner_session_hash text not null check(owner_session_hash ~ '^[a-f0-9]{64}$'),
  payload jsonb not null check(jsonb_typeof(payload)='object'),
  created_at timestamptz not null default clock_timestamp()
);
create table curtainsuk_private.smart_track_order_snapshots (
  snapshot_id uuid primary key,
  checkout_key text not null references curtainsuk_private.smart_track_checkout_groups(idempotency_key),
  snapshot jsonb not null check(snapshot->>'productType'='SMART_TRACK' and snapshot->>'version'='1' and snapshot->>'id'=snapshot_id::text)
);
create table curtainsuk_private.smart_track_draft_creation_claims (
  idempotency_key text primary key references curtainsuk_private.smart_track_checkout_groups(idempotency_key),
  claimed_at timestamptz not null default clock_timestamp()
);
create table curtainsuk_private.smart_track_paid_manifests (
  shopify_order_gid text primary key check(shopify_order_gid ~ '^gid://shopify/Order/[0-9]+$'),
  checkout_key text unique not null references curtainsuk_private.smart_track_checkout_groups(idempotency_key),
  manifest jsonb not null,
  created_at timestamptz not null default clock_timestamp()
);
create table curtainsuk_private.smart_track_supplier_releases (
  shopify_order_gid text primary key references curtainsuk_private.smart_track_paid_manifests(shopify_order_gid),
  approved_by text not null check(length(approved_by) between 3 and 150),
  approval_reference text not null check(length(approval_reference) between 3 and 200),
  approved_at timestamptz not null default clock_timestamp()
);
-- Carriage is booked against an actual shipment, never multiplied by track count.
create table curtainsuk_private.smart_track_supplier_shipments (
  shipment_reference text primary key check(length(shipment_reference) between 3 and 150),
  shopify_order_gid text not null references curtainsuk_private.smart_track_supplier_releases(shopify_order_gid),
  supplier_carriage_gross_minor integer not null default 1095 check(supplier_carriage_gross_minor=1095),
  recorded_at timestamptz not null default clock_timestamp()
);
do $$ declare t text; begin
  foreach t in array array['smart_track_checkout_groups','smart_track_order_snapshots','smart_track_draft_creation_claims','smart_track_paid_manifests','smart_track_supplier_releases','smart_track_supplier_shipments'] loop
    execute format('alter table curtainsuk_private.%I enable row level security',t);
    execute format('alter table curtainsuk_private.%I force row level security',t);
    execute format('revoke all on curtainsuk_private.%I from public,anon,authenticated',t);
    execute format('grant select,insert on curtainsuk_private.%I to service_role',t);
    execute format('create trigger %I before update or delete on curtainsuk_private.%I for each row execute function curtainsuk_private.reject_cushion_snapshot_mutation()',t||'_immutable',t);
  end loop;
end $$;
create function curtainsuk_private.commit_smart_track_checkout(p_owner text,p_key text,p_group jsonb) returns void
language plpgsql set search_path='' as $$
declare s jsonb;
begin
  if p_owner !~ '^[a-f0-9]{64}$' or jsonb_typeof(p_group->'snapshots')<>'array' or jsonb_array_length(p_group->'snapshots') not between 1 and 32
    or p_group->>'reviewId' !~ '^[a-f0-9]{64}$' then raise exception 'TRACK_CHECKOUT_INVALID'; end if;
  insert into curtainsuk_private.smart_track_checkout_groups values(p_key,p_owner,p_group,clock_timestamp());
  for s in select value from jsonb_array_elements(p_group->'snapshots') loop
    insert into curtainsuk_private.smart_track_order_snapshots values((s->>'id')::uuid,p_key,s);
  end loop;
  if jsonb_array_length(p_group->'cushions')>0 then
    perform curtainsuk_private.commit_cushion_checkout(p_owner,p_key,p_group->'cushions',p_group->'contract');
  end if;
end $$;
create function curtainsuk_private.claim_smart_track_draft_creation(p_owner text,p_key text) returns boolean
language plpgsql set search_path='' as $$
begin
  if not exists(select 1 from curtainsuk_private.smart_track_checkout_groups where idempotency_key=p_key and owner_session_hash=p_owner) then raise exception 'TRACK_OWNER_MISMATCH'; end if;
  insert into curtainsuk_private.smart_track_draft_creation_claims(idempotency_key) values(p_key) on conflict do nothing;
  return found;
end $$;
create function curtainsuk_private.record_smart_track_paid_manifest(p_order text,p_manifest jsonb) returns jsonb
language plpgsql set search_path='' as $$
declare prior jsonb; g jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_order,0));
  select manifest into prior from curtainsuk_private.smart_track_paid_manifests where shopify_order_gid=p_order;
  if found then
    if prior<>p_manifest then raise exception 'TRACK_PAID_IDENTITY_CONFLICT'; end if;
    return '{"duplicate":true}'::jsonb;
  end if;
  select payload into g from curtainsuk_private.smart_track_checkout_groups where idempotency_key=p_manifest->>'checkoutKey';
  if not found or g->'packets'<>p_manifest->'packets' then raise exception 'TRACK_PAID_IDENTITY_CONFLICT'; end if;
  insert into curtainsuk_private.smart_track_paid_manifests(shopify_order_gid,checkout_key,manifest) values(p_order,p_manifest->>'checkoutKey',p_manifest);
  -- Reuse native curtain lifecycle and cushion stock usage in this transaction.
  if jsonb_array_length(p_manifest->'groups'->'curtains')+jsonb_array_length(p_manifest->'groups'->'cushions')>0 then
    perform curtainsuk_private.record_cushion_paid_manifest(p_order,p_manifest);
  end if;
  return '{"duplicate":false}'::jsonb;
end $$;
create function curtainsuk_private.release_smart_track_order(p_order text,p_approved_by text,p_reference text) returns void
language plpgsql set search_path='' as $$
begin
  -- Staff-only explicit review. The payment webhook cannot release production.
  insert into curtainsuk_private.smart_track_supplier_releases(shopify_order_gid,approved_by,approval_reference) values(p_order,p_approved_by,p_reference);
end $$;
revoke all on function curtainsuk_private.commit_smart_track_checkout(text,text,jsonb),curtainsuk_private.claim_smart_track_draft_creation(text,text),curtainsuk_private.record_smart_track_paid_manifest(text,jsonb),curtainsuk_private.release_smart_track_order(text,text,text) from public,anon,authenticated;
grant execute on function curtainsuk_private.commit_smart_track_checkout(text,text,jsonb),curtainsuk_private.claim_smart_track_draft_creation(text,text),curtainsuk_private.record_smart_track_paid_manifest(text,jsonb),curtainsuk_private.release_smart_track_order(text,text,text) to service_role;
commit;
