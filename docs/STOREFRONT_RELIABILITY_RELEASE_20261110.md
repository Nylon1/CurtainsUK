# Storefront discovery reliability release — 10 November 2026

## Source and deployment

- Authority: protected `release/production` merge `a33b2220fda6d15b2df8df206d069a62788f1dde` (PRs #380 and #381); tree `c278cfb1b889957fe65eb300df06179e18b861ed`.
- Full export: 11,675 tracked files; digest `52bb69e13466dfc7cb3ab76f66df257ebb1325f3270378e908f69ae612cec273`. The export passed independent receipt verification and the protected asset guard before the manual deploy wrapper accepted it.
- Room Visualiser release manifest: `lib/room-visualiser/released-assets.json`. All nine immutable packs, including the new `cfe0a6b951e733399950e327`, passed the guard: 3,962 files and 321,831,726 bytes. Earlier packs remain unchanged. The staged build restored published line endings, passed TypeScript and asset checks, and served the final pack HTML and entry module. The unsigned signed-proxy request returned 401 as expected.
- Protected HCI component paths under `lib/storefront/hci` and `lib/storefront/hci-*` have no diff from the prior protected merge `26459c21`. The host resolver changes the actual guide href and observes rerenders; it does not change the protected components.
- Vercel: READY deployment `dpl_4AYiqfUTVMdjK4KYDy2WQAmrdMi8` serves `curtainsuk-production-api.vercel.app`, `curtainsuk-staging-api.vercel.app` and `curtainsuk-staging-gateway.vercel.app`. Rollback deployment: `dpl_DTFwWgyvmoq1o2PnZyEFLchpibFS`.
- Shopify MAIN theme `182339731835`: scoped PR #380 upload of `assets/curtainsuk-spaces.js`, `assets/curtainsuk-storefront.js`, `sections/curtainsuk-spaces.liquid`, `snippets/curtainsuk-space-palette.liquid`; scoped PR #381 upload of `sections/curtainsuk-home-studio.liquid`. All five live readbacks match the exact export by SHA-256; the last file is `8eb4bb25b2e90cb1bcd466b7ef7fadeca49ee953a99abeb9a55761389f10d9bd`.

## Customer checks

| Journey | Live result |
| --- | --- |
| Room Visualiser defaults | Living, bedroom, lounge, office and bay opened with Abeja Linen, current available status and Make Curtains action. Explicit unavailable Bergamot Blush remained unavailable and could not be silently ordered. |
| Fabric links | 61 live rendered links from the first three visualiser drawer pages reached matching fabric content. The unpublished-profile fallback for Acanthus Jacquard Slate opened the exact fabric detail with sample and Make Curtains actions after content loaded. |
| Design Library | All six host-resolved hrefs remained on `www.curtainsuk.com` and opened their intended article, imagery/content and onward sample, fabric-browse and return actions. Normal link navigation and underlying href were checked, including keyboard/new-tab compatible URL structure and rerender handling in the host test. |
| Shop by Window | Living-room and lounge colour/direction selections were reflected in the Fabric Intelligence link and visible context. Forward navigation, browser Back and refresh retained the context. |
| 55 cm filled cushion | Cushion Studio offered the verified 57 × 57 cm insert for the 55 × 55 cm cushion, quoted £69.00, enabled Review and retained the selection after refresh. Unavailable insert options remained blocked with cover-only or valid-size alternatives. |
| Homepage Room Visualiser entry | Live theme no longer hardcodes unavailable `sdg-f1541-01`. Room preview hrefs contain only the chosen room. Desktop Bedroom and narrow mobile Lounge links opened the correct room with available Abeja Linen. Back retained the selected homepage preview; refresh reset to the safe Living Room preview. |
| Four-product WELCOME5 cart | Abeja Linen curtains, Abeja Linen Roman, Dunbar Gemstone filled cushion and Forest Shuttle Go track reviewed at £1,314.40 with £12.95 delivery. The same four configured lines reached guest Shopify payment before and after the release. Sign-in was optional; browser Back kept the cart and promo. No payment/order was submitted. |
| Narrow mobile layout | Room Visualiser and homepage had no document-level horizontal overflow at the tested narrow viewport. The mobile page scrolled to the footer and back to the top; room preview CTA and controls were usable. Desktop room preview navigation was also exercised. |

The full production gate, protected policy, focused routing/guide tests, Shopify Liquid validation and staged Vercel build passed. The checkout check is a payment-page handoff, not a completed transaction. Valid private sample-credit redemption, photo analysis and the held paid purchase remain open. One first Cushion Studio click timed out while calculating; a clean reselection and refresh produced the expected £69 quote, so no repeatable defect was established from that observation. The Design Library's Return to Fabric Intelligence action retains room/colour context; its generic Browse Fabrics action opens the general library rather than a room-filtered listing.

This document is a handover record only. It does not change the approved runtime or theme assets.
