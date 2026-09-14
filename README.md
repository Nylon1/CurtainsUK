# Apex Curtains

This repository is the source repository for **www.apexcurtains.com** on `main`.

A separate CurtainsUK product was developed historically on the branch:

`feature/curtainsuk-phase-5a-prelaunch`

That branch powers **www.curtainsuk.com** today, but it should not replace Apex Curtains `main`. CurtainsUK is being separated into its own dedicated repository so each live business has an unambiguous source of truth.

## Repository ownership

### `main` — Apex Curtains

`main` belongs to **Apex Curtains** and should remain the source of truth for:

- www.apexcurtains.com
- specialist apex/gable/architectural curtain content
- Apex SEO/AEO site
- Apex Professional Platform
- Apex-specific operational and specification tooling

Do **not** merge the CurtainsUK production branch into `main` simply to make GitHub match the CurtainsUK live site.

### `feature/curtainsuk-phase-5a-prelaunch` — historical CurtainsUK production line

This branch contains the current CurtainsUK storefront and commerce work, including:

- CurtainsUK Dawn storefront integration
- Fabric Master catalogue and supplier ingestion
- made-to-measure configurator
- pricing and VAT logic
- daily stock snapshot rules
- shipping
- samples
- Shopify Draft Order / checkout integration
- How to Measure / How to Fit guides
- CurtainsUK ↔ Hybrid Curtain Intelligence integration

As of the September 2026 production launch, CurtainsUK should be treated as a separate product and moved into a dedicated `Nylon1/CurtainsUK` repository with its own `main` branch.

## CurtainsUK intelligence boundary

Hybrid Curtain Intelligence is intentionally a separate codebase:

`Nylon1/Hybrid-Curtain-Intelligence`

HCI owns consultation and recommendation intelligence. CurtainsUK owns commerce, pricing, stock, shipping, customer storefront, samples and checkout.

## Production state outside GitHub

A Git checkout alone does not recreate either live service. Important runtime state also exists in:

- Shopify themes, products, pages, policies and payment configuration
- Supabase schema/data/RPC state
- Vercel deployments and environment variables
- supplier portals and authenticated supplier sessions
- production secrets and OAuth/app installations

Never assume repository state alone is the complete production backup.

## Current Apex product direction

Apex Curtains is a specialist UK curtain and track business for complex architectural glazing, including apex, triangular, gable-end, double-height and other difficult window forms.

Alongside the public SEO/AEO authority site, `main` contains the **Apex Professional Platform**: a private project-intelligence and specification workspace for architects, interior designers, developers, housebuilders, contractors, fit-out teams and Apex project staff.

The platform follows the project chain:

`geometry -> fixing context -> track strategy -> textile specification -> installation method -> outcome`

### Professional Platform V1

V1 covers:

- authenticated, project-scoped professional workspaces
- persistent project records and project-team access
- aperture registers with revision history and provenance
- private evidence storage and secure document retrieval
- document revision/evidence-status control and superseding
- RFIs, actions, responsibility, priority and due dates
- risk controls
- project programme targets
- specification items with source linkage and revision history
- versioned controlled exports
- repeat-project templates
- handover / close-out controls
- project activity history

The V1 release record is maintained in `docs/product/professional-platform-v1-release.md`.

## Validation

Run:

```bash
npm run seo:check
npm run build
npm run lint
```
