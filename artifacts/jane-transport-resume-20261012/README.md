# Jane eligible indexing: transport correction and safe stop

12 October 2026. Starting PR #169 commit `90a6a0785e3eeaa18c24fe683279b84ec1c0a500`; protected production remains `c7ca2d0eff1c128386863536d4ce46a877d874a8`.

The owner's **Proceed** instruction authorised reviewing the earlier latency stop and resuming the same job. This increment added a local operator transport that sends the unchanged write transaction followed by a separate **post-COMMIT READ ONLY** transaction in one connector request. The exact combined wire SQL is fsynced and hashed before its single submission. Cached verification is tied to the original plan hash. An ambiguous response can only be reconciled read-only; there is no blind retry. All source and verification work remains inside the existing ten-second runner limit.

## Actual hosted outcome

The read-only protocol probe passed. Fresh bounded candidate and Shopify publication reconciliation again matched **11,517** approved identities. Backup `1937679152` remained COMPLETED, with recovery point **01:11:28.231 UTC**, within the owner's 24-hour RPO. Nylon1 owns recovery.

Eligible job `ac425f78-f6ec-4623-97bb-df8763d79d5a` resumed from offset **6** and committed **three** more six-record transactions. Each exact post-commit readback passed. Approximate end-to-end times were **7.569, 4.850 and 4.905 seconds**, below the unchanged ten-second gate. These include source/public-page reads, bridging and verification, not just database execution.

At **04:51:57.471 UTC**, the immediate resource check raised `STALE_HOST_METRICS`: its latest genuine source sample was **60.313 seconds old**. The valid preceding counter window was **74.154 seconds**, within the approved 120-second window. The separate 60-second freshness rule was correctly enforced. No fifth eligible transaction was attempted.

The operator exited and the one-time heartbeat remains **PAUSED**. This is an incomplete canary, not full population or public activation.

| Verified measure | Result |
| --- | --- |
| Eligible checkpoint / denominator | **24 / 11,517** |
| Eligible identities remaining | **11,493** |
| Search rows, including historical excluded identity | **25** |
| New rows in this resume / eligible job overall | **18 / 19** |
| Historical rows preserved exactly | **6** |
| Eligible historical no-ops | **5** |
| Eligible transactions overall | **4** |
| Canary target / still required | **120 / 96** |
| Ambiguous commits, retries, rollback | **0 / 0 / 0** |
| Durable receipts / current hashes verified | **24 / 24** |

Independent read-only reconciliation confirmed the current checkpoint, all receipt hashes and field coverage, exact original historical rows/job/receipts, and restored original role membership. No SET permission persisted. Migration history remains **81 entries**, latest `20261011180354`. At 04:52:46 UTC the database had **19/60 connections**, zero lock waiters/deadlocks, **699,903,123 bytes** overall and **688,128 bytes** in advisory table/index storage. Whole-database size changes are not attributed exclusively to Jane.

## Verification

**28 targeted local tests passed, 0 failed.** The six added cases cover combined committed readback with actual local PostgreSQL, fsynced wire hashes, mismatched plans, lost/empty responses, journal failure, read-only recovery, post-commit readback failure and the full unchanged ten-second limit. Existing tests also cover permissions, preserved rows, canary boundaries, 11,517 synthetic identities, concurrency, resource stops, cached/stale metrics and missing disk evidence. Historical wider security and theme tests remain preserved; they were not rerun for this transport-only change.

Command: `node --test lib/advisory/__tests__/eligible-transport.test.mjs lib/advisory/__tests__/eligible-execution.test.mjs lib/advisory/__tests__/host-metrics.test.mjs lib/advisory/__tests__/population-readiness.test.mjs`

The hosted receipt verifier independently checked all four prepared/verified journal pairs, three new exact wire payload hashes, historical equality and all 24 current receipt/hash pairs. The original private journal was continued, not replaced. [Machine-readable report](run-summary.json), [exact receipts](verified-receipts.json), [hosted summary](hosted-summary.json), [full readback](hosted-readback.json), [executed operator binding](operator-binding.mjs), [code manifest](execution-review.json), [publication reconciliation](publication-reconciliation.json).

## Next safe step

Keep the stopped operation paused. Prepare bounded **read-only pacing before admission** so a batch starts with enough genuine sample freshness for its work and immediate post-check. Cached metrics must never be relabelled or interpolated, and the 60-second freshness and ten-second duration limits must remain unchanged. Missing, stale or unhealthy data still prohibits writes. Reattest all prerequisites and resume **this job at offset 24**, preserving all prior receipts. Complete and independently assess the 120-ID canary before continuing. No new job, replay or rollback is appropriate.

The two observed steady commit intervals were about 17–18 seconds per six records. A naive extrapolation is roughly **9–10 hours** for the remaining scope, before monitoring/supplier pauses. Three batches are insufficient for a reliable estimate, and do not validate the old 4–6-hour forecast. The authorised hard stop remains **12 October 10:00 UTC**; it must not be extended implicitly.

No new migration, source mutation, deployment, public activation, merge, purchase or paid OpenAI call occurred. PR #167, Naila, Fabric Intelligence, Room Visualiser, commerce and supplier refreshes remain unchanged. Free C: space was **42,076,426,240 bytes (39.19 GiB)** after verification. Toshiba backup completion is still unverified. Current database backup predates these index commits; fsynced plans/readbacks are preserved, and later verified local/database backups remain necessary.

Implementation SHA-256: `f9f4c069311ebbe21524166d561506cf3e054bdfafe0e1d0749acea27ae6e5f1`. Migration bundle SHA-256 remains `eeaf8c9da085277783a263c8caf28ac3e1e46dac472ad508d3cb18f584948a50`. [Changed files](changed-files.txt).
