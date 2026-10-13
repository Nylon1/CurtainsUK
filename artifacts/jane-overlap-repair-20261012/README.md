# Focused overlap correction

## Active operation: overlap correction and recoverable holds

The owner directed a focused correction in [PR comment6118449547](https://github.com/Nylon1/CurtainsUK/pull/169#issuecomment-6118449547), then explicitly instructed this thread to repair temporary safety issues and keep proceeding. This authorises the narrow correction below and read-only recovery of temporary holds. It does not waive pressure thresholds, uncertain commits, access/integrity checks or the separately retained10:00UTC deadline.

The operator no longer calls every active client a supplier refresh. It uses sanitised PostgreSQL role/application/state/age/wait, transaction and lock evidence. Observed customer PostgREST and platform exporter SELECT/WITH reads under3 seconds may coexist only without write XIDs, non-read relation locks, advisory locks, blocking or job identity. Unknown short clients trigger a read-only drain; prolonged or conflicting activity blocks admission. Query text and customer parameters never leave PostgreSQL. Explicit supplier recent/running checks are independent and retained.

Temporary activity, load or cached-metric holds stop all writes, reconcile the exact latest committed six-ID receipt against the original fsynced journal, wait5–15 seconds, then repeat complete admission. A pending/ambiguous write, changed record, permission issue, missing metadata, access failure or20-second batch breach cannot be automatically resubmitted. All six-record, five-second pacing,20-batch,3-second SQL,500-ms lock,180-second freshness and120-second counter-window rules remain.

**12 targeted tests passed**, including the actual local PostgreSQL metadata query and transport recovery tests. The existing hosted checkpoint was freshly reconciled at **150/11,517**, with151 total search rows and original history/permissions exact. Full live publication again matched11,517 IDs. Repaired execution is not claimed from preparation; the actual operator probe and verified receipts establish liveness. [Focused diff/evidence](execution-review.json).

Current binding checksum: `d50e33fde77f4f8610fb47be92e4b12eafb7079d2aa79040e73d92fbacb5a560`. Dependency checksum: `e1ac02fd85d5fa00ce0c8ca638737db3e52d81f3160fe00302526e8487547bdf`. No migration or source-catalogue change.

[PostgreSQL activity documentation](https://www.postgresql.org/docs/current/monitoring-stats.html) and [lock documentation](https://www.postgresql.org/docs/current/view-pg-locks.html) informed the metadata query. Supabase current changelog was checked; no related API or schema upgrade is needed.

[Exact files](changed-files.txt), [validation](quality-checks.json), [operator](operator.mjs), [owner instruction](owner-instruction.json). Earlier stop and canary evidence remains preserved.
