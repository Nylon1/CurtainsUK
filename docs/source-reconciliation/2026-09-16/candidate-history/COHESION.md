# Homepage cohesion pass — 15 September 2026

Target: CurtainsUK New Design – Live Base, **182310502779**, unpublished. Live 182264234363 and donor 182264136059 were not edited. Three files uploaded with an explicit target and `--nodelete`.

## Theme files changed

- `assets/curtainsuk-home-editorial.css`: scoped commercial-section typography, spacing, colour, grid, reassurance, links/buttons and responsive presentation. No global selectors or new `!important` rules.
- `sections/curtainsuk-home-shopping.liquid`: attaches existing editorial stylesheet and dedicated presentation classes to the same shopping/reassurance content.
- `sections/curtainsuk-inspiration-help.liquid`: attaches that stylesheet and replaces old panel presentation classes with scoped editorial columns.

No new sections, concepts or photography. Homepage order remains unchanged. Old shared stylesheet files were not edited; their loads remain to avoid changing inherited styling dependencies elsewhere.

## Visual changes

The retained shopping, reassurance, inspiration and help/contact areas now use the same heading family as the existing Fabric Intelligence components, a 1500px outer grid with matching responsive gutters, warm cream/stone backgrounds, forest text, restrained secondary copy and consistent eyebrow styling. The desktop shopping layout keeps its three-part composition. Inspiration and help keep their two-column relationship, with a single divider instead of boxed cards. Mobile stacks the same content with deliberate gaps and a full-width specialist CTA. All restyled links measure at least 48px high; primary buttons measure 52px.

## Preservation and verification

- Source comparison: exact copy and hrefs unchanged in both edited sections.
- Rendered comparison: complete main content text and the ordered list of homepage link labels/hrefs unchanged.
- Desktop 1229px, 390px and 412px: reviewed homepage sequence, heading wraps, transitions, images and retained commercial content through the footer. No page-level horizontal overflow at any tested width.
- All 13 homepage images loaded; no imagery changes or new repetition.
- Fitting link opened the original four-window fitting hub. Specialist CTA opened the existing configurator. Existing native header, navigation, search/account/cart, app integration, samples, Fabric Library and commerce code are untouched.
- All three changed files passed Shopify component validation in full-theme context. Whole-theme validation remains at the same 19 pre-existing findings, with no new finding messages.
- Purchase controls were not changed and no cart/order/payment transaction was performed for this presentation-only pass.

## Deliberately left for owner review

The footer retains its previous white background, typography and link treatment as explicitly requested; it is the remaining obvious visual transition. The announcement/Shopify preview bar remain legitimate unpublished-preview indicators. Approved editorial photography, hero treatment and the existing mobile length of the image-rich story were preserved rather than redesigned.

Preview: https://www.curtainsuk.com/?preview_theme_id=182310502779
