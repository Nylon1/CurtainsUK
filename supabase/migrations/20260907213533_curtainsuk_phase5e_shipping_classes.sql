-- Add the owner's Large cell; retain legacy Specialist history without reinterpreting it.
alter table curtainsuk_private.staging_shipping_rate_versions
  drop constraint staging_shipping_rate_versions_parcel_class_check;
alter table curtainsuk_private.staging_shipping_rate_versions
  add constraint staging_shipping_rate_versions_parcel_class_check
  check (parcel_class in ('STANDARD', 'LARGE', 'OVERSIZE', 'SPECIALIST'));
insert into curtainsuk_private.staging_shipping_rate_versions
  (region, parcel_class, gross_amount_minor, status, actor_id, reason, effective_from)
select region, 'LARGE', null, 'AWAITING_OWNER_CONFIRMATION',
  '00000000-0000-4000-8000-000000000052'::uuid,
  'Phase 5E owner framework: Large rate not supplied', clock_timestamp()
from unnest(array['UK_MAINLAND', 'HIGHLANDS_ISLANDS', 'NORTHERN_IRELAND']) region;
create or replace function curtainsuk_private.append_staging_shipping_rate_version(p_rate jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous curtainsuk_private.staging_shipping_rate_versions;
  inserted curtainsuk_private.staging_shipping_rate_versions;
  database_now timestamptz := clock_timestamp();
  requested_status text := p_rate->>'status';
  requested_amount integer := (p_rate->>'gross_amount_minor')::integer;
  normalized_reason text := trim(p_rate->>'reason');
begin
  if (p_rate->>'region') not in ('UK_MAINLAND', 'HIGHLANDS_ISLANDS', 'NORTHERN_IRELAND')
     or (p_rate->>'parcel_class') not in ('STANDARD', 'LARGE', 'OVERSIZE', 'SPECIALIST')
     or requested_status not in ('AWAITING_OWNER_CONFIRMATION', 'VALIDATED', 'RETIRED')
     or (p_rate->>'actor_id') is null
     or length(normalized_reason) not between 3 and 1000
     or (requested_status = 'VALIDATED' and (requested_amount is null or requested_amount <= 0))
     or (requested_status <> 'VALIDATED' and requested_amount is not null)
  then
    raise exception 'Invalid staging shipping rate';
  end if;

  select * into previous
  from curtainsuk_private.staging_shipping_rate_versions
  where region = p_rate->>'region'
    and parcel_class = p_rate->>'parcel_class'
  order by created_at desc, rate_version_id desc
  limit 1;

  if previous.rate_version_id is null
     or previous.rate_version_id <> (p_rate->>'expected_current_rate_version_id')::uuid then
    raise exception 'Staging shipping rate changed; refresh before saving';
  end if;

  insert into curtainsuk_private.staging_shipping_rate_versions (
    rate_version_id, region, parcel_class, gross_amount_minor, currency, status,
    supersedes_version_id, actor_id, reason, effective_from, created_at
  ) values (
    coalesce((p_rate->>'rate_version_id')::uuid, gen_random_uuid()),
    p_rate->>'region',
    p_rate->>'parcel_class',
    requested_amount,
    'GBP',
    requested_status,
    previous.rate_version_id,
    (p_rate->>'actor_id')::uuid,
    normalized_reason,
    coalesce((p_rate->>'effective_from')::timestamptz, database_now),
    database_now
  ) returning * into inserted;

  return jsonb_build_object(
    'rate_version_id', inserted.rate_version_id,
    'region', inserted.region,
    'parcel_class', inserted.parcel_class,
    'gross_amount_minor', inserted.gross_amount_minor,
    'currency', inserted.currency,
    'status', inserted.status,
    'effective_from', inserted.effective_from,
    'created_at', inserted.created_at
  );
exception
  when unique_violation then
    raise exception 'Staging shipping rate changed; refresh before saving';
end;
$$;
