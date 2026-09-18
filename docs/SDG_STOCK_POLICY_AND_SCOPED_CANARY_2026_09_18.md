# SDG stock policy correction and scoped canary design

## Implemented locally; not promoted

- Curtains retain both checks: current available-now supplier metres after confirmed CurtainsUK usage must be at least 30m, and must cover the calculated requirement for the particular configuration. The 30m floor is an intentional commercial rule, not a proxy for job size.
- Samples require a current, positive available-now metre quantity, independently of the 30m curtain floor. The existing visible Fabric Master identity, non-discontinued state, signed line properties, Shopify sample variant availability and genuine Shopify sample price checks remain. A stale, absent or zero observation does not authorize a sample. Historical nullable per-SKU sample flags remain non-authoritative absent a separately governed explicit exception.
- The Fabric Library sample filter and private commercial evidence are aligned to the sample rule in migration `20260918172104_sample_stock_independent_of_curtain_floor.sql`. The curtain availability filter, 72-hour rule and browse/recommend eligibility are unchanged.
- This source change has not been applied to Production or Shopify. Database-backed Preview verification requires an isolated Preview database; Supabase branching is unavailable on the current project plan. Do not deploy application code against an old database function that lacks `sample_stock_available` and treat that as a successful Preview test.

## Scoped Production materialisation canary — design only

`materialize_daily_stock(timestamptz)` scans all approved recent snapshots for both suppliers. It must not be called for a supposedly limited canary: it can materialise records beyond the selected test SKUs.

Before any Production write, implement and validate an operator-only, service-role-only scoped materialiser on an isolated Postgres/Preview database. Accept an explicit, small list of source snapshot IDs, never a supplier-wide selector. For every ID, require a validated, latest-approved genuine supplier snapshot, exact SDG supplier/SKU and Fabric Master identity, `METRE` unit, nonnegative primary available-now quantity, genuine checked-at within 72 hours, and a current non-discontinued lifecycle. Reject duplicates, unmatched identities, future timestamps, and absent/ambiguous values. Offsite and future quantities remain separate evidence and never enter `aggregate_metres`.

Within one transaction, insert/update only those selected SKU/day rows using the same newer-observation constraint and existing audit-history trigger as the governed daily materialisation path. Return selected IDs, row counts, source snapshot IDs and per-SKU outcomes. Require the result set to equal the input set; a mismatch rolls back the transaction. Do not change the global scheduler, catalogue bundle, HCI, or Shopify.

A later owner-approved canary should use **freshly retrieved** exact-SKU SDG observations: one at least 30m, one positive below 30m, one explicit zero, and one unresolved Zoffany negative control which must produce no observation or stock claim. First verify raw source and validation results; then perform a rollback-only transaction rehearsal and examine audit/eligibility outputs; only after separate approval commit the scoped canary. Check sample and curtain outcomes, including a curtain requirement greater than otherwise commercially eligible stock. Stop on any discrepancy. Preserve the old 9,248-fabric HCI bundle; stock changes must not rebuild it.

The initial 7,861-SKU SDG dry run is retrieval evidence, not import-ready per-SKU timestamp evidence. The 775 unresolved Zoffany identities remain UNKNOWN in the separate private reconciliation queue. Any canary requires a fresh source read with its own exact observation timestamps. No Production canary was executed in this task.
