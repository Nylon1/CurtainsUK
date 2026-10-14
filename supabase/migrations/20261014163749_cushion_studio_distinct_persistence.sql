-- OFFLINE REVIEW ONLY. This change does not activate Cushion Studio or payment.
begin;

create table curtainsuk_private.cushion_designs (
  design_id text primary key check (design_id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,149}$'),
  owner_session_hash text not null check (owner_session_hash ~ '^[a-f0-9]{64}$'),
  revision integer not null default 1 check (revision > 0),
  design jsonb not null check (jsonb_typeof(design) = 'object' and design->>'version' = '1' and design->>'id' = design_id),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);
create index cushion_designs_owner_idx on curtainsuk_private.cushion_designs(owner_session_hash, updated_at desc);

create table curtainsuk_private.cushion_order_snapshots (
  snapshot_id uuid primary key,
  design_id text not null references curtainsuk_private.cushion_designs(design_id) on delete restrict,
  product_type text not null default 'CUSHION' check (product_type = 'CUSHION'),
  spec_version integer not null check (spec_version = 1),
  spec jsonb not null check (jsonb_typeof(spec) = 'object' and spec->>'version' = '1'),
  spec_sha256 text not null check (spec_sha256 ~ '^[a-f0-9]{64}$'),
  fabric_identity jsonb not null check (jsonb_typeof(fabric_identity) = 'object'),
  manufacturing jsonb not null check (jsonb_typeof(manufacturing) = 'object'),
  commercial jsonb not null default '{}'::jsonb check (jsonb_typeof(commercial) = 'object'),
  rules_version text not null,
  currency text not null default 'GBP' check (currency = 'GBP'),
  goods_gross_minor bigint not null check (goods_gross_minor > 0),
  goods_vat_minor bigint not null check (goods_vat_minor >= 0 and goods_vat_minor <= goods_gross_minor),
  revalidated_at timestamptz not null,
  created_at timestamptz not null default clock_timestamp()
);

-- A mixed checkout references each domain's native immutable schema.
create table curtainsuk_private.mixed_order_manufacturing_lines (
  line_id uuid primary key,
  checkout_reference text not null,
  product_type text not null check (product_type in ('CURTAIN', 'CUSHION')),
  curtain_snapshot_id uuid references curtainsuk_private.staging_configuration_snapshots(snapshot_id) on delete restrict,
  cushion_snapshot_id uuid references curtainsuk_private.cushion_order_snapshots(snapshot_id) on delete restrict,
  created_at timestamptz not null default clock_timestamp(),
  check ((product_type = 'CURTAIN' and curtain_snapshot_id is not null and cushion_snapshot_id is null)
      or (product_type = 'CUSHION' and cushion_snapshot_id is not null and curtain_snapshot_id is null)),
  unique (checkout_reference, curtain_snapshot_id),
  unique (checkout_reference, cushion_snapshot_id)
);
create unique index mixed_order_cushion_paid_once on curtainsuk_private.mixed_order_manufacturing_lines(cushion_snapshot_id) where cushion_snapshot_id is not null;
create unique index mixed_order_curtain_paid_once on curtainsuk_private.mixed_order_manufacturing_lines(curtain_snapshot_id) where curtain_snapshot_id is not null;

create function curtainsuk_private.reject_cushion_snapshot_mutation() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'CUSHION_ORDER_SNAPSHOT_IMMUTABLE';
end;
$$;
revoke all on function curtainsuk_private.reject_cushion_snapshot_mutation() from public, anon, authenticated;
create trigger cushion_snapshot_immutable before update or delete on curtainsuk_private.cushion_order_snapshots
for each row execute function curtainsuk_private.reject_cushion_snapshot_mutation();
create trigger mixed_manufacturing_line_immutable before update or delete on curtainsuk_private.mixed_order_manufacturing_lines
for each row execute function curtainsuk_private.reject_cushion_snapshot_mutation();

alter table curtainsuk_private.cushion_designs enable row level security;
alter table curtainsuk_private.cushion_designs force row level security;
alter table curtainsuk_private.cushion_order_snapshots enable row level security;
alter table curtainsuk_private.cushion_order_snapshots force row level security;
alter table curtainsuk_private.mixed_order_manufacturing_lines enable row level security;
alter table curtainsuk_private.mixed_order_manufacturing_lines force row level security;
revoke all on curtainsuk_private.cushion_designs, curtainsuk_private.cushion_order_snapshots, curtainsuk_private.mixed_order_manufacturing_lines from public, anon, authenticated;
grant select, insert, update on curtainsuk_private.cushion_designs to service_role;
grant select, insert on curtainsuk_private.cushion_order_snapshots, curtainsuk_private.mixed_order_manufacturing_lines to service_role;

create table curtainsuk_private.cushion_checkout_groups (
  idempotency_key text primary key,
  owner_session_hash text not null,
  snapshots jsonb not null check (jsonb_typeof(snapshots) = 'array'),
  contract jsonb not null check (jsonb_typeof(contract) = 'object'),
  created_at timestamptz not null default clock_timestamp()
);
create table curtainsuk_private.cushion_paid_manifests (
  shopify_order_gid text primary key check (shopify_order_gid ~ '^gid://shopify/Order/[0-9]+$'),
  manifest jsonb not null check (jsonb_typeof(manifest) = 'object'),
  lifecycle_state text not null default 'CURTAINSUK_REVIEW' check (lifecycle_state = 'CURTAINSUK_REVIEW'),
  created_at timestamptz not null default clock_timestamp()
);
create table curtainsuk_private.cushion_draft_creation_claims (
  idempotency_key text primary key references curtainsuk_private.cushion_checkout_groups(idempotency_key) on delete restrict,
  claimed_at timestamptz not null default clock_timestamp()
);
create table curtainsuk_private.cushion_stock_usage (
  shopify_order_gid text not null references curtainsuk_private.cushion_paid_manifests(shopify_order_gid) on delete restrict,
  set_quote_id text not null,
  fabric_id text not null,
  supplier_id text not null,
  supplier_sku text not null,
  ordered_metres numeric not null check(ordered_metres>0),
  paid_at timestamptz not null,
  primary key(shopify_order_gid,set_quote_id,fabric_id)
);
alter table curtainsuk_private.cushion_stock_usage enable row level security;
alter table curtainsuk_private.cushion_stock_usage force row level security;
revoke all on curtainsuk_private.cushion_stock_usage from public,anon,authenticated;
grant select,insert on curtainsuk_private.cushion_stock_usage to service_role;
create index cushion_stock_usage_fabric_observation_idx on curtainsuk_private.cushion_stock_usage(fabric_id,paid_at);
create trigger cushion_stock_usage_immutable before update or delete on curtainsuk_private.cushion_stock_usage
for each row execute function curtainsuk_private.reject_cushion_snapshot_mutation();
alter table curtainsuk_private.cushion_checkout_groups enable row level security;
alter table curtainsuk_private.cushion_checkout_groups force row level security;
alter table curtainsuk_private.cushion_paid_manifests enable row level security;
alter table curtainsuk_private.cushion_paid_manifests force row level security;
alter table curtainsuk_private.cushion_draft_creation_claims enable row level security;
alter table curtainsuk_private.cushion_draft_creation_claims force row level security;
revoke all on curtainsuk_private.cushion_checkout_groups, curtainsuk_private.cushion_paid_manifests from public, anon, authenticated;
grant select, insert on curtainsuk_private.cushion_checkout_groups, curtainsuk_private.cushion_paid_manifests to service_role;
revoke all on curtainsuk_private.cushion_draft_creation_claims from public,anon,authenticated;
grant select,insert on curtainsuk_private.cushion_draft_creation_claims to service_role;
create trigger cushion_checkout_group_immutable before update or delete on curtainsuk_private.cushion_checkout_groups
for each row execute function curtainsuk_private.reject_cushion_snapshot_mutation();
create trigger cushion_paid_manifest_immutable before update or delete on curtainsuk_private.cushion_paid_manifests
for each row execute function curtainsuk_private.reject_cushion_snapshot_mutation();

create function curtainsuk_private.save_cushion_design(p_owner text,p_design jsonb,p_revision integer) returns jsonb
language plpgsql set search_path = '' as $$
declare saved curtainsuk_private.cushion_designs;
begin
  if p_owner !~ '^[a-f0-9]{64}$' or p_revision < 0 then raise exception 'CUSHION_OWNER_INVALID'; end if;
  if p_revision = 0 then
    insert into curtainsuk_private.cushion_designs(design_id,owner_session_hash,design) values (p_design->>'id',p_owner,p_design) returning * into saved;
  else
    update curtainsuk_private.cushion_designs set design=p_design,revision=revision+1,updated_at=clock_timestamp()
    where design_id=p_design->>'id' and owner_session_hash=p_owner and revision=p_revision returning * into saved;
    if not found then raise exception 'CUSHION_REVISION_CONFLICT'; end if;
  end if;
  return jsonb_build_object('design',saved.design,'revision',saved.revision,'updatedAt',saved.updated_at);
end;
$$;

create function curtainsuk_private.commit_cushion_checkout(p_owner text,p_key text,p_snapshots jsonb,p_contract jsonb) returns void
language plpgsql set search_path = '' as $$
declare s jsonb;
begin
  if p_owner !~ '^[a-f0-9]{64}$' or jsonb_array_length(p_snapshots) not between 1 and 24 then raise exception 'CUSHION_CHECKOUT_INVALID'; end if;
  insert into curtainsuk_private.cushion_checkout_groups(idempotency_key,owner_session_hash,snapshots,contract) values(p_key,p_owner,p_snapshots,p_contract);
  for s in select value from jsonb_array_elements(p_snapshots) loop
    if not exists(select 1 from curtainsuk_private.cushion_designs where design_id=s->>'designId' and owner_session_hash=p_owner) then raise exception 'CUSHION_OWNER_MISMATCH'; end if;
    insert into curtainsuk_private.cushion_order_snapshots(snapshot_id,design_id,product_type,spec_version,spec,spec_sha256,fabric_identity,manufacturing,commercial,rules_version,goods_gross_minor,goods_vat_minor,revalidated_at)
    values((s->>'id')::uuid,s->>'designId',s->>'productType',(s->>'version')::integer,s->'spec',s->>'specSha256',s->'fabricIdentity',s->'manufacturing',coalesce(s->'commercial','{}'::jsonb),s->>'rulesVersion',(s->'price'->>'goodsGrossMinor')::bigint,(s->'price'->>'goodsVatMinor')::bigint,(s->>'revalidatedAt')::timestamptz);
  end loop;
end;
$$;

create function curtainsuk_private.record_cushion_paid_manifest(p_order text,p_manifest jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare existing jsonb; line jsonb; packet jsonb; cloth jsonb; source jsonb;
begin
  -- Serialize same-order retries before verifying their immutable identity.
  perform pg_advisory_xact_lock(hashtextextended(p_order,0));
  select manifest into existing from curtainsuk_private.cushion_paid_manifests where shopify_order_gid=p_order;
  if found then
    if existing <> p_manifest then raise exception 'CUSHION_PAID_IDENTITY_CONFLICT'; end if;
    return '{"duplicate":true}'::jsonb;
  end if;
  insert into curtainsuk_private.cushion_paid_manifests(shopify_order_gid,manifest) values(p_order,p_manifest);
  if p_manifest ? 'nativeCurtainPayment' then
    perform curtainsuk_private.record_mtm_paid_order(p_manifest->'nativeCurtainPayment');
  end if;
  for line in select value from jsonb_array_elements((p_manifest->'groups'->'cushions') || (p_manifest->'groups'->'curtains')) loop
    insert into curtainsuk_private.mixed_order_manufacturing_lines(line_id,checkout_reference,product_type,cushion_snapshot_id,curtain_snapshot_id)
    values(gen_random_uuid(),p_order,line->>'productType',case when line->>'productType'='CUSHION' then (line->>'snapshotId')::uuid end,case when line->>'productType'='CURTAIN' then (line->>'snapshotId')::uuid end);
  end loop;
  for packet in select value from jsonb_array_elements(p_manifest->'packets') loop
    if packet->>'productType'='CUSHION' then
      for cloth in select value from jsonb_array_elements(packet->'manufacturing'->'cutPlan'->'fabrics') loop
        select value into source from jsonb_array_elements(packet->'manufacturing'->'fabricSources') where value->>'id'=cloth->>'fabricId';
        insert into curtainsuk_private.cushion_stock_usage(shopify_order_gid,set_quote_id,fabric_id,supplier_id,supplier_sku,ordered_metres,paid_at)
        values(p_order,packet->'manufacturing'->>'setQuoteId',cloth->>'fabricId',source->>'supplierId',source->>'supplierSku',(cloth->>'orderedMetres')::numeric,(p_manifest->>'paidAt')::timestamptz)
        on conflict do nothing;
      end loop;
    end if;
  end loop;
  return '{"duplicate":false}'::jsonb;
end;
$$;
create function curtainsuk_private.claim_cushion_draft_creation(p_owner text,p_key text) returns boolean
language plpgsql set search_path = '' as $$
begin
  if not exists(select 1 from curtainsuk_private.cushion_checkout_groups where idempotency_key=p_key and owner_session_hash=p_owner) then raise exception 'CUSHION_OWNER_MISMATCH'; end if;
  insert into curtainsuk_private.cushion_draft_creation_claims(idempotency_key) values(p_key) on conflict do nothing;
  return found;
end;
$$;
revoke all on function curtainsuk_private.claim_cushion_draft_creation(text,text) from public,anon,authenticated;
grant execute on function curtainsuk_private.claim_cushion_draft_creation(text,text) to service_role;
create function curtainsuk_private.cushion_usage_since(p_supplier text,p_sku text,p_observed timestamptz) returns numeric
language sql stable set search_path = '' as $$
  select coalesce(sum(usage.ordered_metres),0) from curtainsuk_private.cushion_stock_usage usage
  where usage.supplier_id=p_supplier and usage.supplier_sku=p_sku and usage.paid_at>p_observed;
$$;
revoke all on function curtainsuk_private.cushion_usage_since(text,text,timestamptz) from public,anon,authenticated;
grant execute on function curtainsuk_private.cushion_usage_since(text,text,timestamptz) to service_role;
revoke all on function curtainsuk_private.save_cushion_design(text,jsonb,integer), curtainsuk_private.commit_cushion_checkout(text,text,jsonb,jsonb), curtainsuk_private.record_cushion_paid_manifest(text,jsonb) from public, anon, authenticated;
grant execute on function curtainsuk_private.save_cushion_design(text,jsonb,integer), curtainsuk_private.commit_cushion_checkout(text,text,jsonb,jsonb), curtainsuk_private.record_cushion_paid_manifest(text,jsonb) to service_role;

-- Server-role functions are SECURITY INVOKER. Browser roles have no access.
commit;
