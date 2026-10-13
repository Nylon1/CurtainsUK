# Jane: incremental update connection review

## Population completion update: 13 October 2026

The approved initial eligible population is now independently verified complete: **11,517 / 11,517**, 1,920 exact receipts, zero duplicates or unresolved writes, preserved historical records and restored permissions. The operator exited and the one-time follow-up is PAUSED. [Final evidence](../../artifacts/jane-population-complete-20261013/README.md). This supersedes the historical partial-population counts below.

The discovery, complete publication-window, dependency fan-out and current-source/revision boundaries described below remain unresolved. Completion does not prove that changes during population have been reconciled. Automatic updates remain disabled, no incremental migration or schedule was enabled, and post-population recommendation review remains gated. The next review must present the exact bounded reconciliation/activation scope and its evidence; do not begin a second full population.

12 October 2026. Development only, on draft PR #169. **No automatic update schedule, source trigger, hosted migration or incremental write has been enabled.** The existing population operator is unchanged and remains the only authorised hosted writer.

## Current population

At 18:26:31 UTC the existing job `ac425f78-f6ec-4623-97bb-df8763d79d5a` has **6,744 / 11,517** exact eligible identities, leaving 4,773. That is a verified post-COMMIT/fsynced receipt, not full coverage. The original six historical records and five eligible no-ops remain protected by the existing runner. The full Fabric Master denominator remains 16,883; this approved population covers only the fixed 11,517 eligible-ID manifest.

At 18:13 UTC the database cancelled the next transaction under its unchanged three-second statement limit. It was not replayed. Two independent observations at 18:17:21 and 18:17:28 proved the expired plan uncommitted at checkpoint 6,642, no pending IDs/receipts, no old/prepared transactions, and restored permissions. The existing resolution procedure appended a fsynced `expired-uncommitted` receipt. Fresh admission then produced new SQL and continued the same job. No runner code or limits changed for this work.

## Source inspection and reuse

| Existing source | Verified in repository | Reuse and limit |
| --- | --- | --- |
| `fabric_catalogue_observations` | Append-only observation ID, exact fabric ID, import ID, public-record hash, merge action, history completeness | New read adapter reads at most six exact primary keys. INSERT/UPDATE with complete history causes a fresh canonical recheck. Never imports the normalized payload, costs or trade prices. Legacy incomplete history blocks acknowledgement. |
| `fabric_hybrid_registration_events` | Primary-key event ID, fabric ID, source-document hash, STAGED/ACTIVATED/RETIRED | New read adapter reads at most six exact primary keys. STAGED is ignored; activation/retirement rechecks governed current facts. Retiring a visual classification is not fabric withdrawal. |
| `fabric_visual_knowledge_patches` and native enrichment ledger | Governed publication/retirement and per-fabric lineage exist | Candidate evidence for a reviewed publication adapter. They are not asserted to provide a complete ordered global change feed. |
| `browse_projection_dirty` | Mutable per-fabric queue, consumed by Browse; some knowledge changes are global dirty flags | Never drain, delete, acknowledge or change its triggers. It cannot prove lossless history for Jane. |
| Source `updated_at` columns | Present on identity/design/collection/brand/retail records | Not treated as a complete change log. Direct edits, deletes, equal timestamps and transaction commit order require stronger evidence. |
| Supplier stock/promotion history | Existing stock/commercial evidence | Not consumed for descriptive indexing. Existing commercial lookups continue to govern purchase eligibility. No stock refresh changes. |

Source definitions: `20260907150000_curtainsuk_fabric_master.sql`, `20260907153430_phase5b_sanderson_canary_merge_safety.sql`, `20260907223610_phase5f_retail_media.sql`, `20260925085155_browse_governed_projection_read_model.sql`, `20261002201534_fabric_visual_knowledge_overlay_empty.sql`, `20261003071017_fabric_hybrid_artifact_registration.sql` and existing `knowledge-changes.mjs`/`catalogue.mjs`.

**Hosted metadata verification at18:34:21UTC:** a smaller read-only query of six named relations succeeded within the unchanged three-second limit. It confirmed both change-record primary-key indexes. Catalogue observations have a supplier/SKU/time history index, but no import-ID or global change-time index; retail profiles have only a fabric-ID primary key. Hybrid event IDs have a primary-key index. The query read only PostgreSQL metadata and no fabric rows. [Exact result](../../artifacts/jane-automatic-updates-20261012/source-metadata.json). `estimatedRows` are planner estimates, not population counts.

**Remaining discovery boundary:** these two exact-record adapters do not yet discover every new event automatically. No complete durable feed has been demonstrated for direct design/collection/brand/description edits, every visual publication, eligibility withdrawal or physical deletion. An earlier broad metadata inventory timed out and was replaced by the smaller named-object query, without increasing its limit. Source-specific indexed discovery and complete publication-window evidence must be reviewed before enabling a schedule. No fallback whole-table polling was introduced.

## Implemented local components

`knowledge-update-source.mjs` reads existing change evidence through fixed, parameterised, primary-key queries. Immutable manifests accept at most 120 source events, coalesce affected identities, detect conflicting evidence, and hash all references plus the closed publication window. A manifest contains IDs and evidence hashes, not product records. Out-of-order or same-time events cause a fresh current read, not replay of old product facts.

`knowledge-update-worker.mjs` is disconnected from every production API, scheduler and model tool. It defaults to disabled. Registration requires explicit approval of the manifest hash, existing project, expiry and completed population job. Each invocation is capped at 20 steps of six identities with five-second pacing and the existing shared `advisory.index_gate`. A live population job blocks registration. Resource admission must explicitly return true. No network is held inside a SQL transaction.

Each affected identity is read through a trusted current-source port. It must include exact identity verification, ready projections, fresh observation time, source revision, and explicit eligible/withdrawn/deleted disposition. Missing, failed, stale or partial reads block the step. An eligible result uses the existing customer-safe projection and `indexTerms`; unchanged hashes do not rewrite search rows. A confirmed withdrawal removes only the derived search row and records its previous value. It cannot mutate Fabric Master or old population receipts. A re-entering fabric is re-read and can be inserted again.

The final transaction checks source revisions again through a mandatory bounded SQL port, updates at most six search rows, saves before/after receipts and advances the durable cursor atomically. Concurrent instances share the same gate. Interrupted transactions leave neither half-written facts nor an advanced cursor. An uncertain commit requires readback; no automatic write retry is installed.

**Production ports still need binding/review:** complete event discovery and sealed-window verification; dependency fan-out through verified indexes; current eligible/withdrawn/deleted source evidence; transaction-local revision verification; current resource admission/monitoring; restricted operator transport. The tests use explicit synthetic ports. Do not call this a hosted automatic update service.

## Exact SQL review scope

Review SQL: [knowledge-update.review.sql](../../lib/advisory/knowledge-update.review.sql). It is not included in the approved six-file hosted migration bundle or the running operator manifest.

| Object | Proposed operation |
| --- | --- |
| `advisory.knowledge_update_jobs` | New table: approved manifest hash, evidence/ID manifest, population-job reference, cursor and completion state. Primary key and unique manifest hash index. |
| `advisory.knowledge_update_receipts` | New table: per-job/fabric before-image of derived search data, after hash, source revision, result and timestamps. Composite primary key. |
| Both new tables | Enable and force RLS; revoke public/anon/authenticated/service-role access; restricted operator policies/grants to existing `advisory_indexer`. |
| Existing `advisory.index_gate` | Reused after population; unchanged definition and limits. |
| Existing `advisory.knowledge_search` | Later approved incremental DML only, six records maximum per transaction. |
| Canonical/source tables, protected Auth, Browse, suppliers, commerce | No DDL/DML, trigger or permission change in this proposal. |

No new role, credential, project, function, extension or scheduler. Empty-table creation is small metadata work but still needs current backup, capacity/locks and exact migration approval. Actual growth depends on the number of changed identities and retained derived before-images. Measure with `pg_total_relation_size` in a separately approved canary; do not treat an estimate as observed hosted storage. Statements retain three-second and 500-ms lock limits. Runtime uses no arbitrary table names or model SQL.

Rollback: leave activation disabled, stop the future incremental operator, retain manifests/receipts for audit. No destructive cleanup is automatic. If an incremental change later needs reversal, compare the current source revision and search hash against the receipt and inspect later writes before restoring at most six derived rows under separate approval. Do not restore superseded facts or delete the initial population/history. Before any new hosted DDL, record the exact generated migration, SHA, dependency/grant checks and recoverable backup. A later migration generator must be used; this file remains review SQL only.

## Reconcile changes made during this initial run

The additive `population-baseline.mjs` now prepares the initial side of this comparison directly from the existing append-only journal. It streams a fixed newline-complete byte prefix, validates exact manifest order, SQL hashes, receipts, historical no-ops and explicit expired/uncommitted resolutions, and emits only identity/hash metadata. It does not acquire the writer lock or connect to the database. An incomplete or pending population cannot become completed coverage. The historical source-time allowance is included in the catch-up lower bound. [Five tests and an actual7,068-receipt audit](../../artifacts/jane-baseline-reconciliation-20261012/README.md). Complete current-source export/discovery remains a separate requirement.

1. Keep the original population manifest and runner unchanged. Preserve every receipt and its actual read time.
2. Use the earliest baseline observation, including the six historical records from 11 October, as the lower catch-up boundary. Starting a cursor at population completion would miss changes already made.
3. Reuse complete approved import/publication records spanning that boundary. Resolve design/collection/brand fan-out with indexed relationships into immutable pages, at most 120 events per manifest and six canonical facts per step. Do not truncate an oversized fan-out or mark partial resolution complete.
4. Compare saved identity/hash receipts with a separately verified complete publication export using `reconcileKnowledgeSnapshot`. It outputs only added/changed/withdrawn candidates and leaves unchanged identities alone. It performs no database scan or write. Absence from an incomplete export is never a tombstone.
5. For gaps not covered by durable change records, a bounded read-only reconciliation of the affected domain is required. Its exact domain, query plan and I/O budget must be presented before execution. No second full population or blanket rewrite is proposed. Without evidence covering those gaps, reconciliation stays incomplete.
6. Wait until all relevant projections reflect the source changes. Canonical revalidation decides whether each candidate is current, withdrawn or deleted. Reconcile newer events too, until a verified barrier covers population completion and the final test window. PostgreSQL sequence numbers or timestamps alone are not commit-order guarantees.
7. `requireUpdateCatchup` refuses readiness unless identity, design, collection, brand, description, visual, eligibility and deletion coverage are all proven, no pending/unresolved changes remain, and the window spans the population. This is a review gate, not an invented completeness attestation.

The complete export/source-window attestation is **not available yet**. The local diff and worker demonstrate handling; they do not prove all changes during the hosted run have already been captured.

## Recommendation checks after population and reconciliation

`population-verification.mjs` now supplies the separate final coverage gate. It compares a completed, ordered journal baseline with a fresh independent hosted readback, whole-job identity/content digests, exact job/cursor state, preserved historical records, no-op counts and restored permissions. It supports the final three-record batch at11,517 and requires1,920 verified batches. It is not imported by the active operator and performs no query or write. Its result explicitly leaves reconciliation and launch unapproved.

Four new final-verification tests and eight existing baseline/recommendation tests passed on12October. They cover partial/pending/stale/future evidence, wrong final state, substituted/duplicate/missing identities, changed hashes, historical/permission drift and the actual11,517-count boundary. This is local test evidence, not a claim that hosted population has finished. [Evidence](../../artifacts/jane-final-verification-preparation-20261012/README.md).

`post-population-review.mjs` refuses to run on partial coverage, duplicate identities, unresolved writes or incomplete catch-up. Once those gates pass, it performs six paced read-only descriptive searches: warm neutrals, olive, texture, restrained patterns, natural composition and grey/gray spelling. Returned facts retain explicit unknowns and cannot become a purchase offer. It records latency, exact IDs and facts for human relevance review. Empty or failed search is visible evidence, not a pass.

Then reuse the existing **20-scenario `jane-foundations-v3`** suite and human rubric for design reasoning, alternative directions, feedback changes, tool explanations and concise 40–90-word replies without em dashes. Real-model testing requires fresh budget approval and a securely configured replacement key. No paid calls were made. Human reviewers must assess both recommendation relevance and why each direction suits the room. Retrieval success alone does not approve launch. Current public Jane remains inactive.

## Tests and safety evidence

**20 tests passed**, command:

```text
node --test --test-concurrency=1 lib/advisory/__tests__/knowledge-update.test.mjs lib/advisory/__tests__/post-population-review.test.mjs
```

Actual local PostgreSQL/PGlite checks cover existing-history SELECTs, RLS/grants, new/changed/withdrawn/re-entering fabrics, hash no-ops, replay, failed/partial reads, projection lag, source-revision conflict, two worker instances sharing the gate, transaction interruption and rollback, 120 identities in 20 six-record steps, pacing and expiry/resource refusal. These are synthetic local results, not hosted security or throughput claims. One initial assertion compared timestamp objects by identity; corrected to compare their actual times, then all tests passed. No source change was made to satisfy tests.

C: measured **35.52 GiB free** during this work. No dependency install, large build, cleanup or backup change. Toshiba backup completion remains unverified. Completed Supabase recovery point `1937679152`, 12 October 01:11:28.231 UTC, remains checked by the population runner under Nylon1's 24-hour RPO. It predates later writes, so another verified backup is still required. The encrypted monitoring credential renewal prompt remains pending; its conservative use ceiling is 20:25 UTC. No secret appears in this report.

## Next review before automatic activation

First complete the existing population and its exact final readback. Review this additive diff and tests; verify the missing discovery/publication coverage, source revision ports and query plans. Present a final exact migration and bounded catch-up manifest with current backup/resource evidence. Only after explicit activation approval run a monitored incremental canary, inspect every receipt and then consider a single controlled schedule. The current population approval does not activate that schedule.

References: [PostgreSQL transaction isolation and sequence behaviour](https://www.postgresql.org/docs/current/transaction-iso.html), [Supabase tables](https://supabase.com/docs/guides/database/tables). Existing source definitions and local executable tests are the implementation evidence.
