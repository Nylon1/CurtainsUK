create or replace function curtainsuk_private.audit_daily_stock_revision() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='UPDATE' then
  if (new.supplier_id,new.supplier_sku,new.snapshot_date) is distinct from (old.supplier_id,old.supplier_sku,old.snapshot_date)
    or new.checked_at<=old.checked_at or new.source_snapshot_id=old.source_snapshot_id then
   raise exception 'NEWER_APPROVED_STOCK_OBSERVATION_REQUIRED';
  end if;
 end if;
  if not exists(select 1 from curtainsuk_private.supplier_snapshots s
    where s.snapshot_id=new.source_snapshot_id and s.supplier_id=new.supplier_id and s.supplier_sku=new.supplier_sku
    and s.checked_at=new.checked_at and s.checked_at<=now() and s.validation_status='VALIDATED'
    and (s.checked_at at time zone 'Europe/London')::date=new.snapshot_date
    and (s.normalized_payload->>'aggregate_available_quantity')::numeric=new.aggregate_metres
    and s.normalized_payload->>'stock_unit'='METRE'
    and new.cut_price_minor is not distinct from (case when s.normalized_payload->>'currency'='GBP' and (s.normalized_payload->>'cut_trade_price')::numeric>0 then round((s.normalized_payload->>'cut_trade_price')::numeric*100)::integer end)
    and coalesce(s.normalized_payload->>'lifecycle_state','UNKNOWN')=new.lifecycle_state
    and (select e.promotion_state from curtainsuk_private.supplier_promotion_events e where e.snapshot_id=s.snapshot_id order by e.created_at desc limit 1)='APPROVED_FOR_PROJECTION')
  then raise exception 'NEWER_APPROVED_STOCK_OBSERVATION_REQUIRED'; end if;
 insert into curtainsuk_private.daily_stock_snapshot_history
 (supplier_id,supplier_sku,snapshot_date,checked_at,source_snapshot_id,aggregate_metres,cut_price_minor,lifecycle_state)
 values(new.supplier_id,new.supplier_sku,new.snapshot_date,new.checked_at,new.source_snapshot_id,new.aggregate_metres,new.cut_price_minor,new.lifecycle_state)
 on conflict do nothing;
 return new;
end $$;
