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

## Homepage footer follow-up

Shop by Window now renders the same existing homepage help/footer component by extending its route condition to page.handle == 'solve-my-window'. No duplicated markup, new styling or changed destinations. Homepage output and other routes remain unchanged. Candidate-only upload: sections/curtainsuk-help-footer.liquid. Verified at desktop, 390px and 412px with no horizontal overflow.

## Visual refinement after review

Continues from a64b316 and retains the shared-footer follow-up 3a33966. No merge/publication. Candidate remains 182336291195.

- Hero markup and space navigation are unchanged (compared with 3a33966); shared homepage footer unchanged.
- Replaced alternating prose/image modules with an immersive lounge photograph and horizontal palette desk; a bedroom light study; a bay architecture study with three annotated points; and a large patio photograph with an inset colour-direction board. Other Rooms stays a concise exploratory introduction.
- Removed the standalone arbitrary illustrative palette block. Four major rooms now use colours sampled from their own photographs. Roles/names are editorial interpretations, not an HCI extraction or measured room-area percentages.
- Main room guidance (lead + thinking + consideration fields) falls from 368 to 169 words. Each room has What works / What needs care and one unchanged same-origin Fabric Intelligence destination.
- Shared palette snippet uses native named radio groups and CSS :has for Blend / Coordinate / Lift / Contrast. Selected border/check and keyboard focus supplement colour. No JavaScript, image manipulation, HCI state, contracts, persistence or generated fabric matches. Example selection remains local education and is not passed as a customer preference.

### Palette evidence

Median RGB of small patches in the existing Shopify photographs downloaded for this review; coordinates are normalised x/y centres, using a 2%-wide patch. These represent the photograph's lighting, not colour-standard measurements. Lift is an explicitly lighter tonal variation. Lounge Contrast is a darker variation of its sampled taupe; the other contrasts use photographed accent colours.

| Space / source filename | Primary | Secondary | Accent |
| --- | --- | --- | --- |
| Lounge / prestigious-room-neutral-pattern.webp | #dacfbe at .73/.67 | #81725f at .12/.30 | #bea38e at .94/.18 |
| Bedroom / curtainsuk-layered-sheer-grey-curtains.jpg | #d2d7dc at .44/.39 | #979691 at .70/.30 | #73452c at .18/.87 |
| Bay / Bay-window-curtains-1.png | #a59271 at .46/.11 | #977e54 at .47/.16 | #2b3e01 at .78/.58 |
| Patio / prestigious-room-watercolour-dining.webp | #999a93 at .50/.09 | #668698 at .11/.41 | #4d6256 at .80/.30 |

### Focused verification

Shopify Liquid/schema validator passed section, template, palette snippet and stylesheet. Desktop 1440px and mobile 390/412px inspected; no horizontal overflow; all six photographs loaded; five room CTAs retain the existing premium entry=match URL. Touch changes displayed direction notes; ArrowLeft changed native radio selection and exposed a solid focus outline. No animation was introduced. Corrected Bay's mobile heading alignment and adjusted numbered points for its tighter crop. This is Chrome responsive-width evidence, not a physical Safari/iPhone test.

Preview-only changes: sections/curtainsuk-spaces.liquid, assets/curtainsuk-spaces.css, templates/page.solve-my-window.json, snippets/curtainsuk-space-palette.liquid. Live theme, destinations, homepage, navigation, HCI and commerce untouched. Human visual approval remains pending.
## Release authorisation and preflight

Hamza authorised merge and page-only publication after focused checks. Candidate 7ded8ec passed the final desktop1440 / mobile390 / mobile412 checks; no material regression found. The final polish specified in the prior refinement is already included.

Current live theme confirmed as 182310502779. A fresh read-only pull found no existing new page template, section, palette snippet or stylesheet to overwrite. The current shared help footer differs only by the new route condition after line-ending normalisation. Its current source is preserved locally in curtainsuk-window-review/live-before-release. Deployment will stage supporting files first, then the dedicated page template. The candidate theme itself will not be published. Other theme files are excluded.
