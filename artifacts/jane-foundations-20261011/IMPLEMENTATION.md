# Jane foundations implementation evidence

11 October 2026. Starting commit `0f07dfab163406f065351cbfa9be090e16c063c2`; branch `feat/jane-consultation-phase2-20261009`, [draft PR #169](https://github.com/Nylon1/CurtainsUK/pull/169). The PR commit records this increment. Protected HEAD and independent PR #167 were re-read unchanged before finalisation.

Read the [readiness report](../../docs/specialist-advisory/JANE_FOUNDATIONS.md), [existing-project migration/indexing runbook](../../docs/specialist-advisory/EXISTING_PROJECT_RUNBOOK.md) and [programme source of truth](../../docs/CURTAINSUK_SPECIALIST_AI_ADVISORY_PLATFORM.md).

## Working review

- [Local foundations gallery](http://127.0.0.1:8789/foundations), [scripted Jane consultation](http://127.0.0.1:8789/), [historical real-model conversations](http://127.0.0.1:8789/evaluation).
- [Unpublished team preview](https://www.curtainsuk.com/pages/fabric-library?view=meet-our-team&preview_theme_id=182472573307). No Shopify file was changed in this increment.
- [Review desktop](review-1440.jpg), [review mobile](review-390.jpg), [Jane desktop](jane-1440.jpg), [Jane mobile](jane-390.jpg). Filenames indicate measured CSS viewport widths; browser JPEG captures omit the scrollbar gutter. `review-desktop.jpg` is an intermediate default-window capture retained as evidence.

## Results

| Evidence | Result |
| --- | --- |
| [Scoped tests](tests.json) | 84 pass: 46 Jane/security/index/storage, 20 team, 18 existing theme |
| Scoped ESLint | Exit 0; no findings. No full build or install |
| [Multiple application instances](multi-instance.json) | Two simultaneous Node instances plus a restarted third, scoped database role, encrypted shared storage; local PGlite only |
| [Coverage](coverage.json) | Five historical Master identities, field presence measured; current exact denominator unknown; zero production population |
| [Synthetic index performance](index-performance.json) | 120 rows, six per batch, 20 successful batches, median local search 3.4734 ms, index 262144 bytes; not a production benchmark |
| [Migration bundle](migration-review-manifest.json) | Six ordered review files, UTF-8/LF hashes, no migration generated/applied |
| [Mock evaluation](mock-evaluation.json) | 20 scenarios, 60 advice turns + three context/save/recover actions; zero service errors, no paid calls |
| [Historical transcript review](transcript-review.json) | 36 real turns; revised profile not evaluated with real model |
| [Human scorecards](human-scorecards.json) | 24 unfilled cards, eight dimensions; no invented scores |
| [Blind comparisons](blind-pairs.json) | 12 historical pairs; inspect [provider reveal](provider-reveal.json) only after scoring |
| [Browser checks](browser.json) | Five widths, six profiles, auto-opening/keyboard checks and actual reduced motion; limitations explicit |
| [Existing project capacity](supabase-capacity.json) | Free database size 142% of allowance; migration/indexing capacity review required |

Reproduce local checks with `node scripts/verify-jane-completion.mjs`. It runs PostgreSQL tests serially using existing dependencies and constrained WASM compilation. Mock evaluation is `node scripts/jane-evaluate.mjs mock`, with new evidence isolated from earlier evaluation directories. Paid mode requires fresh approval for v3 and a rotated server-side key. Do not run it under the previous approval.

No production migration, index write, deploy, merge, theme publication, public AI activation, real customer processing, service purchase or new paid OpenAI call occurred. Historical paid receipts remain unchanged at US$0.132574. The owner confirms the exposed old key still needs revocation. No key is stored in this pack.

C: began at 40.43 GiB and ended at 40.42 GiB free. Restic was initially present, later absent; backup completion and coverage remain unverified. All worktrees/backups/evidence were preserved. This work requires a later verified backup.

Physical iPhone/touch, spoken screen-reader and actual hidden-tab timing remain pending. The previous 20-file live-theme read-back must be refreshed before an approved page release. Source regression tests do not certify transactional checkout or hosted infrastructure.

**Recommendation:** accept the local milestone for review; keep Jane inactive. Resolve project capacity, review the exact migration/roles/privacy plan and obtain separate approval for synthetic hosted tests and bounded index population. Revised real-model evaluation then needs a new budget, retired old key and human scoring. PR #167 remains separately publishable only through its scoped procedure and explicit approval.

## Exact files changed in this increment

The complete list, including test logs and per-scenario evidence, is in [CHANGED_FILES.txt](CHANGED_FILES.txt). It is relative to the starting commit above and includes itself.
