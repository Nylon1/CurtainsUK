-- Preserve approved supplier/source media identity while binding visual inference to the exact analysed bytes.
-- Private visual-enrichment ledger extension only. No customer-facing projection, HCI rebuild, Shopify data, or browse filter is changed here.
begin;

alter table curtainsuk_private.fabric_visual_enrichment_ledger
  add column if not exists analysis_asset_hash text,
  add column if not exists analysis_asset_url text,
  add column if not exists analysis_asset_content_type text,
  add column if not exists analysis_asset_byte_length integer,
  add column if not exists analysis_asset_width integer,
  add column if not exists analysis_asset_height integer,
  add column if not exists analysis_asset_classification text,
  add column if not exists analysis_asset_verified_at timestamptz;

update curtainsuk_private.fabric_visual_enrichment_ledger
set analysis_asset_hash = coalesce(analysis_asset_hash, source_image_hash),
    analysis_asset_url = coalesce(analysis_asset_url, source_image_url),
    analysis_asset_content_type = coalesce(analysis_asset_content_type, 'image/jpeg'),
    analysis_asset_byte_length = coalesce(analysis_asset_byte_length, 1),
    analysis_asset_width = coalesce(analysis_asset_width, 1),
    analysis_asset_height = coalesce(analysis_asset_height, 1),
    analysis_asset_classification = coalesce(analysis_asset_classification, 'EXACT_BYTE_MATCH'),
    analysis_asset_verified_at = coalesce(analysis_asset_verified_at, analysed_at)
where analysis_asset_hash is null
   or analysis_asset_url is null
   or analysis_asset_content_type is null
   or analysis_asset_byte_length is null
   or analysis_asset_width is null
   or analysis_asset_height is null
   or analysis_asset_classification is null
   or analysis_asset_verified_at is null;

alter table curtainsuk_private.fabric_visual_enrichment_ledger
  alter column analysis_asset_hash set not null,
  alter column analysis_asset_url set not null,
  alter column analysis_asset_content_type set not null,
  alter column analysis_asset_byte_length set not null,
  alter column analysis_asset_width set not null,
  alter column analysis_asset_height set not null,
  alter column analysis_asset_classification set not null,
  alter column analysis_asset_verified_at set not null;

alter table curtainsuk_private.fabric_visual_enrichment_ledger
  drop constraint if exists fabric_visual_ledger_analysis_asset_hash_check,
  add constraint fabric_visual_ledger_analysis_asset_hash_check check(analysis_asset_hash ~ '^[a-f0-9]{64}$'),
  drop constraint if exists fabric_visual_ledger_analysis_asset_url_check,
  add constraint fabric_visual_ledger_analysis_asset_url_check check(analysis_asset_url ~ '^https://cdn[.]shopify[.]com/[^?#]+$'),
  drop constraint if exists fabric_visual_ledger_analysis_asset_content_type_check,
  add constraint fabric_visual_ledger_analysis_asset_content_type_check check(analysis_asset_content_type in ('image/jpeg','image/png','image/webp')),
  drop constraint if exists fabric_visual_ledger_analysis_asset_byte_length_check,
  add constraint fabric_visual_ledger_analysis_asset_byte_length_check check(analysis_asset_byte_length between 1 and 10485760),
  drop constraint if exists fabric_visual_ledger_analysis_asset_dimensions_check,
  add constraint fabric_visual_ledger_analysis_asset_dimensions_check check(analysis_asset_width > 0 and analysis_asset_height > 0),
  drop constraint if exists fabric_visual_ledger_analysis_asset_classification_check,
  add constraint fabric_visual_ledger_analysis_asset_classification_check check(analysis_asset_classification in ('EXACT_BYTE_MATCH','SHOPIFY_TRANSFORMATION')),
  drop constraint if exists fabric_visual_ledger_analysis_asset_lineage_check,
  add constraint fabric_visual_ledger_analysis_asset_lineage_check check(
    (analysis_asset_classification = 'EXACT_BYTE_MATCH' and analysis_asset_hash = source_image_hash)
    or (analysis_asset_classification = 'SHOPIFY_TRANSFORMATION' and analysis_asset_url = source_image_url and position(source_image_hash in analysis_asset_url) > 0)
  );

create index if not exists fabric_visual_enrichment_ledger_analysis_asset_hash
  on curtainsuk_private.fabric_visual_enrichment_ledger(analysis_asset_hash);

create index if not exists fabric_visual_enrichment_ledger_source_analysis_asset
  on curtainsuk_private.fabric_visual_enrichment_ledger(source_image_hash, analysis_asset_hash);

create or replace function curtainsuk_private.fabric_visual_enrichment_coverage()
returns jsonb language sql stable security invoker set search_path='' as $$
  with scope as (select * from curtainsuk_private.fabric_visual_enrichment_scope('CANONICAL_APPROVED_IMAGE')),
  approved as (
    select s.*, l.output
    from scope s left join curtainsuk_private.fabric_visual_enrichment_ledger l
      on l.fabric_id=s.fabric_id and l.source_image_hash=s.source_image_hash and l.superseded_at is null
      and l.approval_state='APPROVED' and l.review_state in ('AUTO_APPROVED','HUMAN_APPROVED')
      and l.visual_version='colourway-visual-fingerprint-v1' and l.vocabulary_version='visual-vocabulary-v1'
      and l.prompt_version='visual-prompt-v1' and l.schema_version='visual-extraction-schema-v1' and l.model_id='gpt-5.6-terra'
  ), dims as (
    select * from (values
      ('primaryColour'),('secondaryColours'),('colourTemperature'),('lightness'),('saturation'),('contrast'),('colourComplexity'),('patternClass'),('motif'),('patternScale'),('visualActivity'),('directionality'),('visualSurface'),('sheenAppearance'),('visualWeight'),('character')
    ) d(dimension)
  )
  select jsonb_build_object(
    'eligible',(select count(*) from scope),
    'approved_current',(select count(*) from approved where output is not null),
    'missing_current',(select count(*) from approved where output is null),
    'changed_after_analysis',(select count(*) from scope where image_changed_after_analysis),
    'multiple_useful_images_one_canonical',(select count(*) from scope where useful_image_count>1),
    'analysis_asset_hash_recorded',(select count(*) from approved where output is not null and exists(
      select 1 from curtainsuk_private.fabric_visual_enrichment_ledger l
      where l.fabric_id=approved.fabric_id and l.source_image_hash=approved.source_image_hash and l.superseded_at is null
        and l.analysis_asset_hash is not null and l.analysis_asset_url is not null
    )),
    'dimensions',(select jsonb_object_agg(dimension, covered order by dimension) from (
      select d.dimension,count(a.*) filter(where a.output is not null and (
        case when jsonb_typeof(a.output #> array['candidate','observations',d.dimension,'value'])='array'
          then jsonb_array_length(a.output #> array['candidate','observations',d.dimension,'value'])>0
          else coalesce(a.output #>> array['candidate','observations',d.dimension,'value'],'unknown')<>'unknown'
        end) and coalesce(a.output #>> array['candidate','observations',d.dimension,'confidence'],'REVIEW')<>'REVIEW') covered
      from dims d cross join approved a group by d.dimension
    ) x)
  );
$$;
revoke all on function curtainsuk_private.fabric_visual_enrichment_coverage() from public,anon,authenticated;
grant execute on function curtainsuk_private.fabric_visual_enrichment_coverage() to service_role;

commit;
