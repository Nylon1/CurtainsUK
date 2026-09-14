begin;
-- Append-only executions gain an explicit production mode. Existing snapshots,
-- test receipts, one-shot creation claims, RLS and service-only access remain intact.
alter table curtainsuk_private.staging_checkout_executions
 add column shop_domain text,
 drop constraint staging_checkout_executions_execution_mode_check,
 drop constraint staging_checkout_executions_execution_status_check,
 drop constraint staging_checkout_executions_payment_enabled_check,
 drop constraint staging_checkout_executions_check;
alter table curtainsuk_private.staging_checkout_executions
 add constraint staging_checkout_executions_execution_mode_check
 check(execution_mode in ('CALCULATE_ONLY','CREATE_TEST_DRAFT','CREATE_PRODUCTION_DRAFT')),
 add constraint staging_checkout_executions_execution_status_check
 check(execution_status in ('CALCULATED','TEST_DRAFT_CREATED','EXISTING_TEST_DRAFT_REUSED','PRODUCTION_DRAFT_CREATED','EXISTING_PRODUCTION_DRAFT_REUSED')),
 add constraint staging_checkout_executions_payment_enabled_check
 check((execution_mode='CREATE_PRODUCTION_DRAFT' and payment_enabled and shop_domain is not null and shop_domain='carpetup.myshopify.com')
    or (execution_mode in ('CALCULATE_ONLY','CREATE_TEST_DRAFT') and not payment_enabled and shop_domain is null)),
 add constraint staging_checkout_executions_check check(
   (execution_status='CALCULATED' and execution_mode='CALCULATE_ONLY' and shopify_draft_order_gid is null and shopify_draft_order_name is null and not shopify_write_performed and not checkout_url_issued)
   or (
     coalesce(shopify_draft_order_gid,'') ~ '^gid://shopify/DraftOrder/[0-9]+$'
     and nullif(trim(shopify_draft_order_name),'') is not null and checkout_url_issued
     and (
       (execution_status='TEST_DRAFT_CREATED' and execution_mode='CREATE_TEST_DRAFT' and shopify_write_performed)
       or (execution_status='EXISTING_TEST_DRAFT_REUSED' and execution_mode='CREATE_TEST_DRAFT' and not shopify_write_performed)
       or (execution_status='PRODUCTION_DRAFT_CREATED' and execution_mode='CREATE_PRODUCTION_DRAFT' and shopify_write_performed)
       or (execution_status='EXISTING_PRODUCTION_DRAFT_REUSED' and execution_mode='CREATE_PRODUCTION_DRAFT' and not shopify_write_performed)
     )
   )
 );
drop index curtainsuk_private.staging_checkout_executions_terminal_handoff_unique;
create unique index staging_checkout_executions_terminal_handoff_unique
 on curtainsuk_private.staging_checkout_executions(handoff_id)
 where execution_status in ('TEST_DRAFT_CREATED','EXISTING_TEST_DRAFT_REUSED','PRODUCTION_DRAFT_CREATED','EXISTING_PRODUCTION_DRAFT_REUSED');
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
      'financial_verification', 'executed_by', 'shop_domain'
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
  if p_execution->>'execution_mode' = 'CREATE_PRODUCTION_DRAFT' then
    if (p_execution->>'payment_enabled')::boolean is distinct from true
       or p_execution->>'shop_domain' is distinct from 'carpetup.myshopify.com' then
      raise exception 'Production execution requires the approved production store';
    end if;
  elsif coalesce((p_execution->>'payment_enabled')::boolean, true) then
    raise exception 'Test execution cannot enable live payment';
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

  expected_shipping_vat := round(
    source_snapshot.shipping_gross_amount_minor::numeric * source_snapshot.vat_rate_basis_points
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

  if p_execution->>'execution_status' in ('TEST_DRAFT_CREATED', 'EXISTING_TEST_DRAFT_REUSED', 'PRODUCTION_DRAFT_CREATED', 'EXISTING_PRODUCTION_DRAFT_REUSED') then
    select * into existing
    from curtainsuk_private.staging_checkout_executions execution
    where execution.handoff_id = source_handoff.handoff_id
      and execution.execution_status in ('TEST_DRAFT_CREATED', 'EXISTING_TEST_DRAFT_REUSED', 'PRODUCTION_DRAFT_CREATED', 'EXISTING_PRODUCTION_DRAFT_REUSED')
    order by execution.executed_at asc, execution.execution_id asc
    limit 1;
    if existing.execution_id is not null then
      if existing.payment_enabled is distinct from (p_execution->>'payment_enabled')::boolean
         or existing.shop_domain is distinct from nullif(p_execution->>'shop_domain','')
         or existing.shopify_draft_order_gid is distinct from p_execution->>'shopify_draft_order_gid'
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
        'payment_enabled', existing.payment_enabled,
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
    shop_domain,
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
    (p_execution->>'payment_enabled')::boolean,
    nullif(p_execution->>'shop_domain',''),
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
    'payment_enabled', inserted.payment_enabled,
    'executed_at', inserted.executed_at,
    'reused_receipt', false
  );
end;
$$;

-- No public role can forge a production receipt. Service-side authenticated gates own this RPC.
revoke all on function curtainsuk_private.record_staging_checkout_execution(jsonb) from public,anon,authenticated;
grant execute on function curtainsuk_private.record_staging_checkout_execution(jsonb) to service_role;
notify pgrst, 'reload schema';
commit;
