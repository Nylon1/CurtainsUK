-- Optimised Fabric Master visual enrichment: design + colourway + resolved layers.
-- Private service-role ledger extension only. No customer-facing projection, HCI rebuild, Shopify data, or browse filter is changed here.
begin;

alter table curtainsuk_private.fabric_visual_enrichment_runs
  drop constraint if exists fabric_visual_enrichment_runs_scope_check;
alter table curtainsuk_private.fabric_visual_enrichment_runs
  add constraint fabric_visual_enrichment_runs_scope_check
  check(scope in ('CANONICAL_APPROVED_IMAGE','ALL_USEFUL_APPROVED_IMAGES','OPTIMISED_CANONICAL_DESIGN_COLOURWAY'));

alter table curtainsuk_private.fabric_visual_enrichment_ledger
  add column if not exists analysis_level text not null default 'COLOURWAY',
  add column if not exists design_fingerprint_id uuid references curtainsuk_private.fabric_visual_enrichment_ledger(ledger_id),
  add column if not exists colourway_fingerprint_id uuid references curtainsuk_private.fabric_visual_enrichment_ledger(ledger_id),
  add column if not exists field_provenance jsonb not null default '{}'::jsonb;

alter table curtainsuk_private.fabric_visual_enrichment_ledger
  drop constraint if exists fabric_visual_enrichment_ledger_analysis_level_check;
alter table curtainsuk_private.fabric_visual_enrichment_ledger
  add constraint fabric_visual_enrichment_ledger_analysis_level_check
  check(analysis_level in ('DESIGN','COLOURWAY','RESOLVED'));

alter table curtainsuk_private.fabric_visual_enrichment_ledger
  drop constraint if exists fabric_visual_enrichment_ledger_resolved_links_check;
alter table curtainsuk_private.fabric_visual_enrichment_ledger
  add constraint fabric_visual_enrichment_ledger_resolved_links_check
  check(
    (analysis_level <> 'RESOLVED' and design_fingerprint_id is null and colourway_fingerprint_id is null)
    or (analysis_level = 'RESOLVED' and design_fingerprint_id is not null and colourway_fingerprint_id is not null)
  );

drop index if exists curtainsuk_private.fabric_visual_enrichment_ledger_exact_lineage;
create unique index if not exists fabric_visual_enrichment_ledger_exact_lineage
  on curtainsuk_private.fabric_visual_enrichment_ledger
  (analysis_level,fabric_id,supplier_id,supplier_sku,source_image_hash,visual_version,vocabulary_version,prompt_version,schema_version,model_id)
  where superseded_at is null;

create index if not exists fabric_visual_enrichment_ledger_design_level
  on curtainsuk_private.fabric_visual_enrichment_ledger(supplier_id,brand_id,design_id,analysis_level,approval_state,review_state)
  where superseded_at is null;

create or replace function curtainsuk_private.fabric_visual_design_enrichment_scope()
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
  design_colourway_count integer,
  already_approved boolean,
  current_visual_digest text,
  current_review_state text
) language sql stable security invoker set search_path='' as $$
  with colourways as (
    select * from curtainsuk_private.fabric_visual_enrichment_scope('CANONICAL_APPROVED_IMAGE')
  ), ranked as (
    select c.*,
           count(*) over(partition by c.supplier_id,c.brand_id,c.design_id)::integer design_colourway_count,
           row_number() over(
             partition by c.supplier_id,c.brand_id,c.design_id
             order by c.source_image_rank asc, c.supplier_sku asc, c.fabric_id asc, c.source_image_hash asc
           )::integer design_rank
    from colourways c
  ), selected as (
    select * from ranked where design_rank=1
  ), current_design as (
    select distinct on (l.supplier_id,l.brand_id,l.design_id,l.source_image_hash) l.*
    from curtainsuk_private.fabric_visual_enrichment_ledger l
    where l.superseded_at is null and l.analysis_level='DESIGN' and l.visual_version='colourway-visual-fingerprint-v1'
      and l.vocabulary_version='visual-vocabulary-v1' and l.prompt_version='visual-prompt-v1'
      and l.schema_version='visual-extraction-schema-v1' and l.model_id='gpt-5.6-terra'
    order by l.supplier_id,l.brand_id,l.design_id,l.source_image_hash,l.imported_at desc
  )
  select s.fabric_id,s.supplier_id,s.supplier_sku,s.brand_id,s.design_id,s.image_type,s.source_image_hash,s.source_image_url,
         s.source_image_rank,s.useful_image_count,s.design_colourway_count,
         coalesce(l.approval_state='APPROVED' and l.review_state in ('AUTO_APPROVED','HUMAN_APPROVED'),false) already_approved,
         l.visual_digest current_visual_digest,
         l.review_state current_review_state
  from selected s left join current_design l
    on l.supplier_id=s.supplier_id and l.brand_id=s.brand_id and l.design_id=s.design_id and l.source_image_hash=s.source_image_hash;
$$;
revoke all on function curtainsuk_private.fabric_visual_design_enrichment_scope() from public,anon,authenticated;
grant execute on function curtainsuk_private.fabric_visual_design_enrichment_scope() to service_role;

create or replace function curtainsuk_private.fabric_visual_optimised_plan()
returns jsonb language sql stable security invoker set search_path='' as $$
  with colourway as (select * from curtainsuk_private.fabric_visual_enrichment_scope('CANONICAL_APPROVED_IMAGE')),
  design as (select * from curtainsuk_private.fabric_visual_design_enrichment_scope()),
  design_counts as (
    select supplier_id,brand_id,design_id,count(*)::integer colourways
    from colourway group by supplier_id,brand_id,design_id
  ), existing_design as (
    select count(*)::integer n from design where already_approved
  ), existing_colourway as (
    select count(*)::integer n from colourway where already_approved
  )
  select jsonb_build_object(
    'governed_designs',(select count(*) from design),
    'eligible_colourways',(select count(*) from colourway),
    'representative_design_images_selected',(select count(*) from design where source_image_hash is not null),
    'colourway_images_resolved',(select count(*) from colourway where source_image_hash is not null),
    'single_colourway_designs',(select count(*) from design_counts where colourways=1),
    'two_to_three_colourway_designs',(select count(*) from design_counts where colourways between 2 and 3),
    'four_to_six_colourway_designs',(select count(*) from design_counts where colourways between 4 and 6),
    'seven_plus_colourway_designs',(select count(*) from design_counts where colourways>=7),
    'existing_design_fingerprints',(select n from existing_design),
    'existing_colourway_fingerprints',(select n from existing_colourway),
    'single_colourway_reusable_colourway_calls',(select count(*) from design_counts where colourways=1)
  );
$$;
revoke all on function curtainsuk_private.fabric_visual_optimised_plan() from public,anon,authenticated;
grant execute on function curtainsuk_private.fabric_visual_optimised_plan() to service_role;

commit;
