# Approved migration: protected release preparation

11 October 2026. **Exact database migration approved by the user; not applied. Protected source merge awaits separate authorization.**

The user replied “Approved” to the corrected migration request at Jane commit `8b879baedc0e0d24dd269b71335d606e3cf94ec8`, SHA-256 `eeaf8c9da085277783a263c8caf28ac3e1e46dac472ad508d3cb18f584948a50`. This is the current approval for that unchanged SQL. The earlier artifact's `approved:false` is preserved as its historical state.

The approved runbook also requires the protected release checks and source procedure. PR #169 targets the Phase 1 branch and therefore has no production checks. To avoid pulling its broader application or PR #167 into production, a separate single-file candidate was prepared from the latest protected source.

- [Release PR #170](https://github.com/Nylon1/CurtainsUK/pull/170), draft, unmerged.
- Candidate `134954ff7c942d099b8799fb3bd95667bf4e6440`, base `3649c879a4a5ddf88c2093a4172d20fbc58cd265`.
- Git branch `release/jane-advisory-schema-20261011`. This is a repository branch, not a Supabase project branch. No new database, project or worktree was created.
- Only file: `supabase/migrations/20261011142747_jane_isolated_advisory.sql`, byte-for-byte identical to the approved SQL.
- Both required checks pass: `curtainsuk-production-gate` and `protected-production-policy`. [Exact check receipts](release-checks.json).
- Existing Jane development checkout remains on its original branch; the release commit used an isolated temporary Git index to avoid repository duplication.

## Fresh read-only preflight

Existing project `hqysjumypgeapgmqkcrx` remains ACTIVE_HEALTHY on Pro. At 16:58 UTC the database measured 699,214,995 bytes, with 17 of 60 connections, zero lock waiters and no other active queries. The operator has CREATE/CREATEROLE. No advisory schema or advisory roles exist. Migration history has 78 entries, latest `20261004064841 browse_twice_daily_low_io`.

The [backup dashboard](backup-dashboard.txt) still shows daily physical backup `2026-10-11 01:03:26 UTC` with Restore available. No restore rehearsal. The [resource dashboard](resource-dashboard.txt) shows last-24-hour CPU 6%, I/O 1%, memory 62%, disk 50%, peak connections 11/60, 952 slow queries and 0.74% database errors. Those aggregates are not live indexing clearance. C: free space is 40.21 GiB. No restic process was visible; that does not prove successful Toshiba completion.

[Machine approval and preflight record](approval-and-preflight.json). No customer records or canonical catalogue data were read or written. No hosted DDL, migration-history repair, indexing, credentials, synthetic accounts, deployment, paid call or public activation occurred.

## Remaining authorization

The migration approval remains in force for the exact checksum above. The next decision is the **merge of PR #170 only** into `release/production`, because the user's earlier instruction reserves protected merges for separate owner approval. Do not merge PR #167 or PR #169 under this scope.

After an authorized merge, verify the protected HEAD contains the exact approved SQL and preserve both required check receipts. Repeat execution preflight and apply only the approved migration through a reviewed history-safe workflow. Stop on changed SQL, changed release scope, existing-object conflicts, history mismatch, backup/resource failure or missing permissions. Do not use a blanket push of local migration history or a SQL-editor bypass.

Application deployment, model evaluations, account provisioning, population and customer activation remain outside this approval. Historical local test evidence remains 93 passes plus lint; no application or SQL code changed in this approval-record update.
