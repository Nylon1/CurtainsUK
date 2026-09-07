# CurtainsUK Phase 5E — launch rehearsal

7 September 2026. Branch: `feature/curtainsuk-phase-5a-prelaunch`.

| Area | Status |
| --- | --- |
| Shipping | OWNER DECISION REQUIRED |
| Stock verification | BLOCKED |
| Staff review | BLOCKED |
| Malware scanning | OWNER DECISION REQUIRED |
| Instant checkout | BLOCKED |
| Reviewed checkout | BLOCKED |
| Manual-quote checkout | BLOCKED |
| Price immutability | BLOCKED |
| Prestigious readiness | BLOCKED |
| Sanderson readiness | BLOCKED |
| Mobile/desktop QA | BLOCKED |

These are complete operational-path statuses. Passing implementation tests do not certify an unexecuted remote checkout.

## Completed non-production work

- Owner-editable [shipping input policy](../config/curtainsuk-shipping-owner-inputs.json): nine Standard/Large/Oversize cells, null rates, postcode mappings, packed parcel thresholds, maximum dimensions/weight and separate manual specialist override. Database migration `20260907213533_curtainsuk_phase5e_shipping_classes.sql` applied to dedicated project `hqysjumypgeapgmqkcrx`. Three historical Specialist cells are retained, not reinterpreted; the active editor exposes nine cells.
- The server blocks delivery until the operating policy, postcode, packing allocation and corresponding database rate are confirmed. Customer-selected region/class cannot override the owner postcode/packed-parcel mapping. Postcode is included in a successful immutable shipping snapshot and Shopify shipping address.
- One staging reviewer created: `29beb53f-8e81-465f-bbf9-18496f31cecd`, sole role `CURTAINSUK_STAGING_REVIEWER`, scoped to the dedicated Supabase project and Preview environment. Sign-in verified. Credentials are in ignored local `.env.phase5e-staff`, absent from source/report. No invitation or other external message was sent.
- Reviewer permissions permit review and clean-evidence retrieval but deny supplier commercial administration, rate changes and evidence maintenance/deletion. Anonymous review API returns 401; ordinary synthetic customer returns 403; reviewer returns 200. Temporary ordinary customer identities were signed out and banned after their tests.
- Both `anon` and `authenticated` lack private-schema access. Database audit inspection recorded ten events under the real reviewer UUID. No supplier history was rewritten.
- Supplier SKU removed from customer-visible Draft Order attributes/title fallback/SKU; it remains in the private snapshot referenced by configuration ID. The customer line uses a CurtainsUK configuration SKU.
- Backend deployed to Vercel Preview `dpl_EJBQvZDdYeiDHcQLWXFRNz2ybRB1`, through existing staging alias `https://curtainsuk-staging-gateway.vercel.app`. Deployed reviewer/anonymous/commercial-denial checks passed, all with no-store responses.
- Updated only `assets/curtainsuk-storefront.js` and `sections/curtainsuk-configurator.liquid` in unpublished Dawn `182264234363`. Shopify confirmed role `unpublished`. Minimal `79650455661` remains `live`.

## Rehearsal evidence

The API harness uses a local application with the real dedicated staging database, locally generated proxy-signing keys and Draft Order mode forced to `DISABLED`. It exercises application routes and durable records, not merely pure function mocks. It does not impersonate the deployed Shopify gateway or claim a remote Draft Order.

| Journey | Observed result and stopping point |
| --- | --- |
| Standard Prestigious Dali, 200 × 220 cm, pencil, standard lining, pair | £614 including VAT; 12.6 m calculated; handoff blocked on availability and shipping |
| Standard Prestigious Escher, same configuration | £834 including VAT; 10.2 m; handoff blocked on availability and shipping |
| Standard Sanderson Painters Garden, same configuration | £1,105 including VAT; 10.6 m; handoff blocked on availability and shipping |
| Bay | Submitted → UNDER_REVIEW → new priced revision → APPROVED. READY_FOR_CHECKOUT request rejected with 409 on availability and shipping policy. Original revision unchanged; actor UUID verified |
| Manual Quote | No numeric customer quote before staff action. Submitted → UNDER_REVIEW → synthetic staff training quote → APPROVED. READY_FOR_CHECKOUT rejected with 409. Original revision unchanged |
| Apex | Submitted safe synthetic PNG → QUARANTINED → NEEDS_INFORMATION → UNDER_REVIEW → new synthetic quote revision. Approval rejected with 409 `REVIEW_EVIDENCE_NOT_CLEAN`. No scan result was fabricated |
| Invalid dimensions / unavailable fabric ID | Price endpoint returns 400 with no numeric price |

Durable Phase 5E request IDs: Bay `c2134a78-be87-4c8a-bfc5-3af766b31f3b`; Manual Quote `2dfe1d58-5de8-4bc9-88e2-6712ff00c25d`; Apex `d087e1df-caa0-4d4d-b328-0b8424b7ac8c`. Earlier Bay/Manual training records remain as audit history; they were not deleted or replaced.

Remote Dawn browser observations: mobile at 390 × 844 displayed Escher £834 and Sanderson £1,105 including VAT without horizontal overflow; blocked handoff preserved postcode/accepted specification and displayed availability/shipping blockers with no checkout URL. Desktop at 1440 × 1000 displayed Sanderson's manual route at 700 cm width with no numeric customer price. The sample shortlist saved the exact Sanderson colourway; Resume restored standard window, 700 × 220 cm, heading, lining, pair and fabric. After recalculation, the final theme fix preserves postcode/region, clears stale delivery errors and requires fresh customer acceptance; verified by switching Sanderson to Escher and observing £834, the retained postcode and an unchecked acceptance box. The unpublished preview banner was present throughout. The complete eight-path, two-device checkout matrix, Gable browser review and approved-price checkout remain unproven. Prior Phase 5D screenshots are not counted as new Phase 5E evidence.

All 202 automated tests pass, including three checkout contracts, exact goods/VAT/shipping validation, no £0 checkout, review/acceptance gates, immutable originals, scanner fail-closed handling, shipping owner gates and role separation. A real pricing-engine test changes a synthetic supplier cut cost from 2,000 to 6,000 pence: a new configuration price changes, while the stored snapshot/Draft Order contract remains unchanged. This is implementation evidence; the requested existing remote Draft Order repricing rehearsal remains blocked because there is no remote order.

TypeScript and application build pass. Changed TypeScript ESLint passes. Shopify Theme Check: no errors, ten inherited warnings. Supabase advisor reports intentional private-schema RLS-without-public-policy information and the existing leaked-password-protection warning; see [Supabase password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). The reviewer uses a generated high-entropy password; no paid Auth setting was changed.

Evidence: [API rehearsal](../artifacts/phase5e/api-rehearsal.json), [deployed auth checks](../artifacts/phase5e/deployed-auth.json), [tests](../artifacts/phase5e/test-results.txt), [build](../artifacts/phase5e/build.txt), [Theme Check](../artifacts/phase5e/theme-check.txt).

## Catalogue and exact launch blockers

1. **Shipping:** owner rates and all operating inputs in [the owner brief](curtainsuk-phase-5e-owner-inputs.md). No rate is confirmed. Confirm conservative packing allocations for lining/construction variants; unsupported/manual-delivery combinations stay blocked. Rehearse delivery-address changes in Shopify before launch.
2. **Supplier pilot:** current authorised cut prices and single-batch/dye-lot metre records for Escher `4269/147`, Dali `4270/147` and Sanderson `DAPGPA203`. All have zero batch records. Prestigious stored observations are from 6 September and expired at 00:00 UTC on 7 September. Sanderson's 7 September observation has no single-batch evidence even though its freshness window has not expired. No pilot was checkout-promoted.
3. **Scanner:** owner selects plan, UK/EU region, DPA and staging credentials. Then prove real clean acceptance, harmless infected-test detection and outage rejection. Only outage/quarantine has been exercised against durable staging evidence in this phase. No subscription was purchased.
4. **Review completion:** after stock/shipping/scanning, complete READY_FOR_CHECKOUT for Bay and Manual Quote and clean-evidence approval for Apex/Gable, then customer acceptance and exact-price handoff. The staff identity blocker is resolved; full reviewed checkout is not.
5. **Shopify payment safety:** verify the development store cannot capture real payments using actual payment-provider settings before enabling any test-draft creation. Authenticated Chrome access timed out; development-store naming alone is not accepted as proof. Keep Draft Order execution disabled. Database execution audit remains empty.
6. **Three remote checkout paths and immutability:** create and inspect the first test Draft Orders only after 1–5, verify all exact financial/specification fields and private SKU linkage, and repeat the cost-change test against an existing remote Draft Order. No remote Draft Order, checkout URL, payment, invoice send or fulfilment was created.
7. **Prestigious:** verify remaining 29 cut prices; refresh lifecycle and stock from authorised Webtex access. Read-only imagery audit: 32/32 current image URLs resolve. Catalogue remains 3/32 price-verified, 32/32 recorded current. No bulk approval.
8. **Sanderson:** obtain authorised imagery and fresh commercial/lifecycle/availability sources. One of 9,680 records has verified price/current lifecycle and an authorised image; that image resolves. Remaining 9,679 lack verified prices, known current lifecycle and authorised imagery. The old workbook is not current operational evidence. No bulk Shopify publication.
9. **Device QA:** finish every listed customer journey on mobile and desktop through the real test Draft Order, including sample/resume and unavailable/invalid states. Complete reviewer browser testing with the new identity. No launch PASS is inferred from the smaller API/visual checks.

No live theme publication, production Minimal edit, real payment enablement, Merchant Center activation or supplier-order automation occurred.
