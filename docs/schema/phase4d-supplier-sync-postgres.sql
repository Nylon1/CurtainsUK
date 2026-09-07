-- Reference migration only. Do not apply to production from this phase.
-- Private schema: no storefront/client grants or policies should be added.

create schema if not exists curtainsuk_private;

create table if not exists curtainsuk_private.supplier_snapshots (
  snapshot_id text primary key,
  supplier_id text not null,
  brand_id text,
  supplier_sku text not null,
  checked_at timestamptz not null,
  verification_status text not null check (verification_status in ('VERIFIED', 'PARTIALLY_VERIFIED', 'UNVERIFIED')),
  snapshot jsonb not null,
  recorded_at timestamptz not null default now(),
  unique (supplier_id, supplier_sku, checked_at, snapshot_id)
);

create index if not exists supplier_snapshots_lookup_idx
  on curtainsuk_private.supplier_snapshots (supplier_id, supplier_sku, checked_at desc);

create table if not exists curtainsuk_private.supplier_sync_runs (
  run_id text primary key,
  supplier_id text not null,
  mode text not null check (mode = 'SHADOW'),
  started_at timestamptz not null,
  completed_at timestamptz not null,
  status text not null check (status in ('SUCCEEDED', 'FAILED')),
  snapshots_received integer not null check (snapshots_received >= 0),
  snapshots_appended integer not null check (snapshots_appended >= 0),
  error_code text,
  shopify_writes integer not null check (shopify_writes = 0),
  production_schedule_created boolean not null check (production_schedule_created = false),
  recorded_at timestamptz not null default now()
);

create or replace function curtainsuk_private.reject_supplier_audit_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Supplier sync audit records are append-only';
end;
$$;

drop trigger if exists supplier_snapshots_append_only on curtainsuk_private.supplier_snapshots;
create trigger supplier_snapshots_append_only
before update or delete on curtainsuk_private.supplier_snapshots
for each row execute function curtainsuk_private.reject_supplier_audit_mutation();

drop trigger if exists supplier_sync_runs_append_only on curtainsuk_private.supplier_sync_runs;
create trigger supplier_sync_runs_append_only
before update or delete on curtainsuk_private.supplier_sync_runs
for each row execute function curtainsuk_private.reject_supplier_audit_mutation();

alter table curtainsuk_private.supplier_snapshots enable row level security;
alter table curtainsuk_private.supplier_sync_runs enable row level security;

revoke all on schema curtainsuk_private from anon, authenticated;
revoke all on all tables in schema curtainsuk_private from anon, authenticated;
