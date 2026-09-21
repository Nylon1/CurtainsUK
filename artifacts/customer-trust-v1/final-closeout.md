# Customer Trust V1 final closeout

**Candidate:** `4195c0e`  
**Date:** 21 September 2026  
**Status:** review-only; live Shopify customer-facing records were not changed.

## Evidence

- Candidate content, shared footer and 21 policy/customer-care drafts build and lint successfully.
- Storefront regression: 203/203; Shopify theme checks: 18/18; responsive route audit covers desktop, 390px and 412px.
- Current live audit: 547 Shopify Pages; 41 published pages contain 187 Drapesey occurrences. A reversible, page-by-page cleanup plan is in `drapesey-cleanup-plan.md`.
- Current native Shopify policy records are not Drapesey-branded, but Privacy is an older generic record, Refund is generic Shopify boilerplate, Terms is generic Shopify boilerplate, and the cookie/privacy destination is still `https://www.drapesey.com/policies/privacy-policy`.
- Current notification sender/preview still uses `enquiries@drapesey.com`.

## Technical privacy boundary

The application proves that room uploads are optional, sent over HTTPS to the configured HCI upstream, rejected from persisted derived state, and not used by the application as a reusable training dataset. The repository does not prove the upstream processor's temporary storage, deletion, logs/backups, subprocessors, processing regions or transfer safeguards. The public draft therefore keeps those points qualified and does not publish a precise retention or transfer promise.

## Release decision

Do not publish yet. The remaining blockers are live Shopify configuration/publication work (consent, sender, checkout policy records and the scoped Drapesey retirement) plus provider-contract evidence for image processing. MTM pricing, payment, stock, Fabric Master identity, PAID → REVIEW, workroom release and cart immutability were not changed.
