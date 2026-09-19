-- Private OpenAI visual-enrichment ledger for Fabric Master.
-- No customer-facing projection, HCI rebuild, Shopify data, or browse filter is changed here.
begin;

create table if not exists curtainsuk_private.fabric_visual_enrichment_runs (
  run_id uuid primary key default gen_random_uuid(),
  run_label text not null check(length(trim(run_label)) between 1 and 160),
  scope text not null check(scope in ('CANONICAL_APPROVED_IMAGE','ALL_USEFUL_APPROVED_IMAGES')),
  visual_version text not null check(visual_version='colourway-visual-fingerprint-v1'),
  vocabulary_version text not null check(vocabulary_version='visual-vocabulary-v1'),
  prompt_version text not null check(prompt_version='visual-prompt-v1'),
  schema_version text not null check(schema_version='visual-extraction-schema-v1'),
  model_id text not null check(model_id='gpt-5.6-terra'),
  status text not null default 'RUNNING' check(status in ('RUNNING','SUCCEEDED','FAILED','PARTIAL','DRY_RUN')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  checkpoint jsonb not null default '{}'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  created_by text not null default current_user
);

create table if not exists curtainsuk_private.fabric_visual_enrichment_ledger (
  ledger_id uuid primary key default gen_random_uuid(),
  run_id uuid references curtainsuk_private.fabric_visual_enrichment_runs(run_id),
  fabric_id text not null references curtainsuk_private.fabric_colourways(fabric_id),
  supplier_id text not null,
  supplier_sku text not null,
  brand_id text not null,
  design_id text not null,
  image_type text not null check(image_type in ('MAIN','SWATCH','DETAIL','ROOM','ADDITIONAL')),
  source_image_hash text not null check(source_image_hash ~ '^[a-f0-9]{64}$'),
  source_image_url text not null check(source_image_url ~ '^https://cdn[.]shopify[.]com/[^?#]+$'),
  source_image_rank integer not null check(source_image_rank >= 1),
  useful_image_count integer not null check(useful_image_count >= source_image_rank),
  visual_version text not null check(visual_version='colourway-visual-fingerprint-v1'),
  vocabulary_version text not null check(vocabulary_version='visual-vocabulary-v1'),
  prompt_version text not null check(prompt_version='visual-prompt-v1'),
  schema_version text not null check(schema_version='visual-extraction-schema-v1'),
  model_id text not null check(model_id='gpt-5.6-terra'),
  analysed_at timestamptz not null,
  output jsonb not null,
  output_hash text not null check(output_hash ~ '^sha256:[a-f0-9]{64}$'),
  evidence_id text not null check(evidence_id ~ '^sha256:[a-f0-9]{64}$'),
  visual_digest text not null check(visual_digest ~ '^sha256:[a-f0-9]{64}$'),
  review_state text not null check(review_state in ('AUTO_APPROVED','REVIEW_REQUIRED','HUMAN_APPROVED','HUMAN_EXCLUDED','QUARANTINED')),
  review_policy text not null default 'visual-human-review-v1',
  approval_state text not null check(approval_state in ('APPROVED','PROPOSED','EXCLUDED','QUARANTINED')),
  failure_reason text check(failure_reason ~ '^[A-Z0-9_]+$'),
  imported_at timestamptz not null default now(),
  superseded_at timestamptz,
  constraint fabric_visual_ledger_identity_matches_media foreign key (fabric_id,image_type,source_image_hash)
    references curtainsuk_private.fabric_media_mappings(fabric_id,image_type,content_hash),
  constraint fabric_visual_ledger_current_media_identity check(length(trim(supplier_id))>0 and length(trim(supplier_sku))>0 and length(trim(brand_id))>0 and length(trim(design_id))>0),
  constraint fabric_visual_ledger_failure_state check((failure_reason is null) or approval_state='QUARANTINED')
);

create unique index if not exists fabric_visual_enrichment_ledger_exact_lineage
  on curtainsuk_private.fabric_visual_enrichment_ledger
  (fabric_id,supplier_id,supplier_sku,source_image_hash,visual_version,vocabulary_version,prompt_version,schema_version,model_id)
  where superseded_at is null;
create index if not exists fabric_visual_enrichment_ledger_fabric_current
  on curtainsuk_private.fabric_visual_enrichment_ledger(fabric_id,approval_state,review_state)
  where superseded_at is null;
create index if not exists fabric_visual_enrichment_ledger_image_hash
  on curtainsuk_private.fabric_visual_enrichment_ledger(source_image_hash);

create table if not exists curtainsuk_private.fabric_visual_enrichment_failures (
  failure_id uuid primary key default gen_random_uuid(),
  run_id uuid references curtainsuk_private.fabric_visual_enrichment_runs(run_id),
  fabric_id text not null references curtainsuk_private.fabric_colourways(fabric_id),
  supplier_id text not null,
  supplier_sku text not null,
  source_image_hash text not null check(source_image_hash ~ '^[a-f0-9]{64}$'),
  prompt_version text not null check(prompt_version='visual-prompt-v1'),
  schema_version text not null check(schema_version='visual-extraction-schema-v1'),
  model_id text not null check(model_id='gpt-5.6-terra'),
  failure_reason text not null check(failure_reason ~ '^[A-Z0-9_]+$'),
  failed_at timestamptz not null default now(),
  context jsonb not null default '{}'::jsonb
);
create index if not exists fabric_visual_enrichment_failures_run on curtainsuk_private.fabric_visual_enrichment_failures(run_id,failed_at);

alter table curtainsuk_private.fabric_visual_enrichment_runs enable row level security;
alter table curtainsuk_private.fabric_visual_enrichment_ledger enable row level security;
alter table curtainsuk_private.fabric_visual_enrichment_failures enable row level security;
revoke all on curtainsuk_private.fabric_visual_enrichment_runs,curtainsuk_private.fabric_visual_enrichment_ledger,curtainsuk_private.fabric_visual_enrichment_failures from public,anon,authenticated;
grant all on curtainsuk_private.fabric_visual_enrichment_runs,curtainsuk_private.fabric_visual_enrichment_ledger,curtainsuk_private.fabric_visual_enrichment_failures to service_role;

create or replace function curtainsuk_private.fabric_visual_enrichment_scope(p_scope text default 'CANONICAL_APPROVED_IMAGE')
returns table(
  fabric_id text,
  supplier_id text,
  supplier_sku text,
  brand_id text,
  design_id text,
  image_type text,
  source_image_hash text,
  source_image_url text,
  source_image_rank integer,
  useful_image_count integer,
  already_approved boolean,
  current_visual_digest text,
  current_review_state text,
  image_changed_after_analysis boolean
) language sql stable security invoker set search_path='' as $$
  with useful_images as (
    select c.fabric_id,c.supplier_id,c.supplier_sku,c.brand_id,c.design_id,
           m.image_type,m.content_hash source_image_hash,a.shopify_cdn_url source_image_url,
           row_number() over(partition by c.fabric_id order by case m.image_type when 'MAIN' then 0 when 'SWATCH' then 1 when 'DETAIL' then 2 when 'ROOM' then 3 else 4 end, m.content_hash)::integer source_image_rank,
           count(*) over(partition by c.fabric_id)::integer useful_image_count
    from curtainsuk_private.fabric_colourways c
    join curtainsuk_private.fabric_media_mappings m on m.fabric_id=c.fabric_id and m.supplier_id=c.supplier_id and m.supplier_sku=c.supplier_sku
    join curtainsuk_private.fabric_media_assets a on a.content_hash=m.content_hash
    where c.staging_catalog_visible and c.lifecycle_state <> 'DISCONTINUED'
      and length(trim(c.supplier_sku))>0 and length(trim(c.colour_name))>0
      and length(trim(c.brand_id))>0 and length(trim(c.design_id))>0
      and m.rights_state='APPROVED' and m.mapping_state='VERIFIED'
      and a.width>0 and a.height>0 and a.shopify_cdn_url ~ '^https://cdn[.]shopify[.]com/[^?#]+$'
  ), selected as (
    select * from useful_images where p_scope='ALL_USEFUL_APPROVED_IMAGES' or (p_scope='CANONICAL_APPROVED_IMAGE' and source_image_rank=1)
  ), current_ledger as (
    select distinct on (l.fabric_id,l.source_image_hash) l.*
    from curtainsuk_private.fabric_visual_enrichment_ledger l
    where l.superseded_at is null and l.visual_version='colourway-visual-fingerprint-v1'
      and l.vocabulary_version='visual-vocabulary-v1' and l.prompt_version='visual-prompt-v1'
      and l.schema_version='visual-extraction-schema-v1' and l.model_id='gpt-5.6-terra'
    order by l.fabric_id,l.source_image_hash,l.imported_at desc
  )
  select s.fabric_id,s.supplier_id,s.supplier_sku,s.brand_id,s.design_id,s.image_type,s.source_image_hash,s.source_image_url,
         s.source_image_rank,s.useful_image_count,
         coalesce(l.approval_state='APPROVED' and l.review_state in ('AUTO_APPROVED','HUMAN_APPROVED'),false) already_approved,
         l.visual_digest current_visual_digest,
         l.review_state current_review_state,
         exists(
           select 1 from curtainsuk_private.fabric_visual_enrichment_ledger prev
           where prev.fabric_id=s.fabric_id and prev.supplier_id=s.supplier_id and prev.supplier_sku=s.supplier_sku
             and prev.superseded_at is null and prev.source_image_hash<>s.source_image_hash
             and prev.visual_version='colourway-visual-fingerprint-v1' and prev.model_id='gpt-5.6-terra'
         ) image_changed_after_analysis
  from selected s left join current_ledger l on l.fabric_id=s.fabric_id and l.source_image_hash=s.source_image_hash;
$$;
revoke all on function curtainsuk_private.fabric_visual_enrichment_scope(text) from public,anon,authenticated;
grant execute on function curtainsuk_private.fabric_visual_enrichment_scope(text) to service_role;

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
