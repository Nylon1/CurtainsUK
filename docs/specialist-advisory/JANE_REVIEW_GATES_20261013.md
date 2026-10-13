# Jane: post-population review gates, 13 October 2026

Status: **population verified; fixed-snapshot retrieval review can proceed; private mock journey tested; revised real-model and human design review pending.** PR #169 remains draft. No merge, deployment, migration, automatic update activation or paid model call is part of this increment.

Starting draft commit: `af85f498b1c35a821a5aec4645020b0e3049edca`. Protected production remains `6f45e63e30ef85e1fa62a804354cd27d0aa23e87`, containing the separately published PR #183 room link. This increment does not modify any Shopify asset or protected customer runtime.

Owner decision, 13 October: no fabric changes were made during this initial population, according to the owner. The 11,517-ID verified population is the fixed snapshot for this first recommendation review. Complete change-window reconciliation and automatic updates are deferred; neither is a prerequisite for the six read-only searches or initial model/human review. This does not independently certify current-source freshness. New or changed fabrics after this snapshot require a separately reviewed refresh before Jane can represent them as current. Public Jane remains inactive.

The gate table below records the original run and its original **NOT RUN** results; the decision above supersedes its catch-up dependency. The machine-readable artifact also remains a historical record of that run.

## Gate evidence

| Gate | Result and evidence |
| --- | --- |
| Initial eligible population | **PASS:** fresh bounded hosted readback at 01:10:10 UTC reconciled 11,517/11,517 exact identities, 1,920 receipts, zero duplicates/unresolved writes and restored permissions against the completed journal. Five eligible historical no-ops and the one historical identity outside this manifest are preserved. This does not claim coverage of all 16,883 Fabric Master identities. |
| Source-change catch-up | **DEFERRED for future automatic updates:** complete sealed change-window evidence has not been produced. It is not required for this fixed-snapshot review. |
| Six prepared read-only searches | **READY TO RUN, NOT YET RUN:** the original gate blocked all calls; the revised gate uses fresh complete population evidence without change-window reconciliation. Recorded hosted search calls remain zero. |
| Revised 20-scenario consultation suite | **NOT RUN:** fresh paid-evaluation approval and secure replacement key are still required, followed by human scoring. No earlier approval or exposed key is reused. |
| Human room-suitability review | **PENDING:** 20 scenario briefs and 40 blank scorecards are prepared for two named people. No human scores or approval are fabricated. Reviewer nomination is awaiting the owner. |
| Private exact-fabric journey | **PASS within the scripted local preview:** exact `pt-3697-770` / SHAMBALA LAGOON shown, explicit consent required, keyboard sharing succeeds, reload/resume retains fabric and one reply. The Room Visualiser opens the same supported ID and visibly selects SHAMBALA / LAGOON. |
| Responsive / keyboard / accessibility | Actual Chrome widths 320, 390, 412, 768 and 1440 passed without horizontal overflow on both fabric detail and shared consultation. Keyboard entry/consent, labelled dialog, Escape focus restoration and polite conversation-log semantics passed. Spoken screen-reader, physical iPhone, touch-device and actual background-tab checks remain pending. Reduced motion was not retested in this increment; the separate 12 October emulated result is retained. |
| Automatic updates / public launch | **OFF.** Update migration and source coverage are deferred. Quality, privacy, device/accessibility and release reviews remain outstanding for public Jane. The completed one-time population follow-up remains paused. |

[Machine-readable gates](../../artifacts/jane-review-gates-20261013/review-gates.json), [browser evidence](../../artifacts/jane-review-gates-20261013/browser-evidence.json), [gallery and review pack](../../artifacts/jane-review-gates-20261013/README.md).

## Historical answer review, not human approval

The two preserved real-model evaluations contain 36 replies using an earlier profile. Their source hashes are recorded in the [answer audit](../../artifacts/jane-review-gates-20261013/answer-audit.json). They average 96 words, reach 125 words, exceed 90 words in 25 replies, use em dashes in 21 replies and expose internal reaction tokens in two replies. They cannot validate profile `2.2.0-preview.1` or suite `jane-foundations-v3`.

Engineering observations from the actual conversations:

- `warm-contemporary` adapts to north-facing light and the customer's rejection of yellow/gold, then distinguishes tonal mushroom from clay contrast. A human should judge whether the undertones fit the stated cream and oak rather than awarding a pass for colour vocabulary alone.
- `busy-pattern` retains the botanical sofa, offers texture and a restrained stripe, and proposes a controlled visualiser comparison. The reviewer should assess pattern scale and contrast rather than accepting a universal rule that plain fabric is always better.
- `contradiction` replaces ivory with cool blue and explains the conflict between invisible pattern and a bold geometric. Check that the final prioritisation belongs to the customer.
- `return-context` repeatedly asks for wall/sofa colours without changing how it seeks the missing information. The revised profile needs a multi-turn naturalness check, including whether a question still changes the decision.
- Initial `fabric-search` falsely said searches had run, then corrected itself on the next turn. The retest records a different result, but current evidence-linked tool recollection must be tested afresh. A self-correction does not erase the first failure.
- `tool-teacher` in both historical runs exposes internal reaction labels to customers. Customer-facing wording must be checked against the actual current UI. Its correct distinction between Room Visualiser and the separate heading journey should be retained.
- `unavailable`, `image-colour` and `injection-failure` refuse invented availability, exact colour guarantees and supplier-cost disclosure, then return to useful general advice. Verify these boundaries without repetitive refusals.

The existing scripted baseline also includes a green suggestion after a no-green preference in `consented-results`. It is supplied for comparison, explicitly labelled as a mock limitation. No scenario-specific canned reply was added to conceal it.

## Human review procedure

Open [the review pack](../../artifacts/jane-review-gates-20261013/human-review.html). One interior-design reviewer and one independent reviewer should assess all 20 consultations independently before reconciling disagreements. Record names, dates, exact profile/transcript versions and room-specific reasons in [the scorecards](../../artifacts/jane-review-gates-20261013/human-scorecards.json).

The existing rubric requires every dimension to pass and no critical failure. In particular, reviewers must explain why the advice suits fixed furnishings, room light and desired mood; whether alternatives differ meaningfully; whether compromises are honest; and whether changed preferences replace previous assumptions. Product claims must match returned evidence, and tool instructions must match the live controls. Missing scores, an unresolved disagreement, invented facts or a privacy failure cannot approve launch. No humans have completed this review yet.

The offline generator is `scripts/prepare-jane-human-review.mjs`. It reads preserved evidence, imports no provider/database, escapes transcript HTML and refuses to overwrite existing output files. It does not run or score the revised model.

## Private journey correction and verification

The private fabric-detail harness previously opened its relative Room Visualiser link on localhost, where that route is not served. `roomPreviewDestination` now accepts only the exact verified `/pages/room-visualiser?fabric=<same ID>` and maps it to the fixed CurtainsUK HTTPS origin. Unsupported, external, mismatched and additional-query destinations are rejected. Only the private harness rewrites that anchor and opens it with `noopener noreferrer`. The live PR #183 asset and visualiser are unchanged.

Working entry: [fabric detail](http://127.0.0.1:8794/fabric-detail?fabric=pt-3697-770), then **Ask Jane about this fabric**. This loopback server uses invented customer input and a labelled scripted provider. Retail fabric verification is a bounded exact-ID read, not the blocked descriptive search suite. Sharing remains disabled before consultation creation and until consent. The selected fabric survives browser resume. No real customer information was used.

Actual Chrome measured all requested viewport widths. The in-app browser silently retained 1280 px during its resize attempts, so those captures are preserved as failed viewport attempts and excluded from mobile passes. The welcome opened automatically when observed 37.544 seconds after entry; that is not a precise 30-second transition measurement. The tested dialog restores focus to `handoff-open` on Escape. Console errors observed in the private Chrome journey: zero. Semantic inspection is not spoken assistive-technology testing.

## Tests and next dependencies

The original increment had **19 focused local tests passed, zero failed**, covering handoff identity/consent/ownership/idempotency/recovery, the exact private room destination, incomplete population refusal, paced retrieval contracts, final population verification and existing deterministic consultation checks. The updated post-population review now has **four focused local tests passed**, including fixed-snapshot retrieval without catch-up. The 20 current real-model scenarios were not executed. No full build or dependency installation was required.

Next obtain a fresh completed-population coverage observation and run the six bounded read-only searches against the fixed snapshot; record IDs, facts, latency, empty results and failures for human relevance review. The current code permits this without a source-window reconciliation. The revised real-model suite still needs fresh budget/key and two named human reviewers; complete device/accessibility, privacy and release checks before any public activation. Keep automatic updates off. If future source changes need to be reflected, review the incremental update design, source coverage, backup and bounded catch-up separately before hosted writes. Do not start a second full population.

Proposed later evaluation ceiling remains **US$5 total and US$1 per consultation**, not approved by this report. The 60-turn suite would be about US$0.22 if it matched the historical average cost; this is a rough extrapolation, not a current price quote, and retrieval/history/retries can increase it. Refresh rates and reserve cost before any approved run. This increment used **US$0**, with previous recorded spend **US$0.132574** preserved. The old exposed key must not be reused; retirement and the fresh secure test configuration require verification.

All 35 completed indexer dependencies and the private binding are checked against the approved manifest using its LF-normalised source hashing convention. No indexer, source record, Naila, Fabric Intelligence, Room Visualiser runtime, pricing, stock, checkout or live Shopify file changed. C: free space at preflight was 31.59 GiB; no cleanup or large build occurred. Toshiba completion remains unverified and this new work needs a subsequent verified backup. Rollback for this increment is a draft Git revert only; there is no new hosted state to reverse.
