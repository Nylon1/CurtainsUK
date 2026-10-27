# Fabric Intelligence detail reader audit, 27 October 2026

Status: review candidate, not deployed. Base: protected `release/production` at `5db7af1f31c5869c44ba6dc3911a1c3f83b687fd`. The production surface record remains unchanged.

## Confirmed finding

The retail reader already prefers `fabric_visual_knowledge_enriched`. The raw materialized `fabric_visual_knowledge_read_cache` is its base, not the normal customer detail source. The fallback is limited to an explicitly missing enriched relation during rollback. Comparing these two database objects measures enrichment, not customer-page disagreement.

Read-only production queries reproduced 958 enriched/base differences, including 956 storefront-selectable records, and 915 added primary colours. Coverage remains 1,070 `COMPLETE`, 10,744 `PARTIAL_GOVERNED` and one `PENDING_EXTERNAL_RETRY` (11,815 total). No source records were written or rebuilt.

Live customer checks before this change:

| Fabric | Retail API | Published profile |
| --- | --- | --- |
| `sdg-nmel120071`, Mr Fox Neutral/Paprika | 200, primary cream | 200, palette cream, red, white |
| `pt-1204-212`, Mellora Blush | 200, primary pink | 200, palette pink, white |
| `pt-1703-441`, Cairngorm Loch | 200, primary blue | Rate-limited (429); no page conclusion |
| `sdg-f1325-01`, Abeja Blush | 200, unknown primary omitted | Not checked |
| `sdg-f1321-07`, Logan Teal | 200, pending evidence still produced surface/character guidance | No published profile in the checked source manifest |

The concrete defect is the retail reader's missing governance-state restriction. Known fields in the pending row can still produce public dimensions and styling advice. The separate HCI reader and Fabric Profile publication builder already restrict accepted states. The published profiles checked above already use the enriched interpretation; no bulk Shopify update is justified by this alert.

## Candidate change

`visualKnowledgeByFabricIds` now selects only `COMPLETE` and `PARTIAL_GOVERNED`, matching the existing HCI/Browse boundary. It also validates returned states before mapping public intelligence. This applies to the enriched query and the existing missing-relation rollback fallback. Empty enriched results do not trigger a cache fallback, and permission/timeout errors remain errors.

`retail-repository.ts` already conditionally includes `visualIntelligence`, `intelligence` and `fabricIntelligenceGuidance` only when the map contains that fabric. No repository rewrite is needed. Pending intelligence is withheld without removing its fabric, supplier facts, approved imagery, sample availability or valid ordering path. The Room Visualiser's existing explicit intelligence opt-out is preserved.

No Shopify files, feature settings, environment variables, database schema/data, supplier facts, prices, stock rules or purchase controls are changed. No catalogue refresh, new cache or additional request is introduced.

## Verification

- New reader tests reproduced the missing state filter and pending-field leak against the unchanged base, then passed with this change.
- Real PostgREST query construction is tested with local responses: one bounded enriched query, complete/partial acceptance, pending/unrecognised-state exclusion, empty-result behaviour, guarded rollback and visible permission failure.
- Retail hydration regression verifies a pending-intelligence fabric retains its identity, colour, width, composition, approved image, sample and order availability, while all three intelligence properties are absent. The Room Visualiser opt-out performs no intelligence read.
- Existing source/fallback, compact Browse card, Fabric Profile publication and overlay migration/rollback tests pass.
- TypeScript passes. Focused lint and protected PR checks are recorded on the candidate PR.
- A read-only production `EXPLAIN ANALYZE` of the proposed predicate for four representative IDs returned three governed rows in 7.083 ms execution time (5.981 ms planning). This is one database observation, not an end-to-end latency guarantee.
- Supabase logs for 02:55–03:10 UTC show 47 successful enriched-view reads and one HTTP 500 from `search_retail_fabrics_prepared_v1`, consistent with the alert's isolated failure. This reader change does not claim to fix that separate RPC failure or prove full-day availability.

The Supabase security/performance advisory checks were reviewed before editing. Existing project-wide findings were not changed as part of this narrow reader correction.

## Release boundary

This requires an owner-approved protected API release after the candidate checks. No Shopify upload or Supabase migration is needed. Recheck Mr Fox, Mellora and Logan through the signed Shopify catalogue proxy after promotion: governed palettes must remain present, while Logan's factual product record remains available without the three intelligence properties. Verify existing feature/source identity settings and update `PRODUCTION_SURFACES.md` only after actual release and readback. Rollback is the preceding API deployment; it would reintroduce the pending-guidance issue.
