# CurtainsUK Phase 5M — launch gate

Baseline: `0b73d04c494644857c87862b55f4c57bfc67e506`. Branch: `feature/curtainsuk-phase-5a-prelaunch`.

Phase 5M is BLOCKED at the complete browser-to-Draft-Order gate. The Phase 5L service-level Draft Order baseline remains PASS. No new Draft Order was created in Phase 5M. Do not interpret those existing drafts as proof that the complete Phase 5M browser journeys passed.

| Area | Status |
| --- | --- |
| Catalogue | PASS |
| Real fabric configuration | PASS |
| Pricing | PASS |
| Stock verification | PASS |
| Bonded interlining | PASS |
| Shipping | OWNER INPUT REQUIRED |
| Instant Price | BLOCKED |
| Bay Review | BLOCKED |
| Manual Quote | BLOCKED |
| Draft Order | PASS |
| Price immutability | PASS |
| Desktop browser journey | BLOCKED |
| Mobile browser journey | BLOCKED |
| Concurrency/idempotency | PASS |
| Failure recovery | PASS |
| Samples/resume | PASS |
| Review email | PASS |

## Evidence and limits

Unpublished Dawn: https://www.curtainsuk.com/pages/fabric-library?preview_theme_id=182264234363

Staging API preview: https://curtainsuk-staging-b0r3h2k2g-hamzas-projects-4ef62f35.vercel.app (Vercel target null; stable staging gateway alias updated). Dawn theme 182264234363 remains unpublished. Production Minimal 79650455661, store email settings, payments, Merchant Center and supplier ordering were not changed.

The actual Dawn catalogue displayed 6,328 fabrics, 24 records per page. Desktop search found Painters Garden — Violet/Crimson, its real image and description, and the sample and Make Curtains actions. Sample return preserved the fabric and window. Desktop was 1,229 px wide; mobile 344 px. Both configurators had no horizontal overflow in inspected states.

Desktop Instant Price produced £1,105.00 goods for the real Sanderson pilot, 200 x 220 cm, pencil pleat, standard lining, pair. Clicking Prepare test checkout stops with delivery confirmation required. Mainland SW1A 1AA, BT1 1AA, IV1 1AA, HS1 1AA and invalid postcode all remained blocked without packing evidence. Region and parcel boundaries plus all nine VAT-inclusive rates passed automated tests. The browser did not reach a confirmed delivery quote or Draft Order for any parcel class; those integrated checks remain outstanding.

Desktop Bay was submitted through Dawn, reviewed in the real staging staff browser, revised and approved at £1,657 goods. Reference CUK-C0C3F6F1-B376-4DBA-A9B1-2756E40F3E30; configuration fd3ce590-a48f-4df4-ae28-4c3aed6e2d11. Database readback: two immutable revisions (original plus staff revision), one approval event. Packing/class is unconfirmed, so readiness/link issuance remains blocked.

Mobile specialist Awkward/Unusual showed no numeric price and no checkout control. The mobile Manual Quote rehearsal used the baseline 700 x 220 cm bonded pair: no initial numeric price, then customer submission, staff quote £3,363 goods and approval. Reference CUK-D20588FC-8BC1-437A-BF91-31FC3D18B70B; configuration 2add581b-8b97-4819-808d-b2742d88bc23. Two immutable revisions, one approval event. Delivery and customer acceptance of a final delivered amount remain outstanding. No false receipt/review of emailed evidence was recorded.

Both browser cases used synthetic staging contact details and explicit do-not-fulfil notes. No emails were sent. The correct enquiries@curtainsuk.com address was visible in submissions, staff guidance and Bay/Apex/Triangular/Gable/Manual instructions. No Drapesey references or supplier-commercial terms were found in the inspected customer review states; the CurtainsUK theme source scan also found no drapesey.com references.

Mobile refresh and recheck retained the submitted Manual Quote reference and selected configuration. A close/reopen rehearsal retained the selected fabric, specialist window, dimensions, heading, lining and pair. Back navigation and sample-return were inspected. This is pre-checkout state/resume proof; resuming a completed test checkout/accepted delivery still needs the blocked full-route rehearsal.

## Demonstrated defects fixed

1. The original concurrency regression made two remote create attempts for one handoff. A permanent, private, database-unique creation claim now allows one attempt. A saved receipt is recovered by ID; otherwise an exact tag lookup can recover a previously accepted draft. Empty search results never release a claim after an ambiguous response. The existing snapshot, pricing, shipping and Draft Order contracts are retained.
2. Reopening a submitted review lost its project reference from the customer page. A customer-safe local receipt now restores it and suppresses repeated submission of the same saved project. Cached signed calculations retain configuration identity when rechecking the unchanged project within their validity period. No contact details are added to this cache.
3. Instant checkout now verifies the existing signed price-confirmation mechanism against the configuration ID, measurements and current recalculated price. If price changes or confirmation expires, purchase stops for reconfirmation rather than silently accepting a different amount. An ambiguous previous checkout attempt cannot silently turn into a fresh configuration after token expiry; it stays pending for reconciliation.
4. Handoff confirmation displays goods, delivery and VAT-inclusive total to two decimal places, avoiding rounding away delivery pence. Browser-to-Draft visual comparison of those delivered totals is still blocked by packing.

## Concurrency and recovery proof

- Real staging database: 20 concurrent claims for the already completed D1 handoff yielded one initial claim; later runs yielded none. No Shopify mutation was invoked by this test.
- Browser double-click exercised checkout and staff approval. Database readback showed one Manual Quote approval event. Eight concurrent stale approval retries were rejected with no added revision/event and an unchanged original submission.
- Six concurrent current supplier availability projections for the actual maximum pilot requirement returned the same available state. No supplier reservation/order was made.
- Controlled Shopify transport test: accepted create with response lost, concurrent request, immediate retry while tag lookup remains empty, eventual exact-tag recovery. One create attempt total. Database claim failure prevents creation. Saved receipt retrieval avoids eventual search-index lag.
- Controlled supplier test: failed sync/availability run appends no stock observation and retains the approved state; temporary database timeout throws rather than inventing out-of-stock; restoration reads the identical approved snapshot and promotion history.
- Existing price-confirmation tests: unverified commercial basis yields Manual Quote/Price confirmation required with null customer price; no fabricated amount. New signed-price tests reject changed amount, measurements, identity and expired confirmation.

These are controlled fault simulations, not induced outages in the shared remote services. They are not a claim that the blocked browser checkout handoffs completed.

## Immutable baseline readback

Fresh development Shopify API readback confirmed OPEN drafts and exact original financials:

| Draft | Goods | Delivery | VAT within total | Total |
| --- | --- | --- | --- | --- |
| #D1 | £1,105.00 | £12.95 | £186.33 | £1,117.95 |
| #D3 | £1,657.00 | £19.95 | £279.50 | £1,676.95 |
| #D4 | £3,363.00 | £44.95 | £567.99 | £3,407.95 |

The prior real-fabric simulated supplier-price change proof remains intact; the pricing-engine immutability regression was rerun. Bonded remains £5/m for one combined layer, with no additional lining charge. No supplier price history or approved order price was changed.

## Recovery procedure

For a pending creation, retry the same handoff. Recover the saved Draft Order ID if available; otherwise reconcile the exact CUK_H_ tag, immutable configuration reference and financials in the development store. If Shopify has not indexed it yet, leave it pending. If the outcome remains unknown, staff investigate before authorising any replacement. Never delete/reset a creation claim merely because a request timed out or search returned zero results. Claims have no automatic expiry. Database permissions allow server insert/read only, deny browser roles, and prevent update/delete.

## Validation

Full npm test passed. Updated supplier failure suite (12 tests) and storefront suite (115 tests) passed; final theme suite passed. TypeScript and ESLint for changed TypeScript files passed. Vercel preview build passed. Secret scan found no actual environment credentials in changed files. Supabase verification confirmed RLS enabled and no anon/authenticated access to the new private claim table. The pre-existing leaked-password-protection advisory remains unchanged: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection . Private service-only tables intentionally have no browser RLS policies.

## Minimum remaining actions before publication

1. Workroom supplies real packed length/width/depth/weight for a normal pair, larger pair and heavy/specialist order, plus carrier limits/manual-confirmation criteria, using `curtainsuk-phase5m-packing-inputs.md`. No dimensions or weights were invented or promoted from synthetic fixtures. Approved rates stay unchanged.
2. Apply that operational evidence through the existing packing configuration / approved review specification. Preserve manual confirmation for anything ambiguous. The current controller requires packing evidence; the existing staff class field alone does not supply it. Verify that the chosen manual delivery process is usable before launch.
3. Finish the actual desktop and mobile customer acceptance → delivery → development Draft Order handoffs for all three routes, including all three parcel classes and exact goods/delivery/VAT comparison. The staging API Draft Order mode remains disabled; configure/enable only its allowlisted development-store test mode for that rehearsal after payment safety is checked. This is Codex operational work, not another owner pricing decision.
4. Recheck completed-checkout resume/recovery, then obtain explicit publication/live-payment approval. No publication or payment activation is authorised by this report.

Evidence: `artifacts/phase5m/operational-checks.json`, `browser-postcodes.json`, `review-email.json`, `close-reopen.json`, test logs, theme-role confirmation and desktop/mobile PNGs.
