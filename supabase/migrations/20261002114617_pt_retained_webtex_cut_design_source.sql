create table if not exists curtainsuk_private.pt_retained_webtex_cut_design_price (
  design_code text primary key check (design_code ~ '^[0-9]{4}$'),
  cut_price_gbp numeric(10,2) not null check (cut_price_gbp > 0),
  observed_at timestamptz not null,
  source_name text not null,
  created_at timestamptz not null default now()
);
revoke all on curtainsuk_private.pt_retained_webtex_cut_design_price from public, anon, authenticated;
grant select on curtainsuk_private.pt_retained_webtex_cut_design_price to service_role;
