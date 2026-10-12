# Disabled incremental update preparation

12 October2026. Starting PR169 head `29f474aaaf07b7d81c806e360d9bed64d89ca938`; independently observed protected production `5f8186818b52f48a3bfa17ee80a1c06a8a3d1315`. No reset/rebase/merge/deployment. Same Jane branch and draft PR169.

Exact changed files for this milestone:

- `lib/advisory/knowledge-update-source.mjs`
- `lib/advisory/knowledge-update-worker.mjs`
- `lib/advisory/knowledge-update.review.sql`
- `lib/advisory/post-population-review.mjs`
- `lib/advisory/__tests__/knowledge-update.test.mjs`
- `lib/advisory/__tests__/post-population-review.test.mjs`
- `docs/specialist-advisory/JANE_AUTOMATIC_UPDATES.md`
- `docs/specialist-advisory/JANE_OVERNIGHT_RUN.md`
- `docs/CURTAINSUK_SPECIALIST_AI_ADVISORY_PLATFORM.md`
- This directory's README, file-manifest and synthetic index-performance evidence.

The local worker is disabled by default, not connected to an API/scheduler and cannot register against an unfinished population. It reuses the existing search projection and shared six-record worker limits; it does not alter the running population implementation. There are two exact-key readers for existing change records. Complete automatic discovery and all source dependency/withdrawal paths still require verified publication-window ports. [Full review and gaps](../../docs/specialist-advisory/JANE_AUTOMATIC_UPDATES.md).

**35 tests passed, zero failed**, including20 new tests and existing descriptive relevance/search, transactional indexing, evaluation receipts, scope/freshness/latency policy and population admission tests. Command:

```text
ADVISORY_EVIDENCE_DIR=artifacts/jane-automatic-updates-20261012
node --test --test-concurrency=1 --test-reporter=tap lib/advisory/__tests__/knowledge-update.test.mjs lib/advisory/__tests__/post-population-review.test.mjs lib/advisory/__tests__/knowledge-integration.test.mjs lib/advisory/__tests__/knowledge-search.test.mjs lib/advisory/__tests__/index-worker.test.mjs lib/advisory/__tests__/eligible-limit-policy.test.mjs lib/advisory/__tests__/population-readiness.test.mjs lib/advisory/__tests__/evaluation.test.mjs
```

Recorded duration21.172seconds. PGlite uses synthetic records; `index-performance.json` measures that local fixture, not hosted coverage or performance. Existing historical evidence was not overwritten. Production source/commerce, supplier refreshes, Naila, Fabric Intelligence, visualiser and Shopify files were not changed. No OpenAI calls or charges.

Population checkpoint6750 was independently verified18:30:39UTC using the existing SQL connector. The prior6642 write failure was resolved with two independent post-expiry observations at18:17:21/18:17:28 and the existing fsynced journal resolver. Private readbacks remain outside Git under `.codex/tmp/jane-6642-*` and `jane-checkpoint6750-reconciliation.json`; no credentials are included. The unchanged live journal and operator files remain outside Git.

Automatic update SQL is a two-table review artifact only. No hosted update migration, automatic refresh schedule or reconciliation population has run. Actual full-population recommendation tests remain gated until completion and complete catch-up. The20-scenario real-model suite is reused; fresh paid evaluation approval and human interior-design review are still required.
