# CurtainsUK final prelaunch readiness

14 September 2026. Branch: `feature/curtainsuk-phase-5a-prelaunch`.
Implementation: `12715f6`, `01a7712`, `e87483f606f5ed01ac3f021e997623cea4c4c5a1`.
Staging gateway: https://curtainsuk-staging-gateway.vercel.app
Deployment: https://curtainsuk-staging-g83d5ar2f-hamzas-projects-4ef62f35.vercel.app
Dawn preview: https://www.curtainsuk.com/?preview_theme_id=182264234363

This is a staging readiness report, not permission to launch. Dawn remains unpublished, customer HCI disabled, development-store payment disabled, Minimal untouched, Merchant Center inactive and supplier ordering manual.

## Status

PASS means the stated staging functionality was demonstrated; it does not mean approval for publication. BLOCKED includes incomplete final verification, identified explicitly below.

| Area | Status |
|---|---|
| Premium storefront | PASS |
| HCI | OWNER APPROVAL REQUIRED |
| Room-image flow | PASS |
| Palette correction | PASS |
| Five design directions | PASS |
| Refinement | PASS |
| Fabric Library | PASS |
| Fabric details | PASS |
| Samples | PASS |
| Standard | PASS |
| Patio/French Doors | BLOCKED |
| Bay | PASS |
| Apex/Gable | PASS |
| How to Measure | PASS |
| How to Fit | PASS |
| Pattern fallback | PASS |
| Pricing | PASS |
| Stock | BLOCKED |
| Shipping | PASS |
| Draft Orders | PASS |
| Mobile | BLOCKED |
| Desktop | BLOCKED |
| Accessibility | BLOCKED |
| Privacy | OWNER APPROVAL REQUIRED |
| Feedback logging | PASS |
| Legacy content cleanup | BLOCKED |

## Completed changes

- Dedicated measuring and fitting hubs, each with Standard, Doors, Bay and Apex guides. Diagrams use the actual configurator geometry. Bay has section widths and drop, without angles. Apex has six geometry fields and fixing position, with specialist assistance.
- Contextual measuring links retain window and fabric; navigation/footer now expose the hubs. Contact uses the working CurtainsUK help anchor. Legacy measurement content routes to the new guidance.
- Explicit governed staff morning-refresh workflow, preserving supplier-admin authorization. Partial morning refresh can add later verified SKUs without overwriting existing frozen snapshots. Missing/stale stock means confirmation required, not out of stock or falsely current availability.
- Raw reference media is rejected at the state-persistence boundary. Current processing discards raw images after analysis, earlier than the 30-day maximum; upload wording and the private image information page describe this actual behavior. No raw-image archive/public URL was introduced.
- A Bay Draft metadata label defect was fixed: number of sections is unitless; section widths remain centimetres. Existing immutable drafts were not rewritten.
- A regression fix separates temporary staff-authentication outages from real permission denials. One verified auth result is used rather than contradictory consecutive calls. Anonymous/customer access remains denied.
- Next.js updated within major version to 16.3.5 to address critical/high dependency advisories. No HCI ranking or commerce formula changes.

## Browser transaction evidence

| Rehearsal | Evidence |
|---|---|
| Existing HCI Sadira order | #D13 recovered idempotently; £601 goods + £12.95 delivery = £613.95; included VAT £102.33 |
| Bay instant order | #D14; 80/140/80 cm sections, 210 cm drop; £902 + £12.95 = £914.95; included VAT £152.49; no approval required |
| Fresh image-first HCI transaction | #D15; session `ff5ed28b-81da-4648-bce5-51ca1e69cf2d`, complementary strategy, exact `pt-4262-770` Sadira Lagoon; £601 + £12.95 = £613.95; included VAT £102.33 |

The fresh journey used the existing licensed Room 20 validation image, corrected the palette, answered questions, generated five direction slots, recorded scripted strategy/fabric reactions, refined once, and naturally selected Sadira. Sample intent and return context were retained. Configuration `4289fdba-ee9a-4084-9ae9-623b891e1ae9` and handoff `ffed695a-263c-5146-8cb8-a69fc93ae993` retain that consultation and strategy. Shopify's actual checkout showed the correct total, £12.95 shipping, “This store can’t accept payments right now,” and disabled Pay now. No completed purchase was fabricated.

The current genuine Sadira daily observation supported availability. Supplier price/stock were not invented. Original #D13 snapshot and remote draft remained unchanged during an in-memory newer-cost simulation; new calculated goods became £623 while the approved £601 remained unchanged. See the committed readback JSON.

Guided-first without image reached a final shortlist and exact Wilfred Bluebell configuration (£540), then safely blocked checkout for unconfirmed stock. Webtex had expired; no substitute was injected. Guided-first with an optional image reached palette confirmation and a final shortlist, including refinement without mandatory reactions. This latter fresh route was not taken through another Draft Order.

Apex browser submission generated `CUK-C0DEE1C7-FC37-45E4-8492-BF56ECE277AC`, with enquiries@curtainsuk.com instructions, no initial numeric price, no file upload and no checkout bypass. This was explicitly labelled synthetic QA, not a customer order.

Scripted QA reactions are not human recommendation-quality approval. In particular, the current HCI output placed a plain Chenies fabric under Pattern & character with generic wording. That remains an item for human review; ranking/explanations were not silently changed.

## Verification and limits

- Latest storefront suite: 155/155 passing. Full npm test passed earlier in this consolidation; subsequent narrow auth/Bay changes passed their regression/storefront suites. Typecheck and changed-file lint passed. Latest Vercel build is READY.
- npm audit: zero critical/high; one moderate csv-parse advisory remains. The vulnerable columns/group-columns option combination is not used by the existing matrix parser. No forced major CSV change was made.
- Staged secret-pattern scan and whitespace checks passed before implementation commits. This is a heuristic scan, not a claim of a full penetration test.
- Private-state readback: 914 versions, zero matches for raw image/base64 payload markers. Persistence guards additionally reject raw media. This readback is not proof of third-party processor retention terms; those still require approved disclosure.
- Latest image-led consultation has append-only palette correction, strategy reaction, fabric reaction and sample-intent events. No purchase-completed event was fabricated for a draft.
- 390/412 mobile, tablet and desktop spot checks covered guides, HCI/palette, configurator and checkout states. Observed pages had no horizontal overflow; primary controls met the practical touch-target check. The complete six-journey matrix at every viewport and a full keyboard/screen-reader audit are not complete, so overall mobile/desktop/accessibility gates remain BLOCKED.
- Door guides and contextual route were checked; a fresh Patio/French Doors transaction was not completed in this pass.
- Some full-page screenshots contain capture stitching repetition; these are screenshot artifacts, not proof of duplicated DOM. The separate mobile viewport screenshot avoids stitching. Do not use the stitched captures as pixel-perfect acceptance evidence.

## Hosted timings

Five repeated hosted benchmark cases, milliseconds. Captured during this consolidation before the final dependency/auth patches; not a post-final-deployment performance certification. The benchmark excludes browser rendering and Shopify handoff.

| Operation | p50 | p95 |
|---|---:|---:|
| Session start | 966 | 9785 |
| Image analysis | 2424 | 3552 |
| Palette | 972 | 1365 |
| Answers | 991 | 2129 |
| Visual calibration | 1132 | 1517 |
| Strategies | 2295 | 2491 |
| Refinement | 2778 | 3361 |
| Detail hydration | 752 | 1053 |
| Outcome | 1407 | 1522 |

All five selection digests matched `5e20eca33b4f4b8a3eaf38cd8271099b6f708013c9312b098abb414af765f4e1`. The slow session start is a cold candidate, not a controlled forced cold-start measurement. No warm-ranking optimization was attempted.

## Minimum remaining publication actions

1. Resolve intermittent hosted auth/rate-limit service failures and complete the remaining browser/keyboard matrix on the final deployment. The observed boundaries were the endpoint-rate-limit RPC and staff auth, before pricing/HCI execution. Retry recovered the same state; root transport/provider causes remain unproven. A later Apex prepare attempt also required retry. Do not weaken fail-closed checks to conceal this.
2. Authorize a named supplier-admin operator and complete the genuine morning import/approval/refresh rehearsal. The available staging identity is a reviewer, not supplier admin. Reauthenticate Webtex for the naturally selected Wilfred stock check. Keep unconfirmed fabrics unavailable for checkout. No need to precheck the full catalogue.
3. Approve the CurtainsUK legal trader/address, returns/cancellation and delivery commitments, processors and derived-event retention. The shared Shopify policies still contain Drapesey/Creative Curtains wording and unfinished privacy placeholders. Use `CURTAINSUK_LAUNCH_POLICY_APPROVAL.md`; shared policies were left untouched to protect live Minimal.
4. Complete human HCI recommendation/UX approval, including the flagged explanation quality, before customer HCI activation. Scripted rehearsal cannot supply this approval.
5. At an explicitly approved coordinated publication, make the ten guide pages visible and publish Dawn. They are currently Hidden to avoid altering the live store; unpublished Dawn renders them through its staging-only fallback, but the hidden page URLs still have HTTP 404 status. Recheck HTTP 200 and navigation after activation. Separately approve and validate the live payment/store transition; this run proves development Draft Orders only.

No additional architecture phase is proposed. These are bounded operational, content-approval and final verification gates.
