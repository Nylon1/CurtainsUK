# Jane monitoring access and indexing preflight

**Superseded monitoring-window decision, 11 October 22:06 UTC:** the owner explicitly approved up to 120 seconds for this one eligible population, while keeping source freshness at 60 seconds and every pressure threshold unchanged. Targeted tests and a genuine 66.55-second host window now pass. A bounded backup watcher is running and Codex continuation is active; indexing still waits for the newer completed backup. See [current overnight run state](JANE_OVERNIGHT_RUN.md). The original 60-second stop below is preserved as historical evidence.

11 October 2026. Starting PR #169 HEAD `0787e09e1e6b964526e98d28a03988674e4242ca`; protected `release/production` remains `c7ca2d0eff1c128386863536d4ce46a877d874a8`. This report supersedes the missing-token status without changing population approval or safety thresholds.

## Completed

The replacement scoped monitoring token is stored outside Git using Windows DPAPI CurrentUser encryption with current-user-only directory and file permissions. The owner confirmed that the token previously pasted into chat was revoked and the saved token is its replacement. Configured scope: CurtainsUK project only, Logs Read and Backups Read, 24-hour expiry. Exact replacement expiry has not been independently read from token metadata. No credential value, raw exporter payload or private credential path is included in the repository.

The local masked-entry helper now verifies encryption read-back and reapplies directory protection on retries. A Windows permission-handling failure was reproduced in local testing; updating only the discretionary ACL avoids requesting audit-security privileges. The existing successful encrypted save was verified without asking the owner to enter the token again. Synthetic full-save/retry checks pass. This helper remains local operator tooling outside Git and is not deployed.

Both supported Management API GET endpoints returned **HTTP 200**: [backup list](https://supabase.com/docs/reference/api/v1-list-all-backups) and [metrics scrape](https://supabase.com/docs/reference/api/v1-scrape-project-metrics). No service-role credential was used for these reads. HTTP success verifies those operations, not an independent inventory of every token permission. The owner accepted recovery responsibility and a **24-hour maximum backup age** for this run.

The new read-only `host-metrics.mjs` adapter extracts only required host metrics. It uses exporter source time, verifies collectors, capacities and mounted-disk coverage, and rejects cached samples, stale time, excessive windows, counter resets, topology changes, invalid labels and missing series. CPU uses non-idle counter time including wait/steal; memory uses MemAvailable/MemTotal; disk pressure includes root and data filesystems. I/O is the maximum observed disk busy-time fraction with read/write IOPS and byte rates, not provisioned IOPS capacity. SQL connections, locks, error deltas and supplier checks still require separate fresh evidence. This module has no network, write or model-tool capability.

**138 local checks pass:** existing 129 consultation, migration, security, concurrency, catalogue, indexer, team and theme checks, plus nine telemetry checks. Scoped ESLint and whitespace checks pass. After the full serial run, the mounted-disk omission guard/test was added and the nine-test telemetry suite rerun; unrelated checks were not repeated again. [Test evidence](../../artifacts/jane-monitoring-access-20261011/tests.json).

## Hosted observations and safety stop

At 21:29:30 UTC, backup **1928024708** was `COMPLETED`, physical, with source recovery-point timestamp **11 October 01:03:26.503 UTC (02:03:26 BST)**. Every returned backup predates Jane's **18:55:39 UTC** writes. PITR is disabled. No backup was started, modified, restored or assumed complete. The next ordinary daily backup must be checked after it actually completes; its time is not guaranteed.

Metrics access works, but complete short-window clearance is **not established**. Reads returned byte-identical cached data with different HTTP Date values. During a bounded four-read probe, distinct exporter samples were **68,180.526 ms apart**, exceeding the unchanged **60,000 ms** limit. A standard no-cache/no-store request returned the cached sample again. The adapter rejected this as admission evidence. These observations do not establish a fixed provider cache duration. Do not substitute retrieval time, interpolate a shorter window, relax the gate or interpret repeated counters as zero CPU/I/O.

The source sample at **21:34:41 UTC** showed memory pressure **66.99%**, root filesystem pressure **78.61%**, and data filesystem pressure **49.97%**. Data capacity: **2,077,073,408 bytes**, available **1,039,196,160 bytes**. Root capacity: 10,461,904,896 bytes. These are historical point-in-time gauges, not current clearance. No acceptable CPU/I/O rate is claimed for an overlong window.

The companion project read showed ACTIVE_HEALTHY. Read-only SQL at **21:31:03 UTC** confirmed database **699,780,243 bytes**, **16/60 connections**, zero lock waiters, zero other active statements and zero cumulative deadlocks. There remain **six search rows**, **one historical job**, **81 migrations** (latest `20261011180354`) and **zero advisory schedules**. Historical checkpoint six and original ADMIN-only indexer membership remain unchanged. Supplier quiet-period checks and error deltas must be refreshed at admission, not inferred from this snapshot.

**No eligible job, canary, index writes, migrations, deployments, public activation, additional AI calls or purchases occurred.** Coverage remains six historical identities, five overlapping the last-reconciled 11,517 eligible IDs. Naila, Fabric Master, Fabric Intelligence, Room Visualiser, supplier refreshes, pricing, commerce, Shopify and PR #167 remain unchanged.

## Next admission

1. Verify a new `COMPLETED` recoverable backup after the 18:55:39 UTC writes, no older than the owner's accepted 24 hours. Record its identity and source recovery timestamp. The owner is the recovery operator; no repeat recovery-policy question is needed.
2. Establish distinct valid host samples spanning at most 60 seconds with a current last sample. The observed cached responses did not demonstrate this. Investigate a supported fresh-sample method or explicitly review the telemetry design; do not relax the existing gates to force progress.
3. Refresh source/publication membership, batch records, SQL resources, supplier activity, error deltas, credential validity and implementation hashes. Then run the approved 120-ID canary, verify its durable receipts and at most 115 new rows, and continue healthy bounded invocations under the existing approval. No recurring schedule is enabled.

C: had **39.02 GiB free**. No visible restic/robocopy process was found; Toshiba completion is unverified. Backup scripts, existing worktrees and historical evidence were preserved. New work requires a later verified backup. Incremental paid API cost: **US$0**. The earlier 4–6 hour population estimate remains unmeasured until a hosted canary passes.

[Monitoring evidence](../../artifacts/jane-monitoring-access-20261011/monitoring-evidence.json) · [Hosted state](../../artifacts/jane-monitoring-access-20261011/hosted-preflight.json) · [Changed files](../../artifacts/jane-monitoring-access-20261011/changed-files.txt).
