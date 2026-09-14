-- Rollback-only fixture: no Shopify call, no committed receipt/order/stock usage.
begin;
do $$
declare
 h curtainsuk_private.staging_checkout_handoffs;
 s curtainsuk_private.staging_configuration_snapshots;
 payload jsonb;
 first_result jsonb;
 repeated jsonb;
 shipping_vat integer;
 rejected boolean;
begin
 select * into h from curtainsuk_private.staging_checkout_handoffs candidate
 where not exists(select 1 from curtainsuk_private.staging_checkout_executions e where e.handoff_id=candidate.handoff_id)
 order by handoff_id limit 1;
 if h.handoff_id is null then raise exception 'Fixture requires an unused existing handoff'; end if;
 select * into s from curtainsuk_private.staging_configuration_snapshots where snapshot_id=h.snapshot_id;
 shipping_vat := round(s.shipping_gross_amount_minor::numeric*s.vat_rate_basis_points/(10000+s.vat_rate_basis_points));
 payload := jsonb_build_object(
  'execution_id',gen_random_uuid(),'handoff_id',h.handoff_id,'snapshot_id',s.snapshot_id,
  'execution_mode','CREATE_PRODUCTION_DRAFT','execution_status','PRODUCTION_DRAFT_CREATED',
  'shopify_draft_order_gid','gid://shopify/DraftOrder/999999999999999',
  'shopify_draft_order_name','#ROLLBACK_ONLY_FIXTURE',
  'shopify_write_performed',true,'checkout_url_issued',true,'payment_enabled',true,
  'shop_domain','carpetup.myshopify.com','executed_by','ROLLBACK_ONLY_DATABASE_TEST',
  'financial_verification',jsonb_build_object(
   'currency','GBP','taxes_included',true,
   'goods_gross_amount_minor',s.customer_price_minor,'goods_vat_amount_minor',s.vat_amount_minor,
   'shipping_gross_amount_minor',s.shipping_gross_amount_minor,'shipping_vat_amount_minor',shipping_vat,
   'order_gross_amount_minor',s.customer_price_minor+s.shipping_gross_amount_minor,
   'order_vat_amount_minor',s.vat_amount_minor+shipping_vat,'discount_amount_minor',0));
 rejected:=false;
 begin
  perform curtainsuk_private.record_staging_checkout_execution(payload||jsonb_build_object('shop_domain','other.myshopify.com'));
 exception when others then rejected:=true; end;
 if not rejected then raise exception 'Wrong store accepted'; end if;
 rejected:=false;
 begin
  perform curtainsuk_private.record_staging_checkout_execution(payload||jsonb_build_object('execution_mode','CREATE_TEST_DRAFT'));
 exception when others then rejected:=true; end;
 if not rejected then raise exception 'Test mode enabled payment'; end if;
 first_result:=curtainsuk_private.record_staging_checkout_execution(payload);
 if first_result->>'payment_enabled' is distinct from 'true' then raise exception 'Production receipt not enabled'; end if;
 repeated:=curtainsuk_private.record_staging_checkout_execution(payload);
 if repeated->>'execution_id' is distinct from first_result->>'execution_id'
    or repeated->>'reused_receipt' is distinct from 'true' then raise exception 'Retry not idempotent'; end if;
 rejected:=false;
 begin
  perform curtainsuk_private.record_staging_checkout_execution(jsonb_set(payload,'{financial_verification,order_gross_amount_minor}','1'));
 exception when others then rejected:=true; end;
 if not rejected then raise exception 'Changed total accepted'; end if;
 rejected:=false;
 begin
  perform curtainsuk_private.record_staging_checkout_execution(payload||jsonb_build_object('shopify_draft_order_gid','gid://shopify/DraftOrder/999999999999998'));
 exception when others then rejected:=true; end;
 if not rejected then raise exception 'Different draft accepted for same handoff'; end if;
 rejected:=false;
 begin
  update curtainsuk_private.staging_checkout_executions set executed_by='CHANGED' where execution_id=(first_result->>'execution_id')::uuid;
 exception when others then rejected:=true; end;
 if not rejected then raise exception 'Immutable receipt updated'; end if;
end;
$$;
rollback;
select 'PASS: production receipt, exact total, wrong-store rejection, test isolation, idempotency and immutability' as result,
 count(*) filter(where executed_by='ROLLBACK_ONLY_DATABASE_TEST') as leftover_fixture_rows
from curtainsuk_private.staging_checkout_executions;
