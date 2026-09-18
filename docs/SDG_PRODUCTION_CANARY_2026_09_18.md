# Controlled SDG Production canary — execution record

Owner instruction: 18 September 2026, Codex thread `01a0ab54-5b9d-7473-8b99-5ca8ecac9ad5`. Approved policy source: `570c7f3`. Production project: `hqysjumypgeapgmqkcrx`.

## Before execution

The only application schema changes are the approved `20260918172104_sample_stock_independent_of_curtain_floor.sql` (replaces `fabric_commercial_evidence(text[])` and `search_retail_fabrics(jsonb,integer,integer)`) and the new `20260918173501_scoped_sdg_stock_canary.sql` (adds `materialize_sdg_stock_canary(jsonb,uuid)`, service-role-only, security invoker). Existing function definitions and ACLs are saved in ignored `artifacts/sdg-portal-private/production-canary-baseline.json`; compensating SQL is in `rollback-functions.sql` in that directory.

The new function requires a serializable transaction, one to three explicit Fabric Master/supplier/SKU/snapshot tuples, an identified operator, validated verified exact-source metre evidence, latest unambiguous operator approval, current non-discontinued identities, and a strictly newer genuine observation. It never calls `materialize_daily_stock` or updates supplier-wide run coverage. Existing source-consistency and append-only audit triggers remain enabled.

35 isolated PostgreSQL/WASM checks passed, including real stock-audit trigger execution, rollback after a later-row failure, service-role execution without new table grants, rejection of public roles, latest-approved-source selection, same-day updates, and the approved commercial evidence function for high/low/zero/unknown cases. The complete generated transaction and both migrations also passed an isolated schema-copy rehearsal, including rollback. Another 21 targeted TypeScript tests passed, as did TypeScript checking. Synthetic fixtures exist only in an isolated in-memory PGlite instance, never Production.

Authenticated browser reads freshly verified these identities, source metres and units. Their full source text, independent future/offsite quantities, observation times and SHA-256 are retained in `canary-ui-evidence-2026-09-18.json`. These are manual portal UI observations; they are not represented as a new API retrieval. Recorded times are observation-recording times, not supplier update times.

| Fabric Master | Supplier SKU | Available now | Recorded UTC | Snapshot ID |
|---|---|---:|---|---|
| sdg-aarc520004 | AARC520004 | 44.3m | 2026-09-18 17:41:02 | sdg-canary:AARC520004:da8b43591ab616c8 |
| sdg-aarc520020 | AARC520020 | 20.3m | 2026-09-18 17:41:47 | sdg-canary:AARC520020:da8b43591ab616c8 |
| sdg-ccf0874-01 | CCF0874-01 | 0m | 2026-09-18 17:42:20 | sdg-canary:CCF0874-01:da8b43591ab616c8 |
| sdg-zald332703 | ZALD332703 | UNKNOWN | No observation | No snapshot |

All belong to `sanderson-design-group`; the first two are `sdg-morris-co`, the third `sdg-clarke-clarke`, and the negative control `sdg-zoffany`. The positive and zero records are visible, selectable, non-discontinued exact Fabric Master records with existing imagery. The unresolved negative control remains unchanged. Future stock (100m and 234.1m respectively) never enters the available-now quantity.

Operator UUID `554dcc42-4bb0-4db1-8ae8-d97413051548` is the existing explicitly labelled Codex audit identity in `scripts/curtainsuk-verify-catalogue-canary.ts` and Production approval history. It is not an impersonated Supabase application user. Every approval cites this owner instruction and the saved evidence hash.

Expected data mutations, all in one transaction through `append_validated_supplier_snapshot`, the existing manual approval event format, and the scoped materialiser:

- 3 `supplier_sync_runs`, one exact `:run` ID per snapshot.
- 3 `supplier_snapshots`, the exact snapshot IDs above.
- 3 `supplier_snapshot_prices` companion rows with NULL price/currency values, created by the existing append function; no price assertion or modification.
- 6 `supplier_promotion_events`: one validation and one owner-authorised Codex approval per snapshot, with prior approved source linked.
- 3 new `daily_stock_snapshots` for 2026-09-18; the old 2026-09-14 rows remain untouched.
- 3 `daily_stock_snapshot_history` entries produced by the existing trigger.
- 1 `daily_stock_materialization_events` entry containing exact scope, operator and outcomes.
- No batch rows, Fabric Master changes, usage changes, supplier-wide daily run changes, Shopify writes or orders.

The transaction compares hashes of every pre-existing stock row, all Fabric Master rows, daily runs and usage before/after; it checks exact mutation counts and all four commercial stock/sample outcomes before commit. A failure rolls everything in that transaction back. A separate rollback-only rehearsal must pass first. The script refuses evidence over one hour old and refuses the 06:00 London scheduler window. No automatic retry is permitted after an uncertain commit.

Production already contains active cron job 1, `curtainsuk-staging-daily-stock`, schedule `0 5,6 * * *`, which invokes unrestricted materialisation only at London hour 6. This is pre-existing; the canary does not connect, call, alter or disable it. Both its definition and the unrestricted function are included in before/after verification.

## Rollback procedure recorded before writes

1. Before commit: use `ROLLBACK`. No source, approval, stock or audit row in the canary transaction survives.
2. After an uncertain response: query the exact snapshot IDs and audit scope first. Do not retry ingestion or assume rollback.
3. After a confirmed commit requiring reversal: in one administrative serializable transaction with the same locks, require exactly the three listed source IDs and unchanged 2026-09-18 daily rows. If any newer observation exists, stop for reconciliation instead of overwriting it. Append a `REJECTED` promotion event for each canary source with the existing Codex operator and rollback reason; never edit/delete supplier history. Delete only the three daily rows whose exact source IDs, supplier/SKU and day match this canary. This reveals the existing stale 14 September baseline and preserves fail-closed stock behaviour. Preserve the three immutable stock-history entries and original audit event, and append a materialisation audit record describing the reversal. No fabricated observation, backdated replacement or disabled trigger is needed.
4. If the schema itself requires reversal, apply the saved `rollback-functions.sql` as a compensating migration. It restores only the two prior function definitions and drops the new canary function. Preserve migration history; do not delete migration ledger entries.
5. Verify all three stock positions are again stale/unknown, Zoffany still has no daily observation, and unrelated row hashes, cron and function definitions match baseline.

## Execution outcome

PASS — committed at `2026-09-18T17:56:02.859654Z`, independently read back at `2026-09-18T17:56:33.579751Z`.

The first Production rehearsal ran at 17:53:08 UTC and explicitly rolled back. A subsequent independent query confirmed zero canary sources and zero rehearsal audit rows, with all original data counts restored. The owner then replied “Go”. The same transaction committed successfully with audit ID `11eb8ba7-ed89-495d-aa9a-09cfe55b1459`.

Applied migration ledger versions (Supabase assigned execution timestamps):

- `20260918175144_scoped_sdg_stock_canary` — exact content of local `20260918173501_scoped_sdg_stock_canary.sql`.
- `20260918175153_sample_stock_independent_of_curtain_floor` — exact approved content of local `20260918172104_sample_stock_independent_of_curtain_floor.sql`.

The three function changes listed above and these two migration ledger entries are the complete schema mutations. No table definitions, triggers, existing table grants or cron entries changed.

| Table | Committed additions | Result |
|---|---:|---|
| supplier_sync_runs | 3 | One SHADOW evidence run per canary snapshot |
| supplier_snapshots | 3 | VALIDATED, VERIFIED, METRE, original observation times |
| supplier_snapshot_prices | 3 | All price/currency fields NULL; existing positive approved prices unchanged |
| supplier_promotion_events | 6 | Three validation and three manual Codex approval events |
| daily_stock_snapshots | 3 | 44.3m, 20.3m, 0m for the exact three identities/day |
| daily_stock_snapshot_history | 3 | Original immutable audit trigger recorded those sources |
| daily_stock_materialization_events | 1 | Exact scope, operator and outcomes in the audit ID above |

Total: 22 inserted data/audit rows, plus two migration ledger entries. No existing business-data row was updated or deleted. Global daily stock count changed 10,476 → 10,479; stock history 10,479 → 10,482; supplier snapshots 17,439 → 17,442; promotions 34,878 → 34,884; materialisation events 35 → 36. Zero supplier batch rows were added. The transaction verified hashes of all pre-existing daily stock, Fabric Master, usage and daily-run rows; no out-of-scope effect occurred. A subsequent comparison confirmed the existing unrestricted function and cron definition are byte-for-byte unchanged.

| Cohort | Database stock gate | Sample stock gate | Source freshness |
|---|---|---|---|
| AARC520004, 44.3m | FABRIC_AVAILABLE | true | Fresh |
| AARC520020, 20.3m | TEMPORARILY_UNAVAILABLE: below 30m | true | Fresh |
| CCF0874-01, 0m | TEMPORARILY_UNAVAILABLE | false | Fresh |
| ZALD332703 | AVAILABILITY_TO_BE_CONFIRMED | false | No observation; UNKNOWN preserved |

The existing price-confirmation gate remains true for the three SDG canary fabrics and false for Zoffany. Supplier-wide `refreshFailed` remains true because the existing incomplete/failed supplier run is untouched; the approved 72-hour policy correctly permits genuinely fresh per-SKU evidence without claiming a successful full supplier refresh.

Using the real Golden Lily specification (1350mm full width, 520mm vertical repeat) and approved calculation code, a 180cm × 210cm pencil-pleat pair requires 10.4m and passes the 44.3m stock check. An 800cm × 400cm pair requires 56.2m and is rejected against 44.3m. Both checks were rerun against the independent post-commit Production read. These are quantity-gate proofs; no order or configuration was written.

Security advisors returned no new findings compared with the pre-write baseline. Existing private RLS-without-policy informational notices and the existing Auth leaked-password warning are unchanged and outside this canary's scope.

Private proof files: `production-canary-rehearsal.json`, `production-canary-commit.json`, `production-canary-verification.json`, `canary-requirement-proof.json`, `canary-packet.json`, and `production-canary-all-mutated-rows.json` (complete independent read-back of all 22 inserted rows). The rollback procedure and saved old function definitions remain available. The database-confidence canary gate has passed. This does not claim that the application revision has been deployed or that a customer checkout has been exercised. No application code deployment, HCI rebuild, Shopify/theme change, SDG scheduler connection, remaining-cohort import or Zoffany stock claim occurred.

Local SQL tests use pinned `@electric-sql/pglite@0.5.8`, installed outside the application at `C:/Users/hamza/.codex/tmp/sdg-canary-runtime`. Run `node scripts/curtainsuk-test-scoped-stock.mjs <pglite-install>/dist/index.js`. The separate `curtainsuk-test-canary-packet.mjs` uses the saved private schema and evidence files to verify the one-time transaction locally. Neither test script can connect to Production. The preparation script only creates reviewed SQL artifacts; it never executes them.
