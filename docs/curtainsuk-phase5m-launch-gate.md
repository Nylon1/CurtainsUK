# CurtainsUK Phase 5M — final staging launch gate

Verified 13 September 2026 on `feature/curtainsuk-phase-5a-prelaunch`, continuing baseline `0b73d04c494644857c87862b55f4c57bfc67e506`. This report supersedes the earlier packing/classification gate; that report is retained in `curtainsuk-phase5m-launch-gate-september8-history.md` as historical evidence.

| Area | Status |
|---|---|
| Catalogue | PASS |
| Real fabric configuration | PASS |
| Pricing | PASS |
| Stock verification | PASS |
| Bonded interlining | PASS |
| Shipping | PASS |
| Instant Price | PASS |
| Bay Review | PASS |
| Manual Quote | PASS |
| Draft Order | PASS |
| Price immutability | PASS |
| Desktop browser journey | PASS |
| Mobile browser journey | PASS |
| Concurrency/idempotency | PASS |
| Failure recovery | PASS |
| Samples/resume | PASS |
| Review email | PASS |

## Actual browser handoffs

All three routes used real Sanderson Painters Garden, Violet/Crimson, internal SKU DAPGPA203. Fresh authorised supplier evidence was captured at 2026-09-13T04:50:04Z, including the current cut-price basis and one suitable stock piece exceeding the largest rehearsal requirement. The stock approval expires 2026-09-14T04:50:04Z; this is a point-in-time verification, not a reservation. No supplier order was placed.

| Route | Configuration | Development draft | Goods | Delivery | VAT included | Total |
|---|---|---|---:|---:|---:|---:|
| Instant | 201 × 220 cm, pencil, standard, pair | #D6 | £1,105.00 | £12.95 | £186.33 | £1,117.95 |
| Bay reviewed | 80/181/80 cm sections, 220 cm drop, pencil, standard, pair | #D7 | £1,657.00 | £19.95 | £279.50 | £1,676.95 |
| Manual Quote | 700 × 220 cm, pencil, bonded, pair | #D8 | £3,363.00 | £19.95 | £563.83 | £3,382.95 |

Instant used SW1A 1AA. Bay used IV1 1AA. Manual used BT1 1AA. The Manual Quote delivery amount was an explicit **synthetic staging quote** in the approved revision using the owner-configured NI amount. It is not an operational carrier quote for a large/heavy order. Actual specialist orders still require a destination-specific reviewed delivery quote; they cannot automatically take an ordinary rate.

Customer pages showed the exact delivered totals, and the development Shopify readback confirmed them. Line items retained configuration, fabric/design/colour, measurements, heading, lining, pair/single and pricing-version references. Public checkout had no trade cost, margin, stock metres or dye-lot data. Bonded remains one combined £5/m layer without an extra lining charge.

Bay reference: CUK-4C4CF8F2-3245-4C51-8B4D-3A92ADEA97FB. Manual reference: CUK-9DBA4BDE-EA44-45BC-A8C3-400BC5E344A5. Both were submitted through Dawn, revised and approved through the authenticated staff interface, and accepted through the customer interface. Manual initially showed no numeric price. No false evidence-received status or emailed evidence was recorded. Synthetic contact addresses were used and no emails sent.

Desktop and mobile checks covered configuration, customer review/acceptance and Shopify handoff. Staff administration used its authenticated browser. Screenshots in `artifacts/phase5m/final-{instant,bay,manual}-{desktop,mobile}.png` show the final remote states. Mobile refresh preserved the Manual project reference and selected configuration. Instant refresh/retry recovered the same #D6 handoff and created no duplicate. Earlier sample, back-button and close/reopen checks remain in the historical report; they were not all repeated in this final pass.

## Shipping and safety

Ordinary launch delivery is one owner-editable VAT-inclusive regional rate: Mainland £12.95, Highlands/Islands £19.95, NI £19.95. No ordinary packing evidence or parcel class is required. Existing postcode routing, invalid-postcode/manual confirmation and genuine specialist-review conditions remain. Legacy parcel rates remain dormant future configuration. See `curtainsuk-single-rate-launch-shipping.md`.

Dawn preview: https://www.curtainsuk.com/pages/fabric-library?preview_theme_id=182264234363

Staging gateway: https://curtainsuk-staging-gateway.vercel.app

Latest API preview: https://curtainsuk-staging-ljzzsaoj4-hamzas-projects-4ef62f35.vercel.app (preview, target null).

The development store is `curtainsuk-dev.myshopify.com`, confirmed partner-development, GBP, taxes included. Its customer checkout explicitly displays “This store can’t accept payments right now”; Pay now is disabled. Drafts remain OPEN, unfulfilled and unpaid. Dawn 182264234363 remains unpublished. Minimal, live payment settings, store email, Merchant Center, supplier ordering and HCI PR #21 were not changed.

## Demonstrated defects corrected

- Staff detail refresh unmounted the acceptance-link result. The same review workspace now stays mounted; READY_FOR_CHECKOUT can recover a link for its current approved revision without adding another approval/revision. Other blockers and stale revisions still reject.
- Shopify rejects reserved `.invalid` synthetic email domains even in development calculation. Synthetic contacts remain in the private review; the Draft Order payload omits those addresses. Ordinary valid emails are preserved.
- Bay section count was displayed with a centimetre suffix. The customer measurement summary now shows the count without a length unit.

The existing concurrent creation-claim, exact receipt/tag recovery and signed-price protections remain. Full tests reran controlled response-loss, duplicate request, database failure and unavailable verification scenarios. These are controlled simulations, not deliberately induced remote outages. The earlier real concurrency evidence is retained in the historical report. The final fresh browser retry and Shopify readback found no extra duplicate Draft Orders.

## Price immutability

An in-memory £1/m supplier-cost increase was used to calculate three new configurations. New goods totals were £1,124, £1,686 and £3,421 respectively. No supplier observation/history was changed. The approved snapshot hashes stayed identical. Subsequent Shopify readback matched all existing drafts before and after the simulation, including #D1/#D3/#D4 and new #D6/#D7/#D8. See `artifacts/phase5m/final-immutability.json` and `single-rate-fresh-readback.json`.

## Validation and limits

Full `npm test` passed, including 119 storefront tests and 18 theme tests. TypeScript, changed-file ESLint and Vercel preview builds passed. Repository-wide lint retains pre-existing failures; it is not reported as green. Regression tests were added before the acceptance-link and synthetic-email fixes. A final secret scan and theme verification are recorded with the commit artifacts. Customer review guidance remains enquiries@curtainsuk.com; no upload/scanning dependency was added.

Catalogue remains 6,328 browsable with 24-record pagination. Remaining supplier image reconciliation is not a launch gate. This rehearsal verifies one real supplier fabric across three routes; it does not grant blanket current stock or price approval to the catalogue.

## Minimum actions before publication

1. Continue current price and quantity-specific stock verification at purchase; refresh expired evidence. The rehearsal stock check is not a permanent order-ready grant.
2. For an actual specialist/large/heavy/commercial order, staff must obtain and approve its real delivery amount. The synthetic Manual Quote delivery is rehearsal evidence only. Ordinary orders need no packing input.
3. Owner explicitly authorises Dawn publication and a separately controlled live-payment activation. Neither action is performed or authorised by this report.
