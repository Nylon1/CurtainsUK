# Fabric Search Intent and Merchant publication — production Source of Truth

Updated 4 October 2026. This records the governed search-intent publication through
PRs #120 and #121 and the subsequent live Shopify and Google Merchant read-back.
The pre-publication review and 50-fabric comparison remain in
`FABRIC_SEARCH_INTENT_REVIEW_20261004.md` and
`generated/fabric-search-intent-review-50.json`.

## Production authority and scope

- Protected branch: `release/production`. PR #120 introduced the single
  `FabricSearchIntent` projection, publisher, tests and shared Shopify text/SEO/JSON-LD
  rendering. PR #121 corrected Google Merchant `product_detail` TSV quoting.
- Merchant account: `5857534330`; existing manual file source:
  `10741855241` (`merchant-pilot-49.tsv`). No new Merchant source was created.
- No image inference, Fabric Master identity rewrite, canonical URL change,
  Supabase migration, Browse rebuild or Vercel runtime code deployment occurred.

## Exact profile and offer reconciliation

| Measure | Verified count |
| --- | ---: |
| Live Shopify Fabric Profiles | 11,517 |
| Unique Fabric Master IDs | 11,517 |
| Unique canonical URLs | 11,517 |
| Search-intent profile updates applied and read back in canary | 6 / 6 |
| Remaining search-intent profile updates applied and read back | 11,511 / 11,511 |
| Total search-intent profiles verified | 11,517 / 11,517 |
| Profile read-back mismatches | 0 |

The publisher checked exact Fabric Master identity, unchanged canonical URL,
the £2.50 sample offer, all new search-intent fields and revision after each
bounded batch. It did not reread completed batches. The publisher proof files
are `shopify-canary-proof.json` and `shopify-full-proof.json` in the local
`curtainsuk-search-intent-evidence` directory. The full run selected 11,517
unique IDs and wrote/read back 11,511 records after the six canaries.

The committed profile manifest has 11,517 unique IDs and 11,517 unique
canonicals; SHA-256:
`fff2a2fd341f6f847e620997e30a25e8037433cd4bff30945db21ec7860ee42b`.
The live dedicated fabric sitemap was separately read back at 11,517 URLs,
with the same canonical set and no duplicates.

## Merchant source reconciliation

The 4 October pre-update Merchant export had 10,208 distinct source IDs.
It contained 11 duplicate-title groups (22 rows), five duplicate-description
groups (10 rows), and the same negative sample-only tail in all 10,208
descriptions. That tail said the item was not made-to-measure curtains.

The full replacement file has SHA-256
`c4a841e4a2a6d5605eec4f9355a67040755bff44f8c097dd174a22baac6f8b33`.
Local validation found 11,514 distinct IDs, 11,514 distinct titles,
11,514 distinct descriptions, zero identity/canonical/£2.50 price mismatches
against the manifest, and zero occurrences of the legacy negative claim.
Google Merchant accepted all 11,514 rows, recognized every attribute,
reported no file issues, and reported 1,306 products added after the
three-new-product canary. Its existing source and source-filtered product
list both read back at **11,514 live products**. The source ID remained
`10741855241`.

The exact estate equation is:

**11,517 Fabric Profiles = 11,514 Merchant file items + 3 documented exclusions.**

The exclusions are `sdg-dfab223968`, `sdg-dhif227331` and
`sdg-dmlf236829`. Their current Browse projection has
`sample_current=false`; they were removed from the Merchant sample file
rather than advertised with an unsupported in-stock sample offer.

The live Merchant item screens were read back for both an existing item and
a newly added item. They display distinct fabric-specific curtain-intent
titles and descriptions, governed colour/material/pattern, the exact
`/pages/fabric/...` canonical landing URL, `cuk-sample:<fabric_id>` ID and
£2.50 offer. The one item labelled as edited in Merchant also read back with
the new copy. Newly added items may remain under Google's policy review and
image processing. A full post-update Merchant product export is still needed
to independently compare every live item ID/title/description with the
11,514-row file; browser download was blocked during this read-back. The
source's exact processed count and sampled item screens do not substitute
for that item-by-item export proof.

An independent 25-item “Found by Google” inventory appears in the overall
Merchant account dashboard. It is separate from source `10741855241` and is
not included in the 11,514-item source reconciliation.

## Other production layers

- Browse prepared: 11,815; dirty: 0; global dirty: false;
  `knowledge_cache_dirty=false`. No Browse rebuild was run.
- Fabric Intelligence: 1,070 `COMPLETE`, 10,744 `PARTIAL_GOVERNED`,
  one `PENDING_EXTERNAL_RETRY`; total 11,815. FI data was unchanged by
  this search-intent release.
- Existing Vercel production deployment `dpl_B95pkAWrS8UFEVnkrmSFTBmTGDV5`
  remains `READY` with the production alias and no alias error. No runtime
  code changed in PRs #120 or #121. No runtime errors were found in the
  checked final 20-minute window.
- Google approval, under-review and disapproval counts are asynchronous and
  must be reported as timestamped Merchant snapshots, not treated as a
  fixed publication count.

## Verification boundary

Shopify profile publication and bounded read-back finished with zero
mismatches. Merchant file acceptance, source count, representative old/new
product details and the three-exclusion equation were read back. Full live
Merchant ID/title/description uniqueness remains pending a fresh product
export from source `10741855241`.
