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

- `pricing.ts` exposes target and resulting staff margin, net discount and pre-discount retail net. At this review point margin was unconfigured pending an owner decision; the existing locked store VAT constant was reused. The later owner decision below supersedes only that margin status.
- VAT now rounds on each Shopify quantity-one goods line before summation, with delivery treated separately. The identified 1,338-pence counterexample is covered by a regression test.
- Checkout retains immutable supplier ID/SKU references for main and contrast fabrics, pricing-rule version, specifications and attributable per-item totals. Retry uses the persisted checkout group.
- Hosted paid processing verifies the saved contract, completed draft-to-order link and full monetary reconciliation before recording manufacture. The migration includes unique paid snapshot claims and native curtain lifecycle invocation for mixed orders.
- The candidate records cushion-only stock usage by supplier identity; native curtain usage is not counted a second time. Mixed quotation reuses native curtain pricing and checks combined fabric demand.

Astra reported the complete project test run passing after these changes. Hosted SQL, production supplier access and a real Shopify draft/payment lifecycle were not exercised. These corrections therefore establish a reviewable implementation with automated evidence, not production financial acceptance.

## Subsequent owner decision — 14 October 2026

The owner selected an editable **40% starting retail margin**. The candidate now defaults to 4,000 basis points under a new rules version. Nearest-penny net retail and per-line VAT give the synthetic £29 net-cost example £48.33 net + £9.67 VAT = **£58.00 gross**, before delivery. Staff resulting margin is approximately 39.9959%; the small rounding effect is not hidden. The standard £8 making and agreed component costs remain settled.

Existing PT investigation evidence explicitly leaves supplier minimum cuts/increments and carriage unverified. Existing curtain SINGLE_RATE delivery has confirmed rates, but cushion/mixed parcel applicability is not thereby approved. No unknown terms, special insert costs or proposed workroom rates were invented or silently approved.

The owner then confirmed a **1 m minimum cut**. It now applies once per distinct shared main/contrast fabric group. It does not establish larger-cut increments. The earlier £58 example remains a no-minimum arithmetic fixture; with the new minimum, illustrative £20/m cloth gives £38.20 filled cost → **£76.40 retail including VAT**, or £33.20 cover-only cost → **£66.40 retail including VAT**, before delivery. Supplier-specific overrides require explicit verified terms evidence. The proposed parcel amount is not assigned to cost or customer delivery until its meaning/tax basis is confirmed.


## Subsequent owner delivery decision — 14 October 2026

The earlier pending-parcel observation above is superseded: the owner confirmed £4.95 as the customer delivery charge **including VAT**, with actual carrier expense recorded separately. The candidate now uses exact gross 495p, Shopify tax-inclusive VAT 83p and net 412p, once per cushion-only order. Carrier expense is staff-only, net and nullable; unknown expense means unknown delivery contribution, not zero expense, and does not alter the customer charge or product margin. Mixed-order shared delivery applicability remains separately gated. Regression coverage carries this amount through quote, immutable checkout and paid reconciliation, verifies one delivery for multiple cushions, and verifies that recording carrier expense changes no customer price.
