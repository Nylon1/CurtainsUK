# Browse performance: controlled projection release

Status: **shadow projection deployed, customer reads rolled back to the existing RPC**. Production Browse still calls `search_retail_fabrics`. The gateway's opt-in `CURTAINSUK_BROWSE_READ_PROJECTION` setting is `disabled` after a failed controlled switch on 25 September. Do not enable it again without diagnosing the production HTTP/RPC error described below.

## Controlled production attempt, 25 September

Protected release `f89ab94` corrected the previously unapplied projection migration: no trigger is attached to the Fabric Knowledge materialized view. Governed enrichment evidence and approved image/colourway scope changes mark the Knowledge cache dirty; the existing minute worker refreshes that cache before full Browse reconciliation. Ordinary supplier price/stock writes invalidate Browse only and do not refresh Fabric Knowledge. The cache refresh and projection publication share a transaction, so a failed reconciliation retains the previous valid generation. A completed external cache refresh is also detected by its `refreshed_at` stamp.

Migration `20260925085155` is recorded in Production. It installed 34 source-table triggers, zero materialized-view triggers and one worker job. A full generation reconciled exactly 9,248 eligible rows. The existing and prepared RPCs returned identical full JSON for default, page 2, price, Colour, Pattern, Texture, Finish, Character and Blue + Geometric + £50–under-£100. Transactional fault rehearsal preserved the prior 9,248-row generation. No Fabric Knowledge source or cache content was changed by the release.

The gateway was first deployed with the read switch off. The Shopify app-proxy route returned 200 with 9,248 fabrics. A second deployment enabled the switch; its first default, page-2 and Colour requests returned HTTP 400. The gateway alias was immediately returned to switch-off deployment `dpl_vEYeh1UYFmKnB4CT1Uhqm9xVUXpk`; the project default alias was also restored and the production switch set to `disabled`. Post-rollback Browse returned 200 with 9,248 fabrics, and Dunbar `pt-1223-374` retained Fabric Knowledge. The server masks the internal RPC error and available Vercel runtime log queries yielded no corresponding lines. Database execution under `service_role` succeeds, but the deployed HTTP/RPC failure is not yet identified. Do not infer a schema-cache issue or retry the live switch without evidence.

## Stage 1: direct, set-oriented eligibility

Unreleased SQL candidate `sql-candidates/browse/20260925064738_browse_set_oriented_search.sql` derives guide price, media eligibility and stock sets from the existing authoritative tables, then exposes a shadow `search_retail_fabrics_direct_v1` RPC. It does not change Sample or Make Curtains commercial validation. It is outside `supabase/migrations` so a routine migration push cannot apply it accidentally.

Production-data read-only comparison found 9,248 eligible rows in both the old and candidate queries, zero missing or extra IDs, and zero differing row payloads. Existing guide-price helper versus the set-oriented guide projection likewise matched 10,165 rows with zero differences. Full JSON responses matched for the default 9,248-result request and Blue + Geometric + £50–under-£100 (137 results).

This is **not yet a speed improvement**. Three production-scale, transaction-rolled-back default RPC calls averaged 8,993.965 ms for the current function and 17,269.231 ms for the direct candidate. Under these conditions the direct candidate is unsuitable as the customer fallback. The prepared RPC therefore falls back to the existing live function whenever the projection is dirty, absent or past a time boundary.

## Stage 2: governed Browse read projection

The original SQL candidate `sql-candidates/browse/20260925070237_browse_read_projection.sql` defines a private generation-based projection of the same eligible rows. The corrected, source-controlled production migration `20260925085155` is now applied. Browse filters, counts and pagination can operate on that projection when the gateway switch is enabled. Existing full-catalogue facet metadata is computed at refresh time, not per customer request. The active-generation pointer changes atomically only after a row-by-row reconciliation against the direct source. Source triggers queue individual Fabric Master changes where attributable and a full refresh for global supplier/stock/media changes; the installed worker handles the queue. Any dirty or expired projection falls back to the existing live Browse RPC. The customer switch remains disabled after the HTTP 400 rollback.

In a rollback-only rehearsal, the existing RPC and prepared RPC returned identical complete JSON responses for default, page 2, price, colour, pattern, Blue + Geometric + price, sample availability, stock availability and exact SKU search. A temp-table trigger queued one fabric; incremental refresh cleared the queue and preserved 9,248 rows; another full reconciliation returned 9,248 active rows. No customer or production source records were changed. The broader 16-case transaction hit the diagnostics API's 120-second boundary; it did not reveal a parity difference and rolled back.

Twenty database-side runs of the full prepared RPC averaged 22.827 ms default, 22.248 ms page 2 and 8.419 ms combined-filter. These exclude gateway/network, 24-card hydration and browser rendering, so they must not be presented as customer page-load timings or as a production load test.

## Pre-release safety rehearsal, 25 September

The owner stopped further work on the slower direct SQL candidate. The prepared projection remains the preferred path. A new rollback-only fault rehearsal used current production-scale data but installed no persistent database objects. It queued two distinct Fabric Master IDs through the invalidation trigger, refreshed them, and found zero dirty IDs. A repeat incremental call returned `refreshed: 0`, demonstrating no-op idempotence for this sequential case. An intentionally failing full refresh left the prior active generation unchanged with all 9,248 rows intact and retained a dirty marker. While dirty, the prepared RPC's exact-SKU response matched the current authoritative Browse RPC. The earlier full reconciliation also restored 9,248 active rows.

At the time, these checks did **not** prove concurrent writers/readers because all test objects existed only within one rollback transaction. This paragraph records the pre-release limitation; the later controlled production attempt is documented at the top of this file. Do not present the sequential rehearsal alone as concurrent-load proof.

The live Shopify app proxy was sampled through `/apps/curtainsuk-decision/catalog?view=retail`. One default request took 9,733 ms (9,248 total, 24 cards), page 2 took 5,455 ms (9,248 total, 24 cards), and Blue + Geometric + £50–under-£100 took 5,847 ms (137 total, 24 cards). These are **current-RPC baselines**, not prepared-projection or browser-render timings. The later prepared-path attempt returned HTTP 400, so no valid prepared end-to-end benchmark exists yet.

The gateway source now has an explicit off-by-default switch for prepared Browse reads. Only `searchRetailFabrics` uses it. Sample and Make Curtains remain on their existing canonical Fabric Master, stock and pricing paths.

## Controlled production sequence

1. Release only the two scoped projection migrations and opt-in gateway selector through the protected `release/production` workflow. The slower direct shadow function remains source-only and is not part of the migration.
2. Keep the gateway selector off. Build a full generation from current authoritative production data and reconcile all 9,248 eligible rows and representative response payloads against the unchanged live RPC.
3. Enable the server-side selector only after exact parity, then measure the actual Shopify app-proxy route and commercial handoffs. On any parity, refresh, error or handoff regression, switch the selector off immediately.
4. Preserve Sample and Make Curtains revalidation. Browse customers never initiate projection rebuilds. Do not increase timeouts or introduce a separate catalogue authority.

The production migration history differs from older local files. Release operators must use a temporary migration workdir containing the fetched remote history plus only the two new source-controlled Browse migration files. Do not repair or replay historical migrations to make a push succeed.

Read-only/rollback rehearsal commands: `scripts/browse-performance-stage1-parity.ps1`, `scripts/browse-guide-parity.sql`, and `scripts/browse-performance-transactional-rehearsal.ps1`.
