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
