-- CurtainsUK Phase 5B: source-accurate catalogue history and revision-bound,
-- non-destructive Fabric Master merges. This remains private and performs no
-- Shopify/customer projection writes.

alter table curtainsuk_private.fabric_designs
  alter column supplier_design_code drop not null;

alter table curtainsuk_private.fabric_designs
  drop constraint if exists fabric_designs_supplier_id_supplier_design_code_key;

create unique index if not exists fabric_designs_supplier_code_unique_idx
  on curtainsuk_private.fabric_designs (supplier_id, supplier_design_code)
  where supplier_design_code is not null;

alter table curtainsuk_private.fabric_collections
  add column if not exists source_observed_at timestamptz;
alter table curtainsuk_private.fabric_designs
  add column if not exists source_observed_at timestamptz;
alter table curtainsuk_private.fabric_colourways
  add column if not exists source_observed_at timestamptz;
alter table curtainsuk_private.fabric_catalogue_import_runs
  add column if not exists source_observed_at timestamptz;
alter table curtainsuk_private.fabric_colourways
  add column if not exists staging_catalog_visible boolean not null default false;

update curtainsuk_private.fabric_colourways
set staging_catalog_visible = true
where storefront_selectable and not staging_catalog_visible;

create index if not exists fabric_colourways_staging_catalog_idx
  on curtainsuk_private.fabric_colourways (staging_catalog_visible, supplier_id, brand_id)
  where staging_catalog_visible;

update curtainsuk_private.fabric_collections
set source_observed_at = coalesce(source_observed_at, source_effective_date::timestamp at time zone 'UTC', created_at)
where source_observed_at is null;
update curtainsuk_private.fabric_designs
set source_observed_at = coalesce(source_observed_at, source_effective_date::timestamp at time zone 'UTC', created_at)
where source_observed_at is null;
update curtainsuk_private.fabric_colourways
set source_observed_at = coalesce(source_observed_at, source_effective_date::timestamp at time zone 'UTC', created_at)
where source_observed_at is null;
-- The existing import-run rows are append-only. Temporarily suspend only their
-- mutation trigger inside this migration transaction for this deterministic
-- provenance backfill, then restore it before any application writes can run.
alter table curtainsuk_private.fabric_catalogue_import_runs
  disable trigger fabric_catalogue_import_runs_append_only;
update curtainsuk_private.fabric_catalogue_import_runs
set source_observed_at = coalesce(source_observed_at, source_effective_date::timestamp at time zone 'UTC', imported_at)
where source_observed_at is null;
alter table curtainsuk_private.fabric_catalogue_import_runs
  enable trigger fabric_catalogue_import_runs_append_only;

alter table curtainsuk_private.fabric_collections alter column source_observed_at set not null;
alter table curtainsuk_private.fabric_designs alter column source_observed_at set not null;
alter table curtainsuk_private.fabric_colourways alter column source_observed_at set not null;
alter table curtainsuk_private.fabric_catalogue_import_runs alter column source_observed_at set not null;

alter table curtainsuk_private.fabric_catalogue_observations
  add column if not exists normalized_record jsonb not null default '{}'::jsonb,
  add column if not exists merge_action text not null default 'LEGACY',
  add column if not exists protected_fields text[] not null default '{}',
  add column if not exists history_complete boolean not null default false;

alter table curtainsuk_private.fabric_catalogue_observations
  drop constraint if exists fabric_catalogue_observations_normalized_record_object,
  drop constraint if exists fabric_catalogue_observations_merge_action_check;
alter table curtainsuk_private.fabric_catalogue_observations
  add constraint fabric_catalogue_observations_normalized_record_object
    check (jsonb_typeof(normalized_record) = 'object'),
  add constraint fabric_catalogue_observations_merge_action_check
    check (merge_action in ('LEGACY', 'INSERT', 'UPDATE'));

create table if not exists curtainsuk_private.fabric_catalogue_merge_conflicts (
  conflict_id text primary key,
  observation_id text not null references curtainsuk_private.fabric_catalogue_observations (observation_id),
  supplier_id text not null references curtainsuk_private.suppliers (supplier_id),
  supplier_sku text not null,
  conflicting_fields text[] not null check (cardinality(conflicting_fields) > 0),
  existing_values jsonb not null check (jsonb_typeof(existing_values) = 'object'),
  incoming_values jsonb not null check (jsonb_typeof(incoming_values) = 'object'),
  review_state text not null default 'PENDING' check (review_state in ('PENDING', 'APPROVED', 'REJECTED')),
  resolved_by uuid,
  resolved_at timestamptz,
  resolution_reason text,
  created_at timestamptz not null default now(),
  check (
    (review_state = 'PENDING' and resolved_by is null and resolved_at is null)
    or (review_state in ('APPROVED', 'REJECTED') and resolved_by is not null and resolved_at is not null and resolution_reason is not null)
  )
);

create index if not exists fabric_catalogue_merge_conflicts_pending_idx
  on curtainsuk_private.fabric_catalogue_merge_conflicts (supplier_id, review_state, created_at desc);

alter table curtainsuk_private.fabric_catalogue_merge_conflicts enable row level security;
alter table curtainsuk_private.fabric_catalogue_merge_conflicts force row level security;
revoke all on curtainsuk_private.fabric_catalogue_merge_conflicts from public, anon, authenticated;
grant select, insert, update on curtainsuk_private.fabric_catalogue_merge_conflicts to service_role;

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
  current_colourway curtainsuk_private.fabric_colourways%rowtype;
  current_exists boolean;
  source_observed timestamptz;
  expected_updated_at timestamptz;
  merge_action text;
  protected_fields text[];
  conflict_fields text[];
  inserted_total integer := 0;
  updated_total integer := 0;
  conflict_total integer := 0;
  claimed_inserts integer;
  claimed_updates integer;
begin
  if jsonb_typeof(p_items) <> 'array' then
    raise exception 'p_items must be an array';
  end if;
  if jsonb_array_length(p_items) <> (p_import->>'row_count')::integer then
    raise exception 'catalogue row count does not match import metadata';
  end if;
  source_observed := nullif(p_import->>'source_observed_at', '')::timestamptz;
  if source_observed is null then
    raise exception 'catalogue source_observed_at is required';
  end if;
  if source_observed > (p_import->>'imported_at')::timestamptz + interval '5 minutes' then
    raise exception 'catalogue source observation cannot be later than import';
  end if;
  if not exists (
    select 1 from curtainsuk_private.suppliers
    where supplier_id = p_import->>'supplier_id'
  ) then
    raise exception 'unknown supplier';
  end if;

  select
    count(*) filter (where value->>'merge_action' = 'INSERT'),
    count(*) filter (where value->>'merge_action' = 'UPDATE')
  into claimed_inserts, claimed_updates
  from jsonb_array_elements(p_items);
  if claimed_inserts + claimed_updates <> jsonb_array_length(p_items)
     or claimed_inserts <> (p_import->>'inserted_count')::integer
     or claimed_updates <> (p_import->>'updated_count')::integer then
    raise exception 'catalogue merge actions do not match preview metadata';
  end if;

  insert into curtainsuk_private.fabric_catalogue_import_runs
    (import_id, supplier_id, source_type, source_name, source_reference, source_sha256,
     source_effective_date, source_observed_at, imported_at, row_count, inserted_count,
     updated_count, rejected_count, shopify_writes)
  values
    (p_import->>'import_id', p_import->>'supplier_id', p_import->>'source_type',
     p_import->>'source_name', p_import->>'source_reference', p_import->>'source_sha256',
     (p_import->>'source_effective_date')::date, source_observed,
     (p_import->>'imported_at')::timestamptz, (p_import->>'row_count')::integer,
     (p_import->>'inserted_count')::integer, (p_import->>'updated_count')::integer,
     (p_import->>'rejected_count')::integer, 0);

  for item_row in select value from jsonb_array_elements(p_items)
  loop
    item := item_row.value;
    merge_action := item->>'merge_action';
    protected_fields := coalesce(array(select jsonb_array_elements_text(coalesce(item->'protected_fields', '[]'::jsonb))), '{}');
    conflict_fields := '{}';
    if item->>'supplier_id' <> p_import->>'supplier_id' then
      raise exception 'catalogue item supplier mismatch';
    end if;
    if item->>'supplier_design_code' like 'SDG-CATALOGUE-%' then
      raise exception 'derived code cannot be stored as a supplier design code';
    end if;

    select * into current_colourway
    from curtainsuk_private.fabric_colourways
    where supplier_id = item->>'supplier_id'
      and supplier_sku = item->>'supplier_sku'
    for update;
    current_exists := found;
    if merge_action = 'INSERT' and current_exists then
      raise exception 'catalogue insert collision for supplier SKU %', item->>'supplier_sku';
    end if;
    if merge_action = 'UPDATE' and not current_exists then
      raise exception 'catalogue update target disappeared for supplier SKU %', item->>'supplier_sku';
    end if;
    if merge_action = 'UPDATE' then
      expected_updated_at := nullif(item->>'expected_existing_updated_at', '')::timestamptz;
      if expected_updated_at is null or expected_updated_at <> current_colourway.updated_at then
        raise exception 'catalogue current-master revision changed for supplier SKU %', item->>'supplier_sku';
      end if;
      if current_colourway.fabric_id <> item->>'fabric_id' then
        raise exception 'catalogue stable fabric ID mismatch for supplier SKU %', item->>'supplier_sku';
      end if;
      if source_observed < current_colourway.source_observed_at then
        protected_fields := array_append(protected_fields, '*');
      end if;
      if current_colourway.price_verification_status = 'VERIFIED'
         and coalesce(item->>'price_verification_status', 'PRICE_REQUIRES_VERIFICATION') <> 'VERIFIED' then
        protected_fields := array_append(protected_fields, 'price_verification_status');
        conflict_fields := array_append(conflict_fields, 'price_verification_status');
      end if;
      if current_colourway.storefront_selectable
         and not coalesce((item->>'storefront_selectable')::boolean, false) then
        protected_fields := array_append(protected_fields, 'storefront_selectable');
        conflict_fields := array_append(conflict_fields, 'storefront_selectable');
      end if;
      if current_colourway.lifecycle_state <> 'UNKNOWN'
         and coalesce(item->>'lifecycle_state', 'UNKNOWN') = 'UNKNOWN' then
        protected_fields := array_append(protected_fields, 'lifecycle_state');
      end if;
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
       lifecycle_state, source_type, source_name, source_reference, source_effective_date,
       source_observed_at)
    values
      (item->>'collection_id', item->>'supplier_id', item->>'brand_id',
       item->>'supplier_collection_code', item->>'collection_name',
       coalesce(item->>'collection_lifecycle_state', 'UNKNOWN'), p_import->>'source_type',
       p_import->>'source_name', p_import->>'source_reference',
       (p_import->>'source_effective_date')::date, source_observed)
    on conflict (collection_id) do update set
      supplier_collection_code = coalesce(excluded.supplier_collection_code, curtainsuk_private.fabric_collections.supplier_collection_code),
      display_name = excluded.display_name,
      lifecycle_state = case
        when excluded.lifecycle_state = 'UNKNOWN' and curtainsuk_private.fabric_collections.lifecycle_state <> 'UNKNOWN'
          then curtainsuk_private.fabric_collections.lifecycle_state
        else excluded.lifecycle_state
      end,
      source_type = excluded.source_type,
      source_name = excluded.source_name,
      source_reference = excluded.source_reference,
      source_effective_date = excluded.source_effective_date,
      source_observed_at = excluded.source_observed_at,
      updated_at = now()
    where curtainsuk_private.fabric_collections.supplier_id = excluded.supplier_id
      and curtainsuk_private.fabric_collections.brand_id = excluded.brand_id
      and excluded.source_observed_at >= curtainsuk_private.fabric_collections.source_observed_at;

    insert into curtainsuk_private.fabric_designs
      (design_id, supplier_id, brand_id, collection_id, supplier_design_code,
       display_name, full_width_mm, usable_width_mm, vertical_repeat_mm,
       horizontal_repeat_mm, pattern_match_type, composition, weight_gsm,
       care_instructions, usage_suitability, source_type, source_name,
       source_reference, source_effective_date, source_observed_at)
    values
      (item->>'design_id', item->>'supplier_id', item->>'brand_id', item->>'collection_id',
       nullif(item->>'supplier_design_code', ''), item->>'design_name',
       nullif(item->>'full_width_mm', '')::integer, nullif(item->>'usable_width_mm', '')::integer,
       nullif(item->>'vertical_repeat_mm', '')::integer, nullif(item->>'horizontal_repeat_mm', '')::integer,
       nullif(item->>'pattern_match_type', ''), coalesce(item->'composition', '[]'::jsonb),
       nullif(item->>'weight_gsm', '')::numeric,
       coalesce(array(select jsonb_array_elements_text(coalesce(item->'care_instructions', '[]'::jsonb))), '{}'),
       coalesce(array(select jsonb_array_elements_text(coalesce(item->'usage_suitability', '[]'::jsonb))), '{}'),
       p_import->>'source_type', p_import->>'source_name', p_import->>'source_reference',
       (p_import->>'source_effective_date')::date, source_observed)
    on conflict (design_id) do update set
      collection_id = excluded.collection_id,
      supplier_design_code = coalesce(curtainsuk_private.fabric_designs.supplier_design_code, excluded.supplier_design_code),
      display_name = excluded.display_name,
      full_width_mm = coalesce(excluded.full_width_mm, curtainsuk_private.fabric_designs.full_width_mm),
      usable_width_mm = coalesce(excluded.usable_width_mm, curtainsuk_private.fabric_designs.usable_width_mm),
      vertical_repeat_mm = coalesce(excluded.vertical_repeat_mm, curtainsuk_private.fabric_designs.vertical_repeat_mm),
      horizontal_repeat_mm = coalesce(excluded.horizontal_repeat_mm, curtainsuk_private.fabric_designs.horizontal_repeat_mm),
      pattern_match_type = coalesce(excluded.pattern_match_type, curtainsuk_private.fabric_designs.pattern_match_type),
      composition = case when jsonb_array_length(excluded.composition) = 0 then curtainsuk_private.fabric_designs.composition else excluded.composition end,
      weight_gsm = coalesce(excluded.weight_gsm, curtainsuk_private.fabric_designs.weight_gsm),
      care_instructions = case when cardinality(excluded.care_instructions) = 0 then curtainsuk_private.fabric_designs.care_instructions else excluded.care_instructions end,
      usage_suitability = case when cardinality(excluded.usage_suitability) = 0 then curtainsuk_private.fabric_designs.usage_suitability else excluded.usage_suitability end,
      source_type = excluded.source_type,
      source_name = excluded.source_name,
      source_reference = excluded.source_reference,
      source_effective_date = excluded.source_effective_date,
      source_observed_at = excluded.source_observed_at,
      updated_at = now()
    where curtainsuk_private.fabric_designs.supplier_id = excluded.supplier_id
      and curtainsuk_private.fabric_designs.brand_id = excluded.brand_id
      and excluded.source_observed_at >= curtainsuk_private.fabric_designs.source_observed_at;

    insert into curtainsuk_private.fabric_colourways
      (fabric_id, supplier_id, brand_id, design_id, supplier_sku, colourway_code,
       colour_name, imagery, sample_available, lifecycle_state,
       price_verification_status, storefront_selectable, staging_catalog_visible, source_type, source_name,
       source_reference, source_effective_date, source_observed_at)
    values
      (item->>'fabric_id', item->>'supplier_id', item->>'brand_id', item->>'design_id',
       item->>'supplier_sku', item->>'colourway_code', item->>'colour_name',
       coalesce(item->'imagery', '[]'::jsonb), nullif(item->>'sample_available', '')::boolean,
       coalesce(item->>'lifecycle_state', 'UNKNOWN'),
       coalesce(item->>'price_verification_status', 'PRICE_REQUIRES_VERIFICATION'),
       coalesce((item->>'storefront_selectable')::boolean, false),
       coalesce((item->>'staging_catalog_visible')::boolean, false),
       p_import->>'source_type', p_import->>'source_name', p_import->>'source_reference',
       (p_import->>'source_effective_date')::date, source_observed)
    on conflict (supplier_id, supplier_sku) do update set
      brand_id = excluded.brand_id,
      design_id = excluded.design_id,
      colourway_code = coalesce(excluded.colourway_code, curtainsuk_private.fabric_colourways.colourway_code),
      colour_name = excluded.colour_name,
      imagery = case when jsonb_array_length(excluded.imagery) = 0 then curtainsuk_private.fabric_colourways.imagery else excluded.imagery end,
      sample_available = coalesce(excluded.sample_available, curtainsuk_private.fabric_colourways.sample_available),
      lifecycle_state = case
        when excluded.lifecycle_state = 'UNKNOWN' and curtainsuk_private.fabric_colourways.lifecycle_state <> 'UNKNOWN'
          then curtainsuk_private.fabric_colourways.lifecycle_state
        else excluded.lifecycle_state
      end,
      price_verification_status = case
        when curtainsuk_private.fabric_colourways.price_verification_status = 'VERIFIED' then 'VERIFIED'
        else excluded.price_verification_status
      end,
      storefront_selectable = curtainsuk_private.fabric_colourways.storefront_selectable or excluded.storefront_selectable,
      staging_catalog_visible = curtainsuk_private.fabric_colourways.staging_catalog_visible or excluded.staging_catalog_visible,
      source_type = excluded.source_type,
      source_name = excluded.source_name,
      source_reference = excluded.source_reference,
      source_effective_date = excluded.source_effective_date,
      source_observed_at = excluded.source_observed_at,
      updated_at = now()
    where excluded.source_observed_at >= curtainsuk_private.fabric_colourways.source_observed_at;

    insert into curtainsuk_private.fabric_supplier_links
      (supplier_id, supplier_sku, brand_id, fabric_spec_id, price_verification_status)
    values
      (item->>'supplier_id', item->>'supplier_sku',
       (select brand_id from curtainsuk_private.fabric_colourways
        where supplier_id = item->>'supplier_id' and supplier_sku = item->>'supplier_sku'),
       (select fabric_id from curtainsuk_private.fabric_colourways
        where supplier_id = item->>'supplier_id' and supplier_sku = item->>'supplier_sku'),
       coalesce(item->>'price_verification_status', 'PRICE_REQUIRES_VERIFICATION'))
    on conflict (supplier_id, supplier_sku) do update set
      brand_id = (select brand_id from curtainsuk_private.fabric_colourways
                  where supplier_id = excluded.supplier_id and supplier_sku = excluded.supplier_sku),
      fabric_spec_id = (select fabric_id from curtainsuk_private.fabric_colourways
                        where supplier_id = excluded.supplier_id and supplier_sku = excluded.supplier_sku),
      price_verification_status = case
        when curtainsuk_private.fabric_supplier_links.price_verification_status = 'VERIFIED' then 'VERIFIED'
        else excluded.price_verification_status
      end;

    insert into curtainsuk_private.fabric_catalogue_observations
      (observation_id, import_id, supplier_id, fabric_id, supplier_sku,
       lifecycle_state, price_verification_status, public_record_sha256,
       source_row_number, observed_at, normalized_record, merge_action,
       protected_fields, history_complete)
    values
      (item->>'observation_id', p_import->>'import_id', item->>'supplier_id',
       item->>'fabric_id', item->>'supplier_sku', item->>'lifecycle_state',
       item->>'price_verification_status', item->>'public_record_sha256',
       nullif(item->>'source_row_number', '')::integer, source_observed, item,
       merge_action, coalesce((select array_agg(distinct field) from unnest(protected_fields) field), '{}'), true);

    if cardinality(conflict_fields) > 0 then
      insert into curtainsuk_private.fabric_catalogue_merge_conflicts
        (conflict_id, observation_id, supplier_id, supplier_sku, conflicting_fields,
         existing_values, incoming_values)
      values
        ((item->>'observation_id') || ':commercial-conflict', item->>'observation_id',
         item->>'supplier_id', item->>'supplier_sku',
         (select array_agg(distinct field) from unnest(conflict_fields) field),
         jsonb_build_object(
           'price_verification_status', current_colourway.price_verification_status,
           'storefront_selectable', current_colourway.storefront_selectable
         ),
         jsonb_build_object(
           'price_verification_status', item->>'price_verification_status',
           'storefront_selectable', item->>'storefront_selectable'
         ));
      conflict_total := conflict_total + 1;
    end if;

    if merge_action = 'INSERT' then inserted_total := inserted_total + 1;
    else updated_total := updated_total + 1;
    end if;
  end loop;

  if inserted_total <> (p_import->>'inserted_count')::integer
     or updated_total <> (p_import->>'updated_count')::integer then
    raise exception 'catalogue diff counts changed since preview';
  end if;

  return jsonb_build_object(
    'inserted', inserted_total,
    'updated', updated_total,
    'conflicts_awaiting_review', conflict_total,
    'rejected', (p_import->>'rejected_count')::integer,
    'shopify_writes', 0
  );
end;
$$;

revoke execute on function curtainsuk_private.apply_fabric_catalogue_batch(jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function curtainsuk_private.apply_fabric_catalogue_batch(jsonb, jsonb)
  to service_role;

-- Supplier links are an identity bridge, not an independently mutable master.
-- Force them to follow the retained colourway even when an older import is
-- observed and its colourway update is intentionally suppressed.
create or replace function curtainsuk_private.enforce_fabric_supplier_link_master_identity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  master_brand_id text;
  master_fabric_id text;
begin
  select brand_id, fabric_id into master_brand_id, master_fabric_id
  from curtainsuk_private.fabric_colourways
  where supplier_id = new.supplier_id and supplier_sku = new.supplier_sku;
  if not found then
    raise exception 'fabric supplier link requires a current Fabric Master colourway';
  end if;
  new.brand_id := master_brand_id;
  new.fabric_spec_id := master_fabric_id;
  return new;
end;
$$;

drop trigger if exists fabric_supplier_links_master_identity
  on curtainsuk_private.fabric_supplier_links;
create trigger fabric_supplier_links_master_identity
before insert or update of supplier_id, supplier_sku, brand_id, fabric_spec_id
on curtainsuk_private.fabric_supplier_links
for each row execute function curtainsuk_private.enforce_fabric_supplier_link_master_identity();

revoke execute on function curtainsuk_private.enforce_fabric_supplier_link_master_identity()
  from public, anon, authenticated;
grant execute on function curtainsuk_private.enforce_fabric_supplier_link_master_identity()
  to service_role;

notify pgrst, 'reload schema';
