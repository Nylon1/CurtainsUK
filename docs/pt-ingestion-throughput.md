# PT ingestion throughput

Use the existing governed Fabric Master, media, supplier-price approval, Webtex,
Fabric Intelligence, Knowledge cache and Browse pipeline. This change adds no
schema, pricing policy, inference model, prompt, approval policy or infrastructure.

## Run one prepared batch

1. Reconcile the exact supplier SKUs against current Fabric Masters. Keep Novelty,
   PT Contract and ambiguous source matches out of the release manifest. Keep clean
   records moving; do not infer manufacturer facts or stock for exceptions.
2. Prepare manufacturer facts and approved official media through the existing
   importers. Keep the existing image importer concurrency and content-hash reuse.
   Import cut prices only through the governed supplier-price approval audit.
   Workbook Price/RRP are not commercial authority.
3. Include the newly created, hidden Masters in the existing automated Webtex
   refresh. Run that process once for the completed cohort, then prove numeric
   current observations for every release SKU. Handle genuine supplier absences
   as exceptions; do not add another stock process or per-fabric refresh.
4. Keep the existing Browse cron from competing with the ingestion write window,
   using the existing guarded pause/restore procedure. Persist a restore-required
   marker before the pause. Restore it on failure/exit as well as success. Do not
   pause Webtex stock scheduling. Keep hidden records hidden until their gates
   pass.
5. Send one exact cohort of up to 500 IDs through the existing visual workflow.
   The prepared-cohort reader chunks database requests internally at 100 IDs or
   hashes. It retains exact identity/media gates without loading unrelated global
   catalogue scopes. Set the existing workflow's `design_concurrency` input to
   `3`, or use `--design-concurrency=3` on its CLI, for a bounded throughput run;
   omission remains sequential. The model, prompt, resolver, approval states,
   persisted lineage reuse and duplicate protection remain unchanged. Database
   persistence is serialized. A systemic failure stops further groups.
6. After enrichment for the whole release manifest, run **one** existing guarded
   release transaction: exact identity, approved image, approved governed price,
   fresh stock, governed Knowledge, then `browse_projection_refresh_dirty(500)`.
   Require every release ID in the Knowledge read cache and active Browse
   generation before commit. The existing refresh performs a full rebuild when
   the Knowledge dirty flag requires it. Do not call it once per fabric or after
   every internal 100-record read chunk. Restore the normal Browse schedule.
7. Verify the exact released cohort once on the public site. The bounded verifier
   retains the established identity, image, price, stock, manufacturer and visual
   intelligence checks:

   ```sh
   node scripts/curtainsuk-verify-pt-live.mjs --directory=/private/batch --count=500 --concurrency=3
   ```

   The directory must contain the reconciled `manifest.json` and governed
   `pdf-price-coverage.json`. The verifier allows at most three concurrent
   requests and spaces starts by at least 650 ms, including retries. Use `--resume`
   after interruption: only passing checks with the same manifest/price coverage
   fingerprint are reused. Changed inputs fail closed. HTML/transport failures
   are retried; a failed record does not prevent checking the other clean records.
   Private manifests, credentials and resulting evidence stay outside Git.

## Measure the next run

Keep one run ID and exact manifest fingerprint throughout. Record start/end times
for source preparation, image processing, governed approval and Webtex runs. The
visual runner reports inference, database read/write and retry timing; summed
request durations under concurrency are service time, not wall-clock elapsed.
The public verifier reports wall time, requests/retries, resumed checks and maximum
active requests. Treat historical Knowledge-cache/Browse timings as combined when
the existing refresh did not emit a separate split.

Poll an active GitHub run at most once per minute. After a terminal result,
download its artifact once and perform one exact-cohort ledger check. Respect
`Retry-After`/quota-reset timestamps; do not repeatedly query an exhausted API or
dispatch competing pending runs in the existing workflow concurrency group.

## Validation

```sh
node --test scripts/__tests__/pt-live-verification-core.test.mjs
npx --no-install tsx --test lib/fabric-master/__tests__/visual-enrichment-throughput.test.ts
```

Before the next paid inference batch, prove its 500-record prepared plan with the
existing plan-only mode. A plan proof and a small public verification smoke test
do not replace a measured end-to-end throughput result for the next live batch.
