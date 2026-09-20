begin;

create table curtainsuk_private.mtm_paid_orders (
  paid_order_id uuid primary key,
  snapshot_id uuid not null unique references curtainsuk_private.staging_configuration_snapshots(snapshot_id) on delete restrict,
  shopify_order_gid text not null unique check (shopify_order_gid ~ '^gid://shopify/Order/[0-9]+$'),
  shopify_order_name text not null check (nullif(trim(shopify_order_name), '') is not null),
  shopify_draft_order_gid text,
  lifecycle_state text not null check (lifecycle_state in ('PAID','CURTAINSUK_REVIEW','APPROVED_FOR_MANUFACTURE','WORKROOM_RELEASED','CHANGE_REQUESTED','REJECTED')),
  paid_at timestamptz not null,
  change_request_window_ends_at timestamptz not null,
  webhook_payload_sha256 text not null check (webhook_payload_sha256 ~ '^[a-f0-9]{64}$'),
  recorded_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);

create table curtainsuk_private.mtm_paid_order_events (
  event_id uuid primary key,
  paid_order_id uuid not null references curtainsuk_private.mtm_paid_orders(paid_order_id) on delete restrict,
  from_state text,
  to_state text not null check (to_state in ('PAID','CURTAINSUK_REVIEW','APPROVED_FOR_MANUFACTURE','WORKROOM_RELEASED','CHANGE_REQUESTED','REJECTED')),
  actor_type text not null check (actor_type in ('SHOPIFY_WEBHOOK','STAFF')),
  actor_id text,
  reason text not null check (nullif(trim(reason), '') is not null),
  recorded_at timestamptz not null default clock_timestamp()
);

create table curtainsuk_private.mtm_workroom_release_packets (
  release_id uuid primary key,
  paid_order_id uuid not null unique references curtainsuk_private.mtm_paid_orders(paid_order_id) on delete restrict,
  snapshot_id uuid not null references curtainsuk_private.staging_configuration_snapshots(snapshot_id) on delete restrict,
  approved_by text not null check (nullif(trim(approved_by), '') is not null),
  approved_at timestamptz not null,
  released_at timestamptz not null default clock_timestamp(),
  release_note text not null check (nullif(trim(release_note), '') is not null)
);

alter table curtainsuk_private.mtm_paid_orders enable row level security;
alter table curtainsuk_private.mtm_paid_order_events enable row level security;
alter table curtainsuk_private.mtm_workroom_release_packets enable row level security;
revoke all on curtainsuk_private.mtm_paid_orders, curtainsuk_private.mtm_paid_order_events, curtainsuk_private.mtm_workroom_release_packets from public, anon, authenticated;

create or replace function curtainsuk_private.reject_mtm_paid_order_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'MTM paid-order lifecycle records are immutable outside controlled RPCs';
end;
$$;

create trigger mtm_paid_order_events_append_only
before update or delete on curtainsuk_private.mtm_paid_order_events
for each row execute function curtainsuk_private.reject_mtm_paid_order_mutation();
create trigger mtm_workroom_release_packets_append_only
before update or delete on curtainsuk_private.mtm_workroom_release_packets
for each row execute function curtainsuk_private.reject_mtm_paid_order_mutation();

create or replace function curtainsuk_private.record_mtm_paid_order(p_payment jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing curtainsuk_private.mtm_paid_orders;
  inserted curtainsuk_private.mtm_paid_orders;
begin
  if jsonb_typeof(p_payment) <> 'object'
    or exists (select 1 from jsonb_object_keys(p_payment) as key(name) where key.name not in ('paid_order_id','snapshot_id','shopify_order_gid','shopify_order_name','shopify_draft_order_gid','paid_at','webhook_payload_sha256')) then
    raise exception 'MTM paid-order payload is invalid';
  end if;
  select * into existing from curtainsuk_private.mtm_paid_orders where shopify_order_gid = p_payment->>'shopify_order_gid';
  if existing.paid_order_id is not null then
    if existing.snapshot_id <> (p_payment->>'snapshot_id')::uuid
      or existing.webhook_payload_sha256 <> p_payment->>'webhook_payload_sha256' then
      raise exception 'MTM paid-order webhook identity conflict';
    end if;
    return jsonb_build_object('paid_order_id', existing.paid_order_id, 'lifecycle_state', existing.lifecycle_state, 'reused', true);
  end if;
  insert into curtainsuk_private.mtm_paid_orders (
    paid_order_id, snapshot_id, shopify_order_gid, shopify_order_name, shopify_draft_order_gid,
    lifecycle_state, paid_at, change_request_window_ends_at, webhook_payload_sha256
  ) values (
    (p_payment->>'paid_order_id')::uuid, (p_payment->>'snapshot_id')::uuid,
    p_payment->>'shopify_order_gid', p_payment->>'shopify_order_name', nullif(p_payment->>'shopify_draft_order_gid',''),
    'PAID', (p_payment->>'paid_at')::timestamptz, (p_payment->>'paid_at')::timestamptz + interval '2 hours', p_payment->>'webhook_payload_sha256'
  ) returning * into inserted;
  insert into curtainsuk_private.mtm_paid_order_events(event_id, paid_order_id, from_state, to_state, actor_type, actor_id, reason)
  values(gen_random_uuid(), inserted.paid_order_id, null, 'PAID', 'SHOPIFY_WEBHOOK', null, 'Verified Shopify orders/paid webhook');
  return jsonb_build_object('paid_order_id', inserted.paid_order_id, 'lifecycle_state', inserted.lifecycle_state, 'reused', false);
end;
$$;

create or replace function curtainsuk_private.transition_mtm_paid_order(p_transition jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_order curtainsuk_private.mtm_paid_orders;
  target_state text := p_transition->>'to_state';
  changed curtainsuk_private.mtm_paid_orders;
begin
  if jsonb_typeof(p_transition) <> 'object'
    or exists (select 1 from jsonb_object_keys(p_transition) as key(name) where key.name not in ('paid_order_id','expected_state','to_state','actor_id','reason')) then
    raise exception 'MTM paid-order transition payload is invalid';
  end if;
  select * into current_order from curtainsuk_private.mtm_paid_orders where paid_order_id = (p_transition->>'paid_order_id')::uuid for update;
  if current_order.paid_order_id is null then raise exception 'MTM paid order not found'; end if;
  if current_order.lifecycle_state <> p_transition->>'expected_state' then raise exception 'MTM paid-order lifecycle conflict'; end if;
  if not (
    (current_order.lifecycle_state = 'PAID' and target_state in ('CURTAINSUK_REVIEW','CHANGE_REQUESTED'))
    or (current_order.lifecycle_state = 'CHANGE_REQUESTED' and target_state in ('CURTAINSUK_REVIEW','REJECTED'))
    or (current_order.lifecycle_state = 'CURTAINSUK_REVIEW' and target_state in ('APPROVED_FOR_MANUFACTURE','CHANGE_REQUESTED','REJECTED'))
    or (current_order.lifecycle_state = 'APPROVED_FOR_MANUFACTURE' and target_state = 'WORKROOM_RELEASED')
  ) then raise exception 'MTM paid-order transition is invalid'; end if;
  update curtainsuk_private.mtm_paid_orders set lifecycle_state = target_state, updated_at = clock_timestamp()
  where paid_order_id = current_order.paid_order_id returning * into changed;
  insert into curtainsuk_private.mtm_paid_order_events(event_id, paid_order_id, from_state, to_state, actor_type, actor_id, reason)
  values(gen_random_uuid(), changed.paid_order_id, current_order.lifecycle_state, changed.lifecycle_state, 'STAFF', nullif(trim(p_transition->>'actor_id'),''), trim(p_transition->>'reason'));
  if target_state = 'WORKROOM_RELEASED' then
    insert into curtainsuk_private.mtm_workroom_release_packets(release_id, paid_order_id, snapshot_id, approved_by, approved_at, release_note)
    values(gen_random_uuid(), changed.paid_order_id, changed.snapshot_id, trim(p_transition->>'actor_id'), changed.updated_at, trim(p_transition->>'reason'));
  end if;
  return jsonb_build_object('paid_order_id', changed.paid_order_id, 'lifecycle_state', changed.lifecycle_state, 'updated_at', changed.updated_at);
end;
$$;

revoke all on function curtainsuk_private.record_mtm_paid_order(jsonb) from public, anon, authenticated;
revoke all on function curtainsuk_private.transition_mtm_paid_order(jsonb) from public, anon, authenticated;
grant execute on function curtainsuk_private.record_mtm_paid_order(jsonb) to service_role;
grant execute on function curtainsuk_private.transition_mtm_paid_order(jsonb) to service_role;

notify pgrst, 'reload schema';
commit;
