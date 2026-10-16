# CurtainsUK Frontend Register — 16 September 2026

> **Current release pointer — 14 October 2026:** the dated snapshot below remains historical. PR #203 restored the existing Room Visualiser and added packaging protection; deployed protected commit `345c553c4553b159a587fdc6a7de7be48ca010e6` and current rollback/verification are recorded in [Production surfaces](PRODUCTION_SURFACES.md) and the [restoration record](room-visualiser-restoration-20261014.md). Shopify MAIN theme remains `182339731835`. Cushion Studio PR #201 remains a separate undeployed draft; stock-scheduler PR #202 is on `main`. Physical iPhone and spoken VoiceOver remain unverified. Use `release/production` for current storefront/API release authority.

> **Unpublished feature candidate — 14 October 2026:** [Cushion Studio](CUSHION_STUDIO_IMPLEMENTATION.md) adds two separate signed-proxy views (individual configurator, then sofa/bed layout) within the existing Shopify direction. Its loopback review server is engineering tooling, not a fourth storefront. The native page/CTA and hosted purchase gates remain off; no published frontend is replaced.

> This register exists to prevent future cleanup/reconciliation work from mistaking a deliberately preserved frontend for obsolete residue.

CurtainsUK has **three distinct frontend bodies of work**. They share platform/data/intelligence infrastructure but have different operational roles.

## Frontend A — Live Shopify storefront

- Theme: **CurtainsUK Phase 4A Dawn 16**
- Shopify theme ID: `182264234363`
- Role: **CURRENT PRODUCTION / LIVE**
- Purpose: functioning customer-facing CurtainsUK storefront and commerce experience.
- Protection rule: do not overwrite, replace or publish over it without explicit owner approval and a fresh production-state check.

## Frontend B — Premium Shopify candidate

- Theme: **CurtainsUK New Design – Live Base**
- Shopify theme ID: `182310502779`
- Role: **UNPUBLISHED / CURRENT SHOPIFY DEVELOPMENT CANDIDATE**
- Purpose: high-end CurtainsUK Shopify experience, including premium homepage/presentation and existing Fabric Master/Fabric Intelligence/customer-journey integration.
- Protection rule: preserve its complete source/evidence. Do not rebuild already-completed Fabric Library, Fabric Master, Fabric Intelligence or commerce integration merely because the theme is unpublished.

Donor/reference theme `182264136059` is not a fourth active frontend. Minimal `79650455661` is retained as rollback.

## Frontend C — Next.js / Vercel frontend

- Technology: Next.js / Vercel.
- Role: **BUILT + PRESERVED; NOT THE CURRENT PRODUCTION STOREFRONT DIRECTION**.
- Purpose: substantial standalone CurtainsUK frontend/application work built during earlier development.
- Protection rule: **do not delete, broadly clean up, or classify this frontend as accidental residue.** Preserve it during source reconciliation.
- Direction rule: do not continue/rebuild it as a parallel production storefront unless the owner explicitly reopens that architecture decision.

This is distinct from the fact that Next.js/Vercel also hosts/supports CurtainsUK API, intelligence and application services. “Vercel is not the current production storefront” does **not** mean “no Vercel frontend exists.”

## Shared platform beneath the frontends

```text
CURTAINSUK

├── FRONTEND A — Live Shopify
│   └── theme 182264234363 — CURRENT PRODUCTION
│
├── FRONTEND B — Premium Shopify
│   └── theme 182310502779 — UNPUBLISHED DEVELOPMENT CANDIDATE
│
├── FRONTEND C — Next.js / Vercel
│   └── BUILT + PRESERVED — NOT CURRENT PRODUCTION DIRECTION
│
└── SHARED PLATFORM
    ├── Supabase Fabric Master
    ├── CurtainsUK APIs / gateway
    ├── Supplier intelligence
    ├── pricing + configuration
    ├── HCI / Fabric Intelligence
    └── Shopify commerce integration
```

## Reconciliation rule

Source reconciliation must preserve all three frontend bodies of work before deciding what is duplicated, obsolete or deployable.

Do not:

- delete Frontend C because Shopify is the current production direction;
- overwrite Frontend A with Frontend B;
- treat Frontend B as a duplicate of Frontend A;
- copy an entire local tree over remote merely to make versions match;
- deploy any frontend solely as part of source reconciliation.

First inventory and preserve. Then compare. Then reconcile only genuine source drift. Deployment is a separate owner-approved action.


## My Home unpublished candidate, 16 October 2026

The candidate renames customer-facing House of Curtains to My Home, retaining its route, storage and signed curtain foundations. Explicit product additions, shared server review, one delivery and combined dispatch are locally verified. Production is unchanged. The latest acceptance report is `docs/CUSHION_STUDIO_MY_HOME_RELEASE_READINESS_20261016.md`: 713 passing test executions, production-style build, required cushion asset tracing, save/reopen, individual/set pricing and room/item removal. It records scoped factual gaps and rollback. Customer copy excludes em dashes, VAT labels and workroom instructions. Live checkout/authentication is not claimed as verified. The candidate remains unpublished.

Later on 16 October, the owner confirmed 4-5 calendar weeks for curtain dispatch from order, 1 m increments for all fabric orders and workroom acceptance of the active cushion construction/fit details. The candidate now records these decisions. Self-piping still needs complete strip allocation before binding quotes; supplier carriage and live purchase validation remain open. See the later owner-facts section of the readiness report. This supersedes those earlier pending-decision rows, without approving publication.
