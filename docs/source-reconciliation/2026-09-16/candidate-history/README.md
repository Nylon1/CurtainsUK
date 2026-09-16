# CurtainsUK New Design – Live Base

Homepage/header overlay for unpublished Shopify theme **182310502779** only. Implemented and browser-verified 15 September 2026. Do not publish automatically or upload this overlay to another theme.

Source: fresh download of the live-base theme. Visual/component donor: Updated copy of Dawn **182264136059**, read only. Current live theme **182264234363** was not edited. The CurtainsUK repository was fetched and HEAD matched origin/main before this overlay was saved.

## Exact theme files

Modified:
- `templates/index.json`
- `sections/header-group.json`

Added:
- `sections/curtainsuk-home-editorial.liquid`
- `sections/curtainsuk-home-shopping.liquid`
- `sections/curtainsuk-header.liquid`
- `snippets/curtainsuk-three-ways.liquid`
- `snippets/curtainsuk-colour-intelligence.liquid`
- `snippets/curtainsuk-header-navigation.liquid`
- `assets/curtainsuk-home-editorial.css`
- `assets/curtainsuk-header.css`
- `assets/curtainsuk-header.js`

This README is local documentation, not a Shopify theme upload.

## Homepage composition

Botanical Fabric Intelligence hero → approved colourful moodboard → aligned Three Ways → five complete detail cards → Colour Intelligence and 60–30–10 → inherited Shop by Window/Shop by Fabric and reassurance → inherited inspiration/help.

The original homepage contained two composite sections, not a separate product grid. Its old hero and three-entry selector were replaced in the rendered homepage because they duplicate the new story. The old section instance is disabled; its file and content remain intact. Its useful shopping/reassurance markup was extracted into the new shopping section. The inspiration/help section and footer remain unchanged. No product, collection, page handle, commerce code, global layout, locale or theme setting was altered.

The original header is disabled in the section group, rather than disguised with CSS. The new header reuses native predictive search, search form, Shopify account, cart count and cart notification integration. Existing app embeds are unchanged; the new header supports app blocks. Original Organization/WebSite structured data is retained. The inherited cart mode is **notification**, not drawer; the layout's existing drawer branch and configuration remain unchanged.

## Navigation

| Label | Destination |
|---|---|
| Brand | `/` |
| Fabric Intelligence / Let us read your room | `/apps/curtainsuk-decision/consultation?entry=match` |
| Help me choose / Find my direction | `/apps/curtainsuk-decision/consultation?entry=guided` |
| How Fabric Intelligence works | `/#what-we-consider` |
| Colour Intelligence | `/#colour-intelligence` |
| Fabrics | `/pages/fabric-library` |
| Shop by Window | `/pages/solve-my-window` |
| Samples | `/pages/samples` |
| How to Measure | `/pages/how-to-measure` |
| How to Fit | `/pages/how-to-fit` |
| Inspiration | `/#curtainsuk-inspiration` |
| Contact | `/#curtainsuk-help` |
| Search | Shopify `routes.search_url` / `/search` |
| Account | Existing Shopify account component; mobile `routes.account_url` / `/account` |
| Cart | Shopify `routes.cart_url` / `/cart` |

Fabric Intelligence and Measure & Fit are keyboard-operable disclosures, not fabricated destination links. All normal fabric-shopping CTAs use the real Fabric Library. There are no homepage fabric-calculator links.

## Donor code deliberately rejected

No donor index.json, global settings, locale files or commerce implementation was copied. No cukfi card-fix, image-pass, palette/type-pass, headline-pass, moodboard-swap, hero-botanical-swap or quality-fixes patch section was transplanted. Approved imagery and visual intentions were incorporated directly with Shopify responsive image markup and scoped component CSS. CSS content:url replacements, hidden broken images, redundant prototype sections and unrelated unused styles were omitted.

## Verification

- Desktop CSS width 1229px, mobile 390px and 412px: complete homepage, no page-level horizontal overflow, aligned desktop columns and stacked mobile treatments.
- Three Ways: equal widths/image heights and aligned headings/CTAs. Detail cards: five complete text areas, equal desktop image heights. Colour Intelligence: aligned three-column grid and responsive 60–30–10.
- All 13 approved homepage images loaded; no repeated image asset; no duplicate IDs. Shopify responsive image URLs and lazy loading are used.
- Mobile menu: full-height, body scroll lock/restoration, visible close button, Escape and focus return. Desktop disclosures: Enter/Tab, aria-expanded, Escape and close after anchor navigation. Sticky header does not cover Contact/Inspiration or editorial anchor headings.
- Native predictive search returned 10 results; submitted search reached the real results page. Existing sample product displayed its £1 price/tax information. Native account dialog opened. Empty-cart destination worked.
- **Purchase limitation:** inherited preview controls disable Add to cart. They were not bypassed or changed. Therefore a fresh add/count update/cart-notification transaction was not exercised. No order or payment was created. The existing cart mode is notification; no drawer was introduced.
- Fabric Library loaded 6,328 records with existing pagination. Samples retained saved exact-fabric context. Standard configurator loaded its instant-price route and window options. Measuring/fitting hubs loaded. Both HCI match and guided links reached the correct existing consultation steps on the same origin.
- All 11 scoped theme files passed component validation; header JavaScript passed syntax validation. Whole-theme check remained at the same **19 pre-existing findings**, with zero added/removed finding messages. This is not a claim that the inherited theme has no validation findings.
- Final theme list confirmed candidate and donor unpublished, original live theme still live.

Only homepage/header presentation and navigation changed. Product/collection/library/account/content pages, backend HCI/commerce rules, purchase gating and footer continue using the inherited implementation. Preview staging wording is deliberately preserved by the inherited environment controls.

Preview: https://www.curtainsuk.com/?preview_theme_id=182310502779

Local detailed validation and before-state hashes: `C:/Users/hamza/curtainsuk-livebase-evidence/`.
