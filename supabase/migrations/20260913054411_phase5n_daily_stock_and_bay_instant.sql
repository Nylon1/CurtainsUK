-- Private v1 daily aggregate stock. Existing supplier/commercial history is unchanged.
begin;
create table curtainsuk_private.daily_stock_snapshots (
 supplier_id text not null, supplier_sku text not null, snapshot_date date not null,
 checked_at timestamptz not null, source_snapshot_id text not null,
 aggregate_metres numeric not null check (aggregate_metres >= 0),
 cut_price_minor integer check (cut_price_minor > 0), lifecycle_state text not null,
 primary key(supplier_id,supplier_sku,snapshot_date)
);
create table curtainsuk_private.daily_stock_usage (
 order_reference text not null, configuration_id uuid not null, supplier_id text not null,
 supplier_sku text not null, metres numeric not null check (metres>0),
 confirmed_at timestamptz not null default now(), actor_id uuid not null,
 primary key(order_reference,configuration_id)
);
create index daily_stock_usage_lookup on curtainsuk_private.daily_stock_usage(supplier_id,supplier_sku,confirmed_at);
create table curtainsuk_private.daily_stock_runs (
 supplier_id text not null, snapshot_date date not null, attempted_at timestamptz not null default now(),
 status text not null check(status in ('SUCCESS','FAILED')), imported integer not null default 0,
 error_code text, primary key(supplier_id,snapshot_date)
);
alter table curtainsuk_private.daily_stock_snapshots enable row level security;
alter table curtainsuk_private.daily_stock_usage enable row level security;
alter table curtainsuk_private.daily_stock_runs enable row level security;
revoke all on curtainsuk_private.daily_stock_snapshots,curtainsuk_private.daily_stock_usage,curtainsuk_private.daily_stock_runs from public,anon,authenticated;
grant select,insert on curtainsuk_private.daily_stock_snapshots,curtainsuk_private.daily_stock_usage to service_role;
grant select,insert,update on curtainsuk_private.daily_stock_runs to service_role;

-- Materializes genuinely checked, approved observations only. It does not fetch
-- suppliers and never re-dates old observations as a successful refresh.
create function curtainsuk_private.materialize_daily_stock(p_now timestamptz default now()) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare supplier text; n integer; d date := (p_now at time zone 'Europe/London')::date; result jsonb := '[]';
begin
 perform pg_advisory_xact_lock(hashtext('curtainsuk-daily-stock-'||d));
 foreach supplier in array array['prestigious-textiles','sanderson-design-group'] loop
  if exists(select 1 from curtainsuk_private.daily_stock_runs where supplier_id=supplier and snapshot_date=d and status='SUCCESS') then continue; end if;
  insert into curtainsuk_private.daily_stock_snapshots
  select distinct on(s.supplier_id,s.supplier_sku) s.supplier_id,s.supplier_sku,d,s.checked_at,s.snapshot_id,
    (s.normalized_payload->>'aggregate_available_quantity')::numeric,
    case when s.normalized_payload->>'currency'='GBP' and (s.normalized_payload->>'cut_trade_price')::numeric>0 then round((s.normalized_payload->>'cut_trade_price')::numeric*100)::integer end,
    coalesce(s.normalized_payload->>'lifecycle_state','UNKNOWN')
  from curtainsuk_private.supplier_snapshots s
  where s.supplier_id=supplier and (s.checked_at at time zone 'Europe/London')::date=d and s.checked_at<=p_now
    and s.normalized_payload->>'stock_unit'='METRE'
    and (s.normalized_payload->>'aggregate_available_quantity')::numeric>=0
    and (select e.promotion_state from curtainsuk_private.supplier_promotion_events e where e.snapshot_id=s.snapshot_id order by e.created_at desc limit 1)='APPROVED_FOR_PROJECTION'
  order by s.supplier_id,s.supplier_sku,s.checked_at desc
  on conflict do nothing;
  get diagnostics n = row_count;
  insert into curtainsuk_private.daily_stock_runs(supplier_id,snapshot_date,attempted_at,status,imported,error_code)
  values(supplier,d,p_now,case when n>0 then 'SUCCESS' else 'FAILED' end,n,case when n=0 then 'NO_CURRENT_SUPPLIER_OBSERVATIONS' end)
  on conflict(supplier_id,snapshot_date) do update set attempted_at=excluded.attempted_at,status=excluded.status,imported=excluded.imported,error_code=excluded.error_code;
  result:=result||jsonb_build_object('supplier',supplier,'imported',n);
 end loop;
 return result;
end $$;
revoke all on function curtainsuk_private.materialize_daily_stock(timestamptz) from public,anon,authenticated;
grant execute on function curtainsuk_private.materialize_daily_stock(timestamptz) to service_role;

-- Consumption is relative to the last successful baseline. If refreshing fails,
-- do not restore yesterday's sold metres at midnight. The next baseline resets it.
create function curtainsuk_private.daily_stock_position(p_supplier text,p_sku text) returns jsonb
language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('aggregateMetres',s.aggregate_metres,'snapshotDate',s.snapshot_date,'checkedAt',s.checked_at,
 'cutPriceMinor',s.cut_price_minor,'discontinued',s.lifecycle_state='DISCONTINUED',
 'confirmedUsageMetres',coalesce((select sum(u.metres) from curtainsuk_private.daily_stock_usage u where u.supplier_id=p_supplier and u.supplier_sku=p_sku and u.confirmed_at>=s.checked_at),0),
 'refreshFailed',exists(select 1 from curtainsuk_private.daily_stock_runs r where r.supplier_id=p_supplier and r.status='FAILED' and r.snapshot_date>=s.snapshot_date))
 from curtainsuk_private.daily_stock_snapshots s where s.supplier_id=p_supplier and s.supplier_sku=p_sku order by s.snapshot_date desc limit 1;
$$;
revoke all on function curtainsuk_private.daily_stock_position(text,text) from public,anon,authenticated;
grant execute on function curtainsuk_private.daily_stock_position(text,text) to service_role;
commit;

-- Usage is confirmed by authorised supplier staff, never by Draft creation or a customer request.
create unique index daily_stock_usage_once_per_configuration on curtainsuk_private.daily_stock_usage(configuration_id);
create function curtainsuk_private.confirm_daily_stock_usage(p_configuration uuid,p_order text,p_actor uuid) returns boolean
language plpgsql security invoker set search_path='' as $$
declare s record; f record; existing text;
begin
 if p_order !~ '^gid://shopify/Order/[0-9]+$' or p_actor is null then raise exception 'CONFIRMED_ORDER_REQUIRED'; end if;
 perform pg_advisory_xact_lock(hashtext('curtainsuk-usage-'||p_configuration));
 select order_reference into existing from curtainsuk_private.daily_stock_usage where configuration_id=p_configuration;
 if found then
  if existing<>p_order then raise exception 'CONFIGURATION_ALREADY_CONSUMED'; end if;
  return false;
 end if;
 select * into strict s from curtainsuk_private.staging_configuration_snapshots where configuration_id=p_configuration;
 select * into strict f from curtainsuk_private.fabric_colourways where fabric_id=s.fabric_master_id;
 insert into curtainsuk_private.daily_stock_usage(order_reference,configuration_id,supplier_id,supplier_sku,metres,actor_id)
 values(p_order,p_configuration,f.supplier_id,s.supplier_sku,s.calculated_fabric_metres,p_actor);
 return true;
end $$;
revoke all on function curtainsuk_private.confirm_daily_stock_usage(uuid,text,uuid) from public,anon,authenticated;
grant execute on function curtainsuk_private.confirm_daily_stock_usage(uuid,text,uuid) to service_role;

-- Initial conversion preserves each genuine observation's original date/time.
insert into curtainsuk_private.daily_stock_snapshots
select distinct on(s.supplier_id,s.supplier_sku) s.supplier_id,s.supplier_sku,(s.checked_at at time zone 'Europe/London')::date,s.checked_at,s.snapshot_id,s.aggregate_available_quantity,
case when p.currency='GBP' and p.cut_trade_price>0 then round(p.cut_trade_price*100)::integer end,coalesce(s.normalized_payload->>'lifecycle_state','UNKNOWN')
from curtainsuk_private.supplier_snapshots s left join curtainsuk_private.supplier_snapshot_prices p using(snapshot_id)
where s.stock_unit='METRE' and s.aggregate_available_quantity>=0
and s.supplier_id in ('prestigious-textiles','sanderson-design-group')
and (select e.promotion_state from curtainsuk_private.supplier_promotion_events e where e.snapshot_id=s.snapshot_id order by e.created_at desc limit 1)='APPROVED_FOR_PROJECTION'
order by s.supplier_id,s.supplier_sku,s.checked_at desc on conflict do nothing;

-- Cloud schedule processes newly landed approved supplier data. Upstream portal
-- refresh remains blocked until an unattended authorised source is connected.
create extension if not exists pg_cron;
select cron.schedule('curtainsuk-staging-daily-stock','0 5,6 * * *',
$job$select curtainsuk_private.materialize_daily_stock() where extract(hour from now() at time zone 'Europe/London')=6;$job$);

create function curtainsuk_private.hide_daily_discontinued_fabric() returns trigger language plpgsql security invoker set search_path='' as $$ begin
if new.lifecycle_state='DISCONTINUED' then update curtainsuk_private.fabric_colourways set lifecycle_state='DISCONTINUED',staging_catalog_visible=false,storefront_selectable=false where supplier_id=new.supplier_id and supplier_sku=new.supplier_sku;end if;return new;end $$;
revoke all on function curtainsuk_private.hide_daily_discontinued_fabric() from public,anon,authenticated;
create trigger hide_daily_discontinued_fabric after insert on curtainsuk_private.daily_stock_snapshots for each row execute function curtainsuk_private.hide_daily_discontinued_fabric();
