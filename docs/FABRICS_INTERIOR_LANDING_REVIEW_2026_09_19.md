# Fabrics landing candidate

Branch: `feature/fabrics-interior-landing`, based on main `fa464a9feaabc2f095d52620b5a0c0b38210d959`.

Unpublished Shopify candidate: **182336323963 — CurtainsUK - Fabrics review**.
Preview: https://www.curtainsuk.com/pages/fabric-library?preview_theme_id=182336323963

## Scope

Replaces the introductory discovery layer on the existing public Fabrics route, `/pages/fabric-library`. The existing browser section, catalogue requests, search, filters, pagination, detail and commerce code are unchanged. The legacy discovery snippet remains unchanged for other consumers via its `else` branch. The same homepage help/footer component is selected for fabric landing handles; homepage output is unchanged.

Four theme files: new `snippets/curtainsuk-fabric-editorial.liquid`, new `assets/curtainsuk-fabric-editorial.css`, scoped wrapper in `snippets/curtainsuk-fabric-discovery.liquid`, route condition in `sections/curtainsuk-help-footer.liquid`.

No navigation, homepage, Shop by Window, HCI, product, stock or Fabric Master changes. No merge/publication. The separate `/pages/shop-by-fabric` URL returned the existing Shopify 404 in testing; it is not the current navigation destination. No page publication/redirect change was made.

## Content and evidence

Seven chapters: Space, Light, Colour, Weight, Pattern, Texture, Character. Native disclosure controls explain Blend/Coordinate/Lift/Contrast. Reuses current cream/forest palette and theme font variables.

Existing Shopify-hosted room photography: prestigious-room-watercolour-dining.webp; prestigious-room-neutral-pattern.webp; curtainsuk-luxury-sheer-living-room.jpg; curtainsuk-layered-sheer-grey-curtains.jpg; curtainsuk-warm-accent-curtains.jpg.

Genuine existing Library imagery: Clarke & Clarke Abeja Linen (asset hash 69e8c297…); Sanderson Painters Garden Violet/Crimson (89269d7f…); Prestigious Textiles Cord Breeze (a42c34eb…). Names/images checked against existing Library/supplier-labelled theme content. No physical weight, performance or availability claims made for these examples.

Vocabulary reused from HCI `src/intelligence/fingerprint/vocabulary.ts`: pattern scale/activity, visual weight airy/balanced/substantial, surface visible-weave/tactile, style organic/contemporary/traditional, formality relaxed/tailored. No new backend vocabulary/contracts.

Room palette is an editorial interpretation of the displayed photograph, not measured paint accuracy. Lighting photographs represent different rooms, explicitly not the same fabric under simulated light. Pattern images explicitly not a common physical scale. Physical and visual weight distinguished; gradient diagrams illustrate presence, not measured fabric specifications. Image analysis described as visible palette extraction followed by customer input, not semantic room understanding.

## Focused checks

- Shopify validator: new Liquid snippet, discovery wrapper and CSS passed; shared footer condition validated separately.
- Desktop 1440px: hero and real-pattern comparison inspected; no horizontal overflow.
- Mobile 390px and 412px: hero, chapter layout, colour controls and texture composition checked; no horizontal overflow.
- Nine editorial images successfully loaded; responsive Shopify image tags with lazy loading outside hero.
- All seven chapter links resolve to unique section targets.
- Keyboard Enter opens Contrast disclosure; native summary controls retain focus-visible styling.
- Both Fabric Intelligence CTAs opened actual same-origin `/apps/curtainsuk-decision/consultation?experience=premium&entry=match`, displaying “Let us read your room.” No consultation submitted.
- Browse all fabrics anchor reached existing search controls; Cord query returned genuine Prestigious Textiles Cord records. No sample/cart/order action.
- Existing homepage shared footer present on candidate Fabrics page.

Awaiting Hamza's visual review. Candidate remains unpublished; live theme unchanged.


## V2 — separate editorial and browsing experiences

Continues from 283c223; supersedes the inline-catalogue arrangement above.

- Editorial preview: https://www.curtainsuk.com/pages/fabric-library?preview_theme_id=182336323963
- Library preview: https://www.curtainsuk.com/pages/fabric-library?view=browse-fabrics&preview_theme_id=182336323963
- Added page.fabric-library.json uses the existing page's assigned template suffix, so navigation is unchanged. It renders only the editorial section. Added page.browse-fabrics.json reuses the existing browser and sample-basket sections, without introductory discovery cards.
- Existing filtered/exact-fabric bookmarks are routed to the browse view with all context preserved. Three narrowly scoped storefront JS line changes preserve view on search/reload and retain browse view in View Fabric/All fabrics links. No catalogue fetch, identity, pricing, eligibility, search/filter logic or commerce handling changed.
- Hero includes a genuine Cord Breeze textile detail; space section pairs a crop with its room; light uses one actual fabric image under explicitly illustrative light treatments; weight uses room photography rather than diagrams; character compares actual surface/pattern imagery instead of decorative palettes. Colour relationship swatches have larger folded-card treatment.
- Light effects are educational CSS overlays, not measured supplier photography. No physical-weight value or supplier property inferred.

### V2 verification

Shopify validation passed all six initial files and three final routing/style files. Node syntax check passed. Desktop 1440, mobile 390 and 412 show no horizontal overflow. Editorial contains zero browser instances; browse view contains one browser and zero editorial instances. Native colour disclosure toggled by keyboard. Existing shared footer retained.

Both FI CTA destinations retain same-origin entry=match; final entry loaded the real Let us read your room screen (initial server preparation state required time to finish). Library Cord search survived reload with view=browse-fabrics. View Fabric opened exact pt-7248-590 Cord Breeze, with original sample and Make Curtains controls. All fabrics returned to browse view. Legacy ?fabric=pt-7248-590 without view correctly routed to the same product detail. Browse and product detail had no mobile overflow. No transactions attempted. No Vercel/staging hostname in editorial link targets.

Unaffected homepage, Shop by Window, navigation, product rendering, HCI, stock, Fabric Master and commerce source files were not changed (aside from the three necessary library navigation lines in the shared storefront asset). Candidate only, no merge/publication.


## Final polish and authorised release

User approved merge/publication after focused checks. Final polish enlarges full-width Space/Light/Pattern imagery, makes Texture a full-width macro treatment, tightens section spacing, shortens supporting prose and creates a substantial two-route ending. Colour system, advice language and separate browsing architecture retained. Corrected a comma-delimited Weight caption split.

Final candidate checks: desktop1440,390,412 no overflow; full-width pattern and texture inspected; final buttons 58px high; corrected Weight captions visible; final FI CTA loads same-origin Let us read your room; Browse CTA opens dedicated view with existing search. Shopify validator passes both changed presentation files. Existing shared files pulled from live before deployment matched origin/main; backups retained at C:/Users/hamza/curtainsuk-fabrics-live-backup. Deployment targets only the eight Fabrics-related theme files from the branch, not a whole-theme replacement. Current live theme 182310502779 remains live.
