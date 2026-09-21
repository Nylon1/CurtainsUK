begin;

-- A paid Shopify order can now represent either the historic single curtain
-- contract or a House of Curtains.  The paid order remains the lifecycle
-- aggregate; curtains are deliberately stored as relational immutable rows,
-- never as an opaque order JSON document.
alter table curtainsuk_private.mtm_paid_orders
  drop constraint if exists mtm_paid_orders_snapshot_id_key,
  alter column snapshot_id drop not null,
  add column if not exists contract_type text not null default 'SINGLE_CURTAIN'
    check (contract_type in ('SINGLE_CURTAIN','HOUSE')),
  add column if not exists house_id uuid,
  add column if not exists house_revision integer,
  add column if not exists house_fingerprint text,
  add column if not exists contract_fingerprint text;

alter table curtainsuk_private.mtm_paid_orders
  add constraint mtm_paid_orders_contract_shape check (
    (contract_type = 'SINGLE_CURTAIN'
      and snapshot_id is not null
      and house_id is null
      and house_revision is null
      and house_fingerprint is null)
    or
    (contract_type = 'HOUSE'
      and snapshot_id is null
      and house_id is not null
      and house_revision is not null
      and house_revision >= 0
      and house_fingerprint ~ '^[a-f0-9]{64}$'
      and contract_fingerprint ~ '^[a-f0-9]{64}$')
  );

create unique index if not exists mtm_paid_orders_house_identity_unique
  on curtainsuk_private.mtm_paid_orders (house_id, house_revision, house_fingerprint)
  where contract_type = 'HOUSE';

-- Durable House-level idempotency. A browser retry cannot use a changed room
-- list because that changes the fingerprint; an identical retry cannot create
-- a second Draft Order once the claim has been made.
create table curtainsuk_private.mtm_house_draft_creation_claims (
  house_fingerprint text primary key check (house_fingerprint ~ '^[a-f0-9]{64}$'),
  house_id uuid not null,
  house_revision integer not null check (house_revision >= 0),
  claimed_at timestamptz not null default clock_timestamp()
);

create table curtainsuk_private.mtm_house_checkout_executions (
  execution_id uuid primary key,
  house_fingerprint text not null unique references curtainsuk_private.mtm_house_draft_creation_claims(house_fingerprint) on delete restrict,
  house_id uuid not null,
  house_revision integer not null check (house_revision >= 0),
  shopify_draft_order_gid text unique check (shopify_draft_order_gid is null or shopify_draft_order_gid ~ '^gid://shopify/DraftOrder/[0-9]+$'),
  execution_status text not null check (execution_status in ('CALCULATED','TEST_DRAFT_CREATED','EXISTING_TEST_DRAFT_REUSED','PRODUCTION_DRAFT_CREATED','EXISTING_PRODUCTION_DRAFT_REUSED')),
  shopify_write_performed boolean not null,
  payment_enabled boolean not null,
  recorded_at timestamptz not null default clock_timestamp()
);

alter table curtainsuk_private.mtm_house_draft_creation_claims enable row level security;
alter table curtainsuk_private.mtm_house_checkout_executions enable row level security;
revoke all on curtainsuk_private.mtm_house_draft_creation_claims, curtainsuk_private.mtm_house_checkout_executions from public, anon, authenticated;

create table curtainsuk_private.mtm_paid_order_curtains (
  paid_order_curtain_id uuid primary key,
  paid_order_id uuid not null references curtainsuk_private.mtm_paid_orders(paid_order_id) on delete restrict,
  snapshot_id uuid not null unique references curtainsuk_private.staging_configuration_snapshots(snapshot_id) on delete restrict,
  configuration_id uuid not null,
  room_id uuid,
  room_name text not null check (nullif(trim(room_name), '') is not null and length(room_name) <= 80),
  window_name text not null check (nullif(trim(window_name), '') is not null and length(window_name) <= 80),
  line_ordinal integer not null check (line_ordinal >= 1),
  recorded_at timestamptz not null default clock_timestamp(),
  unique (paid_order_id, configuration_id),
  unique (paid_order_id, line_ordinal)
);

-- Keep every pre-House paid order readable by materialising its original
-- snapshot as a legacy single line before future calls use the new function.
insert into curtainsuk_private.mtm_paid_order_curtains (
  paid_order_curtain_id, paid_order_id, snapshot_id, configuration_id,
  room_id, room_name, window_name, line_ordinal
)
select gen_random_uuid(), paid.paid_order_id, paid.snapshot_id, snapshot.configuration_id,
  null, 'Curtain', 'Curtain', 1
from curtainsuk_private.mtm_paid_orders paid
join curtainsuk_private.staging_configuration_snapshots snapshot
  on snapshot.snapshot_id = paid.snapshot_id
where paid.contract_type = 'SINGLE_CURTAIN'
on conflict (snapshot_id) do nothing;

alter table curtainsuk_private.mtm_paid_order_curtains enable row level security;
revoke all on curtainsuk_private.mtm_paid_order_curtains from public, anon, authenticated;

create trigger mtm_paid_order_curtains_append_only
before update or delete on curtainsuk_private.mtm_paid_order_curtains
for each row execute function curtainsuk_private.reject_mtm_paid_order_mutation();

-- A whole House is released once.  Its packet has a separate immutable row
-- for every curtain so the workroom can keep room/window labels without
-- supporting partial release in V1.
alter table curtainsuk_private.mtm_workroom_release_packets
  alter column snapshot_id drop not null,
  add column if not exists house_id uuid;

create table curtainsuk_private.mtm_workroom_release_packet_curtains (
  release_curtain_id uuid primary key,
  release_id uuid not null references curtainsuk_private.mtm_workroom_release_packets(release_id) on delete restrict,
  paid_order_curtain_id uuid not null references curtainsuk_private.mtm_paid_order_curtains(paid_order_curtain_id) on delete restrict,
  snapshot_id uuid not null references curtainsuk_private.staging_configuration_snapshots(snapshot_id) on delete restrict,
  room_name text not null check (nullif(trim(room_name), '') is not null and length(room_name) <= 80),
  window_name text not null check (nullif(trim(window_name), '') is not null and length(window_name) <= 80),
  line_ordinal integer not null check (line_ordinal >= 1),
  unique (release_id, paid_order_curtain_id),
  unique (release_id, line_ordinal)
);

insert into curtainsuk_private.mtm_workroom_release_packet_curtains (
  release_curtain_id, release_id, paid_order_curtain_id, snapshot_id,
  room_name, window_name, line_ordinal
)
select gen_random_uuid(), packet.release_id, line.paid_order_curtain_id, line.snapshot_id,
  line.room_name, line.window_name, line.line_ordinal
from curtainsuk_private.mtm_workroom_release_packets packet
join curtainsuk_private.mtm_paid_order_curtains line on line.paid_order_id = packet.paid_order_id
on conflict (release_id, paid_order_curtain_id) do nothing;

alter table curtainsuk_private.mtm_workroom_release_packet_curtains enable row level security;
revoke all on curtainsuk_private.mtm_workroom_release_packet_curtains from public, anon, authenticated;

create trigger mtm_workroom_release_packet_curtains_append_only
before update or delete on curtainsuk_private.mtm_workroom_release_packet_curtains
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
  expected_contract_type text;
  expected_snapshot_id uuid;
  curtain jsonb;
  snapshot_record curtainsuk_private.staging_configuration_snapshots;
  expected_count integer := 0;
  line_ordinal integer := 0;
begin
  if jsonb_typeof(p_payment) <> 'object'
    or exists (select 1 from jsonb_object_keys(p_payment) as key(name) where key.name not in (
      'paid_order_id','snapshot_id','shopify_order_gid','shopify_order_name','shopify_draft_order_gid','paid_at','webhook_payload_sha256',
      'house_id','house_revision','house_fingerprint','contract_fingerprint','curtains'
    )) then
    raise exception 'MTM paid-order payload is invalid';
  end if;

  expected_contract_type := case when p_payment ? 'curtains' then 'HOUSE' else 'SINGLE_CURTAIN' end;
  if expected_contract_type = 'SINGLE_CURTAIN' then
    if p_payment->>'snapshot_id' is null or p_payment ? 'house_id' or p_payment ? 'house_revision'
      or p_payment ? 'house_fingerprint' or p_payment ? 'contract_fingerprint' then
      raise exception 'MTM single paid-order payload is invalid';
    end if;
    expected_snapshot_id := (p_payment->>'snapshot_id')::uuid;
  else
    if p_payment ? 'snapshot_id'
      or coalesce(p_payment->>'house_id','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or coalesce(p_payment->>'house_revision','') !~ '^[0-9]+$'
      or coalesce(p_payment->>'house_fingerprint','') !~ '^[a-f0-9]{64}$'
      or coalesce(p_payment->>'contract_fingerprint','') !~ '^[a-f0-9]{64}$'
      or jsonb_typeof(p_payment->'curtains') <> 'array'
      or jsonb_array_length(p_payment->'curtains') = 0
      or jsonb_array_length(p_payment->'curtains') > 100 then
      raise exception 'MTM House paid-order payload is invalid';
    end if;
    for curtain in select value from jsonb_array_elements(p_payment->'curtains') loop
      if jsonb_typeof(curtain) <> 'object'
        or exists (select 1 from jsonb_object_keys(curtain) as key(name) where key.name not in ('snapshot_id','configuration_id','room_id','room_name','window_name','line_ordinal'))
        or coalesce(curtain->>'snapshot_id','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        or coalesce(curtain->>'configuration_id','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        or coalesce(curtain->>'room_id','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        or nullif(trim(curtain->>'room_name'),'') is null or length(curtain->>'room_name') > 80
        or nullif(trim(curtain->>'window_name'),'') is null or length(curtain->>'window_name') > 80
        or coalesce(curtain->>'line_ordinal','') !~ '^[1-9][0-9]*$' then
        raise exception 'MTM House paid-order curtain is invalid';
      end if;
      select * into snapshot_record from curtainsuk_private.staging_configuration_snapshots
        where snapshot_id = (curtain->>'snapshot_id')::uuid
          and configuration_id = (curtain->>'configuration_id')::uuid;
      if snapshot_record.snapshot_id is null then raise exception 'MTM House snapshot identity is invalid'; end if;
      expected_count := expected_count + 1;
    end loop;
    if expected_count <> (select count(distinct value->>'snapshot_id') from jsonb_array_elements(p_payment->'curtains'))
      or expected_count <> (select count(distinct value->>'configuration_id') from jsonb_array_elements(p_payment->'curtains'))
      or expected_count <> (select count(distinct (value->>'room_id', value->>'line_ordinal')) from jsonb_array_elements(p_payment->'curtains')) then
      raise exception 'MTM House paid-order lines are not unique';
    end if;
  end if;

  select * into existing from curtainsuk_private.mtm_paid_orders where shopify_order_gid = p_payment->>'shopify_order_gid';
  if existing.paid_order_id is not null then
    if existing.contract_type <> expected_contract_type
      or existing.webhook_payload_sha256 <> p_payment->>'webhook_payload_sha256'
      or (expected_contract_type = 'SINGLE_CURTAIN' and existing.snapshot_id <> expected_snapshot_id)
      or (expected_contract_type = 'HOUSE' and (
        existing.house_id <> (p_payment->>'house_id')::uuid
        or existing.house_revision <> (p_payment->>'house_revision')::integer
        or existing.house_fingerprint <> p_payment->>'house_fingerprint'
        or existing.contract_fingerprint <> p_payment->>'contract_fingerprint'
      )) then
      raise exception 'MTM paid-order webhook identity conflict';
    end if;
    return jsonb_build_object('paid_order_id', existing.paid_order_id, 'lifecycle_state', existing.lifecycle_state, 'reused', true, 'contract_type', existing.contract_type);
  end if;

  insert into curtainsuk_private.mtm_paid_orders (
    paid_order_id, snapshot_id, contract_type, house_id, house_revision, house_fingerprint, contract_fingerprint,
    shopify_order_gid, shopify_order_name, shopify_draft_order_gid,
    lifecycle_state, paid_at, change_request_window_ends_at, webhook_payload_sha256
  ) values (
    (p_payment->>'paid_order_id')::uuid,
    case when expected_contract_type = 'SINGLE_CURTAIN' then expected_snapshot_id else null end,
    expected_contract_type,
    case when expected_contract_type = 'HOUSE' then (p_payment->>'house_id')::uuid else null end,
    case when expected_contract_type = 'HOUSE' then (p_payment->>'house_revision')::integer else null end,
    case when expected_contract_type = 'HOUSE' then p_payment->>'house_fingerprint' else null end,
    case when expected_contract_type = 'HOUSE' then p_payment->>'contract_fingerprint' else null end,
    p_payment->>'shopify_order_gid', p_payment->>'shopify_order_name', nullif(p_payment->>'shopify_draft_order_gid',''),
    'PAID', (p_payment->>'paid_at')::timestamptz, (p_payment->>'paid_at')::timestamptz + interval '2 hours', p_payment->>'webhook_payload_sha256'
  ) returning * into inserted;

  if expected_contract_type = 'SINGLE_CURTAIN' then
    select * into snapshot_record from curtainsuk_private.staging_configuration_snapshots where snapshot_id = expected_snapshot_id;
    if snapshot_record.snapshot_id is null then raise exception 'MTM paid-order snapshot not found'; end if;
    insert into curtainsuk_private.mtm_paid_order_curtains (
      paid_order_curtain_id, paid_order_id, snapshot_id, configuration_id, room_id, room_name, window_name, line_ordinal
    ) values (gen_random_uuid(), inserted.paid_order_id, expected_snapshot_id, snapshot_record.configuration_id, null, 'Curtain', 'Curtain', 1);
  else
    for curtain in select value from jsonb_array_elements(p_payment->'curtains') order by (value->>'line_ordinal')::integer loop
      line_ordinal := (curtain->>'line_ordinal')::integer;
      insert into curtainsuk_private.mtm_paid_order_curtains (
        paid_order_curtain_id, paid_order_id, snapshot_id, configuration_id, room_id, room_name, window_name, line_ordinal
      ) values (
        gen_random_uuid(), inserted.paid_order_id,
        (curtain->>'snapshot_id')::uuid, (curtain->>'configuration_id')::uuid, (curtain->>'room_id')::uuid,
        trim(curtain->>'room_name'), trim(curtain->>'window_name'), line_ordinal
      );
    end loop;
  end if;

  insert into curtainsuk_private.mtm_paid_order_events(event_id, paid_order_id, from_state, to_state, actor_type, actor_id, reason)
  values(gen_random_uuid(), inserted.paid_order_id, null, 'PAID', 'SHOPIFY_WEBHOOK', null, 'Verified Shopify orders/paid webhook');
  return jsonb_build_object('paid_order_id', inserted.paid_order_id, 'lifecycle_state', inserted.lifecycle_state, 'reused', false, 'contract_type', inserted.contract_type);
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
  changed curtainsuk_private.mtm_paid_orders;
  target_state text := p_transition->>'to_state';
  packet curtainsuk_private.mtm_workroom_release_packets;
begin
  if jsonb_typeof(p_transition) <> 'object'
    or exists (select 1 from jsonb_object_keys(p_transition) as key(name) where key.name not in ('paid_order_id','expected_state','to_state','actor_id','reason')) then
    raise exception 'MTM paid-order transition payload is invalid';
  end if;
  select * into current_order from curtainsuk_private.mtm_paid_orders
    where paid_order_id = (p_transition->>'paid_order_id')::uuid for update;
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
    -- One explicit staff action releases every curtain in the paid House.  No
    -- partial room/curtain release exists in V1.
    insert into curtainsuk_private.mtm_workroom_release_packets(
      release_id, paid_order_id, snapshot_id, house_id, approved_by, approved_at, release_note
    ) values (
      gen_random_uuid(), changed.paid_order_id,
      case when changed.contract_type = 'SINGLE_CURTAIN' then changed.snapshot_id else null end,
      changed.house_id, trim(p_transition->>'actor_id'), changed.updated_at, trim(p_transition->>'reason')
    ) returning * into packet;
    insert into curtainsuk_private.mtm_workroom_release_packet_curtains(
      release_curtain_id, release_id, paid_order_curtain_id, snapshot_id, room_name, window_name, line_ordinal
    ) select gen_random_uuid(), packet.release_id, line.paid_order_curtain_id, line.snapshot_id,
      line.room_name, line.window_name, line.line_ordinal
    from curtainsuk_private.mtm_paid_order_curtains line
    where line.paid_order_id = changed.paid_order_id;
  end if;
  return jsonb_build_object('paid_order_id', changed.paid_order_id, 'lifecycle_state', changed.lifecycle_state, 'updated_at', changed.updated_at, 'contract_type', changed.contract_type);
end;
$$;

revoke all on function curtainsuk_private.record_mtm_paid_order(jsonb) from public, anon, authenticated;
revoke all on function curtainsuk_private.transition_mtm_paid_order(jsonb) from public, anon, authenticated;
grant execute on function curtainsuk_private.record_mtm_paid_order(jsonb) to service_role;
grant execute on function curtainsuk_private.transition_mtm_paid_order(jsonb) to service_role;

notify pgrst, 'reload schema';
commit;
