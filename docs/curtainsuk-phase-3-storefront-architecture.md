# CurtainsUK Phase 3 — staging storefront architecture

## Status and safety boundary

This branch is a customer-facing staging proof built on the versioned decision engine. It does not contain Shopify Admin credentials, mutate the live catalogue, publish a theme, create carts or checkout sessions, upload customer files, write to Merchant Center, or release a configuration to manufacture. Global metadata is `noindex, nofollow`.

The repository supplied for the build is a Next.js 16 application, not a Shopify Online Store 2.0 theme repository. The implementation therefore uses modular, server/client-separated Next.js sections as the working development surface. Porting the approved UI into a Dawn 16 development theme remains a Shopify integration task; no claim is made that this branch is a Dawn theme.

## Route architecture

- `/` — window-first staging homepage.
- `/shop-by-window` — the 14 approved customer-facing window families.
- `/shop-by-window/[slug]` — canonical family pages with unique title, H1, copy, FAQs, internal links and FAQ structured data.
- `/configure` — window-first standard/review/specialist configurator.
- `/fabrics` — four synthetic FabricSpec colourways, all feed-ineligible.
- `/samples` — browser-local multi-sample intent basket and resume link.
- `/measure` — width-basis and shaped-window measurement guidance.
- `/api/staging/curtains-price` — customer-safe server price adapter.
- `/api/staging/specialist-review` — non-persistent specialist classification adapter.

## Decision-engine integration

The browser sends customer inputs to the staging API. The server resolves the Window Type Master and FabricSpec, creates a CurtainConfiguration, and invokes the existing versioned pricing and complexity modules. The response deliberately omits supplier cost, make-up rates, internal margin and component internals. It contains only customer-safe selections, the number of fabric widths, VAT-inclusive final total, delivery status and review outcome.

Normal rectangular configurations can return `INSTANT_PRICE`. Bay configurations calculate a price but remain `PRICE_WITH_REVIEW`. Apex, triangular, gable and awkward shapes use the specialist endpoint; payment and production remain explicitly `BLOCKED`, and the UI states “Price subject to technical review”. Invalid specialist geometry falls back to `MANUAL_QUOTE` at low confidence.

The pricing adapter is calibration-only. It provides zero staging values for unresolved internal packaging and delivery inputs so the price engine can demonstrate the flow, while delivery is shown separately as pending. It never promotes the DRAFT ruleset or bypasses production activation governance.

## Data and state

- Window content is a storefront presentation layer over canonical Window Type Master slugs.
- Synthetic fabric fixtures implement the FabricSpec contract and are marked `fixtureOnly`; every record is blocked from Google feeds.
- Sample intent is stored only in browser local storage. The exact fabric ID, SKU and colourway are retained, with an optional window relationship.
- Specialist file controls record file names only. No image content leaves the browser in this proof.
- Analytics events are emitted to `window.dataLayer` when present and to a `curtainsuk:analytics` browser event for local inspection.

## Analytics contract

The following events are instrumented: `window_type_selected`, `configurator_started`, `configurator_step_completed`, `validation_failure`, `fabric_selected`, `sample_ordered_intended`, `quote_review_submitted`, `price_displayed`, and `checkout_started`. The checkout event includes `staging_blocked: true`; its button creates no cart or payment.

## Shopify/API dependencies before production

1. Supply the Dawn 16 development-theme repository or authorise pulling an unpublished theme through Shopify CLI.
2. Create WindowType and FabricSpec metaobject definitions and migrate approved records using stable handles.
3. Choose the production pricing service boundary: Shopify app proxy, authenticated app endpoint, or Shopify Function-compatible division of responsibilities. Client-side pricing is not acceptable.
4. Add durable configuration storage, idempotency, expiry and an immutable pricing snapshot tied to a draft order/cart line.
5. Add private object storage, malware/type/size checks and retention/consent rules for specialist photos and drawings.
6. Add the staff review queue, notifications, audit trail and explicit approval transition before payment/manufacture.
7. Approve sample price, postage and fulfilment SKUs; then replace browser-local sample intent with a Shopify cart flow.
8. Approve accessory prices/compatibility, packaging thresholds, UK Mainland delivery rates, minimum orders and workroom-dependent rules.
9. Map approved sellable products/variants and exact landing-page prices to Merchant Center. Quote-only and synthetic records must remain excluded.
10. Connect the analytics contract to the approved consent platform, GA4/GTM naming plan and server-side conversion measurement where appropriate.

## Production acceptance gates

- Dawn development theme matches the responsive staging proof and remains unpublished during QA.
- Five to ten real jobs calibrate within the agreed commercial tolerance.
- Accessibility, keyboard, performance and cross-browser checks pass on the Shopify implementation.
- Price shown, cart price and checkout price match exactly and use the same immutable calculation version.
- Specialist configurations cannot reach payment or production without an authorised approval event.
- Feed eligibility tests prove quote-only, placeholder-price, inactive-ruleset and synthetic products are excluded.
