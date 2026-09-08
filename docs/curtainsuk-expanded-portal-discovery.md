# Expanded supplier portal discovery

The owner's catalogue-first activation rule remains governing. This amendment changes imagery discovery and matching, not lifecycle, price or stock eligibility. Dawn remains unpublished; production Minimal, payment settings and ordering are untouched.

## What the portal inspection established

Checked 8 September 2026 in the existing authorised browser session:

| Supplier location | Observed result |
| --- | --- |
| SDG exact SKU search | F1787/01 resolves to Astraea Dove, Clarke & Clarke; the portal slug uses CCF0795-01. These are separate identifiers. |
| SDG product/variants | Selected colourway, other variants, recommendations and corporate images coexist in the DOM. Recommendations include wallpaper. Whole-page image extraction is unsafe. |
| SDG search mismatch | DARP222519 returned DARP222529, a different fabric. The result remains withheld. A search hit is not an exact match. |
| SDG Document Browser | General Documents has New Collection Details, Digital Design Books and Product Data File. Digital Design Books exposes all six target-brand folders. Morris & Co contains 17 PDFs, including fabric, wallpaper and rug books. |
| SDG media store | File Camp Media Store is separate from the main trade session. Its Filecamp login currently blocks inspection. The shared capability link is deliberately not recorded. |
| Prestigious public catalogue | Product, design, collection and fabric listing routes exist. Genuine product thumbnails must not be discarded just because a larger copy is unavailable. |
| Prestigious resources | Seasonal brochures from 2021 to Autumn/Winter 2026 are listed. A brochure's presence does not prove any particular colourway image. |
| Prestigious trade/library | Webtex shows its login page; SharePoint Lifestyle Imagery requires Microsoft sign-in. Neither location has been exhausted. |

The reusable, versioned recipes are in `lib/fabric-master/portal-discovery-maps.ts`. OBSERVED means the location/control was seen; it does not mean every fabric has been searched there. PARTIALLY_OBSERVED and ACCESS_BLOCKED locations still require work. The authorised UI adapter follows actual links and re-reads page identity after navigation; it must not fabricate product URLs or export sessions.

## Ordered work and honest failure reporting

Each fabric has ten route observations: exact product, SKU search, design, colourway, collection, fabric listing, gallery, lifestyle, resources, and exact design-plus-colour search. Checkpoints are bound to the identity and map version, written atomically and resumed independently of uploads. Finish all pagination and all locations within a route before marking it EXHAUSTED. For example, SDG Resources includes both the document folders and Filecamp: inspecting one is insufficient.

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

## Validation and remaining work

- Two real SDG discovery ledgers saved and resumed. Astraea has exact colourway media but eight other routes remain unfinished; DARP222519 has an exact-search mismatch and blocked resources. Neither is confirmed missing.
- The expanded Astraea manifest reused its existing mapping: one already-mapped asset skipped, zero downloads/uploads/new mappings. Total existing uploaded assets remain 265.
- All 37 Fabric Master tests pass, covering route exhaustion, pagination, resume order, wrong SKU/colour/product type, shared ROOM restrictions, additional-media resume, metadata stripping and source safety.
- Remaining operational blockers: Prestigious Webtex login, Prestigious SharePoint access, SDG Filecamp login; complete and validate recipes within those areas before unattended scale-out. Main SDG trade and document-browser access work.
- No bulk discovery or new supplier image import was performed in this structure-learning pass. No storefront runtime or theme deployment was necessary.
