# Browse performance: source-only two-stage candidate

Status: **not deployed**. Production Browse still calls `search_retail_fabrics`. The gateway's `CURTAINSUK_BROWSE_READ_PROJECTION=enabled` switch is opt-in and is not set in production.

## Stage 1: direct, set-oriented eligibility

Unreleased SQL candidate `sql-candidates/browse/20260925064738_browse_set_oriented_search.sql` derives guide price, media eligibility and stock sets from the existing authoritative tables, then exposes a shadow `search_retail_fabrics_direct_v1` RPC. It does not change Sample or Make Curtains commercial validation. It is outside `supabase/migrations` so a routine migration push cannot apply it accidentally.

Production-data read-only comparison found 9,248 eligible rows in both the old and candidate queries, zero missing or extra IDs, and zero differing row payloads. Existing guide-price helper versus the set-oriented guide projection likewise matched 10,165 rows with zero differences. Full JSON responses matched for the default 9,248-result request and Blue + Geometric + £50–under-£100 (137 results).

This is **not yet a speed improvement**. Three production-scale, transaction-rolled-back default RPC calls averaged 8,993.965 ms for the current function and 17,269.231 ms for the direct candidate. Under these conditions the direct candidate is unsuitable as the customer fallback. The prepared RPC therefore falls back to the existing live function whenever the projection is dirty, absent or past a time boundary.

## Stage 2: governed Browse read projection

Unreleased SQL candidate `sql-candidates/browse/20260925070237_browse_read_projection.sql` defines a private generation-based projection of the same eligible rows. Browse filters, counts and pagination operate on that projection. Existing full-catalogue facet metadata is computed at refresh time, not per customer request. The active-generation pointer changes atomically only after a row-by-row reconciliation against the direct source. Source triggers queue individual Fabric Master changes where attributable and a full refresh for global supplier/stock/media changes; a scheduled worker handles the queue. Any dirty or expired projection fails over to the existing live Browse RPC. The candidate and scheduler have **not** been applied.

In a rollback-only rehearsal, the existing RPC and prepared RPC returned identical complete JSON responses for default, page 2, price, colour, pattern, Blue + Geometric + price, sample availability, stock availability and exact SKU search. A temp-table trigger queued one fabric; incremental refresh cleared the queue and preserved 9,248 rows; another full reconciliation returned 9,248 active rows. No customer or production source records were changed. The broader 16-case transaction hit the diagnostics API's 120-second boundary; it did not reveal a parity difference and rolled back.

Twenty database-side runs of the full prepared RPC averaged 22.827 ms default, 22.248 ms page 2 and 8.419 ms combined-filter. These exclude gateway/network, 24-card hydration and browser rendering, so they must not be presented as customer page-load timings or as a production load test.

The gateway source now has an explicit off-by-default switch for prepared Browse reads. Only `searchRetailFabrics` uses it. Sample and Make Curtains remain on their existing canonical Fabric Master, stock and pricing paths.

## Remaining release gates

1. Improve or remove the slower set-oriented direct candidate before calling Stage 1 a performance optimisation. Keep the existing RPC as fail-safe in the meantime.
2. Bound full-refresh lock time and verify the trigger/scheduler behaviour against realistic concurrent writes and time-boundary changes. Confirm incremental refresh is materially cheaper than full refresh.
3. Complete response parity for the remaining combinations in bounded batches, then benchmark gateway + 24-card hydration and repeated concurrent calls with the prepared switch in an isolated environment.
4. Run the protected production capability suite. Enable the opt-in switch only after migration, complete parity and operational approval. No timeout increase or parallel Browse store is proposed.

Read-only/rollback rehearsal commands: `scripts/browse-performance-stage1-parity.ps1`, `scripts/browse-guide-parity.sql`, and `scripts/browse-performance-transactional-rehearsal.ps1`.
