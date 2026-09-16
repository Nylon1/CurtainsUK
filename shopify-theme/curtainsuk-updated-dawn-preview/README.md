# Updated copy of Dawn: three fabric-discovery routes

Target: **182264136059**, `Updated copy of Dawn`, **unpublished**.
Date: 15 September 2026. Store: carpetup.myshopify.com.

This directory is a partial change set, not a complete deployable theme. Never upload it wholesale or use it to replace the live Dawn theme. The working baseline was pulled directly from this exact unpublished theme, not restored from repository history.

## Changed Shopify files

- `snippets/curtainsuk-three-ways.liquid`: new semantic section with component-owned stylesheet, three unique existing Shopify-hosted supplier photographs, responsive images, accessible links, and convergence line. No JavaScript.
- `sections/curtainsuk-fabric-intelligence.liquid`: one render line inserted after the editorial introduction and before `#what-we-consider`. All other bytes preserved.
- `locales/en.default.json`: added the `curtainsuk_three_ways` namespace; existing translation values preserved.

Homepage template, section order, existing override sections, global settings, purchase/sample code and live theme were not changed. This component inherits established theme font families and uses the existing cream/forest/earth palette.

## Verification

- Exact theme name/ID/unpublished role verified before editing and immediately before restricted upload.
- New snippet and locale pass Shopify Liquid skill validation.
- Existing homepage has a pre-existing unfinished image tag at its end, producing the existing validation SyntaxError. It was intentionally preserved rather than expanding this task into repairs.
- Remote desktop and measured 390/412 CSS-pixel viewport checks: section has no horizontal overflow; all three distinct images load; CTA targets are 48px tall; copy and images stack on mobile.
- Upload and guided CTAs open the existing same-origin consultation routes with `entry=match` and `entry=guided`. No backend changes or full consultation regression implied.
- Collection CTA opens `/pages/fabric-library`; this preview currently renders only that destination's title. Its missing preview content is outside this section's scope; no claim of full catalogue/sample/checkout rehearsal.
- Existing visible homepage headings and links remained unchanged outside the new component.

Preview: https://www.curtainsuk.com/?preview_theme_id=182264136059#three-ways-to-find-your-fabric

Local original-file backups and SHA-256 manifest: `C:/Users/hamza/curtainsuk-three-ways-evidence`.
