# CurtainsUK Phase 4F - supplier-neutral bulk import

Status: implemented and applied to the dedicated CurtainsUK development database

Date: 2026-09-07

## Outcome

Phase 4F adds one private import framework for Prestigious Textiles, Sanderson Design Group and future suppliers. Both suppliers use the existing `NormalizedSupplierSnapshot`, Phase 4E validation, append-only history, promotion events and availability logic. There are no supplier-specific snapshot, price, batch or lifecycle tables.

The import workflow is:

```text
Authorised supplier file
        |
        v
CSV / portal / XLS / XLSX / text-PDF parser
        |
        v
Versioned supplier field mapping
        |
        v
NormalizedSupplierSnapshot candidates
        |
        +--> structural, supplier, SKU, price, unit and freshness validation
        +--> diff against latest validated supplier snapshot
        +--> lifecycle transition detection
        |
        v
private staff preview + explicit confirmation
        |
        v
atomic append to Phase 4E shadow history
        |
        v
separate Phase 4E approval gate
```

Bulk apply never approves a snapshot. Valid rows receive a `VALIDATED` event. Structurally mapped rows that fail validation are retained as rejected audit observations without trusted price/batch child records. Rows that cannot identify a supplier SKU block apply because they cannot be attached to an auditable supplier history.

## Input formats

| Format | Implementation | Limits |
|---|---|---|
| CSV/TSV | `csv-parse` with BOM, quoted-field and relaxed-column support | Up to 25,000 rows, 100 columns and a 10 MB upload |
| Portal export | Content-detected CSV/TSV, XLS or XLSX using the same parsers | No portal session, scraping or endpoint automation |
| XLS | SheetJS BIFF8 parsing | First sheet by default; sheet and header row are configurable |
| XLSX/XLSM | SheetJS workbook parsing | Values only; formulas are not executed by the mapper |
| PDF | PDF.js positional text extraction | Text PDFs only; every result carries a manual-review warning; scanned PDFs require an approved OCR step outside this importer |

The parser produces a neutral table. Supplier behavior begins only in a mapping profile, after parsing. This means a Prestigious spreadsheet and a Sanderson spreadsheet can use different column headings without changing storage or validation code.

## Field mapping

Mappings are versioned data with:

- mapping ID and version;
- supplier ID;
- source type and source name;
- source column per normalized field;
- restricted transforms for text, decimals, numbers, integers, dates, booleans, uppercase values, lifecycle and verification state;
- optional value maps;
- explicit defaults; and
- parser options for sheet, header row and delimiter.

Mappings cannot contain or execute code. Unknown optional supplier fields remain `null`; they are never converted to zero, current stock or a price. If a configured source column disappears, preview reports the mapping error so a changed supplier export cannot silently shift data into the wrong field.

Initial profiles are provided for:

- Prestigious authorised files;
- Prestigious authorised portal exports; and
- Sanderson Design Group authorised files.

Their current headings are templates only. The real supplier exports must be checked before a mapping version is operationally approved.

## Batch and lifecycle behavior

Repeated rows for the same supplier SKU merge into one snapshot when scalar values agree. Batch/dye-lot records remain separate within that snapshot. Conflicting scalar values for one SKU fail validation rather than selecting one arbitrarily.

Preview identifies:

- new SKU observations;
- changed observations;
- unchanged observations;
- invalid observations;
- current to discontinued transitions;
- discontinued to current transitions; and
- transitions to/from unknown lifecycle state.

Discontinued imports append lifecycle history. They do not delete FabricSpec records or historical order references and do not write Shopify.

## Preview and bulk apply gate

`/admin/supplier-imports` is available only to authenticated users whose trusted `app_metadata.roles` contains `SUPPLIER_ADMIN`.

Staff select a mapping profile, optionally adjust its declarative JSON, upload a supplier file, and review row-level validation and before/after differences. Supplier-commercial values exist only in this private, `no-store` staff response and are not written to browser storage.

Preview is read-only. It generates a SHA-256 digest over the exact file bytes, mapping, normalized candidates, current durable comparison state and validation result. Apply requires the same file, mapping, preview timestamp and digest. The server recomputes the complete preview. Changed data or database history invalidates the apply request.

The Phase 4F Postgres function appends the sync run, all snapshots, private price/batch children and validation events in one transaction. A database error rolls back the complete batch. Unchanged rows are skipped.

## Database reuse

Phase 4F reuses these Phase 4E tables:

- `supplier_sync_runs`;
- `supplier_snapshots`;
- `supplier_snapshot_prices`;
- `supplier_snapshot_batches`;
- `supplier_promotion_events`;
- supplier catalogue links; and
- approval, validation and freshness policies.

Phase 4F registers the non-commercial Sanderson supplier identity and adds the generic transactional function in:

`supabase/migrations/20260907143000_supplier_bulk_import.sql`

It creates no supplier table or supplier-specific column. Public, anonymous and authenticated roles cannot execute it; only the server role receives execution permission.

The Phase 4E and Phase 4F migrations were applied on 2026-09-07 to the dedicated CurtainsUK development Supabase/PostgreSQL project and verified directly. They were applied through the Supabase SQL editor, so no Supabase CLI migration-history row is claimed. Phase 4G subsequently used the same supplier-neutral import contract for real authorised Prestigious catalogue data and one real Sanderson pilot record. See `docs/curtainsuk-phase-4g-postgresql-activation.md`.

## Sanderson compatibility

The Sanderson mapping feeds the same mapper, preview service, validation context, repository and batch append function as Prestigious. Adding real Sanderson data requires only:

1. FabricSpec/SKU links;
2. approved currency/unit, freshness and price policies; and
3. a verified mapping matching the supplier's real export.

No FabricSpec, availability, pricing, projection or Postgres schema change is required.

## Security boundaries

- Import APIs require `SUPPLIER_ADMIN` before reading an upload.
- Files are limited to 10 MB and are processed in memory; raw files are not persisted.
- Source provenance stores a file SHA-256 digest, not credentials or portal session data.
- Mapping JSON is schema-checked and cannot execute expressions.
- Supplier-commercial values remain in private server processing, private admin responses and private Phase 4E tables.
- No credentials, cookies, Webtex session data or real trade-price fixtures are committed.
- No public API, Shopify adapter, theme, catalogue, checkout, Merchant Center, scheduler or supplier-ordering integration is called.

## Automated coverage

Tests cover:

- CSV parsing and duplicate dye-lot grouping;
- portal export routing;
- XLSX and legacy XLS parsing;
- positional text-PDF extraction and review warnings;
- Prestigious and Sanderson mappings through the same normalized pipeline;
- private field diffs;
- lifecycle transitions;
- read-only preview;
- preview digest mismatch rejection;
- atomic bulk append;
- invalid observation audit retention; and
- Shopify/public-role isolation.

## Remaining decisions and gates

1. Obtain the completed authorised Sanderson all-brands XLSX export and approve its real column mapping.
2. Decide whether supplier PDF layouts are stable enough for approved mappings or should remain manual/reference-only.
3. Decide whether OCR is needed for scanned supplier PDFs and, if so, approve a private OCR processor and retention policy.
4. Confirm the verification status policy for each official supplier source.
5. Confirm source-specific freshness for future official Sanderson exports.
6. Keep supplier scheduling, ordering and Shopify writes disabled until separately approved.

No production changes were made.
