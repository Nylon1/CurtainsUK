-- Genuine supplier thumbnails may be used without manufacturing larger images.
alter table curtainsuk_private.fabric_media_assets
  drop constraint fabric_media_assets_width_check,
  drop constraint fabric_media_assets_height_check,
  add constraint fabric_media_assets_width_check check (width >= 32),
  add constraint fabric_media_assets_height_check check (height >= 32);

-- Owner catalogue activation rule: UNKNOWN is browsable; commercial gates are separate.
create or replace function curtainsuk_private.search_retail_fabrics(p_filters jsonb default '{}'::jsonb, p_page integer default 1, p_size integer default 24)
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
      and length(trim(c.supplier_sku)) > 0 and length(trim(c.colour_name)) > 0
      and length(trim(b.display_name)) > 0 and length(trim(d.display_name)) > 0
      and exists (select 1 from curtainsuk_private.fabric_media_mappings m
        join curtainsuk_private.fabric_media_assets a using(content_hash)
        where m.fabric_id=c.fabric_id and m.supplier_id=c.supplier_id and m.supplier_sku=c.supplier_sku
          and m.rights_state='APPROVED' and m.mapping_state='VERIFIED'
          and a.width > 0 and a.height > 0
          and a.shopify_cdn_url ~ '^https://cdn[.]shopify[.]com/[^?#]+$')
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

-- Activate the entire requested supplier catalogue in one set-based operation.
-- No price, stock, lifecycle, description or media provenance is rewritten.
with eligible as (
  select c.fabric_id, (c.lifecycle_state <> 'DISCONTINUED'
      and length(trim(c.supplier_sku)) > 0 and length(trim(c.colour_name)) > 0
      and length(trim(b.display_name)) > 0 and length(trim(d.display_name)) > 0
      and exists (select 1 from curtainsuk_private.fabric_media_mappings m
        join curtainsuk_private.fabric_media_assets a using(content_hash)
        where m.fabric_id=c.fabric_id and m.supplier_id=c.supplier_id and m.supplier_sku=c.supplier_sku
          and m.rights_state='APPROVED' and m.mapping_state='VERIFIED'
          and a.width > 0 and a.height > 0
          and a.shopify_cdn_url ~ '^https://cdn[.]shopify[.]com/[^?#]+$')) as visible
  from curtainsuk_private.fabric_colourways c
  join curtainsuk_private.supplier_brands b on b.brand_id=c.brand_id
  join curtainsuk_private.fabric_designs d on d.design_id=c.design_id
  where c.supplier_id in ('prestigious-textiles','sanderson-design-group')
)
update curtainsuk_private.fabric_colourways c
set staging_catalog_visible=e.visible
from eligible e where c.fabric_id=e.fabric_id
  and c.staging_catalog_visible is distinct from e.visible;
