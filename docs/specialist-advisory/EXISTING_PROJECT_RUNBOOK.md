# Existing-project advisory migration and indexing review procedure

**Latest checkpoint, 11 October 18:06 UTC:** the separately approved protected synthetic application trial passed and is closed. [Hosted trial report](../../artifacts/jane-hosted-trial-20261011/README.md) records real Auth verification, encrypted cloud round trips, isolation, concurrency, expiry, shared limits and sign-out denial. Temporary connection access was provisioned and then disabled in two audit migrations; history now has 81 entries. The canonical migration below is unchanged. Synthetic rows and trial connections are zero. No descriptive indexing or real-model calls occurred. This is an executed trial result, not authorization for new deployments or population.

**Current status, 11 October 17:16 UTC:** the exact additive migration is applied and hosted metadata verified following explicit owner approval. [Execution receipt and read-back](../../artifacts/jane-migration-execution-20261011/README.md). Source filename `20261011142747_jane_isolated_advisory.sql` maps to API-assigned hosted version `20261011171354`; both have SHA-256 `eeaf8c9da085277783a263c8caf28ac3e1e46dac472ad508d3cb18f584948a50`. Do not reapply it or repair earlier history. PR #170 is merged at protected `c7ca2d0e`. No application, indexing or account provisioning approval is implied.

The pre-approval procedure below is preserved as the historical review plan. Its statements that execution has not occurred are superseded by the receipt. The actual exact-file workflow used Supabase's single-migration API, with a local submission plan and complete ledger/hash read-back, rather than CLI `db push`. Target only `hqysjumypgeapgmqkcrx`; no separate project/branch. Local PostgreSQL synthetic tests remain the application development environment.

## Preconditions for a migration request

1. Pro is independently reverified on 11 October; the prior Free quota blocker is resolved. Recheck actual provisioned disk, CPU, I/O, memory and connections before work. The plan's 8 GB allowance is not the same as the dashboard's 2 GB provisioned disk. See [current Auth migration correction](JANE_AUTH_MIGRATION_FIX.md).
2. Re-read protected/source HEADs, existing migration history, PostgreSQL version, advisory schema/role-name availability and current grants through an approved metadata-only workflow. Stop on an existing advisory schema or role collision, rather than blindly merging or dropping objects. Confirm CREATE/CREATEROLE authority and private schema availability. No protected Auth privilege, Auth-column check or Auth data scan is required.
3. Review the [corrected exact SQL manifest](../../artifacts/jane-auth-fix-20261011/MIGRATION_REVIEW.md) and full local object/ACL inventory. Five source files form the corrected bundle; the retired Auth-grant file is excluded. No existing-object grants remain. Verify canonical UTF-8/LF hashes from Git. The final grants revoke intermediate historical access, so the full bundle must remain atomic and private.
4. Review backup/snapshot evidence, restore responsibility, encrypted-key custody, rotation and backup-aware erasure. Set operational query/connection ceilings. Verify private schema exclusion from Data API exposure, approved HTTPS preview origin, deployment protection and restricted synthetic account list.
5. Obtain explicit owner approval naming project, exact commit, bundle hash, role grants, intended synthetic scope and rollback operator. This is separate from later index population, real-model spend and customer activation approvals.

## Prepared migration and execution after approval

Official checksum-verified portable Supabase CLI 2.120.0 generated `20261011142747_jane_isolated_advisory.sql`. The corrected five-part atomic bundle has passed local PostgreSQL tests under a non-superuser without Auth grant option, including reproduction of the old failure, late-failure rollback and collision refusal. It creates no service credentials, schedules, customer rows or API exposure. Before approval/execution, reconcile remote migration history; the local repository contains only a subset. The approved workflow's dry-run must list exactly this new file, with no historical replay. Do not use blanket `db push` or an ad-hoc SQL editor as a bypass. Record exact checksum, protected/source HEAD, operator, backup, start/end time and result. No hosted execution has occurred.

The runtime/indexer/retention roles are initially NOLOGIN, with no application memberships. PostgreSQL creator-administration memberships must match the inventory. Provision separate server-only connection identities or approved scoped role selection outside Git after role review. The injected transaction must enter exactly the expected role and use TLS, bounded pools and timeouts. Runtime rejects broader `current_user` roles. There is no Auth-verifier database connection. `createServerAuth` uses the existing project publishable key and isolated server-side SDK clients, with fresh `getUser(jwt)` and verified `getClaims(jwt)` on every request. Do not wire a database-owner or `service_role` connection into the application.

The approval fixture used by tests is not deployment configuration. Create a private, expiring hosted approval only after migration verification. It must bind the manifest hash, existing Supabase and Vercel projects, exact protected preview deployment/origin, advisory schema, `synthetic-mock-only`, owner approval reference and 1–10 synthetic Auth user IDs. Maximum lifetime is 24 hours. The current Vercel project reports no deployment protection; verify separately approved protection before setting the attestation. Configure the data-key ring and CSRF key through approved server-only secret management. No OpenAI credential is needed for hosted mock validation.

## Hosted verification checklist after migration approval

Keep the public route disabled. On a separately approved protected preview, use two invented accounts and two application instances:

- Verify real login, valid/expired/tampered/wrong-issuer JWTs, non-anonymous ownership and immediate failure after Auth session deletion/revocation. Confirm Auth failure prevents every advisory query and model call. Confirm all new roles lack protected Auth access. Test the actual hosted Auth version and configured time-box/inactivity behavior; do not equate unexpired JWT claims with an active session or claim policy expiry precedes documented refresh/token timing.
- Verify browser roles and `service_role` cannot access new advisory objects; runtime cannot index; indexer cannot read consultations; retention cannot read unexpired sessions. Confirm pooled owner context resets and foreign-account requests cannot obtain any ciphertext or metadata.
- Race identical starts and messages across instances. Confirm one committed result, replay behaviour, stale-lease rejection, recovery after process loss, shared minute/day limits and durable spend reservations. Restart both instances and repeat recovery. Simulate unknown provider usage without contacting OpenAI; retain the full ceiling.
- Inspect only synthetic ciphertext with the operator. Tamper owner/revision/nonce/tag; reject authentication. Rotate active key IDs while retaining the prior key for a controlled read, then rehearse a bounded re-encryption/retirement procedure before any real data. Do not claim key deletion alone guarantees backup erasure.
- Save only with consent, resume only with the same account and one-use secret, delete, expire and run bounded retention. Verify failed commits preserve retryable work and logs contain no transcript/key/contact content. Test approved origin, CSRF, error sanitisation and deployment protection.
- Capture actual latency, query plans, I/O, pool pressure, rate/accounting rows and restart receipts. No test pass is inferred from local PGlite. Schedule retention only under separate reviewed operating configuration; it is currently a callable fixed function, not a running job.

## Controlled source inventory and index population

The authorised read-only inventory now establishes 16,883 unique IDs at 11 October 14:20 UTC. Use its [verified identity manifest](../../artifacts/jane-pro-readiness-20261011/source-manifest.json) and checksum-bound `createManifestSource` adapter. All 2,814 pages were traversed locally without descriptive reads. Population remains unapproved. Attest identities again using a bounded, timed, read-only count/hash query before each invocation and at EOF. Record subsequent changed-ID reconciliation. Never claim the identity inventory is completed descriptive indexing.

A moving keyset traversal is not a database snapshot. Require a versioned source manifest, exact unique count, last checkpoint and a reconciled change/tombstone feed before certifying completeness. Source attestation must verify that manifest version, not just return `true`. New/changed IDs need later incremental jobs. If the source cannot supply a stable manifest and reconciliation evidence, retain partial coverage. Never run an expensive full-table count to fill an unknown denominator by convenience.

Prepare a trusted server-side approval with `approved:true` only after the owner approves the exact population: project, schema, purpose `bounded-advisory-index-only`, bundle hash, job UUID, source snapshot, exact count, source-attestation reference, owner approval reference, expiry within 24 hours and `maxBatches` from 1 to 20. Persist a matching `index_jobs` record through the index operator only. Approvals/job creation are not model or browser operations.

Supply `createIndexWorker` with a scoped indexer transaction, the existing strict catalogue projection and the approved source adapter. `source.page` returns at most six unique IDs, a checksum-bound cursor and EOF. `verifySnapshot` requires a fresh source attestation. Hosted operators must use `runMonitoredPopulationSlice`, which wraps `runPopulationSlice` with fresh resource admission before each batch and stops on the first error/ceiling. It never self-schedules and resumes the durable checkpoint only on a later approved invocation. The low-level function alone is not the hosted procedure.

| Limit | Initial ceiling |
| --- | --- |
| Concurrent indexing batches across all jobs | 1 shared fenced lease |
| Source identities per batch | 6 |
| Gap after successful commit | At least 5 seconds |
| Batches per approved invocation | At most 20, at most 120 identities |
| Standard batch reads | Six IDs from the local manifest plus three narrow fact/visual/profile reads; separate bounded attestation per invocation/EOF |
| Catalogue response cap | 250,000 bytes per read; approximately 1 MB standard batch ceiling including ID page |
| Source read deadline / per-request deadline | 12 seconds / 4.5 seconds |
| SQL statement / lock timeout | 3 seconds / 500 ms |
| Failure backoff | 30 seconds doubling up to 300 seconds; manual resumption |

`populationPlan(exactCount)` reports successful-traversal bounds, including a possible empty EOF page. Attestation/reconciliation and retries are separate bounded work and are not hidden inside that estimate. It does not measure actual database I/O. Start with one batch, inspect live database latency/I/O and errors, then at most one approved slice; stop on load or source inconsistency. Do not overlap supplier refreshes. Expand throughput only through a new reviewed limit, never by launching more workers.

Each batch atomically saves unique-ID receipts, hashes, previous index rows, field presence and checkpoint. `readIndexCoverage` counts only derived receipts under the job index, with an operator-side timeout; it never scans the canonical Master. Report expected, observed, retained, processed, indexed, batches, errors, field counts and last source version. Missing descriptions/compositions remain gaps. Completion requires exact expected count, EOF, no missing/duplicate IDs and verified source attestation. Rehydrate all customer facts and retail eligibility independently.

Deletion/tombstone reconciliation must be explicitly approved and backed by source evidence. Do not interpret an optional upstream error as a deleted fabric. The controlled population worker stops on missing facts; do not use the simpler `refreshKnowledgeBatch` helper for full population or speculative removals.

## Rollback and stopping

First disable the private hosted/population approval or credentials to stop new work. Keep customer routes inactive. On index failure, leave the checkpoint/receipts intact and resume only after diagnosis. For index rollback, process the affected jobs newest first with `worker.rollback(jobId)`, six rows per call, observing the shared five-second gate. A hash or later-job conflict stops atomically for review. Verify retained coverage decreases and older rows are restored byte-for-byte. Never edit source records or erase evidence to force rollback.

For advisory migration withdrawal, disable the new connections, revoke only new role memberships/privileges and stop any separately approved scheduler. Preserve the isolated schema and encrypted synthetic records until a reviewed retention/rollback decision. Dropping schema/tables/roles is not an automatic rollback and is not authorised here. The corrected migration adds no Auth privilege, so there is no Auth rollback step. If an unexpected legacy advisory Auth role already exists, stop and review its origin rather than changing it automatically. Do not alter any pre-existing Auth/application privilege or roll back unrelated production migrations.

Meet Our Team publication/rollback remains independent in [RELEASE.md](RELEASE.md). This procedure neither merges PR #169 nor deploys Vercel, publishes Shopify, spends an OpenAI budget or approves real customer processing.
