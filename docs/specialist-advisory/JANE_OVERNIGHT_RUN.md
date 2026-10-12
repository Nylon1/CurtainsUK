# Jane: one-time overnight operation, 11–12 October 2026

## Latest readmission: 6,750 verified; additive update work stays disabled

The unchanged operator reached **6,750 / 11,517** at18:26:57UTC. The earlier6642→6648 expired SQL plan was independently proven uncommitted by two readbacks and resolved using the already-tested journal procedure; no plan was blindly replayed. At18:27 a read-only monitoring request returned HTTP400 with `Project must be active and healthy`. Independent6750 reconciliation at18:30:39 confirms exact receipts/history/permissions and no pending write. Subsequent official project readback is ACTIVE_HEALTHY; metrics and backup reads are HTTP200. The same runner is readmitting under its unchanged controls.

The owner separately requested preparation of automatic updates. [New local components and evidence](JANE_AUTOMATIC_UPDATES.md) are additive and excluded from the active operator manifest. **35 scoped tests pass.** Do not enable them, apply their review SQL, start a second population or consume Browse's queue. Complete the original job first, reconcile changes since the earliest baseline, then run the gated read-only recommendation review. Complete source-change discovery remains an explicit review requirement.

Backup1945273696 is PENDING at the latest read; it is not a recovery point yet. The existing completed1937679152 remains checked under the24-hour RPO. Monitoring renewal is still pending before20:25UTC. No running code, scope or safety limit was changed by this work.

## Latest continuation: 6,612 verified

The repaired run reached **6,612 / 11,517** at 18:07 UTC. Two temporary read-service failures were independently reconciled without retrying writes. At 18:10 UTC the exact latest receipt, historical records and restored permissions were verified, with no pending plan. Confirmed read-only MCP timeouts and monitoring HTTP 500/502/503/504 now enter the existing readback, 15-second backoff and fresh-admission flow. Unknown/access failures and ambiguous writes still stop. **23 targeted tests passed.** Scope and safety limits are unchanged; the same job is being readmitted. [Evidence](../../artifacts/jane-recovery-6384-20261012/README.md).

## Latest recovery: 6,384 verified

At 17:38 UTC a connector send failure left the next write ambiguous. Two independent hosted observations at 17:45:56 and 17:46:05 UTC proved the SQL had expired without committing: unchanged checkpoint 6,384, no next-six rows/receipts, no old/prepared transactions, exact previous receipt, preserved historical records and restored permissions. The original journal remains intact with a separate, fsynced `expired-uncommitted` resolution.

The repair passed **26 targeted tests**. The operator is readmitting the same job with all fresh checks and a newly generated SQL plan; it never resubmits the expired SQL. Scope, six-record transactions, pacing, 20-batch invocation cap, resource thresholds and credential expiry remain unchanged. **5,133 remain in this snapshot.** Monitoring renewal is still pending before the 20:25 UTC conservative use cutoff. This is progress and recovery evidence, not full coverage.

[Recovery evidence](../../artifacts/jane-recovery-6384-20261012/README.md).

## Latest continuation: 6,228 verified

The owner's Proceed instruction resumed the same approved until-complete job after a read-only source request timed out at 16:43 UTC. Independent hosted reconciliation at 17:23 UTC confirms checkpoint **6,216**, exact last-batch hashes/receipt, original historical records and restored permissions, with no pending write. No uncertain write was replayed.

Fresh backup and monitoring access passed before the existing population operator restarted. Actual fsynced post-COMMIT receipt at **2026-10-12T17:25:55.188Z** confirms **6,228 / 11,517**, leaving **5,289** in this snapshot. The same journal, job and six-record/20-batch invocation limits remain active. This is progress, not completion. The operator must stay connected to the approved SQL connector; a GitHub comment or scheduled follow-up is not execution.

The current private monitoring credential's conservative use ceiling remains **12 October 20:25 UTC**. The existing masked renewal window is waiting for input. Do not extend credential age based on the no-deadline approval. PR #169 remains the review destination, as clarified by the owner. No migration, source mutation, paid AI call, public activation, deployment or PR #167 change.

[Resume evidence](../../artifacts/jane-resume-6216-20261012/README.md).

Starting PR #169: `c3cf45f936f3978567ff3c9ece476a4dcfdc8c54`. Protected production: `c7ca2d0eff1c128386863536d4ce46a877d874a8`, unchanged at 22:00 UTC. [Exact owner instruction](https://github.com/Nylon1/CurtainsUK/pull/169#issuecomment-6114221325).

## Verified milestone 3000

Independent hosted readback at **2026-10-12T10:52:46.814541+00:00** confirms **3,006 / 11,517 eligible identities**, with **8,511 remaining**. All **501** saved plans and verified receipts match the exact manifest prefix and hosted identity/content digests. The same until-complete operator is continuing. This is a progress snapshot, not full coverage.

The resumed binding has verified 40 batches. Source-through-receipt durations were 4358–8673 ms. Fresh backup/access, resource/error, source/publication, historical and permission gates remain active. No migration, source mutation, paid AI call, deployment, activation, merge or PR #167 change.

[Milestone evidence](../../artifacts/jane-progress-3000-20261012/README.md).

## Verified milestone 4000

Independent hosted readback at **2026-10-12T12:16:58.976852+00:00** confirms **4,014 / 11,517 eligible identities**, with **7,503 remaining**. All **669** saved plans and verified receipts match the exact manifest prefix and hosted identity/content digests. The same until-complete operator is continuing. This is a progress snapshot, not full coverage.

The resumed binding has verified 208 batches. Source-through-receipt durations were 4267–18954 ms. Fresh backup/access, resource/error, source/publication, historical and permission gates remain active. No Jane migration, source mutation, paid AI call, AI deployment, public activation or PR #167 change. The separately owner-authorised PR #172 merge and single-file Shopify tracking release did not change this indexer or its source data.

[Milestone evidence](../../artifacts/jane-progress-4000-20261012/README.md).

## Verified milestone 5000

Independent hosted readback at **2026-10-12T13:39:41.008675+00:00** confirms **5,016 / 11,517 eligible identities**, with **6,501 remaining**. All **836** saved plans and verified receipts match the exact manifest prefix and hosted identity/content digests. The same until-complete operator is continuing. This is a progress snapshot, not full coverage.

The resumed binding has verified 375 batches. Source-through-receipt durations were 4267–18954 ms. Fresh backup/access, resource/error, source/publication, historical and permission gates remain active. No Jane migration, source mutation, paid AI call, AI deployment, public activation or PR #167 change. The separately owner-authorised PR #172 merge and single-file Shopify tracking release did not change this indexer or its source data.

[Milestone evidence](../../artifacts/jane-progress-5000-20261012/README.md).

## Until-complete continuation

On 12 October the owner explicitly instructed this thread: **“Proceed with no deadline.”** [Recorded instruction](https://github.com/Nylon1/CurtainsUK/pull/169#issuecomment-6122415089). This supersedes the prior 10:00 UTC cutoff for existing job `ac425f78-f6ec-4623-97bb-df8763d79d5a` and its exact 11,517-ID snapshot only. The last independently reconciled checkpoint is **2,766**, with **8,751 remaining**. No new job, full rebuild or recurring refresh is authorised.

Implemented a narrowly scoped until-complete approval. Ordinary population approvals still require a future expiry within 24 hours. Infinite deadlines are rejected without the exact project/job/snapshot/count and recorded direct instruction. The resumed job must already exist; a missing job cannot bootstrap. Completion still terminates the runner. Every SQL transaction remains bounded by fresh source/checkpoint/backup attestation expiry, at most 60 seconds, plus the existing 3-second statement and 500 ms lock timeouts. No credential lifetime, 24-hour backup RPO, resource threshold, source/publication check, canary, concurrency control, pacing or batch bound changed.

**45 focused tests passed**, including actual local PostgreSQL execution, grant restoration, concurrency, completed traversal, scoped no-deadline validation, fresh-evidence expiry, bounded host waiting and recovery failures. Publication reconciliation again matches exactly 11,517 identities, with 273 unpublished candidates excluded and no unmapped publications. Migration bundle checksum remains unchanged. New dependency checksum: `39b6fd76b4c8ff4f8e2827557cba8989632d93fb18b40c882d13d0915cb0c782`.

The new private operator binding passed its read-only hosted probe at 2026-10-12T10:33:50.585Z. Exact next-six identity, retail/publication, restored grants, historical state, backup and genuine resource checks passed with zero hosted writes. The first resumed transaction is now verified at **2026-10-12T10:36:11.611Z**, advancing the same job to **2,772**. The operator is actively continuing; later receipts are recorded in the original journal. The same original fsynced journal and all historical evidence are retained. The heartbeat remains paused to avoid duplicate operators; the foreground bridge is the execution path. No migration, source mutation, paid AI call, deployment, public activation, merge or PR #167 change.

[Implementation and evidence](../../artifacts/jane-until-complete-20261012/README.md).

## Previous deadline checkpoint

The one-time operator reached its explicit **12 October 10:00 UTC deadline** and exited. The final transaction committed at **09:59:58.838 UTC**, with its fsynced verified receipt at **09:59:59.658 UTC**. Independent hosted readback at **10:00:47 UTC** confirms **2,766 / 11,517 eligible identities** and **8,751 remaining**. This population is incomplete. The operator process has exited, the journal has no pending write or lock, and the one-time heartbeat remains PAUSED. No continuing execution is claimed.

All **461** prepared plans and verified receipts match the exact approved manifest prefix without duplicates. Hosted identity and content digests match the saved plans; all 2,766 current index hashes match their receipts. There are 2,761 new eligible rows, five unchanged eligible historical rows and one separately preserved historical excluded row, for 2,767 total search rows. The original six-row job, rows and receipts remain exact, and original permissions are restored.

The identity-query correction in `242a2fd3` completed **150 batches / 900 identities** after its verified switch at 1,866. Source-through-receipt time was 4,674–10,175 ms. Admitted peak CPU was 49.714%, I/O 39.300%, memory 79.924%; every admitted sample was below the unchanged limits. These observed samples do not establish unlimited capacity.

A temporary monitoring backend failure at 2,118 and a read-only operator response timeout at 2,412 were diagnosed and exactly reconciled before restarting the same job. A later database error window held writes at 2,676; its cause was not attributed to Jane. The unchanged clean-error gate subsequently passed, and actual continuation reached 2,682 and beyond. No ambiguous write was retried and no threshold was raised.

The stop code was `INDEX_POPULATION_APPROVAL_REQUIRED` after the approval expired. [Owner instruction 6118449547](https://github.com/Nylon1/CurtainsUK/pull/169#issuecomment-6118449547) explicitly retains the 10:00 UTC deadline unless separately extended. The requested extension had no recorded approval at the final instruction check. **Next required approval: extend this same one-time job's execution window.** Resume from 2,766 after refreshing all gates and binding the approved new expiry; never create a replacement job, reset the checkpoint or replay completed records.

Protected production remains `c7ca2d0eff1c128386863536d4ce46a877d874a8`. Migration history remains 81 entries, latest `20261011180354`. Database size is 705,678,483 bytes; advisory tables/indexes 6,078,464 bytes. C: has 40,693,493,760 bytes free. Backup 1937679152 was reverified COMPLETED at 10:01:14 UTC, with recovery point 12 October 01:11:28.231 UTC, physical/WALG and no PITR. It remains within Nylon1's 24-hour RPO but predates these writes. A later verified database/workspace backup is required; Toshiba completion remains unverified.

Only the approved advisory indexing writes occurred. No migration, canonical catalogue mutation, supplier operation, paid AI call, deployment, public activation, merge or PR #167 change. Jane remains publicly inactive. Previously recorded tests remain preserved: the latest focused identity/PostgreSQL/recovery suite passed 9 tests; this evidence-only follow-up adds independent hosted and journal verification, not a new mock test claim. The original 4–6-hour estimate was not achieved. Between the first and last repaired receipts, 894 additional identities took 78.0545 minutes including holds and recovery interruptions. At that observed pace, the remaining 8,751 would take roughly 13 further hours. This is a provisional estimate, not a completion promise; changing conditions can alter it. Any continued run needs a newly approved time window and valid monitoring access throughout, and must stop before either expires. Additional OpenAI usage cost for this indexing work was US$0.

[Exact final evidence](../../artifacts/jane-deadline-20261012/README.md).

## Previous milestone: second thousand verified

Independent hosted readback at **12 October 08:52:15 UTC** confirms **2,016 / 11,517 eligible identities**, 2,016 matching index/receipt hashes, and 2,017 total knowledge rows. All 336 saved plans and receipts match the exact manifest prefix without duplicate IDs. The same operator is continuing. This is a progress snapshot, not completed coverage.

The source lookup correction in `242a2fd3` has completed 25 verified batches in this snapshot. Source-through-receipt times were 4674–10175 ms, below the unchanged 20-second ceiling. Full error, pressure, activity, backup and eligibility checks remain active. Earlier focused tests and diagnostic plans are preserved; no additional test campaign was needed for this evidence update.

Protected production remains `c7ca2d0eff1c128386863536d4ce46a877d874a8`. Migration history remains 81 entries, latest `20261011180354`. Database size is 704,097,427 bytes; advisory tables/indexes total 4,612,096 bytes. C: has 41,059,041,280 bytes free. Backup 1937679152 remains the checked recovery point under Nylon1's 24-hour RPO; a later backup is needed for these new writes. Toshiba completion remains unverified. No migration, source mutation, paid AI call, deployment, public activation or PR #167 change. The 10:00 UTC deadline remains pending separate extension.

[Milestone evidence](../../artifacts/jane-2000-20261012/README.md).

## Direct identity lookup restored

At **1,866 / 11,517**, the operator switched at a verified read-only recovery wait with no pending write or journal lock. Independent readback confirmed all historical records and permissions unchanged. The new read-only probe passed, then the same job actually resumed beyond1,866. Latest receipt in this evidence snapshot: **1914** at **2026-10-12T08:44:38.356Z**.

Hosted query plans identified the recurring source-lookup problem: encoded ID expressions inherit the **C collation**, while the valid existing fabric identity index uses **default**. PostgreSQL therefore scanned the broader eligibility index and filtered fabric IDs afterward. Strictly validated ASCII identity literals preserve the approved IDs and permit direct use of the existing primary key. No index, schema, source record, eligibility rule or generated write plan was changed.

The estimated plan cost dropped from1,735.85 to30.08. One bounded six-ID execution took20.825ms (planning24.557ms), with104 shared-buffer hits and zero disk reads. This sample does not establish whole-run throughput or cold-cache performance. **Nine focused tests passed**, including rejection of SQL syntax/control characters, all11,517 manifest IDs, local PostgreSQL result/order/null equivalence, index usage, timeout recovery and retail recovery. The canonical source-query fields are unchanged. All pressure, source/publication, supplier, ownership, backup, timeout and grant-restoration gates remain active.

[Exact plans, tests, checksums and changed files](../../artifacts/jane-identity-lookup-repair-20261012/README.md).

## Read-only timeout recovery at 1,560

A bounded source read was cancelled by the unchanged three-second statement timeout. The last committed checkpoint and original history/permissions reconciled exactly; no next-batch write was pending. Added narrow recovery only for a confirmed timeout of one read-only transaction. Full admission, the clean error window and exact readback remain required. Writes, mixed transactions, access errors and ambiguity cannot be retried. **12 focused tests passed.** The first hosted read-only probe met database gates but received a Shopify profile503; its149-second retry delay was honoured. The subsequent read-only hosted probe passed with zero writes, all six live profiles available, and exact source/checkpoint/permission evidence. The repaired population operator is resuming from1560. [Evidence and exact changed files](../../artifacts/jane-read-timeout-recovery-20261012/README.md).

## First 1,000 milestone: continuing

Independent hosted readback at **12 October 07:08:34 UTC** confirms **1,008 / 11,517 eligible identities**, 1,008 matching current/receipt hashes and 1,009 total knowledge rows. All 168 saved plans and receipts match the exact approved manifest prefix without duplicate IDs. Five eligible historical records remain no-ops; the sixth historical excluded record is preserved and must not be offered for purchase. The operator is continuing the same job; this is a progress snapshot, not completion.

Two later interruptions were recovered after exact read-only reconciliation: a read-only operator response timeout at546, then a failed read-only source lookup at978. No pending write existed in either case. The source reread succeeded; monitoring subsequently identified one SQLSTATE57014 cancelled statement. Writes remained blocked until the five-minute error window was clean. Temporary resource/activity holds continue to reconcile and recover automatically without raising limits or replaying uncertain writes.

Migration history is unchanged at81 entries, latest20261011180354. Database size is702,008,467 bytes; advisory tables/indexes total2,678,784 bytes. Completed backup1937679152 remains the recovery point checked before each batch under Nylon1's24-hour RPO. It predates these writes, so a subsequent verified backup is still required. C: free space was41,532,203,008 bytes; Toshiba completion remains unverified. No migration, source mutation, deployment, paid AI call, public activation or PR167 change. The10:00UTC deadline remains pending explicit extension.

[Milestone evidence](../../artifacts/jane-first1000-20261012/README.md).

## Retail read recovery added at verified checkpoint 246

The repaired overlap operator committed 16 batches from 150 to **246**, and recovered automatically through three short activity holds using exact read-only reconciliation. At05:57:23 UTC a catalogue/profile status check failed before the next write. The old binding did not capture the failing HTTP status. A bounded independent reread of all six next IDs returned **HTTP200**, exact identities, matching canonical profiles and browse/launch eligibility. Last committed receipt, checkpoint246, original history and permissions were independently reconciled.

The focused follow-up adds retryable read-only holds for HTTP429/5xx and explicit network timeout/reset failures. It honours Retry-After, waits for all parallel read ports to settle, reconciles the last exact commit and re-runs complete fresh admission. HTTP404/400/401/403, redirects, changed eligibility/identity and integrity failures remain closed. No failed write is replayed. **Nine focused tests passed**. [Evidence](../../artifacts/jane-retail-recovery-20261012/README.md). No migration, source change, paid API call, threshold increase or public activation. The10:00UTC deadline remains pending explicit extension.

## Previous implementation: overlap correction and recoverable holds

The owner directed a focused correction in [PR comment6118449547](https://github.com/Nylon1/CurtainsUK/pull/169#issuecomment-6118449547), then explicitly instructed this thread to repair temporary safety issues and keep proceeding. This authorises the narrow correction below and read-only recovery of temporary holds. It does not waive pressure thresholds, uncertain commits, access/integrity checks or the separately retained10:00UTC deadline.

The operator no longer calls every active client a supplier refresh. It uses sanitised PostgreSQL role/application/state/age/wait, transaction and lock evidence. Observed customer PostgREST and platform exporter SELECT/WITH reads under3 seconds may coexist only without write XIDs, non-read relation locks, advisory locks, blocking or job identity. Unknown short clients trigger a read-only drain; prolonged or conflicting activity blocks admission. Query text and customer parameters never leave PostgreSQL. Explicit supplier recent/running checks are independent and retained.

Temporary activity, load or cached-metric holds stop all writes, reconcile the exact latest committed six-ID receipt against the original fsynced journal, wait5–15 seconds, then repeat complete admission. A pending/ambiguous write, changed record, permission issue, missing metadata, access failure or20-second batch breach cannot be automatically resubmitted. All six-record, five-second pacing,20-batch,3-second SQL,500-ms lock,180-second freshness and120-second counter-window rules remain.

**12 targeted tests passed**, including the actual local PostgreSQL metadata query and transport recovery tests. The existing hosted checkpoint was freshly reconciled at **150/11,517**, with151 total search rows and original history/permissions exact. Full live publication again matched11,517 IDs. Repaired execution is not claimed from preparation; the actual operator probe and verified receipts establish liveness. [Focused diff/evidence](../../artifacts/jane-overlap-repair-20261012/README.md).

## Previous state: 150 verified, paused on concurrent database activity

The approved continuation actually ran from the independently verified 120-ID canary. Five more six-ID transactions passed exact post-COMMIT readback and fsynced receipts, with approximate source-through-receipt times **5.051, 4.808, 4.215, 4.612 and 4.390 seconds**. Independent hosted reconciliation at **12 October 05:28:42.725 UTC** confirms **150/11,517 eligible identities**, **11,367 remaining**, **151 total search rows**, **145 new rows** and five eligible historical no-ops. All 150 hashes, receipt fields and before-images reconcile against the 25 prepared plans. The original six rows/job/receipts and permissions remain exact.

At **05:27:50.273 UTC**, the next admission raised **INDEX_RESOURCE_STOP** because **one other active database client** was observed. The existing operator conservatively treats any other active client as potential overlap. Actual supplier refresh count was zero, the source cache was clean, errors/locks/deadlocks were zero, and connections were 23/60. Genuine host measurements were CPU **8.97%**, I/O **5.28%**, memory **74.45%**, disk **78.59%**, all within their existing thresholds. The other client's purpose and duration were not captured; do not call this a confirmed supplier refresh or host pressure breach.

The operator exited before preparing or submitting offset150–156. There is **no pending or ambiguous transaction**, no retry, rollback or automatic restart. The one-time follow-up remains **PAUSED**. The durable canary remains valid evidence of its completed assessment, while every future batch still needs fresh admission. Any resumed operation must review the overlap, reattest quiet-state and all source/publication/backup/resource conditions, and use **the same job at offset150** with its original journal. The approved 180-second host freshness, 120-second distinct counter window, below-20-second batch time, 3-second SQL and 500-ms lock timeouts are unchanged. The hard stop remains **12 October 10:00 UTC**.

Code and canary evidence were pushed in `10481fdee251c67a616e68fb9429b3f826c19db0`. **40 targeted tests passed**; this follow-up changes evidence/documentation only. Migration history is still 81 entries, latest `20261011180354`, and its checksum is unchanged. Database size was **700,279,955 bytes**, advisory tables/indexes **1,056,768 bytes**. Only 30 new knowledge rows were added in this continuation. No migration, source mutation, paid OpenAI call, deployment, activation, merge or recurring refresh occurred. PR #167 and all protected customer systems remain unchanged.

Backup 1937679152 was rechecked before each transaction under Nylon1's 24-hour RPO. It predates the new writes; a later verified database/workspace backup remains necessary. Toshiba completion remains unverified. No storage cleanup or backup change occurred.

[Exact stop evidence](../../artifacts/jane-resource-stop-20261012/README.md). Earlier checkpoint instructions below are historical and superseded by verified offset150.

## Previous milestone: 120-ID canary independently verified

On 12 October at 05:20:55 UTC, independent hosted readback confirmed **120/11,517 eligible identities**, **11,397 remaining**, **121 total search rows**, **115 new eligible rows** and **five historical eligible no-ops**. All 120 hashes/receipts and the original six rows/job/receipts reconcile exactly. Original permissions are restored. Migration history remains 81 entries, latest `20261011180354`. The completed canary is durably recorded; continuation has not started in this evidence snapshot.

The latest invocation completed 16 six-ID transactions from offset 24 to 120 using the stricter 60-second freshness and ten-second batch limits. Its approximate source-through-fsynced-readback durations were 4.078–6.987 seconds. All immediate post-batch resource checks passed. Peak CPU was 36.25%, memory 78.82%, disk 78.59%, with 23 connections. These observations do not imply spare capacity is unlimited. Database size was 700,222,611 bytes and isolated advisory tables/indexes 1,007,616 bytes. No locks, deadlocks or new migration were observed. The discontinued historical fabric still returns retail HTTP 404.

New owner instructions approve [latest genuine host sample age up to 180 seconds](https://github.com/Nylon1/CurtainsUK/pull/169#issuecomment-6118103282) and [end-to-end batch time below 20 seconds](https://github.com/Nylon1/CurtainsUK/pull/169#issuecomment-6118124996), solely for the exact approved one-time population/job. Genuine distinct counter windows remain at most 120 seconds. Source/publication/checkpoint/prerequisite and SQL/error freshness remain 60 seconds. SQL statement/lock limits stay 3 seconds/500 ms; pressure gates, six IDs, five-second pacing, 20 batches/invocation, exact readbacks, fsynced journal and transaction-local grants are unchanged. General/default policies remain 60 seconds/ten seconds. **40 targeted tests passed**, including the new exception boundaries and unchanged safeguards.

The prepared continuation binds existing job `ac425f78-f6ec-4623-97bb-df8763d79d5a` at offset 120, the independently verified canary and the original shared journal. Latest publication reconciliation again matched the exact 11,517 approved identities and excluded 273 unpublished candidates. Every live batch must still pass fresh admission. The hard stop remains **12 October 10:00 UTC**. The heartbeat remains PAUSED to avoid duplicate execution; only the actual foreground operator can perform the work. No recurring refresh was enabled.

Migration checksum is unchanged: `eeaf8c9da085277783a263c8caf28ac3e1e46dac472ad508d3cb18f584948a50`. Prepared continuation dependency checksum: `cb63197ad50775a539f8f722520054b6af21e023ef50042bed161a4c0d173766`. The canary executed earlier code `3ee2b389288817bee71e4ad13f22e22eb9d6e3cd1bc8e7bc43fb30b1e2690943`; historical evidence has not been relabelled as using the new limits.

Backup 1937679152, completed physical recovery point 12 October 01:11:28.231 UTC, satisfies the original approved recovery condition and is rechecked before every batch. Nylon1 owns recovery under the 24-hour RPO. It predates the new indexing commits; a later verified backup remains necessary. C: has approximately 39.09 GiB free. Toshiba completion remains unverified. No new migration, source mutation, deployment, paid AI call, public activation or merge occurred. PR #167 and all protected customer systems are unchanged.

[Canary evidence](../../artifacts/jane-pacing-resume-20261012/README.md). Earlier offset and limit instructions below are historical; the current owner-approved limits and verified offset 120 above supersede them.

## Previous execution state at offset 24

**12 October, 04:52 UTC: PAUSED after `STALE_HOST_METRICS`, checkpoint 24.** Following the owner's Proceed instruction, a tested combined submission/post-COMMIT readback transport resumed the same eligible job from offset 6. Three more six-record transactions committed and verified, with approximate batch durations 7.569, 4.850 and 4.905 seconds. The ten-second limit was unchanged. Eligible coverage is **24/11,517**; **25** total search rows include the preserved historical excluded identity. All original rows/job/receipts and permissions remain exact. No ambiguous commit, retry or rollback occurred. [Latest report](../../artifacts/jane-transport-resume-20261012/README.md).

At 04:51:57.471 UTC the immediate post-batch check found the latest genuine sample **60.313 seconds old**. It correctly stopped under the unchanged 60-second freshness requirement. Its 74.154-second counter window itself was permitted. The heartbeat remains PAUSED and no operator is running. The 120-ID canary remains incomplete, with **96** identities left. The new dependency hash is `f9f4c069311ebbe21524166d561506cf3e054bdfafe0e1d0749acea27ae6e5f1`; migration checksum is unchanged. Local targeted tests: **28 passed**.

Before another invocation, prepare bounded read-only pacing to wait for sufficient genuine sample freshness before admission. Never substitute HTTP time, interpolate cached data or waive a stop. Resume the same job at **offset 24**, retaining its shared journal at `%USERPROFILE%\.codex\tmp\jane-eligible-live-20261012-0124\journal`. Latest operator evidence is in `%USERPROFILE%\.codex\tmp\jane-eligible-resume-20261012-0445`. Refresh all admission evidence and observe the original 10:00 UTC hard stop. No restart is scheduled. Current local status is `INDEXING_PAUSED_STALE_HOST_METRICS` with four total eligible write transactions.

The following first-batch account is retained as historical evidence; its offset 6 resume instruction is superseded by offset 24 above.

## Previous execution stop

**12 October, 01:38 UTC: PAUSED after `INDEX_BATCH_LATENCY_STOP`.** The first eligible transaction committed and its exact readback passed. Job `ac425f78-f6ec-4623-97bb-df8763d79d5a` is at offset **6**, with five unchanged historical rows and one newly indexed identity (`pt-1227-634`). Seven search rows exist in total. The 120-ID canary is incomplete. [Exact report](../../artifacts/jane-overnight-stop-20261012/README.md).

The watcher exited normally after discovering completed physical backup `1937679152`, recovery point **12 October 01:11:28.231 UTC**. Fresh official reads confirmed it. The active Codex operator then bound the existing runner to the existing connector and verified current source/publication, metrics, SQL/error/supplier and historical/permission gates. Exactly one indexing transaction was submitted. The unchanged end-to-end latency gate stopped the run at approximately **11.36 seconds**, despite successful commit/readback. Do not interpret this as a failed or absent transaction, and do not replay it.

The Codex follow-up `jane-one-time-overnight-indexing` is **PAUSED**. No backup watcher or indexing operator process remains running. No second transaction, automatic retry, destructive rollback, migration or recurring refresh schedule ran. Historical plans and evidence are preserved. Review transport overhead and refresh every admission check before any explicit resumption. Resume this job at offset **6**, never create a replacement job or waive the 10-second limit. Complete the remaining 114 canary identities and its independent assessment before continuation.

The text below preserves the approved safeguards and original resume procedure. Its bootstrap instruction applies only when there is no eligible job; the verified job above now exists. The one-time approval's hard deadline remains **12 October 10:00 UTC**.

Local operator status: `%USERPROFILE%\.codex\tmp\jane-overnight-status.json` now records `INDEXING_PAUSED_LATENCY_LIMIT`, one actual write transaction and the verified operator checkpoint. The original `BACKUP_READY_OPERATOR_REQUIRED` watcher receipt is preserved separately. While the watcher was waiting, its PID and 30-second liveness pulse were checked; official backup reads were ten minutes apart. It exited normally when the required backup became available. The encrypted replacement token and append-only backup receipts remain outside Git. It is configured for this project, Backups Read and Logs Read only, with a 24-hour lifetime. The script applies a conservative 23-hour local use ceiling; provider expiry is enforced by API rejection. Independent token-metadata expiry is not available through these scopes.

The owner must keep the laptop **powered, awake and online**, with Codex running. Read-only Windows checks showed plugged-in power, 100% battery and automatic idle sleep disabled on both AC and battery. No power setting was changed. Closing the lid or app, manual sleep, restart or lost network can still interrupt the operation. No independent database credential or cloud runner was provisioned. If the app cannot resume the thread, the watcher alone cannot index. Do not conceal that distinction.

## Narrow monitoring change

`host-window-policy.mjs` binds the exception to the owner's comment and exact eligible snapshot. Default monitoring remains 60 seconds. Only the approved one-time population may opt into a maximum **120,000 ms between distinct exporter samples**. Both exact source timestamps are now recorded. The latest sample must still be at most **60,000 ms old**. Cached identical samples cannot form a new rate window; no interpolation, HTTP timestamp substitution or cache bypass is used.

CPU <60%, I/O busy <50%, memory <80%, both root/data usage <85%, connections <70%, no lock wait/new error/new deadlock/supplier overlap, and batch latency <10 seconds remain unchanged. All source, checkpoint, prerequisite and publication evidence still expires after 60 seconds. Missing metrics, counter resets, failed collectors, changed topology or missing root/data backing-disk coverage stop admission.

## Resume procedure for this thread

1. Read current PR instructions and this status. Verify watcher liveness, heartbeat ACTIVE state, local free space and no competing operator. Retain historical evidence and any crash lock. No repeated owner approval is needed for healthy batches.
2. A completed physical backup must have its actual recoverable point **after 11 October 18:55:39.439584 UTC**, no older than 24 hours. Owner **Nylon1** manages recovery. Require official `COMPLETED` evidence and valid recovery scope. A schedule, in-progress backup or the old 01:03 backup is insufficient. Do not buy PITR, start a backup/restore, or waive the condition.
3. Use existing `supabase_execute_sql`, link `link_6ab960d9f9ac8191b16ced4d6d2fb91d`, project `hqysjumypgeapgmqkcrx`. Its read-only use was verified in this task. The monitoring token does not authorize SQL. No connector token extraction, new login, persistent grant or additional credential is permitted.
4. Reattest the exact eligible manifest from `artifacts/jane-eligible-scope-20261011/eligible-manifest.json`, identity SHA `90634a31d12f1690ec48d2e6353a23c21be245a00ca431f8ad0cd181faf68488`, count **11,517**. Existing candidate SQL and sitemap reconciliation are the approved sources. Recheck live retail eligibility for each six records; publication, prices and source data must not be inferred from Jane's index.
5. Use `runEligiblePopulation` / `runEligibleInvocation` in `lib/advisory/eligible-runner.mjs`, `prepareEligibleBatch`, exact read-back verification and `createIndexJournal`. Preserve the old six-row job and historical baseline. Create a separate job only atomically with the first admitted batch. Bind the updated dependency checksum, `hostMonitoringApproval: OVERNIGHT_HOST_APPROVAL`, owner references and a bounded expiry to the actual invocation. Regenerate the local implementation manifest rather than substituting the old hash.
6. Bind fresh trusted checkpoint, six-record source, retail/publication, backup/access, genuine source-timestamped host metrics, current SQL connections/locks/error deltas/supplier quiet-state and read-back ports. Existing helpers `%USERPROFILE%\.codex\tmp\jane-read-monitoring.mjs` and `jane-check-current-metrics.mjs` provide bounded read-only evidence, not automatic write clearance. Missing evidence is a stop. Current Management API logs use `/analytics/endpoints/logs`; the old `logs.all` endpoint is removed. Consult official documentation before binding log queries.
7. Fsync each exact SQL plan before one submission. Use the existing transaction-local advisory_indexer SET/revoke pattern, shared five-second gate, three-second statement and 500 ms lock timeouts. At most six identities/transaction and 20 transactions/invocation. Read back hashes, receipts, checkpoint, historical rows and restored grants. Ambiguous outcome means read-back only; never blindly resubmit.
8. At 120 processed IDs, reconcile **115 maximum new rows and five no-ops**, exact receipts/hashes, exclusion of the historical discontinued ID from purchase recommendations, database growth, performance, publication and permissions. Persist a healthy canary receipt before continuation. Report at each 1,000 boundary and completion here and on PR #169. Total expected new unique rows: **11,512**. Do not claim this coverage before hosted read-back proves it.
9. Stop on any drift, stale/missing evidence, pressure, supplier overlap, access/credential failure or uncertain commit. Preserve all records/receipts. Pause this follow-up on such a breach, completion or the hard deadline. Waiting for the ordinary backup is the only expected pending admission state; it may be checked again without owner intervention. No indefinite restart or refresh loop.

## Evidence and boundaries

At 22:01:37 UTC read-only SQL showed six original rows, unchanged historical checkpoint six, 17/60 connections, no lock waits and zero cumulative deadlocks. The 22:04:15 backup read returned HTTP 200, latest completed physical backup `1928024708`, recovery point **11 October 01:03:26.503 UTC**. It does not qualify. These are observations, not current admission clearance.

Targeted tests and current host probe are recorded in `artifacts/jane-overnight-readiness-20261011/`. Existing 138-test evidence remains preserved; only changed monitoring/eligible-admission paths and related stop-gate regressions are rerun. No new paid model calls, purchases, migrations, database index writes, deployments, public activation, merges or changes to customer systems occurred during setup. PR #167 remains independent.

The earlier **4–6-hour** population estimate remains provisional until the canary measures throughput; backup waiting and safety pauses are extra. Expected additional paid AI cost is **US$0**. Toshiba backup completion remains unverified; this development needs a later verified backup.
