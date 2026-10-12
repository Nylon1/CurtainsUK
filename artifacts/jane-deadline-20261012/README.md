# Verified deadline checkpoint

The one-time operator reached its explicit **12 October 10:00 UTC deadline** and exited. The final transaction committed at **09:59:58.838 UTC**, with its fsynced verified receipt at **09:59:59.658 UTC**. Independent hosted readback at **10:00:47 UTC** confirms **2,766 / 11,517 eligible identities** and **8,751 remaining**. This population is incomplete. The operator process has exited, the journal has no pending write or lock, and the one-time heartbeat remains PAUSED. No continuing execution is claimed.

All **461** prepared plans and verified receipts match the exact approved manifest prefix without duplicates. Hosted identity and content digests match the saved plans; all 2,766 current index hashes match their receipts. There are 2,761 new eligible rows, five unchanged eligible historical rows and one separately preserved historical excluded row, for 2,767 total search rows. The original six-row job, rows and receipts remain exact, and original permissions are restored.

The identity-query correction in `242a2fd3` completed **150 batches / 900 identities** after its verified switch at 1,866. Source-through-receipt time was 4,674–10,175 ms. Admitted peak CPU was 49.714%, I/O 39.300%, memory 79.924%; every admitted sample was below the unchanged limits. These observed samples do not establish unlimited capacity.

A temporary monitoring backend failure at 2,118 and a read-only operator response timeout at 2,412 were diagnosed and exactly reconciled before restarting the same job. A later database error window held writes at 2,676; its cause was not attributed to Jane. The unchanged clean-error gate subsequently passed, and actual continuation reached 2,682 and beyond. No ambiguous write was retried and no threshold was raised.

The stop code was `INDEX_POPULATION_APPROVAL_REQUIRED` after the approval expired. [Owner instruction 6118449547](https://github.com/Nylon1/CurtainsUK/pull/169#issuecomment-6118449547) explicitly retains the 10:00 UTC deadline unless separately extended. The requested extension had no recorded approval at the final instruction check. **Next required approval: extend this same one-time job's execution window.** Resume from 2,766 after refreshing all gates and binding the approved new expiry; never create a replacement job, reset the checkpoint or replay completed records.

Protected production remains `c7ca2d0eff1c128386863536d4ce46a877d874a8`. Migration history remains 81 entries, latest `20261011180354`. Database size is 705,678,483 bytes; advisory tables/indexes 6,078,464 bytes. C: has 40,693,493,760 bytes free. Backup 1937679152 was reverified COMPLETED at 10:01:14 UTC, with recovery point 12 October 01:11:28.231 UTC, physical/WALG and no PITR. It remains within Nylon1's 24-hour RPO but predates these writes. A later verified database/workspace backup is required; Toshiba completion remains unverified.

Only the approved advisory indexing writes occurred. No migration, canonical catalogue mutation, supplier operation, paid AI call, deployment, public activation, merge or PR #167 change. Jane remains publicly inactive. Previously recorded tests remain preserved: the latest focused identity/PostgreSQL/recovery suite passed 9 tests; this evidence-only follow-up adds independent hosted and journal verification, not a new mock test claim. The original 4–6-hour estimate was not achieved. Between the first and last repaired receipts, 894 additional identities took 78.0545 minutes including holds and recovery interruptions. At that observed pace, the remaining 8,751 would take roughly 13 further hours. This is a provisional estimate, not a completion promise; changing conditions can alter it. Any continued run needs a newly approved time window and valid monitoring access throughout, and must stop before either expires. Additional OpenAI usage cost for this indexing work was US$0.

## Evidence

- `hosted-readback.json`: independent whole-job counts, digests, resource size and migration history.
- `verification.json`: exact manifest/plan/receipt and historical verification.
- `aggregate-readback.sql` and `verify-evidence.mjs`: exact read-only query and local verification used.
- `recovery-2118.json` / `recovery-2412.json`: no-pending-write reconciliations.
- `error-window-0951.json`: aggregate error diagnostic without customer query text.
- `operational-state.json`: stopped process, paused heartbeat, capacity and recovery point.
- `changed-files.json`: exact scope of this evidence update.

The earlier implementation changes and focused tests are in [identity repair](../jane-identity-lookup-repair-20261012/README.md), [read timeout recovery](../jane-read-timeout-recovery-20261012/README.md), [retail recovery](../jane-retail-recovery-20261012/README.md) and [activity recovery](../jane-overlap-repair-20261012/README.md).
