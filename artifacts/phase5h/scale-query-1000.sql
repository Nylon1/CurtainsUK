-- Read-only internal scale projection. Deliberately includes unverified identities; never deployed as the public readiness query.
with ranked as (
 select fabric_id,brand_id,row_number() over(partition by brand_id order by case when staging_catalog_visible then 0 else 1 end,fabric_id) rn
 from curtainsuk_private.fabric_colourways
), eligible as (
    select c.fabric_id,c.colour_name,c.sample_available,c.storefront_selectable,c.lifecycle_state,
      b.display_name brand,d.display_name design,co.display_name collection,
      r.colour_families,r.patterns,r.characters,r.styles,r.window_types
    from curtainsuk_private.fabric_colourways c
    join curtainsuk_private.supplier_brands b on b.brand_id=c.brand_id
    join curtainsuk_private.fabric_designs d on d.design_id=c.design_id
    join curtainsuk_private.fabric_collections co on co.collection_id=d.collection_id
    left join curtainsuk_private.fabric_retail_profiles r on r.fabric_id=c.fabric_id
    where c.fabric_id in (select fabric_id from ranked where rn <= case when brand_id='prestigious-textiles' then 250 else 125 end)
  ), matched as (
    select * from eligible e where
      (coalesce('{}'::jsonb->>'query','')='' or to_tsvector('simple',concat_ws(' ',brand,design,collection,colour_name)) @@ plainto_tsquery('simple',left('{}'::jsonb->>'query',100)))
      and (coalesce('{}'::jsonb->>'brand','')='' or brand='{}'::jsonb->>'brand')
      and (coalesce('{}'::jsonb->>'collection','')='' or collection='{}'::jsonb->>'collection')
      and (coalesce('{}'::jsonb->>'colour','')='' or '{}'::jsonb->>'colour'=any(colour_families))
      and (coalesce('{}'::jsonb->>'pattern','')='' or '{}'::jsonb->>'pattern'=any(patterns))
      and (coalesce('{}'::jsonb->>'character','')='' or '{}'::jsonb->>'character'=any(characters))
      and (coalesce('{}'::jsonb->>'style','')='' or '{}'::jsonb->>'style'=any(styles))
      and (coalesce('{}'::jsonb->>'window','')='' or '{}'::jsonb->>'window'=any(window_types))
      and (coalesce('{}'::jsonb->>'sample','')='' or ('{}'::jsonb->>'sample'='AVAILABLE' and sample_available=true) or ('{}'::jsonb->>'sample'='UNAVAILABLE' and sample_available=false))
      and (coalesce('{}'::jsonb->>'availability','')='' or ('{}'::jsonb->>'availability'='CURRENT' and lifecycle_state='CURRENT') or ('{}'::jsonb->>'availability'='CONFIRM' and lifecycle_state='UNKNOWN'))
  ), page as (
    select fabric_id,brand,design,colour_name from matched order by brand,design,colour_name,fabric_id
    limit greatest(1,least(24,48)) offset ((greatest(1,least(1,10000))-1)*greatest(1,least(24,48)))
  ) select jsonb_build_object('ids',coalesce((select jsonb_agg(fabric_id order by brand,design,colour_name,fabric_id) from page),'[]'::jsonb),
    'total',(select count(*) from matched),
    'brands',(select coalesce(jsonb_agg(brand order by brand),'[]'::jsonb) from (select distinct brand from eligible) b),
    'collections',(select coalesce(jsonb_agg(collection order by collection),'[]'::jsonb) from (select distinct collection from eligible) co));
