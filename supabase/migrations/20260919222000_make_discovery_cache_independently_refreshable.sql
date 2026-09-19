CREATE MATERIALIZED VIEW curtainsuk_private.fabric_knowledge_discovery_cache_next AS WITH eligible AS MATERIALIZED (
SELECT c.fabric_id,b.display_name brand,co.display_name collection,k.visual_fields knowledge_fields
FROM curtainsuk_private.fabric_colourways c
JOIN curtainsuk_private.supplier_brands b on b.brand_id=c.brand_id
JOIN curtainsuk_private.fabric_designs d on d.design_id=c.design_id
JOIN curtainsuk_private.fabric_collections co on co.collection_id=d.collection_id
LEFT JOIN curtainsuk_private.fabric_visual_knowledge_read_cache k on k.fabric_id=c.fabric_id AND k.knowledge_state in ('COMPLETE','PARTIAL_GOVERNED')
WHERE c.staging_catalog_visible AND c.lifecycle_state<>'DISCONTINUED'
AND length(trim(c.supplier_sku))>0 AND length(trim(c.colour_name))>0 AND length(trim(b.display_name))>0 AND length(trim(d.display_name))>0
AND EXISTS(SELECT 1 FROM curtainsuk_private.fabric_media_mappings m JOIN curtainsuk_private.fabric_media_assets a using(content_hash)
WHERE m.fabric_id=c.fabric_id AND m.supplier_id=c.supplier_id AND m.supplier_sku=c.supplier_sku AND m.rights_state='APPROVED' AND m.mapping_state='VERIFIED'
AND a.width>0 AND a.height>0 AND a.shopify_cdn_url ~ '^https://cdn[.]shopify[.]com/[^?#]+$')
), knowledge_options as (
    select distinct e.fabric_id, f.dimension, v.value
    from eligible e cross join lateral (values
      ('colour',e.knowledge_fields->'primaryColour'->'value'),
      ('colour',e.knowledge_fields->'secondaryColours'->'value'),
      ('pattern',e.knowledge_fields->'patternClass'->'value'),
      ('pattern',e.knowledge_fields->'motif'->'value'),
      ('activity',e.knowledge_fields->'visualActivity'->'value'),
      ('texture',e.knowledge_fields->'visualSurface'->'value'),
      ('character',e.knowledge_fields->'character'->'value'),
      ('presence',e.knowledge_fields->'visualWeight'->'value')
    ) f(dimension, val)
    cross join lateral jsonb_array_elements_text(case jsonb_typeof(f.val)
      when 'array' then f.val when 'string' then jsonb_build_array(f.val) else '[]'::jsonb end) v(value)
    where lower(v.value) not in ('unknown','null','') and length(v.value)<=100
  ), option_counts as materialized (
    select dimension,value,count(*) as count,min(fabric_id) example_id from knowledge_options group by dimension,value
) SELECT jsonb_build_object('knowledgeOptions',coalesce((select jsonb_agg(jsonb_build_object(
      'key',o.dimension,'value',o.value,'count',o.count,'fabricId',o.example_id,
      'image',(select a.shopify_cdn_url from curtainsuk_private.fabric_media_mappings m
        join curtainsuk_private.fabric_media_assets a using(content_hash)
        join curtainsuk_private.fabric_colourways c on c.fabric_id=m.fabric_id and c.supplier_id=m.supplier_id and c.supplier_sku=m.supplier_sku
        where m.fabric_id=o.example_id and m.rights_state='APPROVED' and m.mapping_state='VERIFIED'
        order by (m.image_type='MAIN') desc,m.content_hash limit 1)
    ) order by o.dimension,o.value) from option_counts o),'[]'::jsonb),
    'brands',(select coalesce(jsonb_agg(brand order by brand),'[]'::jsonb) from (select distinct brand from eligible) b),
    'collections',(select coalesce(jsonb_agg(collection order by collection),'[]'::jsonb) from (select distinct collection from eligible) co)) AS data,now() refreshed_at;
REVOKE ALL ON curtainsuk_private.fabric_knowledge_discovery_cache_next FROM PUBLIC,anon,authenticated;
GRANT SELECT ON curtainsuk_private.fabric_knowledge_discovery_cache_next TO service_role;
DROP MATERIALIZED VIEW curtainsuk_private.fabric_knowledge_discovery_cache;
ALTER MATERIALIZED VIEW curtainsuk_private.fabric_knowledge_discovery_cache_next RENAME TO fabric_knowledge_discovery_cache;
