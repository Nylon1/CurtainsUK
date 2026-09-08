# Phase 5K — SDG media scale-out

Branch: `feature/curtainsuk-phase-5a-prelaunch`. Working theme: unpublished Dawn `182264234363` on `carpetup.myshopify.com`. Minimal `79650455661` remains live and unchanged. No theme deployment, payment change, Merchant Center action, supplier order or commercial-price update was made.

The catalogue increased from 785 to **6,328 browsable fabrics**. Three controlled batches imported **1,000 + 2,500 + 2,043 = 5,543** new exact-colourway images. All three manifests pass SKU/brand/fabric-type, source-filename, Shopify-reference, resolution and local-byte SHA-256 validation. No mismatched image was accepted. Shopify hosts every customer-facing image.

The entire requested 9,153-record remainder is **BLOCKED** by supplier identity/source coverage, not by an outstanding deterministic upload queue. The final reconciliation of 8,352 captured portal SKUs found **zero pending verified import jobs**. Unmapped does not mean image-missing.

## Final brand accounting

| Brand | Master | Exact listing observed | Image-ready / browsable | New uploads | Discontinued hidden | Identity candidates withheld | Still unmapped |
|---|---:|---:|---:|---:|---:|---:|---:|
| Prestigious Textiles | 258 | Not revisited | 258 | 0 | 0 | 0 | 0 |
| Sanderson | 1,762 | 1,222 | 1,187 | 1,152 | 39 | 29 | 575 |
| Morris & Co. | 830 | 670 | 639 | 609 | 6 | 25 | 191 |
| Harlequin | 2,428 | 1,967 | 1,479 | 1,427 | 432 | 56 | 949 |
| Zoffany | 894 | 0 | 2 | 0 | 0 | 0 | 892 |
| Scion | 464 | 348 | 227 | 180 | 118 | 3 | 237 |
| Clarke & Clarke | 3,302 | 2,855 | 2,536 | 2,175 | 330 | 82 | 766 |
| Total | 9,938 | 7,062 | 6,328 | 5,543 | 925 | 195 | 3,610 |

“Exact listing observed” counts master SKUs found in captured listings, including discontinued and withheld records. It does not claim every other SKU was individually searched. Still-unmapped includes the 925 discontinued records; **2,685 non-discontinued records remain unresolved**. Identity candidates are withheld for review, not declared proven wrong-image associations.

The 5,543 new mappings have 5,543 distinct hashes: **zero duplicate-content uploads were necessary**. Existing hash/source caches remain in use. Resume runs skipped 998 completed jobs in batch 1, 2,500 in batch 2, and 2,041 in the batch 3 retry; a final batch 3 replay skipped all 2,043. Retries reused cached source bytes. No new ROOM/DETAIL mappings were accepted; inspected detail-page galleries used the same original colourway asset. Images are normally 1,366 × 1,366, not the small rendered listing thumbnails.

Batch and brand figures, including every batch’s brand allocation, are in [batch-and-brand-totals.json](batch-and-brand-totals.json). Canonical totals are in [scale-report.json](scale-report.json).

## Readiness and customer journeys

Browsing remains independent of PRICE_READY and ORDER_READY. The existing public projection supplies factual descriptions and its governed taxonomy; unknown attributes are not invented. Description presence is not a claim that every new description received individual editorial review. Current pricing remains unchanged; the final public audit records exact description, price-ready and order-ready totals.

Desktop/mobile QA at 1,000, 2,500, 5,000 and 6,328 covered paginated cards, brand/keyword/colour filtering, genuine images, detail pages, retained sample intent and canonical fabric/window handoff. Bay context and saved measurements survive the handoff. Selecting an unverified Harlequin fabric returns “This fabric price must be confirmed before it can be configured”; it does not produce a £0 or checkout-capable price. Unknown sample availability stays disabled. No customer upload is required; the existing specialist flow instructs customers to email evidence with a project reference.

The final desktop DOM has 24 cards, six initially loaded images and 18 deferred images. Mobile CSS viewport 390 × 844 has document width 378, with no horizontal overflow. Actual browser heap memory was not instrumented; bounded DOM and repeated navigation provide the observed stability evidence.

Screenshots are in [screenshots](screenshots/), with individual QA records in `browser-qa-*.json`. Example final pages are Aikyo Forest (`sdg-njap132735`, Scion) and Abella Powder Blue (`sdg-hwhi131564`, Harlequin), both reached within the unpublished Dawn preview.

## Exact remaining blockers

1. **Zoffany: 892 unmapped.** The authorised account opens brand/collection landing pages but returns no Zoffany product results in fabric, collection, bestsellers, legacy/current SKU and exact-design searches. The two existing approved mappings are retained. Confirming the account’s Zoffany product access or an alternate authorised catalogue route is required.
2. **195 exact-SKU identity conflicts.** Current portal title/colour and workbook identity disagree beyond safe formatting normalization. These are enumerated in [exceptions.json](exceptions.json). No fuzzy or visual-similarity mapping is accepted.
3. **2,490 non-discontinued records without an accepted exact-SKU listing match**, including Zoffany. Some may be legacy/replacement codes or absent from this account’s catalogue. There are 124 exact-name candidates with a different SKU, held until the supplier code relationship is established; name equality alone does not authorize substitution.
4. **Portal count boundaries:** Clarke & Clarke yielded 4,117 of a 4,120 facet count; repeated Morris listing/status pagination yielded 678 of 689. These 14 count gaps remain unresolved and are not evidence that images do not exist.

No record has been classified as genuinely image-missing. Filecamp and digital books were not made prerequisites for exact listing images. They remain optional routes for additional room/design media and unresolved identities.

## Operational changes and validation

The existing importer now accepts up to 2,500 records with at most eight workers. Per-source/hash locks prevent duplicate uploads; checkpoint writes remain serialized and atomic. Workers settle before releasing the import lock. Database association runs at up to four distinct fabrics concurrently, preserving sequential updates within a fabric and existing revision guards.

Two temporary Shopify errors in the last batch recovered on retry. Two large runs also encountered checkpoint completion errors; the last exposed Windows `EPERM`. Completed mappings survived and complete replay checks passed. A bounded retry now handles transient `EPERM`/`EBUSY`/`EACCES` atomic rename contention, without replaying uploads or hiding other filesystem errors. The underlying process holding the file was not established.

Identity normalization is restricted to evidenced display formatting and explicit design aliases, with exact SKU, brand, complete colour and image filename guards. Eighty-five previously non-browsable records received guarded colour corrections using exact-SKU supplier evidence; before-values and revisions are retained in `colour-corrections/`. Explicit discontinued lifecycle updates require unique SKU and brand evidence, preserve before-values, and never approve imagery or change commercial history.

Validation: **47 fabric-master tests pass; TypeScript passes.** Full public pagination is checked for duplicate IDs, 24-record limits, Shopify-only image URLs, noindex, description presence, filter semantics and commercial/credential field leakage. Final secret-scan results are in [secret-scan.json](secret-scan.json). Supplier observations contain allowlisted catalogue fields only; passwords, cookies, tokens and authentication headers are not recorded. Download caches and runtime checkpoints remain in the existing ignored local directories; canonical image associations are also persisted in Fabric Master.

## Resume the existing pipeline

Do not overwrite a started batch manifest. Capture additional exact-SKU listing evidence through the authorised browser, save only the approved observation fields, then prepare a new batch:

```text
python scripts/curtainsuk-prepare-sdg-scale-batch.py --batch=batch-004 --batch-size=2500
node node_modules/tsx/dist/cli.mjs scripts/curtainsuk-import-supplier-media.ts --source-file=artifacts/phase5k/batch-004/approved-manifest.json --batch-size=2500 --concurrency=8 --upload --confirm-store=carpetup.myshopify.com
```

Use `--retry-failures --concurrency=1` for isolated failures after the active process releases its lock. Validate the immutable manifest with `curtainsuk-audit-media-batch.py`, then associate only completed fabric IDs through `curtainsuk-apply-media-mappings.ts`, at most 250 IDs per call. Keep unpublished Dawn and the existing commercial gates.

## Performance and final status

Public end-to-end HTTP medians, including the Shopify proxy/network path; three timing samples per operation. These measurements do not isolate database time or frontend rendering.

| Browsable | Browse | Search | Detail | Brand / colour / pattern / collection | Maximum page payload |
|---|---:|---:|---:|---|---:|
| 1,000 | 0.83s | 0.73s | 0.48s | 0.88s / 0.70s / 0.70s / 0.68s | 56,479 bytes |
| 2,500 | 0.76s | 0.77s | 0.51s | 0.78s / 0.73s / 0.83s / 0.75s | 58,038 bytes |
| 5,000 | 0.95s | 1.03s | 0.60s | 0.92s / 0.87s / 0.93s / 0.92s | 59,258 bytes |
| 6,328 | 1.12s | 1.44s | 0.84s | 1.10s / 1.43s / 1.00s / 1.23s | 59,780 bytes |

All milestones retain 24 records per response. The final audit traversed all 264 pages, verified unique IDs and Shopify-only images/descriptions/noindex for every public record, and found zero commercial or credential leaks. The 4,285-record intermediate run had larger timing outliers during bulk activity; the final idle run above is the relevant end-state measurement. No persistent pagination-depth or frontend payload bottleneck was established, so no storefront architecture was changed.

Final totals: **6,328 browsable, 6,328 image-ready, 6,328 description-ready, 251 price-ready, 0 order-ready**. All 2,043 records in the final batch remain price-blocked. Sample availability is unconfirmed for the newly audited SDG batch.

- PASS — all deterministic media batches, content/identity validation, resumability, final catalogue pagination/filter/privacy checks, desktop/mobile journeys, tests and typecheck.
- BLOCKED — full SDG coverage, pending the specific source/access and identity blockers listed above.
- OWNER DECISION REQUIRED — only if a different authorised Zoffany account/access entitlement is needed; no paid service or production enablement was requested or performed.
