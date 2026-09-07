# CurtainsUK Phase 5A — Pre-launch customer journey test

Date: 7 September 2026

Branch: `feature/curtainsuk-phase-5a-prelaunch`

Theme: unpublished Dawn 16, ID `182264234363`

## Verdict

The core standard, Bay, Apex, sample and mobile journeys work against the real staging backend. Prices exactly match independent server calculations, the two real suppliers use the same technical routing, specialist checkout cannot be bypassed, images load and supplier-commercial data remains private.

The staging experience is not ready for checkout design yet. Four functional defects should be fixed first: a Manual Quote can display a firm numeric price, specialist geometry accepts negative values through the API, Bay geometry is not cross-validated, and the Inspiration and Help navigation links return 404. The review journeys also need a real next-step submission rather than ending at an informational card.

No Shopify, PostgreSQL, deployment or production state was changed during this test.

## Journey results

| Journey | Inputs | Observed result | Verdict |
| --- | --- | --- | --- |
| Standard / Prestigious | Standard, 200 × 220 cm, Escher Mocha, Pencil, Standard lining, Pair | `INSTANT_PRICE`; 4 widths; 10.2 m; £834; VAT included; availability to be confirmed | Pass |
| Standard / Sanderson | Standard, 200 × 220 cm, Painters Garden Violet/Crimson, Wave, Blackout, Pair | `INSTANT_PRICE`; 4 widths; 10.6 m; £1,161; VAT included; availability to be confirmed | Pass |
| Bay | 340 × 220 cm; segments 80/180/80; angles 135/135; Dali Mocha; Wave; Blackout; Pair; photo | `PRICE_WITH_REVIEW`; 6 widths; 18.9 m; £1,004; checkout absent | Pass with validation gap |
| Apex | base 300; peak 300; verticals 200/200; slopes 180.3/180.3; Escher Mocha; Wave; Blackout; photo | `PRICE_WITH_REVIEW`; Technical review; payment and production blocked; no customer price | Pass with workflow gap |
| Sample first | Save Escher Mocha sample, Use This Fabric, Resume My Curtains | Exact SKU retained and preselected; no order/payment created | Partial: full configuration is not restored by explicit Resume |
| Mobile | 390 × 844; Standard 160 × 210; Dali Mocha; Wave; Thermal; Single; stack left | `INSTANT_PRICE`; 3 widths; £448; no horizontal overflow | Pass |
| Invalid measurement | width 20 cm | Native browser minimum rejects it | Pass |
| Suspicious units | width 1,000 cm | Server rejects it | Partial: message is generic |
| Stale availability | Prestigious approved price with expired stock observation | Still `INSTANT_PRICE`; `Availability to be confirmed` | Pass; technical and availability routing remain separate |
| Price unverified | direct URL and API request for `pt-4269-658` | Absent from public selector; price API returns 400 | Pass with unclear URL fallback |

A true `TEMPORARILY_UNAVAILABLE` or `DISCONTINUED` staging record did not exist, so that browser journey could not be exercised without mutating the development database. The repository-level lifecycle tests pass.

## Price and safety verification

- Deployed responses and independent local calculations matched exactly for the Prestigious standard, Sanderson standard and Bay scenarios.
- A 160-case matrix covering four projected fabrics, five headings, four lining states and pair/single construction produced 160 valid GBP results and no zero or non-whole-pound totals.
- All four projected supplier images returned HTTP 200 and rendered with non-zero natural dimensions and descriptive alt text.
- Public catalog, price, Bay and specialist payloads contained no supplier cost, trade price, raw stock, batches, margin, database credentials or secret values.
- The customer runtime reported Shopify country `GB`, currency `GBP`, English locale and visible VAT-inclusive wording.
- The configurator appears once in the DOM and exposes four unique, price-approved fabric options; no duplicate controls or options were found.
- Browser Back/Forward restored width, drop, heading, lining, construction, stack direction, window and fabric in the tested session.
- At 390 px, all visible configurator form controls measured 48–49 px high and the document had no horizontal overflow. The task-navigation links measured only 21 px high and need larger touch areas.
- Fabric-library cold-page evidence: TTFB 53.8 ms, LCP 1.372 s and CLS 0 in the automated run.

## Defects and launch blockers

### High

1. **Manual Quote displays a firm price.** A 700 × 220 cm standard request routes to `MANUAL_QUOTE` but Dawn shows £2,503 because the API includes `totalAmountMinor`. Manual Quote must return/display no customer price unless explicitly labelled provisional and approved for that route.
2. **Specialist API accepts negative geometry.** Mathematically consistent negative Apex measurements return `PRICE_WITH_REVIEW`. Payment stays blocked, but validation must reject all non-positive dimensions before classification.
3. **Review journey has no operational completion.** Bay and Apex end at a result card. No customer details, persisted review request, confirmation, expected response time or staff handoff exists. Customers cannot understand or complete the next step.

### Medium

4. **Bay geometry is not cross-validated.** Segment totals can disagree with coverage width and the number of angles can disagree with segment count while still returning a price-with-review result.
5. **Specialist endpoint lacks price-verification defence in depth.** A hidden, price-unverified SKU can reach specialist classification by direct request. No price is exposed, but unapproved fabrics should be rejected consistently at every entry point.
6. **Two task-navigation links are dead.** `/blogs/inspiration` and `/pages/contact` both return 404.
7. **Explicit Resume is incomplete.** Browser Back/Forward preserves the whole tested form, but `Resume My Curtains` restores only Window Type and fabric. Width, drop, heading, lining, pair/single and stack direction reset.
8. **Result summary is too thin.** It reports price, fabric widths and fabric name, but not the selected window, measurements, heading, lining, pair/single or stack direction. The customer cannot confidently verify the order specification.
9. **Standard jobs show Review Evidence.** Photo and drawing controls appear for ordinary rectangular curtains even though they are unnecessary, adding length and making the flow feel more technical than needed.
10. **Mobile task navigation has undersized touch targets.** The eight links wrap without overflow, but each measured about 21 px high. Increase the interactive height/spacing to at least 44 px without recreating horizontal scrolling.
11. **Instant-price results show specialist-review copy.** Standard Prestigious and mobile instant-price results still say that specialist jobs cannot bypass technical review. The safeguard is true but irrelevant on an ordinary instant-price journey and makes the outcome feel conditional.

### Low

12. **Server validation is generic.** Plausibility and likely-mm/cm failures show only `Unable to calculate the staging price`, without identifying the field or corrective action.
13. **Internal status leaks through an error string.** Direct price probing can expose the token `PRICE_REQUIRES_VERIFICATION`. It reveals no commercial value, but the public API should return a customer-safe error code/message.
14. **Requested decision order differs from the screen.** The tested screen presents Heading before Fabric. The Phase 5 checklist expects Fabric before Heading. This needs a deliberate UX decision rather than an accidental ordering difference.

## UX strengths

- Window Type is unmistakably first.
- Measurement basis explains that the customer enters coverage width rather than finished-curtain width.
- Real Prestigious and Sanderson fabrics share one selector and one pricing journey.
- Price, VAT and availability are easy to find.
- Bay and Apex routes clearly state technical review and expose no checkout control.
- Mobile form controls are comfortably sized, readable and free of horizontal scrolling; the task-navigation touch areas are the exception noted above.
- Sample intents retain the exact supplier SKU/design/colour without creating commerce state.

## Recommended order before Phase 5B

1. Suppress numeric totals for every `MANUAL_QUOTE` response and add a regression test.
2. Add shared positive/range/unit validation to specialist measurements.
3. Add Bay segment-sum, angle-count and plausibility validation.
4. Create a persisted review-request handoff with customer confirmation and response-time copy.
5. Fix the two dead navigation destinations.
6. Expand the customer summary and full configuration-resume state.
7. Hide Review Evidence and specialist-review copy for standard jobs, and enlarge mobile task-navigation targets.
8. Repeat this matrix, then design the three checkout gates.

## Evidence

The ordered screenshot manifest is at `artifacts/phase-5a/README.md`. It covers start, measurements, specification, evidence, result, validation, sample/resume, desktop and mobile states. The captures contain only staging/customer-safe information.

Automated evidence:

- 86 repository tests passed; 57 of those directly cover decision-engine, supplier, fabric, storefront and Dawn integration behaviour exercised in this phase.
- 160 deployed valid-price permutations passed with zero £0 results.
- Four projected image URLs passed.
- Public-data leakage scan passed.
- CORS, `no-store` and `noindex` checks passed.
