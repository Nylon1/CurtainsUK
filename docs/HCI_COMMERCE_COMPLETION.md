# HCI commerce completion — staging rehearsal, 14 September 2026

Follow-up: [Sadira transaction rehearsal](HCI_SADIRA_TRANSACTION_REHEARSAL.md) resolves the stock, Draft Order, immutability and downstream device blockers recorded below. This original report is retained as historical evidence.

Branch: `feature/curtainsuk-phase-5a-prelaunch` in `Nylon1/Apexcurtains`.
Gateway implementation: `6667905d91ac028920a8a6b2f9d427672d4d9607`.
Pinned HCI intelligence: `41a9f3f`; no ranking, strategy or HCI deployment changes.
Gateway preview: https://curtainsuk-staging-gateway.vercel.app
Dawn preview: https://www.curtainsuk.com/?preview_theme_id=182264234363

## Status

| Area | Status |
| --- | --- |
| HCI integration | PASS |
| Palette correction | PASS |
| Five strategies | PASS |
| Refinement | PASS |
| Sample handoff | PASS |
| Make Curtains handoff | PASS |
| Pattern fallback | PASS |
| Pricing | PASS |
| Stock | BLOCKED |
| Shipping | PASS |
| Draft Order | BLOCKED |
| Price immutability | BLOCKED |
| Mobile | BLOCKED |
| Desktop | BLOCKED |
| Latency | BLOCKED |
| Feedback logging | BLOCKED |
| Privacy/human-quality gate | OWNER APPROVAL REQUIRED |

PASS entries concern the implemented and exercised boundary, not customer activation. Shipping rules and tests remain unchanged; shipping has not reached a new HCI-originated Draft Order. Mobile/desktop layout and upstream journeys were exercised, but the requested full transaction matrix is incomplete. Existing immutable-pricing tests pass; the new post-Draft supplier-price-change rehearsal could not run because no Draft was created.

## Implemented correction

The adapter retains manufacturer match/repeat facts. Verified random/no-match and supported verified repeat calculations take precedence. A missing match specification now permits an additive 500mm allowance for each cut length, tagged `DEFAULT_PATTERN_ALLOWANCE` and `curtainsuk-pattern-allowance-v1`. Explicitly recorded zero repeat permits `PLAIN_NO_MATCH_REQUIRED`. No straight or half-drop manufacturer match type is invented. Missing usable width and the existing unsupported half-drop manufacturing rule remain protected.

Recommendation, configuration and price eligibility are separate. Price still needs governed commercial verification; checkout still needs accepted saved daily stock and known shipping. Pattern provenance is included in calculation versioning and the immutable customer-summary snapshot.

HCI handoffs carry a signed, exact-fabric-bound context proof. Browser requests cannot claim a completed purchase or completed sample order. Accepted palette corrections, strategy/fabric reactions, sample intent and fabric selection append to immutable session versions with policy, recommendation version and timestamps. Raw observations and previous revisions remain intact. A sample intent is not an order. Completed-purchase/sample-order receipt logging remains to be completed and verified against genuine server-confirmed outcomes; no artificial purchase event was generated and stock confirmation was not coupled to HCI availability.

## Real browser evidence

The original image-first consultation `d8052224-4554-428c-9873-c94fefc665d4` naturally selected Sadira Lagoon (`pt-4262-770`, SKU `4262/770`). No fabric was injected into HCI. The final shortlist also included Java Ocean, Chenies Taupe and Leonardo Olive; an unsupported tonal direction was not forced.

In unpublished Dawn: Sadira Lagoon → 180cm coverage / 210cm drop → pencil pleat → standard lining → pair returned **INSTANT_PRICE, £601.00 VAT-inclusive goods**, four fabric widths. SW1A 1AA was entered. Test checkout correctly refused with “availability not acceptable”; the UI retained the configuration and showed availability to be confirmed. No supplier cost, margin, dye lot or stock quantity appeared in the customer summary.

The sample CTA saved Sadira with consultation context; its Return to my shortlist link restored the same final shortlist. Resume my curtains retained Sadira and the standard window. Guided-first with image and guided-first without image/Skip were also exercised in the preceding integrated rehearsal. The pinned image-first contract still asks 14 questions plus 22 calibration reactions; shortened adaptive questioning is not yet demonstrated and was not simulated by inventing answers.

A demonstrated navigation CSS load-order defect caused mobile horizontal overflow. The scoped overflow rule was corrected in the unpublished theme. After hydration, document scroll width equalled viewport content width at 390, 412, 768 and 1440px. Screenshots were captured and inspected during the browser session. These layout checks do not constitute completed checkout tests at every viewport.

## Hosted timings

Five fresh hosted sessions replayed the same frozen licensed Room 20 image and answers through the CurtainsUK HTTP API: 225/225 requests succeeded. This measures HTTP plus gateway persistence, not full browser rendering. Five repetitions are a small sample, not five independent human-quality reviews. First start is a cold candidate, not a forced-runtime cold-start measurement.

| Operation | n | p50 | p95 |
| --- | ---: | ---: | ---: |
| Session start | 5 | 0.845s | 8.173s |
| Image | 5 | 2.353s | 3.455s |
| Palette edits/confirmation | 15 | 0.962s | 2.310s |
| Strategy generation | 5 | 2.218s | 2.422s |
| Refinement | 5 | 2.491s | 3.466s |
| Fabric detail hydration | 5 | 0.705s | 0.760s |
| Outcome persistence | 5 | 1.360s | 1.461s |

All five runs retained the same final selected-identity/order digest:
`5e20eca33b4f4b8a3eaf38cd8271099b6f708013c9312b098abb414af765f4e1`.
This is not a claim that cross-session provenance digests, which contain session identity, are identical. The HCI engine was unchanged. Cold behaviour, refinement above 3s p95 and browser-to-Draft timings remain open. See `artifacts/phase6-discovery/hci-integrated-benchmark.json`.

## Validation and remaining actions

`npm test` passed all eight script suites (279 test executions, including the 18 theme tests repeated by the final script). TypeScript no-emit, changed-file ESLint and browser JavaScript syntax checks passed. The gateway preview build passed. No schema migration was made.

A fresh Shopify read at 05:58 UTC confirmed `curtainsuk-dev.myshopify.com` is a Basic App Development partner-development store, GBP and taxes-inclusive. No payment settings changed. The read used current Shopify CLI app credentials because downloaded Vercel Sensitive values are redacted; a redacted download is not evidence of a broken remote credential. See `artifacts/phase6-discovery/hci-commerce-payment-safety.json`.

Minimum remaining actions before customer HCI activation:

1. Authenticate Prestigious Webtex and obtain genuine aggregate supplier evidence for a naturally recommended fabric, beginning with Sadira `4262/770`. No daily stock snapshot exists for Sadira, Java `7247/711` or Wilfred `8837/768`; their stock must not be fabricated. Configure/validate the real scheduled source: the current daily-stock endpoint reports `UNATTENDED_SUPPLIER_SOURCE_NOT_CONFIGURED`.
2. Resume the saved browser configuration with the accepted daily snapshot, complete safe Draft creation and verify goods/VAT/delivery/context. Then run the post-Draft price-change immutability check and remaining desktop/mobile transaction matrix.
3. Complete and verify server-confirmed purchase/sample-order outcome receipts independently of HCI availability. Existing intent/selection/reaction logging is not proof of fulfilment or payment.
4. Resolve the pinned contract's unshortened image-first questioning and measure full browser handoffs/cold behaviour. Human review must accept explanations, refinement and latency; no ranking adjustment was made here.
5. Agree privacy/retention and complete recommendation-quality/UX approval before enabling customer HCI.

Dawn remains unpublished. Minimal, payments, Merchant Center and supplier ordering were not changed. HCI PR #24 remains unmerged and customer HCI remains disabled.
