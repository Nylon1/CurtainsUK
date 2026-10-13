# Jane completion increment and Meet Our Team release readiness

9 October 2026. Current implementation record for Issue #168. This supplements [JANE_READINESS.md](JANE_READINESS.md); earlier paid transcripts, receipts and reports remain unchanged.

## Source and release separation

Work began at Jane `fefa6029287dcacb4ac924a50767e27351f2ac7c`, on `feat/jane-consultation-phase2-20261009`, draft [PR #169](https://github.com/Nylon1/CurtainsUK/pull/169). Protected HEAD remains `3649c879a4a5ddf88c2093a4172d20fbc58cd265`. [PR #167](https://github.com/Nylon1/CurtainsUK/pull/167) remains independently reviewable at `851078c674ac2e9231e51dffbd5949ed4ea7c6d1`, with both required checks successful. Its source and approved design were not edited in this increment.

Shopify MAIN remains `182339731835`; DEVELOPMENT preview is `182472573307`. Hidden page `693751873915` retains handle/template `meet-our-team`, `isPublished:false`. Fresh read-back verifies all **20 candidate files** against the manifest and preview, and all **505 live theme checksums** against the previous read-back. There is no unrelated live drift. The two shared live target bodies also match. [Readiness receipt](../../artifacts/jane-completion/team-release-readiness.json).

The scoped candidate consists of 18 additions and two scoped merges into the live locale/header. [The exact manifest](../../artifacts/specialist-advisory-release/release-manifest.json) and [release/rollback instructions](RELEASE.md) remain authoritative. Re-read MAIN and current target bytes immediately before any separately approved release. Never publish the development theme. The guarded navigation switches to `/pages/meet-our-team` only after the hidden page is published.

Vercel project `prj_vl2GLLlSf0AJAKqjs1Nk26ipKHBA` still reports READY deployment `dpl_CvvQKa2zCsFbQ7eZR9Lzi31w7BCD`. Supabase inventory contains only the existing production project/main branch. No hosted test project, branch, migration or deployment was created. Git source, Vercel runtime and Shopify state remain separate authorities.

## What is implemented and demonstrated

| Component | Current evidence | Activation limit |
| --- | --- | --- |
| Jane profile `2.2.0-preview.1` | Short customer-facing language and evaluation contracts implemented | Revised profile has not had paid real-model evaluation |
| Cloud record encryption | AES-256-GCM, authenticated row header, rotating key IDs; tamper/no-plaintext tests | Protected hosted key management and recovery rehearsal pending |
| Persistence, locks and limits | Local PostgreSQL plus separate Node application processes; restart/recovery, ownership, replay, contention, shared rates, expiry/purge | Hosted Auth, revocation, networking, grants and concurrency still untested |
| Descriptive indexing | Resumable six-record jobs, atomic checkpoints, unique identity receipts, source hashes, bounded OR/phrase search | Full permitted Master index is not populated or certified |
| Real-data read/search | Five exact live identities indexed and searched locally; three approved retail results | Five records are a sample, not a coverage percentage |
| Result handoff | Signed five-minute owner/session-bound contract and consent/control tests | Existing FI/Visualiser integrations remain inactive |
| Evaluation | 16 scenarios, 48 mock turns, zero service errors; structured human rubric | Mock success does not establish intelligent consultation quality |
| Meet Our Team | Approved design intact, 20-file read-back, responsive/interaction checks | Separate release approval and unresolved device checks |

Working local surfaces, started with `node scripts/jane-preview.mjs`:

- [Jane consultation](http://127.0.0.1:8789/): scripted mock, real approved retail cards, no OpenAI key loading.
- [Completion review](http://127.0.0.1:8789/readiness): current status, transcript review, 16 scripted scenarios and human-review examples.
- [Preserved real-model comparison](http://127.0.0.1:8789/evaluation): prior approved evaluation, unchanged.
- [Approved Shopify preview](https://www.curtainsuk.com/pages/fabric-library?view=meet-our-team&preview_theme_id=182472573307): six Coming Soon AI advisers and non-operational consultation rooms.

The local preview requires the process to remain running. The Shopify development preview can expire with inactivity/logout; the permanent page is deliberately hidden.

## Fabric knowledge and measured coverage

The existing `browseGuide=1` correction is retained, without reopening or changing the live catalogue. A fresh read-only retail request again yields exactly three customer-safe Shambala cards, excluding `pt-3697-575`. Canonical prices, stock and checkout remain authoritative and untouched.

The safe knowledge projection now includes physical weight, care, widths/repeats, applications, governed descriptions, pattern scale, tonal lightness/saturation/contrast, character, directionality and visual weight where actually recorded. Missing facts remain null. Visual weight is never treated as physical weight; repeats do not establish pattern scale or certified performance. Supplier costs are not selected or indexed.

The operator-only identity cursor uses the existing `fabric_id` index with six-row keyset pages, no OFFSET or timestamp sort. There is no suitable observed updated-at index, so no timestamp scan was introduced. Search uses parameterised `websearch_to_tsquery`, supporting OR synonyms and quoted phrases. The model is instructed to distinguish fixed olive furniture from a requested curtain colour. This is lexical retrieval with model query interpretation, not a semantic/vector index or a new Fabric Intelligence engine.

`index-worker.mjs` performs one approved job batch per invocation. The job row is locked; identity receipts, derived terms and cursor commit together. Missing source records, duplicate pages or source failure roll back the entire batch. Unchanged hashes cause no index rewrite. Completion requires EOF, a known exact approved denominator, unique processed identities and a matching source-snapshot attestation. Exhaustion or an estimated table size alone cannot set complete. A separately approved source manifest/change feed and scheduler are still required; the repository does not invent that attestation or automatically traverse production.

Evidence:

- [Five real identities](../../artifacts/jane-completion/bounded-master-source.json) were read through existing indexed joins. [Local verification](../../artifacts/jane-completion/bounded-index-verification.json) searched actual pattern/composition, colour alternatives and width terms. A second identical batch wrote zero rows. Four of five records lacked physical weight, which remained unknown.
- [Live metadata and five-ID plan](../../artifacts/jane-completion/source-index-metadata.json) records estimates and read I/O. Estimated colourways are not an exact permitted denominator. No production index exists and **full coverage is not claimed**.
- [Synthetic performance fixture](../../artifacts/jane-completion/index-performance.json): 120 records, 20 batches, maximum six source identities, about 648 ms for the remaining 19 batches, 2.50 ms median local search, 256 KiB index/table storage. EXPLAIN with sequential scans disabled demonstrates GIN capability; it is not a production-scale performance benchmark. The five-real-record local queries took approximately 1.9–7.7 ms.

## Hosted infrastructure and privacy boundaries

`session-cipher.mjs` encrypts the full saved state, including messages, context, consent events, recovery hash and summaries. Only the operational header remains clear. AES-GCM authenticates owner, session ID, revision, expiry, start request and key version. Each write uses a fresh nonce. Up to four server-held keys permit rotation; no plaintext fallback is accepted. Keys must be stored outside the database and browser. The hosted mock scaffold currently expects one dedicated test key; production key lifecycle is not claimed.

`hosted-test.mjs` explicitly denies the production project and production Vercel environment, requires an approved isolated reference and HTTPS origin, checks client references and composes a mock-only protected handler. It performs no provisioning and discovers no credentials. Real signed Auth verification/revocation and private RPC wiring must be demonstrated in that environment. Client-reference declarations are deployment configuration checks, not a substitute for credential scoping or network review.

Local tests exercised two simultaneously running Node processes sharing one private PostgreSQL runtime, then a third process after restart. They proved encrypted storage, lease contention, idempotent replay, foreign-owner denial, same-owner single-use recovery, shared rate limits and expiry/purge. Existing tests cover stale-worker fencing, revision conflicts, consent, RLS/grants, daily/session quotas and durable concurrent spending reservations. Auth is stubbed in these tests; they are explicitly **not hosted security certification**.

Saved retention is 90 days from activity. Expiry checks and bounded owner cleanup are implemented. An all-owner retention schedule, backup-aware deletion process, privacy notice/legal review, authenticated account UI and real customer rollout remain pending. No real customer personal data was processed in this increment. SQL stays in `.review.sql` files. Use the reviewed Supabase CLI migration process in an approved isolated project first, then obtain separate production migration approval.

## Context handoff

`createContextHandoff` signs a strict versioned context containing only permitted design selections and explicit consent. It binds audience, verified owner, consultation, request ID and five-minute expiry. A wrong owner/session, altered ticket or expired ticket fails. The existing durable request receipt provides idempotency. Room Visualiser heading is rejected because that control does not exist; non-visualiser contexts cannot assert its lighting or curtain-position controls.

Tickets are signed, not encrypted. Carry them only in authenticated HTTPS POST bodies; never URLs, analytics, logs or public links. Sender and receiver must verify the account and display the fields for consent. A signed ticket proves the handoff contract, not product availability or trusted technical evidence. No FI/Visualiser source, button, renderer or decision logic was modified. Screenshot processing is still unavailable and honestly labelled.

## Conversation review and new evaluation readiness

Review of the preserved 36 real turns found a mean of **96 words**, maximum **125**, **25** over 90 words, **21** using em dashes and **two** exposing internal feedback tokens. [Measured transcript review](../../artifacts/jane-completion/transcript-review.json). Earlier transcripts remain verbatim. Their useful strengths included conditional palette reasoning, changing course after feedback, explaining unavailable stock/colour guarantees, and accurately separating heading comparison from Room Visualiser controls. The earlier false search-history retraction was already fixed and retested; retrieval receipts remain intact.

Jane now targets ordinary replies of **40–90 words**, usually one or two paragraphs with at most one useful question. Requested summaries may be longer, usually at most 150 words. She must not use em dashes, repeat known questions, defend rejected advice, expose source enums or force fabrics into every consultation. Output hygiene translates known feedback codes and removes em dashes across visible advice fields without changing evidence identities. It does not truncate safety information or pretend to establish factual correctness.

The suite now covers coordination/contrast, pattern comparison, small/dark rooms, rejected advice, changed/conflicting preferences, first-time tool guidance, returning results, unavailable fabrics, failures and needs outside the product range. The human rubric requires every dimension >=3/4 and no critical factual/privacy/eligibility failure, with explicit pass/fail examples. All human scores remain pending. Scripted replies remain a deterministic baseline and may be repetitive; their success is not evidence that the new model profile meets the quality rubric.

The paid runner now requires a fresh approval bound to this profile and `jane-completion-v2`. The old approval cannot authorise the new run. **No paid calls were made.** The prior estimate US$0.132543 and conservative ledger US$0.132574 are preserved. There is no OpenAI key in the current process or the checked private evaluation environment file. Retirement of the key previously shared in chat cannot be established from those checks; owner/project confirmation remains pending, and that exposed key must not be reused.

For planning only, the earlier observed run averaged about US$0.00368 per turn. Ten similarly sized turns would be about US$0.037 in model usage; 1,000 such consultations would be about US$37 before infrastructure, retries and different retrieval/context usage. These are extrapolations, not a quoted bill or spending approval. Retain hard per-attempt reservations and US$1/consultation, US$5/run limits for a separately approved small evaluation. No additional hosted services were purchased; an isolated environment and its charges require approval before creation.

## Validation and release recommendation

`node scripts/verify-jane-completion.mjs` passes **78 tests**: 40 Jane/security/index/storage tests, 20 existing Phase 1 tests and 18 existing theme tests. Scoped ESLint passes. The runner isolates PostgreSQL checks serially to fit available memory. An initial memory-allocation failure is retained in `cloud-tests.log`; all five cloud checks then passed in separate constrained-Wasm processes. [Current results](../../artifacts/jane-completion/tests.json).

Chrome: 320/390/412/768/1440 actual CSS widths have no overflow on both pages. All six spotlight selections, mobile menu/link, Jane's concise mock tool reply, automatic entry and Escape/focus restoration were observed. Team automatic opening was observed by 53.820 seconds, not asserted as an exact measured 30-second transition. Deterministic elapsed/background restoration tests pass. Physical iPhone Safari/touch, an actual screen reader, enabled browser/OS reduced motion and confirmed hidden-tab behavior remain pending. The observed browser reduced-motion preference was false and page visibility visible. [Browser receipt](../../artifacts/jane-completion/browser.json), [screenshots and implementation evidence](../../artifacts/jane-completion/IMPLEMENTATION.md).

Read-only HTTP smoke checks returned 200 for homepage, Fabric Library, FI, Room Visualiser, House of Curtains, measuring and cart. This verifies rendering, not a completed checkout/payment. Existing protected source and production theme/runtime were unchanged.

**Meet Our Team:** scoped publication candidate is prepared for owner release review; do not infer approval or close the outstanding device checks. **Jane:** keep public activation closed. Next approve an isolated test environment, rehearse migrations/Auth/key management/retention with invented data, authorise a bounded source snapshot and coverage job, then approve a fresh small real-model budget and complete human/device review. Separate exact protected HEAD approval and both required release checks remain mandatory. PR #169 stays stacked; publishing PR #167 must not pull in Jane accidentally.

C: began at 36.33 GiB free and measured 36.02 GiB later. Restic PID 45016 was present initially and no longer listed later. That does not prove a successful backup. No scripts, manifests, backup stores, historical worktrees or evidence were deleted/altered. No installation, full build or bulk ingestion was run. This increment requires a subsequent verified backup.
