# Jane advisory migration: applied and verified

11 October 2026. **The exact approved migration is applied to the existing Supabase project. Jane remains inactive.**

## Release and execution

The owner's “Proceed” authorized merging [PR #170](https://github.com/Nylon1/CurtainsUK/pull/170) only, then applying the already-approved migration. Both required checks passed at candidate `134954ff7c942d099b8799fb3bd95667bf4e6440`. The PR merged at 17:08:50 UTC into protected commit `c7ca2d0eff1c128386863536d4ce46a877d874a8`.

| Identity | Verified value |
| --- | --- |
| Existing project | `hqysjumypgeapgmqkcrx`, Pro, PostgreSQL 17.6.1.166 |
| Source file | `supabase/migrations/20261011142747_jane_isolated_advisory.sql` |
| Hosted migration | `20261011171354_jane_isolated_advisory` |
| Source and hosted SHA-256 | `eeaf8c9da085277783a263c8caf28ac3e1e46dac472ad508d3cb18f584948a50` |
| Exact SQL bytes | 24,553 |
| Execution | One Supabase `apply_migration` call; success; approximately 2.5 seconds tool round trip |
| Migration history | 79 entries; all 78 earlier version/name entries preserved |

Supabase's [migration API](https://supabase.com/docs/reference/api/v1-apply-a-migration) assigns its own execution timestamp. The hosted ledger stores the whole submitted SQL as one statement, and its SHA-256 was computed read-only in PostgreSQL. The source filename remains unchanged. This explicit source-to-hosted mapping must be used by future operators; do not replay the source file, run a blanket CLI push, repair old history or rename the applied ledger. The isolated submission plan listed exactly one protected file and checksum; it was not a CLI `db push --dry-run`.

The [execution receipt](execution-receipt.json), [preflight](preflight.json), [submission plan](execution-plan.json), [history comparison](migration-history-after.json), and [passing protected checks](../jane-migration-approval-20261011/release-checks.json) preserve the evidence.

## Hosted verification

[All 15 metadata comparison groups pass](verification-results.json). The [complete hosted inventory](hosted-inventory.json) matches the approved local object/ACL inventory after explicit PostgreSQL-version and operator-name normalization:

- Nine tables with RLS, including FORCE RLS on consultations; 21 indexes, three SECURITY INVOKER functions, one sequence and 15 policies.
- Three NOLOGIN, NOINHERIT roles, without superuser, database creation, role creation or BYPASSRLS. Only the creator's automatic administrative memberships exist, without SET or INHERIT. No application memberships or credentials were provisioned.
- No advisory privileges for PUBLIC, anon, authenticated or service_role. The indexer cannot SELECT consultations. Runtime and retention cannot INSERT knowledge records. All three private roles lack Auth schema access.
- Protected Auth schema ACL is unchanged. No grants on existing tables or columns were added. The advisory schema is absent from configured Data API schemas.
- All eight data tables are empty. Only the approved coordination row exists in `index_gate`. No consultation, evaluation budget, fabric index or indexing job was created.
- Initial advisory relations and indexes occupy **286,720 bytes (280 KiB)**, matching the local estimate.

The read-only [verification SQL](verify.sql) was also [tested locally](verification-query-test.json) against the exact migration. Historical **93 scoped local tests plus scoped lint** remain preserved. No application code or approved SQL changed in this execution.

These results establish hosted DDL, metadata and permission configuration. They do **not** establish hosted login/revocation, application ownership, pooler reset, encryption round trips, multi-instance concurrency, retention execution or customer readiness. Those remain a separately approved synthetic hosted trial.

[Supabase security advisors](security-advisors.json) reported no findings for `advisory`. The project-wide report includes 65 informational existing-private-table policy notices and an [Auth leaked-password protection warning](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). These unrelated settings were not changed. No before/after advisor baseline comparison is claimed.

## Capacity and backup

The fresh physical backup is 11 October 01:03:26 UTC with Restore available. No restore rehearsal was performed. The new advisory schema postdates that backup and requires a later recovery point; the earlier backup cannot be claimed to contain this development. Database backups exclude Storage objects. C: had about 40.29 GiB free. No restic process was visible; Toshiba completion remains unverified.

Before execution the dashboard showed last-24-hour CPU 6%, I/O 1%, memory 65%, disk 50%, 953 slow queries and 1.2% database errors. These aggregates were recorded, not treated as indexing clearance. An existing Browse refresh was detected and left untouched. Submission waited until it finished: at 17:13:45 UTC there were zero other active queries and zero lock waiters, with no advisory objects and unchanged migration history.

The [postflight](postflight.json) at 17:16:25 UTC recorded 699,444,371 database bytes, 14 connections, zero lock waiters and zero other active queries. The project remains ACTIVE_HEALTHY. Total database size changes include independent existing operations; only the isolated 280 KiB relation measurement is attributed to this migration.

## Scope and next step

PR #167 remains an independent draft at `851078c6`. PR #169 remains a draft containing Jane's inactive application implementation. No Naila, Fabric Intelligence, Fabric Master source, Room Visualiser, homepage, pricing, stock, checkout or live Shopify theme change was made. No Vercel deployment, account provisioning, catalogue population, public activation or paid model call occurred.

The next approval should be an exact protected, synthetic-only hosted test package: server-only restricted connections, encryption/CSRF secrets, two invented Auth accounts, protected Vercel preview and an expiring hosted-test authorization. Prepare/review deployment protection and Auth policy timing before issuing that approval. Catalogue population and fresh OpenAI evaluation budgets remain separate.

## Rollback state

The applied schema is inert: no login identities, application memberships, populated consultations or public routes. If the hosted trial is deferred, leave it in this state. Do not reapply the migration. Any DROP/CASCADE, history rewrite, credential provisioning or production restore requires separate exact approval and a current dependency/data inventory. Later index rollback continues to use bounded before-image receipts; no source data is changed.
