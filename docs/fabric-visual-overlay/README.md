# Empty Fabric Intelligence overlay rollout

The overlay source is now on protected `release/production`. It contains **no patch
inserts**. The empty overlay migration has been applied to production and its
11,815-row zero-patch parity gate passed with 0 differences. The Browse-source
migration and application reader deployment remain pending.

## Scope and rollout gates

1. `20261002201534_fabric_visual_knowledge_overlay_empty.sql` is **applied**.
   It created the private patch table, overlay-specific vocabulary guard, and
   fail-closed enriched view. The patch table remains empty and the existing
   Browse source remains in place.
2. The live zero-patch parity gate has **passed** across all `11,815` rows:
   `fabric_id`, `supplier_id`, `supplier_sku`, `knowledge_state`,
   `visual_fields`, `provenance`, and `refreshed_at` matched with
   **0 differences**. Browse dirty rows remained `0` and
   `knowledge_cache_dirty=false`.
3. The parity-gated Browse source migration
   `20261002202411_fabric_visual_knowledge_overlay_browse_source.sql` is now
   **applied**. It switches only the Browse knowledge relation to the enriched
   view; the patch table remains empty. The prepared Browse model remains at
   **11,815 rows**, dirty rows remain `0`, and
   `knowledge_cache_dirty=false`. The two FI application reader changes still
   require deployment from the exact protected production source. No patch
   publication is part of this step.
4. The three canary rows in `canary-insert-payloads.json` are **proposed only**.
   They require fresh base-hash, identity, approved-image, missing-target, and
   vocabulary checks immediately before any separately authorised insert.
   The JSON contains every required insert column; `patch_id` and
   `registered_at` use database defaults if the canary is later authorised.

The local PostgreSQL test loads the production read-only snapshot of 11,815
cache rows, applies both migrations locally, and compares the empty enriched
view and Browse source to their existing equivalents. It also inserts the
three canary payloads **in local memory only** and verifies that only their
requested fields change. This test is evidence for the rollout gate; it does
not replace the live empty-table parity check after a future migration.

Both FI readers first query the enriched view. During a staged migration or
rollback, they retry the same query against the existing cache only when
PostgREST reports that the enriched relation itself is missing (`PGRST205`,
or exact PostgreSQL `42P01` for that relation). Permission, timeout, malformed
query, missing underlying relation, and other errors still fail normally.

## Customer/runtime read consumers

| Consumer | Source changed here | Mapping changed |
| --- | --- | --- |
| `lib/fabric-master/visual-knowledge.ts` retail/Fabric Detail and Browse hydration | cache → enriched view | No |
| `lib/fabric-master/hci-visual-knowledge.ts` HCI/FI selection, both ID and paged paths | cache → enriched view | No |
| `curtainsuk_private.browse_eligible_set_v1` Browse projection source | cache → enriched view | No |

The manual `scripts/curtainsuk-refresh-fabric-profile-metaobjects.ts` also
reads the old cache, but it is Shopify reconciliation tooling, not a live
customer reader, and must remain inactive for this rollout. Historic
migrations and rehearsal scripts retain the original source deliberately.
`browse_projection_refresh_full` retains its original cache refresh logic.

## Overlay rules

The enriched view always begins with
`fabric_visual_knowledge_read_cache`. It returns the original cache row if
**any** guard fails: non-PARTIAL state, supplier/SKU/brand/design drift,
approved image identity drift, visual or provenance SHA-256 hash drift,
invalid vocabulary or field shape, unrequested value, or any requested target
that has a concrete observation or confidence other than `REVIEW`.
Only `unknown` scalar or empty-array targets may be filled. No partial
application of a fabric patch occurs. The view copies the existing
`knowledge_state` and `refreshed_at` directly.

The table allows one active patch per fabric. It lives in the private schema
with forced RLS and service-role read access. The table constraint rejects
invalid field names, governed values, confidence, provenance, and arrays with
duplicates. The read view repeats the validation so it fails closed even if
stored data or surrounding evidence changes. This is an overlay-specific
guard; the production Fabric Intelligence validator and ledger are untouched.

The `31` blocked fabrics are listed in `blocked-31.json` with all `33`
already populated requested targets, their current observations and
confidence. No blocked fabric is present in the proposed canaries. Do not
loosen the no-overwrite rule to include them.

## Browse invalidation and future publication

Creating an empty table or view produces no dirty marker and no refresh.
Future patch-table INSERT/UPDATE/DELETE/TRUNCATE statements call the existing
`browse_projection_mark_global_dirty()` trigger once per statement. Its
`*` queue row coalesces repeated statements. The existing scheduled
`browse_projection_refresh_dirty(500)` can then run one full reconciliation
using the enriched Browse source. A controlled bulk publication should
coordinate with that schedule so batches do not cause repeated full rebuilds;
no schedule change or refresh is made in this branch.

This overlay does not alter Browse eligibility, facets, sorting, pagination,
manufacturer colours, guide prices, stock, or samples. Among Browse columns,
only the seven existing visual facet inputs can gain values from accepted
missing-field patches.

## Rollback

The manual `ROLLBACK.sql` is outside `supabase/migrations` and has **not** been
run. For an empty rollout, first restore and deploy the prior FI reader source.
Then run `ROLLBACK.sql`: it restores the prior Browse source view and removes
the empty overlay objects. It aborts if any patch row exists. If patch rows
have been published later, stop and plan a data-preserving rollback instead.
