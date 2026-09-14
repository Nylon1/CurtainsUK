# CurtainsUK repository separation

## Decision

CurtainsUK and Apex Curtains are separate live products and should have separate source-of-truth repositories.

Target structure:

- `Nylon1/Apexcurtains` → www.apexcurtains.com
- `Nylon1/CurtainsUK` → www.curtainsuk.com
- `Nylon1/Hybrid-Curtain-Intelligence` → shared/private HCI decision layer used by CurtainsUK

## Current CurtainsUK source

The current CurtainsUK production line is historically stored in:

- repository: `Nylon1/Apexcurtains`
- branch: `feature/curtainsuk-phase-5a-prelaunch`
- separation-preparation head: `1fa1d259af017db4940f7678c477ee55f5bb0333`

This branch must not be merged into Apex `main` merely to make it the production branch for CurtainsUK.

## Migration requirement

Create a dedicated repository named:

`Nylon1/CurtainsUK`

The initial `main` of that repository should be based on the complete current CurtainsUK branch tree, while preserving the source commit/ref in this document and preferably preserving Git history during the repository transfer.

Do not delete the historical CurtainsUK branch from Apex until all of the following are verified:

1. the new CurtainsUK repository contains the full production source;
2. Vercel/deployment configuration points to the new repository as intended;
3. Shopify/Dawn customer journeys remain unchanged;
4. Supabase production integration remains unchanged;
5. HCI integration remains unchanged;
6. production build/tests pass from the new repository;
7. a rollback/source-history reference is retained.

## What belongs in CurtainsUK

- customer storefront integration
- Fabric Master
- supplier ingestion/sync
- catalogue browsing
- samples
- curtain configurator
- pricing/VAT
- stock snapshot logic
- 30m availability floor
- shipping
- Shopify Draft Orders and checkout
- Measure/Fit guides
- HCI storefront gateway/integration
- CurtainsUK production documentation and tests

## What does not move conceptually

### Apex Curtains

Apex-specific public site, specialist architectural curtain content, SEO/AEO work and Apex Professional Platform remain owned by `Nylon1/Apexcurtains`.

### Hybrid Curtain Intelligence

HCI remains a separate private repository. Do not copy the recommendation engine into CurtainsUK. CurtainsUK should integrate with HCI through the existing controlled boundary.

## Production state that is not GitHub source

The repository move must not be confused with moving runtime state. Production also depends on:

- Shopify theme/store/page/policy/payment state
- Supabase database/RPC/data state
- Vercel environment/deployment configuration
- supplier portal credentials/sessions
- secrets/OAuth/app installation state

Those systems must be audited separately during the repository switch.

## Safety

The live www.curtainsuk.com storefront should not be redeployed merely to perform the GitHub organisational move. First establish and validate the new repository. Change deployment source only as a separate controlled step.
