# CurtainsUK / Apex Curtains

This repository now contains two related product surfaces:

1. **CurtainsUK** — the live made-to-measure curtain ecommerce platform at `https://www.curtainsuk.com`.
2. **Apex Curtains** — specialist curtain/track and professional-project functionality for complex architectural glazing.

The current live CurtainsUK work is **not on `main`**. Treat the branch and deployment notes below as the source of truth until the repository is deliberately consolidated.

## Current source of truth

### CurtainsUK storefront / commerce

- Repository: `Nylon1/Apexcurtains`
- Live development branch: `feature/curtainsuk-phase-5a-prelaunch`
- Audited branch head at this README update: `0279dc9f6056be689ae715ebe804c221a1907709`
- Default branch: `main`
- `main` head at audit time: `89f94dbfa9ace5f5e93e03ddf51e1d5725c7b6c4`
- Live site: `https://www.curtainsuk.com`
- Live Shopify theme: Dawn `182264234363`
- Rollback theme retained: Minimal `79650455661`
- Purchase controls: live
- Customer HCI navigation: same-origin through the signed Shopify app proxy
- Customer-facing staging/Vercel navigation: removed from the audited live routes

Do **not** assume `main` contains the production CurtainsUK implementation. Reconcile/merge deliberately after the live branch is stabilised.

### Hybrid Curtain Intelligence (HCI)

HCI is intentionally maintained as a separate private repository:

- Repository: `Nylon1/Hybrid-Curtain-Intelligence`
- Default branch: `main`
- Current customer-intelligence development: draft PR #24
- PR branch: `codex/real-internal-consultation-pilot-v1`
- PR head at audit time: `310b6d8f292b0d6e16c2c826c9c3810f7d27185d`
- PR #24 remains **draft and unmerged**

CurtainsUK consumes HCI through a narrow server-side integration. HCI does not own price, stock, shipping, Shopify payment, or order authority.

## Production architecture

```text
Customer browser
  -> www.curtainsuk.com / Shopify Dawn
  -> signed CurtainsUK app-proxy/customer routes
  -> CurtainsUK server/gateway
  -> Hybrid Curtain Intelligence for consultation/recommendation

CurtainsUK commerce
  -> Fabric Master / catalogue
  -> configurator
  -> pricing
  -> daily stock snapshot
  -> shipping
  -> Shopify checkout/order
```

### Responsibility boundaries

**Hybrid Curtain Intelligence owns:**

- adaptive consultation
- room/reference-image interpretation
- customer-correctable primary / secondary / accent palette
- supplier/manufacturer colour evidence and colour ontology
- five design-advice directions
- recommendation explanations
- strategy/fabric reactions
- one refinement pass
- recommendation/outcome provenance

**CurtainsUK owns:**

- customer storefront and Fabric Library
- Fabric Master identity
- samples
- window/configurator journeys
- fabric consumption
- pattern/repeat fallback policy
- headings, lining/interlining and pair/single configuration
- VAT-inclusive pricing
- stock eligibility
- shipping
- Draft Orders / checkout / payment
- order integrity

HCI must never silently become the commercial source of truth.

## Live CurtainsUK customer journeys

The production experience supports three fabric-discovery entry points:

1. **Choose fabrics myself** — direct Fabric Library browsing.
2. **Match fabrics to my room** — one optional reference image, palette confirmation/editing, then guided recommendation.
3. **Help me choose** — guided consultation first, with optional image support.

The assisted routes converge into the same HCI consultation/profile model.

The HCI advice model uses five customer-facing directions:

- Based on your taste
- Tonal & calm
- Complementary
- Pattern & character
- Designer choice

Customers can react with Love / Like / Not sure / Not for me and receive one refinement pass.

## Room/reference-image policy implemented for V1

The intended production model is:

- maximum one analysed reference image per consultation
- image upload is optional
- private/server-side processing
- customer can confirm/edit up to 3 Primary, 3 Secondary and 3 Accent colours
- original machine observation is preserved separately from the customer-confirmed palette
- raw reference-image retention target: 30 days
- earlier deletion request supported by policy/workflow
- customer-uploaded room images are not to be used for model training without separate explicit permission

Legal/privacy text must accurately reflect the deployed implementation before being treated as final legal copy.

## Fabric and catalogue system

The repository contains the CurtainsUK catalogue/fabric tooling, including:

- Fabric Master
- Prestigious catalogue/import tooling
- Sanderson Design Group catalogue/import tooling
- supplier-media discovery and mapping
- supplier image import/reuse
- supplier-intelligence tests
- catalogue privacy/public-payload controls
- staging and production storefront catalogue contracts

Important npm scripts are defined in `package.json`, including catalogue imports, media mapping, supplier shadow sync and the full test suites.

## Pricing / stock / shipping rules currently in use

### Pattern fallback

Precedence:

1. verified manufacturer repeat/match data
2. plain/no-match-required
3. 50 cm default vertical pattern allowance when a patterned fabric is otherwise usable but verified pattern data is genuinely unavailable

Fallback provenance must remain distinguishable from manufacturer-verified data.

### Stock

Launch policy:

```text
effective_stock = morning_supplier_stock - confirmed_CurtainsUK_same_day_usage

effective_stock > 30m   -> AVAILABLE
effective_stock <= 30m  -> CURRENTLY_UNAVAILABLE
```

No piece/batch/dye-lot requirement is used for V1. Supplier stock metres and the 30 m internal floor are not customer-facing.

Until unattended supplier refresh is connected, the daily morning refresh is an operational requirement.

### Shipping

Launch shipping currently uses the approved UK-only matrix/logic in the commerce layer. International checkout remains outside the V1 launch scope.

## Samples and checkout

The live sample architecture uses a generic Shopify `Fabric Sample` product with exact selected fabric identity carried as immutable line/order metadata rather than creating one Shopify product per fabric.

A controlled live sample-payment rehearsal was completed before launch with exact fabric/HCI metadata preserved and no supplier order automation triggered.

Supplier ordering remains manual unless explicitly changed in a future controlled release.

## Measuring and fitting guidance

Customer-facing guidance includes dedicated visual routes for:

- Standard Window
- Patio / French Doors
- Bay Window
- Apex / Gable

Bay measurement does **not** require customer-supplied angles. Guide terminology must stay aligned with the actual configurator contract.

## Infrastructure that is not fully represented by Git files

A complete recovery/deployment picture requires more than this repository. Important external state includes:

- Shopify theme publication state, Page records, navigation, product records and app installation/scopes
- Supabase database contents, applied migrations, storage buckets, RLS/functions and runtime state
- Vercel deployments, aliases and environment variables/secrets
- supplier portal authentication/session state
- daily supplier stock observations
- Shopify payment-provider configuration

Never copy production secrets into Git or this README.

## Repository audit notes — 14 September 2026

### Apexcurtains

- Repository is public.
- Default branch is `main`, but the current live CurtainsUK implementation is on `feature/curtainsuk-phase-5a-prelaunch`.
- The repository also contains separate Apex professional-platform, design and SEO branches.
- The live CurtainsUK branch includes the production routing cleanup and same-origin customer HCI handoff.

### HCI

- Repository is private.
- `main` is behind the current PR #24 development line.
- PR #24 is draft/unmerged and contains the real-fabric consultation, supplier-colour work, room/palette work, five-strategy recommendation work, human-review tooling and refinement work.
- Numerous historical `codex/*` branches remain. They are useful provenance but should eventually be archived/deleted after the current HCI line is safely consolidated.

### Known consolidation debt

1. Merge/reconcile the live CurtainsUK feature branch back to an intentional long-lived production branch or `main` after post-launch stability is confirmed.
2. Decide the merge strategy for HCI PR #24; production integration currently depends on work that is not yet merged to HCI `main`.
3. Clean obsolete historical branches only after source-of-truth commits and deployment references are pinned.
4. Keep Shopify/Supabase/Vercel external-state documentation current so Git history is not mistaken for the entire production state.

## Key release / evidence documentation

Useful reports under `docs/` include the production-routing cleanup and the Phase 5/6 CurtainsUK launch-readiness, HCI integration, commerce and rehearsal evidence created during the build.

For the latest live routing state, see:

- `docs/CURTAINSUK_PRODUCTION_URL_CLEANUP.md`

For HCI design/recommendation internals, use the HCI repository and PR #24 documentation rather than duplicating the intelligence implementation here.

## Validation

Primary repository checks:

```bash
npm run test
npm run build
npm run lint
npm run seo:check
```

Targeted scripts/tests are available in `package.json` for Fabric Master, supplier sync/intelligence/import, Prestigious, storefront, Shopify theme and catalogue/media operations.

## Legal business identity

CurtainsUK is operated by:

**Apex Curtains Ltd trading as Curtains UK**  
36–44 Bolton Road  
Blackburn  
BB2 3FA  
United Kingdom

Customer contact: `enquiries@curtainsuk.com`

Do not invent or publish company-number, ICO-registration, DPO or other legal identifiers unless verified owner-approved values are supplied.
