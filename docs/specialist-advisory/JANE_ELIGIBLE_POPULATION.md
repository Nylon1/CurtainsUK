# Jane eligible-only population: reconciliation and execution stop

11 October 2026. Starting PR #169 source `47512d856d4ab72e4b97ecd2cf5468d2296ad90d`; protected branch unchanged at `c7ca2d0eff1c128386863536d4ce46a877d874a8`. [Evidence directory](../../artifacts/jane-eligible-scope-20261011/). No hosted write, paid call, publication or deployment occurred in this increment.

## Current scope and source evidence

The [latest owner instruction](https://github.com/Nylon1/CurtainsUK/pull/169#issuecomment-6113025170) conditionally approves one eligible-only initial population and the already-reviewed transaction-local indexer SET/revoke pattern. It invalidates the old 120-ID proposal, which included 39 discontinued records. Preserving that historical file does not make it executable; its preparation script now labels regenerated proposals superseded and the admission validator rejects that marker.

| Set | Exact observed count | Meaning |
| --- | ---: | --- |
| Master identity inventory | 16,883 | Historical inventory, not eligible denominator |
| Active prepared Browse generation | 11,815 | Governed browsing projection |
| Selectable, visible, verified-price candidates in Browse | 11,790 | Candidate flags plus current projection membership |
| Current native Shopify Fabric Profile URLs | 11,517 | All map exactly to existing governed ID/URL mapping |
| Published IDs intersecting candidates | **11,517** | Proposed eligible-only initial manifest |
| Candidate IDs without published Fabric Profile | 273 | Excluded; do not describe all as discontinued |
| Released Room Visualiser identities | 11,003 | 3,137 STANDARD + 7,866 FIXED140 |
| Eligible manifest intersecting Visualiser | 10,757 | 760 eligible profiles outside Visualiser; 246 Visualiser identities outside manifest |
| Historical indexed rows | 6 | Five inside eligible manifest, one excluded |
| New unique search rows required | **11,512** | Full new-job processing still includes rechecking the five |

Candidate identity SHA-256: `5f035f0196d52c20189f6d86b439598564222f1b073d7d7ec47792dd626aba85`.

Published eligible identity SHA-256: `90634a31d12f1690ec48d2e6353a23c21be245a00ca431f8ad0cd181faf68488`.

The source query uses existing `fabric_colourways_projection_idx` and `browse_read_projection_pkey`, a 20,000-ID ceiling and a five-second statement timeout. It selects identities, not descriptions or wholesale prices. It does not evaluate the expensive enriched Browse view, rebuild Browse or refresh materialized data. The plan is recorded in `candidate-query-plan.json`. Source-attested candidates are saved in `candidates.json` and the exact SQL in `candidate-query.sql`.

Shopify Admin connector identifies the correct shop but returns no accessible definition for the app-owned Fabric Profiles. This is recorded as an access limitation, not zero published profiles. The read-only fallback follows only the native metaobject sitemap URLs actually listed by Shopify's live sitemap index. Sequential bounded reads record each response hash, URL, timing and count. All 11,517 URLs map exactly to the existing production identity/URL manifest; no IDs are guessed and no unknown URLs remain. The app-proxy sitemap agrees, but it is only a deployed reference, not independent live-publication authority. No Shopify writes occurred.

### Retail policy distinction

Current source inspected: `retail-repository.ts`, `retail.ts`, `readiness.ts`, deployed Fabric Profile mapping and hosted `fabric_commercial_evidence`/Browse rules. Browsing requires visible, non-discontinued canonical identity and identity-matched approved Shopify imagery. Jane's narrower initial selection additionally requires selectable and price-verified flags, prepared Browse membership and native published profile evidence. Every candidate currently has a governed guide. 7,830 candidates retain `UNKNOWN` canonical lifecycle; do not invent `CURRENT` for them. Their visibility and verified commercial evidence are separate facts.

Knowledge eligibility does not mean curtains are order-ready. Prepared stock flags include unavailable/unknown stock; Jane may help with design knowledge but purchase cards still require a fresh governed retail result. `safeRetail` requires browseReady, launchReady, orderReady, a canonical Fabric Profile URL and approved real image. The current server also removes commercial discontinuations. Keep these protections and repeat bounded live checks before each write/recommendation. Any changed publication, missing projection or unknown eligibility stops execution rather than silently shrinking a running manifest.

## Implemented and locally verified

`eligible-manifest.mjs` creates an operator-only version-2 intersection manifest with an `eligible-identities-sha256:` snapshot binding IDs, selection-policy code and publication evidence. Its six-ID page interface plugs into the unchanged indexing worker. It checks a fresh trusted source/publication attestation for every page, including exact eligible IDs, project, policy, timestamp and snapshot. A final attestation is required for completion. Old all-Master cursors cannot cross into it.

Local PostgreSQL tests seed a historical six-row job, then run/restart a separate eligible job. Five overlapping identities produce no vector rewrite when their hashes are unchanged; before-images and new-job receipts remain accurate. The original job and its six receipts are byte-for-byte unchanged. Unique search rows are counted once, while coverage is measured from the new eligible job. Drift, stale attestation, duplicate/tampered identities, unmapped publication evidence and the old cursor fail closed.

**122 serial local tests pass**, including migration, ownership/encryption, security, multi-instance concurrency, historical population safeguards, five new eligible-manifest tests and all 38 team/theme regressions. Scoped lint and `git diff --check` pass. These are local results, not new hosted indexing tests. Test logs and `tests.json` are preserved in the evidence directory.

A bounded read-only check of the actual retail endpoint returned **404 for discontinued `pt-1200-907`**. All first six eligible IDs returned HTTP 200 and verified pricing; three were order-ready, three were out of stock. `safeRetail` produced no purchase card for the discontinued or out-of-stock examples. This demonstrates the knowledge/purchase distinction without claiming stock for the whole manifest. See `live-retail-sample.json`.

Preserve hosted job `a6c0d329-935e-4c31-b8ef-71a52f6d9149`, its original all-Master hash, offset 6 and six receipts. **No replacement job has been created remotely.** A future new job begins at null cursor and processes the eligible manifest from its first ID. Do not report six eligible rows: only five overlap. Keep `pt-1200-907` and its historical receipts untouched; current retail excludes this discontinued identity. Deletion/tombstone or rollback requires separate review.

The eligible adapter is implemented and locally tested, not a hosted execution port. `continuation-plan.mjs` deliberately supports only old all-Master continuation and new-row inserts. Reusing it would corrupt scope assumptions or collide with existing rows. Its separate-job binding needs a reviewed implementation before the approved canary can run; no material permission expansion is proposed.

## Actual preflight and stop conditions

Read-only hosted checks: existing Pro project `hqysjumypgeapgmqkcrx` ACTIVE_HEALTHY; database 699,772,051 bytes; 16/60 connections; zero observed lock waiters; six advisory search rows. The original sole indexer membership is still `supabase_admin -> postgres`, ADMIN true, INHERIT/SET false. Current Browse generation is `c77230da-f6ed-4d7f-bf56-b1e7864979d3`, refreshed 17:03 UTC; knowledge cache not dirty; next recorded time change 15 October. Latest supplier daily runs show SUCCESS at 05:00 UTC. These snapshots are not blanket execution clearance or continuous supplier monitoring.

Final read-back at 20:18 UTC confirms 16,883 Master identities, the unchanged original job/offset/receipts count, six search rows, the same role membership, 81 migrations (latest `20261011180354`), and zero active advisory cron jobs. Database total was 699,780,243 bytes, 8 KiB above the earlier snapshot; no advisory write occurred. Connection count remained 16 and lock waiters zero.

**Hosted execution stopped before the canary.** Required prerequisites are missing:

1. Backup dashboard's latest physical recovery point is **11 October 01:03:26 UTC**, before advisory writes at 18:55. PITR is not enabled. No restore or paid add-on was attempted. Need a verified recoverable backup after those writes and a named recovery operator/RPO. The next ordinary scheduled backup may satisfy this without new services, once verified.
2. The available dashboard offers 60-minute-or-longer aggregate windows, not the required at-most-60-second current CPU/I/O/memory/disk samples. SQL supplies current connection/lock measurements but cannot replace host metrics. No appropriate metrics credential exists in this process. A project-scoped read-only metrics token can be supplied outside Git as `ADVISORY_METRICS_ACCESS_TOKEN`; never paste it into chat. Secure/rotated operator access must also be verified.
3. Review the eligible-only source adapter and complete the narrow connector binding for separate-job bootstrap, existing-row no-op/update receipts and exact read-back. The owner instruction explicitly requires review where the existing workflow needs material code changes.

Do not reinterpret "Proceed" as waiving these explicit prerequisites. Do not run a canary, bootstrap job, role grant, rollback, ranking migration or refresh schedule while they fail. Preserve evidence and ask for fresh review before a stopped execution resumes. The existing conditional approval avoids repeated routine approvals once these conditions are genuinely met.

## Estimates and safe continuation

Processing 11,517 eligible IDs requires **1,920 six-ID batches**, with a final three-ID page, in **96 bounded invocations** of at most 20 batches. Five existing rows are revalidated/no-op candidates, so only 11,512 unique rows are added if source hashes match. The canary comprises the first 120 exact IDs in `eligible-review.json`; it includes the five already indexed eligible rows, hence at most 115 new rows. No new job UUID or execution approval is fabricated by preparation.

At five seconds pacing, the lower bound is about 2 hours 40 minutes, excluding reads, transactions, monitoring and stops. **4–6 hours** is an unproven operating estimate based on the earlier bounded-run assumptions, not observed full-population throughput. Measure the first canary before revising it. The existing synthetic 3,871-byte/identity measurement projects about **42.5 MiB** for search/initial receipts at this scope; retain a conservative 128 MiB review ceiling and measure actual growth. WAL, backups, bloat and future before-images are additional. No new paid AI usage is required; cost this increment is US$0.

Retain the existing CPU <60%, I/O <50%, memory <80%, disk <85%, connections <70%, no new lock waits/deadlocks/errors/supplier overlap and 10-second batch stop. Store the exact SQL/receipt before submission, verify outcome and role restoration after every transaction, never blindly retry, and report every 1,000 eligible IDs. Reconcile publication/eligibility changes during the run and use change-only manifests afterward; automatic scheduling remains off.

C: free space measured 39.07 GiB. No visible restic/robocopy process; Toshiba completion and restore rehearsal remain unverified. Backup scripts, archives and worktrees are untouched. This development still needs a subsequent verified backup. PR #167 and all protected customer systems remain unchanged.
