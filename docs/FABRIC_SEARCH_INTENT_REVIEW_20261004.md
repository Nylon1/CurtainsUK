# Fabric Search Intent and Merchant reconciliation — 4 October 2026

This is a read-only review of the proposed governed copy and the existing
Merchant file source. The 50-record side-by-side artifact is
`generated/fabric-search-intent-review-50.json`; the complete reconciliation
is `generated/fabric-search-intent-reconciliation.json`.

## Existing source path

Merchant source `10741855241` is a **manual file source** named
`merchant-pilot-49.tsv` in account `5857534330`. The product title,
description, brand, colour, canonical landing link, image, availability and
£2.50 price are file attributes. The first inspected product had empty
material, pattern and product-type attributes. Merchant is not deriving that
file's copy from the Shopify Fabric Profile metaobject or its JSON-LD.
An independent “Found by Google” source exists; it is outside this file
reconciliation and is not to be replaced or expanded.

The Merchant export supplied on 4 October 2026 has SHA-256
`632ce90ddbc9f2896afe8cb067b1ddce0f5b7e257693935b9ec7217a49d42a44`.
It contains exactly 10,208 unique `cuk-sample:<fabric_id>` rows, all of which
map to the live Shopify Fabric Profile manifest. The live Shopify read-back
confirmed 11,517 unique IDs and canonical URLs.

| Measure | Before | Proposed full feed |
| --- | ---: | ---: |
| Live Fabric Profiles | 11,517 | 11,517 |
| Merchant file rows | 10,208 | 11,514 |
| Profile IDs absent from Merchant | 1,309 | 0 among eligible IDs |
| Merchant items without a profile | 0 | 0 |
| Duplicate title rows | 22 across 11 pairs | 0 |
| Duplicate description rows | 10 across 5 pairs | 0 |
| Legacy negative-description template rows | 10,208 | 0 |

The old descriptions vary mainly in the fabric identity in their first
sentence. All 10,208 contain the same tail that says the item is “not fabric
by the metre or made-to-measure curtains.” The proposed copy presents the
£2.50 physical sample accurately and describes the made-to-measure curtain
route on the same canonical page. The 11,517 generated titles and 11,517
generated descriptions are individually unique in the full dry run.

Three existing Merchant IDs do not currently have a `sample_current=true`
Browse projection: `sdg-dfab223968`, `sdg-dhif227331`, and
`sdg-dmlf236829`. Their Fabric Master lifecycle is `UNKNOWN` and
`sample_available` is null. They remain live Fabric Profiles but should not
carry an “in stock” sample offer in the new Merchant file. The target equation
is **11,517 Fabric Profiles = 11,514 Merchant items + 3 documented exclusions**.

## Evidence rules

- Exact colourway, brand, composition, widths, repeats, pattern match and
  suitable use come from Fabric Master or approved supplier facts. An
  appearance such as `linen-look` never becomes a linen composition claim.
- Colour family, pattern, motif, texture, finish, activity, presence and
  character come from governed Fabric Intelligence. Unknown values are
  omitted.
- Validated retail room and style assignments take precedence. Otherwise,
  limited editorial room and style guidance is derived deterministically
  from governed FI. It is phrased as interior guidance.
- The Fabric Master decision-engine projection permits pencil pleat, wave,
  double pinch pleat and blackout/thermal lining options. The standard-window
  business rules support them, while the customer configurator narrows
  headings by window and fixing. Copy qualifies these as configurable options;
  blackout and thermal are never intrinsic face-fabric properties.
- `search_title`, `search_description`, `search_intro`, SEO metadata,
  Merchant attributes and Product JSON-LD are projections of one
  `FabricSearchIntent` object. Identity, canonical URL, sample SKU and
  £2.50 sample price remain fixed.

## Search Console calibration

The Search Console Performance report for `sc-domain:curtainsuk.com` was
read on 4 October 2026 using the three-month window then ending
29 September. Query families used to calibrate vocabulary include:

| Query family | Examples and impressions | Vocabulary decision |
| --- | --- | --- |
| Curtain intent | “made to measure curtains” 1,871; “made to measure curtains near me” 1,553 | Lead with made-to-measure curtain relevance while retaining the sample offer. |
| Colour and velvet | “grey velvet curtains” 639; “green velvet curtains” 477; “navy velvet curtains” 218 | Stronger colour language; use velvet only when verified, not inferred from visual sheen. |
| Headings | “wave pleat curtains” 580; “pinch pleat curtains” 541 | Describe configurable headings with compatibility qualification. |
| Rooms | “living room curtains” 218 | Use explicit rooms first, otherwise governed FI-based editorial guidance. |

These queries calibrate vocabulary; they do not grant evidence for any
particular fabric. Local-service, hotel, children’s, sheer and specialist
terms were not applied indiscriminately to Fabric Profiles.

## Publication gates

The current review is read-only. Before mass publication, verify the
Shopify definition extension, all 11,517 profile identity/canonical links,
the 50-row copy review, title/description uniqueness, the three Merchant
exclusions, a mixed new/existing Shopify and Merchant canary, and live
read-back from Merchant source `10741855241`. A prepared TSV or Shopify
mutation response alone does not establish that Google received the copy.
