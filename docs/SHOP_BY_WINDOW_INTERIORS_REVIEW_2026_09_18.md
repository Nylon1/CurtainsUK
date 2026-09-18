# Shop by Window — candidate visual review

## Scope and source

- Source branch: `feature/shop-by-window-interiors`, based on CurtainsUK main `d691e9a2f989daf7c56136d50de9701466d6b6c8`.
- Authoritative Shopify theme pulled read-only: `182310502779` (live).
- Candidate: `182336291195`, **CurtainsUK - Shop by Window review**, unpublished.
- Review: https://www.curtainsuk.com/pages/solve-my-window?preview_theme_id=182336291195
- No page record, navigation, destination page, homepage, footer, application or intelligence changes.

## Exact legacy dependency

The live Shopify page `solve-my-window` is assigned template suffix `solve-my-window`, but the live theme has no matching template. Shopify therefore falls back to `templates/page.json`. That general template includes `curtainsuk-window-grid`, alongside the configurator, fabric browser, measuring, samples and other handle-conditional sections.

`sections/curtainsuk-window-grid.liquid` is identical to its preserved old Dawn implementation. It loads `curtainsuk-storefront.css`, hard-codes 14 technical window types, renders the generic shape symbol and card grid, and links directly to the visualiser. It includes Apex/triangular/gable entries.

The candidate adds the already-assigned **exact page template**, `page.solve-my-window.json`, containing only `curtainsuk-spaces`. This removes the old general-page/grid dependency from this route. Legacy files are retained because other routes still use them; nothing is deleted globally. The separate `/pages/shop-by-window` alias page is outside this route-only pass.

## Reuse

- Unchanged `curtainsuk-home-editorial.css`: `.cukfi` colour tokens, body/heading font variables, `.cukfi__wrap` 1500px page grid, `.cukfi__eyebrow`, `.cukfi__btn`, light CTA and focus-visible treatment.
- Unchanged live layout, editorial header/navigation, account/search/cart integration and footer.
- Six existing Shopify-hosted interior images; responsive `image_url`/`image_tag`, explicit sizes, eager hero and lazy section images. No new images or placeholders; no repeated image on this page.
- Existing same-origin Fabric Intelligence entry: `/apps/curtainsuk-decision/consultation?experience=premium&entry=match`.
- Governed language reviewed against `vendor/hci-approved/intelligence/fingerprint/vocabulary.ts` and current premium consultation. Colour relationship, pattern strength/scale, texture, finish and visual weight are presented as design considerations, not inferred fabric attributes.

## New files

1. `shopify-theme/curtainsuk-new-design-live-base/templates/page.solve-my-window.json`
2. `shopify-theme/curtainsuk-new-design-live-base/sections/curtainsuk-spaces.liquid`
3. `shopify-theme/curtainsuk-new-design-live-base/assets/curtainsuk-spaces.css`

The unpublished theme was created from the fresh live pull. A file comparison confirmed these are its only three differences from that snapshot. No global CSS is edited. No new JavaScript or HCI contract is introduced.

## Experience

“Curtains for your space” / “Space. Light. Colour.” introduces five editorial sections: Lounge, Bedroom, Bay Windows, Patio & French Doors, and Other Rooms & Windows. Anchor navigation makes each accessible directly. Each section explains a design relationship and practical trade-off, then offers its own labelled Fabric Intelligence CTA.

An explicitly illustrative palette compares Primary/Secondary/Accent and Blend/Coordinate/Lift/Contrast. These are educational examples, not live recommendations, physical colour standards, or a new selectable intelligence vocabulary.

## Room-context limitation

The active premium client reads `entry` and `session`; its command boundary has no supported room/space launch field. The older staff sign-in helper preserving `window` is not that boundary. Consequently all CTAs use the supported match entry. No unsupported room query parameter, silently discarded context or new HCI contract was added.

## Validation

- Shopify Liquid skill validator: all three files pass (artifact `curtainsuk-spaces`, revision 1).
- Shopify accepted the template, section schema, image settings and asset in the unpublished theme.
- Browser checks at **1440px desktop, 390px and 412px effective CSS widths**: no horizontal overflow; all six images load; five sections and palette comparisons render; no legacy cards remain in main content.
- All new links are at least 52px high. Internal anchors resolve; keyboard focus is visibly outlined. The new section adds no animated or scripted interaction.
- A space CTA was clicked through to the existing premium “Let us read your room” experience on `www.curtainsuk.com`.
- No destination pages were created or changed; no HCI behaviour was tested beyond the requested landing-page handoff.

## Review boundary

Awaiting Hamza’s visual/content approval. Candidate is unpublished. No merge or publication. Existing preview banner is inherited from the live theme’s unpublished-role treatment.
