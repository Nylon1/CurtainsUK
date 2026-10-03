create or replace view curtainsuk_private.fabric_visual_knowledge as
with scope as (
  select fabric_id,supplier_id,supplier_sku,brand_id,design_id,image_type,source_image_hash
  from curtainsuk_private.fabric_visual_enrichment_scope('CANONICAL_APPROVED_IMAGE')
),
designs as (
  select distinct on (supplier_id,brand_id,design_id)
    supplier_id,brand_id,design_id,ledger_id,output,approval_state,review_state,field_provenance
  from curtainsuk_private.fabric_visual_enrichment_ledger
  where analysis_level='DESIGN' and superseded_at is null
  order by supplier_id,brand_id,design_id,imported_at desc
),
colourways as (
  select distinct on (fabric_id)
    fabric_id,ledger_id,output,approval_state,review_state,field_provenance
  from curtainsuk_private.fabric_visual_enrichment_ledger
  where analysis_level='COLOURWAY' and superseded_at is null
  order by fabric_id,imported_at desc
),
resolved as (
  select distinct on (fabric_id)
    fabric_id,ledger_id,output,approval_state,review_state,field_provenance
  from curtainsuk_private.fabric_visual_enrichment_ledger
  where analysis_level='RESOLVED' and superseded_at is null
  order by fabric_id,imported_at desc
),
pending_designs as (
  select distinct supplier_id, context->>'design_id' as design_id
  from curtainsuk_private.fabric_visual_enrichment_failures
  where failure_reason='OPENAI_RESPONSE_429'
),
joined as (
  select s.*,d.ledger_id as design_ledger_id,d.output->'candidate'->'observations' as design_observations,
    d.output->'candidate'->'reviewFlags' as design_review_flags,d.approval_state as design_approval_state,d.field_provenance as design_field_provenance,
    c.ledger_id as colourway_ledger_id,c.output->'candidate'->'observations' as colourway_observations,
    c.output->'candidate'->'reviewFlags' as colourway_review_flags,c.approval_state as colourway_approval_state,c.field_provenance as colourway_field_provenance,
    r.ledger_id as resolved_ledger_id,r.output->'candidate'->'observations' as resolved_observations,
    r.output->'candidate'->'reviewFlags' as resolved_review_flags,r.approval_state as resolved_approval_state,r.review_state as resolved_review_state,
    r.output->'fieldProvenance' as resolved_field_provenance,
    exists(select 1 from pending_designs p where p.supplier_id=s.supplier_id and p.design_id=s.design_id) as pending_retry
  from scope s
  left join designs d using(supplier_id,brand_id,design_id)
  left join colourways c using(fabric_id)
  left join resolved r using(fabric_id)
),
fields as (
  select j.*,
    jsonb_build_object(
      'primaryColour',coalesce(resolved_observations->'primaryColour',colourway_observations->'primaryColour',design_observations->'primaryColour','{"value":"unknown","confidence":"REVIEW"}'::jsonb),
      'secondaryColours',coalesce(resolved_observations->'secondaryColours',colourway_observations->'secondaryColours',design_observations->'secondaryColours','{"value":[],"confidence":"REVIEW"}'::jsonb),
      'colourTemperature',coalesce(resolved_observations->'colourTemperature',colourway_observations->'colourTemperature',design_observations->'colourTemperature','{"value":"unknown","confidence":"REVIEW"}'::jsonb),
      'lightness',coalesce(resolved_observations->'lightness',colourway_observations->'lightness',design_observations->'lightness','{"value":"unknown","confidence":"REVIEW"}'::jsonb),
      'saturation',coalesce(resolved_observations->'saturation',colourway_observations->'saturation',design_observations->'saturation','{"value":"unknown","confidence":"REVIEW"}'::jsonb),
      'contrast',coalesce(resolved_observations->'contrast',colourway_observations->'contrast',design_observations->'contrast','{"value":"unknown","confidence":"REVIEW"}'::jsonb),
      'colourComplexity',coalesce(resolved_observations->'colourComplexity',colourway_observations->'colourComplexity',design_observations->'colourComplexity','{"value":"unknown","confidence":"REVIEW"}'::jsonb),
      'patternClass',coalesce(resolved_observations->'patternClass',design_observations->'patternClass',colourway_observations->'patternClass','{"value":"unknown","confidence":"REVIEW"}'::jsonb),
      'motif',coalesce(resolved_observations->'motif',design_observations->'motif',colourway_observations->'motif','{"value":[],"confidence":"REVIEW"}'::jsonb),
      'patternScale',coalesce(resolved_observations->'patternScale',design_observations->'patternScale',colourway_observations->'patternScale','{"value":"unknown","confidence":"REVIEW"}'::jsonb),
      'visualActivity',coalesce(resolved_observations->'visualActivity',colourway_observations->'visualActivity',design_observations->'visualActivity','{"value":"unknown","confidence":"REVIEW"}'::jsonb),
      'directionality',coalesce(resolved_observations->'directionality',design_observations->'directionality',colourway_observations->'directionality','{"value":"unknown","confidence":"REVIEW"}'::jsonb),
      'visualSurface',coalesce(resolved_observations->'visualSurface',design_observations->'visualSurface',colourway_observations->'visualSurface','{"value":[],"confidence":"REVIEW"}'::jsonb),
      'sheenAppearance',coalesce(resolved_observations->'sheenAppearance',design_observations->'sheenAppearance',colourway_observations->'sheenAppearance','{"value":"unknown","confidence":"REVIEW"}'::jsonb),
      'visualWeight',coalesce(resolved_observations->'visualWeight',colourway_observations->'visualWeight',design_observations->'visualWeight','{"value":"unknown","confidence":"REVIEW"}'::jsonb),
      'character',coalesce(resolved_observations->'character',colourway_observations->'character',design_observations->'character','{"value":[],"confidence":"REVIEW"}'::jsonb)
    ) as visual_fields,
    coalesce(resolved_field_provenance,colourway_field_provenance,design_field_provenance,'{}'::jsonb) as provenance
  from joined j
)
select fabric_id,supplier_id,supplier_sku,brand_id,design_id,image_type,source_image_hash,
  case
    when pending_retry then 'PENDING_EXTERNAL_RETRY'
    when resolved_ledger_id is null and design_ledger_id is null and colourway_ledger_id is null then 'NO_USABLE_ENRICHMENT'
    when resolved_ledger_id is not null and resolved_approval_state='APPROVED' and resolved_review_state in ('AUTO_APPROVED','HUMAN_APPROVED') then 'COMPLETE'
    when resolved_ledger_id is not null or design_ledger_id is not null or colourway_ledger_id is not null then 'PARTIAL_GOVERNED'
    else 'QUARANTINED'
  end as knowledge_state,
  resolved_ledger_id,design_ledger_id,colourway_ledger_id,
  visual_fields,provenance,
  jsonb_build_object('designReviewFlags',coalesce(design_review_flags,'[]'::jsonb),'colourwayReviewFlags',coalesce(colourway_review_flags,'[]'::jsonb),'resolvedReviewFlags',coalesce(resolved_review_flags,'[]'::jsonb)) as review_context
from fields;
revoke all on curtainsuk_private.fabric_visual_knowledge from public,anon,authenticated;
grant select on curtainsuk_private.fabric_visual_knowledge to service_role;