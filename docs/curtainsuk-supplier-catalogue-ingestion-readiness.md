# CurtainsUK supplier catalogue ingestion readiness

Date: 7 September 2026

## Outcome

A real Sanderson Design Group All Product Data workbook was found locally. It had been overlooked because its filename is a UUID. This removes the previous “export unavailable” blocker, but the file is dated 3 March 2026 and cannot safely establish current stock or lifecycle state.

No catalogue data was written to PostgreSQL or Shopify during the assessment.

## Sanderson source

Source: `C:\Users\hamza\Downloads\2fe72589-1d95-455d-91cd-d82d5ff8abda.xlsx`, sheet `All Product Data`, 15,551 rows including the header.

- 15,550 unique products.
- 11,462 fabric rows.
- 9,818 fabric rows across the six target brands.
- 6,680 target-brand rows marked `LIVE` in the old file.
- 427 brand/collection combinations.
- 2,646 brand/collection/design groups.

| Brand | Fabric rows |
| --- | ---: |
| Clarke & Clarke | 3,429 |
| Harlequin | 2,431 |
| Sanderson | 1,762 |
| Zoffany | 894 |
| Morris & Co. | 838 |
| Scion | 464 |

The 3.88 MB XLSX is the appropriate source. A matching 11.0 MB CSV exceeds the current 10 MiB admin limit.

## Safe field coverage

The workbook provides SKU, brand, collection, design, colour, status, pattern match, repeats, width, composition, weight and several technical attributes. It does not provide trade/cut prices, imagery, sample state, explicit batch/dye-lot references, usable width as a distinct field or a separate supplier design code.

Safe catalogue-only treatment:

- Supplier SKU from `Sku/Product Code`.
- Exact brand mapping to the six registered Sanderson-group brands.
- Collection, design and colour from the named workbook columns.
- Full width and repeats converted from centimetres to millimetres.
- Pattern match mapped only when explicit and supported.
- Composition and GSM parsed only from their explicit source fields.
- Usable width, prices, imagery and sample state remain unknown.
- `PRICE_REQUIRES_VERIFICATION` and `storefront_selectable=false` for new records.
- Ignore old aggregate stock, largest-segment and purchase-order fields.
- Preserve source age; do not stamp old observations as newly checked.
- Keep lifecycle `UNKNOWN` until a fresh export is obtained.

`Largest Available Stock Segment` is not a confirmed dye lot and must not be represented as one.

## Safe dry-run implemented

The repository now has a summary-only Sanderson real-file preview path. It reads the actual headers, filters the six approved brands, maps identity/specification fields, rejects structurally unsafe rows, preserves the embedded source timestamp and ignores every stale operational column. It cannot apply to PostgreSQL or Shopify.

Actual preview results:

- Embedded source observation: 24 February 2026, 08:48:32 UTC; 195 days old at test time.
- 15,550 data rows and 9,818 eligible six-brand fabrics.
- 9,680 accepted catalogue/specification records.
- 138 rejected rows, including missing collection/design/colour and shifted trailing-column data; reasons overlap on some rows.
- Six brands, 426 collections and 2,583 deterministic internal design identities.
- All 9,680 remain `PRICE_REQUIRES_VERIFICATION`, non-selectable, with usable width, imagery and sample state unknown.
- 2,366 have unknown/unsupported pattern match; 395 have composition left unknown rather than guessed.
- Database writes: zero. Shopify writes: zero.

A supplier-neutral protection layer now prevents an older or emptier catalogue row from erasing newer verified usable width, imagery, sample state, lifecycle, pricing approval or storefront-selection state. A test with the existing Painters Garden pilot passes.

The remaining structural blockers are:

- The schema requires a supplier design code that is absent from the export. The dry run uses a clearly namespaced deterministic internal identity; persistence needs either a nullable supplier-code field or an explicitly approved internal-key convention.
- The current PostgreSQL apply function is not connected to this preview and must not be called until the full current Fabric Master is compared through the protection layer.
- The admin preview still needs summary/paging before a 15,550-row staff review.
- Six source rows use unsupported Third Drop Match. Pattern blanks and `No Pattern Match` need explicit policy.

## Development PostgreSQL persistence gate

A read-only check of the CurtainsUK development Supabase project confirmed that the current 9,680-row preview must not yet be applied.

- The database contains one Sanderson pilot, `DAPGPA203`, with newer verified September data: official design code, usable width, image, sample state, `CURRENT` lifecycle, verified price and staging selection. The February bulk row is older and materially less complete.
- The dry run deliberately did not load the current master (`existing_master_compared=false`), so its protection result has not been bound to the live database revision.
- The current apply function preserves verified price status, but directly overwrites design linkage/specifications, imagery, sample state, lifecycle, storefront selection and source metadata. It could therefore demote the verified pilot if a count-adjusted payload were applied.
- `supplier_design_code` is required and unique, but this export has no genuine supplier design code. The deterministic preview key is safe for dry-run grouping only and should not be persisted as if supplier-issued.
- Catalogue observation history stores status and a record hash but not the full normalized row; mutable specification history therefore cannot be reconstructed exactly.
- Observation time currently comes from import time rather than the source workbook timestamp.
- Private-schema access is correctly restricted to the service role, and append-only audit triggers are enabled. Supabase's migration-history table is empty despite the live schema, so corrective migration history must be reconciled before another migration is applied.

The shortest safe persistence path is a targeted migration that makes the absent supplier design code nullable, hardens merge precedence, stores true source-observation time and full historical row data, and binds apply to a paginated current-master comparison/revision. A canary containing the verified pilot plus about 50 new rows must prove the pilot remains byte-for-byte unchanged before the remainder is loaded in bounded batches.

## Prestigious position

The August 2026 PDF is genuine and contains about 1,485 design rows/1,484 unique codes, but it is a positional table and has no complete colourway/SKU master. The current generic PDF mapper therefore maps zero extracted rows. A dedicated reviewed parser is needed.

The only colourway-complete authorised Prestigious source remains the 32-SKU Formation pilot. Twenty-nine still need verified cut prices. Derived Shopify CSV/XLSX files contain £0 published variants and must never be pushed directly.

## Shortest safe ingestion sequence

1. Regenerate the Sanderson All Product Data XLSX now so lifecycle provenance is current.
2. Resolve the 138 rejected rows and confirm the internal-design-key and `No Pattern Match` policies.
3. Compare a read-only current Fabric Master export, then run a 50-row canary across all six brands.
4. Connect the protected catalogue-only batch to development PostgreSQL and verify counts/history; keep all new rows unpriced and unselectable.
5. Obtain a separate authorised Sanderson price/image source before pricing activation.
6. Bulk-verify the remaining Prestigious Formation cut prices.
7. Obtain Prestigious colourway/SKU and current lifecycle exports before expanding beyond Formation.

This path expands the canonical Fabric Master without turning old stock, missing costs or £0 placeholders into customer-facing truth.
