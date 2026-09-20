# Curtain Studio — approved states integrated into unpublished V2

[Open the Shopify candidate](https://www.curtainsuk.com/pages/fabric-library?view=curtain-style&preview_theme_id=182339731835).

Candidate 182339731835 remains UNPUBLISHED. It retains its original theme name, “CurtainsUK - Curtain Style V1 review”, but contains the V2 Anatomy experience and the approved Studio lessons. Nothing was published.

## Integrated states

- **Presence:** Balanced / More presence. Less presence is excluded from the page and was not uploaded.
- **Length:** Short / Floor / Soft break / Puddle.
- **Position:** Window-led / Higher / High + Wide.

The old three supporting crops, fullness illustration and supplier soft-break example are replaced by one compact supporting viewer. Presence, Length and Position each display one full-size approved image at a time. The four original heading masters and six Anatomy layers remain unchanged and primary.

The Studio viewer identifies Double Pinch Pleat as its fixed reference heading, independently of the heading selected in Anatomy. It does not imply that the nine states exist for every heading. Balanced, Floor and Higher reuse the existing approved Double Pinch asset. Six new PNGs are byte-identical local copies of the approved studies, at 1448 × 1086.

State selections are educational only: no ratios, orderable fullness labels, saved settings, Builder parameters or new manufacturing options. Position preserves the floor finish; its copy explains that drop length follows mounting height. Short explicitly illustrates an above-floor hem against the existing full-height opening, not a newly invented sill.

## Interaction and mobile

Named lesson/state tabs support click, keyboard Left/Right/Home/End and swipe through states. Selected states are retained when switching lessons. Mobile images fill the 390px / 412px viewport. Controls are at least 48px high. Length includes an optional lower-curtain detail crop of the same master, making Soft break and Puddle legible on small screens.

No-JavaScript fallback shows all nine studies with captions. Existing Anatomy fallback and native Fabric Knowledge disclosures remain. Reduced motion is respected. No reference photographs, catalogue products or new AI consultation were added.

## Verification

| Viewport | Anatomy states | Studio states | Studio visual width | Page horizontal overflow |
| --- | ---: | ---: | ---: | --- |
| Desktop 1440px | 24 | 9 | 880px | None |
| 390px | 24 | 9 | 390px | None |
| 412px | 24 | 9 | 412px | None |

**99 state checks passed in the actual Shopify preview**, plus keyboard navigation, heading close-ups and lower-curtain detail. Local swipe and no-JavaScript checks passed. All images loaded at their native width. Default visible section copy is 330 words; the page remains visual rather than a long article. Full page heights observed: 4,237 / 4,237 / 4,226px respectively. Desktop remains approximately 53% shorter than the original V1 page.

Final scoped axe scan: zero detected violations, 25 passing checks, one incomplete image-overlay contrast category manually inspected. This is not a full accessibility certification. Shopify Liquid/schema/translation validator passed at revision 2.

An initial browser-launch process timed out after opening successfully; the existing browser session was reused. A rapid lazy-image decode probe raced loading; the test now explicitly loads images before inspecting all states. Final runs passed. A cache-busted preview read verified the final compiled stylesheet rather than a cached earlier width.

## Protected journeys

- All nine governed Browse links remain unchanged and passed catalogue checks; returned first-page records match their requested facets.
- The existing Fabric Intelligence handoff opened “Let us read your room.” No consultation was submitted.
- Make my curtains opens the existing “Make it yours” Curtain Builder. No configuration, price calculation or order was submitted.
- The £2.50 sample variant remains available at 250p. The isolated test basket remained empty. No cart-add, checkout or order mutation was performed; draft checkout remains disabled.
- Existing Samples route and footer access remain. Navigation was not modified in this integration.
- No staging/Vercel/localhost links were introduced. Shopify's inherited unpublished preview banner remains intentional.
- Live theme 182336356731 remains MAIN, with all 407 files unchanged. Candidate commerce, stock, Fabric Knowledge, HCI, Fabric Intelligence, Browse, Fabric Detail and Builder files remain unchanged from the pre-integration baseline.

## Files and deployment boundary

Eight candidate files changed: the Curtain Style section, the English locale (new `curtain_studio` namespace only), and six `cuk-studio-*.png` assets. No files were deleted. Existing locale content was compared and preserved. Six generated images were added to Shopify Files as sources for the candidate asset transfer; no products were created.

Source files:

- `shopify-theme/curtainsuk-new-design-live-base/sections/curtainsuk-curtain-style.liquid`
- `shopify-theme/curtainsuk-new-design-live-base/locales/en.default.json`
- `shopify-theme/curtainsuk-new-design-live-base/assets/cuk-studio-presence-more.png`
- `shopify-theme/curtainsuk-new-design-live-base/assets/cuk-studio-length-short.png`
- `shopify-theme/curtainsuk-new-design-live-base/assets/cuk-studio-length-soft-break.png`
- `shopify-theme/curtainsuk-new-design-live-base/assets/cuk-studio-length-puddle.png`
- `shopify-theme/curtainsuk-new-design-live-base/assets/cuk-studio-position-window-led.png`
- `shopify-theme/curtainsuk-new-design-live-base/assets/cuk-studio-position-high-wide.png`
- Updated local and preview verification scripts; new asset, baseline, verification and review records.

Branch: `feature/curtain-style-v1`. Commit supplied in the final handoff. No push, merge or publication.

## Review captures

[Desktop Presence](../artifacts/curtain-style-v2/preview-1440-studio-presence.png) · [390px Length](../artifacts/curtain-style-v2/preview-390-studio-length.png) · [412px lower-curtain detail](../artifacts/curtain-style-v2/preview-412-studio-floor-detail.png) · [412px Position](../artifacts/curtain-style-v2/preview-412-studio-position.png).

Stop at preview for integrated-experience approval. Approved heading masters were not regenerated or overwritten.
