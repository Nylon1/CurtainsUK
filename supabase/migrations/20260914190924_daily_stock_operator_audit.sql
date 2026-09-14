-- Private append-only evidence of manual application; never fabricates source checks.
create table curtainsuk_private.daily_stock_refresh_events (
 event_id uuid primary key default gen_random_uuid(),
 operator_id uuid not null,
 snapshot_date date not null,
 completed_at timestamptz not null,
 supplier_results jsonb not null check (jsonb_typeof(supplier_results)='array')
);
alter table curtainsuk_private.daily_stock_refresh_events enable row level security;
revoke all on curtainsuk_private.daily_stock_refresh_events from public,anon,authenticated,service_role;
grant select,insert on curtainsuk_private.daily_stock_refresh_events to service_role;

create function curtainsuk_private.reject_daily_stock_audit_mutation() returns trigger
language plpgsql security invoker set search_path='' as $$
begin raise exception 'Daily stock refresh evidence is append-only'; end $$;
revoke all on function curtainsuk_private.reject_daily_stock_audit_mutation() from public,anon,authenticated;
create trigger daily_stock_refresh_immutable before update or delete on curtainsuk_private.daily_stock_refresh_events
for each row execute function curtainsuk_private.reject_daily_stock_audit_mutation();

create function curtainsuk_private.materialize_daily_stock_for_operator(p_operator uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare t timestamptz:=now(); d date:=(t at time zone 'Europe/London')::date; results jsonb; event uuid;
begin
 if p_operator is null then raise exception 'Authenticated operator required'; end if;
 perform curtainsuk_private.materialize_daily_stock(t);
 select coalesce(jsonb_agg(jsonb_build_object(
   'supplier_id',r.supplier_id,'status',r.status,'imported',r.imported,'error_code',r.error_code,
   'source_checked_at_latest',(select max(s.checked_at) from curtainsuk_private.daily_stock_snapshots s where s.supplier_id=r.supplier_id and s.snapshot_date=d)
 ) order by r.supplier_id),'[]'::jsonb) into results
 from curtainsuk_private.daily_stock_runs r where r.snapshot_date=d;
 insert into curtainsuk_private.daily_stock_refresh_events(operator_id,snapshot_date,completed_at,supplier_results)
 values(p_operator,d,clock_timestamp(),results) returning event_id into event;
 return jsonb_build_object('event_id',event,'operator_id',p_operator,'snapshot_date',d,'supplier_results',results);
end $$;
revoke all on function curtainsuk_private.materialize_daily_stock_for_operator(uuid) from public,anon,authenticated;
grant execute on function curtainsuk_private.materialize_daily_stock_for_operator(uuid) to service_role;
