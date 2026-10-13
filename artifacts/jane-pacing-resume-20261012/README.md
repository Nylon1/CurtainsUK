# Verified 120-ID canary and scoped continuation, 12 October 2026

## Current milestone: 120-ID canary independently verified

On 12 October at 05:20:55 UTC, independent hosted readback confirmed **120/11,517 eligible identities**, **11,397 remaining**, **121 total search rows**, **115 new eligible rows** and **five historical eligible no-ops**. All 120 hashes/receipts and the original six rows/job/receipts reconcile exactly. Original permissions are restored. Migration history remains 81 entries, latest `20261011180354`. The completed canary is durably recorded; continuation has not started in this evidence snapshot.

The latest invocation completed 16 six-ID transactions from offset 24 to 120 using the stricter 60-second freshness and ten-second batch limits. Its approximate source-through-fsynced-readback durations were 4.078–6.987 seconds. All immediate post-batch resource checks passed. Peak CPU was 36.25%, memory 78.82%, disk 78.59%, with 23 connections. These observations do not imply spare capacity is unlimited. Database size was 700,222,611 bytes and isolated advisory tables/indexes 1,007,616 bytes. No locks, deadlocks or new migration were observed. The discontinued historical fabric still returns retail HTTP 404.

New owner instructions approve [latest genuine host sample age up to 180 seconds](https://github.com/Nylon1/CurtainsUK/pull/169#issuecomment-6118103282) and [end-to-end batch time below 20 seconds](https://github.com/Nylon1/CurtainsUK/pull/169#issuecomment-6118124996), solely for the exact approved one-time population/job. Genuine distinct counter windows remain at most 120 seconds. Source/publication/checkpoint/prerequisite and SQL/error freshness remain 60 seconds. SQL statement/lock limits stay 3 seconds/500 ms; pressure gates, six IDs, five-second pacing, 20 batches/invocation, exact readbacks, fsynced journal and transaction-local grants are unchanged. General/default policies remain 60 seconds/ten seconds. **40 targeted tests passed**, including the new exception boundaries and unchanged safeguards.

The prepared continuation binds existing job `ac425f78-f6ec-4623-97bb-df8763d79d5a` at offset 120, the independently verified canary and the original shared journal. Latest publication reconciliation again matched the exact 11,517 approved identities and excluded 273 unpublished candidates. Every live batch must still pass fresh admission. The hard stop remains **12 October 10:00 UTC**. The heartbeat remains PAUSED to avoid duplicate execution; only the actual foreground operator can perform the work. No recurring refresh was enabled.

Migration checksum is unchanged: `eeaf8c9da085277783a263c8caf28ac3e1e46dac472ad508d3cb18f584948a50`. Prepared continuation dependency checksum: `cb63197ad50775a539f8f722520054b6af21e023ef50042bed161a4c0d173766`. The canary executed earlier code `3ee2b389288817bee71e4ad13f22e22eb9d6e3cd1bc8e7bc43fb30b1e2690943`; historical evidence has not been relabelled as using the new limits.

Backup 1937679152, completed physical recovery point 12 October 01:11:28.231 UTC, satisfies the original approved recovery condition and is rechecked before every batch. Nylon1 owns recovery under the 24-hour RPO. It predates the new indexing commits; a later verified backup remains necessary. C: has approximately 39.09 GiB free. Toshiba completion remains unverified. No new migration, source mutation, deployment, paid AI call, public activation or merge occurred. PR #167 and all protected customer systems are unchanged.

## Evidence

- [Canary assessment](canary-review.json), [independent hosted readback](hosted-readback.json), [120 exact receipts](verified-receipts.json), [durable canary receipt](canary-receipt.json).
- [Executed canary operator](operator-binding.mjs), [prepared continuation operator](continuation-operator-binding.mjs), [continuation dependency manifest](continuation-execution-review.json).
- [40 passing targeted tests](approved-limits-tests.log), [quality checks](quality-checks.json), [exact changed files](changed-files.txt).

The earlier first-batch latency stop and offset-24 metrics stop remain preserved in their original evidence directories. No unknown transaction was retried. Browser, physical iPhone and spoken screen-reader evidence is unchanged by this operator-only update.
