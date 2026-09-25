# Browse performance: controlled projection release

Status: **release candidate, not yet switched live**. Production Browse still calls `search_retail_fabrics`. The gateway's `CURTAINSUK_BROWSE_READ_PROJECTION=enabled` switch is opt-in and is not set in production. The owner authorised a controlled production rollout on 25 September, with the existing RPC retained as the immediate fallback.

## Stage 1: direct, set-oriented eligibility

Unreleased SQL candidate `sql-candidates/browse/20260925064738_browse_set_oriented_search.sql` derives guide price, media eligibility and stock sets from the existing authoritative tables, then exposes a shadow `search_retail_fabrics_direct_v1` RPC. It does not change Sample or Make Curtains commercial validation. It is outside `supabase/migrations` so a routine migration push cannot apply it accidentally.

Production-data read-only comparison found 9,248 eligible rows in both the old and candidate queries, zero missing or extra IDs, and zero differing row payloads. Existing guide-price helper versus the set-oriented guide projection likewise matched 10,165 rows with zero differences. Full JSON responses matched for the default 9,248-result request and Blue + Geometric + £50–under-£100 (137 results).

This is **not yet a speed improvement**. Three production-scale, transaction-rolled-back default RPC calls averaged 8,993.965 ms for the current function and 17,269.231 ms for the direct candidate. Under these conditions the direct candidate is unsuitable as the customer fallback. The prepared RPC therefore falls back to the existing live function whenever the projection is dirty, absent or past a time boundary.

## Stage 2: governed Browse read projection

Unreleased SQL candidate `sql-candidates/browse/20260925070237_browse_read_projection.sql` defines a private generation-based projection of the same eligible rows. Browse filters, counts and pagination operate on that projection. Existing full-catalogue facet metadata is computed at refresh time, not per customer request. The active-generation pointer changes atomically only after a row-by-row reconciliation against the direct source. Source triggers queue individual Fabric Master changes where attributable and a full refresh for global supplier/stock/media changes; a scheduled worker handles the queue. Any dirty or expired projection fails over to the existing live Browse RPC. The candidate and scheduler have **not** been applied.

In a rollback-only rehearsal, the existing RPC and prepared RPC returned identical complete JSON responses for default, page 2, price, colour, pattern, Blue + Geometric + price, sample availability, stock availability and exact SKU search. A temp-table trigger queued one fabric; incremental refresh cleared the queue and preserved 9,248 rows; another full reconciliation returned 9,248 active rows. No customer or production source records were changed. The broader 16-case transaction hit the diagnostics API's 120-second boundary; it did not reveal a parity difference and rolled back.

Twenty database-side runs of the full prepared RPC averaged 22.827 ms default, 22.248 ms page 2 and 8.419 ms combined-filter. These exclude gateway/network, 24-card hydration and browser rendering, so they must not be presented as customer page-load timings or as a production load test.

## Safety follow-up, 25 September

The owner stopped further work on the slower direct SQL candidate. The prepared projection remains the preferred path. A new rollback-only fault rehearsal used current production-scale data but installed no persistent database objects. It queued two distinct Fabric Master IDs through the invalidation trigger, refreshed them, and found zero dirty IDs. A repeat incremental call returned `refreshed: 0`, demonstrating no-op idempotence for this sequential case. An intentionally failing full refresh left the prior active generation unchanged with all 9,248 rows intact and retained a dirty marker. While dirty, the prepared RPC's exact-SKU response matched the current authoritative Browse RPC. The earlier full reconciliation also restored 9,248 active rows.

These checks do **not** prove concurrent writers/readers: all test objects existed only within one rollback transaction. No local Postgres server or existing Supabase development branch is available. Multiple sessions cannot observe those uncommitted test objects. The atomic customer view, concurrent updates to the same/different Fabric Masters, and Browse readability during a live refresh therefore remain release blockers rather than inferred PASS results. Do not install the candidate onto the production schema merely to manufacture this evidence.

The live Shopify app proxy was sampled through `/apps/curtainsuk-decision/catalog?view=retail`. One default request took 9,733 ms (9,248 total, 24 cards), page 2 took 5,455 ms (9,248 total, 24 cards), and Blue + Geometric + £50–under-£100 took 5,847 ms (137 total, 24 cards). These are **current-RPC baselines**, not prepared-projection or browser-render timings. No concurrent load test was run against customers. A true prepared end-to-end benchmark requires the projection to exist in an isolated reachable environment and the gateway to select it; neither is currently deployed.

The gateway source now has an explicit off-by-default switch for prepared Browse reads. Only `searchRetailFabrics` uses it. Sample and Make Curtains remain on their existing canonical Fabric Master, stock and pricing paths.

## Controlled production sequence

1. Release only the two scoped projection migrations and opt-in gateway selector through the protected `release/production` workflow. The slower direct shadow function remains source-only and is not part of the migration.
2. Keep the gateway selector off. Build a full generation from current authoritative production data and reconcile all 9,248 eligible rows and representative response payloads against the unchanged live RPC.
3. Enable the server-side selector only after exact parity, then measure the actual Shopify app-proxy route and commercial handoffs. On any parity, refresh, error or handoff regression, switch the selector off immediately.
4. Preserve Sample and Make Curtains revalidation. Browse customers never initiate projection rebuilds. Do not increase timeouts or introduce a separate catalogue authority.

The production migration history differs from older local files. Release operators must use a temporary migration workdir containing the fetched remote history plus only the two new source-controlled Browse migration files. Do not repair or replay historical migrations to make a push succeed.

Read-only/rollback rehearsal commands: `scripts/browse-performance-stage1-parity.ps1`, `scripts/browse-guide-parity.sql`, and `scripts/browse-performance-transactional-rehearsal.ps1`.
