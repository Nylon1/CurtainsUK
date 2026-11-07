-- A staff-approved customer and sample order may enter the automated follow-up journey.
create table curtainsuk_private.sample_to_sale_enrolments (
  customer_gid text primary key check (customer_gid ~ '^gid://shopify/Customer/[0-9]+$'),
  sample_order_gid text not null unique check (sample_order_gid ~ '^gid://shopify/Order/[0-9]+$'),
  enabled boolean not null default true,
  approved_by text not null,
  approved_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table curtainsuk_private.sample_to_sale_enrolments enable row level security;
revoke all on curtainsuk_private.sample_to_sale_enrolments from public, anon, authenticated;
grant select, insert, update on curtainsuk_private.sample_to_sale_enrolments to service_role;
