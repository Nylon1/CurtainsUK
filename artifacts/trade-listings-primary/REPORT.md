# SDG trade catalogue as the primary colourway source

8 September 2026 · `feature/curtainsuk-phase-5a-prelaunch`

**260 new genuine colourway images uploaded and activated across all six SDG brands.** CurtainsUK now has **785 browsable fabrics**, comprising 258 Prestigious and 527 SDG. Dawn remains unpublished. No storefront architecture or deployment was added.

## Governing workflow applied

SDG discovery now starts with authenticated exact-SKU search and fabric/collection listings. Each card's full SKU, brand, design, colour and fabric identity must reconcile before importing its image. Product pages supply higher-quality media or resolve identity details when needed. Filecamp and digital books are optional sources for additional room/lifestyle/design imagery and cannot block a verified colourway import.

The existing importer downloads, strips metadata, hashes, deduplicates, uploads to Shopify Files and links the canonical Fabric Master record. Customers receive Shopify CDN copies, never permanent supplier hotlinks. Explicit Live labels are retained in the evidence. Unknown lifecycle remains browseable; known discontinued records remain hidden. Current cut prices and quantity-specific stock remain separate purchase checks.

## Results

| Brand | New images uploaded | Now browsable | Total Master fabrics |
| --- | ---: | ---: | ---: |
| Clarke & Clarke | 100 | 361 | 3,302 |
| Harlequin | 50 | 52 | 2,428 |
| Morris & Co. | 29 | 30 | 830 |
| Sanderson | 33 | 35 | 1,762 |
| Scion | 46 | 47 | 464 |
| Zoffany | 2 | 2 | 894 |
| Prestigious Textiles | 0 | 258 | 258 |
| **Total** | **260** | **785** | **9,938** |

- 261 approved selected mappings: 260 new files and one existing Morris image reused.
- 260 unique new hashes; no duplicate content or accepted mismatches in this pass.
- Resume verification skipped all 261 mappings with zero downloads, uploads or new mappings.
- Every new image is 1366 × 1366. Full hashes, Shopify file IDs, CDN URLs and source references are in `media-results.json`.
- Imports ran as a 50-record canary, a resumable 205-record upload batch and a five-record reconciled tail. The 206-mapping middle input included the one reused image.
- No ROOM images were imported. Additional product-gallery images were not assumed to belong to the exact colourway merely because they appeared on its page.
- 35 known discontinued records remain hidden. 9,153 records remain unmapped, including those 35; 9,118 are otherwise eligible. **Confirmed genuinely missing imagery: zero.**
- Price-ready: 251. Order-ready: 0. All 261 selected fabrics remain price-blocked and sample availability is unconfirmed. No commercial data or approved price snapshot was changed.

## Identity reconciliation

HIOV, MWAR, DSTR, NSCD and F0753 supplied bounded candidate sets. Complete SKU and identity checks were applied to each candidate; prefix searches were not treated as matches by themselves. Non-fabric entries were excluded.

Five Morris colour differences were possessive punctuation/slash spacing. Scion listing names omit Print/Weave/Embroidery suffixes for a bounded set of verified designs. These display differences do not rename canonical designs or permit fuzzy matching.

Three initially held colour differences were resolved with exact product pages:

| SKU | Original Master colour | Supplier evidence | Resolution |
| --- | --- | --- | --- |
| NSCD134678 | Moss | Falling Foss Weave, Dawn, Live, same exact SKU/image | Guarded correction to Dawn |
| F0753/19 | Agean | Alvar Aegean, Live, same exact SKU/image | Guarded correction to Aegean |
| NSCD134679 | Seaglass | Listing says Seaglas; exact product page says Seaglass | Canonical colour retained; product-page image approved |

The two corrections preserve original observations and before-values, check the expected row revision/source date and write only colour plus update timestamp. They do not alter supplier prices, stock, configuration snapshots or order history. Current-batch unresolved identities: zero. The two historical wrong-colourway candidates DARP222519 and EAZU132713 remain withheld.

Zoffany's tested exact searches did not return products, but its brand-product cards supplied two explicit identifier relationships: ZOF0223-02 links to the ZINF322785 image and Artisan Palampore Chintz identity; ZOF0236-04 links to ZINF322800 and Sanganeri Block Print Indigo/Madder. Exact legacy SKU in the image filename, brand/design/colour and existing fabric identity agree. The image files were visually reviewed. Wallpaper cards were excluded. These are two individually evidenced relationships, not an inferred conversion formula. Their lifecycle remains UNKNOWN, and they are browsable. See `zoffany-identity-evidence.json`.

## QA

The final public audit checked all 785 records over 33 pages, with at most 24 records and 56,212 bytes per response. Search and colour/pattern/brand/collection filters passed semantic checks. All selected records have descriptions, approved Shopify images, noindex and blocked pricing. No supplier-commercial or credential fields were found.

Median public response: browse **661 ms**, search **689 ms**, detail **516 ms**; tested filters ranged from 652–714 ms. The first 50-record Harlequin canary passed before expansion. No new 1,000-record benchmark is claimed in this pass; the earlier local fixture test remains separately documented.

Desktop and mobile Harlequin detail checks confirmed loaded images, no horizontal overflow, preserved exact-fabric/Bay handoff, disabled unconfirmed samples and no file-upload input. Morris shows 30 fabrics over two pages; Zoffany shows two real colourways. Screenshots were captured and visually reviewed in the browser tool but not exported as files. Mobile used a 390 × 844 CSS viewport on the desktop network; it was not a physical-handset test. Viewport settings were restored.

All 40 Fabric Master tests passed, including source safety, exact identity, resumability and optional-library independence. Lint and TypeScript checks passed. The UNKNOWN-lifecycle reconciliation path was also exercised successfully against both Zoffany records. Secret/provenance scan results accompany this report.

## Remaining work

Continue bounded trade-catalogue mapping for the remaining 9,118 eligible records. One F0753 colourway was outside this selected batch. Zoffany needs more explicit new/legacy identifier relationships; failed searches remain recorded as unresolved, not missing imagery. Filecamp and digital books remain optional additional-media work only. Purchase-specific price/stock checks and sample availability remain separate from browsing.

Minimal, live payments, Merchant Center and supplier ordering were not changed.

[Unpublished Dawn](https://www.curtainsuk.com/pages/fabric-library?preview_theme_id=182264234363) · [Morris catalogue](https://www.curtainsuk.com/pages/fabric-library?preview_theme_id=182264234363&brand=Morris+%26+Co.) · [Zoffany catalogue](https://www.curtainsuk.com/pages/fabric-library?preview_theme_id=182264234363&brand=Zoffany)
