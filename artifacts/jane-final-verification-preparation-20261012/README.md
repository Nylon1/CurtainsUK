# Final population verification preparation

Local development only, 12 October 2026. Hosted population was still in progress at preparation. The active operator, journal, manifest, pacing, source queries, limits and permissions were not changed.

`lib/advisory/population-verification.mjs` verifies a complete local journal baseline against an independent fresh hosted readback. It requires the exact manifest, ordered identity/hash rows, complete/exhausted job and cursor, zero failures, all receipt/current hashes, preserved historical records, expected no-ops/outside-manifest history and restored permissions. The 11,517-identity boundary is 1,920 batches, with three records in the final batch.

The verifier contains no SQL, network call, write or active-runner integration. Completion of this check proves population only. Source-change reconciliation, recommendation tests and human launch review remain separate gates.

## Tests

```text
node --test --test-concurrency=1 lib/advisory/__tests__/population-verification.test.mjs lib/advisory/__tests__/population-baseline.test.mjs lib/advisory/__tests__/post-population-review.test.mjs
```

12 passed, zero failed, 863.6638ms. Four new tests cover the final three-record batch, refusal of incomplete or stale/future evidence, identity/hash tampering, historical/permission drift and input immutability. Eight existing baseline and recommendation tests also passed. These tests used synthetic local data and made no hosted writes or paid API calls.

## Final readback procedure

After the existing operator reports completion, confirm that no pending journal plan or active writer remains. Prepare the complete frozen journal baseline. Use the existing bounded read-only whole-job query against the approved connector/project and compare its result immediately, within60seconds. Do not substitute count-only evidence for the identity/content digest comparison. Verify all active implementation and binding checksums and preserve the resulting report before starting separately reviewed catch-up.

If any count, hash, permission, history or freshness check fails, record the mismatch and investigate read-only. Never rerun population, blindly replay a transaction, erase receipts or declare completion to bypass that failure.

## Exact preparation scope

- `lib/advisory/population-verification.mjs`
- `lib/advisory/__tests__/population-verification.test.mjs`
- `docs/specialist-advisory/JANE_AUTOMATIC_UPDATES.md`
- This evidence file.

No migration, scheduler, source hook, deployment, public activation or protected merge.
