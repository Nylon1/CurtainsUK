# CurtainsUK Phase 4E — durable supplier intelligence and approval gate

Status: implemented on the non-production branch; database migration prepared but not applied

Date: 2026-09-07

## Outcome

Phase 4E replaces the Phase 4D in-memory write path with a supplier-neutral Postgres repository and a private approval boundary. Supplier observations, validation results and staff decisions are append-only. No supplier snapshot can become projected truth until it is both valid and explicitly approved.

No Shopify theme, checkout, Merchant Center, supplier ordering or production schedule is written by this implementation. The projection endpoint is private and staff-authorised; it is not connected to Dawn or any Shopify metafield.

## Database and migration state

The implementation targets Postgres through Supabase. The migration is:

`supabase/migrations/20260907043049_supplier_intelligence_approval_gate.sql`

It creates a dedicated `curtainsuk_private` schema. The schema is exposed to PostgREST only so server-side code can use the Data API; `public`, `anon` and `authenticated` receive no schema or table privileges. Every table has RLS enabled and forced. Only the elevated server role receives `SELECT` and `INSERT`. Default privileges prevent future private tables from being accidentally opened to browser roles.

The migration has not been applied because this workspace has neither a linked development Supabase project nor a local Postgres/Docker runtime. Applying it without an explicit development target would risk the wrong environment. No production database action was attempted.

Required development configuration:

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY` (preferred current server-only key), or the legacy `SUPABASE_SERVICE_ROLE_KEY`
- an authenticated staff user whose `app_metadata.roles` includes `SUPPLIER_ADMIN`

The elevated key is read only in `lib/supabase/supplier-service.ts`. It is never sent to the browser, persisted by the client, logged or documented with a value.

## Durable schema

| Table | Purpose |
|---|---|
| `suppliers` | Stable supplier identity, independent of any adapter |
| `fabric_supplier_links` | Maps `supplier_id + supplier_sku` to the existing supplier-neutral `FabricSpec` |
| `supplier_freshness_policies` | Versioned freshness limits by supplier, source and data type |
| `supplier_approval_policies` | Versioned manual/future policy approval mode and required price field |
| `supplier_validation_policies` | Versioned allowed currencies and stock units by supplier |
| `supplier_sync_runs` | Immutable success/failure audit with enforced shadow/no-Shopify/no-schedule flags |
| `supplier_snapshots` | Immutable normalized observation plus validation and expiry metadata |
| `supplier_snapshot_prices` | Private standard/cut trade price snapshot |
| `supplier_snapshot_batches` | Private batch/dye-lot quantities and pieces |
| `supplier_promotion_events` | Immutable validation, approval, rejection and expiry-state audit |

Update and delete triggers reject mutation of policy, run, snapshot, price, batch and promotion history. A server-only RPC appends a run, snapshot, validated child data and the validation event atomically. Invalid observations retain their normalized payload and validation errors for audit, but do not populate trusted price/batch child records.

## Promotion workflow

```text
Supplier observation
        |
        v
RAW_SHADOW -> structural/source validation
        |                         |
        v                         v
    VALIDATED                  REJECTED
        |
        v
manual SUPPLIER_ADMIN decision (Phase 4E default)
        |                         |
        v                         v
APPROVED_FOR_PROJECTION       REJECTED
        |
        v
EXPIRED when a relevant configured freshness limit passes
```

Approval stores the approving staff user, timestamp, reason and previous approved snapshot. Rejection stores the staff user, timestamp and rejection reason. The schema also supports `POLICY` actors and `POLICY_BASED` approval policies, but no automatic approval policy is enabled.

The effective promotion state is derived from immutable events and configured expiries. Expiration does not alter or delete the original observation.

## Validation and freshness

Validation blocks promotion unless the supplier and SKU are registered; the normalized contract is structurally valid; supplied currency/unit is allowed by that supplier's validation policy; required price fields are valid; quantities are non-negative; batch references and totals are internally consistent; and every supplied data type has a current source-specific freshness policy.

Prestigious manual-portal draft policies are data, not code:

| Data | Freshness |
|---|---:|
| Stock | 24 hours |
| Price | 7 days |
| Lifecycle | 72 hours |

Missing supplier fields remain unknown. Unknown lifecycle data has no fabricated lifecycle expiry. Adding Sanderson Design Group requires new supplier, mapping and policy rows plus its adapter; it requires no `FabricSpec`, snapshot, promotion, availability or projection schema change.

## Failure semantics

A failed sync appends only a failed run. It cannot append an out-of-stock snapshot, replace a prior snapshot or delete a previous approval. The last approved snapshot remains the candidate projection until its own relevant freshness expires. An expired or unapproved candidate projects only `AVAILABILITY_TO_BE_CONFIRMED`; failure is never translated into out of stock.

Batch-aware availability requires one known, suitable dye lot to contain the required quantity. Aggregate stock split across insufficient batches does not become available.

## Private admin tools

`/admin/supplier-intelligence` provides Supplier Sync Health with:

- last successful and failed run;
- stale and expired SKUs;
- approval queue with required decision reason;
- price-verification blockers;
- price increases/decreases;
- newly low/unavailable stock;
- next-due changes;
- newly discontinued items;
- validation failures; and
- supplier/SKU drill-down.

`/admin/prestigious-stock` now appends observations through the durable repository. It no longer writes new observations to the process-memory Phase 4C store. Both admin APIs require the `SUPPLIER_ADMIN` app-metadata role and return `no-store`, `noindex` responses.

The low-stock change detector accepts a supplier-specific threshold, but none is activated because the business has not supplied a threshold. The dashboard therefore does not invent one.

## Prestigious pilot migration

All 20 pilot SKU/FabricSpec mappings are created by the migration. The three Mocha mappings retain their verified-price status; the remaining 17 remain `PRICE_REQUIRES_VERIFICATION`.

The three private observations are not embedded in the SQL migration or documentation because that would place supplier-commercial values in Git. Once a development database and server secret are available, staff must re-append those exact observations using the private Prestigious Stock Check screen. They will enter as `VALIDATED`, not approved. This secure data backfill is the only incomplete part of the requested migration.

The prior Phase 4C commit already contains a staging-only commercial fixture. Phase 4E does not add those values to its migration, logs, screenshots or public payloads. Removing the values from Git history would require a separately authorised history rewrite and coordinated repository cleanup.

## Projection service

The private projection service returns only:

- supplier identity and SKU;
- observation timestamp;
- `FABRIC_AVAILABLE`, `LIMITED_AVAILABILITY`, `AVAILABLE_SOON`, `AVAILABILITY_TO_BE_CONFIRMED`, `TEMPORARILY_UNAVAILABLE` or `NO_LONGER_AVAILABLE`; and
- approved/expired/unapproved projection status.

It never serializes trade prices, cost, aggregate metres, batch references, pieces or supplier credentials. It is currently behind the private staff API and is not connected to Shopify.

## Verification

Automated coverage includes append-only writes, history reconstruction, validation failure retention, manual approval/rejection, previous-approval linkage, expiration, stale state, failed-run preservation, dye-lot sufficiency, price/stock/due/lifecycle change history, Sanderson-compatible generic storage, projection privacy and service-role access controls.

Security verification checks server-only key naming, browser-role revocations, absence of public database grants and absence of private fields in the projection contract. No screenshots were produced because the admin contains supplier-private operational data.

## Remaining gates

1. Provision or identify the non-production Supabase project and apply the migration there.
2. Store `SUPABASE_SECRET_KEY` in server-only environment configuration and assign `SUPPLIER_ADMIN` through trusted `app_metadata`.
3. Re-append and manually approve the three verified Mocha observations in the development database.
4. Confirm a business low-stock threshold if the health dashboard should classify quantity changes as low stock.
5. Verify the remaining 17 colourways before they can leave `PRICE_REQUIRES_VERIFICATION`.
6. Perform a separately authorised Git-history review/remediation for the Phase 4C supplier-commercial fixture.
7. Run database-level migration/RLS tests against the development project before any scheduling or Shopify projection is considered.

No production changes were made.
