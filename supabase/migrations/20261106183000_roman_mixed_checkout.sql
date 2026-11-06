-- Roman blind lines share the existing immutable My Home checkout group and
-- draft transport. No existing smart-track release state is changed.
begin;
create table curtainsuk_private.roman_blind_order_snapshots (
  snapshot_id uuid primary key,
  checkout_key text not null references curtainsuk_private.smart_track_checkout_groups(idempotency_key),
  snapshot jsonb not null check(snapshot->>'productType'='ROMAN_BLIND' and snapshot->>'version'='1' and snapshot->>'id'=snapshot_id::text)
);
create table curtainsuk_private.roman_blind_fabric_usage (
  snapshot_id uuid primary key references curtainsuk_private.roman_blind_order_snapshots(snapshot_id),
  shopify_order_gid text not null references curtainsuk_private.smart_track_paid_manifests(shopify_order_gid),
  supplier_id text not null,
  supplier_sku text not null,
  metres numeric(12,3) not null check(metres>0),
  recorded_at timestamptz not null default clock_timestamp()
);
alter table curtainsuk_private.roman_blind_order_snapshots enable row level security;
alter table curtainsuk_private.roman_blind_order_snapshots force row level security;
alter table curtainsuk_private.roman_blind_fabric_usage enable row level security;
alter table curtainsuk_private.roman_blind_fabric_usage force row level security;
revoke all on curtainsuk_private.roman_blind_order_snapshots,curtainsuk_private.roman_blind_fabric_usage from public,anon,authenticated;
grant select,insert on curtainsuk_private.roman_blind_order_snapshots,curtainsuk_private.roman_blind_fabric_usage to service_role;
create trigger roman_blind_snapshots_immutable before update or delete on curtainsuk_private.roman_blind_order_snapshots for each row execute function curtainsuk_private.reject_cushion_snapshot_mutation();
create trigger roman_blind_usage_immutable before update or delete on curtainsuk_private.roman_blind_fabric_usage for each row execute function curtainsuk_private.reject_cushion_snapshot_mutation();

create or replace function curtainsuk_private.commit_smart_track_checkout(p_owner text,p_key text,p_group jsonb) returns void
language plpgsql set search_path='' as $$
declare s jsonb; track_count integer; roman_count integer;
begin
  track_count=case when jsonb_typeof(p_group->'snapshots')='array' then jsonb_array_length(p_group->'snapshots') else -1 end;
  roman_count=case when jsonb_typeof(p_group->'romans')='array' then jsonb_array_length(p_group->'romans') else 0 end;
  if p_owner !~ '^[a-f0-9]{64}$' or track_count<0 or roman_count<0 or track_count+roman_count not between 1 and 32
    or p_group->>'reviewId' !~ '^[a-f0-9]{64}$' then raise exception 'TRACK_CHECKOUT_INVALID'; end if;
  insert into curtainsuk_private.smart_track_checkout_groups values(p_key,p_owner,p_group,clock_timestamp());
  for s in select value from jsonb_array_elements(p_group->'snapshots') loop
    insert into curtainsuk_private.smart_track_order_snapshots values((s->>'id')::uuid,p_key,s);
  end loop;
  if roman_count>0 then
    for s in select value from jsonb_array_elements(p_group->'romans') loop
      insert into curtainsuk_private.roman_blind_order_snapshots values((s->>'id')::uuid,p_key,s);
    end loop;
  end if;
  if jsonb_array_length(p_group->'cushions')>0 then
    perform curtainsuk_private.commit_cushion_checkout(p_owner,p_key,p_group->'cushions',p_group->'contract');
  end if;
end $$;

create or replace function curtainsuk_private.record_smart_track_paid_manifest(p_order text,p_manifest jsonb) returns jsonb
language plpgsql set search_path='' as $$
declare prior jsonb; g jsonb; roman jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_order,0));
  select manifest into prior from curtainsuk_private.smart_track_paid_manifests where shopify_order_gid=p_order;
  if found then
    if prior<>p_manifest then raise exception 'TRACK_PAID_IDENTITY_CONFLICT'; end if;
    return '{"duplicate":true}'::jsonb;
  end if;
  select payload into g from curtainsuk_private.smart_track_checkout_groups where idempotency_key=p_manifest->>'checkoutKey';
  if not found or g->'packets'<>p_manifest->'packets' then raise exception 'TRACK_PAID_IDENTITY_CONFLICT'; end if;
  if coalesce(jsonb_array_length(g->'romans'),0)<>coalesce(jsonb_array_length(p_manifest->'groups'->'romans'),0) then raise exception 'ROMAN_PAID_IDENTITY_CONFLICT'; end if;
  insert into curtainsuk_private.smart_track_paid_manifests(shopify_order_gid,checkout_key,manifest) values(p_order,p_manifest->>'checkoutKey',p_manifest);
  if jsonb_array_length(p_manifest->'groups'->'curtains')+jsonb_array_length(p_manifest->'groups'->'cushions')>0 then
    perform curtainsuk_private.record_cushion_paid_manifest(p_order,p_manifest);
  end if;
  if g ? 'romans' then
    for roman in select value from jsonb_array_elements(g->'romans') loop
      insert into curtainsuk_private.roman_blind_fabric_usage(snapshot_id,shopify_order_gid,supplier_id,supplier_sku,metres)
      values((roman->>'id')::uuid,p_order,roman->'fabric'->>'supplierId',roman->'fabric'->>'supplierSku',(roman->'fabric'->>'metres')::numeric);
    end loop;
  end if;
  return '{"duplicate":false}'::jsonb;
end $$;

create function curtainsuk_private.roman_usage_since(p_supplier text,p_sku text,p_observed timestamptz) returns numeric
language sql stable set search_path='' as $$
 select coalesce(sum(metres),0) from curtainsuk_private.roman_blind_fabric_usage
 where supplier_id=p_supplier and supplier_sku=p_sku and recorded_at>p_observed
$$;
revoke all on function curtainsuk_private.roman_usage_since(text,text,timestamptz) from public,anon,authenticated;
grant execute on function curtainsuk_private.roman_usage_since(text,text,timestamptz) to service_role;
commit;
