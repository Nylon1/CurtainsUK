-- fabric_visual_enrichment_scope reads only these fabric_colourways columns.
-- Commercial promotion updates (price_verification_status,
-- storefront_selectable, updated_at) still queue the per-fabric Browse dirty
-- marker, but do not change the Fabric Intelligence materialized cache.
DROP TRIGGER browse_projection_knowledge_dirty
  ON curtainsuk_private.fabric_colourways;

CREATE TRIGGER browse_projection_knowledge_dirty
  AFTER INSERT OR DELETE OR UPDATE OF
    fabric_id,
    supplier_id,
    supplier_sku,
    brand_id,
    design_id,
    staging_catalog_visible,
    lifecycle_state,
    colour_name
  ON curtainsuk_private.fabric_colourways
  FOR EACH STATEMENT
  EXECUTE FUNCTION curtainsuk_private.browse_projection_mark_knowledge_dirty();
