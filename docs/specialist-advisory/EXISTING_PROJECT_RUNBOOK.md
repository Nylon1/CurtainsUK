# Existing-project advisory migration and indexing review procedure

**Not executable approval. No production actions have run.** Target only `hqysjumypgeapgmqkcrx`. No separate Supabase project/branch. Local PostgreSQL synthetic tests remain the development environment.

## Preconditions for a migration request

1. Resolve the observed 142% Free-plan database-size quota before proposing added storage. The owner chooses any capacity action; this task authorises neither purchase nor cleanup.
2. Re-read protected/source HEADs, existing migration history, PostgreSQL version, advisory schema/role-name availability and current grants through an approved metadata-only workflow. Stop on an existing advisory schema or role collision, rather than blindly merging or dropping objects. Confirm `auth.sessions` has the three proposed columns and that the migration operator may grant them. No Auth data scan is needed.
3. Review all six files in `artifacts/jane-foundations-20261011/migration-review-manifest.json`, including the Auth SELECT exception. Verify hashes from the actual Git blob bytes. The last advisory role file revokes the intermediate historical grants, so the full bundle must be transactional and remain private.
4. Review backup/snapshot evidence, restore responsibility, encrypted-key custody, rotation and backup-aware erasure. Set operational query/connection ceilings. Verify private schema exclusion from Data API exposure, approved HTTPS preview origin, deployment protection and restricted synthetic account list.
5. Obtain explicit owner approval naming project, exact commit, bundle hash, role grants, intended synthetic scope and rollback operator. This is separate from later index population, real-model spend and customer activation approvals.

## Migration packaging after approval

Use the repository-approved Supabase CLI workflow and `supabase migration new jane_advisory_foundations` to generate the real migration filename. The CLI is not installed in this process and no migration file was fabricated. Review installation/resource impact before obtaining it. Copy the reviewed six-file SQL in manifest order into that generated migration inside one transaction, adding no service credentials, cron jobs, seed customer data or API exposure. Rehearse the exact combined SQL locally with synthetic Auth fixtures and scoped roles. Use the approved migration procedure, not an ad-hoc production SQL editor. Record migration identity, checksum, operator, time and outcome.

The runtime/indexer/retention/Auth-verifier roles are initially NOLOGIN and have no memberships. Provision separate server-only connection identities or approved scoped role selection outside Git after role review. The injected transaction must enter exactly the expected role and use TLS, bounded pools and timeouts. Runtime and Auth verifier reject broader `current_user` roles. Do not wire a database-owner or `service_role` connection into the application.

The approval fixture used by tests is not deployment configuration. Create a private, expiring hosted approval only after migration verification. It must bind the manifest hash, existing project, advisory schema, `synthetic-mock-only`, owner approval reference and 1–10 synthetic Auth user IDs. Maximum lifetime is 24 hours. Configure the data-key ring and CSRF key through approved server-only secret management. No OpenAI credential is needed for hosted mock validation.

## Hosted verification checklist after migration approval

Keep the public route disabled. On a separately approved protected preview, use two invented accounts and two application instances:

- Verify real login, valid/expired/tampered/wrong-issuer JWTs, non-anonymous ownership and immediate failure after Auth session deletion/revocation. Confirm only the three Auth columns are readable to the verifier, and no writes.
- Verify browser roles and `service_role` cannot access new advisory objects; runtime cannot index; indexer cannot read consultations; retention cannot read unexpired sessions. Confirm pooled owner context resets and foreign-account requests cannot obtain any ciphertext or metadata.
- Race identical starts and messages across instances. Confirm one committed result, replay behaviour, stale-lease rejection, recovery after process loss, shared minute/day limits and durable spend reservations. Restart both instances and repeat recovery. Simulate unknown provider usage without contacting OpenAI; retain the full ceiling.
- Inspect only synthetic ciphertext with the operator. Tamper owner/revision/nonce/tag; reject authentication. Rotate active key IDs while retaining the prior key for a controlled read, then rehearse a bounded re-encryption/retirement procedure before any real data. Do not claim key deletion alone guarantees backup erasure.
- Save only with consent, resume only with the same account and one-use secret, delete, expire and run bounded retention. Verify failed commits preserve retryable work and logs contain no transcript/key/contact content. Test approved origin, CSRF, error sanitisation and deployment protection.
- Capture actual latency, query plans, I/O, pool pressure, rate/accounting rows and restart receipts. No test pass is inferred from local PGlite. Schedule retention only under separate reviewed operating configuration; it is currently a callable fixed function, not a running job.

## Controlled source inventory and index population

Before population, choose an **existing** authorised changed-ID feed or approved identity manifest. Record permission to include unpublished knowledge and field/provenance coverage. If an initial complete ID inventory is needed, authorise it explicitly: `identityPage` uses the existing `fabric_id` primary-key keyset, six IDs per page, no OFFSET, counts or wide scans. Pace it separately with the same resource envelope and durable cursor. Do not rebuild Browse or interfere with refresh jobs.

A moving keyset traversal is not a database snapshot. Require a versioned source manifest, exact unique count, last checkpoint and a reconciled change/tombstone feed before certifying completeness. Source attestation must verify that manifest version, not just return `true`. New/changed IDs need later incremental jobs. If the source cannot supply a stable manifest and reconciliation evidence, retain partial coverage. Never run an expensive full-table count to fill an unknown denominator by convenience.

Prepare a trusted server-side approval with `approved:true` only after the owner approves the exact population: project, schema, purpose `bounded-advisory-index-only`, bundle hash, job UUID, source snapshot, exact count, source-attestation reference, owner approval reference, expiry within 24 hours and `maxBatches` from 1 to 20. Persist a matching `index_jobs` record through the index operator only. Approvals/job creation are not model or browser operations.

Supply `createIndexWorker` with a scoped indexer transaction, the existing strict catalogue projection and the approved source adapter. `source.page` must return at most six unique IDs, bounded cursor, matching snapshot and EOF; it must honour AbortSignal. `verifySnapshot` validates the actual manifest on EOF. `runPopulationSlice` stops at its bounded allowance or first error, never self-schedules, and resumes from the durable job cursor on a later approved invocation.

| Limit | Initial ceiling |
| --- | --- |
| Concurrent indexing batches across all jobs | 1 shared fenced lease |
| Source identities per batch | 6 |
| Gap after successful commit | At least 5 seconds |
| Batches per approved invocation | At most 20, at most 120 identities |
| Standard batch reads | One six-ID page plus three narrow fact/visual/profile reads |
| Catalogue response cap | 250,000 bytes per read; approximately 1 MB standard batch ceiling including ID page |
| Source read deadline / per-request deadline | 12 seconds / 4.5 seconds |
| SQL statement / lock timeout | 3 seconds / 500 ms |
| Failure backoff | 30 seconds doubling up to 300 seconds; manual resumption |

`populationPlan(exactCount)` reports successful-traversal bounds, including a possible empty EOF page. Attestation/reconciliation and retries are separate bounded work and are not hidden inside that estimate. It does not measure actual database I/O. Start with one batch, inspect live database latency/I/O and errors, then at most one approved slice; stop on load or source inconsistency. Do not overlap supplier refreshes. Expand throughput only through a new reviewed limit, never by launching more workers.

Each batch atomically saves unique-ID receipts, hashes, previous index rows, field presence and checkpoint. `readIndexCoverage` counts only derived receipts under the job index, with an operator-side timeout; it never scans the canonical Master. Report expected, observed, retained, processed, indexed, batches, errors, field counts and last source version. Missing descriptions/compositions remain gaps. Completion requires exact expected count, EOF, no missing/duplicate IDs and verified source attestation. Rehydrate all customer facts and retail eligibility independently.

Deletion/tombstone reconciliation must be explicitly approved and backed by source evidence. Do not interpret an optional upstream error as a deleted fabric. The controlled population worker stops on missing facts; do not use the simpler `refreshKnowledgeBatch` helper for full population or speculative removals.

## Rollback and stopping

First disable the private hosted/population approval or credentials to stop new work. Keep customer routes inactive. On index failure, leave the checkpoint/receipts intact and resume only after diagnosis. For index rollback, process the affected jobs newest first with `worker.rollback(jobId)`, six rows per call, observing the shared five-second gate. A hash or later-job conflict stops atomically for review. Verify retained coverage decreases and older rows are restored byte-for-byte. Never edit source records or erase evidence to force rollback.

For advisory migration withdrawal, disable the new connections, revoke only new role memberships/privileges and stop any separately approved scheduler. Preserve the isolated schema and encrypted synthetic records until a reviewed retention/rollback decision. Dropping schema/tables/roles is not an automatic rollback and is not authorised here. Revert only the new Auth verifier grant after ensuring its connection is disabled. Do not alter any pre-existing Auth/application privilege or roll back unrelated production migrations.

Meet Our Team publication/rollback remains independent in [RELEASE.md](RELEASE.md). This procedure neither merges PR #169 nor deploys Vercel, publishes Shopify, spends an OpenAI budget or approves real customer processing.
