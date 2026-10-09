# Jane Phase 2 — intelligence readiness and controlled evaluation

9 October 2026. This record supersedes the blockers in [JANE_PHASE2.md](JANE_PHASE2.md), while preserving that report as evidence for its earlier revision. Implementation remains on `feat/jane-consultation-phase2-20261009`, draft [PR #169](https://github.com/Nylon1/CurtainsUK/pull/169), stacked on the independent approved-design [PR #167](https://github.com/Nylon1/CurtainsUK/pull/167). No merge, production migration, publication or live AI activation occurred.

## Verified authority

- Starting Jane commit: `90722cd22a1485611f5464c03e7c98e51a2a39a7`.
- Protected `release/production`: `3649c879a4a5ddf88c2093a4172d20fbc58cd265`.
- PR #167: `851078c674ac2e9231e51dffbd5949ed4ea7c6d1`, open draft, both required checks successful on that head. Unchanged by this work.
- Shopify MAIN: `182339731835`. Development preview: `182472573307`. Permanent page `693751873915`, handle/template `meet-our-team`, remains `isPublished:false`.
- Vercel project `prj_vl2GLLlSf0AJAKqjs1Nk26ipKHBA`: deployment `dpl_CvvQKa2zCsFbQ7eZR9Lzi31w7BCD`, READY. Existing backend and Room Visualiser runtime remain unchanged.
- Supabase branch inventory contained only `main`. No paid branch was created and no production SQL write was made. Metadata and two exact fabric identities were read through the authorised connector.

The required production, Room Visualiser, homepage and release records were reconciled with the current branch and PRs. The historical unpublished-homepage statement remains superseded by owner confirmation of PR #166's publication. [Starting-state evidence](../../artifacts/jane-readiness/starting-state.json).

## Working review surfaces and statuses

Run `node scripts/jane-preview.mjs` using the existing dependencies. It binds only `127.0.0.1:8789`, validates Host/Origin and never loads an OpenAI credential.

| Component | Implemented/tested status | Remaining limit |
| --- | --- | --- |
| [Interactive Jane preview](http://127.0.0.1:8789/) | Scripted conversation, welcome, consented context, summaries, encrypted local save/recovery; real approved retail cards | Not an interactive real-model or cloud customer service |
| [Real-model review gallery](http://127.0.0.1:8789/evaluation) | 30 initial real conversation turns plus six targeted retest turns, compared with 30 scripted turns | Read-only invented scenarios; human design-quality approval pending |
| OpenAI Responses adapter | Real model calls demonstrated; strict tools/results, bounded history and server-recorded retrieval receipts | Paid runner only; production route still returns 404 |
| Cloud persistence runtime | Local PostgreSQL execution tests for ownership, recovery, deletion, locks, rate and spending caps | SQL review artifacts only; hosted Auth/RPC wiring and cloud end-to-end test pending |
| Fabric Master exact-ID/prefix reads | Actual bounded connector reads and existing indexed plans; safe REST adapter tested with fixtures | Credentialed REST end-to-end still pending in an approved environment |
| Descriptive knowledge search | GIN-indexed colour/pattern/texture/composition/approved-description search; incremental batches and private RPC tested locally | Production index is not created/populated; complete-master descriptive coverage not claimed |
| Retail search | Actual HTTP 200 and three approved Shambala identities, rendered with real approved images | No price or stock assertion; product journey remains authority |
| Image uploads and other five live advisers | Not implemented or activated | Separate future work |

Gallery files are also reviewable offline: [HTML](../../artifacts/jane-readiness/review-gallery.html), [evaluation summary](../../artifacts/jane-readiness/openai-evaluation.json), [targeted retest](../../artifacts/jane-readiness/openai-retest-evaluation.json). Screenshots and the exact file list are linked from the [implementation evidence](../../artifacts/jane-readiness/IMPLEMENTATION.md).

## Retail HTTP 400: root cause and correction

The deployed prepared retail RPC has five required arguments. The existing retail repository sends only three when `browseGuide` is absent, while the published fabric browser sends `browseGuide=1` and therefore supplies both nullable guide bounds. The prepared projection is enabled in the recorded production configuration. Metadata inspection confirmed the RPC arities/defaults and source inspection confirmed this selection path.

Jane's old public request omitted `browseGuide=1` and returned HTTP 400. Adding that existing parameter returns HTTP 200 with four Shambala rows. Jane's customer-safe filter accepts three: `pt-3697-502` Amber, `pt-3697-569` Jonquil and `pt-3697-770` Lagoon. The fourth, `pt-3697-575`, is commercially unsuitable for Jane's cards and excluded. The published browse page was observed working after exiting the development preview cookie; Shambala produced four source results there.

This was a test-integration mismatch with the currently deployed endpoint contract, not evidence that ordinary live browsing was broken. Requests from other consumers that omit the parameter may still encounter the existing failure. The focused correction is in **Jane's adapter only**. No production RPC, catalogue data, pricing, supplier refresh, Fabric Intelligence decision or Shopify theme was changed. Guide pricing returned upstream is discarded by the existing allowlist. [Verified catalogue receipt](../../artifacts/jane-readiness/catalogue-verified.json).

## Efficient descriptive knowledge contract

`search_fabric_knowledge` accepts only `{query, colour, pattern, texture, composition}` with bounded strings. It returns at most six identities, rehydrates their facts through the existing exact-ID projection, and labels every record knowledge-only and non-purchasable. The retail tool is the only source of product cards.

`knowledge-search.mjs` creates a derived index of IDs, lexemes, source hashes and timestamps in isolated advisory storage. It does not duplicate the authoritative catalogue, copy images or index costs/margins. Terms are generated only from the customer-safe projection. Governed descriptions require `description_validated=true`; unverified visual data is omitted. Optional missing knowledge is not invented.

The local index and `search.review.sql` use GIN indexes and parameterised full-text predicates. The private `search_knowledge` RPC has fixed arguments, a six-row maximum, an empty search path and a two-second statement timeout. There is no fallback scan/ILIKE query when the index is missing. Separate operator-only refresh batches contain at most six IDs; hashes avoid unchanged writes. No refresh writer is available to the model. Existing reads cache at most 64 batches for 60 seconds.

Live index metadata showed no existing comprehensive all-descriptive index suitable for this contract. The new index is **implemented and locally tested, not populated across production**. A separately approved job must consume existing changed-ID/checkpoint feeds, record coverage, throttle batches and verify stale/deleted entries. It must not launch a full Fabric Master rebuild. Partial coverage is explicit; zero results never prove a fabric does not exist. Semantic/vector retrieval is not claimed by this lexical implementation.

## Cloud persistence and security boundaries

`cloud-handler.mjs` is an unwired protected-test composition root. It requires verified Auth, a private RPC client, CSRF bootstrap and provider budget wiring. The existing deployed route remains fail-closed. No browser receives a database service key, arbitrary SQL, owner selector or unrestricted API tool.

`verifyCloudPrincipal` combines `getUser(token)` and signature-checked `getClaims(token)`, checks subject, issuer, expiry, authenticated role and a non-anonymous user, and requires a matching **active Auth session** through the server-only `sessionActive` hook. Editable user metadata is never authority. Real hosted Auth/session revocation remains an end-to-end environment check, not a result inferred from mocked Auth clients.

`runtime.review.sql`, applied after the earlier `schema.review.sql` in local PostgreSQL tests, adds private runtime operations:

- Consent is required before a cloud record is created. State contains versioned instructions, messages, summaries, customer-authorised context, consent events and server-generated retrieval receipts. Creation request IDs are durable and unique per owner.
- Every read/write is owner-scoped. Cloud recovery requires both the same verified account and a valid one-use recovery token. Local mock recovery remains its separately labelled capability-based preview behaviour.
- Five-minute leases use random tokens and database row locks. Revision compare-and-swap and token fencing reject stale workers even after a replacement lease has been issued. Release failure cannot disguise a successful commit; expiry recovers the lease.
- Fixed shared limits: 12 operations/minute, 300/day and 20 active consultations per owner. Cloud limits are awaited at HTTP ingress.
- Private evaluation runs start disabled. Durable reservations lock the shared run and enforce US$5 maximum per approved run and US$1 per consultation. Every API attempt reserves a conservative ceiling, including retries; unknown usage keeps the full reservation. Known usage refunds only the difference. A new worker cannot reset the cap.
- Deletion is owner-scoped and fenced. Expired sessions are inaccessible; bounded owner cleanup removes expired rows, leases and old rate windows. Saved retention remains 90 days from activity. A reviewed all-owner retention worker, backup-aware erasure and privacy operations are **not deployed**.

RLS remains enabled, but browser `authenticated`/`anon` roles cannot access these runtime tables/functions directly. `SECURITY INVOKER`, an empty search path, fixed commands and server-derived owner checks constrain the private server port. Service credentials remain privileged and require a separately approved least-privilege deployment design. No `SECURITY DEFINER` bypass or dynamic model SQL exists.

SQL files deliberately remain `.review.sql`, outside production migrations. The approved migration sequence is: provision/approve an isolated test database; generate migration files with the repository-approved Supabase CLI workflow; apply reviewed advisory-only SQL there; validate grants, Auth revocation, multiple workers and retention; rehearse rollback; obtain exact-head release/migration approval separately. There was no Supabase CLI installation or production migration in this work.

## Real OpenAI evaluation and observed quality

The owner approved up to **US$5 for this evaluation only**, with US$1 per consultation and invented customer scenarios. A dedicated supplied credential was used only in the evaluation process environment and removed when the process ended. It was not written into Git, artifacts, logs, the preview server or browser. Rotate the chat-shared credential after evaluation.

The runner defaults to mock mode. Paid mode also requires a private, expiring approval manifest, a fixed run ID and a persistent local PostgreSQL spending ledger. An exclusive runner lock prevents concurrent local ledger processes. Reusing the approval retains prior spend; a crash does not create a fresh budget. No paid calls are scheduled or enabled in the preview.

Model: `gpt-6.1-sol`, Responses API, standard service tier, low reasoning, `store:false`, strict structured output. Official [model/pricing documentation](https://developers.openai.com/api/docs/models/gpt-6.1-sol) and [structured output documentation](https://developers.openai.com/api/docs/guides/structured-outputs) were verified before the run. `store:false` is not a zero-retention claim; live privacy review must account for OpenAI's applicable retention and project settings.

**Initial:** ten scenarios, 30 turns, 40 completed API responses, zero service errors. **Targeted retest:** fabric search and tool teaching, six turns, 13 completed API responses, zero service errors. Total: 53 responses, 87,409 input tokens, 8,744 output tokens. Usage-based estimate **US$0.132543**; conservative ledger charge after rounding each receipt **US$0.132574**. This is application accounting, not an independently reconciled OpenAI invoice. No run/session cap was exceeded.

The real model adapted warm contemporary advice to north-facing light and the customer's no-yellow constraint, revised patterns after feedback, clarified contradictory plain/bold preferences, retained fixed furnishings, declined invented stock and exact colour guarantees, and accurately stated that Room Visualiser 2 has no heading selector. It returned only the three verified Shambala cards. When the descriptive index was unavailable, it preserved the design direction and continued useful general advice.

One substantive initial finding was a false follow-up retraction of an earlier search. The old adapter replayed text but discarded the preceding tool history. The correction records application-generated retrieval receipts and carries them, approved cards and citations into subsequent model turns. A regression test verifies completed/failed search receipts survive storage and enter the next model request. The real targeted retest correctly remembered the completed empty retail search and unavailable descriptive search, then retrieved approved Shambala cards. The original transcript is retained, not overwritten.

Human judgement remains required. The supplied eight-dimension 0–4 rubric requires at least 3 in every dimension and no critical factual/privacy/eligibility failure. The evidence viewer compares real and mock replies; a blind-labelled copy should be used for the formal quality review. No human scores are invented. Further polish should replace internal FI reaction tokens such as `NOT_QUITE` with customer-friendly wording; the evaluated output is preserved verbatim so that weakness remains reviewable. Passing deterministic checks does not prove resistance to all hallucinations or prompt injections.

## Validation

| Check | Result |
| --- | --- |
| Consultation, adapters, failure recovery, caps, handoffs and evaluation regression | 24 passing tests |
| Cloud runtime/auth/ownership/leases/rate/spend/HTTP composition | 5 passing local PostgreSQL tests |
| Descriptive index, incremental updates, private RPC, GIN plan and safe rehydration | 1 passing local PostgreSQL test |
| Earlier schema ownership RLS | 1 passing local PostgreSQL test |
| Existing Phase 1 controller/interactions | 20 passing tests |
| Existing scoped Shopify theme regression | 18 passing tests |
| Responsive Chrome | 320/390/412/768/1440 CSS px; no overflow, all three product images loaded |
| Welcome / accessibility | Auto-open observed; clock boundaries/background restoration unit-tested; keyboard disclosure and visible focus verified |
| Outstanding device checks | Physical iPhone, actual screen reader, enabled OS/browser reduced motion and confirmed hidden-tab timer behaviour remain pending |

The actual page visibility stayed `visible` during the attempted background-tab check, so that observation does not close the hidden-tab acceptance item. No simulated screen reader or browser size is represented as a physical-device pass. Existing homepage/FI/Room Visualiser/commerce source is unchanged; targeted read-only live checks were used, not orders/payments or complete transactional certification.

PostgreSQL tests initially exhausted memory when run concurrently with the backup/evaluation. The failed attempt is retained. They passed when run serially with `node --liftoff-only --wasm-num-compilation-tasks=1 --test <file>`. Dependencies were reused; no installation, full Next build or bulk ingestion was required. Logs are in the evidence directory.

## Costs, release recommendation and next steps

The documented standard model rates are US$2/million input tokens, US$0.10/million cached input, US$2.50/million cache-write and US$10/million output. The observed three-turn scenarios averaged roughly one US cent, but longer history, tool rounds and retries can cost more. Planning examples excluding cache benefits: 20k input + 3k output is US$0.07; 60k + 8k is US$0.20. A ten-minute conversation is not a fixed token volume. Keep durable per-session/run limits and monitor actual receipts before setting commercial allowances.

No new Vercel/Supabase purchase was made. Cloud infrastructure cost cannot be verified from local SQL tests; approve the specific non-production environment/plan first, then measure storage, Auth, CPU and egress. Do not treat existing paid capacity as unlimited or free.

**Recommendation: hold Jane public activation.** The implementation is ready for owner review of real conversations and a separately approved protected cloud trial, not a live release. Complete hosted Auth/RPC/multi-worker verification, incremental full-master coverage, retention/privacy operations, human quality review and device accessibility checks. Then separately authorise any customer-facing integration and paid service operation. Upload processing remains outside the demonstrated service.

PR #167 stays an independent Meet Our Team candidate using the existing [20-file manifest and scoped release/rollback procedure](RELEASE.md). Do not publish the whole development theme. Before any eventual Jane release, retarget/reconcile the stack, obtain exact-head owner policy approval for protected test paths, pass `curtainsuk-production-gate` and `protected-production-policy`, then request deployment approval from the exact protected HEAD. Rollback starts by disabling the advisory capability; restore the prior protected application deployment only under the normal release procedure. Retain consented records and budget evidence; do not drop data as an emergency rollback shortcut.

Storage started at 37.03 GiB free on C:, with restic PID 45016 observed. No backup scripts, repositories, manifests, historical worktrees or evidence were deleted or modified. Process presence/absence cannot verify snapshot coverage. This work requires a subsequent verified backup.
