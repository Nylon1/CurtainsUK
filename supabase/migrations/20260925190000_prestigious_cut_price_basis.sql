-- Owner-confirmed CurtainsUK commercial policy: new Prestigious Textiles
-- observations preserve the established Standard Price selection outside the
-- governed PDF cohort. For that cohort only, approved official PDF Cut Price
-- evidence takes priority, including after a later Standard observation.
-- No source value is copied, relabelled, or derived.

CREATE OR REPLACE FUNCTION curtainsuk_private.fabric_commercial_evidence(p_ids text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare result jsonb;
begin
 if coalesce(array_length(p_ids,1),0)>48 then raise exception 'RETAIL_PAGE_TOO_LARGE'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('fabric_id',c.fabric_id,
 'stale',coalesce(s.checked_at<now()-curtainsuk_private.stock_validity_window(),true) or coalesce(s.checked_at>now(),false),
 'stock',case when c.lifecycle_state='DISCONTINUED' or s.lifecycle_state='DISCONTINUED' then 'NO_LONGER_AVAILABLE'
 when s.supplier_sku is null or s.checked_at<now()-curtainsuk_private.stock_validity_window() or s.checked_at>now() then 'AVAILABILITY_TO_BE_CONFIRMED'
 when s.aggregate_metres-coalesce(u.used,0)>=30 then 'FABRIC_AVAILABLE' else 'TEMPORARILY_UNAVAILABLE' end,
 'sample_stock_available',coalesce(s.checked_at>=now()-curtainsuk_private.stock_validity_window() and s.checked_at<=now()
   and c.lifecycle_state<>'DISCONTINUED' and s.lifecycle_state<>'DISCONTINUED'
   and s.aggregate_metres-coalesce(u.used,0)>0,false),
 'price_confirmed',exists(
 select 1 from curtainsuk_private.supplier_snapshots p join curtainsuk_private.supplier_snapshot_prices price using(snapshot_id)
 where p.supplier_id=c.supplier_id and p.supplier_sku=c.supplier_sku and p.validation_status='VALIDATED'
 and p.checked_at<=now()  and price.currency='GBP' and ((p.supplier_id='prestigious-textiles' AND (price.standard_trade_price>0 OR (price.cut_trade_price>0 and p.snapshot_id like 'pt-pdf-cut:%' and p.source_type='OTHER' and p.source_name='Prestigious Textiles August 2026 Price List; owner-confirmed Cut Price'))) OR (p.supplier_id<>'prestigious-textiles' AND price.cut_trade_price>0))
 and (select e.promotion_state from curtainsuk_private.supplier_promotion_events e where e.snapshot_id=p.snapshot_id order by e.created_at desc limit 1)='APPROVED_FOR_PROJECTION'
 ))),'[]'::jsonb) into result
 from curtainsuk_private.fabric_colourways c
 left join lateral (select * from curtainsuk_private.daily_stock_snapshots s where s.supplier_id=c.supplier_id and s.supplier_sku=c.supplier_sku order by snapshot_date desc limit 1) s on true
 left join lateral (select sum(metres) used from curtainsuk_private.daily_stock_usage u where u.supplier_id=c.supplier_id and u.supplier_sku=c.supplier_sku and u.confirmed_at>=s.checked_at) u on true
 where c.fabric_id=any(p_ids);
 return result;
end $function$
;

CREATE OR REPLACE FUNCTION curtainsuk_private.create_staging_configuration_snapshot(p_snapshot jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  outcome text := p_snapshot->>'pricing_outcome';
  request_record curtainsuk_private.staging_review_requests;
  revision_record curtainsuk_private.staging_review_request_revisions;
  inserted curtainsuk_private.staging_configuration_snapshots;
  current_price_snapshot_id text;
  private_key_pattern text := '"(supplier_?cost|standard_?trade_?price|cut_?trade_?price|gross_?margin|raw_?stock|batch_?reference|dye_?lot)"[[:space:]]*:';
begin
  if p_snapshot->'customer_summary' ? 'patternAllowance' then
    if jsonb_typeof(p_snapshot#>'{customer_summary,patternAllowance}') is distinct from 'object'
      or not coalesce((p_snapshot#>'{customer_summary,patternAllowance}') in (
        '{"provenance":"DEFAULT_PATTERN_ALLOWANCE","allowanceMm":500,"policyVersion":"curtainsuk-pattern-allowance-v1"}'::jsonb,
        '{"provenance":"PLAIN_NO_MATCH_REQUIRED","allowanceMm":0,"policyVersion":"curtainsuk-pattern-allowance-v1"}'::jsonb
      ),false) then raise exception 'Invalid checkout pattern provenance'; end if;
  end if;
  if p_snapshot->'customer_summary' ? 'consultationContext' then
    if jsonb_typeof(p_snapshot#>'{customer_summary,consultationContext}') is distinct from 'object' then raise exception 'Invalid checkout consultation provenance'; end if;
    if not (p_snapshot#>'{customer_summary,consultationContext}') ?& array['sessionId','strategyId','fabricMasterId','policyVersion','recommendationVersion']
      or exists(select 1 from jsonb_each(p_snapshot#>'{customer_summary,consultationContext}') e where e.key not in ('sessionId','strategyId','fabricMasterId','policyVersion','recommendationVersion') or jsonb_typeof(e.value)<>'string')
      or p_snapshot#>>'{customer_summary,consultationContext,fabricMasterId}' is distinct from p_snapshot->>'fabric_master_id'
      or not coalesce(p_snapshot#>>'{customer_summary,consultationContext,sessionId}' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',false)
      or not coalesce(p_snapshot#>>'{customer_summary,consultationContext,strategyId}' in ('overall','tonal','complementary','pattern-style','bold'),false)
      or not coalesce(p_snapshot#>>'{customer_summary,consultationContext,policyVersion}' ~ '^[a-zA-Z0-9._-]{1,100}$',false)
      or not coalesce((p_snapshot#>>'{customer_summary,consultationContext,recommendationVersion}' ~ '^sha256:[0-9a-f]{64}$') or (p_snapshot#>>'{customer_summary,consultationContext,recommendationVersion}' = 'initial:' || (p_snapshot#>>'{customer_summary,consultationContext,sessionId}')),false)
      or not exists(select 1 from curtainsuk_private.hci_staging_versions v where v.session_id::text=p_snapshot#>>'{customer_summary,consultationContext,sessionId}')
      then raise exception 'Invalid checkout consultation provenance'; end if;
  end if;
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
         'deliveryShownSeparately', 'patternAllowance', 'consultationContext'
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
      and fabric.lifecycle_state <> 'DISCONTINUED'
      and (fabric.storefront_selectable or fabric.staging_catalog_visible)
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
    and supplier_snapshot.checked_at <= clock_timestamp()
    and supplier_snapshot.lifecycle_state <> 'DISCONTINUED'
    and ((supplier_snapshot.supplier_id='prestigious-textiles' AND (supplier_price.standard_trade_price>0 OR (supplier_price.cut_trade_price>0 and supplier_snapshot.snapshot_id like 'pt-pdf-cut:%' and supplier_snapshot.source_type='OTHER' and supplier_snapshot.source_name='Prestigious Textiles August 2026 Price List; owner-confirmed Cut Price'))) OR (supplier_snapshot.supplier_id<>'prestigious-textiles' AND supplier_price.cut_trade_price>0))
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
  order by
    case when supplier_snapshot.supplier_id='prestigious-textiles'
       and supplier_price.cut_trade_price>0
       and supplier_snapshot.snapshot_id like 'pt-pdf-cut:%'
       and supplier_snapshot.source_type='OTHER'
       and supplier_snapshot.source_name='Prestigious Textiles August 2026 Price List; owner-confirmed Cut Price' then 0
       when supplier_snapshot.supplier_id='prestigious-textiles'
       and supplier_price.standard_trade_price>0 then 1 else 2 end,
    supplier_snapshot.checked_at desc, supplier_snapshot.snapshot_id desc
  limit 1;
  if current_price_snapshot_id is null then
    raise exception 'Checkout approved supplier price is missing';
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
$function$
;

CREATE OR REPLACE FUNCTION curtainsuk_private.promote_fabric_for_staging_projection(p_supplier_id text, p_supplier_sku text, p_snapshot_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not exists (
    select 1
    from curtainsuk_private.supplier_snapshots snapshot
    join curtainsuk_private.supplier_snapshot_prices price
      on price.snapshot_id = snapshot.snapshot_id
    where snapshot.snapshot_id = p_snapshot_id
      and snapshot.supplier_id = p_supplier_id
      and snapshot.supplier_sku = p_supplier_sku
      and snapshot.validation_status = 'VALIDATED'
      and snapshot.checked_at <= clock_timestamp()
      and snapshot.lifecycle_state <> 'DISCONTINUED'
      and ((snapshot.supplier_id='prestigious-textiles' AND (price.standard_trade_price>0 OR (price.cut_trade_price>0 and snapshot.snapshot_id like 'pt-pdf-cut:%' and snapshot.source_type='OTHER' and snapshot.source_name='Prestigious Textiles August 2026 Price List; owner-confirmed Cut Price'))) OR (snapshot.supplier_id<>'prestigious-textiles' AND price.cut_trade_price>0))
      and price.currency = 'GBP'
      and (
        select event.promotion_state
        from curtainsuk_private.supplier_promotion_events event
        where event.snapshot_id = snapshot.snapshot_id
        order by
          event.created_at desc,
          case event.promotion_state
            when 'EXPIRED' then 4
            when 'REJECTED' then 3
            when 'APPROVED_FOR_PROJECTION' then 2
            when 'VALIDATED' then 1
            else 0
          end desc,
          event.event_id desc
        limit 1
      ) = 'APPROVED_FOR_PROJECTION'
  ) then
    raise exception 'Genuine approved supplier base price is required';
  end if;

  update curtainsuk_private.fabric_supplier_links
  set price_verification_status = 'VERIFIED'
  where supplier_id = p_supplier_id and supplier_sku = p_supplier_sku;

  update curtainsuk_private.fabric_colourways
  set price_verification_status = 'VERIFIED',
      storefront_selectable = true,
      updated_at = clock_timestamp()
  where supplier_id = p_supplier_id
    and supplier_sku = p_supplier_sku
    and lifecycle_state <> 'DISCONTINUED';
end;
$function$
;

CREATE OR REPLACE FUNCTION curtainsuk_private.current_retail_guide_prices()
RETURNS TABLE(supplier_id text, supplier_sku text, guide_minor bigint)
LANGUAGE sql STABLE SET search_path TO '' AS $function$
  SELECT DISTINCT ON (s.supplier_id, s.supplier_sku)
    s.supplier_id::text, s.supplier_sku::text,
    (round((CASE WHEN s.supplier_id='prestigious-textiles' AND p.cut_trade_price>0 AND s.snapshot_id LIKE 'pt-pdf-cut:%' AND s.source_type='OTHER' AND s.source_name='Prestigious Textiles August 2026 Price List; owner-confirmed Cut Price' THEN p.cut_trade_price WHEN s.supplier_id='prestigious-textiles' THEN p.standard_trade_price ELSE p.cut_trade_price END)*100)*3)::bigint
  FROM curtainsuk_private.supplier_snapshots s
  JOIN curtainsuk_private.supplier_snapshot_prices p USING(snapshot_id)
  WHERE s.validation_status='VALIDATED' AND s.checked_at<=now() AND p.currency='GBP'
    AND ((s.supplier_id='prestigious-textiles' AND (p.standard_trade_price>0 OR (p.cut_trade_price>0 AND s.snapshot_id LIKE 'pt-pdf-cut:%' AND s.source_type='OTHER' AND s.source_name='Prestigious Textiles August 2026 Price List; owner-confirmed Cut Price'))) OR (s.supplier_id<>'prestigious-textiles' AND p.cut_trade_price>0))
    AND (SELECT e.promotion_state FROM curtainsuk_private.supplier_promotion_events e
      WHERE e.snapshot_id=s.snapshot_id ORDER BY e.created_at DESC, e.event_id DESC LIMIT 1)='APPROVED_FOR_PROJECTION'
  ORDER BY s.supplier_id, s.supplier_sku, CASE WHEN s.supplier_id='prestigious-textiles' AND p.cut_trade_price>0 AND s.snapshot_id LIKE 'pt-pdf-cut:%' AND s.source_type='OTHER' AND s.source_name='Prestigious Textiles August 2026 Price List; owner-confirmed Cut Price' THEN 0 WHEN s.supplier_id='prestigious-textiles' AND p.standard_trade_price>0 THEN 1 ELSE 2 END, s.checked_at DESC, s.snapshot_id DESC
$function$;

CREATE OR REPLACE VIEW curtainsuk_private.browse_current_guide_prices_set_v1
WITH (security_invoker = true)
AS
WITH latest_promotion AS MATERIALIZED (
  SELECT DISTINCT ON (snapshot_id) snapshot_id, promotion_state
  FROM curtainsuk_private.supplier_promotion_events
  ORDER BY snapshot_id, created_at DESC, event_id DESC
)
SELECT DISTINCT ON (s.supplier_id, s.supplier_sku)
  s.supplier_id::text AS supplier_id,
  s.supplier_sku::text AS supplier_sku,
  (round((CASE
    WHEN s.supplier_id='prestigious-textiles' AND p.cut_trade_price>0 AND s.snapshot_id LIKE 'pt-pdf-cut:%' AND s.source_type='OTHER' AND s.source_name='Prestigious Textiles August 2026 Price List; owner-confirmed Cut Price' THEN p.cut_trade_price
    WHEN s.supplier_id='prestigious-textiles' THEN p.standard_trade_price
    ELSE p.cut_trade_price END) * 100) * 3)::bigint AS guide_minor
FROM curtainsuk_private.supplier_snapshots s
JOIN curtainsuk_private.supplier_snapshot_prices p USING (snapshot_id)
JOIN latest_promotion e ON e.snapshot_id=s.snapshot_id AND e.promotion_state='APPROVED_FOR_PROJECTION'
WHERE s.validation_status='VALIDATED' AND s.checked_at<=now() AND p.currency='GBP'
  AND ((s.supplier_id='prestigious-textiles' AND (p.standard_trade_price>0 OR (p.cut_trade_price>0 AND s.snapshot_id LIKE 'pt-pdf-cut:%' AND s.source_type='OTHER' AND s.source_name='Prestigious Textiles August 2026 Price List; owner-confirmed Cut Price')))
    OR (s.supplier_id<>'prestigious-textiles' AND p.cut_trade_price>0))
ORDER BY s.supplier_id, s.supplier_sku,
  CASE WHEN s.supplier_id='prestigious-textiles' AND p.cut_trade_price>0 AND s.snapshot_id LIKE 'pt-pdf-cut:%' AND s.source_type='OTHER' AND s.source_name='Prestigious Textiles August 2026 Price List; owner-confirmed Cut Price' THEN 0 WHEN s.supplier_id='prestigious-textiles' AND p.standard_trade_price>0 THEN 1 ELSE 2 END,
  s.checked_at DESC, s.snapshot_id DESC;


-- The batch runner marks only its approved first-50 records dirty. Existing
-- prepared projections keep their established Standard-price output.

DO $check$
DECLARE definition text; fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'fabric_commercial_evidence', 'create_staging_configuration_snapshot',
    'promote_fabric_for_staging_projection', 'current_retail_guide_prices'
  ] LOOP
    SELECT pg_get_functiondef(p.oid) INTO definition
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='curtainsuk_private' AND p.proname=fn;
    IF definition IS NULL OR definition !~ 'cut_trade_price' OR definition !~ 'standard_trade_price' THEN
      RAISE EXCEPTION 'PT_CUT_PRICE_COMPATIBILITY_CONSUMER_INVALID:%',fn;
    END IF;
  END LOOP;
  SELECT pg_get_viewdef('curtainsuk_private.browse_current_guide_prices_set_v1'::regclass,true) INTO definition;
  IF definition !~ 'cut_trade_price' OR definition !~ 'standard_trade_price' THEN
    RAISE EXCEPTION 'PT_CUT_PRICE_COMPATIBILITY_BROWSE_VIEW_INVALID';
  END IF;
END
$check$;
NOTIFY pgrst, 'reload schema';
