-- CurtainsUK Phase 4G: supplier-neutral Fabric Master.
-- PostgreSQL is the canonical private intelligence layer; Shopify receives only
-- the explicit customer-safe projection produced by server-side application code.

-- The custom schema must be visible to PostgREST for the service-role-only
-- repository. Table grants and forced RLS below still deny anon/authenticated.
alter role authenticator set pgrst.db_schemas = 'public, graphql_public, curtainsuk_private';
notify pgrst, 'reload config';

revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

alter table curtainsuk_private.supplier_sync_runs
  add constraint supplier_sync_runs_supplier_fk
  foreign key (supplier_id) references curtainsuk_private.suppliers (supplier_id);

alter table curtainsuk_private.supplier_snapshots
  add constraint supplier_snapshots_supplier_fk
  foreign key (supplier_id) references curtainsuk_private.suppliers (supplier_id),
  add constraint supplier_snapshots_aggregate_nonnegative
  check (aggregate_available_quantity is null or aggregate_available_quantity >= 0),
  add constraint supplier_snapshots_due_nonnegative
  check (next_due_quantity is null or next_due_quantity >= 0);

alter table curtainsuk_private.supplier_snapshot_prices
  add constraint supplier_snapshot_prices_standard_nonnegative
  check (standard_trade_price is null or standard_trade_price >= 0),
  add constraint supplier_snapshot_prices_cut_nonnegative
  check (cut_trade_price is null or cut_trade_price >= 0);

alter table curtainsuk_private.supplier_snapshot_batches
  add constraint supplier_snapshot_batches_quantity_nonnegative
  check (batch_available_quantity is null or batch_available_quantity >= 0),
  add constraint supplier_snapshot_batches_pieces_nonnegative
  check (pieces is null or pieces >= 0);

create table curtainsuk_private.supplier_brands (
  brand_id text primary key,
  supplier_id text not null references curtainsuk_private.suppliers (supplier_id),
  display_name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index supplier_brands_supplier_idx
  on curtainsuk_private.supplier_brands (supplier_id, display_name);

create table curtainsuk_private.fabric_collections (
  collection_id text primary key,
  supplier_id text not null references curtainsuk_private.suppliers (supplier_id),
  brand_id text not null references curtainsuk_private.supplier_brands (brand_id),
  supplier_collection_code text,
  display_name text not null,
  lifecycle_state text not null check (lifecycle_state in ('CURRENT', 'DISCONTINUED', 'UNKNOWN')) default 'UNKNOWN',
  source_type text not null,
  source_name text not null,
  source_reference text,
  source_effective_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (supplier_id, brand_id, display_name)
);

create index fabric_collections_brand_idx
  on curtainsuk_private.fabric_collections (brand_id, display_name);

create table curtainsuk_private.fabric_designs (
  design_id text primary key,
  supplier_id text not null references curtainsuk_private.suppliers (supplier_id),
  brand_id text not null references curtainsuk_private.supplier_brands (brand_id),
  collection_id text references curtainsuk_private.fabric_collections (collection_id),
  supplier_design_code text not null,
  display_name text not null,
  full_width_mm integer check (full_width_mm is null or full_width_mm > 0),
  usable_width_mm integer check (usable_width_mm is null or usable_width_mm > 0),
  vertical_repeat_mm integer check (vertical_repeat_mm is null or vertical_repeat_mm >= 0),
  horizontal_repeat_mm integer check (horizontal_repeat_mm is null or horizontal_repeat_mm >= 0),
  pattern_match_type text check (pattern_match_type is null or pattern_match_type in ('RANDOM_MATCH', 'STRAIGHT_MATCH', 'HALF_DROP_MATCH')),
  composition jsonb not null default '[]'::jsonb check (jsonb_typeof(composition) = 'array'),
  weight_gsm numeric(10, 2) check (weight_gsm is null or weight_gsm >= 0),
  care_instructions text[] not null default '{}',
  usage_suitability text[] not null default '{}',
  source_type text not null,
  source_name text not null,
  source_reference text,
  source_effective_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (supplier_id, supplier_design_code)
);

create index fabric_designs_collection_idx
  on curtainsuk_private.fabric_designs (collection_id, display_name);

create table curtainsuk_private.fabric_colourways (
  fabric_id text primary key,
  supplier_id text not null references curtainsuk_private.suppliers (supplier_id),
  brand_id text not null references curtainsuk_private.supplier_brands (brand_id),
  design_id text not null references curtainsuk_private.fabric_designs (design_id),
  supplier_sku text not null,
  colourway_code text,
  colour_name text not null,
  imagery jsonb not null default '[]'::jsonb check (jsonb_typeof(imagery) = 'array'),
  sample_available boolean,
  lifecycle_state text not null check (lifecycle_state in ('CURRENT', 'DISCONTINUED', 'UNKNOWN')) default 'UNKNOWN',
  price_verification_status text not null check (price_verification_status in ('VERIFIED', 'PRICE_REQUIRES_VERIFICATION')) default 'PRICE_REQUIRES_VERIFICATION',
  storefront_selectable boolean not null default false,
  source_type text not null,
  source_name text not null,
  source_reference text,
  source_effective_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (supplier_id, supplier_sku)
);

create index fabric_colourways_design_idx
  on curtainsuk_private.fabric_colourways (design_id, colour_name);
create index fabric_colourways_projection_idx
  on curtainsuk_private.fabric_colourways (storefront_selectable, lifecycle_state, price_verification_status);

create table curtainsuk_private.fabric_catalogue_import_runs (
  import_id text primary key,
  supplier_id text not null references curtainsuk_private.suppliers (supplier_id),
  source_type text not null,
  source_name text not null,
  source_reference text,
  source_sha256 text not null check (source_sha256 ~ '^[a-f0-9]{64}$'),
  source_effective_date date,
  imported_at timestamptz not null,
  row_count integer not null check (row_count >= 0),
  inserted_count integer not null check (inserted_count >= 0),
  updated_count integer not null check (updated_count >= 0),
  rejected_count integer not null check (rejected_count >= 0),
  shopify_writes integer not null check (shopify_writes = 0),
  created_at timestamptz not null default now()
);

create index fabric_catalogue_import_runs_supplier_idx
  on curtainsuk_private.fabric_catalogue_import_runs (supplier_id, imported_at desc);

create table curtainsuk_private.fabric_catalogue_observations (
  observation_id text primary key,
  import_id text not null references curtainsuk_private.fabric_catalogue_import_runs (import_id),
  supplier_id text not null references curtainsuk_private.suppliers (supplier_id),
  fabric_id text not null references curtainsuk_private.fabric_colourways (fabric_id),
  supplier_sku text not null,
  lifecycle_state text not null check (lifecycle_state in ('CURRENT', 'DISCONTINUED', 'UNKNOWN')),
  price_verification_status text not null check (price_verification_status in ('VERIFIED', 'PRICE_REQUIRES_VERIFICATION')),
  public_record_sha256 text not null check (public_record_sha256 ~ '^[a-f0-9]{64}$'),
  source_row_number integer,
  observed_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index fabric_catalogue_observations_history_idx
  on curtainsuk_private.fabric_catalogue_observations (supplier_id, supplier_sku, observed_at desc);

create or replace function curtainsuk_private.apply_fabric_catalogue_batch(
  p_import jsonb,
  p_items jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  item_row record;
  item jsonb;
  affected integer;
  inserted_total integer := 0;
  updated_total integer := 0;
begin
  if jsonb_typeof(p_items) <> 'array' then
    raise exception 'p_items must be an array';
  end if;
  if jsonb_array_length(p_items) <> (p_import->>'row_count')::integer then
    raise exception 'catalogue row count does not match import metadata';
  end if;
  if not exists (
    select 1 from curtainsuk_private.suppliers
    where supplier_id = p_import->>'supplier_id'
  ) then
    raise exception 'unknown supplier';
  end if;

  insert into curtainsuk_private.fabric_catalogue_import_runs
    (import_id, supplier_id, source_type, source_name, source_reference, source_sha256,
     source_effective_date, imported_at, row_count, inserted_count, updated_count,
     rejected_count, shopify_writes)
  values
    (p_import->>'import_id', p_import->>'supplier_id', p_import->>'source_type',
     p_import->>'source_name', p_import->>'source_reference', p_import->>'source_sha256',
     (p_import->>'source_effective_date')::date, (p_import->>'imported_at')::timestamptz,
     (p_import->>'row_count')::integer, (p_import->>'inserted_count')::integer,
     (p_import->>'updated_count')::integer, (p_import->>'rejected_count')::integer, 0);

  for item_row in select value from jsonb_array_elements(p_items)
  loop
    item := item_row.value;
    if (item->>'supplier_id') <> (p_import->>'supplier_id') then
      raise exception 'catalogue item supplier mismatch';
    end if;

    insert into curtainsuk_private.supplier_brands
      (brand_id, supplier_id, display_name, active)
    values
      (item->>'brand_id', item->>'supplier_id', item->>'brand_name', true)
    on conflict (brand_id) do update set
      display_name = excluded.display_name,
      active = true,
      updated_at = now()
    where curtainsuk_private.supplier_brands.supplier_id = excluded.supplier_id;

    insert into curtainsuk_private.fabric_collections
      (collection_id, supplier_id, brand_id, supplier_collection_code, display_name,
       lifecycle_state, source_type, source_name, source_reference, source_effective_date)
    values
      (item->>'collection_id', item->>'supplier_id', item->>'brand_id',
       item->>'supplier_collection_code', item->>'collection_name',
       coalesce(item->>'collection_lifecycle_state', 'UNKNOWN'), p_import->>'source_type',
       p_import->>'source_name', p_import->>'source_reference',
       (p_import->>'source_effective_date')::date)
    on conflict (collection_id) do update set
      supplier_collection_code = excluded.supplier_collection_code,
      display_name = excluded.display_name,
      lifecycle_state = excluded.lifecycle_state,
      source_type = excluded.source_type,
      source_name = excluded.source_name,
      source_reference = excluded.source_reference,
      source_effective_date = excluded.source_effective_date,
      updated_at = now()
    where curtainsuk_private.fabric_collections.supplier_id = excluded.supplier_id
      and curtainsuk_private.fabric_collections.brand_id = excluded.brand_id;

    insert into curtainsuk_private.fabric_designs
      (design_id, supplier_id, brand_id, collection_id, supplier_design_code,
       display_name, full_width_mm, usable_width_mm, vertical_repeat_mm,
       horizontal_repeat_mm, pattern_match_type, composition, weight_gsm,
       care_instructions, usage_suitability, source_type, source_name,
       source_reference, source_effective_date)
    values
      (item->>'design_id', item->>'supplier_id', item->>'brand_id', item->>'collection_id',
       item->>'supplier_design_code', item->>'design_name',
       (item->>'full_width_mm')::integer, (item->>'usable_width_mm')::integer,
       (item->>'vertical_repeat_mm')::integer, (item->>'horizontal_repeat_mm')::integer,
       item->>'pattern_match_type', coalesce(item->'composition', '[]'::jsonb),
       (item->>'weight_gsm')::numeric,
       coalesce(array(select jsonb_array_elements_text(item->'care_instructions')), '{}'),
       coalesce(array(select jsonb_array_elements_text(item->'usage_suitability')), '{}'),
       p_import->>'source_type', p_import->>'source_name', p_import->>'source_reference',
       (p_import->>'source_effective_date')::date)
    on conflict (design_id) do update set
      collection_id = excluded.collection_id,
      supplier_design_code = excluded.supplier_design_code,
      display_name = excluded.display_name,
      full_width_mm = excluded.full_width_mm,
      usable_width_mm = excluded.usable_width_mm,
      vertical_repeat_mm = excluded.vertical_repeat_mm,
      horizontal_repeat_mm = excluded.horizontal_repeat_mm,
      pattern_match_type = excluded.pattern_match_type,
      composition = excluded.composition,
      weight_gsm = excluded.weight_gsm,
      care_instructions = excluded.care_instructions,
      usage_suitability = excluded.usage_suitability,
      source_type = excluded.source_type,
      source_name = excluded.source_name,
      source_reference = excluded.source_reference,
      source_effective_date = excluded.source_effective_date,
      updated_at = now()
    where curtainsuk_private.fabric_designs.supplier_id = excluded.supplier_id
      and curtainsuk_private.fabric_designs.brand_id = excluded.brand_id;

    select count(*) into affected
    from curtainsuk_private.fabric_colourways
    where supplier_id = item->>'supplier_id'
      and supplier_sku = item->>'supplier_sku';
    if affected = 0 then inserted_total := inserted_total + 1;
    else updated_total := updated_total + 1;
    end if;

    insert into curtainsuk_private.fabric_colourways
      (fabric_id, supplier_id, brand_id, design_id, supplier_sku, colourway_code,
       colour_name, imagery, sample_available, lifecycle_state,
       price_verification_status, storefront_selectable, source_type, source_name,
       source_reference, source_effective_date)
    values
      (item->>'fabric_id', item->>'supplier_id', item->>'brand_id', item->>'design_id',
       item->>'supplier_sku', item->>'colourway_code', item->>'colour_name',
       coalesce(item->'imagery', '[]'::jsonb), (item->>'sample_available')::boolean,
       coalesce(item->>'lifecycle_state', 'UNKNOWN'),
       coalesce(item->>'price_verification_status', 'PRICE_REQUIRES_VERIFICATION'),
       coalesce((item->>'storefront_selectable')::boolean, false),
       p_import->>'source_type', p_import->>'source_name', p_import->>'source_reference',
       (p_import->>'source_effective_date')::date)
    on conflict (supplier_id, supplier_sku) do update set
      brand_id = excluded.brand_id,
      design_id = excluded.design_id,
      colourway_code = excluded.colourway_code,
      colour_name = excluded.colour_name,
      imagery = excluded.imagery,
      sample_available = excluded.sample_available,
      lifecycle_state = excluded.lifecycle_state,
      price_verification_status = case
        when curtainsuk_private.fabric_colourways.price_verification_status = 'VERIFIED'
          then 'VERIFIED'
        else excluded.price_verification_status
      end,
      storefront_selectable = excluded.storefront_selectable,
      source_type = excluded.source_type,
      source_name = excluded.source_name,
      source_reference = excluded.source_reference,
      source_effective_date = excluded.source_effective_date,
      updated_at = now();

    insert into curtainsuk_private.fabric_supplier_links
      (supplier_id, supplier_sku, brand_id, fabric_spec_id, price_verification_status)
    values
      (item->>'supplier_id', item->>'supplier_sku', item->>'brand_id', item->>'fabric_id',
       coalesce(item->>'price_verification_status', 'PRICE_REQUIRES_VERIFICATION'))
    on conflict (supplier_id, supplier_sku) do update set
      brand_id = excluded.brand_id,
      fabric_spec_id = excluded.fabric_spec_id,
      price_verification_status = case
        when curtainsuk_private.fabric_supplier_links.price_verification_status = 'VERIFIED'
          then 'VERIFIED'
        else excluded.price_verification_status
      end;

    insert into curtainsuk_private.fabric_catalogue_observations
      (observation_id, import_id, supplier_id, fabric_id, supplier_sku,
       lifecycle_state, price_verification_status, public_record_sha256,
       source_row_number, observed_at)
    values
      (item->>'observation_id', p_import->>'import_id', item->>'supplier_id',
       item->>'fabric_id', item->>'supplier_sku', item->>'lifecycle_state',
       item->>'price_verification_status', item->>'public_record_sha256',
       (item->>'source_row_number')::integer, (p_import->>'imported_at')::timestamptz);
  end loop;

  if inserted_total <> (p_import->>'inserted_count')::integer
     or updated_total <> (p_import->>'updated_count')::integer then
    raise exception 'catalogue diff counts changed since preview';
  end if;

  return jsonb_build_object(
    'inserted', inserted_total,
    'updated', updated_total,
    'rejected', (p_import->>'rejected_count')::integer,
    'shopify_writes', 0
  );
end;
$$;

revoke execute on function curtainsuk_private.apply_fabric_catalogue_batch(jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function curtainsuk_private.apply_fabric_catalogue_batch(jsonb, jsonb)
  to service_role;

create or replace function curtainsuk_private.promote_fabric_for_staging_projection(
  p_supplier_id text,
  p_supplier_sku text,
  p_snapshot_id text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from curtainsuk_private.supplier_snapshots s
    join curtainsuk_private.supplier_snapshot_prices p on p.snapshot_id = s.snapshot_id
    join curtainsuk_private.supplier_promotion_events e on e.snapshot_id = s.snapshot_id
    where s.snapshot_id = p_snapshot_id
      and s.supplier_id = p_supplier_id
      and s.supplier_sku = p_supplier_sku
      and s.validation_status = 'VALIDATED'
      and s.lifecycle_state <> 'DISCONTINUED'
      and p.cut_trade_price is not null
      and p.currency = 'GBP'
      and (s.price_expires_at is null or s.price_expires_at > now())
      and e.promotion_state = 'APPROVED_FOR_PROJECTION'
  ) then
    raise exception 'Approved, current, verified supplier price is required';
  end if;

  update curtainsuk_private.fabric_supplier_links
  set price_verification_status = 'VERIFIED'
  where supplier_id = p_supplier_id and supplier_sku = p_supplier_sku;

  update curtainsuk_private.fabric_colourways
  set price_verification_status = 'VERIFIED', storefront_selectable = true, updated_at = now()
  where supplier_id = p_supplier_id and supplier_sku = p_supplier_sku and lifecycle_state = 'CURRENT';
end;
$$;

revoke execute on function curtainsuk_private.promote_fabric_for_staging_projection(text, text, text)
  from public, anon, authenticated;
grant execute on function curtainsuk_private.promote_fabric_for_staging_projection(text, text, text)
  to service_role;

create trigger fabric_catalogue_import_runs_append_only
before update or delete on curtainsuk_private.fabric_catalogue_import_runs
for each row execute function curtainsuk_private.reject_supplier_audit_mutation();

create trigger fabric_catalogue_observations_append_only
before update or delete on curtainsuk_private.fabric_catalogue_observations
for each row execute function curtainsuk_private.reject_supplier_audit_mutation();

alter table curtainsuk_private.supplier_brands enable row level security;
alter table curtainsuk_private.fabric_collections enable row level security;
alter table curtainsuk_private.fabric_designs enable row level security;
alter table curtainsuk_private.fabric_colourways enable row level security;
alter table curtainsuk_private.fabric_catalogue_import_runs enable row level security;
alter table curtainsuk_private.fabric_catalogue_observations enable row level security;

alter table curtainsuk_private.supplier_brands force row level security;
alter table curtainsuk_private.fabric_collections force row level security;
alter table curtainsuk_private.fabric_designs force row level security;
alter table curtainsuk_private.fabric_colourways force row level security;
alter table curtainsuk_private.fabric_catalogue_import_runs force row level security;
alter table curtainsuk_private.fabric_catalogue_observations force row level security;

revoke all on curtainsuk_private.supplier_brands,
  curtainsuk_private.fabric_collections,
  curtainsuk_private.fabric_designs,
  curtainsuk_private.fabric_colourways,
  curtainsuk_private.fabric_catalogue_import_runs,
  curtainsuk_private.fabric_catalogue_observations
from public, anon, authenticated;

grant select, insert, update on curtainsuk_private.supplier_brands,
  curtainsuk_private.fabric_collections,
  curtainsuk_private.fabric_designs,
  curtainsuk_private.fabric_colourways,
  curtainsuk_private.fabric_supplier_links
to service_role;

grant select, insert on curtainsuk_private.fabric_catalogue_import_runs,
  curtainsuk_private.fabric_catalogue_observations
to service_role;

insert into curtainsuk_private.supplier_brands (brand_id, supplier_id, display_name)
values
  ('prestigious-textiles', 'prestigious-textiles', 'Prestigious Textiles'),
  ('sdg-sanderson', 'sanderson-design-group', 'Sanderson'),
  ('sdg-morris-co', 'sanderson-design-group', 'Morris & Co.'),
  ('sdg-harlequin', 'sanderson-design-group', 'Harlequin'),
  ('sdg-zoffany', 'sanderson-design-group', 'Zoffany'),
  ('sdg-scion', 'sanderson-design-group', 'Scion'),
  ('sdg-clarke-clarke', 'sanderson-design-group', 'Clarke & Clarke')
on conflict (brand_id) do nothing;

insert into curtainsuk_private.supplier_freshness_policies
  (policy_id, supplier_id, source_type, data_type, freshness_minutes, effective_from)
values
  ('pt-webtex-stock-historical-v1', 'prestigious-textiles', 'MANUAL_PORTAL', 'STOCK', 1440, '2026-09-01T00:00:00Z'),
  ('pt-webtex-price-historical-v1', 'prestigious-textiles', 'MANUAL_PORTAL', 'PRICE', 10080, '2026-09-01T00:00:00Z'),
  ('pt-webtex-lifecycle-historical-v1', 'prestigious-textiles', 'MANUAL_PORTAL', 'LIFECYCLE', 4320, '2026-09-01T00:00:00Z'),
  ('sdg-file-price-v1', 'sanderson-design-group', 'OFFICIAL_CSV', 'PRICE', 10080, '2026-09-07T00:00:00Z'),
  ('sdg-file-lifecycle-v1', 'sanderson-design-group', 'OFFICIAL_CSV', 'LIFECYCLE', 4320, '2026-09-07T00:00:00Z'),
  ('sdg-portal-stock-v1', 'sanderson-design-group', 'MANUAL_PORTAL', 'STOCK', 1440, '2026-09-07T00:00:00Z'),
  ('sdg-portal-price-v1', 'sanderson-design-group', 'MANUAL_PORTAL', 'PRICE', 10080, '2026-09-07T00:00:00Z'),
  ('sdg-portal-lifecycle-v1', 'sanderson-design-group', 'MANUAL_PORTAL', 'LIFECYCLE', 4320, '2026-09-07T00:00:00Z')
on conflict (policy_id) do nothing;

insert into curtainsuk_private.supplier_approval_policies
  (policy_id, supplier_id, approval_mode, required_price_field, effective_from)
values
  ('sdg-manual-approval-v1', 'sanderson-design-group', 'MANUAL', 'CUT_TRADE_PRICE', '2026-09-07T00:00:00Z')
on conflict (policy_id) do nothing;

insert into curtainsuk_private.supplier_validation_policies
  (policy_id, supplier_id, allowed_currencies, allowed_stock_units, effective_from)
values
  ('sdg-validation-v1', 'sanderson-design-group', array['GBP'], array['METRE'], '2026-09-07T00:00:00Z')
on conflict (policy_id) do nothing;
