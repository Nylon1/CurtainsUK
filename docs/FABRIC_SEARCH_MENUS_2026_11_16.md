# Fabric search menus

The missing feature is a menu presenting useful searches. Browse Fabrics already applies colour and pattern selections. This change adds two navigation entry points to that existing experience.

- **Shop by Colour**: labelled colour swatches linking to existing colour filters.
- **Shop by Type**: Plain & Textured Plains, Florals, Stripes & Checks, Geometrics, and Botanical, Birds & Animals.
- Each menu also includes Browse all fabrics. The existing Browse Fabrics navigation link stays available.
- Selecting a menu choice opens the existing browser, with the relevant URL filter, at its filter section. Current result cards, filters, catalogue API and indexing rules are retained.

The theme setting `curtainsuk_fabric_search_menus_enabled` independently enables the menus. It defaults to false for unpublished-theme review. No database migration, backend deployment, grouping query or new fabric browser is required.

Exact pattern values are `plain,textured-plain`, `flower`, `stripe,check`, `geometric`, and `botanical,bird,animal`. The existing browser accepts these values and restores them from the URL. Colour group values such as `white/cream` and `beige/taupe` use the existing vocabulary.

This branch is based directly on production commit `b5d85d93`. The broader discovery experiment remains separately saved on `feat/visual-fabric-discovery-20261116` at `b53e5250`; none of its browser or backend changes are included here.

Review in an unpublished theme with the menu setting enabled, check desktop and mobile navigation, then enable after review. Rollback is the menu setting alone.

Validation: all five changed theme files pass Shopify validation. All 19 menu presets were rendered and checked against the unchanged production browser's URL-restoration function; both menu-setting states pass and Browse Fabrics remains available. The menu-only branch has not been published.
