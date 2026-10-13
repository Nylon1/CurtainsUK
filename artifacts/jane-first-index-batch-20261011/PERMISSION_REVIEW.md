# One-batch index permission review

11 October 2026. The owner has approved one six-identity population trial. That data scope remains approved. No hosted population has executed: the connector's current `postgres` membership in `advisory_indexer` has ADMIN=true, INHERIT=false and SET=false, granted by `supabase_admin`. It can administer the role but cannot enter it. Running as a broader role or silently extending permissions is not the fallback.

## Additional permission requested

Approve a grant from `postgres` to itself for the existing `advisory_indexer`, usable only inside the one batch transaction. Revoke that grant before commit and verify the original `supabase_admin` grant is unchanged. No new login, password, role, table, policy, migration, schedule or API access is created. No permission persists after the transaction. The user's instruction requires approval before operations needing production permissions; approval of the six-record data trial is recorded separately from this newly discovered permission requirement.

The exact permission statements, surrounding the six-record transaction, are:

```sql
BEGIN;
SET LOCAL statement_timeout = '3s';
SET LOCAL lock_timeout = '500ms';
SET LOCAL idle_in_transaction_session_timeout = '5s';
-- Assert the current identity and the exact existing ADMIN-only membership.
GRANT advisory_indexer TO postgres
  WITH ADMIN FALSE, INHERIT FALSE, SET TRUE GRANTED BY postgres;
SET LOCAL ROLE advisory_indexer;
-- Perform only the approved six-record batch, receipts and checkpoint.
RESET ROLE;
REVOKE advisory_indexer FROM postgres GRANTED BY postgres;
-- Assert SET remains false and the original supabase_admin grant is unchanged.
COMMIT;
```

This is a scope excerpt, not a runnable replacement for the generated plan. [The tested generator](../../lib/advisory/first-batch-plan.mjs) includes both membership assertions, source/approval/resource expiry, shared gate checks, exact IDs, receipts, atomic writes and checkpoint assertions. It encodes source values outside SQL syntax. It rejects a role-use option without its own explicit approval. It never grants access automatically in response to a permission error.

Reviewed generator UTF-8/LF SHA-256: `de31687232e9b7dd6476f3da247d58bcc040d682d003dc0bbd19149fcbb2083f`. The eventual generated SQL has a separate receipt checksum because its fresh timestamps and job UUID are intentionally determined immediately before the approved run.

## Exact data scope

Existing project only: `hqysjumypgeapgmqkcrx`. Existing canonical migration SHA-256: `eeaf8c9da085277783a263c8caf28ac3e1e46dac472ad508d3cb18f584948a50`.

Six identities, in the existing inventory order:

1. `pt-1200-907`
2. `pt-1204-212`
3. `pt-1223-374`
4. `pt-1224-002`
5. `pt-1225-314`
6. `pt-1225-722`

Read-only source facts, governed visual data and validated descriptions use the existing `safeKnowledge` projection. Costs, margins, stock and prices are excluded. All six remain knowledge-only, not purchase offers. Missing properties remain unknown. The manifest denominator is 16,883 and its identity hash remains `77e5fffc3d623ce62993e9804814cdf0e74d5c468b60f1ee534893f2197e1405`.

Write targets are only `advisory.knowledge_search` (six term-vector rows), `advisory.index_job_items` (six identity/hash/field-presence receipts with null before-images), `advisory.index_jobs` (one job, cursor offset 6, processed/indexed 6, complete=false) and the existing `advisory.index_gate` (next permitted time five seconds later). Identity sequence values may advance on an aborted transaction; no source or customer data is touched.

## Execution and rollback safeguards

After permission approval, repeat fresh metadata, source hash, six-row safe reads and resource admission. Source, identity attestation and resource observations expire after 60 seconds; the generated SQL enforces the earliest deadline on the server. Do not reuse historical measurements or backdate them. Preserve the exact generated SQL/checksum and approval before submission. No automatic retry follows a lost response: first read the durable job/checkpoint to determine the outcome.

The plan acquires the existing shared gate with NOWAIT, rejects another active lease or pacing interval, and refuses to run if any index job or search row already exists. It is deliberately first-batch-only. It makes no network calls inside the transaction and grants no model tool indexing capability. Further population requires separate owner authorization and uses the existing resumable worker and monitoring workflow.

Any SQL or permission-restoration failure rolls back the entire transaction, including the transient grant. On success, read back all six hashes, the cursor and incomplete coverage, index sizes/I/O, migration count and unchanged membership ACL. The existing `createIndexWorker.rollback(jobId)` restores/removes these six records from their before-images if a reviewed rollback is needed, respecting the shared pacing gate. Never drop schemas or alter canonical fabrics to reverse this batch.

Local PostgreSQL tests reproduce a non-superuser `postgres` with the hosted ADMIN-only grant, prove an ordinary plan is denied, and prove the explicit temporary grant is removed on both success and a mid-transaction failure. This is local evidence; the permission workflow has not been executed on hosted Supabase.

References: [PostgreSQL 17 GRANT](https://www.postgresql.org/docs/17/sql-grant.html), [grantor-qualified REVOKE](https://www.postgresql.org/docs/17/sql-revoke.html). No new OpenAI evaluation, public activation, application deployment, protected merge or Shopify publication is included.
