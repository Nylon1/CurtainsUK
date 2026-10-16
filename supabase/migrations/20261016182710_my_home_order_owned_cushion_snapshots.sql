-- An item explicitly added to My Home is an order item, not a saved Cushion
-- Studio design. Keep the immutable snapshot's order lineage without requiring
-- a customer to save an unrelated design before checkout.
begin;

alter table curtainsuk_private.cushion_order_snapshots
  drop constraint cushion_order_snapshots_design_id_fkey;

alter table curtainsuk_private.cushion_order_snapshots
  add constraint cushion_order_snapshots_design_id_present
  check (length(design_id) between 1 and 150);

create or replace function curtainsuk_private.commit_cushion_checkout(
  p_owner text,
  p_key text,
  p_snapshots jsonb,
  p_contract jsonb
) returns void
language plpgsql set search_path = '' as $$
declare
  s jsonb;
  my_home_order boolean;
begin
  if p_owner !~ '^[a-f0-9]{64}$'
     or jsonb_typeof(p_snapshots) <> 'array'
     or jsonb_array_length(p_snapshots) not between 1 and 24 then
    raise exception 'CUSHION_CHECKOUT_INVALID';
  end if;

  -- This marker is created server-side only after the complete My Home review
  -- has been revalidated. Standalone Cushion Studio checkout still requires an
  -- owner-matched saved design.
  select exists (
    select 1
    from jsonb_array_elements(
      coalesce(p_contract #> '{input,customAttributes}', '[]'::jsonb)
    ) as attributes(attribute)
    where attribute->>'key' = 'curtainsuk_my_home_review_id'
      and attribute->>'value' ~ '^[a-f0-9]{64}$'
  ) into my_home_order;

  insert into curtainsuk_private.cushion_checkout_groups
    (idempotency_key, owner_session_hash, snapshots, contract)
  values (p_key, p_owner, p_snapshots, p_contract);

  for s in select value from jsonb_array_elements(p_snapshots) loop
    if nullif(s->>'designId', '') is null then
      raise exception 'CUSHION_CHECKOUT_INVALID';
    end if;
    if not my_home_order and not exists (
      select 1 from curtainsuk_private.cushion_designs
      where design_id = s->>'designId' and owner_session_hash = p_owner
    ) then
      raise exception 'CUSHION_OWNER_MISMATCH';
    end if;

    insert into curtainsuk_private.cushion_order_snapshots
      (snapshot_id, design_id, product_type, spec_version, spec,
       spec_sha256, fabric_identity, manufacturing, commercial, rules_version,
       goods_gross_minor, goods_vat_minor, revalidated_at)
    values
      ((s->>'id')::uuid, s->>'designId', s->>'productType',
       (s->>'version')::integer, s->'spec', s->>'specSha256',
       s->'fabricIdentity', s->'manufacturing',
       coalesce(s->'commercial', '{}'::jsonb), s->>'rulesVersion',
       (s->'price'->>'goodsGrossMinor')::bigint,
       (s->'price'->>'goodsVatMinor')::bigint,
       (s->>'revalidatedAt')::timestamptz);
  end loop;
end;
$$;

commit;
