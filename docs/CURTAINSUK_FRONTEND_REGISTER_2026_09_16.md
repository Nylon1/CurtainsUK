# CurtainsUK Frontend Register — 16 September 2026

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
