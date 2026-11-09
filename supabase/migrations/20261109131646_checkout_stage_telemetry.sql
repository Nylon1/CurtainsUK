-- Shopify Customer Events checkout stages. The API hashes checkout tokens and
-- event IDs before inserting; no token, address, contact, URL or discount code is retained.
create table curtainsuk_private.checkout_stage_events (
  event_hash text primary key check (event_hash ~ '^[a-f0-9]{64}$'),
  checkout_hash text not null check (checkout_hash ~ '^[a-f0-9]{64}$'),
  occurred_at timestamptz not null default now(),
  stage text not null check (stage in (
    'CHECKOUT_STARTED', 'CONTACT_SUBMITTED', 'ADDRESS_SUBMITTED',
    'SHIPPING_SUBMITTED', 'PAYMENT_SUBMITTED', 'CHECKOUT_COMPLETED')),
  product_mix text not null check (product_mix ~ '^(OTHER|SAMPLE|CURTAIN(_ROMAN)?(_CUSHION)?(_TRACK)?|ROMAN(_CUSHION)?(_TRACK)?|CUSHION(_TRACK)?|TRACK)$'),
  total_minor integer check (total_minor is null or total_minor between 0 and 100000000),
  shipping_minor integer check (shipping_minor is null or shipping_minor between 0 and 100000000),
  has_discount boolean not null default false,
  is_test boolean not null default false
);
create index checkout_stage_events_checkout_time on curtainsuk_private.checkout_stage_events(checkout_hash, occurred_at);
create index checkout_stage_events_recent on curtainsuk_private.checkout_stage_events(occurred_at desc, stage);
alter table curtainsuk_private.checkout_stage_events enable row level security;
alter table curtainsuk_private.checkout_stage_events force row level security;
revoke all on curtainsuk_private.checkout_stage_events from public, anon, authenticated;
grant select, insert, delete on curtainsuk_private.checkout_stage_events to service_role;

select cron.schedule('curtainsuk-checkout-stage-retention', '29 3 * * *',
  $$delete from curtainsuk_private.checkout_stage_events where occurred_at < now() - interval '30 days'$$);
