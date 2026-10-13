# First hosted six-fabric index batch: completed

11 October 2026, 18:55 UTC. The owner separately approved the six-identity data scope and the transaction-only permission sequence in the [original review](../jane-first-index-batch-20261011/PERMISSION_REVIEW.md). Exactly one batch ran in existing project `hqysjumypgeapgmqkcrx`. No later batch is authorized or scheduled.

Starting PR #169: `dee5227092bd243b408b9ddd65a0617580d0ecaf`. Protected production remains `c7ca2d0eff1c128386863536d4ce46a877d874a8`. The reviewed generator was unchanged: UTF-8/LF SHA-256 `de31687232e9b7dd6476f3da247d58bcc040d682d003dc0bbd19149fcbb2083f`.

## Executed scope and verification

- Job: `a6c0d329-935e-4c31-b8ef-71a52f6d9149`.
- [Exact submitted SQL](approved-batch.sql), SHA-256 `6fc695b15f00b171cea6d4027a25300b7a967b54cee991f1f69bc8d34399b2d4`. [Immutable plan receipt](approved-batch.sql.json), [fresh inputs and approval](input.json), [execution response](execution-receipt.json).
- Six search rows, six identity/hash/before-image receipts, one checkpoint, and the existing coordination row were written. No canonical fabric or customer records were written.
- Processed/indexed **6/16,883 (0.03554%)**; cursor offset 6; one batch; `complete=false`; status `ready`; no failures. No schedule or active worker is implied by `ready`.
- All six hosted hashes exactly match the approved safe source projection. The identity count/hash was reattested at 18:55:13 UTC using the bounded primary-key inventory. The SQL executed before its 18:55:57.923 UTC evidence deadline.
- The temporary `postgres`-granted SET membership was revoked before commit. Read-back confirms the sole original `supabase_admin` ADMIN-only membership, `SET=false`, `INHERIT=false`. No login or persistent privilege was added.
- Browser/service roles still have no advisory schema access. Indexer cannot read consultations or protected Auth; runtime cannot insert into the knowledge index. Consultation, usage and spending rows remain zero.
- Canonical migration SHA-256 `eeaf8c9da085277783a263c8caf28ac3e1e46dac472ad508d3cb18f584948a50` and **81 history entries** are unchanged. This was a data transaction, not another migration.

The [read-back](verification.json), [postflight](postflight.json), and reproducible offline [verifier](verify-receipt.mjs) establish **14 passing verification groups** in [the final summary](verification-summary.json). These are checks of actual hosted receipts. The unchanged implementation's **104 local tests** remain in the [preceding test record](../jane-first-index-batch-20261011/tests.json); they were not relabelled as new hosted tests.

## Search and actual coverage

Four hosted descriptive queries and a missing-result query passed through the existing invoker search function, using the operator's read-only connection:

| Query | Exact identity |
| --- | --- |
| warm geometric | pt-1224-002 |
| cotton with stripe and cotton composition filters | pt-1223-374 |
| linen with blush, visible-weave and linen filters | pt-1204-212 |
| Bliss with smoke filter | pt-1200-907 |
| nonexistentfabricxyz | no match |

[Search results](search-results.json). This does not claim that the closed Vercel trial or public Jane is connected to the index. Retrieved identities remain knowledge-only; purchase eligibility must be revalidated through the existing retail journey.

Known fields among these six: colour 6, composition 6, width 6, tone 2, pattern 5 and texture 5. Known pattern scale, validated descriptions, physical weight and care are each **0**. Missing and literal `unknown` values remain unknown. Existing receipt booleans measure non-empty field presence and therefore include some `unknown` strings; the execution report separately computes meaningful-value coverage. Do not use raw presence flags as a known-value completeness claim. Historical receipts were preserved unchanged. This small ordered batch is not a representative sample of the full Master.

## Resource observations and recovery

The refreshed dashboard's last-60-minute aggregates were CPU 13%, disk I/O 2%, memory 66%, disk 50%. Fresh SQL found 16/60 connections, zero lock waiters, zero other active statements and no deadlocks. The admission ceilings, three-second statements, 500 ms lock timeout, NOWAIT gate and five-second pacing were retained. These aggregate metrics are not an instantaneous throughput benchmark.

The [read-only query plan](search-plan.json) used `advisory_knowledge_terms` GIN, with **0.177 ms execution**, 4.945 ms planning, eight shared hit blocks and no physical/temporary reads for that search. Operator submission round trip was 1,315 ms. Database size rose from 699,673,747 to 699,763,859 bytes; the 90,112-byte global delta includes all concurrent database activity and is not an isolated measurement of batch writes. `knowledge_search` plus its indexes occupies 155,648 bytes. Global buffer/temp counters likewise cannot be attributed solely to this batch.

Post-write verification initially referenced the nonexistent `advisory.sessions` name. That read-only statement failed with 42P01; it was corrected to `advisory.consultations`, without rerunning the data transaction. The narrow postflight log window contains this known verification error and normal LOG entries. Do not describe it as zero database errors. [Operational notes](operational-notes.json) preserve this distinction.

The original permission sequence is verified on hosted PostgreSQL. Transaction rollback, interrupted grant restoration, replay refusal and the existing worker's six-row rollback remain locally tested; no destructive rollback was exercised against the successful hosted batch. If a later rollback is approved, use the existing worker and this job's six null before-images, respecting the shared gate and checking after-hashes. Do not drop the schema, rewind migration history or change Fabric Master.

Latest visible physical backup: **11 October 01:03:26 UTC**, with Restore available, predating the advisory changes. Restore rehearsal and Toshiba completion remain unverified. C: free space was 39.11 GiB; no restic/robocopy process was visible. New work needs a subsequent verified backup. Existing worktrees, backup scripts and historical evidence were preserved.

## Readiness and boundaries

The first hosted indexing trial passed. Full knowledge coverage and customer activation are not ready. Next review a separately bounded continuation from offset 6 using the existing monitored worker, with fresh resource/source attestations and explicit operator permission scope. Keep field-presence and known-value reporting separate before expanding. No further hosted write was performed.

No OpenAI calls or new paid services: incremental model cost **US$0**; previous real-model receipts remain **US$0.132574**. A fresh model budget and replacement key are still required. Exposed-key retirement, test-password rotation, human design scoring, privacy/operations review, physical iPhone Safari and spoken screen-reader checks remain pending.

The existing [local scripted consultation](http://127.0.0.1:8789/) is unchanged. PR #167 remains independent and unpublished; PR #169 remains draft. No application deployment, public AI activation, production merge, Shopify publication, source-data change, supplier refresh, pricing/stock/checkout change, Naila change or Room Visualiser change occurred.

[Exact changed files in this evidence increment](CHANGED_FILES.txt).
