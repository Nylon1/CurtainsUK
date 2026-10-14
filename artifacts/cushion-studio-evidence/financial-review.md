# Independent financial review

Review of the candidate's arithmetic and order reconciliation, 14 October 2026. This is not a live Shopify transaction or finance approval.

- Confirmed the selected making card uses one full rate, with standard £8/£11/£12, round and 65 cm bed £10/£13/£14, and bolster/70 cm bed £12/£15/£16. Higher/proposed rates retain explicit approval state.
- Confirmed no second payment-fee or piping-cord addition in the current cost calculation.
- Confirmed special inserts require their own compatible costs; supplier price comes through the existing approved-cost reader.
- Identified the repository's locked retail VAT authority at `lib/storefront/checkout-gates.ts`, avoiding a new invented default.
- Asked for staff resulting-margin diagnostics and idempotent recovery of persisted checkout snapshots after ambiguous transport results.
- Identified a rounding edge for regression: two net items at 1,338 pence each give aggregate VAT 535 pence, allocated 268/267; gross lines then become 1,606/1,605. Independently recomputing VAT from each VAT-inclusive gross line gives 268/268. The candidate must use the established Shopify reconciliation convention consistently; do not treat this mathematical example as a Shopify live test.
- Mixed orders require combined cloth availability, correct native curtain paid transitions, and shared delivery charged once.
- Paid processing must bind snapshots to their server-created draft/order and reconcile tax, shipping, total and quantity, not merely trust user-visible line attributes.

Findings were sent to Astra for implementation and targeted regression checks. This initial review file does not assert they are all resolved; final validation records must identify the tested revision and outcomes.

## Candidate resolution review

The final source review found the following corrections implemented:

- `pricing.ts` exposes target and resulting staff margin, net discount and pre-discount retail net. Margin remains unconfigured until an owner decision; the existing locked store VAT constant is reused.
- VAT now rounds on each Shopify quantity-one goods line before summation, with delivery treated separately. The identified 1,338-pence counterexample is covered by a regression test.
- Checkout retains immutable supplier ID/SKU references for main and contrast fabrics, pricing-rule version, specifications and attributable per-item totals. Retry uses the persisted checkout group.
- Hosted paid processing verifies the saved contract, completed draft-to-order link and full monetary reconciliation before recording manufacture. The migration includes unique paid snapshot claims and native curtain lifecycle invocation for mixed orders.
- The candidate records cushion-only stock usage by supplier identity; native curtain usage is not counted a second time. Mixed quotation reuses native curtain pricing and checks combined fabric demand.

Astra reported the complete project test run passing after these changes. Hosted SQL, production supplier access and a real Shopify draft/payment lifecycle were not exercised. These corrections therefore establish a reviewable implementation with automated evidence, not production financial acceptance.
