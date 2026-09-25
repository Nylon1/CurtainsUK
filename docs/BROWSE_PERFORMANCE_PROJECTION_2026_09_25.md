# Browse performance: controlled projection release

Status: **prepared projection live on the Shopify app-proxy route**. Production Browse calls `search_retail_fabrics_prepared_v1` with `CURTAINSUK_BROWSE_READ_PROJECTION=enabled`. The unchanged `search_retail_fabrics` RPC remains the immediate fallback. No Shopify theme, Fabric Master, pricing, stock or Fabric Knowledge content changed.

## HTTP 400 investigation and corrected live route, 25 September

The released Shopify app proxy in `shopify.app.toml` targets `https://curtainsuk-staging-api.vercel.app/api/staging/shopify-proxy`. The earlier controlled switch changed the separate `curtainsuk-staging-gateway.vercel.app` alias, so Shopify Browse continued to reach the older API deployment `dpl_5Gi1kG1u78huottDLmgbb5BVQJue` and its original RPC. Changing the gateway alias did not test the prepared RPC. An isolated production-environment probe called the prepared RPC successfully for default, page 2, Colour and combined filters. Production `pg_stat_statements` showed prepared RPC calls for those probes but not for the attempted Shopify switch. The RPC names, five parameter names/types, null guide-price inputs, filter arrays and returned JSON contract matched the existing gateway call; no SQL or gateway contract change was justified.

The same isolated probe reproduced the old RPC failure under eight concurrent requests. Its bounded server log captured Supabase HTTP 500 and PostgreSQL code `57014`, message `canceling statement due to statement timeout` (empty details and hint), after about 8.4 seconds. The production app-proxy wrapper rendered that backend failure as customer HTTP 400. The error was not a prepared-RPC contract error.

Deployment `dpl_wth6kPpCftfKK1ba8kVjVEz7qdE9` was built from the protected production source with the prepared-read selector explicitly enabled. The actual app-proxy alias, `curtainsuk-staging-api.vercel.app`, was assigned to it after 9,248-row and exact default-response parity. A live Shopify request returned 200 and incremented the prepared PostgREST RPC call count from 10 to 11; it later reached 27 after live smoke. Concurrent live default, page 2, Colour, Pattern and combined requests returned 200 in 2.18, 3.14, 2.55, 3.03 and 3.08 seconds respectively. Ten additional concurrent default/page-2 requests all returned 200 in 1.74–2.67 seconds. The live default response retained 9,248 results and 24 cards; Blue + Geometric + £50–under-£100 retained 137 results. Dunbar `pt-1223-374` retained non-null Fabric Knowledge and its Sample/Make Curtains eligibility fields. No error-level Vercel logs were found on the enabled deployment during these checks. The production selector setting was also made `enabled` for subsequent deployments. Rollback is an alias reassignment to the known-good previous API deployment `dpl_5Gi1kG1u78huottDLmgbb5BVQJue` and a disabled selector for future builds. Do not confuse the app-proxy API alias with the distinct gateway/OAuth alias.

## Controlled production attempt, 25 September

Protected release `f89ab94` corrected the previously unapplied projection migration: no trigger is attached to the Fabric Knowledge materialized view. Governed enrichment evidence and approved image/colourway scope changes mark the Knowledge cache dirty; the existing minute worker refreshes that cache before full Browse reconciliation. Ordinary supplier price/stock writes invalidate Browse only and do not refresh Fabric Knowledge. The cache refresh and projection publication share a transaction, so a failed reconciliation retains the previous valid generation. A completed external cache refresh is also detected by its `refreshed_at` stamp.

Migration `20260925085155` is recorded in Production. It installed 34 source-table triggers, zero materialized-view triggers and one worker job. A full generation reconciled exactly 9,248 eligible rows. The existing and prepared RPCs returned identical full JSON for default, page 2, price, Colour, Pattern, Texture, Finish, Character and Blue + Geometric + £50–under-£100. Transactional fault rehearsal preserved the prior 9,248-row generation. No Fabric Knowledge source or cache content was changed by the release.

The first attempt switched only the gateway/OAuth alias and left the Shopify app-proxy API alias on its older deployment. Its HTTP 400 responses came from the still-live old RPC timing out, as established by the later isolated log capture above. That attempt was rolled back before the actual app-proxy alias was identified. The corrected switch and live result are recorded above.

## Stage 1: direct, set-oriented eligibility

Unreleased SQL candidate `sql-candidates/browse/20260925064738_browse_set_oriented_search.sql` derives guide price, media eligibility and stock sets from the existing authoritative tables, then exposes a shadow `search_retail_fabrics_direct_v1` RPC. It does not change Sample or Make Curtains commercial validation. It is outside `supabase/migrations` so a routine migration push cannot apply it accidentally.

Production-data read-only comparison found 9,248 eligible rows in both the old and candidate queries, zero missing or extra IDs, and zero differing row payloads. Existing guide-price helper versus the set-oriented guide projection likewise matched 10,165 rows with zero differences. Full JSON responses matched for the default 9,248-result request and Blue + Geometric + £50–under-£100 (137 results).

This is **not yet a speed improvement**. Three production-scale, transaction-rolled-back default RPC calls averaged 8,993.965 ms for the current function and 17,269.231 ms for the direct candidate. Under these conditions the direct candidate is unsuitable as the customer fallback. The prepared RPC therefore falls back to the existing live function whenever the projection is dirty, absent or past a time boundary.

## Stage 2: governed Browse read projection

The original SQL candidate `sql-candidates/browse/20260925070237_browse_read_projection.sql` defines a private generation-based projection of the same eligible rows. The corrected, source-controlled production migration `20260925085155` is now applied. Browse filters, counts and pagination operate on that projection through the actual Shopify app-proxy alias. Existing full-catalogue facet metadata is computed at refresh time, not per customer request. The active-generation pointer changes atomically only after a row-by-row reconciliation against the direct source. Source triggers queue individual Fabric Master changes where attributable and a full refresh for global supplier/stock/media changes; the installed worker handles the queue. Any dirty or expired projection falls back to the existing authoritative Browse RPC.

In a rollback-only rehearsal, the existing RPC and prepared RPC returned identical complete JSON responses for default, page 2, price, colour, pattern, Blue + Geometric + price, sample availability, stock availability and exact SKU search. A temp-table trigger queued one fabric; incremental refresh cleared the queue and preserved 9,248 rows; another full reconciliation returned 9,248 active rows. No customer or production source records were changed. The broader 16-case transaction hit the diagnostics API's 120-second boundary; it did not reveal a parity difference and rolled back.

Twenty database-side runs of the full prepared RPC averaged 22.827 ms default, 22.248 ms page 2 and 8.419 ms combined-filter. These exclude gateway/network, 24-card hydration and browser rendering, so they must not be presented as customer page-load timings or as a production load test.

## Pre-release safety rehearsal, 25 September

The owner stopped further work on the slower direct SQL candidate. The prepared projection remains the preferred path. A new rollback-only fault rehearsal used current production-scale data but installed no persistent database objects. It queued two distinct Fabric Master IDs through the invalidation trigger, refreshed them, and found zero dirty IDs. A repeat incremental call returned `refreshed: 0`, demonstrating no-op idempotence for this sequential case. An intentionally failing full refresh left the prior active generation unchanged with all 9,248 rows intact and retained a dirty marker. While dirty, the prepared RPC's exact-SKU response matched the current authoritative Browse RPC. The earlier full reconciliation also restored 9,248 active rows.

At the time, these checks did **not** prove concurrent writers/readers because all test objects existed only within one rollback transaction. This paragraph records the pre-release limitation; the later controlled production attempt is documented at the top of this file. Do not present the sequential rehearsal alone as concurrent-load proof.

The live Shopify app proxy was sampled through `/apps/curtainsuk-decision/catalog?view=retail`. Before the corrected alias switch, one default request took 9,733 ms (9,248 total, 24 cards), page 2 took 5,455 ms, and Blue + Geometric + £50–under-£100 took 5,847 ms. Those are **old-RPC baselines**. The corrected prepared-path timings are recorded above; neither set measures browser rendering.

The gateway source now has an explicit off-by-default switch for prepared Browse reads. Only `searchRetailFabrics` uses it. Sample and Make Curtains remain on their existing canonical Fabric Master, stock and pricing paths.

## Controlled production sequence

1. Release only the two scoped projection migrations and opt-in gateway selector through the protected `release/production` workflow. The slower direct shadow function remains source-only and is not part of the migration.
2. Keep the gateway selector off. Build a full generation from current authoritative production data and reconcile all 9,248 eligible rows and representative response payloads against the unchanged live RPC.
3. Enable the server-side selector only after exact parity, then measure the actual Shopify app-proxy route and commercial handoffs. On any parity, refresh, error or handoff regression, switch the selector off immediately.
4. Preserve Sample and Make Curtains revalidation. Browse customers never initiate projection rebuilds. Do not increase timeouts or introduce a separate catalogue authority.

The production migration history differs from older local files. Release operators must use a temporary migration workdir containing the fetched remote history plus only the two new source-controlled Browse migration files. Do not repair or replay historical migrations to make a push succeed.

Read-only/rollback rehearsal commands: `scripts/browse-performance-stage1-parity.ps1`, `scripts/browse-guide-parity.sql`, and `scripts/browse-performance-transactional-rehearsal.ps1`.
