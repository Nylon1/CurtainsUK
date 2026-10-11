# Jane: existing Supabase Pro integration review

11 October 2026. **Implemented and locally verified. No hosted migration, population or consultation test has run.**

## Verified source and release separation

Work started from PR #169 `996d804f63bfcde48bd58d48a37598ead638451e`, branch `feat/jane-consultation-phase2-20261009`. Protected `release/production` remains `3649c879a4a5ddf88c2093a4172d20fbc58cd265`. PR #167 remains draft, independent and unchanged at `851078c674ac2e9231e51dffbd5949ed4ea7c6d1`. Issue #168 and the required programme/production records were read. The Vercel project and READY production deployment `dpl_CvvQKa2zCsFbQ7eZR9Lzi31w7BCD` were reverified read-only. Room Visualiser 2 and the homepage remain completed production work.

The approved Meet Our Team design, six portraits, Coming Soon/AI labels, navigation candidate and 20-file release scope are unchanged. The earlier comparison of all 20 files and 505 live-theme checksums is preserved, not represented as repeated today. Refresh it immediately before an approved release using [RELEASE.md](RELEASE.md). No entire-theme publication or protected merge is authorised.

## What this increment implements

- An exact, CLI-generated atomic SQL migration combining the six existing review files, with collision/Auth-column preconditions, statement/lock limits and final sequence-grant hardening. Local tests inject a late failure and prove all new objects/roles roll back together; reruns fail closed. The generated inventory lists every relation, column, constraint, index, function, policy and grant.
- A validated identity-manifest adapter with six-ID pages, checksum-bound durable cursors, restart support, duplicate detection and fresh end-of-run identity attestation. It preserves database ordering and never copies raw product descriptions or commercial fields.
- An operator-only population wrapper requiring fresh trusted resource telemetry before each batch. It stops on missing/stale telemetry, CPU >=60%, disk I/O >=50%, memory >=80%, disk >=85%, connections >=70%, new database errors/deadlocks, lock waits or concurrent supplier refresh. A successful batch taking >=10 seconds checkpoints and stops further work. No automatic scheduler, retries or model indexing tool was added.
- More precise field-coverage receipts for names, collections, brands, repeats and care, alongside existing colour/tone/pattern/texture/description/composition/width/weight coverage.
- A hosted mock gate bound to the exact existing Vercel project, protected preview deployment and origin. A private URL is insufficient. The actual project currently reports no password, SSO or trusted-IP protection, so protected deployment verification remains a blocker.

The existing AES-GCM storage, restricted roles, owner-scoped RPCs, live Auth-session checks, recovery, idempotency, retention, distributed leases and durable rate/spend accounting were retained and retested. No new framework, Supabase project/branch or product database was introduced.

## Exact migration for approval

[SQL](../../supabase/migrations/20261011142747_jane_isolated_advisory.sql), [human review manifest](../../artifacts/jane-pro-readiness-20261011/MIGRATION_REVIEW.md), [object/ACL inventory](../../artifacts/jane-pro-readiness-20261011/migration-objects.json).

Canonical UTF-8/LF SHA-256: `2c78e6173d5e807890d7de229ad11002a552534b6e2b445819214832cf049d73`.

Creates one private schema, nine tables, 21 indexes, one sequence, three SECURITY INVOKER functions, 19 policies and four NOLOGIN roles. Seeds only one coordination row. **Existing-object exception:** USAGE on `auth` and SELECT on `auth.sessions(id,user_id,not_after)` for the new verifier. No existing records or definitions change. Credentials, memberships, schedules, jobs, API exposure and customer rows are not created.

The local exact-bundle measurement is in the manifest (about 280 KiB initial relations). Tests run on PGlite PostgreSQL 18.3; hosted is 17.6.1.166. Local tests do not certify hosted Auth/role behaviour or load. No blanket `db push` is approved: reconcile the remote migration history first, and require a dry-run containing this single migration. The local repository has only a subset of hosted migration history.

## Measured capacity, I/O and recovery

Existing project `hqysjumypgeapgmqkcrx` is ACTIVE_HEALTHY and its organisation is Pro. Database bytes at preflight: **692,268,179**, approximately 660.20 MiB. The plan includes 8 GB, while the dashboard displayed **2 GB provisioned disk**. These are different measures. The old Free quota blocker is resolved; no purchase or capacity change was made here.

The 24-hour dashboard ending around 14:23 UTC reported CPU 6%, disk I/O 1%, memory 63%, disk use 50%, peak database connections 10/60, 967 slow queries and 0.72% database errors. Separate metadata sampling saw 16 total connections, zero other active queries and zero lock waits at that instant. Several last-hour charts were unavailable. These observations are not fresh population-admission telemetry.

Two database-stat samples about 100 seconds apart showed no increase in physical read blocks or deadlocks, but approximately 59 MB more global temporary bytes. That activity cannot be attributed to Jane. I/O timing counters were zero and are not proof of zero I/O latency. [Raw observations and the actual query plan](../../artifacts/jane-pro-readiness-20261011/resource-observations.json) preserve the limitations.

Daily physical backups and a Restore action were visible, latest **11 October 2026, 01:03:26 UTC**. No restore was attempted or rehearsed. Recheck recovery responsibility and backup age before any approved migration. Database backups do not establish Storage-object recovery. Toshiba completion remains unverified; no restic process was visible in this preflight. C: started at 40.41 GiB free. No cleanup, backup modification or historical worktree removal occurred. An official portable Supabase CLI was checksum-verified and downloaded to temporary storage solely to generate the migration filename. New work needs a subsequent verified backup.

## Exact knowledge coverage

The bounded, primary-key identity inventory found **16,883 permitted Master identities** at 14:20:04 UTC. It returned fewer than its 20,001-row safety cap. The owner-authorised knowledge scope includes unpublished identities; this count is not a purchasable-product count.

Identity SHA-256: `77e5fffc3d623ce62993e9804814cdf0e74d5c468b60f1ee534893f2197e1405`.

[Full ID-only manifest](../../artifacts/jane-pro-readiness-20261011/source-manifest.json), [coverage](../../artifacts/jane-pro-readiness-20261011/coverage.json), [read-only SQL](../../artifacts/jane-pro-readiness-20261011/inventory-query.sql). The measured plan used `fabric_colourways_pkey`, returned 16,883 rows in 12.4 ms, had 3,538 shared-buffer hits and 5,142 heap fetches, with zero disk blocks read/written, dirtied blocks or temporary blocks in that execution. This is a bounded inventory, not a general workload benchmark.

**Hosted descriptive index coverage remains 0/16,883.** The advisory schema is absent. All IDs were paged once locally in 2,814 six-ID pages, but no live descriptive population ran. Five historical Master records were reindexed locally; the separate 120-row synthetic fixture tests failure/recovery/performance. In the five-record sample, validated descriptions are 0/5, compositions 4/5, physical weight 1/5 and care 4/5. Other measured fields are in coverage.json. Whole-Master field completeness and purchasable counts remain unknown.

Use the existing safe projection and strict three-source lookups. Missing values remain unknown, and failed optional-source reads stop index writes. Search rehydrates facts; commercial recommendations still require the governed retail journey. The completed `browseGuide=1` correction was not changed. A matching identity checksum cannot certify that descriptions stayed unchanged during a long population. Record per-row source hashes and timestamps; use an approved subsequent changed-ID reconciliation before claiming current descriptive completeness.

## Controlled population after separate approval

Bind approval to the exact migration hash, source identity snapshot/count, job UUID, owner reference and <=24-hour expiry. Create the matching job only through the operator workflow. Use `createManifestSource`, the existing strict catalogue projection/index worker, and `runMonitoredPopulationSlice`. Attestation must execute a fresh bounded count/hash query under read-only transaction/timeouts, without returning the ID list repeatedly.

Start with **one six-record batch**. Measure source queries, index bytes, journal bytes, WAL/I/O, query latency and supplier activity. Only then approve a slice up to 20 batches (120 identities). Reuse the same checkpoint; do not launch parallel jobs to increase throughput. Initial plan is 2,814 batches and at least 141 invocations. The five-second gaps alone require about 3 hours 54 minutes, excluding queries, attestation, retries and pauses. The normal three fact reads imply 8,442 requests; their combined 2.11 GB response cap is a conservative transport ceiling, not expected traffic or DB I/O. Attestation and retries are extra bounded work.

Reserve 100 MiB provisionally for derived terms and receipt/before-image storage, then replace that estimate with measurements after 6 and 120 records. Stop at the reserve or resource ceilings. New facts are not stored as a second catalogue. Rollback restores six recorded before-images at a time, newest job first; hash/later-job conflicts stop rather than overwrite newer work. Full population remains **unapproved**.

## Hosted synthetic protocol

The existing-project runbook remains authoritative, with the Pro and exact-manifest updates. A later separately approved protected Vercel preview must use the existing project, inactive public route, private exact-deployment approval and two synthetic Auth accounts. No OpenAI key is needed for mock verification.

1. Provision narrowly scoped server-only connection identities after role review. Use verified TLS and small bounded pools; runtime and Auth verifier reject broader database roles. Keep `advisory` outside exposed Data API schemas. No browser receives database/service credentials.
2. Read back all grants/RLS; prove anon, authenticated and service_role cannot access advisory, indexer cannot access consultations and runtime cannot index. Verify real Auth issuer/signature/user/session, expired/revoked sessions and foreign ownership. Do not use real customer data.
3. Across two application instances, race creates/messages/recovery tokens; test replay, interruption, restarts, stale leases and durable minute/day/spend limits. Preserve conservative spend reservations when provider usage is unknown. Compare the resulting rows/receipts, not just HTTP responses.
4. Exercise consent, encrypted save, same-account cross-device recovery, single-use token replay rejection, expiry, deletion and bounded retention. Tamper ciphertext/AAD and test key rotation. Agree backup-aware retention/erasure and a scheduled retention operator before real data. No retention cron currently runs.
5. Check browser network/logs for secrets, errors for transcript leakage, origin/CSRF, private deployment access and failure recovery. Record actual PostgreSQL 17/Auth behaviour, latency, connections and I/O. These hosted checks are pending, not inferred from the 89 local tests.

## Intelligence, human review and cost

Jane's `2.2.0-preview.1` profile and `jane-foundations-v3` suite are unchanged. The latest mock run passes 20 scenarios, 60 advice turns and three actual context/save/recover operations with zero service errors. Concise style and useful adaptive advice still need fresh real-model evaluation. Existing Fabric Intelligence/Room Visualiser guidance and inactive context contracts were preserved and tested; screenshots are not yet processed and Jane must say so.

Historical real conversations remain unchanged: 36 turns, conservative ledger US$0.132574. Earlier engineering review found mean 96 words, 25 replies over 90 words, 21 containing em dashes and two exposing internal feedback wording. The revised profile addresses those problems; mock tests cannot establish that the real model now does. Twelve blind historical pairs and 24 human scorecards remain available in the foundations gallery. Reviewers must score room understanding, design reasoning, alternatives, feedback, voice, tool accuracy, evidence/eligibility and useful summaries. Critical factual/privacy failures fail the consultation; missing or disputed scores cannot pass. No human score has been invented.

Proposed fresh evaluation: **US$5 total, US$1 per consultation**, invented scenarios only, no public activation, bound to this profile/suite with a new run ID and receipt ledger. At the verified GPT-6.1-sol standard rates ($2/M uncached input, $10/M output), a planning allowance of 300k input + 60k output tokens is about **US$1.20**; actual tool rounds/long context may vary. Reserve before each call, charge conservatively after uncertain failures and stop at the cap even if the suite is incomplete. No approval or paid call is made here. [Official model/rates](https://developers.openai.com/api/docs/models/gpt-6.1-sol).

Illustrative later consultation usage of 20k input + 3k output tokens costs about US$0.07 at those rates, before retries/other services. This is not measured customer usage. Additional Supabase/Vercel charges depend on actual compute, egress, retained encrypted history and deployment protection. Use the existing paid organisation; no extra service or fixed monthly commitment is proposed. No vector/embedding model cost is needed for the prepared PostgreSQL text index.

The old temporary key **still needs revocation according to the owner's last confirmation**. It was not reused, copied or tested. Fresh model testing requires owner-confirmed revocation, a new dedicated credential outside Git, fresh budget approval and complete receipts.

## Quality and recommendation

89 scoped local tests pass, including security, separate application processes, retention, authenticated recovery, encrypted records, index interruptions, role separation, exact migration rollback, all-ID traversal and resource stops. Scoped lint passes. These are local results, not hosted results. Existing browser evidence covers all five widths, keyboard exit, six profiles and actual reduced motion. New review-gallery checks show no overflow at 320/390/412/768/1440, including expanded migration details. The consultation showed a 30-second welcome and had opened automatically when observed at 54 seconds. A synthetic message completed, input stayed usable, and Escape restored focus from the consented handoff dialog to its opener; the transcript exposes role=log and aria-live=polite. This is not spoken screen-reader verification.

The unchanged scripted mock suggested olive despite a synthetic customer's “no green” constraint. This is a recorded baseline limitation, not a real-model finding or a quality pass. The prepared real-model scenario and human rubric explicitly test this distinction; do not hard-code a scenario-specific mock response to make it appear intelligent. Physical iPhone/touch, spoken screen reader and proven hidden-tab browser timing remain pending. No simulated check is described as a physical-device pass.

Review the [updated local gallery](http://127.0.0.1:8789/pro-readiness), [scripted Jane](http://127.0.0.1:8789/) and [draft PR #169](https://github.com/Nylon1/CurtainsUK/pull/169). **Recommendation:** approve review of the exact additive migration as the next milestone. Do not activate Jane or approve full index population yet. Follow protected-source policy and both required checks for any later release. PR #167 publication remains a separate decision.
