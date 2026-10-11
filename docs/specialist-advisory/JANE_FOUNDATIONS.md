# Jane foundations review, 11 October 2026

This is the current detailed readiness record, superseding the environment proposals in [JANE_COMPLETION.md](JANE_COMPLETION.md) and [JANE_READINESS.md](JANE_READINESS.md). Historical receipts remain unchanged. The only permitted hosted destination is existing Supabase project `hqysjumypgeapgmqkcrx`. No new project or branch is proposed.

Work began at PR #169 commit `0f07dfab163406f065351cbfa9be090e16c063c2`, branch `feat/jane-consultation-phase2-20261009`. Protected HEAD was read as `3649c879a4a5ddf88c2093a4172d20fbc58cd265`; independent PR #167 remains `851078c674ac2e9231e51dffbd5949ed4ea7c6d1`. Issue #168 and the production/Room Visualiser records were reconciled before development.

## Decision and review surfaces

Recommend review of this **local foundations milestone**, not public Jane activation. [Working local review](http://127.0.0.1:8789/foundations), [scripted consultation](http://127.0.0.1:8789/), [draft PR #169](https://github.com/Nylon1/CurtainsUK/pull/169), [evidence and changed files](../../artifacts/jane-foundations-20261011/IMPLEMENTATION.md).

Run `node scripts/jane-preview.mjs` if the loopback preview stops. The interactive consultation uses a deterministic mock, not OpenAI. The historical real-response gallery remains available at `/evaluation`. The new review contains blind comparisons and blank human scorecards. No secrets or real customer data are needed.

| Capability | Implemented and locally tested | Hosted status |
| --- | --- | --- |
| Jane profile `2.2.0-preview.1` | Approved concise design-first direction retained; ordinary replies target 40–90 words, no em dashes | Revised profile not yet evaluated with OpenAI |
| Fabric descriptive retrieval | Existing bounded, parameterised full-text index, safe rehydration and eligibility separation retained | Full population not approved or executed |
| Incremental worker | Shared pacing, fenced leases, strict upstream reads, atomic checkpoints, field coverage and reversible six-row batches | No production job, index write or benchmark |
| Encrypted consultations | Existing AES-GCM cipher; scoped pooled runtime; owner RLS, recovery, revision fencing, durable accounting | Existing-project migration and protected environment not approved |
| Auth revocation | Server-only fixed query and restricted column grant; synthetic active/foreign/expired/deleted sessions tested | Actual Auth schema/grants and login flow need verification |
| Retention | Separate role; bounded all-owner expiration cleanup and expiry indexes | No scheduler installed, backup erasure procedure needs approval |
| Multi-instance behaviour | Separate local Node processes plus restarted process share PostgreSQL locks, rates and encrypted persistence | No hosted multi-instance test |
| Results handoff | Existing consented, bounded, five-minute context contracts; new suite exercises context/save/recovery commands | Customer tools unchanged; integrations inactive |

## Exact knowledge coverage

Five historical Fabric Master records, captured on 9 October, were reindexed locally. This increment made **zero production index writes**. An attempted Supabase connector metadata read failed; no exact current full-Master denominator was obtained. Do not use the historical catalogue estimate as an exact total or calculate a coverage percentage from it.

Exact IDs: `pt-3697-502`, `pt-3697-569`, `pt-3697-575`, `pt-3697-770`, `sdg-f1541-01`.

| Available field | Present among these five records |
| --- | ---: |
| Colour, tone, pattern, pattern scale, texture | 5 each |
| Governed description | 0 |
| Composition | 4 |
| Width | 5 |
| Weight | 1 |
| Technical applications/care/pattern-match information | 4 |

Absence remains unknown, never inferred. Four Shambala identities match the local composition query; all knowledge records are explicitly non-purchasable. Existing retail filtering remains the authority for customer product cards and excludes the ineligible Shambala identity. The completed `browseGuide=1` correction remains unchanged.

The separate **120-record synthetic fixture** tests traversal, failures, duplicate rejection, checkpoints, search and rollback. Its [performance receipt](../../artifacts/jane-foundations-20261011/index-performance.json) measures only local PGlite. The forced GIN plan demonstrates index eligibility, not that a hosted planner will choose it or that production I/O is acceptable. Source query plans, exact population, field coverage, realistic latency and database I/O are pending approved hosted verification.

The derived store contains exact IDs, search lexemes, hashes, timestamps and rollback receipts. It does not become catalogue authority. The allowlist excludes costs and margins. Descriptions require validation and visual classifications require governed status. Safe search uses fixed bounded parameters, at most six identities and no full-scan fallback. This is lexical indexing; semantic embeddings are not claimed.

## Indexing safeguards now implemented

`index-worker.mjs` performs source reads **outside** database transactions. One shared gate covers all jobs and application instances. Batches contain at most six identities, with a minimum five-second interval after commit, a 30-second fenced lease, a 12-second overall source deadline, 4.5-second individual catalogue deadlines, and 3-second SQL/500-ms lock timeouts. Strict indexing requires all three source requests to succeed and bypasses weaker customer lookup caches. Partial upstream failures cannot erase indexed facts.

One reviewed population invocation permits at most 20 batches or 120 identities. An expiring operator approval must match the existing project, advisory schema, migration bundle hash, job ID, source manifest/version, exact count and source-attestation reference. It is trusted server configuration, never a browser field. The helper does not discover credentials, create jobs, connect to production or schedule itself.

Failed batches leave the checkpoint unchanged and record only a redacted error code. Shared backoff starts at 30 seconds and rises to five minutes. No automatic retries run after a failure. Duplicate identities cannot inflate counts. Completion requires EOF, an exact approved denominator and successful source attestation. Unknown-denominator EOF is exhausted and partial. Coverage reports distinguish observed versus retained records after rollback and describe coverage of the recorded manifest, not an immutable guarantee about the changing Master.

Rollback restores at most six prior rows per call, including their original vectors and timestamps. It refuses to overwrite later jobs or changed hashes; later jobs must be rolled back first. It never deletes or edits Master records. The [existing-project runbook](EXISTING_PROJECT_RUNBOOK.md) covers source inventory, capacity, approval, pacing, resumability, reconciliation and rollback.

## Secure existing-project storage preparation

The six ordered `.review.sql` files are a **review bundle**, not an applied or CLI-generated production migration. Their [hash manifest](../../artifacts/jane-foundations-20261011/migration-review-manifest.json) is bound into hosted-test and population admission. Earlier grants in the historical schema/runtime files are revoked by the final advisory operations file; the bundle must be reviewed/applied atomically, not partially activated.

Runtime, indexing and retention use separate NOLOGIN/NOINHERIT roles. Browser roles and `service_role` lose privileges on the new advisory objects only. No existing application grants change. A fixed server-only pooled adapter rejects an unexpected role, sets verified ownership transaction-locally, imposes query/lock deadlines and invokes only the allowlisted runtime function. Tests verify pooled connections do not retain a prior owner, foreign records remain inaccessible, browser access fails, and runtime cannot mutate the knowledge index.

The Auth verifier is a separate role with SELECT on only `auth.sessions.id`, `user_id` and `not_after`. This explicit read-grant proposal requires separate review of the current Auth schema and permissible privileges. It does not create customers or change Auth policies. Signature/issuer/subject checks still precede it. Invalid, foreign, expired, deleted or unverifiable sessions fail closed; no revocation result is cached.

Existing ownership, encryption, consent, one-use same-account recovery, idempotency, revision compare-and-swap, five-minute consultation leases, shared limits and spending reservations are preserved. Limits are 12 operations/minute, 300/day and 20 active consultations/owner. Approved evaluation ceilings remain US$5/run and US$1/session; retries reserve again and unknown usage conservatively retains the reservation. No evaluation run was enabled.

Retention now has a separate fixed function, deleting at most 20 expired rows per table per invocation. Expired consultations and leases, rate windows older than two days, and 90-day spend receipts for expired runs are eligible. Removing receipt ownership never reduces aggregate charged spend. Saved conversations retain the existing 90-day inactivity window. No scheduler is installed. Encryption key rotation is supported by key IDs and a server-only keyring; key custody, backup expiry and deletion recovery need operational review before personal data.

The protected mock composition is limited to the existing project, a reviewed migration hash, an expiring approval and 1–10 synthetic Auth accounts. No public route was wired or deployed. Local mocks do not certify hosted Supabase authentication, pooler behaviour, Vercel protection or production recovery.

## Intelligence review and next evaluation

Jane's approved profile was not redesigned. Earlier 36 real turns average 96 words, peak at 125, with 25 exceeding 90 words, 21 containing em dashes and two exposing internal reaction wording. Earlier retrieval-memory corrections remain in place. The original conversations and paid receipts are unmodified.

The engineering review found useful tonal-versus-contrast alternatives, texture refinement beside patterned furnishings, and accurate guidance that heading comparisons are separate from Room Visualiser 2. The new profile aims to shorten answers, avoid internal tokens and ask fewer repeated questions. Whether it succeeds with real customers remains unproven by the mock.

Suite `jane-foundations-v3` now contains 20 scenarios, 60 advice turns and three actual consented context/save/recovery actions. It covers contradictory and changing preferences, rejected recommendations, dark rooms, pattern scale, tool guidance, invalid/unavailable products, unsafe evidence, failed lookups and returning sessions. All mock operations completed without service errors. Scripted advice remains limited: a browser scenario excluding green still received an olive suggestion. This is retained as a mock limitation, not treated as intelligent consultation success or fixed with scenario-specific responses.

Twelve blind historical real-versus-mock pairs and 24 blank scorecards are prepared. A named human reviewer scores all eight dimensions 0–4, supplies reasons and records critical failures. Pass requires at least 3 in every dimension with no critical failure. Missing scores remain pending; a disagreement requires a second reviewer. Synthetic scorecard tests do not fill actual scores. Follow the [official evaluation guidance](https://developers.openai.com/api/docs/guides/evaluation-best-practices); keyword or length checks alone cannot judge interior-design quality.

No revised-profile OpenAI evaluation ran. The previous approval cannot authorise this new suite. A future small proposal is US$5 total/US$1 per consultation with invented inputs, a fresh expiring approval and a rotated test credential. This proposal is **not approved**. Screenshot vision remains unavailable and must be represented honestly.

## Browser, team release and accessibility

Actual Chrome checks on 11 October covered Jane, the team preview and review gallery at 320, 390, 412, 768 and 1440 CSS pixels, without overflow. All six adviser spotlights were exercised. Welcome rooms opened automatically. Modal keyboard focus, Tab and Escape restoration were observed.

Actual reduced-motion behaviour was verified with Windows animation effects temporarily off: Chrome reported `prefers-reduced-motion: reduce`, portrait transitions were zero and scrolling was automatic. The original Windows setting was restored; normal Jane portrait transition returned to 0.8 seconds. This closes the previous enabled-reduced-motion gap for this browser only.

Physical iPhone Safari and physical touch remain unavailable. Accessibility-tree names/status were inspected, but a spoken screen-reader run remains pending. Tool-controlled tab changes left `document.visibilityState` visible, so actual hidden-tab timing is still pending; deterministic elapsed-clock tests remain separate evidence.

PR #167 remains the independent, unpublished 20-file candidate. Approved portraits, layout, navigation and previews are unchanged. The 9 October live-file comparison is preserved; **all 20 live files were not freshly re-read on 11 October**. Repeat that comparison immediately before any approved release. The exact scoped publication/rollback procedure remains [RELEASE.md](RELEASE.md); never publish the whole development theme. This milestone makes no new full commerce or physical-device certification.

## Capacity, credentials, costs and activation gates

Read-only dashboard inspection on 11 October found the existing CurtainsUK project on the Free plan, with an **EXCEEDING USAGE LIMITS** banner. The usage page reports database size **0.708/0.5 GB, 142%**, and per-project current size **674.76 MB**. Egress was 0.04/5 GB. These dashboard figures use different display units; they are preserved as shown. Capacity must be resolved before any advisory migration/indexing. No upgrade, cleanup or database write is authorised or performed.

The owner confirms the old chat-shared OpenAI key **still needs revocation**. Revocation is not verified. It is absent from this process/private evaluation env and was not used. Revoke it through the OpenAI project before supplying any replacement outside chat and Git. Real customer personal data remains prohibited until hosted security/privacy review.

This increment cost **US$0 in model calls** and created no paid infrastructure. Earlier ledger total remains **US$0.132574**. Official [model rates](https://developers.openai.com/api/docs/models/gpt-6.1-sol), checked 11 October, are US$2/M input, US$0.10/M cached-read, US$2.50/M cache-write, US$10/M output for standard service. Examples without cache: 40k input + 4k output = US$0.12; 100k + 10k = US$0.30. Conversation duration does not fix tokens; tool rounds, history and retries affect cost. No future plan price or unlimited capacity is assumed.

C: began at 40.43 GiB free. Restic PID 26724 was initially present and later absent; absence does not verify successful backup. No backup scripts, evidence, historical worktrees or dependencies were removed or replaced. No large installation/build was used. A subsequent verified backup must include this work.

Next approvals are distinct: resolve capacity; review the existing-project migration/role/key-custody and privacy plan; authorise a bounded synthetic hosted test; approve exact source inventory/index population; then approve revised real-model evaluation and human scoring. None authorises public release. Both protected checks and exact protected HEAD still govern any later production release.
