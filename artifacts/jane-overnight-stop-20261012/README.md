# Jane overnight run: first batch verified, then stopped

12 October 2026. Starting PR #169 `47bc5680057353865c8d0fad984e97957649143f`; protected production `c7ca2d0eff1c128386863536d4ce46a877d874a8`. Both remote refs were rechecked. [Owner approval](https://github.com/Nylon1/CurtainsUK/pull/169#issuecomment-6114221325).

## Actual outcome

The new physical backup **1937679152**, recovery point **01:11:28.231 UTC**, was verified COMPLETED, with WAL-G enabled, after the required historical writes and within Nylon1's 24-hour recovery limit. The watcher exited normally. The operator used only Supabase connector **link_6ab960d9f9ac8191b16ced4d6d2fb91d** on the existing project; the encrypted replacement monitoring token performed read-only requests.

At **01:37:48 UTC**, the first eligible transaction committed. Job **ac425f78-f6ec-4623-97bb-df8763d79d5a** is at checkpoint **6**. Five existing eligible rows were verified unchanged, with receipt-only no-ops. One new index row, **pt-1227-634**, was inserted. Total index rows: **7**. Eligible coverage: **6/11,517**. Remaining eligible identities: **11,511**.

Exact readback verified all source/receipt hashes, before-images, field receipts, the old six rows and job, and restored ADMIN-only role membership. The original discontinued `pt-1200-907` remains untouched and outside eligible scope. Indexed knowledge remains separate from live purchase eligibility.

The runner then stopped with **INDEX_BATCH_LATENCY_STOP**. Receipt timestamps show approximately **11,361 ms** from the preceding resource-gate receipt to the stop, exceeding the unchanged **10,000 ms** limit. The gate used the runner's own clock. This duration includes source/publication fetches, local file/terminal transport, connector requests, write and exact readback. It does not measure PostgreSQL query execution alone. Local/connector transport is a suspected contributor, not a proven database performance fault.

The one-time follow-up is **PAUSED**. The operator and backup watcher have exited. Exactly one indexing write transaction was submitted. No second batch, replay, rollback, migration, source mutation, deployment, public activation, merge or paid model call occurred. **The 120-ID canary is incomplete and continuation is not cleared.**

## Checks and evidence

- Fresh source candidate check: 11,790 identities, unchanged candidate hash, same Browse generation, clean cache, no recent supplier activity.
- Fresh native Shopify sitemap reconciliation: 11,517 exact approved identities, zero unmapped URLs. Each of the first six live retail responses and public profile pages was rechecked.
- Admission host window: 65.16 seconds between distinct exporter samples; latest sample about 14 seconds old. CPU **5.41%**, I/O busy **2.95%**, memory **68.06%**, root disk **78.58%**, data disk **49.97%**. Connections **18/60**, no lock waits/deadlocks/recent database errors or supplier overlap.
- A read-only transport probe passed before writing, including all five unchanged historical source hashes. An earlier local terminal framing failure was repaired before any indexing submission; its evidence remains outside Git.
- Fsynced plan and exact verified receipt retained. New offline verification passed for SQL hash, journal sequence, all six outcome hashes, five no-ops, original historical state, role restoration, final checkpoint and seven-row count.
- Independent final read-only SQL at **01:38:32 UTC** confirmed the same checkpoint, original role grant and zero lock waits/deadlocks. Database size changed from 699,804,819 to 699,837,587 bytes between observations. This whole-database delta is not attributable exclusively to Jane.
- Previous **22 targeted** and **138-check historical** local evidence remains unchanged. These suites were not rerun for this operational report. No physical-device or new real-model readiness claim is made.

See [run-summary.json](run-summary.json), [hosted-readback.json](hosted-readback.json) and [verified-receipt.json](verified-receipt.json). `operator-binding.mjs` and `read-error-gate.mjs` are frozen audit copies of the one-time local helper code, not deployment entry points. They require the original private local configuration and an active trusted connector operator. No credential is included. Private request/response files, raw encrypted monitoring evidence and the full fsynced journal remain outside Git; their paths and SHA-256 digests are recorded in the summary.

## Next review

Reduce and instrument operator transport overhead without changing the 10-second limit or shifting measured work outside it. Prefer fewer connector round trips while retaining verification of the committed state, exact journal evidence and ambiguous-outcome handling. Test the revised binding locally and read-only before requesting an explicit resumption after this safety stop. Do not silently restart the paused follow-up.

A resumed run must retain job **ac425f78-f6ec-4623-97bb-df8763d79d5a**, start from verified offset **6**, refresh backup/resource/source/publication/permission gates, and complete the remaining **114 canary identities** before the canary assessment. The original deadline remains 12 October 10:00 UTC. No full-population throughput estimate is established by this first batch.

C: free space remained approximately **38.9 GiB**. No backup scripts, snapshots, historical worktrees or evidence were deleted or changed. Toshiba backup completion remains unverified. The 01:11 database backup predates this new transaction; retain its exact journal for recovery and include new local development in a subsequent verified backup. Additional paid AI cost: **US$0**. PR #167 and all existing customer systems remain untouched.
