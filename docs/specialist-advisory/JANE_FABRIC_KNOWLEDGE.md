# Jane Fabric Master integration: bounded population and change-only refresh

> **Execution scope superseded, 11 October 2026:** The all-Master 120-ID proposal and offsets 6–126 below must not run. See [eligible-only scope, implementation and preflight](JANE_ELIGIBLE_POPULATION.md). The owner subsequently approved one conditional eligible-only run; historical receipts/checkpoints remain unchanged. This document is retained as historical implementation evidence, not current execution authority.

11 October 2026. PR #169, starting `faadb8b8b02c9055e5f489234c84e6d7eded5a5f`; protected source `c7ca2d0eff1c128386863536d4ce46a877d874a8`. This milestone is local implementation plus read-only hosted verification. No new hosted write, migration, schedule, deployment or OpenAI call ran.

## Verified coverage

At 19:34:03 UTC, the existing project `hqysjumypgeapgmqkcrx` still has **16,883 Master identities**, with inventory SHA-256 `77e5fffc3d623ce62993e9804814cdf0e74d5c468b60f1ee534893f2197e1405`. There are **6 hosted advisory search rows**, leaving **16,877**. Job `a6c0d329-935e-4c31-b8ef-71a52f6d9149` remains at offset 6 / one batch / incomplete. There are zero active advisory cron jobs. Migration history remains 81 entries, latest `20261011180354`. The applied canonical advisory migration is unchanged.

This is complete identity inventory coverage, not complete indexed knowledge. The six-record historical trial has meaningful colour/composition/width for six, tone for two, pattern and texture for five; scale, validated description, physical weight and care were unknown for all six. Legacy field-presence receipts stay unchanged and are excluded from version-2 meaningful-field totals.

## Implemented locally

| Component | Result | Hosted status |
| --- | --- | --- |
| Bounded continuation runner | At most 20 six-record transactions, exact approved offset range, shared existing SQL gate and checkpoint | Prepared, not run |
| Durable operator journal | Append-only, fsynced plan before submit; exclusive process lock; exact read-back after submit; restart reconciliation | Prepared, not run |
| Lost-response recovery | Verifies IDs, term hashes, receipts, counters and restored permissions; never blindly resubmits | Local tests passed |
| Change manifest adapter | Explicit source dependencies, deduplicated affected IDs, at most 120 per manifest; existing six-record worker and advisory receipts | Local tests passed; production feed not wired |
| Change-only writes | Existing source-hash comparison skips unchanged vectors; stock-only changes ignored before lookup | Local PostgreSQL tests passed |
| Ranked search | Existing GIN/vector data, weighted matches in explicit attribute fields, deterministic tie-break and six-result cap | Direct port local; RPC replacement unapplied |
| Unknown and commercial boundaries | No invented facts; facts rehydrated through existing safe projection; knowledge remains non-purchasable | Existing boundaries preserved |

No embedding service, additional project, product database, supplier ingestion or model-driven indexing was added. Jane's versioned concise speaking style and all customer tools are unchanged. The [local consultation](http://127.0.0.1:8789/) remains a mock preview, HTTP 200 verified; it is not connected to the full hosted index.

## Safe execution after separate approval

Use the [new exact proposal](../../artifacts/jane-knowledge-integration-20261011/continuation-proposal.json), not the superseded implementation checksum in the earlier proposal. It contains all 120 IDs, their 20 batch ranges and the dependency checksum. Both approval flags deliberately remain false.

1. Reconcile Git source, existing job, canonical schema checksum, source identity count/hash, role grants and a recoverable backup. Preserve evidence. Do not bootstrap a second population job or replay the first-batch script.
2. Obtain approval for offset **6 through 126**, at most **120 new identities / 20 transactions**, plus the narrowly scoped temporary SET permission described below. Bind approval to the reviewed implementation checksum and expiry of no more than 24 hours.
3. Provide reviewed operator ports for checkpoint/source reads, current telemetry, submission and read-back. `runContinuationTranche` has no built-in credential discovery, remote executor or scheduler. The connector/operator remains responsible for binding these capabilities; no new indexer login is created.
4. Use one durable journal directory per job. Each generated SQL plan is saved and flushed before submission. Acquire the shared database gate and exact checkpoint fence inside the existing transaction. No SQL transaction stays open during source reads.
5. Read at most six exact identities and their narrow source projections. Reuse identity attestation only while it is at most 60 seconds old, then re-attest; do not recalculate the full identity hash for each of the three fact reads. The identity manifest does not freeze descriptions.
6. After every commit, verify exact hashes/receipts, offset, counts and restored role permissions. Record latency, table sizes, errors, lock waits, resource window and source provenance. Wait at least five seconds before the next batch; the database gate also enforces pacing across processes.
7. Stop at total 126, expiry, source mismatch, missing facts, ambiguous commit, permission mismatch, supplier activity or any resource ceiling. A partial tranche retains its checkpoint; resumption stays within the original range. Do not start a later tranche automatically.

Temporary permission scope: existing `postgres` grants itself SET on `advisory_indexer` with INHERIT=false and ADMIN=false, enters it locally, then revokes that self-grant **before the same transaction commits**. The original `supabase_admin` ADMIN-only membership must remain exactly intact. At most 20 such transactions; no persistent membership, role creation or Auth access. This permission was approved for the first six only, so it needs a new approval for the larger tranche.

### Resource and recovery safeguards

CPU <60%, I/O <50%, memory <80%, disk <85%, connections <70% (currently 60 maximum), zero new errors/deadlocks/lock waits, and no concurrent supplier refresh. Telemetry must be at most 60 seconds old. The new runner additionally requires a measurement window of at most 60 seconds, rejecting hourly dashboard averages as execution clearance. Stop if a completed batch takes 10 seconds or more. SQL statement timeout is three seconds; lock timeout is 500 ms; source-read deadlines and response caps remain unchanged.

Current SQL evidence shows 16/60 connections, no lock waits or other active queries, and database size **699,772,051 bytes (667.35 MiB)**. Last observed hourly dashboard figures were 11% CPU, 1% I/O, 62% memory and 50% provisioned disk. They are historical context, **not a passing current telemetry sample**. Obtaining a trustworthy short-window telemetry source remains an execution precondition.

If a process exits after saving a plan, the next invocation reads the hosted outcome first. If the exact commit is found it records recovery and moves forward. Missing, changed or uncommitted outcomes stop for operator reconciliation; there is no blind network retry. A crash lock is never automatically stolen. Preserve its process/evidence state, establish the previous process has stopped, then separately reconcile the pending plan before releasing it. Do not delete a journal to force progress.

Existing rollback processes six receipt rows at a time and refuses changed hashes or later writers. **The original job includes the first six records too.** Full-job rollback would include those records and needs its own reviewed scope. Stopping at a valid checkpoint is the normal response to load, not automatic rollback. No canonical fabric source changes are involved.

## Change-only maintenance after population

`knowledge-changes.mjs` maps only the dependencies actually consumed by `safeKnowledge`: colour and design/brand references; design name/composition/width/repeats/weight/care/application; collection/brand names; validated retail description; governed visual fields/state. Price, stock, commercial publication and timestamp-only changes are excluded. A relevant source event requires a hashed publication/export evidence reference, a complete affected-ID resolution and ready governed projections.

Use immutable, deduplicated manifests of at most 120 changed identities. A separately approved refresh job uses existing `advisory.index_jobs`, `index_job_items`, `knowledge_search` and `index_gate`; no new table is needed. Only those IDs are read in six-record pages. Unchanged term hashes produce no vector update. Receipts, previous vectors and checkpoints retain the original worker's atomicity and rollback protection. Duplicate source events in a manifest collapse to one identity; replaying a completed job performs no further source reads.

**Production change discovery is not complete.** Metadata confirms no updated-at index across these knowledge sources, and the visual cache is a materialized projection. The existing Browse queue is transient, can contain a global `*`, and is consumed by its own workflow. Polling it would miss changes or interfere with Browse; Jane must not drain or acknowledge it. Do not introduce repeated Master timestamp scans, triggers on protected sources, a Browse rebuild or logical replication under this approval.

Before automatic refreshes can be enabled, review an exact-ID publication/export feed covering all dependencies, including design/collection/brand fan-out. Resolve fan-out through existing indexed relationships, in bounded pages, and record completeness. Capture changes from the start of initial population so changes during the run can be reconciled. Existing scripts may supply their already-produced affected-ID evidence through an operator bridge, but none was modified here and this is not yet a lossless automated feed. If that cannot cover every mutation, keep maintenance operator-driven and report freshness gaps.

Deleted identities and revoked source facts need reviewed tombstone evidence. The new adapter explicitly stops on deletions instead of acknowledging them or treating an API failure as absence. This is a remaining maintenance boundary, not completed deletion automation. New identities require manifest reconciliation and separately approved bounded jobs. Complete identity population alone does not establish up-to-date descriptive coverage.

## Search quality and its limits

Search now ranks actual attribute matches above incidental mentions in general descriptions. Explicit filters remain requirements. British/American grey/gray and matt/matte spelling alternatives work without changing fabric data. Phrase, OR and exclusion syntax remains intact; pure-negative or stop-word-only queries cannot initiate a broad traversal. Colours, tones, pattern/scale, surfaces, materials and present millimetre/gsm/repeat/care terms are searchable; absent values are never inferred. Queries still need Jane to translate a room brief into possible curtain directions, as required by her existing profile, rather than AND every furniture word together.

Supplier material codes remain literal unless an authoritative mapping is available. For example, historical trial data includes `LIN`, `COTT`, `POLY` and `VISC`; these are searchable as recorded, but automatic English-name expansion is not claimed or invented. Physical weight remains separate from visual weight, and repeat dimensions never establish pattern scale. Numeric text matching is not a validated technical range calculator.

The optional [ranking SQL](../../artifacts/jane-knowledge-integration-20261011/ranking-review.sql) changes only the body of `advisory.search_knowledge(text,text,text,text,text)` and preserves its signature, invoker security and ACL. It does not rebuild indexes, change grants or alter canonical data. The [rollback](../../artifacts/jane-knowledge-integration-20261011/ranking-rollback.sql) restores the function from the applied migration. Both passed local PostgreSQL tests; neither ran remotely. This function replacement needs separate migration approval and is not required to populate the next tranche.

Official implementation references: PostgreSQL's [text-search ranking and query controls](https://www.postgresql.org/docs/17/textsearch-controls.html) and [GIN index guidance](https://www.postgresql.org/docs/17/textsearch-indexes.html). Ranking runs only on matched advisory vectors, never an on-demand full Master lookup. Hosted ranking performance remains unverified.

## Time, storage and database impact

The remaining **16,877 identities need 2,813 batches**: 2,812 batches of six and one of five. At 20 batches per invocation, that is **141 invocations**, including the next proposed tranche. Five-second spacing alone is **3 hours 54 minutes 20 seconds**. The [estimate](../../artifacts/jane-knowledge-integration-20261011/population-estimate.json) combines 1.315–5 seconds per batch and an assumed 30-second review pause between invocations, giving **6 hours 6 minutes to 8 hours 59 minutes**. These are planning assumptions, not a throughput guarantee; source reads, approval gaps, backup availability and resource pauses can extend the run. The observed 1.315 seconds covered the first operator write round trip, not all future work.

The next 120 have at least **95 seconds of inter-batch spacing**, approximately **2–5 minutes of active work** under those assumptions. Permit more elapsed time for review and stopped resource conditions. Review the measured first tranche before deciding subsequent scopes; this proposal does not authorize the rest.

Successful traversal needs at most **8,439 narrow projection requests** with the existing three-source HTTP adapter, plus bounded checkpoints, attestations, monitoring and verification. A joined connector read can combine the three per batch. No full descriptive scan, full Browse refresh, duplicate product store, embedding call or paid model call is involved.

The [600-record synthetic local measurement](../../artifacts/jane-knowledge-integration-20261011/local-capacity.json) measured 3,871 additional bytes per identity for search/GIN data and initial receipts, projecting roughly **62.3 MiB** across 16,883. The six-to-126 local increment was **472 KiB**. These fixtures deliberately use synthetic vocabulary; they are not representative samples or hosted I/O measurements. Reserve **128 MiB** as an initial review allowance for these advisory relations, and stop/reassess growth above it. This is operator monitoring guidance, not an enforced allocation. WAL, backups, replication, refresh before-images and bloat are additional and must be measured. Do not extrapolate disk writes from global database-size changes.

No new service or paid AI cost was incurred. Existing Supabase Pro covers the project; actual compute/I/O/WAL and backup usage must be monitored against the existing account. No new paid service is proposed.

## Evidence, remaining gates and approval

[117-test serial suite and logs](../../artifacts/jane-knowledge-integration-20261011/tests.json), [implementation review manifest](../../artifacts/jane-knowledge-integration-20261011/review-manifest.json), [read-only source metadata](../../artifacts/jane-knowledge-integration-20261011/read-only-source-metadata.json), and the [milestone report](../../artifacts/jane-knowledge-integration-20261011/README.md). New tests cover the 20-batch limit/restart, lost-response recovery, uncommitted refusal, concurrent operator locks, corrupted journal, pressure and old telemetry windows, attribute ranking, RPC rollback, source dependency filtering, duplicate events, unknown facts and unchanged-hash refresh. Existing migration, encrypted storage, ownership, rate/spend limits, concurrency and 38 team/theme tests still pass locally. No additional hosted test pass is claimed.

Latest visible Supabase backup remains the 01:03:26 UTC physical backup, before advisory changes; a recoverable current backup remains a pre-execution review item. Toshiba completion and restore rehearsal remain unverified. C: has 39.08 GiB free; no restic/robocopy process was visible. Historical evidence and backup data were preserved; this development requires a subsequent verified backup.

**Exact next approval:** one monitored continuation on existing project/job, offsets 6–126, at most 120 new identities and 20 transaction-only SET/revoke sequences, using the implementation checksum in the new review manifest, with the stated fresh backup/source/resource preconditions and stop limits. It excludes automatic scheduling, subsequent tranches, ranking migration, change-feed activation, model spending, deployment and public activation. PR #167 stays independent and no protected system is modified.
