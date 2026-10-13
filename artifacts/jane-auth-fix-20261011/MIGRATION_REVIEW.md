# Corrected advisory migration approval manifest

**Unapproved and unapplied. Existing project `hqysjumypgeapgmqkcrx` only.**

Exact file: `supabase/migrations/20261011142747_jane_isolated_advisory.sql`

Canonical UTF-8/LF SHA-256: `eeaf8c9da085277783a263c8caf28ac3e1e46dac472ad508d3cb18f584948a50`

This replaces the unapplied `2c78e617...` candidate, not an applied production migration. Any approval/configuration bound to the old checksum is invalid for this candidate. The CLI-generated filename remains unchanged. Five reviewed sources are assembled in the order recorded in [migration-bundle.json](migration-bundle.json); the retired Auth-grant file is excluded. [Full definitions and privileges](migration-objects.json) are part of the exact scope.

## Objects created

| Object | Exact scope |
| --- | --- |
| Schema | `advisory` |
| Tables | `consultations`, `evaluation_runs`, `index_gate`, `index_job_items`, `index_jobs`, `knowledge_search`, `leases`, `spend_reservations`, `usage_windows`, all in `advisory` |
| Indexes | 21 including primary/unique indexes and five GIN indexes; complete definitions in the inventory |
| Sequence | `advisory.index_job_items_write_sequence_seq` |
| Functions | `advisory.runtime(uuid,text,jsonb)`, `advisory.search_knowledge(text,text,text,text,text)`, `advisory.purge_expired()`; all SECURITY INVOKER with empty search path |
| Roles | `advisory_runtime`, `advisory_indexer`, `advisory_retention`; NOLOGIN, NOINHERIT, non-superuser, no BYPASSRLS, no CREATEDB/CREATEROLE |
| RLS | Enabled on all nine tables; FORCE on consultations; 15 private-role policies |
| Seed data | One coordination row `advisory.index_gate(id=1)` only |
| Existing objects changed | None. No Auth schema/table/function reference or grant. Only the approved migration system's version ledger is expected to record application |

No extensions, triggers, schedules, model budget, customer data, source catalogue writes, API exposure, LOGIN credentials or application role memberships are added. PostgreSQL may automatically give the creator administrative membership in its newly created roles; local `migration_operator` memberships are inventoried with no SET/INHERIT option. Verify the real creator's membership options after application. Existing application/browser identities receive no membership.

## Final grants and ownership

The migration operator needs CREATE on the database and CREATEROLE, not superuser or Auth grant option. Newly created advisory objects belong to this operator. Administrators remain privileged; never use an owner connection for the application.

- `advisory_runtime`: USAGE on advisory, owner-scoped consultation/lease/rate/spend DML; SELECT/UPDATE on evaluation accounting; SELECT on derived knowledge; EXECUTE on the fixed runtime and search functions. The private server adapter supplies the verified owner transaction-locally and refuses broader roles. Models/browsers cannot supply SQL or owner identity.
- `advisory_indexer`: USAGE on advisory; derived-knowledge DML; job/receipt SELECT/INSERT/UPDATE; gate SELECT/UPDATE; sequence USAGE. No consultation or protected Auth access.
- `advisory_retention`: USAGE on advisory; expired-only consultation/lease/window/spend SELECT/DELETE and narrowly scoped timestamp UPDATE needed for row locking; SELECT on expired evaluation runs; EXECUTE on bounded purge. No active consultation access.
- PUBLIC, anon, authenticated and service_role: no advisory schema, table, function or sequence access in the completed transaction. Intermediate historical service_role grants in component files are withdrawn atomically. Never execute individual components as a deployment.

## Resource, locking and stop conditions

All 21 indexes build on new empty tables. No existing-table scan or catalogue index build occurs. The local restricted-role application took under 0.2 seconds and measured 286,720 bytes (280 KiB) of initial advisory relations/indexes; see the exact run time in the machine inventory. PGlite PostgreSQL 18.3 is not hosted PostgreSQL 17.6. Budget less than 1 MiB initially as a planning estimate, not a total WAL/catalogue ceiling.

The bundle uses one transaction, 500 ms lock timeout and 3 s statement timeout. CREATE/GRANT still acquire database catalog/object locks, but no protected Auth grant or source-table lock is requested. An advisory schema or any proposed/legacy advisory role collision aborts for review. A late injected failure rolls back every role/object/seed. Abort and investigate an unexpected duration over 10 seconds, any lock timeout, extra pending migration, changed checksum, unexpected role/ACL or resource alert. No automatic retries.

Before execution recheck CPU/I/O, memory, connections, disk headroom, lock waits, supplier activity and error baseline. The observed 6% CPU/1% I/O are 24-hour aggregates, not live clearance. No catalogue population is included. Later indexing retains six IDs, one global lease, at least five seconds pacing and no more than 20 batches per invocation. The provisional 100 MiB derived-index/journal allowance and byte measurements after six/120 records belong to the separate population approval.

## Backup and exact execution boundary

Daily physical backup `2026-10-11 01:03:26 UTC` is visible with a Restore action; restore rehearsal is pending. Before any approved database change record backup freshness, recovery owner and acceptable recovery point. Do not perform a production restore as a test. Database backups omit Storage objects and do not replace secure custody of application encryption keys. Toshiba success and backup inclusion of this increment remain unverified.

Remote history contains existing migrations not all represented locally. The approved protected release workflow must reconcile history without replay or destructive repair. Its dry-run must show **only** this filename and exact checksum. If it does not, stop. Do not use blanket `db push`, history repair or a SQL-editor bypass. Record approved source commit, protected HEAD, both release checks, operator, backup, start/end and result. A read-back must match every object/ACL plus migration history. No owner-approved execution command has been run here.

## Rollback

1. **Before COMMIT or on error:** issue `ROLLBACK` on that migration connection. The local test proves no advisory schema, roles, grants or coordination rows survive a late failure. Existing Auth ACLs and synthetic Master records remain unchanged.
2. **After successful application, before provisioning:** all three roles are NOLOGIN and no public route or customer access exists. Withdraw the hosted trial approval and retain the isolated schema and evidence. No Auth grant needs reversal.
3. **After separately approved provisioning:** disable only Jane's new hosted approval/connections and any separately approved retention/index scheduler. Revoke only the exact new application-role memberships identified in that provisioning receipt. Keep encryption keys, checkpoints and ciphertext for recovery/review. Do not guess credential names or alter pre-existing grants.
4. **Index rollback, if later approved/populated:** use the existing bounded before-image worker, newest jobs first, six rows per call with its shared pacing. Conflicts stop atomically. Never edit Master records or erase receipts to force completion.
5. **Schema removal:** a separate destructive approval and fresh exact dependency/row inventory are required. This manifest authorizes no DROP, CASCADE, Auth privilege changes, production restore, or migration-history rewrite. An empty schema can remain inert safely while that decision is reviewed.

## Approval scope

The next decision is approval of this exact additive migration only on the existing project, with the new checksum above and fresh preflight. It does not authorize protected preview deployment, new server credentials, synthetic Auth users, catalogue population, OpenAI spending or customer activation. Hosted Auth revocation, time-box semantics, pooler/RLS and multi-instance tests must follow in a separately approved synthetic trial. See [current runbook](../../docs/specialist-advisory/EXISTING_PROJECT_RUNBOOK.md).
