# Jane changed-fabric refresh and urgent correction procedure

**Prepared, disabled.** This is separate from the 11,517-identity fixed-snapshot launch review. It does not authorise a schedule, migration, source scan or hosted index write.

## Proposed monthly cycle

1. Seal an approved source-change window from existing Fabric Master import observations, governed visual publications and other reviewed change records. Include design, collection and brand changes, new identities, withdrawals, deletions and customer-safe description corrections. The current event adapters do not yet prove complete coverage of every source, so this is a release gate.
2. Resolve each source event to exact affected fabric IDs through indexed relationships. Deduplicate IDs; reject gaps, oversized fan-out and uncertain deletions. Save a manifest of IDs, source revisions, window boundaries and evidence hashes. Do not copy the catalogue or use Browse's consumed dirty queue as a history feed.
3. On the existing Supabase project, read only the changed identities from current governed projections. Check source revision and retail disposition before and inside each transaction. Process at most six identities per transaction and 20 batches per invocation, with the existing pacing, monitoring, shared gate and append-only receipts. Unchanged hashes cause no index rewrite. A confirmed withdrawal removes only that derived advisory row.
4. Read back exact IDs, hashes, removals, grants and checkpoint after each invocation. Resolve an ambiguous commit by readback before any retry. Finish only when the sealed manifest, final source revision and indexed receipt set reconcile. Report changed, added, withdrawn, unchanged and unresolved counts separately.
5. Re-run the six bounded search checks and relevant consultation cases after factual or classification changes. Keep the live retail catalogue as the only purchase-eligibility authority. Record migration version, job ID, backup, resource data, errors and rollback receipt.

The existing `knowledge-update-source.mjs`, `knowledge-update-worker.mjs` and `knowledge-update.review.sql` provide locally tested bounded mechanisms. They are not a complete hosted change feed. Activation requires source coverage, protected migration and backup review, trusted operator transport, monitoring, recovery and an explicit scheduling approval. A monthly schedule must never turn into an automatic full rebuild.

## Urgent withdrawal or factual correction

An operator first verifies the exact identity and authoritative source change. Current retail eligibility governs shopping immediately; an advisory knowledge match is never a purchase offer. If Jane could still give materially wrong advice before the derived index can be corrected, disable Jane's public knowledge search or the public adviser through its release kill switch. Prepare a signed exact-ID change manifest, re-read current safe facts and disposition, run one monitored six-or-fewer-ID update or removal, then read back the indexed hash and a relevant search result. Resume only after review. Never invent a withdrawal from a missing optional HTTP response, edit Fabric Master through Jane, or roll back later valid facts using an older receipt.

No urgent-correction override, scheduler or hosted update connection is active. Until those controls pass review, the reliable emergency response is to stop affected advice and keep purchase decisions with the governed retail journey.
