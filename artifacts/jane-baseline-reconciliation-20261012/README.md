# Jane population baseline and 7,000 milestone

12 October 2026. Local additive preparation for PR #169. No migration, source hook, scheduler, automatic update activation or paid AI call.

## Actual continuation

At18:48:21UTC the operator timed out on a read-only checkpoint request. Readback at18:50UTC and the existing exact-plan verifier confirmed6,990 identities, matching last-batch hashes/receipts, preserved historical records and restored permissions. The fsynced journal had no pending write. The same unchanged operator resumed and reported [7,002 verified identities](https://github.com/Nylon1/CurtainsUK/pull/169#issuecomment-6130581861). It continues under the original limits.

## New read-only implementation

`lib/advisory/population-baseline.mjs` prepares an ID/hash baseline from the existing journal. It freezes a complete newline boundary on one open file handle and streams that prefix. It does not take/remove the operator lock, alter the file, issue SQL or import into the running operator. It checks exact approved identity order, scope, SQL hashes, receipts, historical before-images and resolved uncommitted plans. A pending batch is excluded from coverage. Local evidence cannot assert hosted verification or completed source reconciliation.

The snapshot through18:56:39.306UTC covers **7,068 / 11,517 identities**, **1,178 verified batches**, zero duplicate IDs and two independently evidenced expired/uncommitted resolutions. It has no pending write at that fixed boundary. Catch-up begins conservatively at **11 October18:54:39.275UTC**, including the historical six-record baseline and its maximum source-age allowance. The excluded historical identity remains separately preserved. See `snapshot.json` for exact hashes and byte boundary. Full private journal and baseline remain outside Git.

The current-source side remains incomplete: every relevant source-change domain must have verified discovery/publication coverage, including changes made during population. This audit does not fill those source-history gaps or approve automatic updates.

## Test evidence

Five new tests passed, zero failed:

```text
node --test --test-concurrency=1 lib/advisory/__tests__/population-baseline.test.mjs
```

Tests reject missing/duplicate/reordered/foreign receipts, corrupted SQL, false completion, altered historical data, partial file tails and unresolved writes. Explicit uncommitted evidence is checked with the existing verifier. A file test confirms the active lock and journal contents stay unchanged. The actual local audit read64,358,779bytes and completed in about1.8seconds; this is local I/O, not hosted throughput evidence.

Existing35-test update preparation evidence is preserved separately. No runner code, source definition, SQL migration or dependency changed. Current monitoring renewal remains pending before20:25UTC. A later verified backup must include new development and later hosted writes; Toshiba completion remains unverified.
