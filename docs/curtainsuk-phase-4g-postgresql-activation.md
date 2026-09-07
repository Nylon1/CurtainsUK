# CurtainsUK Phase 4G — PostgreSQL activation and real multi-supplier data

Status: implemented on the non-production development branch

Date: 2026-09-07

## Outcome

The dedicated CurtainsUK Supabase/PostgreSQL project is now the development intelligence database. Phase 4E, Phase 4F and the Phase 4G Fabric Master migration were applied and verified. Real authorised Prestigious catalogue data and one real Sanderson-group pilot colourway now flow through the same supplier-neutral Fabric Master, private supplier-intelligence history, decision engine and customer-safe staging projection.

No live Shopify theme, production catalogue, checkout, Merchant Center, supplier ordering or production schedule was changed. The unpublished Dawn 16 theme remains unpublished and the production Minimal theme was not touched.

## Development database

- Platform: Supabase/PostgreSQL
- Project: CurtainsUK
- Project reference: `hqysjumypgeapgmqkcrx`
- Private schema: `curtainsuk_private`
- Browser roles: no schema usage or table reads
- Server access: service-role only
- Historical supplier observations: append-only

The database secret, connection details and user credentials are stored only in ignored local environment configuration. They are not present in source, fixtures, documentation, screenshots or logs.

The following migrations were applied in order through the Supabase SQL editor:

1. `20260907043049_supplier_intelligence_approval_gate.sql`
2. `20260907143000_supplier_bulk_import.sql`
3. `20260907150000_curtainsuk_fabric_master.sql`

Because the SQL editor was used, the project does not have a corresponding Supabase CLI migration-history table. Migration success was verified from the resulting schema and behavior rather than inferred from file presence.

## Fabric Master and ownership

PostgreSQL owns stable supplier, brand, collection, design, colourway and supplier-SKU identities plus private commercial observations and history. Shopify receives only a controlled customer projection.

The normalized hierarchy is:

```text
Supplier -> Brand -> Collection -> Design -> Colourway/SKU
```

Every Shopify projection carries a permanent Fabric Master ID and supplier SKU. Names are display attributes and are never used as the primary relationship.

Current development data:

| Measure | Count |
|---|---:|
| Suppliers | 2 |
| Registered brands | 7 |
| Collections with imported colourways | 2 |
| Designs | 8 |
| Colourways | 33 |
| Verified/selectable price records | 4 |
| Price requires verification | 29 |

Registered brands include Prestigious Textiles plus Sanderson, Morris & Co., Harlequin, Zoffany, Scion and Clarke & Clarke. This registration does not claim that every brand has catalogue rows imported yet.

## Prestigious import

The authorised Prestigious workbook and official August 2026 price/specification material supplied to the project were normalized into 32 real Formation colourways across seven designs. Public specifications, identifiers and lifecycle provenance are stored separately from private commercial observations. The workbook's legacy `/assets/collections/` image URLs now return HTTP 404 on the supplier's rebuilt site, so those broken URLs are retained only as source-file provenance and are not projected as usable storefront imagery.

The three previously verified Mocha SKUs were appended to durable supplier history, validated, manually approved and promoted for staging projection. Their private trade price, stock, batch and verification values remain only in the private database. The other 29 colourways are present in the Fabric Master but remain `PRICE_REQUIRES_VERIFICATION` and cannot become selectable merely because their catalogue data exists.

## Sanderson investigation and pilot

The authorised Sanderson Design Group trade portal provides an account-generated all-brands Excel export. The export was requested, but the portal continued to report that it was being built and did not make the file available during this phase.

To prove the shared architecture without fabricating a bulk import, one genuine Sanderson record was verified from the official trade product page and official price-list PDF:

- Brand: Sanderson
- Collection: A Painters Garden Fabrics
- Design: Painters Garden
- Colour: Violet/Crimson
- Supplier SKU: DAPGPA203
- Width: 137 cm
- Vertical repeat: 66 cm
- Horizontal repeat: 137 cm
- Match: straight
- Composition: 100% cotton

Its customer-safe catalogue fixture contains no trade price, stock quantity or supplier operational data. The private manual observation was appended, approved and promoted separately. The observed one-metre trade price was used as the development cut-cost basis because the portal's one-metre basket action displayed the same price; this mapping should be confirmed against the completed account export before a wider Sanderson activation.

## Supplier-neutral pricing path

The decision engine accepts either supplier through the same FabricSpec adapter. Current commercial rules were not changed:

- 35% gross margin
- GBP 25 make-up per fabric width
- standard lining GBP 4/m
- blackout and thermal lining GBP 6/m
- bonded interlining GBP 5/m
- pencil heading 1.00
- wave and eyelet 1.10
- pinch pleat 1.20
- VAT-inclusive final price rounded to the nearest whole pound

For a 200 cm by 220 cm pair with pencil pleat and standard lining, the staging engine produced:

| Supplier example | Fabric widths | Face-fabric metres | Customer price, VAT included | Route |
|---|---:|---:|---:|---|
| Prestigious verified pilot | 4 | 10.2 m | GBP 834 | `PRICE_WITH_REVIEW` because fabric weight is unknown |
| Sanderson verified pilot | 4 | 10.6 m | GBP 1,105 | `INSTANT_PRICE` |

Supplier costs, direct-cost components and margin calculations are not included in the customer projection.

## Staging projection and Dawn

The server-side staging catalogue endpoint now reads from the database and returns only promoted customer-safe records. Verification returned four projected fabrics across Prestigious and Sanderson, with checkout disabled and no private supplier fields in the payload.

The Dawn integration contract remains targeted at unpublished theme ID `182264234363`, Dawn `16.0.0`. The existing production Minimal theme ID `79650455661` was not modified. No Shopify write was performed in Phase 4G. The local reference storefront was used to verify the database-backed catalogue behavior before any future controlled app-proxy deployment.

## Security and database verification

- 16 private tables have RLS enabled and forced.
- `anon` and `authenticated` cannot use or select from the private schema.
- service-role reads and approved server operations succeed.
- attempted updates to append-only observations are rejected.
- failed supplier runs do not replace an approved observation.
- staging promotion requires a validated, approved, current snapshot with a verified, unexpired GBP cut price.
- the public projection contains no supplier costs, raw stock quantities, batch references, trade prices or credentials.
- no Shopify write or production supplier schedule exists.

## Validation

The automated suite covers pricing/manufacturing rules, supplier sync, durable intelligence, bulk import, Fabric Master normalization, storefront integration and Shopify theme contracts. The production build and TypeScript validation pass with the development environment configuration.

Desktop reference screenshots:

- `docs/screenshots/phase4g/fabric-master-desktop.png` — promoted Prestigious and Sanderson records from PostgreSQL
- `docs/screenshots/phase4g/sanderson-configurator-price-desktop.png` — completed Sanderson standard-curtain price journey with checkout still blocked

## Remaining blockers

1. Download and map the completed Sanderson all-brands XLSX; until then only one Sanderson pilot colourway is claimed.
2. Verify commercial prices for the remaining 29 imported Prestigious colourways.
3. Confirm the Sanderson cut-price interpretation against the official account export.
4. Obtain current authorised Prestigious image assets or a replacement official image export; the workbook image URLs are retired and return 404.
5. Complete missing Prestigious weight and other optional specifications where available; unknown values must remain unknown.
6. Obtain batch/dye-lot observations before representing exact order-level supplier sufficiency.
7. Deploy and authorise the controlled staging app-proxy/API path before the remote Dawn preview can consume this database projection.
8. Perform separate approval before any Shopify write, live theme publication, checkout activation, Merchant Center change, supplier ordering or scheduled sync.

No production changes were made.
