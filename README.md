# CurtainsUK

## Build My Rooms V1 — unpublished feature, 21 September 2026

Development lives on `feature/build-my-rooms-v1`, in the isolated `curtainsuk-build-my-rooms` worktree. See [Build My Rooms implementation and release runbook](docs/BUILD_MY_ROOMS_V1.md). The room experience, structured device autosave, immutable curtain retention and server revalidation adapter are implemented for local review. The source now contains a relational multi-curtain House extension (one paid order → many immutable curtain snapshots) with HMAC-verified webhook reconstruction, whole-House staff-only release and durable House idempotency. **Public House checkout remains disabled** until the migration is deployed and a private multi-line Draft Order rehearsal proves the linked production path. No production pricing, stock, paid lifecycle meaning, workroom policy, Customer Trust or cookie implementation was changed.

**Canonical live Shopify theme: `182339731835` on `carpetup.myshopify.com`. Do not create duplicate themes for feature development/review.** Git is the history/rollback source. Before every later deployment, compare the intended scoped files against the actual current live theme and preserve all intervening live changes. Do not push this worktree wholesale: historical sections below describe earlier work and are not a current-live release manifest.

Local preview: `npm run preview:rooms` → `http://127.0.0.1:4348`. Test: `npm run test:rooms`; browser verification: `npm run verify:rooms` while preview runs. Preview costs/stock are labelled fixtures, not a customer quote. Neither preview nor the new server command creates a Shopify order or takes payment.

## Google Fabric Discovery V1 — pilot infrastructure, 21 September 2026

The implemented pilot layer is documented in [Google Fabric Discovery V1](docs/GOOGLE_FABRIC_DISCOVERY_V1.md). It establishes one server-rendered canonical Fabric Detail destination per Fabric Master and models the Merchant item as a **physical fabric sample**, never a made-to-measure curtain. The projection is read-only and fail-closed against Fabric Master, governed commerce/sample state, approved image rights and approved Fabric Knowledge. The live audit found no working exact Fabric Detail route, so the live Google-eligible count is **0**; that is a distribution gap, not a judgement on fabric or Knowledge quality. £2.50 sample semantics and pilot image rights are approved, but the current public sample-product endpoint used by the existing code returns `404`, so live sample proof is still blocked. No feed was submitted, no mass indexation was changed, and the route/sitemap remain unmounted from the live domain pending the 50-item source-backed preflight and owner approval.

## Customer Trust / Legal / Footer V1 — review only, 21 September 2026

**NOT RELEASED. Do not deploy this branch as a gateway/theme update or publish its policy bodies until the review gates are resolved.** See [Customer Trust V1 review/runbook](docs/CUSTOMER_TRUST_V1_REVIEW.md) and [route audit](artifacts/customer-trust-v1/route-matrix.md).

The canonical source is `content/customer-trust/catalogue.mjs` plus `footer.css`/`footer.js`. `node scripts/build-customer-trust.mjs` generates the shared Shopify Liquid footer, app-proxy footer and 21 policy/care review destinations. Do not maintain duplicate footer copies by hand. `node scripts/preview-customer-trust.mjs` serves the local review at `http://127.0.0.1:4347/`; `/footer` shows the expanded service layer. `node scripts/check-customer-trust.mjs` checks source/link consistency and preference-control behaviour. `node scripts/verify-customer-trust.cjs` runs local desktop/390/412 browser checks (requires agent-browser and the preview server).

Canonical checkout/storefront legal destinations remain native `/policies/refund-policy`, `/policies/privacy-policy`, `/policies/terms-of-service`, `/policies/contact-information` and `/policies/shipping-policy`. These Shopify global records, page records/aliases, cookie settings and notification templates have separate Admin ownership; a theme preview does not sandbox them. New bodies/aliases are prepared in the unpublished manifest, not applied. The MTM-only order-confirmation addition is a review fragment, not a deployed email change.

Customer support: `support@curtainsuk.com`; complaints: `complaints@curtainsuk.com`; media: `media@curtainsuk.com`; MTM two-hour change requests retain `enquiries@curtainsuk.com`. Do not merge these purposes. Inbox operation and the legacy notification sender still need verification.

Preserve MTM cart immutability: Keep or Remove curtain, never edit priced configuration properties. Continue shopping returns to Browse Fabrics without clearing retained items. Customer-facing fabric/opening/heading/dimensions/lining/pair/price remains distinct from retained hidden machine metadata. This workstream does not change cart handlers, production pricing, stock, payment, PAID → REVIEW or explicit staff-only workroom release.

Publication holds include actual image-processor/retention facts, delivery/contract/returns details, address/VAT verification, responsible-business policy adoption and Shopify consent behaviour. Cookie Settings invokes the genuine Shopify preference control when available; the current banner is not enabled for any region, so live consent cannot yet be marked PASS. No secrets belong in this documentation.

CurtainsUK is a made-to-measure curtain commerce and fabric-intelligence platform. This repository is the authoritative application source.

> **Critical:** Shopify is the current customer-facing production storefront and commerce platform. Supabase Fabric Master is the canonical fabric catalogue. Next.js/Vercel also contains a substantial **built frontend that must be preserved**, although it is not the current production storefront direction; Vercel additionally supports APIs/intelligence/application infrastructure.
>
> **Before doing development work, read [`docs/CURTAINSUK_PROJECT_LEDGER_2026_09_16.md`](docs/CURTAINSUK_PROJECT_LEDGER_2026_09_16.md) and [`docs/CURTAINSUK_FRONTEND_REGISTER_2026_09_16.md`](docs/CURTAINSUK_FRONTEND_REGISTER_2026_09_16.md).** Do not rebuild, re-audit or delete completed/preserved work without new evidence.

## Current architecture decision — September 2026

### MTM production checkout release status — 20 September 2026

The production customer storefront is Shopify store `carpetup.myshopify.com`, presented at `www.curtainsuk.com`; the current live theme is `182339731835`. The installed MTM app is `curtains-uk-mtm`. Its active supporting runtime is the existing Vercel project `curtainsuk-staging-api`, served through `curtainsuk-staging-gateway.vercel.app`. HCI remains a separate upstream service.

Shopify continues to own cart, checkout, payment and orders. The MTM gateway owns server-side configuration compatibility, fresh-stock revalidation, pricing identity and the post-payment operational transition `PAID → CURTAINSUK REVIEW → APPROVED FOR MANUFACTURE → WORKROOM RELEASE`. Payment never releases manufacture automatically.

The public MTM payment gate is enabled only for the owner’s first controlled payment test. On 20 September 2026, a server-side private Draft Order rehearsal reconciled £532.00 goods, £90.83 VAT, £12.95 delivery and £544.95 total between CurtainsUK and Shopify. It used a fixed safe configuration with no customer/email, invoice operation, payment capability or workroom release, and was immediately deleted after verification. The temporary rehearsal route was then removed. No environment values or credentials belong in source, artifacts or this document.

On 21 September 2026, migration `20260921103025_guided_measure_checkout_measurement_allowlist` was applied and recorded against the production project. It adds the approved Guided Measure raw hardware fields to the immutable checkout snapshot allowlist only; all price, stock, compatibility, payment, RLS and paid-order lifecycle gates remain unchanged.

### Fabric Master deep-link hydration contract

`/pages/curtain-visualiser?fabric=<Fabric Master ID>` carries an identity reference only. The Shopify app proxy resolves that ID from the canonical Fabric Master configuration projection before the customer can price or check out; it never accepts commercial fields from the query string, browser storage or an editorial retail payload. Retail imagery/profile completeness is therefore independent of MTM configuration eligibility. The price and checkout-handoff endpoints re-read the canonical record and perform their own fresh stock, commercial eligibility, compatibility and signed-price checks. Invalid, deleted, unavailable or non-priceable IDs remain fail-closed with no price or checkout path. Browse and Fabric Detail handoffs use the same ID route and converge on this server-side resolver.

### SDG Fabric Master identity and handoff integrity — 21 September 2026

SDG Fabric Master IDs are generated from the authoritative supplier SKU only. Acanthus — Slate/Dove is supplier reference `F1681/03` and canonical Fabric Master `sdg-f1681-03`; `sdg-f1681-038` is not a canonical record and has no alias. Browse, Fabric Detail and HCI first resolve their card/handoff IDs against the canonical Fabric Master repository, while the Visualiser rehydrates a supplied ID through the same configuration projection. A stale, malformed or deleted ID therefore remains fail-closed rather than being guessed, aliased or made payable.

The 21 September live Browse/Fabric Detail SDG handoff audit covered all 386 paginated public catalogue pages (9,248 retail records): 6,070 SDG records were emitted, of which 5,815 were configuration-and-price ready, 255 were governed pending/non-commercial, 0 were aliased and 0 live handoff IDs were not found. This checks identity existence and governed commercial readiness; fresh supplier stock is still revalidated separately at price and checkout handoff.

### Production checkout deployment-stage gate — 21 September 2026

Non-payable Shopify Draft Order rehearsal modes remain restricted to `STAGING`. The live `CREATE_PRODUCTION_DRAFT` mode is restricted instead to the explicit `PRODUCTION` stage, the exact `carpetup.myshopify.com` store, the owner purchase-approval flag and the server-validated production contract. The inverse stage/mode combinations fail closed. This preserves the distinction between a private rehearsal and a customer-reachable checkout while allowing the authorised production route to execute on its production deployment.

The same-day no-payment live checkout test was then stopped: the Shopify line-item snapshot reported historical draft pricing version `2.3.0-draft.1`, not required production ruleset `3.0.0-production.1`. MTM purchase approval was disabled immediately until the route correction below had been verified.

### Production customer pricing selection — 21 September 2026

The public price route now selects its ruleset only from the deployed runtime contract: Vercel `production` plus CurtainsUK `PRODUCTION` stage executes the immutable active `3.0.0-production.1` ruleset and matching decision registry. It does not consult the public-purchase approval flag, so the exact production price and signed handoff can be verified while customer payment remains disabled. The production response is built by the pricing engine with that ruleset, validates that the engine's calculation version is exactly the ruleset version, and carries the same version through signed confirmation, immutable snapshot and Shopify Draft Order properties. Calibration routes retain their draft ruleset independently.

The canonical no-payment owner smoke test then confirmed `sdg-f1681-03` / `F1681/03` (French Doors, fitted Track, Wave, 201 × 236 cm, Blackout, Pair) at £661.00 goods including VAT, £12.95 delivery and £673.95 total. Gateway provenance confirmed the production ruleset for both price and immutable snapshot; Shopify's server calculation and Draft Order handoff completed. The checkout was prepared but not opened or paid. MTM purchase approval was re-enabled only after that proof; the first payment remains owner-controlled, and paid orders remain `PAID → CURTAINSUK REVIEW` with staff-only workroom release.

### Made-to-measure cart configuration contract — 21 September 2026

A made-to-measure curtain is an immutable configured item after the server has validated it and created its Shopify Draft Order. Customers can keep it or remove it; fabric, opening, hardware, heading, measurements, lining, construction and finish are never edited in place. A replacement curtain must be configured afresh through Fabric Master resolution, compatibility, raw measurement, pricing, fresh stock and signed handoff.

Buyer-facing line details are limited to fabric, opening, heading, width × drop, lining, pair/single and price. Measurement anchors, rule versions, configuration identifiers and supplier/production identity remain attached to the immutable CurtainsUK/Shopify operational record, not the customer line summary. Theme-cart continuation goes to Browse Fabrics and retains any valid cart contents.

CurtainsUK remains **Shopify-first for current production**, while preserving all frontend work already built.

There are **three distinct frontend bodies of work**:

1. **Live Shopify storefront** — `CurtainsUK Phase 4A Dawn 16`, theme `182264234363`, CURRENT PRODUCTION.
2. **Premium Shopify candidate** — `CurtainsUK New Design – Live Base`, theme `182310502779`, UNPUBLISHED and the current Shopify development candidate.
3. **Next.js / Vercel frontend** — substantial standalone frontend already built; **BUILT + PRESERVED**, but not the current production storefront direction.

The third item must not be confused with the separate use of Next.js/Vercel for supporting APIs, supplier intelligence, administration, decision/configuration services and other application capabilities.

- **Shopify** currently owns customer-facing production commerce: cart, checkout, payments and orders.
- **Supabase Fabric Master** owns canonical fabric identity and validated catalogue/commercial evidence.
- **HCI / Fabric Intelligence** provides recommendation and decision intelligence.
- **Next.js/Vercel** contains both preserved frontend work and supporting application/API infrastructure.

Do not rebuild the Vercel frontend as a parallel production site unless the owner explicitly reopens that direction. Equally, **do not delete or classify the existing Vercel frontend as obsolete residue** simply because Shopify is the current production direction.

## Project status — do not restart completed systems

As of the 16 September 2026 audit, CurtainsUK is already a functioning commerce system. In particular:

- Fabric Master and its customer-safe retail projection exist;
- Shopify already consumes the Fabric Master catalogue through the CurtainsUK integration;
- Fabric Intelligence/HCI integration exists and has hosted rehearsals;
- sample commerce uses a generic Shopify transaction product carrying exact Fabric Master identity;
- **real paid sample order #1034 (£1) is proven**;
- made-to-measure configuration, pricing, immutable handoff and Shopify Draft Order infrastructure are proven in staging rehearsals;
- the premium development homepage exists and should not be rebuilt;
- a separate Next.js/Vercel frontend also exists and must be preserved;
- the full Fabric Master catalogue does **not** need to be duplicated as thousands of Shopify products.

See the project ledger for evidence boundaries, exact snapshot counts and remaining work. A historical test proves the version/boundary it recorded; do not automatically claim that every later catalogue addition or candidate-theme change repeated that test.

## Authority map

| Domain | Authority / state |
| --- | --- |
| Current production storefront | Shopify theme `182264234363` |
| Premium Shopify development storefront | Shopify theme `182310502779` |
| Preserved alternate frontend | Existing Next.js/Vercel frontend |
| Cart / checkout / payments / orders | Shopify |
| Code / supporting application services | `Nylon1/CurtainsUK` plus verified deployed state |
| Fabric catalogue | Supabase Fabric Master |
| Schema | `curtainsuk_private` |
| PT evidence | Authenticated Webtex |
| SDG evidence | Approved SDG sources |
| Commercial stock | CurtainsUK stock materialisation of genuine evidence |
| Recommendations | Hybrid Curtain Intelligence (HCI) |
| Supporting runtime | Next.js/Vercel/runtime; verify exact project before production changes |

Git is not a complete production backup. State also exists in Supabase, Shopify, supplier systems, HCI, runtime configuration and secrets.

## Architecture

```text
CUSTOMER EXPERIENCE IMPLEMENTATIONS

A. LIVE SHOPIFY                 B. PREMIUM SHOPIFY
   theme 182264234363              theme 182310502779
   CURRENT PRODUCTION              UNPUBLISHED CANDIDATE

C. NEXT.JS / VERCEL FRONTEND
   BUILT + PRESERVED
   NOT CURRENT PRODUCTION DIRECTION

                 ↓ shared platform ↓

CURTAINSUK INTELLIGENCE + APPLICATION SERVICES
   |
   +--> Fabric Intelligence / HCI
   +--> curtain decision + configuration services
   +--> supplier intelligence / admin / APIs
   |
   v
SUPABASE FABRIC MASTER
canonical catalogue / media / retail profiles / commercial evidence
   ^
   |
SUPPLIER INTELLIGENCE
Webtex / SDG -> provenance -> validation -> approval -> freshness

CURRENT TRANSACTION AUTHORITY: SHOPIFY
cart -> checkout -> payment -> order
```

Suppliers provide evidence. Fabric Master establishes catalogue truth. Business rules establish commercial truth. HCI/Fabric Intelligence helps the customer decide. The configuration engine establishes what will be manufactured. Shopify currently executes customer transactions. Humans remain authoritative for business policy.

## Repository and source reconciliation

Current repository: `Nylon1/CurtainsUK`, branch `main`.

CurtainsUK was migrated from `Nylon1/Apexcurtains` / `feature/curtainsuk-phase-5a-prelaunch`. That branch is historical. Confirmed Apex-only public-route residue was removed from CurtainsUK in PR #2. Legacy Apex naming may still remain in harmless migrated metadata/assets; do not broadly rename identifiers without checking runtime impact.

The 16 September audit found source drift between remote `main`, two local importer fixes, exact deployed gateway code and unpublished Shopify theme files. Source reconciliation means **inventory and preserve first, compare second, reconcile genuine drift third**. It does not mean redesigning or deploying.

During reconciliation, preserve all three frontend bodies of work. Do not copy an entire local tree over GitHub, delete the Vercel frontend, overwrite the live Shopify theme with the premium candidate, or deploy merely to make versions match.

Full operating details, catalogue counts, PT checkpoint, business rules, commerce evidence, known gaps and next-work boundaries are maintained in the project ledger rather than duplicated throughout this README.

## Non-negotiable business rules summary

- supplier **Full Width** is calculation width; do not require `usable_width`;
- genuine stock evidence remains current for **72 hours / 3 days**;
- Free Stock **>=30m → AVAILABLE**;
- Free Stock <30m → OUT OF STOCK — AWAITING SUPPLIER STOCK;
- stale/unknown evidence → CHECK AVAILABILITY, not invented zero stock;
- AVAILABLE normally supplies sample and made-to-measure eligibility subject to genuine configuration/manufacturing constraints;
- approved supplier prices remain valid until superseded;
- PT uses **STANDARD PRICE EX VAT**, not Cut Price;
- never invent price, stock, identity or imagery evidence.

## Current audited PT checkpoint

PT was **owner-paused** after 186 collection entries through **Luna**. Resume at **Madeira** from the newest persisted checkpoint only when requested. Madeira listing was cached and detail/import had not started at the audit. Do not restart from Annika/pilot or recapture completed collections.

## Commerce proof

- Real Shopify sample payment: **order #1034, £1, PAID**.
- Exact Fabric Master/sample/HCI identity survived the real sample journey.
- Standard/Bay curtain pricing and Shopify Draft Order handoff are proven in staging rehearsals.
- HCI/Sadira D15 reached a **£613.95** staging Draft.
- A real paid made-to-measure curtain order is not claimed.
- Do not repeat a £1 payment merely to prove unchanged architecture.
- Do not create thousands of Shopify fabric products; Fabric Master already supplies catalogue identity/data through the integration.

## Working rule for humans and AI agents

Before implementing CurtainsUK work:

1. Read the Project Ledger and Frontend Register.
2. Inspect newer persisted state for the relevant subsystem.
3. Classify the task as **DONE + PROVEN**, **BUILT NOT PROVEN**, **PARTIAL**, or **MISSING**.
4. Do not rebuild DONE work.
5. Test BUILT NOT PROVEN work narrowly.
6. Finish only the documented missing boundary of PARTIAL work.
7. Build from scratch only when genuinely MISSING.
8. Preserve all three frontend implementations during cleanup/reconciliation.

**Learning may change what CurtainsUK recommends. It must not change what is commercially true.**

**Newer persisted evidence always supersedes snapshot counts and historical handovers.**

## Customer Trust V1 — review-only release state

The canonical customer-care/legal source is `content/customer-trust/catalogue.mjs`, built by `scripts/build-customer-trust.mjs`. It generates the shared footer, 21 review destinations, native-policy draft bodies and the HCI/app-proxy footer from one source. The customer-facing business identity is Apex Curtains Ltd trading as Curtains UK, company number `15652466`, customer correspondence/authorised returns address `36–44 Bolton Road, Blackburn, BB2 3FA`; the VAT registration number is intentionally not published.

Owner-approved policy decisions are recorded in `docs/CUSTOMER_TRUST_OWNER_DECISION_SHEET.md`. Technical privacy/cookie evidence is in `artifacts/customer-trust-v1/privacy-cookie-technical-verification.md`; the legacy-reference inventory is `artifacts/customer-trust-v1/drapesey-audit.md`. No Shopify policies, pages, consent settings, notifications, themes or live routes have been mutated by this build. The candidate remains unpublished pending technical privacy/consent verification, coordinated Shopify Admin cleanup and final legal/privacy review.

The MTM cart remains immutable (Keep or Remove), Continue shopping returns to Browse Fabrics, and all pricing, Fabric Master, stock, payment, PAID → REVIEW and staff-only workroom-release logic is outside this workstream and unchanged. Never publish generated policy/footer artifacts independently of the coordinated Shopify policy, page, consent and notification surfaces.

### Customer Trust V1 closeout (review-only)

Closeout evidence is recorded in `artifacts/customer-trust-v1/final-closeout.md`. The reversible Shopify cleanup plan is `artifacts/customer-trust-v1/drapesey-cleanup-plan.md`. The current live store still has 41 published Pages with 187 Drapesey occurrences, a Drapesey cookie privacy destination, and a Drapesey notification sender; these are publication blockers, not reasons to alter MTM commerce. Room-image processing facts that are not proven by the application/provider contract remain qualified in the privacy draft. No live Shopify record was changed in this closeout.
### Customer Trust route repair (2026-09-21)

The live theme 182339731835 referenced custom Shopify page templates whose
Shopify Page records were missing. This caused 404s for Fabric Library,
Browse Fabrics, Guided Measure, Make Curtains, How to Fit, Samples and Shop by
Window; it was not an MTM gateway disconnect. The required published Page
records were restored with their existing template suffixes, and `/pages/fabrics`
and `/pages/browse-fabrics` now redirect to the canonical catalogue routes.

Verified live HTTP 200: `/pages/fabric-library`,
`/pages/fabric-library?view=browse-fabrics`, `/pages/curtain-visualiser`,
`/pages/how-to-measure`, `/pages/how-to-fit`, `/pages/samples`, and
`/pages/solve-my-window`.
