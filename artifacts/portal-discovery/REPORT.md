# Supplier portal discovery and controlled media activation

Date: 8 September 2026. Branch: `feature/curtainsuk-phase-5a-prelaunch`.

260 new exact-colourway SDG images were uploaded through the existing Shopify Files importer and linked to their canonical Fabric Master records. The unpublished catalogue now contains 525 browsable fabrics: 258 Prestigious and 267 SDG. No theme or runtime deployment was needed.

## Portal access and reusable rules

Prestigious Webtex and its SharePoint media library were accessible. SDG trade was authenticated. Filecamp still presents a separate login with no available saved sign-in. All three requested areas are therefore **not** authenticated.

Webtex Collection Enquiry exposes 384 collections, including non-fabric ranges. Formation contains 32 colourways across seven designs. Product links carry stable supplier codes; the product modal exposes the exact code and full-size image. Dali Mocha 4270/147 was observed at 1400 × 1400. Each actual image URL must be observed; paths must not be manufactured from another colourway.

Prestigious SharePoint is organised as Lifestyle Imagery → Images → 22 seasonal/contract folders → collection → JPEG. Twelve MINIMALIST collection JPEGs were observed. Their filenames establish collection context only, so none was assigned as an exact colourway or design-level ROOM image. Folder navigation can lag and requires checking the resulting named grid.

SDG product-listing cards provide a repeatable association between displayed SKU, brand, design/colour title, fabric type, status and image. CCF, F179, F180 and F181 searches supplied bounded candidate sets. Exact displayed identity drives mapping even where a product slug contains a different legacy identifier. Ten Print/Weave display aliases were reconciled with exact SKU, brand and colour safeguards. Two February workbook colours were corrected from current exact-SKU portal evidence: F1803/01 Sotano → Camel, and F1805/02 Zocalo Rust → Denim/Rust. Original observations and before-values are retained.

Digital-book folders were inspected for all six brands: Clarke & Clarke 19, Harlequin 25, Morris & Co. 17, Sanderson 19, Scion 15 and Zoffany 13, totalling 108 PDF entries. Some books concern wallpaper or other products. PDF preview access was blocked by browser security; contents and captions were not inspected and no workaround was attempted.

Reusable ordered discovery rules are in `lib/fabric-master/portal-discovery-maps.ts`. Per-fabric checkpoints remain resumable and incomplete routes remain open. No unmapped record has exhausted every route.

## Batch results

| Batch | Exact images available | New uploads, cumulative | New content duplicates | ROOM images mapped | Selected records unmapped |
| --- | ---: | ---: | ---: | ---: | ---: |
| 50 SDG canary | 50 | 50 | 0 | 0 | 0 |
| 250 SDG canary | 250 | 250 | 0 | 0 | 0 |
| Reconciled tail of 10 | 10 | 260 | 0 | 0 | 0 |
| 1,000-record local fixture | 344 | 0 for this test | Not applicable | 0 | 656 |

The 1,000-record result is a scale test using real identities, not a completed 1,000-image import or activation. Its records remain isolated from customer readiness. A resumed 250-record import skipped all 250 already-mapped jobs without re-uploading. The 260 new image hashes are unique; historical deduplication counters are excluded from this pass's totals.

No mismatched image was accepted. Twelve initial identity discrepancies were held until reconciled. Two historical wrong-colourway candidates, DARP222519 and EAZU132713, remain withheld. Full imported media metadata, including Shopify file IDs/CDN references and hashes, is in `media-results.json`.

## Catalogue totals

| Brand | Master fabrics | Browsable | Still unmapped | Known discontinued, hidden |
| --- | ---: | ---: | ---: | ---: |
| Prestigious Textiles | 258 | 258 | 0 | 0 |
| Clarke & Clarke | 3,302 | 261 | 3,041 | 0 |
| Harlequin | 2,428 | 2 | 2,426 | 34 |
| Morris & Co. | 830 | 1 | 829 | 0 |
| Sanderson | 1,762 | 2 | 1,760 | 0 |
| Scion | 464 | 1 | 463 | 1 |
| Zoffany | 894 | 0 | 894 | 0 |
| **Total** | **9,938** | **525** | **9,413** | **35** |

The unmapped total includes the 35 discontinued records; 9,378 unmapped fabrics are otherwise eligible. **Confirmed genuinely unavailable imagery: 0.** Current price-ready count: 251. Order-ready count: 0. All 260 newly activated fabrics remain price-blocked, with sample availability unconfirmed. No bulk price or stock verification was performed. Thirty-four exact Harlequin records explicitly labelled discontinued by the supplier were recorded as such and kept hidden.

## Validation and performance

| Dataset | Public browse median | Search median | Detail median | Maximum page size |
| --- | ---: | ---: | ---: | ---: |
| 50 new / 315 total | 700 ms | 866 ms | 705 ms | 24 |
| 250 new / 515 total | 690 ms | 634 ms | 538 ms | 24 |
| Final 260 new / 525 total | 609 ms | 612 ms | 498 ms | 24 |
| 1,000 local fixture | 23 ms | 6 ms | 17 ms | 24 |

Loopback timings exclude Shopify proxy/network latency and are not directly comparable with public measurements. The read-only 1,000-record database probe took 381.021 ms, with no temporary disk blocks. The fixture produced 42 pages and a maximum 57,081-byte JSON response. No whole-catalogue client payload was introduced.

Public audits checked all pages, uniqueness, approved Shopify-hosted images, noindex, non-purchasable states for new fabrics, and semantic search/colour/pattern/brand/collection filtering. The final catalogue has 22 pages and a maximum 55,923-byte JSON response. No supplier-commercial fields were found in public responses.

Desktop and mobile Dawn screenshots were captured and visually inspected in the browser tool; screenshot files were not exported. Desktop detail used a 1229 × 539 CSS viewport and mobile used 390 × 844. Real images loaded, layout did not overflow, and exact fabric/Bay context survived the Make Curtains handoff. Unverified pricing stayed blocked; unconfirmed sample buttons stayed disabled. The local 1,000-record mobile test checked first, second and final pages plus search, with at most 24 cards, lazy images and stable navigation. Heap measurement was unavailable. Tests used the desktop network, not a physical handset or throttled mobile connection.

Nine targeted tests passed, as did lint and TypeScript checks. The secret scan covers tracked/proposed text files; its separate report states the scope and limitations.

## Remaining blockers

1. Filecamp requires an authorised login before its assets and filename conventions can be inspected.
2. Digital-book contents remain inaccessible through the blocked preview. No PDF-derived ROOM mappings have been approved.
3. Tested Zoffany exact-SKU/design searches did not resolve; Luxury Plains returned no products and one linked product redirected home. These are discovery/identity gaps, not proof that images do not exist.
4. The remaining 9,378 eligible unmapped records still need exact source associations. The full 1,000-image import is not complete.
5. Prestigious collection-level JPEGs need caption or supplier relationship evidence before design/colourway association. The observed Webtex full-size source was verified as a public JPEG (HTTP 200, 1400 × 1400, 1,121,640 bytes, no credentials). The existing importer now permits that narrowly scoped image route while rejecting session parameters, other endpoints and supplier mismatches. No duplicate Dali image was uploaded.
6. New fabrics require current commercial checks when selected for purchase. Sample availability also remains unconfirmed; browsing is already enabled.

Dawn remains unpublished. Minimal, payment settings, Merchant Center and supplier ordering were not changed. No supplier credentials, session state or authenticated capability URLs were added to catalogue records or committed artifacts.

[Open unpublished Dawn](https://www.curtainsuk.com/pages/fabric-library?preview_theme_id=182264234363) · [Morris fabric example](https://www.curtainsuk.com/pages/fabric-library?preview_theme_id=182264234363&fabric=sdg-mwar237305&window=bay-window)
