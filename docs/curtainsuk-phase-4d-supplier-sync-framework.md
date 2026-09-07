# CurtainsUK Phase 4D — supplier-neutral Supplier Sync framework

Status: implemented in staging; shadow mode only

Date: 2026-09-07

## Outcome

Phase 4D introduces a supplier-neutral, private server-side boundary between supplier observations and CurtainsUK's existing `FabricSpec`, pricing, availability and Shopify layers. Prestigious Webtex is Adapter #1, but Webtex-specific fields and behaviour do not appear in the normalized contract or its engines.

The shadow runner currently accepts only the three price-verified Mocha SKUs. It performs no network automation, Shopify write, production scheduling or ordering action. Expansion to the 20-colourway pilot is blocked until every candidate has a verified cut price snapshot.

## Architecture

```text
Supplier-specific authorised source
          |
          v
SupplierAdapter (read-only, SHADOW)
          |
          v
NormalizedSupplierSnapshot
          |
          +--> append-only private snapshot history
          +--> supplier-neutral availability evaluation
          +--> explicit supplier-cost policy resolver
          |
          v
FabricSpec association by supplier_id + supplier_sku

No Shopify or production-schedule output exists in the sync interface.
```

The generic modules live under `lib/supplier-sync`. Prestigious-specific transformation is confined to `adapters/prestigious-webtex.ts`. The legacy Phase 4C availability facade now translates its record into the normalized contract and delegates to the supplier-neutral evaluator.

The unpublished Shopify catalogue projection no longer reads Prestigious private records. It receives only the customer-safe availability already present on the staging catalogue record. Shadow snapshots therefore cannot change Shopify behaviour.

## Normalized contract

`NormalizedSupplierSnapshot` supports:

| Field | Type and unknown semantics |
|---|---|
| `supplier_id` | required stable supplier identifier |
| `brand_id` | string or `null` |
| `supplier_sku` | required supplier join key |
| `checked_at` | required ISO timestamp |
| `standard_trade_price` | decimal string or `null` |
| `cut_trade_price` | decimal string or `null` |
| `currency` | ISO currency or `null` |
| `stock_unit` | supplier stock unit or `null` |
| `aggregate_available_quantity` | number or `null` |
| `batches` | array or `null`; `null` means batch information was not supplied |
| `batch_reference` | string or `null` |
| `batch_available_quantity` | number or `null` |
| `pieces` | integer or `null` |
| `next_due_date` | date or `null` |
| `next_due_quantity` | number or `null` |
| `sample_available` | boolean or `null` |
| `lifecycle_state` | `CURRENT`, `DISCONTINUED` or `UNKNOWN` |
| `source` | typed source name and optional non-secret reference |
| `verification_status` | `VERIFIED`, `PARTIALLY_VERIFIED` or `UNVERIFIED` |

Prices use decimal strings to avoid floating-point loss at the supplier boundary. A separate currency is mandatory when any price exists. The current CurtainsUK price engine accepts GBP; another currency is rejected explicitly rather than converted or inferred.

Normalization fills every omitted optional scalar with `null`. It does not translate missing stock to zero, missing lifecycle to current, or missing batches to an empty/batch-sufficient state.

## Adapter #1 — Prestigious Webtex

`PrestigiousWebtexAdapter` consumes authorised manual observations. It does not call, scrape or replay Webtex endpoints and does not contain credentials, cookies, tokens or ordering methods.

Initial shadow scope:

- Escher Mocha `4269/147`
- Dali Mocha `4270/147`
- Diez Mocha `4271/147`

The known standard price, cut price and aggregate metres are normalized. Batch data, due data, sample status and any unobserved lifecycle value remain `null`/`UNKNOWN`.

The adapter accepts additional manually verified observations without changing the normalized contract. `validatePrestigiousPilotExpansion` requires all 20 pilot SKUs to have a `VERIFIED` snapshot with a non-null cut price. The current gate correctly reports 17 remaining.

## Snapshot history and failure safety

`SupplierSnapshotHistoryStore` is an append-only interface. The staging implementation clones and appends validated snapshots, exposes full SKU history, and resolves the latest verified snapshot without overwriting older records. Sync-run audits separately record success/failure, counts and the enforced zero Shopify writes/production schedules.

A failed adapter read appends only a failed run audit. It appends no supplier snapshot and leaves the previous verified snapshot unchanged. It therefore cannot turn a known available fabric into out-of-stock.

The in-memory implementation is a test/staging reference. `docs/schema/phase4d-supplier-sync-postgres.sql` provides an unapplied private Postgres migration with append-only mutation guards, lookup indexing and no anonymous/authenticated grants. Before any scheduled or production sync, connect the history-store interface to that schema and agree retention and service-role controls.

## Availability and pricing boundaries

The availability engine works only with normalized snapshots and a quantity/unit requirement. It contains no supplier IDs or field mappings. It requires:

- a verified, fresh snapshot;
- a matching stock unit;
- one known batch with sufficient quantity for `AVAILABLE`/`LOW_STOCK`.

Aggregate stock without batch details remains `UNKNOWN`. Multiple batches whose aggregate is sufficient but no single batch is sufficient return `INSUFFICIENT_SINGLE_BATCH`. Stale or partially verified data remains unknown.

The cost resolver receives an explicit commercial policy selecting `STANDARD_TRADE_PRICE` or `CUT_TRADE_PRICE`. The Prestigious pilot's cut-price choice is supplied by policy; it is not hard-coded in the pricing engine. No Phase 2/Phase 4C margin, lining, labour or heading rule changed.

## Sanderson Design Group proof

`SandersonDesignGroupAdapter` is deliberately an unimplemented type-only alias of `SupplierAdapter`. Tests create a Sanderson `FabricSpec`, associate it through `SupplierFabricLink`, and evaluate a Sanderson snapshot through the same normalized availability engine. Neither `FabricSpec` nor the engine needs a Sanderson field, branch or schema change.

## Shadow-run result

```json
{
  "supplier_id": "prestigious-textiles",
  "mode": "SHADOW",
  "status": "SUCCEEDED",
  "snapshots_appended": 3,
  "shopify_writes": 0,
  "production_schedule_created": false,
  "pilot_expansion_eligible": false,
  "pilot_skus_remaining": 17
}
```

## Production gates still required

1. Persist snapshots and run audits in a private append-only database.
2. Define staff/service permissions, retention and operational alerting.
3. Validate the remaining 17 pilot cut prices and any stock fields supplied.
4. Decide snapshot freshness by supplier/source rather than activating the 24-hour staging default globally.
5. Define when a manually verified snapshot can be promoted from shadow to customer-facing use.
6. Obtain a supported supplier feed/API before introducing an automated Prestigious schedule.
7. Design ordering separately if ever authorised; ordering is intentionally outside `SupplierAdapter`.

No Dawn theme, production catalogue, checkout, Merchant Center, supplier ordering or live Shopify data was changed in Phase 4D.
