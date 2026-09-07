-- Staging catalogue media only. No customer uploads or commercial fields.
create table curtainsuk_private.fabric_media_assets (
  content_hash text primary key check(content_hash ~ '^[a-f0-9]{64}$'),
  shopify_file_id text unique not null check(shopify_file_id ~ '^gid://shopify/MediaImage/[0-9]+$'),
  shopify_cdn_url text not null check(shopify_cdn_url ~ '^https://cdn[.]shopify[.]com/[^?#]+$'),
  width integer not null check(width >= 400), height integer not null check(height >= 400),
  imported_at timestamptz not null default now()
);
create table curtainsuk_private.fabric_media_mappings (
  fabric_id text not null references curtainsuk_private.fabric_colourways(fabric_id),
  content_hash text not null references curtainsuk_private.fabric_media_assets(content_hash),
  image_type text not null check(image_type in ('MAIN','SWATCH','DETAIL','ROOM','ADDITIONAL')),
  supplier_id text not null, supplier_sku text not null,
  source_reference text not null check(length(source_reference) <= 200 and source_reference !~* 'https?:|token|cookie|password|authorization'),
  rights_state text not null check(rights_state in ('APPROVED','PENDING','REJECTED')),
  mapping_state text not null check(mapping_state in ('VERIFIED','UNRESOLVED','REJECTED')),
  imported_at timestamptz not null default now(),
  primary key(fabric_id,image_type,content_hash)
);
create index fabric_media_mappings_hash on curtainsuk_private.fabric_media_mappings(content_hash);
create table curtainsuk_private.fabric_media_checkpoints (
  supplier_id text not null, supplier_sku text not null,
  fabric_id text not null references curtainsuk_private.fabric_colourways(fabric_id),
  state text not null check(state in ('FOUND','MISSING','DOWNLOADED','UPLOADED','FAILED')),
  failure_reason text check(failure_reason ~ '^[A-Z0-9_]+$'),
  updated_at timestamptz not null default now(),
  primary key(supplier_id,supplier_sku)
);
create index fabric_media_checkpoints_fabric on curtainsuk_private.fabric_media_checkpoints(fabric_id);
create table curtainsuk_private.fabric_retail_profiles (
  fabric_id text primary key references curtainsuk_private.fabric_colourways(fabric_id),
  description text not null default '', description_validated boolean not null default false,
  colour_families text[] not null default '{UNKNOWN}', patterns text[] not null default '{UNKNOWN}',
  characters text[] not null default '{UNKNOWN}', styles text[] not null default '{UNKNOWN}',
  rooms text[] not null default '{}', window_types text[] not null default '{}', headings text[] not null default '{}', linings text[] not null default '{}',
  classification_evidence text not null default '',
  -- Future capabilities stay private and are never used for customer claims.
  specialist_capabilities jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
alter table curtainsuk_private.fabric_media_assets enable row level security;
alter table curtainsuk_private.fabric_media_mappings enable row level security;
alter table curtainsuk_private.fabric_media_checkpoints enable row level security;
alter table curtainsuk_private.fabric_retail_profiles enable row level security;
revoke all on curtainsuk_private.fabric_media_assets,curtainsuk_private.fabric_media_mappings,curtainsuk_private.fabric_media_checkpoints,curtainsuk_private.fabric_retail_profiles from public,anon,authenticated;
grant all on curtainsuk_private.fabric_media_assets,curtainsuk_private.fabric_media_mappings,curtainsuk_private.fabric_media_checkpoints,curtainsuk_private.fabric_retail_profiles to service_role;

create function curtainsuk_private.search_retail_fabrics(p_filters jsonb default '{}'::jsonb, p_page integer default 1, p_size integer default 24)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with eligible as (
    select c.fabric_id,c.colour_name,c.sample_available,c.storefront_selectable,c.lifecycle_state,
      b.display_name brand,d.display_name design,co.display_name collection,
      r.colour_families,r.patterns,r.characters,r.styles,r.window_types
    from curtainsuk_private.fabric_colourways c
    join curtainsuk_private.supplier_brands b on b.brand_id=c.brand_id
    join curtainsuk_private.fabric_designs d on d.design_id=c.design_id
    join curtainsuk_private.fabric_collections co on co.collection_id=d.collection_id
    left join curtainsuk_private.fabric_retail_profiles r on r.fabric_id=c.fabric_id
    where c.staging_catalog_visible and c.lifecycle_state <> 'DISCONTINUED'
  ), matched as (
    select * from eligible e where
      (coalesce(p_filters->>'query','')='' or to_tsvector('simple',concat_ws(' ',brand,design,collection,colour_name)) @@ plainto_tsquery('simple',left(p_filters->>'query',100)))
      and (coalesce(p_filters->>'brand','')='' or brand=p_filters->>'brand')
      and (coalesce(p_filters->>'collection','')='' or collection=p_filters->>'collection')
      and (coalesce(p_filters->>'colour','')='' or p_filters->>'colour'=any(colour_families))
      and (coalesce(p_filters->>'pattern','')='' or p_filters->>'pattern'=any(patterns))
      and (coalesce(p_filters->>'character','')='' or p_filters->>'character'=any(characters))
      and (coalesce(p_filters->>'style','')='' or p_filters->>'style'=any(styles))
      and (coalesce(p_filters->>'window','')='' or p_filters->>'window'=any(window_types))
      and (coalesce(p_filters->>'sample','')='' or (p_filters->>'sample'='AVAILABLE' and sample_available=true) or (p_filters->>'sample'='UNAVAILABLE' and sample_available=false))
      and (coalesce(p_filters->>'availability','')='' or (p_filters->>'availability'='CURRENT' and lifecycle_state='CURRENT') or (p_filters->>'availability'='CONFIRM' and lifecycle_state='UNKNOWN'))
  ), page as (
    select fabric_id,brand,design,colour_name from matched order by brand,design,colour_name,fabric_id
    limit greatest(1,least(p_size,48)) offset ((greatest(1,least(p_page,10000))-1)*greatest(1,least(p_size,48)))
  ) select jsonb_build_object('ids',coalesce((select jsonb_agg(fabric_id order by brand,design,colour_name,fabric_id) from page),'[]'::jsonb),
    'total',(select count(*) from matched),
    'brands',(select coalesce(jsonb_agg(brand order by brand),'[]'::jsonb) from (select distinct brand from eligible) b),
    'collections',(select coalesce(jsonb_agg(collection order by collection),'[]'::jsonb) from (select distinct collection from eligible) co));
$$;
revoke all on function curtainsuk_private.search_retail_fabrics(jsonb,integer,integer) from public,anon,authenticated;
grant execute on function curtainsuk_private.search_retail_fabrics(jsonb,integer,integer) to service_role;
