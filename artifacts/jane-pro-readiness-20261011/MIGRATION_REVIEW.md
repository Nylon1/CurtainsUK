# Exact advisory migration review manifest

**Unapproved. Not applied. Existing project hqysjumypgeapgmqkcrx only.**

File: `supabase/migrations/20261011142747_jane_isolated_advisory.sql`

Canonical UTF-8/LF SHA-256: `2c78e6173d5e807890d7de229ad11002a552534b6e2b445819214832cf049d73`

The official Supabase CLI 2.120.0 generated this filename. The six prepared review files are unchanged and assembled in their recorded order. Added protections are one atomic transaction, 500 ms lock timeout, 3 s statement timeout, existing-object/Auth-column preconditions, and final browser/service-role sequence revocation. [Machine-readable complete definitions, constraints, roles, ACLs and policies](migration-objects.json) and [source-file hashes](migration-bundle.json) are part of this review.

## Objects and existing impact

- One new schema: advisory.
- 9 new tables: advisory.consultations, advisory.evaluation_runs, advisory.index_gate, advisory.index_job_items, advisory.index_jobs, advisory.knowledge_search, advisory.leases, advisory.spend_reservations, advisory.usage_windows.
- 21 indexes, including primary/unique indexes and five GIN indexes. All build on new empty tables; no existing catalogue index build or full-table scan.
- One identity sequence: advisory.index_job_items_write_sequence_seq.
- 3 SECURITY INVOKER functions: advisory.purge_expired(); advisory.runtime(p_owner uuid, p_action text, p_payload jsonb); advisory.search_knowledge(p_query text, p_colour text, p_pattern text, p_texture text, p_composition text). Fixed statements, empty search_path, no arbitrary model SQL.
- 19 policies. RLS enabled on every advisory table. Consultations additionally FORCE RLS. Database owner/administrators remain privileged; application connections must never use them.
- Four new NOLOGIN, NOINHERIT, non-superuser, non-BYPASSRLS roles: advisory_runtime, advisory_indexer, advisory_retention, advisory_auth_verifier. No role membership or password created.
- One initial coordination row: advisory.index_gate(id=1). Zero jobs, knowledge records, customer records or enabled model budgets seeded.
- Existing-object exception: USAGE on auth schema and SELECT(id,user_id,not_after) on auth.sessions granted only to the new Auth verifier. No existing Auth row, table definition or policy changes. Auth columns verified read-only on 11 October.
- The approved migration mechanism will record this version in Supabase migration history. No blanket replay of historical local migrations is allowed.
- No Master, pricing, stock, supplier, checkout, Naila or visualiser object changed. No extension, trigger, cron schedule, API schema exposure or public route is added.

## Resource estimate and lock behaviour

Local PGlite PostgreSQL 18.3 created the exact bundle in 188 ms and measured 286720 bytes (280 KiB) of initial advisory relations/indexes. Hosted PostgreSQL is 17.6.1.166. This is a local measurement, not a hosted runtime promise or same-version certification. Allow under 1 MiB initially including catalog metadata/WAL as a planning estimate, not a ceiling. Each statement stops at 3 seconds; blocked locks stop at 500 ms; any error rolls the transaction back. Apply once in a quiet monitored window, with no automated retry. Abort/review an unexpected duration over 10 seconds.

CREATE/GRANT take system-catalog and object locks; the existing Auth grant can briefly contend with Auth maintenance. No wide data read/write occurs. Five GIN indexes are empty at creation. Planned later population uses six records, one shared lease and at most 20 batches per invocation. Initial derived-index/journal reserve: 100 MiB, provisional. The 120-record local fixture is not enough to predict real description size, WAL or recurring before-images. Measure bytes after 6 and 120 real records before approving further slices. Stop if that reserve is exceeded or disk use reaches 85%; do not change source records or add storage automatically.

## Backup, execution and rollback

Supabase dashboard showed daily physical backups and a Restore action, latest 2026-10-11 01:03:26 UTC. A restore has not been rehearsed. Recheck backup freshness immediately before execution, record the recovery owner/RPO, and preserve independent evidence. Database backup does not establish Storage-object recovery. Local Toshiba completion remains unverified.

Do not run an unreviewed generic db push: local history contains only a subset of the already-applied hosted migrations. After explicit owner approval, reconcile remote history using the approved migration workflow; its dry-run must list this single exact filename and hash, with no historical replay. If it cannot, stop. Apply atomically through that workflow, capture version/hash/operator/outcome, then read back every object/ACL against this manifest. Do not use the SQL editor as a bypass.

On precommit failure the transaction must roll back entirely. On successful application followed by a concern, keep the public route disabled, revoke only newly provisioned connection memberships/credentials and retain the isolated schema for investigation. This is the default non-destructive operational rollback. An empty-schema removal requires a separately reviewed exact-object rollback and fresh confirmation that no sessions/jobs exist. Never issue a blanket production restore to undo this change. The only external grant to withdraw is the new verifier's Auth access, after disabling that connection. Existing application grants stay intact.

## Approval requested

Review and approve only this exact atomic schema/role/Auth-column-grant migration on hqysjumypgeapgmqkcrx. Index population, server credential provisioning, synthetic Auth users, Vercel deployment/protection changes, paid evaluations and public activation remain separate approvals. Revalidate protected source, resource health and backup at execution time. An approval cannot override a collision, changed hash, unexpected grant or failed preflight.
