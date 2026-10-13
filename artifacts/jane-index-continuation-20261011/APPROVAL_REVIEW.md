# Review: bounded continuation from 6 to at most 126 indexed identities

This is a proposed expansion, not an executed run or an approval record. The first six-identity trial and its single temporary grant are complete. The next scope below needs its own owner approval under the user's production-indexing boundary.

## Exact scope

- Existing project only: `hqysjumypgeapgmqkcrx`.
- Existing job: `a6c0d329-935e-4c31-b8ef-71a52f6d9149`.
- Start offset 6 / batch count 1. End offset **126**, adding at most **120 identities** in **20 transactions of six**. At least five seconds between committed batches. No schedule or automatic next invocation.
- Exact ordered identities and batch boundaries: [continuation-proposal.json](continuation-proposal.json), first `pt-1227-634`, last `pt-1702-030`. No new full description inventory is needed to identify this scope.
- Full permitted identity inventory: 16,883; SHA-256 `77e5fffc3d623ce62993e9804814cdf0e74d5c468b60f1ee534893f2197e1405`. Reattested read-only at 19:17:08 UTC on 11 October. Fresh attestation is mandatory at execution; this record expires for that purpose.
- Canonical migration remains `eeaf8c9da085277783a263c8caf28ac3e1e46dac472ad508d3cb18f584948a50`. No migration or schema change is proposed.
- Implementation closure SHA-256: `a1aac30609a6eb67b6c131c776da6870be926c2a5a95a3c28ee4381768f434ca`. The JSON proposal lists normalized UTF-8/LF hashes for all 20 local modules in the continuation/coverage dependency closure. Check these before execution.

## Temporary permission included in this request

For each of at most 20 batches, use the same existing role and grantor-qualified sequence verified by the first hosted trial:

```sql
BEGIN;
-- Assert the original supabase_admin -> postgres ADMIN-only membership.
GRANT advisory_indexer TO postgres
  WITH ADMIN FALSE, INHERIT FALSE, SET TRUE GRANTED BY postgres;
SET LOCAL ROLE advisory_indexer;
-- One six-record continuation, receipts, checkpoint and shared gate.
RESET ROLE;
REVOKE advisory_indexer FROM postgres GRANTED BY postgres;
-- Assert original membership restored and SET is false.
COMMIT;
```

This is a scope excerpt. The [continuation generator](../../lib/advisory/continuation-plan.mjs) adds exact checkpoint/source/permission assertions and short timeouts. No login, credential, persistent permission, Auth access, public API or database object is added. The grant is removed before each commit, and an error rolls it back with that batch. [Official PostgreSQL 17 role grant semantics](https://www.postgresql.org/docs/17/sql-grant.html).

The operator saves each generated SQL file and checksum before submitting it. Timestamps, source values and the exact SQL hash are determined only after fresh preflight; the implementation and identity range above are fixed. The CLI prepares files only and cannot submit them. Do not treat the proposal's `approved:false` or synthetic test approvals as live authorization.

## Admission, stop conditions and verification

Recheck project health, migration checksum/history, original ACL, job/checkpoint, backup availability, active supplier work and resource headroom before starting. Source records, resource observations and checkpoint observations must be no older than 60 seconds. Reuse a bounded identity count/hash attestation for at most 60 seconds, then refresh it. No full descriptive table scan, Browse rebuild, supplier refresh or pricing query is permitted.

Retain ceilings: CPU <60%, I/O <50%, memory <80%, disk <85%, connections <70% of configured maximum, no new deadlocks, lock waiters, database errors or active supplier refresh. Dashboard aggregates must be labelled as such, never substituted for missing instantaneous readings. Refresh the available telemetry during the run; stop if required values are unavailable or stale. Retain three-second statement, 500 ms lock and five-second idle-transaction timeouts. A ten-second batch-latency ceiling stops further work even if the completed batch has committed.

Before every write, verify the exact current cursor and counters. The SQL locks the shared gate and job with NOWAIT, refuses existing target identities/receipts, and checks the server-side evidence deadline. Source strings are hex encoded outside SQL syntax. Writes touch only the advisory search vectors, receipt rows, existing job and existing coordination row. First-batch records are not rewritten.

After each commit, read back the exact six hashes/receipts, checkpoint, incomplete/full state and restored ACL. `verifyContinuationResult` refuses missing rows, incorrect hashes/fields, wrong counters and permission restoration failure. If submission outcome is uncertain, inspect the saved job and hashes before any retry. Stop for operator review on a mismatch; never blindly resubmit or restart a fresh 20-batch allowance. The approval's original start/end offsets remain binding across process restarts.

Stop at 126 total even if resources remain healthy. At that point full coverage is still incomplete. No further population or public activation follows automatically.

## Recovery and rollback

A failed transaction rolls back all changes in that batch, including the temporary membership, and preserves the last committed checkpoint. Successful earlier batches remain available for a later approved resumption.

For a fault discovered after commit, stop and preserve all receipts first. The existing rollback worker restores/removes rows with hash and later-writer conflict checks. Its rollback scope is the **entire job**, including the original six records, in bounded six-row calls. Do not invoke it merely to undo this increment; request a separately reviewed rollback scope. It has passed local interoperability tests but was not run on the successful hosted job. Do not drop schemas, repair history, change canonical fabrics or replay expired SQL.

The latest visible physical backup remains 11 October 01:03:26 UTC, with Restore available; it predates the advisory migration and index. Restore rehearsal and Toshiba completion remain unverified. Preserve the exact migration, inputs, receipts and checkpoints, and include new work in a subsequent verified recovery point. This proposal does not authorize a database restore.

## Exclusions and cost

No paid OpenAI call, model-key use, deployment, public AI activation, protected merge, Shopify publication, real customer record, Naila change, source Fabric Master change, Fabric Intelligence/Room Visualiser change, pricing/stock/checkout change or supplier operation is included. Estimated new OpenAI cost: US$0. Use existing Supabase Pro resources only, with no paid service purchase. Final storage/I/O must be measured; the six-record trial is not a reliable linear cost benchmark.
