# CurtainsUK specialist AI advisory platform

**Programme source of truth · 12 October 2026 · 5,016 eligible identities verified; until-complete indexing running; Jane publicly inactive**

## Verified milestone 3000

Independent hosted readback at **2026-10-12T10:52:46.814541+00:00** confirms **3,006 / 11,517 eligible identities**, with **8,511 remaining**. All **501** saved plans and verified receipts match the exact manifest prefix and hosted identity/content digests. The same until-complete operator is continuing. This is a progress snapshot, not full coverage.

The resumed binding has verified 40 batches. Source-through-receipt durations were 4358–8673 ms. Fresh backup/access, resource/error, source/publication, historical and permission gates remain active. No migration, source mutation, paid AI call, deployment, activation, merge or PR #167 change.

[Milestone evidence](../artifacts/jane-progress-3000-20261012/README.md).

## Verified milestone 4000

Independent hosted readback at **2026-10-12T12:16:58.976852+00:00** confirms **4,014 / 11,517 eligible identities**, with **7,503 remaining**. All **669** saved plans and verified receipts match the exact manifest prefix and hosted identity/content digests. The same until-complete operator is continuing. This is a progress snapshot, not full coverage.

The resumed binding has verified 208 batches. Source-through-receipt durations were 4267–18954 ms. Fresh backup/access, resource/error, source/publication, historical and permission gates remain active. No Jane migration, source mutation, paid AI call, AI deployment, public activation or PR #167 change. The separately owner-authorised PR #172 merge and single-file Shopify tracking release did not change this indexer or its source data.

[Milestone evidence](../artifacts/jane-progress-4000-20261012/README.md).

## Verified milestone 5000

Independent hosted readback at **2026-10-12T13:39:41.008675+00:00** confirms **5,016 / 11,517 eligible identities**, with **6,501 remaining**. All **836** saved plans and verified receipts match the exact manifest prefix and hosted identity/content digests. The same until-complete operator is continuing. This is a progress snapshot, not full coverage.

The resumed binding has verified 375 batches. Source-through-receipt durations were 4267–18954 ms. Fresh backup/access, resource/error, source/publication, historical and permission gates remain active. No Jane migration, source mutation, paid AI call, AI deployment, public activation or PR #167 change. The separately owner-authorised PR #172 merge and single-file Shopify tracking release did not change this indexer or its source data.

[Milestone evidence](../artifacts/jane-progress-5000-20261012/README.md).

## Until-complete continuation

On 12 October the owner explicitly instructed this thread: **“Proceed with no deadline.”** [Recorded instruction](https://github.com/Nylon1/CurtainsUK/pull/169#issuecomment-6122415089). This supersedes the prior 10:00 UTC cutoff for existing job `ac425f78-f6ec-4623-97bb-df8763d79d5a` and its exact 11,517-ID snapshot only. The last independently reconciled checkpoint is **2,766**, with **8,751 remaining**. No new job, full rebuild or recurring refresh is authorised.

Implemented a narrowly scoped until-complete approval. Ordinary population approvals still require a future expiry within 24 hours. Infinite deadlines are rejected without the exact project/job/snapshot/count and recorded direct instruction. The resumed job must already exist; a missing job cannot bootstrap. Completion still terminates the runner. Every SQL transaction remains bounded by fresh source/checkpoint/backup attestation expiry, at most 60 seconds, plus the existing 3-second statement and 500 ms lock timeouts. No credential lifetime, 24-hour backup RPO, resource threshold, source/publication check, canary, concurrency control, pacing or batch bound changed.

**45 focused tests passed**, including actual local PostgreSQL execution, grant restoration, concurrency, completed traversal, scoped no-deadline validation, fresh-evidence expiry, bounded host waiting and recovery failures. Publication reconciliation again matches exactly 11,517 identities, with 273 unpublished candidates excluded and no unmapped publications. Migration bundle checksum remains unchanged. New dependency checksum: `39b6fd76b4c8ff4f8e2827557cba8989632d93fb18b40c882d13d0915cb0c782`.

The new private operator binding passed its read-only hosted probe at 2026-10-12T10:33:50.585Z. Exact next-six identity, retail/publication, restored grants, historical state, backup and genuine resource checks passed with zero hosted writes. The first resumed transaction is now verified at **2026-10-12T10:36:11.611Z**, advancing the same job to **2,772**. The operator is actively continuing; later receipts are recorded in the original journal. The same original fsynced journal and all historical evidence are retained. The heartbeat remains paused to avoid duplicate operators; the foreground bridge is the execution path. No migration, source mutation, paid AI call, deployment, public activation, merge or PR #167 change.

[Implementation and evidence](../artifacts/jane-until-complete-20261012/README.md).

## Previous deadline checkpoint

The one-time operator reached its explicit **12 October 10:00 UTC deadline** and exited. The final transaction committed at **09:59:58.838 UTC**, with its fsynced verified receipt at **09:59:59.658 UTC**. Independent hosted readback at **10:00:47 UTC** confirms **2,766 / 11,517 eligible identities** and **8,751 remaining**. This population is incomplete. The operator process has exited, the journal has no pending write or lock, and the one-time heartbeat remains PAUSED. No continuing execution is claimed.

All **461** prepared plans and verified receipts match the exact approved manifest prefix without duplicates. Hosted identity and content digests match the saved plans; all 2,766 current index hashes match their receipts. There are 2,761 new eligible rows, five unchanged eligible historical rows and one separately preserved historical excluded row, for 2,767 total search rows. The original six-row job, rows and receipts remain exact, and original permissions are restored.

The identity-query correction in `242a2fd3` completed **150 batches / 900 identities** after its verified switch at 1,866. Source-through-receipt time was 4,674–10,175 ms. Admitted peak CPU was 49.714%, I/O 39.300%, memory 79.924%; every admitted sample was below the unchanged limits. These observed samples do not establish unlimited capacity.

A temporary monitoring backend failure at 2,118 and a read-only operator response timeout at 2,412 were diagnosed and exactly reconciled before restarting the same job. A later database error window held writes at 2,676; its cause was not attributed to Jane. The unchanged clean-error gate subsequently passed, and actual continuation reached 2,682 and beyond. No ambiguous write was retried and no threshold was raised.

The stop code was `INDEX_POPULATION_APPROVAL_REQUIRED` after the approval expired. [Owner instruction 6118449547](https://github.com/Nylon1/CurtainsUK/pull/169#issuecomment-6118449547) explicitly retains the 10:00 UTC deadline unless separately extended. The requested extension had no recorded approval at the final instruction check. **Next required approval: extend this same one-time job's execution window.** Resume from 2,766 after refreshing all gates and binding the approved new expiry; never create a replacement job, reset the checkpoint or replay completed records.

Protected production remains `c7ca2d0eff1c128386863536d4ce46a877d874a8`. Migration history remains 81 entries, latest `20261011180354`. Database size is 705,678,483 bytes; advisory tables/indexes 6,078,464 bytes. C: has 40,693,493,760 bytes free. Backup 1937679152 was reverified COMPLETED at 10:01:14 UTC, with recovery point 12 October 01:11:28.231 UTC, physical/WALG and no PITR. It remains within Nylon1's 24-hour RPO but predates these writes. A later verified database/workspace backup is required; Toshiba completion remains unverified.

Only the approved advisory indexing writes occurred. No migration, canonical catalogue mutation, supplier operation, paid AI call, deployment, public activation, merge or PR #167 change. Jane remains publicly inactive. Previously recorded tests remain preserved: the latest focused identity/PostgreSQL/recovery suite passed 9 tests; this evidence-only follow-up adds independent hosted and journal verification, not a new mock test claim. The original 4–6-hour estimate was not achieved. Between the first and last repaired receipts, 894 additional identities took 78.0545 minutes including holds and recovery interruptions. At that observed pace, the remaining 8,751 would take roughly 13 further hours. This is a provisional estimate, not a completion promise; changing conditions can alter it. Any continued run needs a newly approved time window and valid monitoring access throughout, and must stop before either expires. Additional OpenAI usage cost for this indexing work was US$0.

[Exact final evidence](../artifacts/jane-deadline-20261012/README.md).

## Previous milestone: second thousand verified

Independent hosted readback at **12 October 08:52:15 UTC** confirms **2,016 / 11,517 eligible identities**, 2,016 matching index/receipt hashes, and 2,017 total knowledge rows. All 336 saved plans and receipts match the exact manifest prefix without duplicate IDs. The same operator is continuing. This is a progress snapshot, not completed coverage.

The source lookup correction in `242a2fd3` has completed 25 verified batches in this snapshot. Source-through-receipt times were 4674–10175 ms, below the unchanged 20-second ceiling. Full error, pressure, activity, backup and eligibility checks remain active. Earlier focused tests and diagnostic plans are preserved; no additional test campaign was needed for this evidence update.

Protected production remains `c7ca2d0eff1c128386863536d4ce46a877d874a8`. Migration history remains 81 entries, latest `20261011180354`. Database size is 704,097,427 bytes; advisory tables/indexes total 4,612,096 bytes. C: has 41,059,041,280 bytes free. Backup 1937679152 remains the checked recovery point under Nylon1's 24-hour RPO; a later backup is needed for these new writes. Toshiba completion remains unverified. No migration, source mutation, paid AI call, deployment, public activation or PR #167 change. The 10:00 UTC deadline remains pending separate extension.

[Milestone evidence](../artifacts/jane-2000-20261012/README.md).

## Direct identity lookup restored

At **1,866 / 11,517**, the operator switched at a verified read-only recovery wait with no pending write or journal lock. Independent readback confirmed all historical records and permissions unchanged. The new read-only probe passed, then the same job actually resumed beyond1,866. Latest receipt in this evidence snapshot: **1914** at **2026-10-12T08:44:38.356Z**.

Hosted query plans identified the recurring source-lookup problem: encoded ID expressions inherit the **C collation**, while the valid existing fabric identity index uses **default**. PostgreSQL therefore scanned the broader eligibility index and filtered fabric IDs afterward. Strictly validated ASCII identity literals preserve the approved IDs and permit direct use of the existing primary key. No index, schema, source record, eligibility rule or generated write plan was changed.

The estimated plan cost dropped from1,735.85 to30.08. One bounded six-ID execution took20.825ms (planning24.557ms), with104 shared-buffer hits and zero disk reads. This sample does not establish whole-run throughput or cold-cache performance. **Nine focused tests passed**, including rejection of SQL syntax/control characters, all11,517 manifest IDs, local PostgreSQL result/order/null equivalence, index usage, timeout recovery and retail recovery. The canonical source-query fields are unchanged. All pressure, source/publication, supplier, ownership, backup, timeout and grant-restoration gates remain active.

[Exact plans, tests, checksums and changed files](../artifacts/jane-identity-lookup-repair-20261012/README.md).

## Read-only timeout recovery at 1,560

A bounded source read was cancelled by the unchanged three-second statement timeout. The last committed checkpoint and original history/permissions reconciled exactly; no next-batch write was pending. Added narrow recovery only for a confirmed timeout of one read-only transaction. Full admission, the clean error window and exact readback remain required. Writes, mixed transactions, access errors and ambiguity cannot be retried. **12 focused tests passed.** The first hosted read-only probe met database gates but received a Shopify profile503; its149-second retry delay was honoured. The subsequent read-only hosted probe passed with zero writes, all six live profiles available, and exact source/checkpoint/permission evidence. The repaired population operator is resuming from1560. [Evidence and exact changed files](../artifacts/jane-read-timeout-recovery-20261012/README.md).

## First 1,000 milestone: continuing

Independent hosted readback at **12 October 07:08:34 UTC** confirms **1,008 / 11,517 eligible identities**, 1,008 matching current/receipt hashes and 1,009 total knowledge rows. All 168 saved plans and receipts match the exact approved manifest prefix without duplicate IDs. Five eligible historical records remain no-ops; the sixth historical excluded record is preserved and must not be offered for purchase. The operator is continuing the same job; this is a progress snapshot, not completion.

Two later interruptions were recovered after exact read-only reconciliation: a read-only operator response timeout at546, then a failed read-only source lookup at978. No pending write existed in either case. The source reread succeeded; monitoring subsequently identified one SQLSTATE57014 cancelled statement. Writes remained blocked until the five-minute error window was clean. Temporary resource/activity holds continue to reconcile and recover automatically without raising limits or replaying uncertain writes.

Migration history is unchanged at81 entries, latest20261011180354. Database size is702,008,467 bytes; advisory tables/indexes total2,678,784 bytes. Completed backup1937679152 remains the recovery point checked before each batch under Nylon1's24-hour RPO. It predates these writes, so a subsequent verified backup is still required. C: free space was41,532,203,008 bytes; Toshiba completion remains unverified. No migration, source mutation, deployment, paid AI call, public activation or PR167 change. The10:00UTC deadline remains pending explicit extension.

[Milestone evidence](../artifacts/jane-first1000-20261012/README.md).

## Retail read recovery added at verified checkpoint 246

The repaired overlap operator committed 16 batches from 150 to **246**, and recovered automatically through three short activity holds using exact read-only reconciliation. At05:57:23 UTC a catalogue/profile status check failed before the next write. The old binding did not capture the failing HTTP status. A bounded independent reread of all six next IDs returned **HTTP200**, exact identities, matching canonical profiles and browse/launch eligibility. Last committed receipt, checkpoint246, original history and permissions were independently reconciled.

The focused follow-up adds retryable read-only holds for HTTP429/5xx and explicit network timeout/reset failures. It honours Retry-After, waits for all parallel read ports to settle, reconciles the last exact commit and re-runs complete fresh admission. HTTP404/400/401/403, redirects, changed eligibility/identity and integrity failures remain closed. No failed write is replayed. **Nine focused tests passed**. [Evidence](../artifacts/jane-retail-recovery-20261012/README.md). No migration, source change, paid API call, threshold increase or public activation. The10:00UTC deadline remains pending explicit extension.

## Previous implementation: overlap correction and recoverable holds

The owner directed a focused correction in [PR comment6118449547](https://github.com/Nylon1/CurtainsUK/pull/169#issuecomment-6118449547), then explicitly instructed this thread to repair temporary safety issues and keep proceeding. This authorises the narrow correction below and read-only recovery of temporary holds. It does not waive pressure thresholds, uncertain commits, access/integrity checks or the separately retained10:00UTC deadline.

The operator no longer calls every active client a supplier refresh. It uses sanitised PostgreSQL role/application/state/age/wait, transaction and lock evidence. Observed customer PostgREST and platform exporter SELECT/WITH reads under3 seconds may coexist only without write XIDs, non-read relation locks, advisory locks, blocking or job identity. Unknown short clients trigger a read-only drain; prolonged or conflicting activity blocks admission. Query text and customer parameters never leave PostgreSQL. Explicit supplier recent/running checks are independent and retained.

Temporary activity, load or cached-metric holds stop all writes, reconcile the exact latest committed six-ID receipt against the original fsynced journal, wait5–15 seconds, then repeat complete admission. A pending/ambiguous write, changed record, permission issue, missing metadata, access failure or20-second batch breach cannot be automatically resubmitted. All six-record, five-second pacing,20-batch,3-second SQL,500-ms lock,180-second freshness and120-second counter-window rules remain.

**12 targeted tests passed**, including the actual local PostgreSQL metadata query and transport recovery tests. The existing hosted checkpoint was freshly reconciled at **150/11,517**, with151 total search rows and original history/permissions exact. Full live publication again matched11,517 IDs. Repaired execution is not claimed from preparation; the actual operator probe and verified receipts establish liveness. [Focused diff/evidence](../artifacts/jane-overlap-repair-20261012/README.md).

## Previous state: 150 verified, paused on concurrent database activity

The approved continuation actually ran from the independently verified 120-ID canary. Five more six-ID transactions passed exact post-COMMIT readback and fsynced receipts, with approximate source-through-receipt times **5.051, 4.808, 4.215, 4.612 and 4.390 seconds**. Independent hosted reconciliation at **12 October 05:28:42.725 UTC** confirms **150/11,517 eligible identities**, **11,367 remaining**, **151 total search rows**, **145 new rows** and five eligible historical no-ops. All 150 hashes, receipt fields and before-images reconcile against the 25 prepared plans. The original six rows/job/receipts and permissions remain exact.

At **05:27:50.273 UTC**, the next admission raised **INDEX_RESOURCE_STOP** because **one other active database client** was observed. The existing operator conservatively treats any other active client as potential overlap. Actual supplier refresh count was zero, the source cache was clean, errors/locks/deadlocks were zero, and connections were 23/60. Genuine host measurements were CPU **8.97%**, I/O **5.28%**, memory **74.45%**, disk **78.59%**, all within their existing thresholds. The other client's purpose and duration were not captured; do not call this a confirmed supplier refresh or host pressure breach.

The operator exited before preparing or submitting offset150–156. There is **no pending or ambiguous transaction**, no retry, rollback or automatic restart. The one-time follow-up remains **PAUSED**. The durable canary remains valid evidence of its completed assessment, while every future batch still needs fresh admission. Any resumed operation must review the overlap, reattest quiet-state and all source/publication/backup/resource conditions, and use **the same job at offset150** with its original journal. The approved 180-second host freshness, 120-second distinct counter window, below-20-second batch time, 3-second SQL and 500-ms lock timeouts are unchanged. The hard stop remains **12 October 10:00 UTC**.

Code and canary evidence were pushed in `10481fdee251c67a616e68fb9429b3f826c19db0`. **40 targeted tests passed**; this follow-up changes evidence/documentation only. Migration history is still 81 entries, latest `20261011180354`, and its checksum is unchanged. Database size was **700,279,955 bytes**, advisory tables/indexes **1,056,768 bytes**. Only 30 new knowledge rows were added in this continuation. No migration, source mutation, paid OpenAI call, deployment, activation, merge or recurring refresh occurred. PR #167 and all protected customer systems remain unchanged.

Backup 1937679152 was rechecked before each transaction under Nylon1's 24-hour RPO. It predates the new writes; a later verified database/workspace backup remains necessary. Toshiba completion remains unverified. No storage cleanup or backup change occurred.

[Continuation and stop evidence](../artifacts/jane-resource-stop-20261012/README.md).

## Previous milestone: 120-ID canary independently verified

On 12 October at 05:20:55 UTC, independent hosted readback confirmed **120/11,517 eligible identities**, **11,397 remaining**, **121 total search rows**, **115 new eligible rows** and **five historical eligible no-ops**. All 120 hashes/receipts and the original six rows/job/receipts reconcile exactly. Original permissions are restored. Migration history remains 81 entries, latest `20261011180354`. The completed canary is durably recorded; continuation has not started in this evidence snapshot.

The latest invocation completed 16 six-ID transactions from offset 24 to 120 using the stricter 60-second freshness and ten-second batch limits. Its approximate source-through-fsynced-readback durations were 4.078–6.987 seconds. All immediate post-batch resource checks passed. Peak CPU was 36.25%, memory 78.82%, disk 78.59%, with 23 connections. These observations do not imply spare capacity is unlimited. Database size was 700,222,611 bytes and isolated advisory tables/indexes 1,007,616 bytes. No locks, deadlocks or new migration were observed. The discontinued historical fabric still returns retail HTTP 404.

New owner instructions approve [latest genuine host sample age up to 180 seconds](https://github.com/Nylon1/CurtainsUK/pull/169#issuecomment-6118103282) and [end-to-end batch time below 20 seconds](https://github.com/Nylon1/CurtainsUK/pull/169#issuecomment-6118124996), solely for the exact approved one-time population/job. Genuine distinct counter windows remain at most 120 seconds. Source/publication/checkpoint/prerequisite and SQL/error freshness remain 60 seconds. SQL statement/lock limits stay 3 seconds/500 ms; pressure gates, six IDs, five-second pacing, 20 batches/invocation, exact readbacks, fsynced journal and transaction-local grants are unchanged. General/default policies remain 60 seconds/ten seconds. **40 targeted tests passed**, including the new exception boundaries and unchanged safeguards.

The prepared continuation binds existing job `ac425f78-f6ec-4623-97bb-df8763d79d5a` at offset 120, the independently verified canary and the original shared journal. Latest publication reconciliation again matched the exact 11,517 approved identities and excluded 273 unpublished candidates. Every live batch must still pass fresh admission. The hard stop remains **12 October 10:00 UTC**. The heartbeat remains PAUSED to avoid duplicate execution; only the actual foreground operator can perform the work. No recurring refresh was enabled.

Migration checksum is unchanged: `eeaf8c9da085277783a263c8caf28ac3e1e46dac472ad508d3cb18f584948a50`. Prepared continuation dependency checksum: `cb63197ad50775a539f8f722520054b6af21e023ef50042bed161a4c0d173766`. The canary executed earlier code `3ee2b389288817bee71e4ad13f22e22eb9d6e3cd1bc8e7bc43fb30b1e2690943`; historical evidence has not been relabelled as using the new limits.

Backup 1937679152, completed physical recovery point 12 October 01:11:28.231 UTC, satisfies the original approved recovery condition and is rechecked before every batch. Nylon1 owns recovery under the 24-hour RPO. It predates the new indexing commits; a later verified backup remains necessary. C: has approximately 39.09 GiB free. Toshiba completion remains unverified. No new migration, source mutation, deployment, paid AI call, public activation or merge occurred. PR #167 and all protected customer systems are unchanged.

[Canary evidence and exact files](../artifacts/jane-pacing-resume-20261012/README.md).

## Previous milestone: resumed transport verified, metrics freshness stop

From PR #169 `90a6a078`, the owner authorised resumption following the latency review. The operator now submits the unchanged transaction and a separate post-COMMIT read-only verification in one connector request, with exact fsynced wire hashes and no blind retries. **28 targeted local tests passed**, including real local PostgreSQL, grant restoration, ambiguous responses and the unchanged ten-second limit. [Implementation and evidence](../artifacts/jane-transport-resume-20261012/README.md).

Fresh publication reconciliation again matched **11,517** approved IDs. Existing job `ac425f78-f6ec-4623-97bb-df8763d79d5a` resumed from offset 6 and committed three more six-record transactions. Exact verification passed at **12, 18 and 24**, with approximate end-to-end durations **7.569, 4.850 and 4.905 seconds**. The existing historical job/six rows remain exact and permissions were restored after every transaction. Independent read-only reconciliation confirms **24/11,517 eligible coverage**, **11,493 remaining**, **25 total search rows**, five unchanged eligible historical rows and 19 new rows across this eligible job. The **120-ID canary is incomplete**, with 96 still required.

At **04:51:57.471 UTC**, the post-batch check raised `STALE_HOST_METRICS`: the latest genuine sample was **60.313 seconds old**, beyond the unchanged 60-second freshness rule. The preceding genuine sample interval was 74.154 seconds, within the approved 120-second window. No fifth eligible transaction was attempted. The operator exited, the heartbeat remains **PAUSED**, and no retry or rollback occurred.

Next: prepare bounded read-only pacing before admission so each batch has enough genuine sample freshness for its work and immediate post-check. Do not relax the 60-second freshness or ten-second duration gates. Any resumed operation must reattest all prerequisites and continue this job at **offset 24**, not create another job. The authorised hard stop remains **12 October 10:00 UTC**. The short observed commit cadence suggests roughly 9–10 hours for the remaining scope before pauses, so the original 4–6-hour estimate is not established.

No new migration, paid model call, source mutation, deployment, public activation or merge occurred. PR #167 and all protected customer systems remain unchanged. Completed database backup `1937679152` meets the owner's original recovery condition but predates these new commits; exact private plans and readbacks are preserved. Toshiba completion remains unverified. C: had **39.19 GiB free** after verification. New work still needs a later verified backup.

## Previous milestone: first hosted eligible batch verified, latency stop

The completed physical backup `1937679152`, recovery point **12 October 01:11:28.231 UTC**, satisfied the owner's post-write recovery requirement. Fresh publication reconciliation matched all **11,517** approved IDs; CPU, I/O, memory, disk, connections, errors, locks, supplier quiet-state, historical records and permissions passed admission. The existing Supabase connector submitted exactly one six-identity transaction, at **01:37:48 UTC**.

Eligible job **`ac425f78-f6ec-4623-97bb-df8763d79d5a`** has a verified checkpoint of **6**, comprising **five unchanged existing rows and one new row** (`pt-1227-634`). The database now contains **seven** index rows, including the preserved discontinued historical identity outside the eligible scope. Eligible coverage is **6/11,517**, with **11,511 remaining**. The original six rows/job/receipts remain exact, and transaction-local role permissions were restored. The 120-ID canary is **incomplete**.

The runner then raised **`INDEX_BATCH_LATENCY_STOP`**. End-to-end time was approximately **11.36 seconds**, above the unchanged **10-second** limit. This includes source and live-page reads, local/connector transport, the write and exact readback; it is not evidence of an 11-second database query. The one-time automation is **PAUSED**, both local processes have exited, and no second write, retry, rollback or continuation occurred. A separate read-only reconciliation confirms the checkpoint and all six hashes. [Run report and evidence](../artifacts/jane-overnight-stop-20261012/README.md).

Next: review and reduce operator transport overhead while retaining the same latency and freshness limits. Any resumed operation must use this job's offset **6**, recheck all admission conditions and finish the remaining 114 canary identities before considering continuation. Do not create another eligible job or replay the first transaction. No automatic restart is scheduled. The historical 4–6-hour estimate is unvalidated by this partial canary.

Existing local test evidence is preserved; a new offline exact journal/readback verification passed. No new paid AI call, migration, public activation, deployment, merge or customer-system change occurred. PR #167 remains independent. The current backup predates this new index transaction; its exact fsynced plan and verified receipt are retained for recovery, and a later verified backup is still needed for new local work.

## Previous milestone: overnight follow-up active

The [new owner instruction](https://github.com/Nylon1/CurtainsUK/pull/169#issuecomment-6114221325) permits genuine host counter windows up to 120 seconds for this exact one-time eligible population. The latest source sample must still be no older than 60 seconds. All other safety limits remain unchanged. **22 targeted local checks pass**; the previous 138-check evidence is preserved. A live 66.55-second exporter window passed host thresholds at 22:06 UTC: CPU 2.66%, I/O busy 0.74%, memory 63.63%, root disk 78.61%, data disk 49.97%.

A bounded read-only backup watcher is running locally, and the Codex thread follow-up `jane-one-time-overnight-indexing` is ACTIVE every ten minutes until 12 October 10:00 UTC. This is not an ongoing database refresh schedule. **The database indexing worker has not started.** The current completed backup still predates Jane's writes. The operator must verify a newer completed recovery point, refresh every admission condition, then run the approved 120-ID canary and healthy continuation without another routine approval. The watcher cannot write SQL; execution uses the existing Codex Supabase connector. Laptop power, wakefulness, network and the running Codex app remain necessary. [Run state and exact continuation procedure](specialist-advisory/JANE_OVERNIGHT_RUN.md), [new evidence](../artifacts/jane-overnight-readiness-20261011/).

## Previous milestone: secure monitoring access verified

The replacement scoped token reads Supabase backups and host metrics successfully. It is encrypted outside Git; the owner confirmed revocation of the token posted in chat. The owner also accepted recovery responsibility and a maximum backup age of 24 hours. [Current preflight report](specialist-advisory/JANE_MONITORING_PREFLIGHT.md).

The latest completed physical backup returned at 21:29 UTC is still **11 October 01:03:26 UTC**, before Jane's 18:55:39 UTC writes. Host gauges are available, but repeated payloads were cached and observed distinct source samples were **68.18 seconds apart**, beyond the unchanged 60-second window. The new read-only metrics adapter rejects these as admission evidence. **138 local checks pass**, including nine telemetry checks.

Read-only hosted checks confirm six search rows, the original checkpoint of six, 81 migrations, no advisory schedules and unchanged permissions. No eligible job or canary has started. A newer recoverable backup and valid current short-window telemetry remain required. Existing conditional approval covers the 120-ID canary and healthy eligible continuation once all safeguards pass, without repeated batch approvals. No production deployment, publication, model call or unrelated change occurred. [New evidence](../artifacts/jane-monitoring-access-20261011/). Earlier milestones below are historical.

## Previous milestone: eligible execution binding complete locally

The [20:34 UTC owner go-ahead](https://github.com/Nylon1/CurtainsUK/pull/169#issuecomment-6113454744) authorises clearing prerequisites, a monitored first 120 eligible IDs, then healthy bounded continuation under one approval. From PR #169 `3eb42b82`, the separate-job SQL connector now starts at a null cursor, verifies five unchanged existing rows without rewriting them, preserves the historical job/receipts, restores transaction-local permissions before COMMIT, and verifies exact durable outcomes. The journaled runner enforces the canary assessment, six-record transactions, five-second gate, 20-batch invocations, safety stops and progress reports every 1,000. [Implementation and current readiness](specialist-advisory/JANE_ELIGIBLE_EXECUTION.md).

**129 local tests pass.** Real local PostgreSQL tests exercise bootstrap, no-ops, rollback, collisions, lease protection, replay and permissions. A synthetic 11,517-ID run completes 1,920 batches in 96 invocations; this does not establish hosted coverage or throughput. No hosted eligible job or canary has started. The original six-row job remains unchanged; only five rows overlap the eligible scope.

**Remaining mandatory prerequisites:** latest visible backup is still 11 October 01:03:26 UTC, before the 18:55 writes; a newer recoverable backup, named recovery operator and accepted RPO are needed. Database reports do support a custom one-minute interval, but CPU/disk telemetry fails to load and Overview reverts to daily aggregates. Appropriate current metrics access and secure operator credential verification remain unavailable. Read-only SQL shows ACTIVE_HEALTHY, 699,780,243 database bytes, 16/60 connections, zero lock waiters/deadlocks and unchanged migration history. These observations do not replace missing host metrics.

The owner's existing conditional approval covers routine healthy continuation once all safeguards pass. No additional batch approval, new migration, source change, paid call, schedule, deployment, publication or public activation is included. PR #167 remains independent. The [evidence directory](../artifacts/jane-eligible-execution-20261011/) preserves test logs, code checksum, historical baseline, current resource observations and exact changed files. Older milestones below are historical records, not current execution instructions.

## Previous milestone: eligible-only population scope

The [19:48 UTC owner instruction](https://github.com/Nylon1/CurtainsUK/pull/169#issuecomment-6113025170) supersedes all all-Master continuation proposals below. **Do not execute the old offsets 6–126 plan.** It included 39 discontinued identities. The owner conditionally authorises one eligible-only initial run, beginning with up to 120 eligible IDs, then bounded continuation without repeated routine approvals after successful checks. It does not waive backup, telemetry, source, permission or implementation review.

Fresh bounded read-only reconciliation found **16,883 historical Master IDs; 11,815 prepared Browse IDs; 11,790 selectable/visible/price-verified candidates; 11,517 exact IDs also published in Shopify's current native Fabric Profile sitemaps**. All 11,790 have a governed Browse price guide. The 273 unpublished candidates are explicitly excluded from this manifest. The published eligible snapshot overlaps **10,757** of the released Visualiser's 11,003 calibration identities; neither set substitutes for the other. [Exact manifest, overlap, evidence and blockers](specialist-advisory/JANE_ELIGIBLE_POPULATION.md).

The new operator-only manifest source binds policy, evidence and ID hashes, rechecks each six-ID page and refuses an all-Master cursor. Local PostgreSQL testing demonstrates a separate job with the existing worker, five no-op existing rows, preserved historical receipts and no duplicate search rows. The original six-row job remains unchanged remotely. `pt-1200-907` is discontinued and excluded; no destructive suppression or rollback ran. Existing retail revalidation remains purchase authority.

**122 local tests pass**, including all security/concurrency checks and 38 theme/team regressions. Live read-only retail checks return 404 for the discontinued row and suppress purchase cards for out-of-stock examples. The revised population needs 1,920 batches / 96 bounded invocations; 11,512 unique rows would be new. No full hosted coverage is claimed.

**No hosted writes in this increment.** Latest visible backup is still 01:03:26 UTC, before the 18:55 advisory writes; PITR is not enabled. Short-window CPU/I/O metrics and rotated operator credentials are not available/verified. The old connector port cannot bootstrap this new eligible job or handle the five existing rows, so its safe binding must be reviewed rather than reusing the old SQL. The reviewed local code and source hashes are in the new evidence directory. No new migration, schedule, deployment, paid call or public activation is included. Historical milestones retain their original counts and are not current execution instructions.

## Previous milestone: Fabric Knowledge integration preparation (all-Master execution scope superseded)

From PR #169 `faadb8b8`, the existing worker now has a journaled operator runner that resumes the approved range, verifies each commit and never blindly retries an ambiguous write. A changed-identity manifest adapter reuses existing jobs, receipts, hashes and the six-record worker; unchanged vectors are skipped. Search ranks genuine attribute matches using the existing GIN index, with six-result limits and separate retail eligibility. The optional hosted ranking function replacement and rollback are prepared but unapplied. [Full implementation, estimates and approval report](specialist-advisory/JANE_FABRIC_KNOWLEDGE.md).

**117 local tests pass**, retaining all migration, security, concurrency and 38 team/theme regression checks. The next prepared tranche remains exactly **120 new identities**, offsets 6–126, with at most 20 transaction-only SET/revoke sequences. Use the [new checksum-bound proposal](../artifacts/jane-knowledge-integration-20261011/continuation-proposal.json); its approval flags are false. No further hosted write, migration, schedule, deployment or paid call ran.

Read-only verification at 19:34 UTC confirms **6/16,883** indexed, 16,877 remaining, the unchanged identity hash, 81 migrations and zero advisory schedules. Remaining population requires **2,813 batches / 141 invocations**. The conditional estimate is 6–9 hours plus longer approval/resource pauses. Synthetic local storage measurements project about 62 MiB for search/initial receipts; allow 128 MiB for review and measure actual hosted growth. Current short-window telemetry and backup recovery evidence remain execution prerequisites.

Automatic change discovery is **not yet activated or proven complete**. Relevant updates can be supplied through verified publication/export ID lists; no timestamps or Browse dirty queue are scanned as a substitute for a durable complete feed. Deletions require reviewed tombstones. Complete capture, dependency fan-out and changes during population must be reconciled before claiming freshness. Missing properties and unverified supplier code mappings remain unknown. [Evidence and limitations](../artifacts/jane-knowledge-integration-20261011/README.md).

PR #167 remains independent. Jane's approved concise style, Naila, Fabric Intelligence, Room Visualiser, source fabric records, stock/supplier refreshes, pricing and commerce remain unchanged. No new project or product database was introduced. Historical milestones below preserve earlier observations.

## Previous milestone: bounded continuation ready for scope review

Starting from PR #169 `38dd895f`, the connector continuation port now resumes the existing job without replaying the first-batch bootstrap. It reuses the established projections, index terms, schema, checkpoint/gate and temporary-permission pattern. The next review scope names exactly 120 identities, in at most 20 six-record transactions, from offset 6 to 126. The approval range remains binding after restarts. [Implementation and test report](../artifacts/jane-index-continuation-20261011/README.md), [exact scope/permission review](../artifacts/jane-index-continuation-20261011/APPROVAL_REVIEW.md).

**109 local tests pass**, including migration, security, concurrency and all 38 team/theme regression checks. New cases verify 20 batches, late failure, original-permission restoration, replay refusal, final short pages and continued use of the original worker. No new hosted write or model call ran. Hosted coverage stays **6/16,883**, with unchanged 81-entry history and restored original permissions.

New field receipts now distinguish meaningful known values from literal `unknown` or missing data, using version metadata in the existing receipt JSON. Coverage reports exclude legacy presence flags from known-value counts and report those legacy receipts explicitly. The original six receipts, catalogue term hashes and canonical Fabric Master are unchanged. No migration is needed for this reporting correction.

Read-only checks reattested the unchanged 16,883-identity manifest at 19:17 UTC. Pro/ACTIVE_HEALTHY, 16/60 connections, zero lock waiters and no other active statements were observed. Hourly dashboard aggregates were CPU 11%, I/O 1%, memory 62%, disk 50%; these are not future execution admission. Latest visible backup remains 01:03:26 UTC, C: had 39.10 GiB free, and Toshiba completion/restore rehearsal remain unverified.

The first single-batch approval is complete. The larger 120-identity scope and up to 20 transaction-only role grants are prepared for explicit review. No further population, paid model test, deployment, publication or activation is implied. Historical milestones below retain their original observations.

## Previous milestone: first hosted six-identity indexing trial completed

The owner approved both the six-record scope and the transaction-only permission sequence. One batch committed at 18:55 UTC in existing Pro project `hqysjumypgeapgmqkcrx`, job `a6c0d329-935e-4c31-b8ef-71a52f6d9149`. [Executed report, exact SQL and evidence](../artifacts/jane-first-index-execution-20261011/README.md). Starting PR #169 source was `dee5227092bd243b408b9ddd65a0617580d0ecaf`; protected `c7ca2d0e` is unchanged.

Hosted coverage is **6/16,883 (0.03554%)**, with six matching hashes and receipts, checkpoint offset 6, one batch, `complete=false`, and a released gate. The original ADMIN-only indexer membership is restored; no SET privilege or new login persists. Canonical migration checksum and all 81 history entries are unchanged. Browser/service roles retain no advisory access, and consultation/usage/spending rows remain empty. No later batch is authorized or scheduled.

**14 hosted-receipt verification groups pass**, including four descriptive search results and a missing-result case. The unchanged implementation retains its **104 passing local tests**. The tested search uses GIN and took 0.177 ms execution with no physical or temporary reads; this six-record result is not a full-catalogue benchmark. Refreshed hourly resource aggregates were CPU 13%, I/O 2%, memory 66%, disk 50%; fresh SQL showed 16/60 connections and zero lock waiters.

Meaningful knowledge in this batch includes six colours/compositions/widths, two tones, five patterns and five textures. Pattern scale, validated descriptions, weight and care remain unknown for all six. Historical receipt presence flags can include literal `unknown` values; the new report distinguishes meaningful-value counts and does not silently rewrite receipts. Knowledge identities remain non-purchasable until the governed retail journey verifies eligibility.

Next review a bounded continuation from offset 6 with the existing monitored worker, fresh evidence and an explicit permission scope. No further indexing, deployment, model spending or customer activation follows from this trial. The latest visible physical backup still predates the advisory changes; Toshiba completion and restore rehearsal remain unverified. C: had 39.11 GiB free. Human design scoring, fresh model-budget/key approval, exposed-key retirement, physical iPhone and spoken screen-reader checks remain pending. PR #167 stays independent and unpublished, and PR #169 stays draft.

The following sections preserve earlier checkpoints; their zero-coverage and pending-permission statements are superseded by the executed receipt above.

## Previous milestone: first six-identity indexing trial prepared

The owner approved one bounded six-fabric batch after the hosted trial. [Current implementation and evidence](../artifacts/jane-first-index-batch-20261011/README.md) records a fresh matching 16,883-identity manifest, six narrow read-only source records and **104 passing local tests**. Hosted coverage remains **0/16,883**, with zero index jobs and unchanged 81-entry migration history.

Preflight found the connector's existing `postgres` membership in `advisory_indexer` is ADMIN=true, INHERIT=false, SET=false. The narrow-role write cannot run. A tested [transaction-only permission proposal](../artifacts/jane-first-index-batch-20261011/PERMISSION_REVIEW.md) adds and revokes only a self-granted SET membership inside the same transaction, asserting the original `supabase_admin` grant is unchanged. It requires explicit approval of that additional production permission. The six-record data approval is retained; no hosted grant or indexing write has occurred. New code is operator-only and preserves the existing resumable worker, checkpoint/rollback format and security boundaries.

## Previous milestone: approved synthetic hosted trial

The owner approved the protected mock trial and confirmed two dedicated Supabase Auth test users. [Current trial record](specialist-advisory/HOSTED_TRIAL.md) and [executed evidence](../artifacts/jane-hosted-trial-20261011/README.md) supersede earlier pending-trial statements below. **100 local tests, 14 protected Vercel HTTP checks and five additional hosted boundary groups pass.** Separately, two independent local application processes completed 14 checks against hosted Supabase, including seven ciphertext inspections. Concurrent Vercel requests alone do not prove distinct Vercel instances.

The consultation route now has a bounded TLS PostgreSQL adapter, exact-deployment signed trial grants and authenticated CSRF bootstrap. The protected API-only Vercel Preview is `dpl_6DWt8tqv6x9eRgcGxpeh7CA5sLsT`, built from `8cfff3883aad190a3174bc336bf20e0aba895904`. Vercel Authentication covers Preview only. The manually deployed project remains unlinked to Git; credentials were deployment-scoped. Real sign-out rejection, owner isolation, encrypted recovery/deletion, expiry, shared rates and simulated spending limits passed. No model call was made.

The trial is now closed. Both latest test sessions were signed out, synthetic consultation/usage/ledger rows were removed, and the temporary login was set NOLOGIN with runtime membership revoked. No trial connections remain. The two audit migrations are `20261011174507_jane_synthetic_trial_connection_20261011` and `20261011180354_jane_synthetic_trial_connection_closed_20261011`; the canonical advisory SQL checksum is unchanged. Final read-back shows 81 migration entries, 699,673,747 database bytes, 15 connections and zero lock waiters. The disabled temporary role is retained as an audit record, not usable access.

No paid model calls, production application deployment, source-data change, catalogue population, Shopify publication or PR #167/#169 merge occurred. Full descriptive coverage remains 0/16,883. The following sections preserve historical checkpoints and their original limitations.

## Previous milestone: private hosted advisory schema established

The owner approved the single-file merge and migration. [PR #170](https://github.com/Nylon1/CurtainsUK/pull/170) is merged after both required checks; protected HEAD is `c7ca2d0eff1c128386863536d4ce46a877d874a8`. Exactly one migration was applied to existing Pro project `hqysjumypgeapgmqkcrx`. Supabase recorded hosted version `20261011171354_jane_isolated_advisory`; its stored SQL is byte-for-byte identical to source file `20261011142747_jane_isolated_advisory.sql`, SHA-256 `eeaf8c9da085277783a263c8caf28ac3e1e46dac472ad508d3cb18f584948a50`. All 78 earlier history entries remain unchanged. Do not reapply the source filename or use a blanket CLI push; the API-generated hosted version mapping is explicit in the receipt.

[Execution report and next-stage requirements](../artifacts/jane-migration-execution-20261011/README.md), [receipt](../artifacts/jane-migration-execution-20261011/execution-receipt.json), [hosted verification](../artifacts/jane-migration-execution-20261011/verification-results.json).

All 15 metadata comparison groups pass: nine tables with RLS, 21 indexes, three invoker functions, 15 policies and three private NOLOGIN roles. Auth ACLs are unchanged; no advisory role has Auth schema access; browser/service roles have no advisory access; advisory is excluded from Data API schemas. All eight data tables remain empty, with only the approved coordination row present. Initial advisory relation/index storage is 280 KiB. Supabase security advisors report no advisory-schema findings.

An existing Browse refresh was left untouched and allowed to finish before submission. Project status remains ACTIVE_HEALTHY; postflight at 17:16 UTC shows 14 connections, zero active competing queries and zero lock waiters. The visible 01:03:26 UTC physical backup predates this migration, so a later recovery point is still required. Toshiba completion and restore rehearsal remain unverified.

**Completed:** exact protected migration, hosted object/ACL/history verification, local verification-query test. **Still pending:** hosted application Auth/revocation, restricted connection provisioning, encrypted application round trips, multi-instance concurrency, retention execution and protected synthetic deployment. Local 93-test evidence is preserved; it is not relabelled as hosted application testing.

PR #167 remains an independent draft, and Jane application PR #169 remains unmerged. No application deployment, catalogue population, real customer records, account provisioning, paid model calls, Shopify publication or public AI activation occurred. Descriptive coverage is still 0/16,883. Next prepare a concrete protected synthetic-only hosted trial package for separate approval; population and real-model evaluation budgets remain independent boundaries.

The following sections preserve earlier checkpoints. Their pending-migration statements are superseded by this executed receipt.

## Historical approval checkpoint: migration approved, release merge pending

The user has approved the exact corrected SQL checksum `eeaf8c9da085277783a263c8caf28ac3e1e46dac472ad508d3cb18f584948a50`. This approval is recorded and does not need to be requested again for unchanged SQL. **The database migration has not run.**

A separate [migration-only release PR #170](https://github.com/Nylon1/CurtainsUK/pull/170), candidate `134954ff7c942d099b8799fb3bd95667bf4e6440`, contains just the approved SQL file on protected base `3649c879a4a5ddf88c2093a4172d20fbc58cd265`. Both `curtainsuk-production-gate` and `protected-production-policy` pass. PR #167 and the broader PR #169 remain independent drafts. No worktree, backup or existing evidence was replaced.

The fresh read-only preflight confirms ACTIVE_HEALTHY, 699,214,995 database bytes, 17/60 connections, zero lock waiters, no advisory objects and unchanged 78-entry migration history. The latest visible physical backup remains 11 October 01:03:26 UTC. C: has 40.21 GiB free; no restic process is visible, but Toshiba completion remains unverified. [Approval, checks and preflight receipt](../artifacts/jane-migration-approval-20261011/README.md).

The remaining authorization is to merge the single-file PR #170 into the protected branch, under the user's separate merge boundary. After that, the unchanged database migration is already approved, subject to final execution preflight and exact-file history reconciliation. No application deployment, catalogue population, account provisioning, model spending or public activation is authorized by the migration approval.

## Previous milestone: corrected migration ready for owner review

[Jane Auth migration correction](specialist-advisory/JANE_AUTH_MIGRATION_FIX.md) is the current detailed record. Work starts from PR #169 `6d0890ab782d274ce5a0e82cac71494004f7eb18`. Protected HEAD remains `3649c879a4a5ddf88c2093a4172d20fbc58cd265`; independent PR #167 remains `851078c674ac2e9231e51dffbd5949ed4ea7c6d1`.

The protected Auth schema cannot be delegated by `postgres`. Jane now uses the official server-side Auth API and verified claims, with no Auth database role or protected-table dependency. The corrected five-part atomic migration creates only advisory objects: nine tables, 21 indexes, three invoker functions, 15 policies and three NOLOGIN roles. [Exact approval/rollback manifest](../artifacts/jane-auth-fix-20261011/MIGRATION_REVIEW.md), SHA-256 `eeaf8c9da085277783a263c8caf28ac3e1e46dac472ad508d3cb18f584948a50`. Earlier direct Auth grants and checksums below are superseded, not approved for execution.

**93 scoped tests pass locally**, including the original permission failure reproduced without superuser privileges, corrected migration/rollback, cryptographic SDK authentication with synthetic Auth responses, encryption, ownership, concurrency, recovery, rates/spend, indexing and Phase 1/theme regression. Hosted PostgreSQL/Auth verification remains pending. Profile, catalogue logic, full identity manifest (16,883), hosted descriptive coverage (0), encryption and incremental population controls remain unchanged.

Read-only preflight reverified Pro/ACTIVE_HEALTHY, 692,268,179 database bytes, 16/60 connections and zero lock waiters. Daily physical backup 11 October 01:03:26 UTC is visible; restore rehearsal and Toshiba completion remain unverified. C: is approximately 40.16 GiB free. Initial restic PID 20836 later disappeared, without proof of success. Preserve current historical evidence and include these changes in a later verified backup.

[Current local review](http://127.0.0.1:8789/auth-fix), [scripted Jane](http://127.0.0.1:8789/), [exact changed files](../artifacts/jane-auth-fix-20261011/CHANGED_FILES.txt). **Next approval:** the exact corrected migration on the existing project, subject to protected release policy and fresh preflight. No migration, indexing, deployment, merge, publication, customer activation or paid call ran. Hosted testing, model/human quality, old-key revocation, physical iPhone and spoken screen reader remain separate pending items. The following milestones preserve historical evidence and are not current Auth migration instructions.

## Historical milestone: Pro integration and exact migration readiness

[Jane Pro readiness](specialist-advisory/JANE_PRO_READINESS.md) is the current detailed record. Work starts from PR #169 `996d804f63bfcde48bd58d48a37598ead638451e`. Protected HEAD remains `3649c879a4a5ddf88c2093a4172d20fbc58cd265`; independent PR #167 remains `851078c674ac2e9231e51dffbd5949ed4ea7c6d1`. No production change has run.

The existing Supabase project `hqysjumypgeapgmqkcrx` is ACTIVE_HEALTHY on **Pro**. The earlier Free quota blocker below is superseded. Current database bytes are 692,268,179; the dashboard displays 2 GB provisioned disk, distinct from the plan's 8 GB allowance. The latest visible daily physical backup is 11 October 01:03:26 UTC; restore rehearsal and Toshiba completion remain unverified. Live resource charts are partly unavailable, so fresh per-batch telemetry is required before approved indexing.

**Exact permitted identity denominator: 16,883. Hosted descriptive index coverage: 0/16,883.** The bounded primary-key inventory took 12.4 ms with zero physical blocks read/written in that execution. The saved ID-only manifest and checksum are complete. All IDs passed local six-ID traversal tests. Five historical Master records and a separate 120-row synthetic fixture remain the descriptive indexing evidence; whole-Master field completeness and purchasable counts are unknown.

Implemented: checksum-bound source paging, fresh identity attestation, fail-closed resource monitoring, more detailed field coverage and exact-deployment protection binding. The six existing SQL files are assembled into a CLI-generated atomic migration with collision checks. Its exact local rollback/object/ACL tests pass. [SQL review manifest](../artifacts/jane-pro-readiness-20261011/MIGRATION_REVIEW.md), SHA-256 `2c78e6173d5e807890d7de229ad11002a552534b6e2b445819214832cf049d73`. The sole existing-object grant is read-only access to three Auth session columns for a new verifier role. No source records, job population, credentials, public API or schedules are changed.

**89 scoped local tests pass**, plus scoped lint. The refreshed mock suite completes 20 scenarios, 60 advice turns and three context/save/recover actions with no service errors. Jane's approved 40–90-word, no-em-dash profile remains unchanged. No new paid calls; previous ledger US$0.132574 preserved. Proposed fresh evaluation cap remains US$5 total/US$1 per consultation, requiring new approval and a new key. The owner's last confirmation says the old key still needs revocation.

Review the [working local gallery](http://127.0.0.1:8789/pro-readiness), [scripted Jane](http://127.0.0.1:8789/) and [implementation evidence/file list](../artifacts/jane-pro-readiness-20261011/IMPLEMENTATION.md). **Next approval:** the exact additive migration on the existing project, subject to fresh backup/resource/history preflight. Full population, protected hosted deployment, synthetic account setup, paid evaluation and public activation remain separate. Current Vercel protection is not configured. Hosted PostgreSQL/Auth tests, human design scores, physical iPhone and spoken screen reader checks remain pending. PR #167 is preserved with its own 20-file release/rollback procedure and requires a fresh live comparison before approved publication.

## Historical milestone: existing-project foundations and evaluation preparation

[Jane foundations readiness](specialist-advisory/JANE_FOUNDATIONS.md) is the current detailed record; [existing-project operator runbook](specialist-advisory/EXISTING_PROJECT_RUNBOOK.md) is the migration/indexing proposal. Older environment proposals below are superseded: use only existing Supabase project `hqysjumypgeapgmqkcrx`, with no separate project or branch. Work started from PR #169 `0f07dfab163406f065351cbfa9be090e16c063c2`. Protected HEAD remains `3649c879a4a5ddf88c2093a4172d20fbc58cd265`; PR #167 remains unchanged at `851078c674ac2e9231e51dffbd5949ed4ea7c6d1`.

Implemented and locally tested: global six-record index pacing, source reads outside SQL transactions, fenced commits, resumable checkpoints, strict upstream completeness, field coverage and bounded before-image rollback; separate runtime/indexer/retention roles; owner-scoped pooled access; a narrow Auth-session verifier; bounded all-owner retention; and an existing-project-only synthetic hosted composition gate. Six hashed review SQL files remain unapplied. Separate-process local tests now exercise the restricted runtime role. No production migration, population, route wiring or hosted test ran.

**Coverage is partial:** five historical Master records reindexed locally, not five newly read records. Current exact Master denominator is unknown; production identities indexed by this programme are zero. A separate 120-record synthetic fixture tests performance/recovery. Field completeness and limitations are in the coverage receipt. Supplier records, refreshes, canonical eligibility and the completed retail `browseGuide=1` correction are untouched.

Jane's approved `2.2.0-preview.1` concise, design-first style is preserved. The new v3 suite has 20 scenarios, 60 mock advice turns plus three context/save/recovery actions, all completed without service errors. Twelve historical blind comparisons and 24 blank human scorecards are ready. Revised real-model quality is **not yet established**; no fresh budget is approved and no paid calls occurred. Prior receipts remain US$0.132574. The owner confirms the exposed temporary key **still needs revocation**; this development does not use it.

**84 scoped tests pass**, plus scoped lint. Actual Chrome checks found no overflow at all five required widths. All six profiles, auto-opening previews and keyboard exit were exercised. Actual reduced-motion behaviour passed with the OS setting temporarily changed and restored. Physical iPhone/touch, spoken screen reader and confirmed hidden-tab timing remain pending. The earlier 20-file live-theme comparison is preserved, not represented as newly repeated; rerun it before any approved publication.

Read-only Supabase dashboard evidence shows the existing Free-plan database at **0.708/0.5 GB (142%)**. Capacity is a hosted-migration/indexing blocker; no purchase or cleanup was made. C: began at 40.43 GiB free; the initially active restic process later disappeared, without proof of successful backup. Preserve all evidence and include this milestone in a subsequent verified backup.

Review [the running local gallery](http://127.0.0.1:8789/foundations), [scripted consultation](http://127.0.0.1:8789/), and [exact changes/test evidence](../artifacts/jane-foundations-20261011/IMPLEMENTATION.md). **Recommendation:** approve the local milestone for continued review. Resolve capacity and review the exact migration/roles/privacy procedure before authorising synthetic hosted tests or bounded indexing. Jane stays inactive. PR #167 retains its independent scoped publication procedure and requires separate owner approval. No production system was changed.

## Historical implementation: encrypted persistence, indexed knowledge and concise Jane

[Jane completion record](specialist-advisory/JANE_COMPLETION.md) records the preceding increment. Work starts from `fefa6029287dcacb4ac924a50767e27351f2ac7c` in draft PR #169. PR #167 remains independent and unchanged at `851078c674ac2e9231e51dffbd5949ed4ea7c6d1`; protected HEAD is still `3649c879a4a5ddf88c2093a4172d20fbc58cd265`. That increment's read-back verifies all 20 scoped theme files and unchanged checksums for all 505 live files. The permanent team page remains unpublished.

Jane `2.2.0-preview.1` targets 40–90 words for ordinary replies and avoids em dashes. New customer-language hygiene removes internal feedback codes. The profile improves useful questioning, feedback refinement, meaningful alternatives and room-to-fabric query interpretation. Its intelligence has **not yet been re-evaluated with a real model**. Earlier paid transcripts and US$0.132574 ledger receipts remain unchanged; the new 16-scenario/48-turn mock suite is infrastructure evidence only. No additional paid calls were made, and the runner rejects the previous approval for the new profile/suite.

Implemented/local-tested additions include AES-GCM cloud record encryption with authenticated ownership metadata; separate application-process tests for shared locks, replay, recovery, rates and retention; guarded hosted mock composition; and five-minute consented context handoffs. The incremental index worker processes six records per batch, atomically checkpoints, rejects duplicate pages and requires an approved exact denominator/source attestation before claiming completion. Five exact live Master records were read and indexed locally, with commercial filtering verified separately. **Full-master index population and hosted Auth/database tests remain pending** because there is no approved isolated hosted environment. No production schema, source record, supplier operation or customer tool changed.

Current validation: **78 scoped tests pass** (40 Jane/security/storage/index, 20 Phase 1, 18 theme), scoped lint passes, both previews show no overflow at 320/390/412/768/1440 CSS px. All six spotlights, mobile navigation, welcome auto-entry and keyboard dialog exit were observed. Physical iPhone/touch, actual screen reader, enabled reduced motion and confirmed hidden-tab checks remain pending. [Evidence and exact changed files](../artifacts/jane-completion/IMPLEMENTATION.md), [updated owner review](http://127.0.0.1:8789/readiness), [scripted consultation](http://127.0.0.1:8789/).

**Recommendation:** PR #167 is prepared for scoped owner publication review, with device limitations explicit. Keep Jane inactive until isolated hosted security/privacy, actual index coverage and fresh budgeted real-model/human evaluation pass. The earlier exposed key's retirement is unverified; no key exists in this process or checked private evaluation env file. No merge, publication, deployment, live AI activation or infrastructure purchase occurred. C: measured 36.02 GiB; the earlier restic process is no longer listed, which does not establish backup success. A later verified backup remains required.

## Historical implementation — Jane intelligence readiness

[Jane readiness, contracts, security, evaluation and activation record](specialist-advisory/JANE_READINESS.md) is the current detailed source of truth. The earlier Phase 2 report below is historical where superseded. Work continues in [draft PR #169](https://github.com/Nylon1/CurtainsUK/pull/169), separately from unchanged [PR #167](https://github.com/Nylon1/CurtainsUK/pull/167). Starting Jane HEAD was `90722cd22a1485611f5464c03e7c98e51a2a39a7`; protected HEAD remains `3649c879a4a5ddf88c2093a4172d20fbc58cd265`. MAIN theme `182339731835`, hidden permanent team page and Vercel deployment `dpl_CvvQKa2zCsFbQ7eZR9Lzi31w7BCD` were verified independently. Neither PR was merged or published.

**Implemented and demonstrated:** the retail HTTP 400 correction in Jane's adapter, safe approved product cards, bounded descriptive full-text indexing, cloud-ready owner-scoped persistence/one-use recovery/deletion, fenced distributed leases, shared rate limits and durable spending caps. Cloud SQL runs in local PostgreSQL tests only. No production schema, Fabric Master record, supplier process or existing customer tool was changed. Comprehensive descriptive coverage remains pending approved index population; the actual model honestly reports that index as unavailable.

The owner approved **US$5 for invented-scenario OpenAI evaluation only**. The Responses adapter completed **36 real conversation turns** (ten initial scenarios plus two targeted retests), with zero service errors and **US$0.132574** charged by the conservative local ledger. An initial search-history contradiction was found and fixed using persistent server-generated tool receipts; the targeted retest verified the correction. Human design-quality approval is still pending. The supplied test credential was not saved in code, artifacts, browser or the interactive preview.

Review the [real-vs-mock conversation gallery](http://127.0.0.1:8789/evaluation), [local scripted consultation with verified products](http://127.0.0.1:8789/), and [evidence report](../artifacts/jane-readiness/IMPLEMENTATION.md). The interactive UI is still explicitly **scripted mock**; the gallery contains actual model responses. No public AI was activated. The latest scoped results are **31 Jane/security/index/storage tests, 20 Phase 1 tests and 18 existing theme tests passing**. Five browser widths have no overflow. Physical iPhone, actual screen reader, enabled reduced motion and confirmed hidden-tab testing remain pending.

**Release recommendation:** keep Jane behind the inactive gate. Next obtain an approved isolated cloud environment, verify real Auth/RPC and multi-worker persistence, populate and measure the incremental knowledge index, complete privacy/retention operations and human/accessibility review. PR #167 remains the independent scoped Shopify publication candidate, awaiting separate owner release approval. The new test paths still require normal exact-head policy approval and both protected checks when retargeted for production.

C: started at **37.03 GiB free** and restic PID **45016** was observed again, superseding the earlier process observation below. No cleanup, backup alteration, dependency installation or bulk ingestion occurred. A later verified backup is required; see final storage observation in the evidence report.

## Historical implementation — initial Jane Phase 2

The following paragraphs describe the initial implementation, before the readiness correction and approved paid evaluation above. Their catalogue, cloud-control and paid-call limitations are superseded only where explicitly demonstrated in the latest record.

[Jane implementation, contracts, security, costs and activation steps](specialist-advisory/JANE_PHASE2.md) is the detailed implementation record for Issue #168. [Draft PR #169](https://github.com/Nylon1/CurtainsUK/pull/169) contains the isolated implementation, initially committed as `076b85a2032224df1b30084c15817b635ebb3d1e`, stacked on PR #167. Its current feature-branch base does not trigger the protected-production checks; those remain mandatory when retargeted for release. The approved Shopify design is preserved. PR #167 now has release-candidate head `851078c674ac2e9231e51dffbd5949ed4ea7c6d1`; both required checks passed on that head. The permanent page remains hidden and the 20-file scoped candidate is unpublished.

Jane's functioning **local-only, explicitly scripted mock preview** is `http://127.0.0.1:8789/`, started with `node scripts/jane-preview.mjs`. Implemented code includes versioned profiles, validated tools and handoffs, adaptive conversation contracts, SSE delivery after validation/storage, summaries, cookie/CSRF/rate guards, local encrypted consented save/recovery/deletion, and an inactive OpenAI Responses adapter. The proposed isolated Supabase schema is tested locally, not migrated. The Vercel route fails closed; no remote service was deployed.

The latest run passes **22 Jane/security/storage/adapter tests**, **20 Phase 1 interaction/controller tests** and **18 existing Shopify theme tests**. Browser testing confirms countdown auto-entry, consented handoff, preference refinement, saved resumption including a server restart, labelled modal Escape/focus return, and no horizontal overflow at 320/390/412/768/1440 CSS px. See the [review evidence](../artifacts/jane-phase2/IMPLEMENTATION.md) and [gallery](../artifacts/jane-phase2/review-gallery.html). These are mock infrastructure evaluations, not validation of a live AI model.

Actual bounded Fabric Master reads succeeded and used existing identity indexes. However the existing public retail lookup returned HTTP 400; product recommendations remain blocked pending investigation. Full-master ID/prefix access is implemented, but comprehensive descriptive/semantic search of unpublished records is not yet complete. Screenshot processing, cloud recovery, real-model quality, distributed spending/rate controls and physical-device/screen-reader checks remain pending. No success is claimed for these items.

At the final storage observation C: had **37.05 GiB free**; the previously observed restic process was no longer listed. That does not verify a successful snapshot. No cleanup, backup script, manifest or historical worktree was changed; this development needs a subsequent verified backup. No paid model calls or additional service purchases were made.

## Owner direction and release preparation — Issue #168

The owner approved the six advisers, portraits and interactive design and authorised implementation of Jane's isolated Phase 2 framework. This is not merge, publication, paid-model activation or production-migration approval. [Issue #168](https://github.com/Nylon1/CurtainsUK/issues/168) and the direct owner brief govern the next stage. The following Phase 1 history remains evidence for its original revisions.

Protected HEAD was freshly re-read as `3649c879a4a5ddf88c2093a4172d20fbc58cd265`, PR #167 as `4e71193e17ab91bec9f8ab732a882ec1bf18d87a` with both required checks successful before this release-preparation revision. MAIN theme remains `182339731835`; Vercel remains READY on `dpl_CvvQKa2zCsFbQ7eZR9Lzi31w7BCD`. No deployment occurred.

The permanent Shopify page has now been created **hidden**, ID `693751873915`, handle and template suffix `meet-our-team`, `isPublished:false`. The shared navigation uses its permanent URL only after publication; DEVELOPMENT themes use the existing working review URL. All approved portraits, cards, motion and room demonstrations are unchanged. See [exact 20-file manifest](../artifacts/specialist-advisory-release/release-manifest.json), [scoped release/rollback instructions](specialist-advisory/RELEASE.md), and [fresh read-back](../artifacts/specialist-advisory-release/readback.json).

The latest local run passed the 20 advisory tests and 18 existing theme tests. Theme Check reported zero errors and 13 existing warnings. At 390 CSS px the mobile menu opens and follows the new adviser link without overflow. Jane's automatic room opening was observed after 39.599 seconds; exact boundary and background restoration remain deterministic test evidence. Physical iPhone/touch, screen-reader, actual-browser reduced-motion and confirmed hidden-tab visibility checks remain pending due unavailable control surfaces; no simulated result closes those items. See [browser limits/evidence](../artifacts/specialist-advisory-release/browser.json).

C: measured 38.41 GiB free at this phase's start; restic PID 45016 remained present. Existing dependencies are reused via a local junction, with no install, backup change, cleanup or supplier ingestion. New work needs a later verified backup.

The immediate deliverable is the native Shopify **Meet Our Team** page and an explicitly non-operational consultation demonstration. It introduces Jane, Anne, Noah, James, Ben and Natalie. No live AI consultation, production deployment, catalogue change, database migration or human notification is authorised or claimed by this Phase 1 record.

## Authority and verified starting state

| Surface | Starting evidence / boundary |
| --- | --- |
| Repository | `Nylon1/CurtainsUK`; protected `release/production` |
| Starting protected HEAD | `3649c879a4a5ddf88c2093a4172d20fbc58cd265`; re-read the remote tip before review/release |
| Development checkout | `C:/Users/hamza/curtainsuk-specialist-advisory-phase1`; isolated from preserved customer-release and historical main checkouts |
| Live Shopify | `www.curtainsuk.com`, `carpetup.myshopify.com`; preflight verified theme `182339731835` is `main` |
| Homepage | PR #166 merged and owner-confirmed live; fresh storefront review is the visual baseline. The unpublished statements in `homepage-studio-review-20261009.md` are historical and superseded. Preserve that historical record. |
| Vercel | Existing project `prj_vl2GLLlSf0AJAKqjs1Nk26ipKHBA`; canonical backend `https://curtainsuk-production-api.vercel.app`; preflight matches recorded deployment `dpl_CvvQKa2zCsFbQ7eZR9Lzi31w7BCD` |
| Runtime source | Deployed Room Visualiser commit `800f42a27a0a6e9beb1abd92821145bf4a4b98c4`, independently verified Git tree `1150dad1d55649597d03df2dbaad01348ea98d63`; do not imply that Vercel stores the tree attestation |
| Room Visualiser | Complete and live; pack `d5908d6eaf486ce33e2f72a5`, FIXED140 pack `3ef99c8970b0b92d4b5986f7`; 11,003 supported identities (3,137 STANDARD + 7,866 FIXED140) |
| Device limitation | Physical iPhone Safari verification remains outstanding. Browser emulation cannot close that item. |
| Storage / backup | Preflight measured **42.28 GiB free on C:**. A `restic` process was present; process visibility alone does not establish backup completion or snapshot coverage. Preserve its scripts, repository and manifests. |
| Existing work | Historical main retains two local commits and untracked themes; existing worktrees and evidence are preserved. No storage cleanup is authorised. New work needs a later backup; an earlier snapshot cannot be presumed to include it. |

Required records were read: [production surfaces](PRODUCTION_SURFACES.md), [Room Visualiser release](room-visualiser-2-customer-release.md), [structured production state](room-visualiser-2-production-state.json), [historical homepage review](homepage-studio-review-20261009.md), [project ledger](CURTAINSUK_PROJECT_LEDGER_2026_09_16.md), [frontend register](CURTAINSUK_FRONTEND_REGISTER_2026_09_16.md), and [release policy](../release/README.md). Dated catalogue counts in September documents are historical snapshots, not a new live database audit.

## Status vocabulary and delivery ledger

**Planned** means future scope; **designed** means a documented contract; **prototyped** means review interaction without a live service; **implemented** means code exists; **tested** requires recorded checks; **approved** requires owner approval; **published** requires verified live release. A later status must never be inferred merely from the previous one.

| Component | Status in this record |
| --- | --- |
| Native six-adviser page, reusable profiles, responsive assets | Implemented and tested in Shopify development theme `182472573307`; unpublished owner-review preview |
| Six synthetic portrait assets | Generated and encoded for the portrait revision; current-revision preview receipt and PR checks must be consulted separately from the initial illustration-version evidence |
| Interactive visual revision | Implemented and tested in the development preview; 20 focused tests passed and all 18 scoped files matched source; current-head CI remains governed by PR checks |
| Waiting room and consultation-room examples | Prototyped and tested for all six advisers; no model, messaging or persistence connected |
| Six separate personality profiles and shared behaviour | Designed, versioned in this change; not attached to a live model |
| Shared platform, data model, contracts and security boundaries | Isolated Jane framework and cloud runtime implemented and locally tested; hosted wiring/activation pending. See JANE_READINESS.md. |
| Secure continuity, uploads, knowledge ingestion, enquiries and staff dashboard | Local encrypted continuity and cloud-ready session controls tested; cloud deployment, index population, uploads and human workflows pending. |
| Jane / Anne / Noah / James / Ben / Natalie operational agents | Jane has real-model evaluation evidence and a scripted interactive preview; human quality approval and public activation pending. Other five remain planned. |
| Commercial & Acoustic landing area | Planned in Phase 6; extensible disciplines, no premature theatre/healthcare/hotel implementation |
| Owner approval / publication | Visual design approved by owner / not published; release approval remains separate |

## Selected architecture

Keep the customer experience in the existing `shopify-theme/curtainsuk-dawn-16` architecture. The new page uses scoped Liquid components, CSS and lightweight JavaScript. Its final intended route is `/pages/meet-our-team`. The preview must state that consultations are coming soon; the demonstration cannot accept or pretend to answer free-text questions. There is no second Next.js customer storefront.

Future stages use the **existing Vercel service** for bounded, authenticated orchestration and the existing Supabase platform with an isolated advisory schema. The same consultation-room UI loads an independently versioned adviser profile; each adviser has a different instruction, knowledge and tool access profile. One server orchestrator is sufficient initially. Model/tool adapters isolate provider-specific API details from Shopify. Adding a specialist adds profile data, knowledge permissions and evaluation cases rather than a new chat stack.

For Phase 2, use OpenAI's **Responses API** through a small server-side adapter with explicitly registered function tools and structured schemas. The official guidance recommends Responses for new projects. Tool execution remains application-controlled; a model proposal is validated and authorised before execution. Do not enable hosted shell, computer use, arbitrary MCP servers or open-ended browser tools for these advisers. An Agents SDK layer can be evaluated later if orchestration complexity justifies it; beta multi-agent delegation is unnecessary for launch. [Responses guidance](https://developers.openai.com/api/docs/guides/migrate-to-responses), [function calling](https://developers.openai.com/api/docs/guides/function-calling).

Use `store: false` as the initial application-state design, with consented history controlled in Supabase. This does **not** mean zero OpenAI retention: default abuse-monitoring retention and eligibility for enhanced controls must be reflected in the privacy notice. Verify actual project configuration, region and contracts before live customer testing. [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data).

## Inspected integration map

| Existing surface | Relevant source and future reuse |
| --- | --- |
| Native navigation | `shopify-theme/curtainsuk-dawn-16/snippets/curtainsuk-header-navigation.liquid`; preserve existing entries and mobile behaviour |
| Fabric Library / Browser | `/pages/fabric-library`, `/pages/fabric-library?view=browse-fabrics`; `lib/fabric-master/retail-repository.ts` exposes `searchRetailFabrics` and `retailFabricDetail` |
| Product retrieval | Search RPC selection in `lib/fabric-master/browse-rpc.ts`; at most 24 records hydrated per retail page. Reuse approved/verified images, published profile URLs and commercial-readiness results. Do not call full-master scans for a conversation. |
| Fabric knowledge | `lib/fabric-master/visual-knowledge.ts`, `visual-knowledge-source.ts`, `hci-visual-knowledge.ts`; exact Fabric Master IDs and approved visual classifications remain authoritative |
| FI customer entry | `/apps/curtainsuk-decision/consultation?experience=premium&entry=guided` or `entry=match`; `lib/storefront/hci-premium-contract.ts`, `hci-premium-integration.ts` and `hci-premium-proxy-server.ts` |
| FI behaviour | Current contract supports room/reference-image types, editable palette, price levels, calibration, direction feedback and refinement. Source has governed progressive direction delivery; the older ledger's five-direction description is not a licence to promise a fixed current count. Verify the rendered journey before Jane teaches it. |
| Room Visualiser | `/pages/room-visualiser`; native section and existing signed app-proxy iframe. Living Room, Bedroom, Lounge, Office; preserve existing supported-fabric gate, headings, lighting, palettes and controls. No new renderer or control is introduced. |
| House of Curtains | `/pages/build-my-rooms`; `lib/storefront/rooms-core.ts`, `rooms-server.ts`, `rooms-checkout-server.ts`; saved browser state is context only, not price or order authority |
| Measuring | `/pages/how-to-measure`; `assets/curtainsuk-guided-measure.js` preserves explicit anchors, raw readings, units, rule version and customer confirmation. It labels browser-saved work as not submitted and requires workroom review; Noah must preserve those distinctions. |
| Fitting | `/pages/how-to-fit`; approved Forest/TrackFit service and calculator contracts still need targeted verification in Phases 5/8 |
| API boundary | `app/api/staging/shopify-proxy/[operation]/route.ts`, `lib/storefront/security/shopify-proxy-operations.ts`, `shopify-app-proxy.ts`; existing operation allowlist, signed shop/path/timestamp checks and per-endpoint limits |
| Staff workflows | `lib/storefront/review-request-repository.ts`, `review-authz.ts`, `security/evidence-workflow.ts`, `security/evidence-persistence.ts`; useful patterns for idempotency, durable receipts, staff permissions and private evidence. Do not repurpose existing review/order records for advisory leads. |

The `/api/staging/...` naming is established production infrastructure. Do not rename it cosmetically. Existing legacy/public routes are not automatically suitable for new adviser use; each future adapter needs its own contract and authorisation test.

## Adviser profiles and consultation behaviour

The six profile files independently carry `profileVersion: 1.0.0`, status, voice, questioning style, vocabulary, expertise, boundaries, intended knowledge and destinations. They are design artifacts, not executable agent configuration. All reference [shared consultation v1](specialist-advisory/shared-consultation.v1.md).

| Adviser / profile | Approach and intended primary context |
| --- | --- |
| [Jane](specialist-advisory/jane.v1.json) | Flagship; warm, elegant, exploratory and creative. Interiors, palette, pattern scale, texture, light and use of existing design tools. Specific fabric recommendations are optional. |
| [Anne](specialist-advisory/anne.v1.json) | Friendly, organised and efficient. House of Curtains, verified commercial/admin information and real staff enquiries. |
| [Noah](specialist-advisory/noah.v1.json) | Precise, patient and sequential. Measurement anchors and verified calculators, with understanding checked at each step. |
| [James](specialist-advisory/james.v1.json) | Practical, direct and approachable. Installation constraints, manufacturer rules and professional fitting assessment. |
| [Ben](specialist-advisory/ben.v1.json) | Investigative and analytical. Diagnose absorption/reverberation versus transmission; explain test conditions and uncertainty. |
| [Natalie](specialist-advisory/natalie.v1.json) | Personal, attentive and design-focused. Apex geometry and bespoke constraints, ending in consented human handover where wanted. |

Shared loop: understand → investigate → reason → recommend → listen/refine → conclude. Profiles adapt their questions rather than following a rigid script. The final summary records goals, recommendations, alternatives, unresolved issues and next steps. Ten minutes is the free expected format; continuation or a saved return is supported in the future service, with no abrupt cutoff. Text is the launch scope; voice is deferred.

## Waiting room and operational honesty

Phase 1 demonstrates a roughly 30-second welcome with identity, preparation guidance, elapsed-time progress, accessible skip/exit and an automatically opened example consultation room. There is no invented queue or claim that an adviser is busy. Use an absolute start/deadline and recalculate on visibility changes; do not decrement a counter once per timer tick. Reduced motion removes decorative animation without suppressing progress information. Countdown announcements should be throttled so assistive technology is not interrupted each second.

Future service readiness must be server-authoritative, independently enabled per adviser after evaluation and approval. Theme settings and browser state cannot turn an adviser operational. Initialisation failures show recovery and preserve valid customer input. A genuine outage must not transition into a fake consultation or fabricate a response.

## Interactive visual revision

**Implemented and tested in the unpublished owner-review preview.** The hero now includes a six-adviser spotlight selector with Jane selected initially. Keyboard-operable buttons select each adviser's original portrait, title, personality and example question. The spotlight links to the actual profile on the page and opens the existing labelled shared consultation demonstration.

Layered cards add visual depth, with gentle portrait tilt for pointer input and a one-time entrance as content scrolls into view. Reduced-motion handling suppresses decorative motion. There is no autoplay, network request from the interaction controller, browser storage or model call. All six services remain upcoming, with no live consultation introduced.

This revision adds `assets/curtainsuk-advisory-interactions.js`, `assets/curtainsuk-advisory-motion.css` and `snippets/curtainsuk-advisory-spotlight.liquid`, plus scoped edits to the existing advisory section and additive advisory locale text. The total theme scope is now **18 files**. Earlier tests, screenshots and nine-/15-file receipts remain evidence for their respective revisions.

The [interactive test run](../artifacts/specialist-advisory-phase1/interactive-tests.log) passed **20 tests: the 10 shared controller/content tests rerun plus 10 new interaction tests**. This count must not be added to the initial 42 as if every test were new. The new tests include reduced motion at startup and when the preference changes, coarse-pointer behaviour, bounded pointer effects, observer fallback and lifecycle cleanup. [Theme Check](../artifacts/specialist-advisory-phase1/interactive-theme-check.json) recorded **zero errors and 13 existing warnings**. The [interactive read-back](../artifacts/specialist-advisory-phase1/interactive-readback.json) confirms **18/18 scoped preview files match source and all 505 MAIN-theme files remain unchanged**.

[Connected Chrome checks](../artifacts/specialist-advisory-phase1/interactive-browser.json) cover **320, 390, 412, 768 and 1440 CSS px**: no horizontal overflow, loaded portraits after lazy-image completion, exactly one active spotlight panel and selector targets at least **47 px wide and 68 px high**. All six adviser selections showed the correct identity and demo target. Home then ArrowRight selected Anne; End then ArrowLeft selected Ben, with visible focus. Fine-pointer portrait tilt was observed in the browser. Noah's hero action opened his waiting room, and Escape restored its opener. At 320 px, skip opened Noah's illustrative room with zero inputs and a disabled send control; six profile cards were confirmed at 320 and 1440 px. The [current gallery](../artifacts/specialist-advisory-phase1/review-gallery.html) shows this revision. Physical iPhone, screen-reader and actual reduced-motion browser checks remain outstanding; reduced-motion evidence is automated, not an OS/browser emulation result. Current-head CI is reported by the PR checks tab, not inferred from these local results.

## Proposed data model — no migrations in Phase 1

Prefer an unexposed `advisory` schema, with explicit least-privilege grants and RLS as defence in depth. Keep Fabric Master and commerce tables unchanged. Exposed objects need both grants and row ownership policies; authentication alone does not authorise access to another customer's rows. Views must not silently bypass the intended row restrictions. [Supabase API security](https://supabase.com/docs/guides/api/securing-your-api), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

| Proposed object | Minimum purpose / fields |
| --- | --- |
| `consultations` | UUID, owner subject, adviser ID, profile/shared-policy versions, state, revision, creation/update/expiry timestamps, selected processing basis and consent references |
| `messages` | Consultation ID, monotonic sequence, role, bounded content, request ID, provenance references; unique `(consultation_id, request_id)` for retry safety |
| `summaries` | Versioned customer-facing goals, room/project context, preferences, constraints, considered options, feedback, revised advice, open questions and next steps; no internal reasoning trace |
| `context_grants` / `context_snapshots` | Source system, explicit selected fields, consent scope/version, origin, signed reference or customer-supplied designation, expiry/revocation; immutable revisions |
| `session_capabilities` / `recovery_challenges` | Hashed random credentials, owner/session binding, scope, expiry, rotation/revocation, one-use challenge status; no raw token logs |
| `consents` | Purpose, displayed notice version, authorised recipient/team, fields/attachments, decision and timestamp; separate save, image processing and human referral purposes |
| `attachments` | Owner/session, private object key, detected type/size/hash, scan/quarantine status, consent, expiry and deletion state; no public bucket |
| `knowledge_sources` / `source_versions` | Publisher, URL, rights/permission basis, source identity/version/hash, retrieved date, valid/superseded status, specialist scopes |
| `knowledge_chunks` / `verified_claims` | Page/table/section provenance, bounded text, retrieval index, confidence, extraction/verification state; numeric claims include units and test arrangement |
| `ingestion_jobs` | Source version, cursor, bounded batch, retry count, cost/I/O observations, errors and review requirements |
| `enquiries` / `enquiry_events` | Customer-authorised summary/contact/context, recipient team, status, assigned staff, consent, submission receipt, response history; idempotent create |
| `notification_outbox` | Enquiry reference, verified destination ID, minimal payload, attempts, queued/sent/failed receipt; committed with enquiry, delivered asynchronously |
| `usage_events` / `audit_events` | Pseudonymous request, operation, status, latency, model/profile version, tokens and cost estimate; no message body, room photo or personal contact detail |

Do not authorise from user-editable metadata. Staff roles come from verified administrative claims and team scopes. Service-role credentials bypass ordinary RLS and must remain server-only; use a scoped database role or tightly constrained server queries, with independent owner checks even where a privileged client is used. No schema exposure, global grant change or migration is part of this phase.

## Session continuity and customer context

Existing `hci-proxy-server.ts` explicitly records that Shopify strips cookies. Therefore the advisory proxy cannot rely on setting an HttpOnly cookie through that route. Design a new, independent, revocable opaque capability bound to one advisory owner and session, issued only after signed-proxy checks. Keep it in memory by default; any device persistence needs a clear customer choice, a short expiry and an explicit clear-device action. Do not put tokens in URLs, analytics or logs. Do not reuse HCI or Naila signing keys, storage namespaces, capabilities or memory.

Cross-device recovery requires a verified customer/account binding or single-use recovery challenge delivered through an approved channel. An email address or order number supplied to the model is never sufficient. Customer-specific order lookups need a stronger verified order-owner check, independent of an anonymous consultation capability. Prove logout, expiry, revocation, recovery replay and ownership enforcement before launch.

“Discuss my results with Jane” is designed for a later contextual integration. A consent screen lists the selected Fabric Master IDs, room, heading, customer-safe colours/settings, discovery preferences, saved design references and feedback. The server revalidates IDs and commercially meaningful data. Data passed from the browser is untrusted consultation context; it cannot override signed configuration, prices or eligibility. No automatic read of House, FI or visualiser local storage and no modification of their engines. If there is no approved structured export, accept a customer-authorised screenshot/share reference with a clear statement that it may be incomplete. Authorised later revisions extend the same consultation.

## Planned tool contracts

Every tool has a strict schema, version, adviser allowlist, authenticated caller, bounded inputs/results, timeout and an output classification. The server rejects extra fields and unknown operations; the model cannot choose an owner, staff role, arbitrary SQL, destination URL or arbitrary file path. Responses carry provenance and explicit `unknown`/`stale`/`not_available` states rather than fabricated fallbacks.

| Contract (proposed names) | Inputs → permitted outputs / authority |
| --- | --- |
| `search_fabric_knowledge.v1` | Bounded query/filters/cursor → customer-safe facts across the complete master knowledge index, exact IDs and eligibility classification. No cost/margin fields or purchase assertion. Jane's full coverage is distinct from the retail projection. |
| `search_retail_fabrics.v1` / `get_retail_fabric.v1` | Existing governed filters or exact ID → approved public metadata, real approved image URLs, current retail/readiness result, evidence time and supported links. Reuse bounded projections. |
| `lookup_commercial_facts.v1` | Exact permitted IDs/configuration reference → current governed retail quote/status or confirmation-required state; never editable price, supplier cost or raw order mutation. |
| `get_tool_guidance.v1` | Allowlisted tool ID + version → verified customer controls, eligible route, limitations and source. No guessed features. |
| `retrieve_evidence.v1` | Specialist-scoped query and bounded limit → approved excerpts, source version/page/table, technical arrangement and verification state. No model-invented citations. |
| `calculate_measurement.v1` | Known calculator/rule ID, explicit values and units → validated deterministic result, assumptions, rule version and review requirements. Missing input remains missing. |
| `attach_context.v1` / `save_summary.v1` | Customer-approved fields plus expected revision → session-bound snapshot/summary receipt; no source-system write. |
| `get_verified_order_status.v1` | Server-verified order entitlement/reference → minimum customer-safe status; disabled until Anne's identity/authority flow is tested. |
| `create_enquiry.v1` | Valid contact method, useful brief, permitted attachments, consent receipt and idempotency key → durable enquiry ID/status. Team is mapped by the server, never a model-supplied email address. |
| `get_enquiry_status.v1` | Enquiry reference + owner/staff authorisation → persisted status and customer-safe response history. |

Product cards are rendered from tool objects rather than model-written HTML or image URLs. All URLs are validated against approved internal/service destinations. Citation IDs must resolve to the evidence actually retrieved. Numeric installation/acoustic claims require a verified claim record; otherwise explain uncertainty. No tool can alter checkout, catalogue identity, pricing, stock evidence, renderer eligibility or Naila.

## Knowledge-source and ingestion design

| Adviser | Planned source scope |
| --- | --- |
| Jane | CurtainsUK complete customer-safe fabric knowledge, existing visual classifications, approved retail records, FI/Library/Visualiser documentation and samples guidance |
| Anne | Approved policies, commercial lookups, ordering/delivery/payment guidance and House of Curtains; private orders only after verification |
| Noah / James | Approved Forest Group manuals and specifications, TrackFit guidance and existing validated calculators; relevant CurtainsUK and Apex technical guidance |
| Ben | J&C Joel and authorised supplier test reports, wool serge/Molton evidence, applicable standards and approved CurtainsUK acoustic products |
| Natalie | Approved Apex Curtains services/project knowledge, relevant Forest Group specialist tracks, fabrication/heading and installation constraints |

No supplier ingestion runs in Phase 1. Future ingestion first inventories public/authorised sources and records reuse rights, permitted access and restrictions. Do not bypass authentication or publisher restrictions. Use allowlisted origins, bounded file size/time, redirect controls and private-network blocking. Download only authorised content; de-duplicate by canonical identity and cryptographic hash. Extract text plus page/table references, retaining document title, publisher, version and source URL. Preserve superseded versions and make current-versus-historical status explicit.

Technical tables, drawings, load ratings, acoustic coefficients and OCR ambiguities enter a manual verification queue. A text extraction score alone cannot approve them. Store test standard, frequency bands, material, mounting, fullness and air gap where applicable; do not mix tested and inferred values. Supplier documents remain untrusted data even when an approved publisher supplied them.

Index incrementally by source hash/update cursor in bounded batches. Reuse catalogue projections and exact IDs; never rebuild or scan Fabric Master per consultation. Apply concurrency/I/O limits, backoff, caching, job telemetry and a kill switch. Separate ingestion workers from customer requests. A new master-wide customer-safe knowledge projection must exclude confidential commercial fields before indexing, while representing unpublished/incomplete/discontinued records accurately and preventing purchase suggestions. Model prompts are an additional rule, not the primary data-leak boundary.

## Human handover, uploads and privacy

Anne's staff enquiry and Natalie's Apex lead are additive records with status, responsible team, permitted contact information, project context and response history. Natalie can accept a project description, one valid contact method and consent without every measurement or photograph. Invite name, email, phone, postcode/location, description, approximate measurements, fabric/lining/heading, installation need, timescale and open questions naturally. The human team makes final quotation and feasibility decisions.

Display the handover summary, attachments and verified receiving team before submission. Commit enquiry, consent and notification-outbox entry atomically. Return a receipt only when storage succeeds. Notification retries are idempotent; distinguish saved, queued, delivered, failed and reviewed. Approved Apex/TrackFit recipients must be confirmed before activation. No email or customer information is sent by Phase 1.

Future uploads initially accept only JPEG/PNG/WebP with a proposed 5 MiB/file and five-file/session limit; validate actual signatures, decoded dimensions and payload size, re-encode images, remove unnecessary metadata, quarantine and scan before retrieval. Reject SVG, HTML, executables and archives. Supplier PDFs enter the separate controlled ingestion pipeline. If customer PDF drawings are needed later, add isolated parsing, malware checks and dedicated validation before enabling them. Storage stays private, with ownership checks and short-lived signed access for the intended team. [Supabase storage controls](https://supabase.com/docs/guides/storage/security/access-control).

Before live testing with personal data, publish an accurate notice covering AI identity, purpose, processors, optional continuity, images, referrals, retention and rights. Record a suitable processing basis per purpose with privacy-owner review; optional save/referral controls are not a blanket substitute for that assessment. Proposed engineering defaults for review: unsaved session expiry 24 hours; opt-in saved consultation 90 days after activity; rejected/quarantined upload purge within 24 hours; lead retention set by the approved enquiry policy. These are **proposals, not approved legal requirements**. Implement deletion across messages, summaries, attachments, grants, recoveries, indexes and applicable processor state; distinguish backup expiry from immediate active-store deletion. Do not automatically change authoritative knowledge from customer feedback. [ICO data protection by design guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/guide-to-accountability-and-governance/data-protection-by-design-and-by-default).

Security controls include signed-proxy authentication, independent consultation ownership, bounded JSON, CSRF/origin handling appropriate to the transport, strict rendering, per-IP/session limits, global spend limits, concurrency limits, idempotency, optimistic revision checks, safe error messages, privacy-conscious telemetry and a feature kill switch. A database/limiter outage fails closed for writes while preserving the customer's recoverable input. Test prompt injection from documents and uploads, fabricated evidence requests, cross-customer reference swaps and private-field leakage.

## Operating/API cost model — estimate, not a bill

Official API documentation checked **9 October 2026** lists `gpt-6.1-sol` at **$2/1M input tokens, $0.10/1M cached input, $2.50/1M cache-write tokens and $10/1M output tokens** at standard short-context rates. It accepts text/images, supports streaming and structured output, and uses Responses for tool calling. Treat it as a quality/cost evaluation candidate for Jane, not an already selected production deployment. [Model details](https://developers.openai.com/api/docs/models/gpt-6.1-sol), [current pricing](https://developers.openai.com/api/docs/pricing).

| Explicit uncached planning scenario | Model-only estimate |
| --- | ---: |
| Ten-minute text consultation: 50,000 total billed input tokens across all turns + 8,000 billed output/reasoning tokens | $0.18 |
| Longer / more evidence-heavy consultation: 150,000 input + 20,000 output/reasoning tokens | $0.50 |
| 1,000 consultations at those assumptions | $180–$500 |
| 10,000 consultations at those assumptions | $1,800–$5,000 |

These are workload assumptions, not measured usage or an upper limit. Repeated history, reasoning, tool loops, images, cache writes, retries and longer conversations change the bill. Caching may lower cost; it is not assumed above. Regional processing currently adds 10% where applicable; a $0.18 example becomes $0.198 before other costs. Use billed usage telemetry, explicit tool/turn/token budgets and a daily spend cap, with graceful continuation/recovery rather than silently truncating advice.

The proposed index remains in Supabase; no OpenAI hosted file-search store is required initially. If later adopted, the current listed fees are $0.10/GiB/day after the first free GiB and $2.50/1,000 calls, in addition to model usage. For example, two GiB total plus 10,000 calls in a 30-day month would add approximately $28 under those rates. Embedding and ingestion costs require measured corpus size and are separately budgeted. [Pricing](https://developers.openai.com/api/docs/pricing).

Phase 1 has **zero ongoing consultation API cost**. For planning only, allow an initial **$50–$150/month incremental operations reserve** for database/storage/egress/functions/logs/approved email services; this is an internal budget allowance, not a verified provider quote. Existing account plans, headroom and observed utilisation have not been inspected for a billing estimate. Obtain those before Phase 2 activation; no plan upgrade or purchase is authorised here. On that reserve, 1,000 consultations would suggest a provisional **$230–$650/month** before tax, FX, image/embedding extras, staff time or any separate base subscriptions. No GBP conversion is asserted.

Supabase's current changelog was checked. Its September Postgres minor-release advisory concerns extension/index compatibility; Phase 2 must inspect actual database/extension versions before migrations, without treating that advisory as authority to change the production database now. No adapter/runtime upgrade is part of this phase. [Supabase changelog](https://supabase.com/changelog.md), [Postgres advisory](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes).

## Phase 2 implementation plan and release gates

1. Add server-only adviser registry, model adapter, strict tool contracts and feature flags. Pin dependencies; keep production flags off. Use a mock model first and record profile/policy versions for every response.
2. Implement isolated session/message/summary/consent persistence in a non-production environment, with explicit grants, ownership, revocation, expiry, request idempotency and revision conflict handling. No live Fabric Master writes.
3. Add signed Shopify proxy operations for advisory session/message/summary/recovery only after reviewing transport limits and replay behaviour. Preserve the existing operation policies and all Naila/HCI routes. Validate streaming versus bounded polling through the actual Shopify proxy before choosing the transport.
4. Connect the reusable waiting/consultation UI to mocks, including send/retry, cancellation, slow response, tab background/resume, soft ten-minute guidance and summary recovery. No fake queue language.
5. Implement read-only fake/fixture product and knowledge adapters; verify output projection, exact identity and evidence citations. Add real bounded retail reads only after controlled tests; master-wide knowledge remains a separate governed projection.
6. Implement privacy notice versions, consented context selection, delete/export lifecycle and recovery challenge design. Verify approved recipient configuration before any real notification. Uploads may remain disabled until quarantine/storage tests pass.
7. Run controlled conversations against the candidate model using synthetic data and budget caps. Build the six personality evaluations, then prioritise Jane. Record hallucinated facts, retrieval accuracy, helpful questioning, feedback adaptation, latency and cost; no implicit promotion from a successful demo.
8. Present the concrete Phase 2 candidate, security results, real operating estimate and rollback plan for owner approval. Go live only through the existing protected release process with explicit authorisation.

Required Phase 2 tests: cross-owner read/write rejection, session-fixation/recovery replay, tampered/expired capabilities, direct unsigned-proxy access, strict schema rejection, request duplication, stale revision, prompt injection, fabricated citation rejection, supplier-field exclusion, stale stock/price treatment, unavailable limiter/storage/model, disconnect/retry without duplicate messages, deleted session/attachment access, upload spoofing/oversize/quarantine, consent withdrawal, and enquiry saved-versus-notified distinctions. Validate calculator contracts and numeric acoustic claims with specialist fixtures before their phases. Only a verified identity/order-authority flow can enable Anne's order tool.

Following sequence: **Phase 3 Jane**, **4 Anne**, **5 Noah and James**, **6 Ben plus Commercial & Acoustic entry**, **7 Natalie**, **8 contextual integrations after individual agents pass**. Keep the homepage lightweight; do not add six global chat widgets.

## Phase 1 acceptance, owner review and release

Acceptance requires all six accurate AI-labelled profiles, Jane's prominence, reusable structure, honest upcoming states, working verified links, the elapsed-time waiting demonstration, mobile/desktop visual parity with the current homepage and no horizontal overflow at **320, 390, 412, 768 and 1440 px**. Check keyboard order, visible focus, dialog focus restoration, Escape/exit, reduced motion, meaningful headings and progressive fallback. The chat example must not impersonate a working service or save customer text.

Regression evidence must cover the homepage, Fabric Library, FI, Room Visualiser, House of Curtains, measuring/fitting, navigation and non-purchasing cart/checkout paths. A route returning 200 is a reachability check, not proof of a full checkout. Do not place another payment merely to reprove existing commerce. Physical iPhone testing remains a separate outstanding result unless a device is actually used.

### Verified Phase 1 integration and evidence

[Open the working Shopify preview](https://www.curtainsuk.com/pages/fabric-library?view=meet-our-team&preview_theme_id=182472573307). It runs on **DEVELOPMENT theme `182472573307`**, using an alternate template on the existing Fabric Library page for review. The intended `/pages/meet-our-team` destination remains unpublished. The portrait revision presents six distinct AI-generated fictional adviser identities, gives Jane the featured position and retains the labelled waiting/consultation-room demonstration from each profile.

All six portraits depict fictional adults in their thirties. The requested representation is white British for Jane, Anne, James, Ben and Natalie, and brown British for Noah; these are creative specifications for synthetic characters, not claims about real staff. Each original was generated with the built-in image-generation tool. The six **1024 × 1024 WebP** theme assets total **436,350 bytes**, as recorded in `C:/Users/hamza/curtainsuk-advisory-portraits/encoding.json`. Original generated images and exact prompts are preserved outside the repository in that folder. See [portrait prompts and provenance](specialist-advisory/PORTRAITS.md). The custom-adviser generic SVG remains available for future profiles without bespoke artwork.

Ordinary theme duplication failed. The isolated development preview was built using the preserved **505-file current-live snapshot**, initially with nine scoped advisory files added or changed. The portrait revision expanded the scoped theme change to 15 files; the interactive visual revision adds three files, bringing the current scope to **18 files** listed below. No historical draft was reused or deleted. The canonical live theme was not modified. Development previews are temporary: Shopify can remove them after seven days of inactivity or when the CLI session is logged out. The owner-review link should therefore be checked before a later review; this is not a permanent unpublished-theme guarantee.

The following checks record the initial Phase 1 implementation. They do not by themselves verify the later portrait revision or establish CI success on a newer commit; use the refreshed preview receipt, gallery and current PR checks for that revision.

| Verification | Recorded result / limit |
| --- | --- |
| Automated checks | **42 tests passed: 10 new controller/content tests and 32 existing regression tests.** The initial Guided Measure fixture failure was resolved by materialising its existing tracked migration files in the sparse checkout, without changing the fixture or production source. |
| Shopify Theme Check | **Zero errors; 13 pre-existing warnings** in unrelated files; no finding in the new page implementation. |
| Responsive layout | Connected Chrome at **320, 390, 412, 768 and 1440 px**: all six profiles, one H1, no missing translations and no horizontal overflow. |
| Adviser interactions | All six real UI open/skip/close paths passed; each showed its own identity, preparation and illustrative opening, with focus restored on close. |
| Keyboard / focus | At 390 px, actual browser keyboard wrapping, visible focus outline and Escape closure were verified. This does not constitute a full screen-reader audit. |
| Timer | The real browser automatically reached the room when observed **42.214 seconds** after entry. The exact 30-second boundary and background-tab catch-up passed deterministic controller tests; the browser record is not a precise transition-time measurement. |
| Preview honesty | No free-text input; disabled send control; coming-soon and illustrative-opening notices. The controller tests reject network, cookie and browser-storage access. No live AI, uploads, enquiries or consultation persistence are enabled. |
| Extensibility | Reusable adviser blocks and one shared room/controller; up to 20 configured blocks with a custom identity/text option. Additional advisers use the generic illustration until their own artwork is supplied. |
| Remaining device/accessibility checks | **Physical iPhone Safari, screen-reader testing and an actual reduced-motion browser run were not performed.** CSS rules were inspected; the later interaction tests verify reduced-motion startup and preference changes. Chrome viewport checks are not physical-device results. Native `dialog` support is required for the demonstration; unsupported browsers retain the profiles/tools while hiding demo entry controls. |

Evidence is preserved in [the Phase 1 artifact folder](../artifacts/specialist-advisory-phase1/): [preflight](../artifacts/specialist-advisory-phase1/preflight.json), [responsive results](../artifacts/specialist-advisory-phase1/responsive-browser.json), [consultation interactions](../artifacts/specialist-advisory-phase1/consultation-browser.json), [test log](../artifacts/specialist-advisory-phase1/regression-tests.log) and [Theme Check output](../artifacts/specialist-advisory-phase1/theme-check.json). Captures include the [desktop hero](../artifacts/specialist-advisory-phase1/desktop-1440-hero.jpg), [featured Jane](../artifacts/specialist-advisory-phase1/desktop-1440-jane.jpg), [other advisers](../artifacts/specialist-advisory-phase1/desktop-1440-advisers.jpg), [desktop waiting room](../artifacts/specialist-advisory-phase1/desktop-waiting-room.jpg), [desktop consultation example](../artifacts/specialist-advisory-phase1/desktop-consultation-room.jpg), [390 px Jane](../artifacts/specialist-advisory-phase1/mobile-390-jane.jpg), [390 px waiting room](../artifacts/specialist-advisory-phase1/mobile-390-waiting.jpg) and [390 px consultation example](../artifacts/specialist-advisory-phase1/mobile-390-room.jpg), plus captures at every required viewport.

The 18-file theme scope, relative to `shopify-theme/curtainsuk-dawn-16/`, is:

- `assets/curtainsuk-advisory-team.css`
- `assets/curtainsuk-advisory-room.css`
- `assets/curtainsuk-advisory-team.js`
- `assets/curtainsuk-advisory-interactions.js`
- `assets/curtainsuk-advisory-motion.css`
- `assets/curtainsuk-adviser-jane.webp`
- `assets/curtainsuk-adviser-anne.webp`
- `assets/curtainsuk-adviser-noah.webp`
- `assets/curtainsuk-adviser-james.webp`
- `assets/curtainsuk-adviser-ben.webp`
- `assets/curtainsuk-adviser-natalie.webp`
- `sections/curtainsuk-advisory-team.liquid`
- `snippets/curtainsuk-adviser-art.liquid`
- `snippets/curtainsuk-adviser-card.liquid`
- `snippets/curtainsuk-advisory-room.liquid`
- `snippets/curtainsuk-advisory-spotlight.liquid`
- `templates/page.meet-our-team.json`
- `locales/en.default.json` — additive `advisory_team` namespace only; existing translations verified unchanged.

The [implementation report](../artifacts/specialist-advisory-phase1/IMPLEMENTATION.md), [review gallery](../artifacts/specialist-advisory-phase1/review-gallery.html), [changed-file manifest](../artifacts/specialist-advisory-phase1/changed-files.txt) and [source/upload read-back](../artifacts/specialist-advisory-phase1/preview-readback.json) form the review package. [Draft PR #167](https://github.com/Nylon1/CurtainsUK/pull/167) targets `release/production`; its checks tab is authoritative for CI on the current head. The initial read-back verified that all **505 live-theme file checksums remained unchanged** and the original nine scoped preview files matched source. The [portrait revision read-back](../artifacts/specialist-advisory-phase1/portraits-readback.json) confirms all 15 scoped files match source and all 505 live-theme files remain unchanged. The [portrait browser checks](../artifacts/specialist-advisory-phase1/portraits-browser.json) reconfirm six loaded portraits and no overflow at all five widths. These facts do not imply release approval.

C: had **42.28 GiB free at preflight and 41.89 GiB at 18:34 UTC**; see the [initial delivery storage observation](../artifacts/specialist-advisory-phase1/storage-final.json). The interactive revision started at 38.56 GiB free; its [latest storage receipt](../artifacts/specialist-advisory-phase1/interactive-storage.json) records **38.45 GiB free at 19:19:12 UTC**, with `restic` PID 45016 still present. No dependency installation or cleanup was performed. No completed backup or later snapshot coverage is claimed. This new work requires a later backup. All production release and owner-approval requirements below remain in force.

Only the new scoped files are candidates for a later theme release. The owner-review preview is unpublished and is not live-theme parity evidence. Do not publish an entire draft or copy historical theme settings/navigation. Before any authorised release: re-read protected HEAD and live target files, compare the scoped diff with current Theme Editor state, pass `curtainsuk-production-gate` and `protected-production-policy`, merge through the protected process and obtain explicit owner publication approval. This theme-only phase requires **no Vercel deployment**.

For an approved scoped page release, capture the affected live template/section/assets before upload and read them back afterward. Publish the native page/navigation only within the approved scope. Roll back by restoring those scoped bytes/page assignment and disabling the new entry if necessary; do not touch unrelated theme files, commerce, Naila or the live visualiser. A future API release records exact protected commit/tree, deployment and feature flags with a tested kill switch and prior known-good deployment. The historical `release/baseline.json` rollback target must not be used as current authority.
