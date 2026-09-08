# Expanded supplier portal discovery

The owner's catalogue-first activation rule remains governing. This amendment changes imagery discovery and matching, not lifecycle, price or stock eligibility. Dawn remains unpublished; production Minimal, payment settings and ordering are untouched.

## Governing SDG source priority

Authenticated trade-catalogue fabric/collection listings are the primary exact-colourway image source for Sanderson, Morris & Co., Harlequin, Zoffany, Scion and Clarke & Clarke. Locate the exact Master SKU, read the image from that same product card, and confirm brand, design, colour and fabric type. Open the product when a higher-quality copy or identity detail is needed. Capture the supplier's explicit Live/discontinued label when shown; an absent label remains UNKNOWN and does not block browsing.

Filecamp and digital books are optional sources for additional ROOM/lifestyle/design imagery. Their login, availability or reconciliation must never delay a verified trade-catalogue colourway import. Upload approved colourway files immediately through the existing hash-deduplicated Shopify Files pipeline; retain customer-safe Shopify references in Fabric Master. Do not hotlink supplier files permanently.

SDG scheduling starts with exact-SKU search and fabric listings, followed by exact product/variant/collection checks. Additional-media routes follow. All ten route identities and existing checkpoints remain compatible; priority changes do not invalidate completed observations. A failed search is unresolved discovery, not proof of discontinued status or unavailable imagery.

## What the portal inspection established

Checked 8 September 2026 in the existing authorised browser session:

| Supplier location | Observed result |
| --- | --- |
| SDG exact SKU search | F1787/01 resolves to Astraea Dove, Clarke & Clarke; the portal slug uses CCF0795-01. These are separate identifiers. |
| SDG product/variants | Selected colourway, other variants, recommendations and corporate images coexist in the DOM. Recommendations include wallpaper. Whole-page image extraction is unsafe. |
| SDG search mismatch | DARP222519 returned DARP222529, a different fabric. The result remains withheld. A search hit is not an exact match. |
| SDG Document Browser | General Documents has New Collection Details, Digital Design Books and Product Data File. Digital Design Books exposes all six target-brand folders. Morris & Co contains 17 PDFs, including fabric, wallpaper and rug books. |
| SDG media store | Filecamp's separate login blocks only inspection of optional additional media. It does not block trade-catalogue colourway imports. Capability links are not recorded. |
| Prestigious public catalogue | Product, design, collection and fabric listing routes exist. Genuine product thumbnails must not be discarded just because a larger copy is unavailable. |
| Prestigious resources | Seasonal brochures from 2021 to Autumn/Winter 2026 are listed. A brochure's presence does not prove any particular colourway image. |
| Prestigious trade/library | Webtex and SharePoint were accessible during the subsequent discovery pass. Webtex exposes exact codes/full-size images; SharePoint contains seasonal collection libraries. Individual media routes remain incomplete. |

Bounded SKU-family searches HIOV, MWAR, DSTR, NSCD and F0753 yielded exact fabric cards for five SDG brands. Pattern books in the same results were excluded. A prefix search only supplies candidates: every association must still reconcile the complete SKU, brand and colour.

Two Zoffany brand-product cards explicitly link newer product identifiers to media filenames carrying the existing Master SKU: ZOF0223-02 → ZINF322785, and ZOF0236-04 → ZINF322800. Each also agrees on exact brand/design/colour and existing fabric identity. These observed relationships are recorded in a reconciliation table; do not generalise a renumbering formula. ZOW wallpaper cards are excluded. Exact-SKU searches without results remain recorded even when an alternative verified catalogue association succeeds.

The reusable, versioned recipes are in `lib/fabric-master/portal-discovery-maps.ts`. OBSERVED means the location/control was seen; it does not mean every fabric has been searched there. PARTIALLY_OBSERVED and ACCESS_BLOCKED locations still require work. The authorised UI adapter follows actual links and re-reads page identity after navigation; it must not fabricate product URLs or export sessions.

## Ordered work and honest failure reporting

Each fabric retains ten route observations. `orderedDiscoveryRoutes` gives SDG its catalogue-first priority while retaining the Prestigious order. Checkpoints are bound to identity and map version and resumed independently of uploads. Finish all pagination and locations within a route before marking it EXHAUSTED. SDG Resources includes document folders and Filecamp, but completion of that optional route is not required to import or activate an already verified colourway image.

The scheduler continues looking for additional media even after finding a main image. An unfinished route resumes before later routes. An access failure remains incomplete. NOT_APPLICABLE needs an actual page inspection establishing that a location is not exposed; it cannot be used to bypass an inaccessible library.

Zero images on one page produces DISCOVERY_INCOMPLETE or NOT_YET_DISCOVERED. Only ten completed routes with no image and no ambiguity can produce GENUINELY_NO_SUPPLIER_IMAGE_FOUND. Route-level categories retain NO_EXACT_SKU_RESULT, PRODUCT_FOUND_NO_MEDIA, MEDIA_ONLY_AT_DESIGN_LEVEL, AMBIGUOUS_COLOURWAY and AUTHENTICATION_ACCESS_ISSUE.

The historical **9,673** count means **no approved mapped image yet**. It is not 9,673 exhaustive supplier searches. This pass establishes **zero confirmed missing** records; it does not establish that images exist for all of them. The two previously mismatched candidate results remain withheld.

## Existing importer workflow

Create an input containing `identity` and optional sanitised `observations`, following `artifacts/portal-discovery/observations.json`, then run:

```powershell
npm run fabric:discover:plan -- --input=artifacts/portal-discovery/observations.json --batch-size=100
```

The ignored checkpoint directory receives one discovery ledger per fabric and `discovery-plan.json`, containing the remaining routes and supplier recipes. Production use is 100–250 colourways per batch; small batches are supported for inspection canaries. This is a resumable queue for authorised portal inspection, not a claim that login-blocked routes already have a proven unattended browser adapter.

Pass discovered assets through the existing `fabric:import:media -- --source-file=...` entry point. Each product may now include a `media` array. Each item contains:

- `url`: an allowed credential-free supplier image URL, or `local-sha256:<64-character hash>` for an authorised library download.
- `route`, `location`: the discovery route and opaque map location, never an authenticated page URL.
- `rightsState`: APPROVED is required for import.
- `evidence`: supplier-page SKU, brand, design, colour, product type, scope, image type and explicit image/identity relationship.

The product's existing master identity is the comparison target. Accept exact SKU, exact design plus colour, or a previously verified stable product identifier. Reject contradictory identifiers, wallpaper and unestablished image relationships. Design-level assets are ROOM only; collection context is ADDITIONAL only. They never become an exact-colourway MAIN/SWATCH. Do not claim a lifestyle image establishes its exact colour without supplier evidence.

For private library downloads, save the authorised image bytes under the ignored `artifacts/phase5f/media/incoming/<sha256>` path and reference that hash. The importer verifies the hash and file size, strips metadata, then uses the same Shopify Files pipeline. Do not save download capability URLs, passwords, cookies or headers in the manifest. PDF books are discovery evidence: extracting a labelled image still requires a proven fabric/image association and approval before import.

The importer processes individual assets after a main image is already complete. Composite checkpoint keys preserve multiple ROOM/DETAIL/ADDITIONAL images. Existing fabric-id MAIN checkpoints remain compatible. Content hashes deduplicate downloads already in the source cache and Shopify uploads; repeated content from a new URL may require one download to determine its hash. Shared ROOM/collection content can reuse a file only within the same independently verified design/collection context. Cross-colourway MAIN reuse remains withheld.

Failed assets are skipped on subsequent batches so they cannot starve later colourways. Correct the input/evidence and use `--retry-failures` for an explicit retry. A new asset URL has its own checkpoint. Keep discovery planning and image upload progress separate: finding or uploading a MAIN does not complete the ten-route discovery ledger.

`fabric:apply:media -- --fabric-ids=...` now applies all approved mappings for those fabrics. Location, scope and match method survive in the private `source_reference`; customers receive Shopify URLs only. Shared design/collection assets are kept in typed mappings, do not replace the primary legacy image, and do not activate an otherwise image-less fabric. No pricing fields are written.

## Initial structure-only pass (historical)

- Two real SDG discovery ledgers saved and resumed. Astraea has exact colourway media but eight other routes remain unfinished; DARP222519 has an exact-search mismatch and blocked resources. Neither is confirmed missing.
- The expanded Astraea manifest reused its existing mapping: one already-mapped asset skipped, zero downloads/uploads/new mappings. Total existing uploaded assets remain 265.
- All 37 Fabric Master tests pass, covering route exhaustion, pagination, resume order, wrong SKU/colour/product type, shared ROOM restrictions, additional-media resume, metadata stripping and source safety.
- That initial pass did not import new images. Its access observations and 265-asset count are historical, not current operational gates.

## Current evidence and remaining work

`artifacts/portal-discovery/REPORT.md` records the later 260-image pass. `artifacts/trade-listings-primary/` records the subsequent catalogue-first batches, exact identity reconciliation, Shopify mappings and QA. Remaining work is continued bounded catalogue mapping, resolution of specific contradictory identities and optional additional media. Filecamp/digital books are not colourway-activation blockers. No storefront runtime or theme deployment is required for these data operations.
