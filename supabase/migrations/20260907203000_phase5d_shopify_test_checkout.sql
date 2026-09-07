begin;

-- Phase 5C handoffs are immutable declarations of intent. A later Shopify
-- calculate/create result is therefore appended here instead of mutating the
-- original record. Checkout URLs are deliberately not persisted because they
-- are customer capabilities; only the private Shopify Draft Order identity and
-- exact financial verification are retained.
create table curtainsuk_private.staging_checkout_executions (
  execution_id uuid primary key,
  handoff_id uuid not null references curtainsuk_private.staging_checkout_handoffs (handoff_id) on delete restrict,
  snapshot_id uuid not null references curtainsuk_private.staging_configuration_snapshots (snapshot_id) on delete restrict,
  execution_mode text not null check (execution_mode in ('CALCULATE_ONLY', 'CREATE_TEST_DRAFT')),
  execution_status text not null check (execution_status in (
    'CALCULATED',
    'TEST_DRAFT_CREATED',
    'EXISTING_TEST_DRAFT_REUSED'
  )),
  shopify_draft_order_gid text,
  shopify_draft_order_name text,
  shopify_write_performed boolean not null,
  checkout_url_issued boolean not null,
  payment_enabled boolean not null default false check (payment_enabled = false),
  financial_verification jsonb not null check (jsonb_typeof(financial_verification) = 'object'),
  executed_by text not null,
  executed_at timestamptz not null default clock_timestamp(),
  check (
    (execution_status = 'CALCULATED'
      and execution_mode = 'CALCULATE_ONLY'
      and shopify_draft_order_gid is null
      and shopify_draft_order_name is null
      and not shopify_write_performed
      and not checkout_url_issued)
    or
    (execution_status = 'TEST_DRAFT_CREATED'
      and execution_mode = 'CREATE_TEST_DRAFT'
      and coalesce(shopify_draft_order_gid, '') ~ '^gid://shopify/DraftOrder/[0-9]+$'
      and nullif(trim(shopify_draft_order_name), '') is not null
      and shopify_write_performed
      and checkout_url_issued)
    or
    (execution_status = 'EXISTING_TEST_DRAFT_REUSED'
      and execution_mode = 'CREATE_TEST_DRAFT'
      and coalesce(shopify_draft_order_gid, '') ~ '^gid://shopify/DraftOrder/[0-9]+$'
      and nullif(trim(shopify_draft_order_name), '') is not null
      and not shopify_write_performed
      and checkout_url_issued)
  )
);

create index staging_checkout_executions_handoff_idx
  on curtainsuk_private.staging_checkout_executions (handoff_id, executed_at desc);

create unique index staging_checkout_executions_terminal_handoff_unique
  on curtainsuk_private.staging_checkout_executions (handoff_id)
  where execution_status in ('TEST_DRAFT_CREATED', 'EXISTING_TEST_DRAFT_REUSED');

create unique index staging_checkout_executions_draft_gid_unique
  on curtainsuk_private.staging_checkout_executions (shopify_draft_order_gid)
  where shopify_draft_order_gid is not null;

create trigger staging_checkout_executions_append_only
before update or delete on curtainsuk_private.staging_checkout_executions
for each row execute function curtainsuk_private.reject_curtainsuk_immutable_mutation();

create or replace function curtainsuk_private.record_staging_checkout_execution(p_execution jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_handoff curtainsuk_private.staging_checkout_handoffs;
  source_snapshot curtainsuk_private.staging_configuration_snapshots;
  inserted curtainsuk_private.staging_checkout_executions;
  existing curtainsuk_private.staging_checkout_executions;
  expected_shipping_vat integer;
  expected_total_vat integer;
begin
  if jsonb_typeof(p_execution) <> 'object' then
    raise exception 'Checkout execution must be an object';
  end if;
  if exists (
    select 1 from jsonb_object_keys(p_execution) as execution_key(key)
    where execution_key.key not in (
      'execution_id', 'handoff_id', 'snapshot_id', 'execution_mode',
      'execution_status', 'shopify_draft_order_gid',
      'shopify_draft_order_name', 'shopify_write_performed',
      'checkout_url_issued', 'payment_enabled',
      'financial_verification', 'executed_by'
    )
  ) then
    raise exception 'Checkout execution contains unsupported fields';
  end if;
  if jsonb_typeof(p_execution->'financial_verification') <> 'object'
     or exists (
       select 1 from jsonb_object_keys(p_execution->'financial_verification') as financial_key(key)
       where financial_key.key not in (
         'currency', 'taxes_included', 'goods_gross_amount_minor',
         'goods_vat_amount_minor', 'shipping_gross_amount_minor',
         'shipping_vat_amount_minor', 'order_gross_amount_minor',
         'order_vat_amount_minor', 'discount_amount_minor'
       )
     ) then
    raise exception 'Checkout financial verification is invalid';
  end if;
  if nullif(trim(p_execution->>'executed_by'), '') is null then
    raise exception 'Checkout execution actor is required';
  end if;
  if coalesce((p_execution->>'payment_enabled')::boolean, true) then
    raise exception 'Live payment is disabled';
  end if;

  select * into source_handoff
  from curtainsuk_private.staging_checkout_handoffs
  where handoff_id = (p_execution->>'handoff_id')::uuid;
  if source_handoff.handoff_id is null then
    raise exception 'Unknown staging checkout handoff';
  end if;

  select * into source_snapshot
  from curtainsuk_private.staging_configuration_snapshots
  where snapshot_id = (p_execution->>'snapshot_id')::uuid
    and snapshot_id = source_handoff.snapshot_id;
  if source_snapshot.snapshot_id is null then
    raise exception 'Checkout execution snapshot does not match handoff';
  end if;

  expected_shipping_vat := source_snapshot.shipping_gross_amount_minor - round(
    source_snapshot.shipping_gross_amount_minor::numeric * 10000
      / (10000 + source_snapshot.vat_rate_basis_points)
  )::integer;
  expected_total_vat := source_snapshot.vat_amount_minor + expected_shipping_vat;

  if p_execution->'financial_verification'->>'currency' <> 'GBP'
     or coalesce((p_execution->'financial_verification'->>'taxes_included')::boolean, false) is not true
     or (p_execution->'financial_verification'->>'goods_gross_amount_minor')::integer <> source_snapshot.customer_price_minor
     or (p_execution->'financial_verification'->>'goods_vat_amount_minor')::integer <> source_snapshot.vat_amount_minor
     or (p_execution->'financial_verification'->>'shipping_gross_amount_minor')::integer <> source_snapshot.shipping_gross_amount_minor
     or (p_execution->'financial_verification'->>'shipping_vat_amount_minor')::integer <> expected_shipping_vat
     or (p_execution->'financial_verification'->>'order_gross_amount_minor')::integer
        <> source_snapshot.customer_price_minor + source_snapshot.shipping_gross_amount_minor
     or (p_execution->'financial_verification'->>'order_vat_amount_minor')::integer <> expected_total_vat
     or (p_execution->'financial_verification'->>'discount_amount_minor')::integer <> 0 then
    raise exception 'Checkout financial verification does not match immutable snapshot';
  end if;

  if p_execution->>'execution_status' in ('TEST_DRAFT_CREATED', 'EXISTING_TEST_DRAFT_REUSED') then
    select * into existing
    from curtainsuk_private.staging_checkout_executions execution
    where execution.handoff_id = source_handoff.handoff_id
      and execution.execution_status in ('TEST_DRAFT_CREATED', 'EXISTING_TEST_DRAFT_REUSED')
    order by execution.executed_at asc, execution.execution_id asc
    limit 1;
    if existing.execution_id is not null then
      if existing.shopify_draft_order_gid is distinct from p_execution->>'shopify_draft_order_gid'
         or existing.financial_verification is distinct from p_execution->'financial_verification' then
        raise exception 'Checkout handoff already points to a different Shopify Draft Order';
      end if;
      return jsonb_build_object(
        'execution_id', existing.execution_id,
        'handoff_id', existing.handoff_id,
        'snapshot_id', existing.snapshot_id,
        'execution_status', existing.execution_status,
        'shopify_draft_order_gid', existing.shopify_draft_order_gid,
        'shopify_draft_order_name', existing.shopify_draft_order_name,
        'shopify_write_performed', existing.shopify_write_performed,
        'payment_enabled', false,
        'executed_at', existing.executed_at,
        'reused_receipt', true
      );
    end if;
  end if;

  insert into curtainsuk_private.staging_checkout_executions (
    execution_id,
    handoff_id,
    snapshot_id,
    execution_mode,
    execution_status,
    shopify_draft_order_gid,
    shopify_draft_order_name,
    shopify_write_performed,
    checkout_url_issued,
    payment_enabled,
    financial_verification,
    executed_by,
    executed_at
  ) values (
    (p_execution->>'execution_id')::uuid,
    source_handoff.handoff_id,
    source_snapshot.snapshot_id,
    p_execution->>'execution_mode',
    p_execution->>'execution_status',
    nullif(trim(p_execution->>'shopify_draft_order_gid'), ''),
    nullif(trim(p_execution->>'shopify_draft_order_name'), ''),
    (p_execution->>'shopify_write_performed')::boolean,
    (p_execution->>'checkout_url_issued')::boolean,
    false,
    p_execution->'financial_verification',
    trim(p_execution->>'executed_by'),
    clock_timestamp()
  ) returning * into inserted;

  return jsonb_build_object(
    'execution_id', inserted.execution_id,
    'handoff_id', inserted.handoff_id,
    'snapshot_id', inserted.snapshot_id,
    'execution_status', inserted.execution_status,
    'shopify_draft_order_gid', inserted.shopify_draft_order_gid,
    'shopify_draft_order_name', inserted.shopify_draft_order_name,
    'shopify_write_performed', inserted.shopify_write_performed,
    'payment_enabled', false,
    'executed_at', inserted.executed_at,
    'reused_receipt', false
  );
end;
$$;

alter table curtainsuk_private.staging_checkout_executions enable row level security;
alter table curtainsuk_private.staging_checkout_executions force row level security;

revoke all on curtainsuk_private.staging_checkout_executions
from public, anon, authenticated, service_role;

grant select on curtainsuk_private.staging_checkout_executions to service_role;

revoke execute on function curtainsuk_private.record_staging_checkout_execution(jsonb)
from public, anon, authenticated, service_role;

grant execute on function curtainsuk_private.record_staging_checkout_execution(jsonb)
to service_role;

notify pgrst, 'reload schema';

commit;
