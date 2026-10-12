# Verified continuation and concurrent-client safety stop

## Current state: 150 verified, paused on concurrent database activity

The approved continuation actually ran from the independently verified 120-ID canary. Five more six-ID transactions passed exact post-COMMIT readback and fsynced receipts, with approximate source-through-receipt times **5.051, 4.808, 4.215, 4.612 and 4.390 seconds**. Independent hosted reconciliation at **12 October 05:28:42.725 UTC** confirms **150/11,517 eligible identities**, **11,367 remaining**, **151 total search rows**, **145 new rows** and five eligible historical no-ops. All 150 hashes, receipt fields and before-images reconcile against the 25 prepared plans. The original six rows/job/receipts and permissions remain exact.

At **05:27:50.273 UTC**, the next admission raised **INDEX_RESOURCE_STOP** because **one other active database client** was observed. The existing operator conservatively treats any other active client as potential overlap. Actual supplier refresh count was zero, the source cache was clean, errors/locks/deadlocks were zero, and connections were 23/60. Genuine host measurements were CPU **8.97%**, I/O **5.28%**, memory **74.45%**, disk **78.59%**, all within their existing thresholds. The other client's purpose and duration were not captured; do not call this a confirmed supplier refresh or host pressure breach.

The operator exited before preparing or submitting offset150–156. There is **no pending or ambiguous transaction**, no retry, rollback or automatic restart. The one-time follow-up remains **PAUSED**. The durable canary remains valid evidence of its completed assessment, while every future batch still needs fresh admission. Any resumed operation must review the overlap, reattest quiet-state and all source/publication/backup/resource conditions, and use **the same job at offset150** with its original journal. The approved 180-second host freshness, 120-second distinct counter window, below-20-second batch time, 3-second SQL and 500-ms lock timeouts are unchanged. The hard stop remains **12 October 10:00 UTC**.

Code and canary evidence were pushed in `10481fdee251c67a616e68fb9429b3f826c19db0`. **40 targeted tests passed**; this follow-up changes evidence/documentation only. Migration history is still 81 entries, latest `20261011180354`, and its checksum is unchanged. Database size was **700,279,955 bytes**, advisory tables/indexes **1,056,768 bytes**. Only 30 new knowledge rows were added in this continuation. No migration, source mutation, paid OpenAI call, deployment, activation, merge or recurring refresh occurred. PR #167 and all protected customer systems remain unchanged.

Backup 1937679152 was rechecked before each transaction under Nylon1's 24-hour RPO. It predates the new writes; a later verified database/workspace backup remains necessary. Toshiba completion remains unverified. No storage cleanup or backup change occurred.

## Evidence

- [Measurements and hashes](run-summary.json), [independent 150-ID readback](hosted-readback.json), [five continuation receipts](verified-continuation-receipts.json), [failed admission](failed-admission.json).
- [Executed dependency and operator binding hashes](execution-review.json). Executed operator source is preserved in the preceding [canary package](../jane-pacing-resume-20261012/continuation-operator-binding.mjs).
- [Exact changed files](changed-files.txt), [quality checks](quality-checks.json). The preceding [40-test log](../jane-pacing-resume-20261012/approved-limits-tests.log) applies to the unchanged implementation.

No extra hosted read was used to infer the identity of the now-historical concurrent client. Do not treat its later absence as proof that it was harmless. Retain the approved overlap rule pending review.
