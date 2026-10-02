create table if not exists curtainsuk_private.pt_august_2026_price_list (
  design_code text primary key check (design_code ~ '^[0-9]{4}$'),
  cut_price_gbp numeric(10,2) not null check (cut_price_gbp > 0),
  source_effective_date date not null,
  source_name text not null,
  source_sha256 text not null check (source_sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);

revoke all on curtainsuk_private.pt_august_2026_price_list from public, anon, authenticated;
grant select on curtainsuk_private.pt_august_2026_price_list to service_role;
