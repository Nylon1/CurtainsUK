# Jane completion: owner review evidence

9 October 2026. Development only. Nothing published, merged, migrated to production or activated publicly.

- [Full readiness, architecture, contracts, costs and next steps](../../docs/specialist-advisory/JANE_COMPLETION.md)
- [Updated working consultation](http://127.0.0.1:8789/) and [readiness gallery](http://127.0.0.1:8789/readiness)
- [Approved team preview](https://www.curtainsuk.com/pages/fabric-library?view=meet-our-team&preview_theme_id=182472573307)
- [Draft Jane PR #169](https://github.com/Nylon1/CurtainsUK/pull/169) and [independent team PR #167](https://github.com/Nylon1/CurtainsUK/pull/167)
- [Exact increment changed files](changed-files.txt) and [complete Jane PR scope](pr-changed-files.txt)

Starting Jane commit: `fefa6029287dcacb4ac924a50767e27351f2ac7c`. Protected source: `3649c879a4a5ddf88c2093a4172d20fbc58cd265`. Team candidate: `851078c674ac2e9231e51dffbd5949ed4ea7c6d1`. The Git commit containing this report supplies the resulting revision; no self-referential commit hash is invented.

## Verification receipts

| Evidence | Result |
| --- | --- |
| [Scoped tests](tests.json) | 78 passing: 40 Jane/security/index/storage, 20 team interactions, 18 existing theme tests |
| [Local multi-instance](multi-instance.json) | Two simultaneous Node processes, third after restart; shared PostgreSQL runtime; not hosted |
| [Bounded real-data index](bounded-index-verification.json) | Five exact identities, repeat batch writes zero; three approved retail cards; partial coverage |
| [Live metadata/read I/O](source-index-metadata.json) | Estimates and five-ID query plan only; no full scan or write |
| [Synthetic index performance](index-performance.json) | 120 records, 20 batches, max six reads/batch, 2.50 ms median search; local fixture only |
| [Theme publication candidate](team-release-readiness.json) | 20 files match preview/source; all 505 live checksums unchanged; permanent page hidden |
| [Browser checks](browser.json) | Five widths, all six profiles, mobile navigation, auto-entry, Escape/focus return |
| [Storefront HTTP smoke](storefront-smoke.json) | Seven existing routes render HTTP 200; no transaction/order/payment performed |
| [Transcript review](transcript-review.json) | 36 historical real turns reviewed; new profile awaits fresh approved real evaluation |
| [Mock suite](mock-evaluation.json) | 16 scenarios, 48 turns, zero service errors; zero paid calls |

Scoped ESLint completed with exit 0 and no diagnostics (`lint.log`). `cloud-tests.log` preserves the first memory-allocation failure; authoritative subsequent `cloud-1-checks.log` through `cloud-5-checks.log` all pass. Serial test processes reuse dependencies and avoid a full build. Physical iPhone/touch, actual screen reader, enabled reduced motion and confirmed hidden-tab testing are pending. The team room was observed automatically open by 53.820 seconds; this is not a precision timer benchmark.

## Screenshots

### Jane, desktop

![Jane with concise scripted Fabric Intelligence explanation](jane-1440.jpg)

### Jane, mobile

![Jane mobile consultation](jane-390.jpg)

### Approved team candidate

![Approved Meet Our Team preview](team-1440.jpg)

## Recommendation

Meet Our Team is prepared for an owner decision on the scoped candidate. Its approved appearance remains unchanged, and device limitations remain explicit. Follow the [exact release/rollback sequence](../../docs/specialist-advisory/RELEASE.md); never publish the entire development theme.

Keep Jane inactive. The code is locally tested, while isolated hosted Auth/storage verification, complete permitted Master coverage, real-model evaluation of the revised concise profile, human design review and operational privacy/retention remain prerequisites. No additional model budget has been approved. Prior receipts remain unchanged at US$0.132574; key retirement is unverified and the exposed old key must not be reused.

The machine measured 36.33 GiB free initially and 36.02 GiB later. The earlier restic process is no longer listed, but successful completion/coverage is not established. Existing worktrees, backup scripts/data and historical evidence were preserved. This work requires a later verified backup.
