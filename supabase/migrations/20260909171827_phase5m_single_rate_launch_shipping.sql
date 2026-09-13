-- Staging-only single-rate launch. Existing snapshots and prices remain immutable.
create or replace function curtainsuk_private.audit_staging_review_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  transition_actor text;
  transition_reason text;
  latest_revision curtainsuk_private.staging_review_request_revisions;
begin
  if (to_jsonb(new) - 'review_state' - 'updated_at')
      is distinct from (to_jsonb(old) - 'review_state' - 'updated_at') then
    raise exception 'Staging review content is immutable after submission';
  end if;
  if new.review_state is not distinct from old.review_state then
    raise exception 'Staging review updates must change review state';
  end if;
  if not (
    (old.review_state = 'PENDING' and new.review_state in ('NEEDS_INFORMATION', 'UNDER_REVIEW', 'REJECTED'))
    or (old.review_state = 'NEEDS_INFORMATION' and new.review_state in ('UNDER_REVIEW', 'REJECTED'))
    or (old.review_state = 'UNDER_REVIEW' and new.review_state in ('NEEDS_INFORMATION', 'APPROVED', 'REJECTED'))
    or (old.review_state = 'APPROVED' and new.review_state in ('UNDER_REVIEW', 'READY_FOR_CHECKOUT', 'REJECTED'))
  ) then
    raise exception 'Invalid review state transition';
  end if;

  if new.review_state in ('APPROVED', 'READY_FOR_CHECKOUT') then
    select * into latest_revision
    from curtainsuk_private.staging_review_request_revisions
    where request_id = old.request_id
    order by revision_number desc
    limit 1;
    if (old.window_type_slug in ('apex-window','triangular-window','gable-end-window','awkward-unusual-window','dormer-window','curved-bow-window','corner-window')
        or latest_revision.specification->>'window_type_slug' in ('apex-window','triangular-window','gable-end-window','awkward-unusual-window','dormer-window','curved-bow-window','corner-window')
        or exists(select 1 from curtainsuk_private.staging_review_email_evidence_events where request_id=old.request_id and actor_id is not null))
       and not exists (
         select 1 from (select * from curtainsuk_private.staging_review_email_evidence_events where request_id=old.request_id order by event_number desc limit 1) email
         where email.evidence_state='EVIDENCE_REVIEWED' and email.revision_id=latest_revision.revision_id
       ) then raise exception 'Email evidence must be reviewed for the current revision before approval'; end if;
    if latest_revision.final_gross_amount_minor is null or latest_revision.final_gross_amount_minor <= 0 then
      raise exception 'A reviewed final price is required before approval';
    end if;
  end if;

  if new.review_state = 'READY_FOR_CHECKOUT' then
    if coalesce(
      nullif(trim(latest_revision.specification->>'availability_state'), ''),
      old.availability_state
    ) not in ('FABRIC_AVAILABLE', 'LIMITED_AVAILABILITY') then
      raise exception 'Fabric availability must be acceptable before checkout readiness';
    end if;
    if not exists (
      select 1
      from curtainsuk_private.fabric_colourways fabric
      where fabric.fabric_id = coalesce(
          nullif(trim(latest_revision.specification->>'fabric_id'), ''),
          old.fabric_id
        )
        and fabric.supplier_id = coalesce(
          nullif(trim(latest_revision.specification->>'supplier_id'), ''),
          old.supplier_id
        )
        and fabric.supplier_sku = coalesce(
          nullif(trim(latest_revision.specification->>'supplier_sku'), ''),
          old.supplier_sku
        )
        and fabric.price_verification_status = 'VERIFIED'
        and fabric.lifecycle_state = 'CURRENT'
        and fabric.storefront_selectable
    ) then
      raise exception 'Fabric is not pricing-eligible for checkout readiness';
    end if;
    if coalesce(
      nullif(latest_revision.specification->>'calculated_fabric_metres', '')::numeric,
      old.calculated_fabric_metres
    ) is null or coalesce(
      nullif(latest_revision.specification->>'calculated_fabric_metres', '')::numeric,
      old.calculated_fabric_metres
    ) <= 0 then
      raise exception 'Calculated fabric metres are required before checkout readiness';
    end if;
    -- Single-rate launch: parcel classification is not a readiness requirement.

  end if;

  transition_actor := nullif(trim(current_setting('curtainsuk.review_actor_id', true)), '');
  transition_reason := nullif(trim(current_setting('curtainsuk.review_reason', true)), '');
  if transition_actor is null or transition_reason is null then
    raise exception using errcode = '42501', message = 'Review transition context is required';
  end if;
  new.updated_at := clock_timestamp();

  insert into curtainsuk_private.staging_review_request_events (
    event_id, request_id, review_state, actor_type, actor_id, reason, created_at
  ) values (
    gen_random_uuid(), new.request_id, new.review_state, 'STAFF',
    transition_actor, transition_reason, new.updated_at
  );
  return new;
end;
$$;

create or replace function curtainsuk_private.create_staging_configuration_snapshot(p_snapshot jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  outcome text := p_snapshot->>'pricing_outcome';
  request_record curtainsuk_private.staging_review_requests;
  revision_record curtainsuk_private.staging_review_request_revisions;
  inserted curtainsuk_private.staging_configuration_snapshots;
  current_price_snapshot_id text;
  private_key_pattern text := '"(supplier_?cost|standard_?trade_?price|cut_?trade_?price|gross_?margin|raw_?stock|batch_?reference|dye_?lot)"[[:space:]]*:';
begin
  if outcome not in ('INSTANT_PRICE', 'PRICE_WITH_REVIEW', 'MANUAL_QUOTE')
     or jsonb_typeof(p_snapshot->'measurements') <> 'object'
     or jsonb_typeof(p_snapshot->'customer_summary') <> 'object'
     or jsonb_typeof(p_snapshot->'customer_summary'->'measurements') <> 'object'
     or jsonb_typeof(p_snapshot->'customer_summary'->'fabric') <> 'object'
     or (p_snapshot->'measurements')::text ~* private_key_pattern
     or (p_snapshot->'customer_summary')::text ~* private_key_pattern
     or exists (
       select 1
       from jsonb_object_keys(p_snapshot->'measurements') as measurement_key(key)
       where measurement_key.key not in (
         'measurement_basis', 'coverage_width', 'finished_drop', 'recess_width', 'recess_height',
         'left_return', 'right_return', 'bay_segment_widths', 'bay_angles_degrees',
         'curve_arc_length', 'peak_height', 'left_vertical', 'right_vertical',
         'left_slope', 'right_slope', 'left_slope_angle_degrees',
         'right_slope_angle_degrees', 'door_width', 'door_height',
         'number_of_sections', 'track_or_pole_fitted'
       )
     )
     or exists (
       select 1
       from jsonb_object_keys(p_snapshot->'customer_summary') as summary_key(key)
       where summary_key.key not in (
         'windowType', 'measurements', 'fabric', 'heading', 'lining',
         'construction', 'availability', 'reviewState', 'vatIncluded',
         'deliveryShownSeparately'
       )
     )
     or exists (
       select 1
       from jsonb_object_keys(p_snapshot->'customer_summary'->'fabric') as fabric_key(key)
       where fabric_key.key not in ('id', 'supplier', 'brand', 'collection', 'design', 'colour')
     )
     or not (p_snapshot->'customer_summary' ?& array[
       'windowType', 'measurements', 'fabric', 'heading', 'lining',
       'construction', 'availability', 'vatIncluded', 'deliveryShownSeparately'
     ])
     or p_snapshot->'customer_summary'->'measurements' is distinct from p_snapshot->'measurements'
     or p_snapshot->'customer_summary'->>'windowType' is distinct from p_snapshot->>'window_type_slug'
     or p_snapshot->'customer_summary'->>'heading' is distinct from p_snapshot->>'heading'
     or p_snapshot->'customer_summary'->>'lining' is distinct from p_snapshot->>'lining'
     or p_snapshot->'customer_summary'->>'construction' is distinct from p_snapshot->>'construction'
     or p_snapshot->'customer_summary'->>'availability' is distinct from p_snapshot->>'availability_state'
     or p_snapshot->'customer_summary'->'vatIncluded' is distinct from 'true'::jsonb
     or p_snapshot->'customer_summary'->'deliveryShownSeparately' is distinct from 'true'::jsonb
     or nullif(trim(p_snapshot->'customer_summary'->'fabric'->>'design'), '') is null
     or nullif(trim(p_snapshot->'customer_summary'->'fabric'->>'colour'), '') is null then
    raise exception 'Invalid or private checkout snapshot payload';
  end if;

  if outcome = 'INSTANT_PRICE' then
    if nullif(p_snapshot->>'review_request_id', '') is not null
       or nullif(p_snapshot->>'review_revision_id', '') is not null
       or p_snapshot->'customer_summary' ? 'reviewState' then
      raise exception 'Instant checkout cannot carry a review reference';
    end if;
  else
    select * into request_record
    from curtainsuk_private.staging_review_requests
    where request_id = (p_snapshot->>'review_request_id')::uuid
      and configuration_id = (p_snapshot->>'configuration_id')::uuid
    for share;
    if request_record.request_id is null or request_record.review_state <> 'READY_FOR_CHECKOUT' then
      raise exception 'Review is not ready for checkout';
    end if;
    if p_snapshot->'customer_summary'->>'reviewState' is distinct from 'READY_FOR_CHECKOUT' then
      raise exception 'Checkout summary does not match the approved review state';
    end if;
    if request_record.pricing_outcome is distinct from outcome then
      raise exception 'Checkout outcome does not match the approved review request';
    end if;
    if nullif(trim(p_snapshot->>'approval_reference'), '') is distinct from request_record.request_id::text then
      raise exception 'Checkout approval reference does not match the review request';
    end if;
    select * into revision_record
    from curtainsuk_private.staging_review_request_revisions
    where revision_id = (p_snapshot->>'review_revision_id')::uuid
      and request_id = request_record.request_id;
    if revision_record.revision_id is null
       or revision_record.final_net_amount_minor <> (p_snapshot->>'net_amount_minor')::integer
       or revision_record.final_vat_amount_minor <> (p_snapshot->>'vat_amount_minor')::integer
       or revision_record.final_gross_amount_minor <> (p_snapshot->>'customer_price_minor')::integer
       or revision_record.final_vat_rate_basis_points <> (p_snapshot->>'vat_rate_basis_points')::integer
       or revision_record.pricing_rule_version <> p_snapshot->>'pricing_rule_version' then
      raise exception 'Checkout price does not match the approved review revision';
    end if;
    if exists (
      select 1 from curtainsuk_private.staging_review_request_revisions newer
      where newer.request_id = request_record.request_id
        and newer.revision_number > revision_record.revision_number
    ) then
      raise exception 'Checkout revision is stale';
    end if;
    if p_snapshot->>'window_type_slug' is distinct from coalesce(
         nullif(trim(revision_record.specification->>'window_type_slug'), ''),
         request_record.window_type_slug
       )
       or p_snapshot->'measurements' is distinct from (case
         when jsonb_typeof(revision_record.specification->'measurements') = 'object'
           then revision_record.specification->'measurements'
         else request_record.measurements
       end)
       or p_snapshot->>'fabric_master_id' is distinct from coalesce(
         nullif(trim(revision_record.specification->>'fabric_id'), ''),
         request_record.fabric_id
       )
       or p_snapshot->>'supplier_sku' is distinct from coalesce(
         nullif(trim(revision_record.specification->>'supplier_sku'), ''),
         request_record.supplier_sku
       )
       or p_snapshot->>'heading' is distinct from coalesce(
         nullif(trim(revision_record.specification->>'heading'), ''),
         request_record.heading
       )
       or p_snapshot->>'lining' is distinct from coalesce(
         nullif(trim(revision_record.specification->>'lining'), ''),
         request_record.lining
       )
       or p_snapshot->>'construction' is distinct from coalesce(
         nullif(trim(revision_record.specification->>'construction'), ''),
         request_record.construction
       )
       or (p_snapshot->>'calculated_fabric_metres')::numeric is distinct from coalesce(
         nullif(revision_record.specification->>'calculated_fabric_metres', '')::numeric,
         request_record.calculated_fabric_metres
       )
       or not coalesce((
         p_snapshot->>'shipping_parcel_class' = 'STANDARD'
         or (p_snapshot->>'shipping_parcel_class' = 'SPECIALIST'
           and (p_snapshot->>'shipping_gross_amount_minor')::integer = (revision_record.specification->'delivery_confirmation'->>'gross_amount_minor')::integer
           and p_snapshot->>'shipping_region' = revision_record.specification->'delivery_confirmation'->>'region'
           and length(trim(revision_record.specification->'delivery_confirmation'->>'reason')) >= 3)
         or p_snapshot->>'shipping_parcel_class' = nullif(trim(revision_record.specification->>'shipping_parcel_class'), '')
       ), false) then
      raise exception 'Checkout configuration does not match the approved review revision';
    end if;
    if not exists (
      select 1
      from curtainsuk_private.fabric_colourways fabric
      where fabric.fabric_id = p_snapshot->>'fabric_master_id'
        and fabric.supplier_id = coalesce(
          nullif(trim(revision_record.specification->>'supplier_id'), ''),
          request_record.supplier_id
        )
        and fabric.supplier_sku = p_snapshot->>'supplier_sku'
    ) then
      raise exception 'Checkout fabric identity does not match the Fabric Master';
    end if;
  end if;

  if not exists (
    select 1
    from curtainsuk_private.fabric_colourways fabric
    where fabric.fabric_id = p_snapshot->>'fabric_master_id'
      and fabric.supplier_sku = p_snapshot->>'supplier_sku'
      and fabric.price_verification_status = 'VERIFIED'
      and fabric.lifecycle_state = 'CURRENT'
      and fabric.storefront_selectable
  ) then
    raise exception 'Checkout fabric is not pricing-eligible in the Fabric Master';
  end if;

  -- Fabric Master flags are a catalogue projection, not durable proof that a
  -- supplier price remains current. Resolve and retain the exact latest
  -- approved supplier price observation used at handoff. A later price change
  -- cannot mutate this immutable link or the approved customer total.
  select supplier_snapshot.snapshot_id
  into current_price_snapshot_id
  from curtainsuk_private.fabric_colourways fabric
  join curtainsuk_private.supplier_snapshots supplier_snapshot
    on supplier_snapshot.supplier_id = fabric.supplier_id
   and supplier_snapshot.supplier_sku = fabric.supplier_sku
  join curtainsuk_private.supplier_snapshot_prices supplier_price
    on supplier_price.snapshot_id = supplier_snapshot.snapshot_id
  where fabric.fabric_id = p_snapshot->>'fabric_master_id'
    and fabric.supplier_sku = p_snapshot->>'supplier_sku'
    and supplier_snapshot.validation_status = 'VALIDATED'
    and supplier_snapshot.verification_status = 'VERIFIED'
    and supplier_snapshot.lifecycle_state <> 'DISCONTINUED'
    and supplier_snapshot.price_expires_at is not null
    and supplier_snapshot.price_expires_at > clock_timestamp()
    and supplier_price.cut_trade_price > 0
    and supplier_price.currency = 'GBP'
    and (
      select promotion.promotion_state
      from curtainsuk_private.supplier_promotion_events promotion
      where promotion.snapshot_id = supplier_snapshot.snapshot_id
      order by
        promotion.created_at desc,
        case promotion.promotion_state
          when 'EXPIRED' then 4
          when 'REJECTED' then 3
          when 'APPROVED_FOR_PROJECTION' then 2
          when 'VALIDATED' then 1
          else 0
        end desc,
        promotion.event_id desc
      limit 1
    ) = 'APPROVED_FOR_PROJECTION'
  order by supplier_snapshot.checked_at desc, supplier_snapshot.snapshot_id desc
  limit 1;
  if current_price_snapshot_id is null then
    raise exception 'Checkout supplier price approval is missing or expired';
  end if;

  insert into curtainsuk_private.staging_configuration_snapshots (
    snapshot_id, configuration_id, review_request_id, review_revision_id,
    pricing_outcome, window_type_slug, measurements, fabric_master_id,
    supplier_sku, supplier_price_snapshot_id, heading, lining, construction, calculated_fabric_metres,
    pricing_rule_version, net_amount_minor, vat_amount_minor,
    customer_price_minor, vat_rate_basis_points, currency, availability_state, shipping_region, shipping_parcel_class,
    shipping_gross_amount_minor, goods_minimum_basis_minor, customer_summary,
    approval_reference, customer_accepted_at, recorded_at
  ) values (
    (p_snapshot->>'snapshot_id')::uuid,
    (p_snapshot->>'configuration_id')::uuid,
    nullif(p_snapshot->>'review_request_id', '')::uuid,
    nullif(p_snapshot->>'review_revision_id', '')::uuid,
    outcome,
    p_snapshot->>'window_type_slug',
    p_snapshot->'measurements',
    p_snapshot->>'fabric_master_id',
    p_snapshot->>'supplier_sku',
    current_price_snapshot_id,
    p_snapshot->>'heading',
    p_snapshot->>'lining',
    p_snapshot->>'construction',
    (p_snapshot->>'calculated_fabric_metres')::numeric,
    p_snapshot->>'pricing_rule_version',
    (p_snapshot->>'net_amount_minor')::integer,
    (p_snapshot->>'vat_amount_minor')::integer,
    (p_snapshot->>'customer_price_minor')::integer,
    (p_snapshot->>'vat_rate_basis_points')::integer,
    'GBP',
    p_snapshot->>'availability_state',
    p_snapshot->>'shipping_region',
    p_snapshot->>'shipping_parcel_class',
    (p_snapshot->>'shipping_gross_amount_minor')::integer,
    (p_snapshot->>'customer_price_minor')::integer,
    p_snapshot->'customer_summary',
    nullif(trim(p_snapshot->>'approval_reference'), ''),
    clock_timestamp(),
    clock_timestamp()
  ) returning * into inserted;

  return jsonb_build_object(
    'snapshot_id', inserted.snapshot_id,
    'configuration_id', inserted.configuration_id,
    'customer_price_minor', inserted.customer_price_minor,
    'shipping_gross_amount_minor', inserted.shipping_gross_amount_minor,
    'recorded_at', inserted.recorded_at
  );
end;
$$;
