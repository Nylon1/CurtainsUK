-- CurtainsUK Phase 4E: private supplier intelligence and approval gate.
-- This migration is safe for a non-production Supabase project only until the
-- Phase 4E acceptance gate is signed off.

create schema if not exists curtainsuk_private;

revoke all on schema curtainsuk_private from public, anon, authenticated;
grant usage on schema curtainsuk_private to service_role;

create table curtainsuk_private.suppliers (
  supplier_id text primary key,
  display_name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table curtainsuk_private.fabric_supplier_links (
  supplier_id text not null references curtainsuk_private.suppliers (supplier_id),
  supplier_sku text not null,
  brand_id text,
  fabric_spec_id text not null,
  price_verification_status text not null check (price_verification_status in ('VERIFIED', 'PRICE_REQUIRES_VERIFICATION')),
  created_at timestamptz not null default now(),
  primary key (supplier_id, supplier_sku),
  unique (fabric_spec_id, supplier_id)
);

create table curtainsuk_private.supplier_freshness_policies (
  policy_id text primary key,
  supplier_id text not null references curtainsuk_private.suppliers (supplier_id),
  source_type text not null,
  data_type text not null check (data_type in ('STOCK', 'PRICE', 'LIFECYCLE')),
  freshness_minutes integer not null check (freshness_minutes > 0),
  effective_from timestamptz not null,
  created_at timestamptz not null default now()
);

create index supplier_freshness_policy_lookup_idx
  on curtainsuk_private.supplier_freshness_policies (supplier_id, source_type, data_type, effective_from desc);

create table curtainsuk_private.supplier_approval_policies (
  policy_id text primary key,
  supplier_id text not null references curtainsuk_private.suppliers (supplier_id),
  approval_mode text not null check (approval_mode in ('MANUAL', 'POLICY_BASED')),
  required_price_field text check (required_price_field in ('STANDARD_TRADE_PRICE', 'CUT_TRADE_PRICE') or required_price_field is null),
  effective_from timestamptz not null,
  created_at timestamptz not null default now()
);

create index supplier_approval_policy_lookup_idx
  on curtainsuk_private.supplier_approval_policies (supplier_id, effective_from desc);

create table curtainsuk_private.supplier_validation_policies (
  policy_id text primary key,
  supplier_id text not null references curtainsuk_private.suppliers (supplier_id),
  allowed_currencies text[] not null check (cardinality(allowed_currencies) > 0),
  allowed_stock_units text[] not null check (cardinality(allowed_stock_units) > 0),
  effective_from timestamptz not null,
  created_at timestamptz not null default now()
);

create index supplier_validation_policy_lookup_idx
  on curtainsuk_private.supplier_validation_policies (supplier_id, effective_from desc);

create table curtainsuk_private.supplier_sync_runs (
  run_id text primary key,
  supplier_id text not null,
  adapter_id text not null,
  mode text not null check (mode = 'SHADOW'),
  source_type text not null,
  source_name text not null,
  started_at timestamptz not null,
  completed_at timestamptz not null,
  status text not null check (status in ('SUCCEEDED', 'FAILED')),
  snapshots_received integer not null check (snapshots_received >= 0),
  snapshots_appended integer not null check (snapshots_appended >= 0),
  error_code text,
  shopify_writes integer not null check (shopify_writes = 0),
  production_schedule_created boolean not null check (production_schedule_created = false),
  created_at timestamptz not null default now()
);

create index supplier_sync_runs_health_idx
  on curtainsuk_private.supplier_sync_runs (supplier_id, completed_at desc);

create table curtainsuk_private.supplier_snapshots (
  snapshot_id text primary key,
  supplier_id text not null,
  brand_id text,
  supplier_sku text not null,
  run_id text not null references curtainsuk_private.supplier_sync_runs (run_id),
  checked_at timestamptz not null,
  stock_unit text,
  aggregate_available_quantity numeric(14, 4),
  next_due_date date,
  next_due_quantity numeric(14, 4),
  sample_available boolean,
  lifecycle_state text not null check (lifecycle_state in ('CURRENT', 'DISCONTINUED', 'UNKNOWN')),
  source_type text not null,
  source_name text not null,
  source_reference text,
  verification_status text not null check (verification_status in ('VERIFIED', 'PARTIALLY_VERIFIED', 'UNVERIFIED')),
  validation_status text not null check (validation_status in ('PENDING', 'VALIDATED', 'FAILED')) default 'PENDING',
  validation_errors jsonb not null default '[]'::jsonb check (jsonb_typeof(validation_errors) = 'array'),
  initial_promotion_state text not null check (initial_promotion_state = 'RAW_SHADOW') default 'RAW_SHADOW',
  stock_expires_at timestamptz,
  price_expires_at timestamptz,
  lifecycle_expires_at timestamptz,
  normalized_payload jsonb not null check (jsonb_typeof(normalized_payload) = 'object'),
  created_at timestamptz not null default now()
);

create index supplier_snapshots_history_idx
  on curtainsuk_private.supplier_snapshots (supplier_id, supplier_sku, checked_at desc);
create index supplier_snapshots_approval_queue_idx
  on curtainsuk_private.supplier_snapshots (validation_status, checked_at desc);
create index supplier_snapshots_expiry_idx
  on curtainsuk_private.supplier_snapshots (stock_expires_at, price_expires_at, lifecycle_expires_at);

create table curtainsuk_private.supplier_snapshot_prices (
  snapshot_id text primary key references curtainsuk_private.supplier_snapshots (snapshot_id),
  standard_trade_price numeric(14, 4),
  cut_trade_price numeric(14, 4),
  currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now(),
  check ((standard_trade_price is null and cut_trade_price is null) or currency is not null)
);

create table curtainsuk_private.supplier_snapshot_batches (
  snapshot_id text not null references curtainsuk_private.supplier_snapshots (snapshot_id),
  batch_ordinal integer not null check (batch_ordinal >= 0),
  batch_reference text,
  batch_available_quantity numeric(14, 4),
  pieces integer,
  created_at timestamptz not null default now(),
  primary key (snapshot_id, batch_ordinal),
  check (batch_reference is not null or (batch_available_quantity is null and pieces is null))
);

create table curtainsuk_private.supplier_promotion_events (
  event_id text primary key,
  snapshot_id text not null references curtainsuk_private.supplier_snapshots (snapshot_id),
  promotion_state text not null check (promotion_state in ('RAW_SHADOW', 'VALIDATED', 'APPROVED_FOR_PROJECTION', 'REJECTED', 'EXPIRED')),
  actor_type text not null check (actor_type in ('SYSTEM_VALIDATION', 'MANUAL_STAFF', 'POLICY')),
  actor_id uuid,
  reason text,
  rejection_reason text,
  previous_approved_snapshot_id text references curtainsuk_private.supplier_snapshots (snapshot_id),
  created_at timestamptz not null default now(),
  check (promotion_state <> 'REJECTED' or rejection_reason is not null),
  check (promotion_state <> 'APPROVED_FOR_PROJECTION' or reason is not null)
);

create index supplier_promotion_events_state_idx
  on curtainsuk_private.supplier_promotion_events (snapshot_id, created_at desc);

create or replace function curtainsuk_private.append_validated_supplier_snapshot(
  p_run jsonb,
  p_snapshot jsonb,
  p_validation_event jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  batch_row record;
begin
  insert into curtainsuk_private.supplier_sync_runs
    (run_id, supplier_id, adapter_id, mode, source_type, source_name, started_at, completed_at, status, snapshots_received, snapshots_appended, error_code, shopify_writes, production_schedule_created)
  values
    (p_run->>'run_id', p_run->>'supplier_id', p_run->>'adapter_id', p_run->>'mode', p_run->>'source_type', p_run->>'source_name',
     (p_run->>'started_at')::timestamptz, (p_run->>'completed_at')::timestamptz, p_run->>'status',
     (p_run->>'snapshots_received')::integer, (p_run->>'snapshots_appended')::integer, p_run->>'error_code',
     (p_run->>'shopify_writes')::integer, (p_run->>'production_schedule_created')::boolean);

  insert into curtainsuk_private.supplier_snapshots
    (snapshot_id, supplier_id, brand_id, supplier_sku, run_id, checked_at, stock_unit, aggregate_available_quantity,
     next_due_date, next_due_quantity, sample_available, lifecycle_state, source_type, source_name, source_reference,
     verification_status, validation_status, validation_errors, stock_expires_at, price_expires_at, lifecycle_expires_at, normalized_payload)
  values
    (p_snapshot->>'snapshot_id', p_snapshot->>'supplier_id', p_snapshot->>'brand_id', p_snapshot->>'supplier_sku', p_snapshot->>'run_id',
     (p_snapshot->>'checked_at')::timestamptz, p_snapshot->>'stock_unit', (p_snapshot->>'aggregate_available_quantity')::numeric,
     (p_snapshot->>'next_due_date')::date, (p_snapshot->>'next_due_quantity')::numeric, (p_snapshot->>'sample_available')::boolean,
     p_snapshot->>'lifecycle_state', p_snapshot->>'source_type', p_snapshot->>'source_name', p_snapshot->>'source_reference',
     p_snapshot->>'verification_status', p_snapshot->>'validation_status', p_snapshot->'validation_errors',
     (p_snapshot->>'stock_expires_at')::timestamptz, (p_snapshot->>'price_expires_at')::timestamptz,
     (p_snapshot->>'lifecycle_expires_at')::timestamptz, p_snapshot->'normalized_payload');

  if p_snapshot->>'validation_status' = 'VALIDATED' then
    insert into curtainsuk_private.supplier_snapshot_prices
      (snapshot_id, standard_trade_price, cut_trade_price, currency)
    values
      (p_snapshot->>'snapshot_id', (p_snapshot->>'standard_trade_price')::numeric, (p_snapshot->>'cut_trade_price')::numeric, p_snapshot->>'currency');
  end if;

  if p_snapshot->>'validation_status' = 'VALIDATED' and jsonb_typeof(p_snapshot->'batches') = 'array' then
    for batch_row in
      select value, ordinality - 1 as batch_ordinal
      from jsonb_array_elements(p_snapshot->'batches') with ordinality
    loop
      insert into curtainsuk_private.supplier_snapshot_batches
        (snapshot_id, batch_ordinal, batch_reference, batch_available_quantity, pieces)
      values
        (p_snapshot->>'snapshot_id', batch_row.batch_ordinal, batch_row.value->>'batch_reference',
         (batch_row.value->>'batch_available_quantity')::numeric, (batch_row.value->>'pieces')::integer);
    end loop;
  end if;

  insert into curtainsuk_private.supplier_promotion_events
    (event_id, snapshot_id, promotion_state, actor_type, actor_id, reason, rejection_reason, previous_approved_snapshot_id, created_at)
  values
    (p_validation_event->>'event_id', p_validation_event->>'snapshot_id', p_validation_event->>'promotion_state',
     p_validation_event->>'actor_type', (p_validation_event->>'actor_id')::uuid, p_validation_event->>'reason',
     p_validation_event->>'rejection_reason', p_validation_event->>'previous_approved_snapshot_id',
     (p_validation_event->>'created_at')::timestamptz);
end;
$$;

revoke execute on function curtainsuk_private.append_validated_supplier_snapshot(jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function curtainsuk_private.append_validated_supplier_snapshot(jsonb, jsonb, jsonb) to service_role;

create or replace function curtainsuk_private.reject_supplier_audit_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Supplier intelligence records are append-only';
end;
$$;

revoke execute on function curtainsuk_private.reject_supplier_audit_mutation() from public, anon, authenticated;

create trigger supplier_freshness_policies_append_only before update or delete on curtainsuk_private.supplier_freshness_policies
for each row execute function curtainsuk_private.reject_supplier_audit_mutation();
create trigger supplier_approval_policies_append_only before update or delete on curtainsuk_private.supplier_approval_policies
for each row execute function curtainsuk_private.reject_supplier_audit_mutation();
create trigger supplier_validation_policies_append_only before update or delete on curtainsuk_private.supplier_validation_policies
for each row execute function curtainsuk_private.reject_supplier_audit_mutation();
create trigger supplier_sync_runs_append_only before update or delete on curtainsuk_private.supplier_sync_runs
for each row execute function curtainsuk_private.reject_supplier_audit_mutation();
create trigger supplier_snapshots_append_only before update or delete on curtainsuk_private.supplier_snapshots
for each row execute function curtainsuk_private.reject_supplier_audit_mutation();
create trigger supplier_snapshot_prices_append_only before update or delete on curtainsuk_private.supplier_snapshot_prices
for each row execute function curtainsuk_private.reject_supplier_audit_mutation();
create trigger supplier_snapshot_batches_append_only before update or delete on curtainsuk_private.supplier_snapshot_batches
for each row execute function curtainsuk_private.reject_supplier_audit_mutation();
create trigger supplier_promotion_events_append_only before update or delete on curtainsuk_private.supplier_promotion_events
for each row execute function curtainsuk_private.reject_supplier_audit_mutation();

alter table curtainsuk_private.suppliers enable row level security;
alter table curtainsuk_private.fabric_supplier_links enable row level security;
alter table curtainsuk_private.supplier_freshness_policies enable row level security;
alter table curtainsuk_private.supplier_approval_policies enable row level security;
alter table curtainsuk_private.supplier_validation_policies enable row level security;
alter table curtainsuk_private.supplier_sync_runs enable row level security;
alter table curtainsuk_private.supplier_snapshots enable row level security;
alter table curtainsuk_private.supplier_snapshot_prices enable row level security;
alter table curtainsuk_private.supplier_snapshot_batches enable row level security;
alter table curtainsuk_private.supplier_promotion_events enable row level security;

alter table curtainsuk_private.suppliers force row level security;
alter table curtainsuk_private.fabric_supplier_links force row level security;
alter table curtainsuk_private.supplier_freshness_policies force row level security;
alter table curtainsuk_private.supplier_approval_policies force row level security;
alter table curtainsuk_private.supplier_validation_policies force row level security;
alter table curtainsuk_private.supplier_sync_runs force row level security;
alter table curtainsuk_private.supplier_snapshots force row level security;
alter table curtainsuk_private.supplier_snapshot_prices force row level security;
alter table curtainsuk_private.supplier_snapshot_batches force row level security;
alter table curtainsuk_private.supplier_promotion_events force row level security;

revoke all on all tables in schema curtainsuk_private from public, anon, authenticated;
revoke all on all sequences in schema curtainsuk_private from public, anon, authenticated;
grant select, insert on all tables in schema curtainsuk_private to service_role;
alter default privileges in schema curtainsuk_private revoke all on tables from public, anon, authenticated;
alter default privileges in schema curtainsuk_private revoke all on sequences from public, anon, authenticated;
alter default privileges in schema curtainsuk_private grant select, insert on tables to service_role;

insert into curtainsuk_private.suppliers (supplier_id, display_name)
values ('prestigious-textiles', 'Prestigious Textiles');

insert into curtainsuk_private.fabric_supplier_links
  (supplier_id, supplier_sku, brand_id, fabric_spec_id, price_verification_status)
values
  ('prestigious-textiles', '4269/147', 'prestigious-textiles', 'pt-4269-147', 'VERIFIED'),
  ('prestigious-textiles', '4269/658', 'prestigious-textiles', 'pt-4269-658', 'PRICE_REQUIRES_VERIFICATION'),
  ('prestigious-textiles', '4269/934', 'prestigious-textiles', 'pt-4269-934', 'PRICE_REQUIRES_VERIFICATION'),
  ('prestigious-textiles', '4269/975', 'prestigious-textiles', 'pt-4269-975', 'PRICE_REQUIRES_VERIFICATION'),
  ('prestigious-textiles', '4270/147', 'prestigious-textiles', 'pt-4270-147', 'VERIFIED'),
  ('prestigious-textiles', '4270/217', 'prestigious-textiles', 'pt-4270-217', 'PRICE_REQUIRES_VERIFICATION'),
  ('prestigious-textiles', '4270/658', 'prestigious-textiles', 'pt-4270-658', 'PRICE_REQUIRES_VERIFICATION'),
  ('prestigious-textiles', '4270/934', 'prestigious-textiles', 'pt-4270-934', 'PRICE_REQUIRES_VERIFICATION'),
  ('prestigious-textiles', '4270/975', 'prestigious-textiles', 'pt-4270-975', 'PRICE_REQUIRES_VERIFICATION'),
  ('prestigious-textiles', '4271/147', 'prestigious-textiles', 'pt-4271-147', 'VERIFIED'),
  ('prestigious-textiles', '4271/217', 'prestigious-textiles', 'pt-4271-217', 'PRICE_REQUIRES_VERIFICATION'),
  ('prestigious-textiles', '4271/658', 'prestigious-textiles', 'pt-4271-658', 'PRICE_REQUIRES_VERIFICATION'),
  ('prestigious-textiles', '4271/934', 'prestigious-textiles', 'pt-4271-934', 'PRICE_REQUIRES_VERIFICATION'),
  ('prestigious-textiles', '4271/975', 'prestigious-textiles', 'pt-4271-975', 'PRICE_REQUIRES_VERIFICATION'),
  ('prestigious-textiles', '4272/147', 'prestigious-textiles', 'pt-4272-147', 'PRICE_REQUIRES_VERIFICATION'),
  ('prestigious-textiles', '4272/217', 'prestigious-textiles', 'pt-4272-217', 'PRICE_REQUIRES_VERIFICATION'),
  ('prestigious-textiles', '4272/658', 'prestigious-textiles', 'pt-4272-658', 'PRICE_REQUIRES_VERIFICATION'),
  ('prestigious-textiles', '4272/934', 'prestigious-textiles', 'pt-4272-934', 'PRICE_REQUIRES_VERIFICATION'),
  ('prestigious-textiles', '4272/975', 'prestigious-textiles', 'pt-4272-975', 'PRICE_REQUIRES_VERIFICATION'),
  ('prestigious-textiles', '4273/147', 'prestigious-textiles', 'pt-4273-147', 'PRICE_REQUIRES_VERIFICATION');

insert into curtainsuk_private.supplier_freshness_policies
  (policy_id, supplier_id, source_type, data_type, freshness_minutes, effective_from)
values
  ('pt-webtex-stock-v1', 'prestigious-textiles', 'MANUAL_PORTAL', 'STOCK', 1440, '2026-09-07T00:00:00Z'),
  ('pt-webtex-price-v1', 'prestigious-textiles', 'MANUAL_PORTAL', 'PRICE', 10080, '2026-09-07T00:00:00Z'),
  ('pt-webtex-lifecycle-v1', 'prestigious-textiles', 'MANUAL_PORTAL', 'LIFECYCLE', 4320, '2026-09-07T00:00:00Z');

insert into curtainsuk_private.supplier_approval_policies
  (policy_id, supplier_id, approval_mode, required_price_field, effective_from)
values ('pt-manual-approval-v1', 'prestigious-textiles', 'MANUAL', 'CUT_TRADE_PRICE', '2026-09-07T00:00:00Z');

insert into curtainsuk_private.supplier_validation_policies
  (policy_id, supplier_id, allowed_currencies, allowed_stock_units, effective_from)
values ('pt-validation-v1', 'prestigious-textiles', array['GBP'], array['METRE'], '2026-09-07T00:00:00Z');

-- Supplier-commercial observations are intentionally not seeded from Git.
-- After this migration is applied, staff must append the three verified Mocha
-- observations through the private Prestigious Stock Check workflow. They enter
-- as validated shadow snapshots and still require an explicit promotion event.
