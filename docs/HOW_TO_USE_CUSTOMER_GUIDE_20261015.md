# How to use CurtainsUK

Unpublished Shopify page candidate, based on protected source `b926c116388a176f12f618acc9297d51b0269478`. Separate from Cushion Studio PR #201. Proposed page handle: `/pages/how-to-use`, template suffix `how-to-use`. No page record, navigation item, theme upload or deployment was created.

## Customer experience

Seven colour-coded feature cards open illustrated three-step walkthroughs. Customers can select a step, advance or restart, follow a direct feature link and share an individual guide using its URL fragment. Illustrations, original SVGs and existing theme imagery accompany short captions. The layout uses the theme font families with system/Georgia fallbacks, keyboard-visible controls and reduced-motion support. Buttons use consistent spacing, selected-state borders and numbered circles, subtle hover/press feedback, and at least 44 px action targets. No em dashes appear in new page text or assets.

The page does not embed live applications or make API requests. Its examples are explicitly labelled illustrated walkthroughs. It does not start consultations, submit images, write browser storage, save rooms, send messages or create orders. Without JavaScript, all seven guides and destination links remain readable.

| Guide | Customer destination | Local fragment |
|---|---|---|
| Fabric Intelligence | `/apps/curtainsuk-decision/consultation?experience=premium&entry=guided` | `#fabric-intelligence` |
| Browse Fabrics | `/pages/fabric-library?view=browse-fabrics` | `#browse-fabrics` |
| Room Visualiser | `/pages/room-visualiser` | `#room-visualiser` |
| Naila | `/pages/fabric-library?view=browse-fabrics` | `#naila` |
| Guided Measure | `/pages/how-to-measure` | `#guided-measure` |
| House of Curtains | `/pages/build-my-rooms` | `#house-of-curtains` |
| Specialists | `/pages/meet-our-team` | `#specialists` |

All destinations returned HTTP 200 in bounded public GETs on 15 October 2026. This verifies route availability, not every downstream journey. Naila is reached through the actual Continue with Naila control within Browse, not an invented standalone page. Guided Measure produces a local Measurement Brief; it is not automatically sent or approved. House of Curtains has local browser saving and current checkout readiness controls; the guide does not promise payment availability. Specialist guidance names only Jane, Noah, James, Natalie and Ben and identifies them as AI advisers.

Current source and public markup were checked against production records, current theme routes, `components/curtainsuk-premium-consultation.tsx`, `components/naila-browse-entry.ts`, Guided Measure and Rooms scripts. Existing stale specialist roster Coming soon text was not copied or repaired. No paid AI or persistent live actions were tested.

## Files and visual provenance

Four new files in `shopify-theme/curtainsuk-dawn-16`: section `curtainsuk-how-to.liquid`, stylesheet `curtainsuk-how-to.css`, script `curtainsuk-how-to.js`, template `page.how-to-use.json`. CSS is scoped to `.cuk-how`. No existing theme file or feature is modified.

Room photographs and adviser portraits reuse existing protected theme assets. Original window/curtain diagrams and decorative colour swatches are authored here. No external model, image generation, copied third-party artwork, font download or new library is involved. Swatches are labelled illustrative, not named supplier products.

## Verification

- Shopify CLI theme check: zero errors across the theme, zero diagnostics in the four new files. Thirteen pre-existing warnings remain elsewhere.
- The bundled skill validator was attempted but could not load its missing `@shopify/theme-check-common` dependency. The installed official Shopify CLI provided the independent theme validation above.
- JavaScript syntax and Git whitespace checks passed.
- Local Chrome browser: seven guide selectors, all third-step selections, correct caption/state/CTA, keyboard Enter to restart, fragment reload, nine images loaded, no console errors observed.
- Mobile emulation at 390 × 844: document width 375 px, no horizontal overflow; Naila guide remained selected and readable. Not a physical iPhone or spoken VoiceOver test.
- Local screenshots and machine-readable interaction/theme-check evidence are in `artifacts/how-to-use-20261015`.
- No em dash character, HTML entity or escaped equivalent in the four new files; browser text check also passed.

Local review: `node scripts/how-to-preview.mjs`, then `http://127.0.0.1:4363/pages/how-to-use`. This renders the exact section markup with a small local review header, not a full Shopify theme render. It binds only to loopback. Production feature paths redirect to the real storefront only when explicitly followed. The new section still needs an approved Shopify theme preview before release.

## Release and rollback

Keep the candidate unpublished. Follow `release/README.md`: required protected checks, review, exact protected source and explicit release authorisation. Before any upload, recheck MAIN identity and back up scoped affected files. Upload only these four approved files with no deletion; verify every dependent existing image is present. Create or assign the agreed Shopify Page with template suffix `how-to-use` only during authorised release. Add a How to use link in the agreed Help/footer location at that time. No public Cushion Studio link is included.

Read back uploaded files exactly and test desktop/mobile page navigation, steps, deep links, all feature destinations, theme header/footer, accessibility and no-JavaScript fallback. For rollback, remove the new navigation entry and unpublish the new page or restore its prior template/content; restore backed-up scoped files if any existed. Do not switch the entire theme or revert unrelated releases.
