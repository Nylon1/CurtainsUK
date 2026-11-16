# Fabric search menus

The missing feature is a menu presenting useful searches. Browse Fabrics already applies colour and pattern selections. This change adds two navigation entry points to that existing experience.

- **Shop by Colour**: labelled colour swatches linking to existing colour filters.
- **Shop by Type**: Plain & Textured Plains, Florals, Stripes & Checks, Geometrics, and Botanical, Birds & Animals.
- Each menu also includes Browse all fabrics. The existing Browse Fabrics navigation link stays available.
- Selecting a menu choice opens the existing browser, with the relevant URL filter, at its filter section. Current result cards, filters, catalogue API and indexing rules are retained.

The theme setting `curtainsuk_fabric_search_menus_enabled` independently enables the menus. Its schema default is false; the production overlay enables it after the owner approved the menu preview and requested publication. No database migration, backend deployment, grouping query or new fabric browser is required.

Exact pattern values are `plain,textured-plain`, `flower`, `stripe,check`, `geometric`, and `botanical,bird,animal`. The existing browser accepts these values and restores them from the URL. Colour group values such as `white/cream` and `beige/taupe` use the existing vocabulary.

This branch is based directly on production commit `b5d85d93`. The broader discovery experiment remains separately saved on `feat/visual-fabric-discovery-20261116` at `b53e5250`; none of its browser or backend changes are included here.

The owner approved the local menu preview and requested publication using the latest PR with a sync check. Latest merged PR #411 is protected production commit `b5d85d9386bb6899857f7465d7bd2723bf2f126e`. A fresh full pull of MAIN theme `182339731835` on 16 November matched all 614 composed production files. The baseline backup is `C:/Users/hamza/outputs/fabric-search-menus-20261116/live-before`.

Release through a PR to `release/production` and its required checks, then upload only `assets/curtainsuk-header.css`, `config/settings_schema.json`, `config/settings_data.json`, `locales/en.default.json`, `snippets/curtainsuk-header-navigation.liquid`, and `snippets/curtainsuk-fabric-search-navigation.liquid` from the exact protected export. All other current settings are preserved. Read back the full theme and compare it with the production source. Rollback is the menu setting alone; the six affected file originals are also backed up.

Validation: all six release theme files pass Shopify validation. All 19 menu presets were rendered and checked against the unchanged production browser's URL-restoration function; both menu-setting states pass and Browse Fabrics remains available. Browser checks covered desktop navigation and the mobile drawer at 390px and 320px, with no horizontal overflow in either menu. The complete 615-file candidate matches its production manifest. Publication and live smoke checks follow the protected merge.
