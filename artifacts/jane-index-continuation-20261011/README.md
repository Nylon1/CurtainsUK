# Jane bounded indexing continuation: implemented and locally tested

11 October 2026. Starting draft PR #169 source `38dd895f1b2619fcce934b2ea00abbe07d7241d5`. Protected production `c7ca2d0eff1c128386863536d4ce46a877d874a8` and independent PR #167 `851078c6` are unchanged.

## Completed implementation

The continuation connector port reuses the existing safe projection, index terms, source manifest, resource admission, job/receipt/gate schema and permission pattern. It resumes the established checkpoint and remains compatible with the original worker. It prepares one atomic six-identity transaction at a time, rather than replaying the first-batch bootstrap. No new framework, project, database branch, catalogue copy or migration was introduced.

Each approval binds a start offset, starting batch count and end offset. The prepared next scope is offset 6 to **126**, at most **20 batches / 120 new identities**. Those limits survive a process restart. Current-source/resource/checkpoint evidence expires after 60 seconds. SQL verifies current counters under locks, fails on target-row collisions, and restores the original role membership before commit. Exact SQL is persisted before submission; a separate result verifier checks durable hashes, receipt fields, counters and permissions before progress can continue.

The coverage correction excludes literal `unknown`, empty values and unavailable properties. New receipts carry version-2 field semantics inside the existing JSON column. The report excludes older raw-presence flags from known-value counts and reports their number explicitly. **The original six hosted receipts were not rewritten.** Catalogue term hashes, source records, encryption, Auth and consultation behaviour are unchanged.

## Verification

**109 local tests pass** in [tests.json](tests.json), including all existing migration, Auth, encryption, security, concurrency and 38 team/theme regression checks. Five new cases cover:

1. Unknown/missing-field treatment, including mixed arrays and zero pattern repeats.
2. Approval limits, wrong source identities, stale telemetry, scope overrun and changed checkpoints.
3. Twenty sequential synthetic batches, restart/replay refusal, original ACL restoration after every commit, exact receipt verification, mixed legacy/new coverage and direct-worker continuation from the same checkpoint.
4. An active competing lease, a null changed denominator, injected SQL-like supplier text, late transaction failure, permission rollback and interoperability with the existing rollback worker.
5. A final five-record page, requiring fresh matching manifest attestation before declaring complete.

These are local PostgreSQL tests, not a new hosted concurrency result. The previous hosted Auth/application trial remains separately documented. Scoped ESLint and Git whitespace checks pass. Two earlier test runs exposed a future-timestamp fixture and a read attempted after dropping to a role without schema access. Both were corrected without adding grants or weakening assertions; their initial logs are preserved.

## Current hosted facts, not execution claims

[Read-only preflight](read-only-preflight.json) verifies existing Pro / ACTIVE_HEALTHY, **6 index rows**, the same job at offset 6, 81 migration entries, no SET permission, 16/60 connections and zero competing active statements or lock waiters. The complete identity-only inventory remains **16,883**, hash unchanged at 19:17:08 UTC. This is not full descriptive knowledge coverage.

The refreshed last-60-minute dashboard showed CPU 11%, I/O 1%, memory 62% and disk 50%. These are aggregate observations and must be refreshed before execution. Latest visible physical backup remains 11 October 01:03:26 UTC. Restore rehearsal and Toshiba completion remain unverified. C: free space was 39.10 GiB; no restic/robocopy process was visible. No backup script, snapshot, evidence or worktree was altered or deleted.

**No hosted write, additional batch, migration, deployment or OpenAI call occurred in this increment.** Hosted coverage remains **6/16,883**. The [local scripted consultation](http://127.0.0.1:8789/) still returns HTTP 200 and remains mock-backed; no new hosted-index integration is claimed. New model cost is US$0; historical real-model receipts remain US$0.132574.

## Owner review

[Exact scope, permission sequence, stop conditions and rollback procedure](APPROVAL_REVIEW.md). [120 named identities and implementation hashes](continuation-proposal.json). The original approval covered one completed six-record transaction. This review package makes the next, larger scope concrete; it has not yet been executed or marked approved.

Fresh model-budget approval and a replacement key, key/password rotation confirmation, human design scoring, privacy/operations review, physical iPhone Safari, spoken screen-reader testing and a later verified backup remain separate requirements. PR #167 and Jane's public activation remain independent release decisions.

[Exact changed files](CHANGED_FILES.txt).
