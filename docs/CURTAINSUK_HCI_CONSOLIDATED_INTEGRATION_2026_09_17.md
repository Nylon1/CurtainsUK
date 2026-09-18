# CurtainsUK × consolidated HCI integration candidate — 17 September 2026

## Source boundary

- CurtainsUK source baseline: `10d071adee6a68588ff672c99ef95e1f165dc6f0`
- HCI source baseline: `6963feb3d3e85e80b759cd2e3cc5a505e8a80960`
- Clean, unmerged branch in each repository: `integrate/consolidated-hci-candidate-v2`
- Live Shopify theme `182264234363` remains untouched.
- Shopify candidate `182310502779` remains unpublished and was not changed by this bridge.

## Reconciliation

The legacy customer route is a copied static consultation presentation (`lib/storefront/hci/consultation.*`) served through the historic `41a9f3f` adapter. It is retained pending an explicit Shopify/app-proxy promotion, but is not used by the protected integration preview.

HCI PR #30 and CurtainsUK PR #4 were inspected and rejected as authority: both recreate customer orchestration/static presentation. The clean bridge reuses the existing HCI Room Palette, discovery, calibration, five-direction composition, governed adaptive learning and supplier-first evidence boundaries. It adds only a versioned server projection and a CurtainsUK customer component.

## Security and data ownership

CurtainsUK owns the signed anonymous session, rate limits, CAS/replay persistence, image validation and private-retention boundary, Fabric Master resolution, outcome logging and signed commerce context. HCI receives only a hashed owner and server-to-server request. The protected preview uses separate preview-only cookies and credentials. Room image bytes are bounded JPEG/PNG/WebP input, server-decoded for deterministic palette analysis, then excluded from persisted state and browser responses. No room image is sent to the visual-fabric/OpenAI pipeline.

Supplier/manufacturer truth stays authoritative. Machine room observations, customer confirmation, customer-added colours, Ignore evidence, adaptive reactions and supplier-first visual enrichment remain separate evidence classes.

## Current verification

- HCI production build and typecheck: pass.
- CurtainsUK production build, typecheck, lint and storefront suite: pass (`177/177`).
- Protected server-to-server request: CurtainsUK preview → HCI `6963feb` → discovery question: pass.
- Protected initial customer screen: pass.
- HCI private frozen bundle is traced to the preview endpoint only and is not committed.

## Review status

**BUILT:** yes.

**VALIDATED:** server bridge, contract, replay-safe persistence and initial customer route.

**MERGED:** no.

**INTEGRATED:** protected preview only.

**VISUALLY APPROVED:** no.

**REAL SHOPIFY ROUTE TESTED:** no.

The next action is manual screen-by-screen review of the protected preview. Do not publish, alter the live theme, redirect the current Shopify app proxy, enable a production HCI customer route, or merge this work before that review.
