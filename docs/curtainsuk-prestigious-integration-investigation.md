# CurtainsUK Phase 4B - Prestigious Textiles Trade Integration Investigation

Date: 2026-09-06

Status: read-only investigation; no integration implemented

Branch: `feature/curtainsuk-shopify-dawn-integration`

## Executive conclusion

The authorised Prestigious Textiles Webtex account authenticated successfully.
The portal contains enough data to prove the business value of a future supplier
integration: a stable product/colourway code, two ex-VAT trade prices, aggregate
free stock in metres, the number of pieces, expected replenishment, and stock
split by batch/dye lot.

That means CurtainsUK could eventually compare the decision engine's calculated
fabric requirement with both aggregate stock and a single compatible batch. This
is materially more useful than a simple `IN_STOCK` flag.

No supported API, stock feed, price feed, EDI specification, sandbox, webhook or
machine-ordering interface was found in the portal or public Prestigious
documentation reviewed. The normal website uses private, session-authenticated
ASP.NET page methods. Those browser methods are evidence that the data exists;
they are not approval to automate the portal and must not become a production
dependency.

Recommended conclusion: proceed with a small, private Prestigious Fabric Master
and manual/import-assisted pilot, while requesting an official integration
contract from Prestigious. Do not scrape or replay Webtex browser endpoints.

## 1. Login result

- Authentication to the authorised trade account succeeded.
- The account identifier, customer name, credentials, cookies and session details
  are intentionally omitted.
- No password, cookie, session identifier, CSRF value or authentication header was
  written to the repository.
- No account settings were changed.

## 2. Portal functionality available

The account exposes the following functional areas.

| Area | Observed capability | Investigation boundary |
| --- | --- | --- |
| Home | Links to orders, current-order tracking, stock, collections and imagery/documents | Read only |
| Products | Stock enquiry, collection enquiry, price list and brochures | Normal searches only |
| Design search | Search by design/product concepts from the main navigation | Read only |
| Stock enquiry | Search by full product code, design code, design name or collection | Three known catalogue SKUs checked |
| Collections | Browse collections, designs and colourways | One known collection mapped |
| Order entry | Place orders for cut lengths, pieces, pattern books, poles, wallpaper and samples | Form structure observed; nothing added |
| Cutting/sample entry | Dedicated cutting-order journey; portal states a maximum of six cuttings per order | Not opened with a product and not submitted |
| Basket | Product, description, quantity, status and ex-VAT unit price columns; Confirm Order action | Confirm action not used |
| Order enquiry | Search by supplier order number, customer reference or product; filters for outstanding, back order, despatched and in-progress orders | Controls mapped without reading order records |
| Orders | Outstanding proformas | Not opened |
| Accounts | Account summary, outstanding invoices, invoice search and recent payments | Menu mapped only; financial records not opened |
| My Account | Password management | Not opened or changed |
| Help | Website guide and troubleshooting guide | Availability noted |
| Downloads | Brochures, current PDF price list, full discontinued CSV and recent discontinued CSV | File types and availability recorded |
| Imagery | Credential-gated lifestyle-image library linked from the portal | Link observed; library was not copied |

No dedicated delivery-information screen was found during the safe read-only
journey. Delivery terms may appear later in order confirmation, which was not
entered. Treat delivery data as unknown until Prestigious supplies documentation
or a non-ordering test route.

## 3. Product identifiers and catalogue structure

The strongest stable identifier observed is the full product code in the form:

```text
DESIGN_CODE/COLOUR_CODE
4269/147
```

Observed behaviour supports the following mapping:

| Portal concept | CurtainsUK field |
| --- | --- |
| Full product code | `supplierReference` and supplier-scoped `uniqueSku` |
| Four-digit prefix | `supplierDesignCode` |
| Three-digit suffix | `colourwayCode` |
| Description | Parsed design name plus colour name |
| Collection | `collection` |

Formation Collection demonstrated that each colourway has its own full code. For
example, design `4269` is Escher and its visible colourways use distinct suffixes.
The existing CurtainsUK import CSV already uses the same full code as Shopify's
variant SKU. This is a strong deterministic join key for FabricSpec migration.

The collection browser displayed 32 colourways across its designs. The portal's
top-level collection list included 384 entries, including historical-looking
collections, so presence in that list must not be treated as proof that a fabric
is current. Lifecycle must come from product status/stock plus the official full
and recent discontinued CSV files.

## 4. Stock data available

For a normal product-code enquiry, the product detail view exposed:

- full product code;
- collection;
- design and colour description;
- standard price excluding VAT;
- cut price excluding VAT;
- free stock in metres;
- number of stock items/pieces;
- standard piece length;
- sample-cutting availability count;
- country of origin;
- composition;
- horizontal pattern repeat;
- vertical pattern repeat;
- usable width;
- full width;
- next-due status/date;
- weight;
- Martindale result where applicable;
- after-care and usage indicators;
- product imagery;
- batch-details view.

The batch-details view is strategically important. It exposes rows containing a
batch reference, number of items and quantity, with totals. For the test product,
aggregate free stock was divided across multiple batches. A large curtain order
may therefore fail a single-dye-lot check even when aggregate free stock is high.

Observed sample stock results are internal supplier evidence and must not be sent
to storefront clients. The three known catalogue products all returned stock in
`Metres` and `None Due` for the next-due field at the time of inspection.

The portal did not show a separate quantity-due value for those in-stock examples.
The schema should support it because a product with an active replenishment may
return a date and quantity on another state, but this remains unverified.

## 5. Pricing data available

The portal exposes two prices in Sterling, both explicitly excluding VAT:

- `Standard Price ex VAT`
- `Cut Price ex VAT`

The order basket also states that unit prices exclude VAT. CurtainsUK must not
collapse the two supplier prices into one field. Made-to-measure orders usually
need a cut length; unless Prestigious confirms another commercial arrangement,
the cut price is the conservative cost basis for a supplier cut-length order.

### Portal sample

| Product | Portal standard ex VAT | Portal cut ex VAT | Relationship |
| --- | ---: | ---: | ---: |
| Escher Mocha `4269/147` | GBP 24.40/m | GBP 30.50/m | cut = standard x 1.25 |
| Dali Mocha `4270/147` | GBP 12.16/m | GBP 15.20/m | cut = standard x 1.25 |
| Diez Mocha `4271/147` | GBP 21.84/m | GBP 27.30/m | cut = standard x 1.25 |

These values are account-side commercial data. They belong only in private
supplier-cost storage and immutable price snapshots, never Shopify public
metafields, Liquid, Storefront API payloads, analytics or Merchant Center.

### August 2026 PDF comparison

The authenticated downloads page exposes a current Prestigious PDF price list.
Chrome opened it through the protected PDF viewer, but the browser security policy
did not permit the investigation session to read or control that viewer. The PDF
rows therefore could not be verified without breaching the browser-only boundary.

| Product | August PDF price | Portal price | Difference |
| --- | --- | --- | --- |
| Escher Mocha `4269/147` | Unknown - viewer not safely readable | GBP 24.40 standard / GBP 30.50 cut | Unknown |
| Dali Mocha `4270/147` | Unknown - viewer not safely readable | GBP 12.16 standard / GBP 15.20 cut | Unknown |
| Diez Mocha `4271/147` | Unknown - viewer not safely readable | GBP 21.84 standard / GBP 27.30 cut | Unknown |

No match is inferred. A human should verify these three rows in the August list,
including whether the PDF labels piece/standard and cut prices separately. Once
verified, record the price-list effective date and currency, not just the PDF's
download date.

## 6. Browser/request architecture

The portal is a classic ASP.NET Web Forms application rather than a modern public
commerce API.

Observed indicators:

- `.aspx` pages and a single `aspnetForm` using HTTP POST;
- Microsoft `ScriptResource.axd`;
- generated `PageMethods` proxies using `Sys.Net.WebServiceProxy`;
- page-specific JavaScript under `PageResources/Default.js`;
- jQuery 1.6.4 and legacy jQuery UI;
- stock result details loaded into an iframe under
  `/webtex/Content/ViewProductDetails/Default.aspx`;
- the product code is passed to that product-detail view;
- normal searches are represented by internal callbacks for product stock,
  product-code search, design-code search, design-name search and collection
  search;
- private page-method proxies also exist for basket, location, price-list and
  order-type behaviour.

No password, cookie, session header, request body, CSRF token or raw network
header was captured. Query strings containing session/navigation state were not
stored.

### Protocol classification

| Candidate | Evidence | Conclusion |
| --- | --- | --- |
| Classic ASP.NET postback | Web Forms POST form exists | Used for page lifecycle/navigation |
| ASP.NET AJAX/PageMethods | `Sys.Net.WebServiceProxy` and generated callback methods observed | Used internally by normal portal behaviour |
| XHR/AJAX | PageMethods are an AJAX mechanism | Present, but private and session-authenticated |
| Fetch | No evidence | Not observed |
| REST/JSON API | No `/api/` or documented REST surface found | Not established |
| SOAP/XML/WSDL | No `.asmx`, WSDL or SOAP evidence found | Not established |
| GraphQL | No evidence | Not observed |
| CSV feeds | Official full/recent discontinued CSV downloads only | Lifecycle import is feasible; no stock/price feed found |
| EDI | No portal or public documentation found | Unknown; ask Prestigious |

ASP.NET PageMethods commonly serialize JSON, but the response content type was
not captured and must not be inferred as an official JSON API. The internal
callbacks are part of the browser application and may change without notice.

## 7. Official API/feed/EDI evidence

Positive official evidence:

- current PDF price-list download;
- full discontinued-items CSV;
- recent discontinued-items CSV;
- downloadable product imagery/brochures;
- interactive stock and order-entry capabilities.

Negative/unknown evidence:

- no API documentation;
- no API credentials or developer area;
- no stock feed;
- no price feed;
- no product-master CSV/XML download was identified;
- no EDI specification;
- no webhook documentation;
- no sandbox/test account;
- no documented machine-order endpoint.

A focused search of Prestigious-owned public pages returned no official API, EDI,
XML, CSV stock-feed or ecommerce-integration documentation. A broader search
returned no authoritative Prestigious integration source. Absence from the portal
and search results does not prove that a private partner integration is
unavailable.

## 8. Live integration feasibility

### Data feasibility

The desired lookup is technically feasible at the data level:

```text
FabricSpec supplier SKU
        |
        v
Prestigious product code
        |
        +--> current product metadata
        +--> standard and cut trade price
        +--> aggregate free stock metres
        +--> per-batch/dye-lot stock metres
        +--> expected availability
```

### Operational feasibility

Production automation is not yet authorised or supportable. It requires one of:

1. an official Prestigious API;
2. an approved EDI/web-service integration;
3. approved scheduled price/stock/product feeds; or
4. explicit written approval for a narrowly scoped Webtex automation contract.

Option 4 is least desirable because the current private endpoints are tied to a
legacy browser session and UI implementation.

### Recommended interim model

- Import approved product content into a private staging Fabric Master.
- Use the official discontinued CSVs for lifecycle reconciliation.
- Load price-list data through a controlled, human-approved import.
- Perform live stock checks manually in Webtex for pilot orders.
- Store the check timestamp and operator confirmation, not portal credentials.
- Keep all pilot fabrics unpublished and Google-feed-ineligible.

## 9. Ordering integration feasibility

The normal UI proves that Prestigious can accept:

- product-code searches;
- order quantities;
- cut-length and piece-type orders;
- cutting/sample orders;
- customer purchase-order references;
- a basket with validation status and ex-VAT unit price;
- order confirmation;
- later enquiry by supplier order number, customer reference or product;
- outstanding, back-order, in-progress and despatched status filters.

No item was added to the basket and no order/proforma was submitted, so the
following remain unverified:

- minimum cut increment and rounding;
- whether a batch/dye lot can be selected or reserved;
- final carriage and delivery address rules;
- supplier order-reference response format;
- split delivery/back-order behaviour;
- cancellation/amendment behaviour;
- whether Webtex accepts an idempotency/customer-reference key;
- machine-readable status updates.

Future CurtainsUK ordering should use a controlled supplier-requirement workflow:

```text
Paid/approved CurtainsUK order
  -> immutable fabric-metres requirement
  -> fresh price and stock check
  -> single-batch sufficiency check
  -> supplier requirement record
  -> authorised submission adapter
  -> supplier order reference
  -> status reconciliation
  -> exceptions/manual intervention
```

Until Prestigious supplies a supported ordering mechanism, the submission adapter
must be `MANUAL`, with an operator recording the supplier reference. Do not drive
Webtex automatically from checkout.

## 10. Recommended CurtainsUK architecture

### A. Separate public and private supplier data

```text
Public Shopify FabricSpec projection
  - design, colour, collection
  - width/repeat/composition/care
  - approved imagery
  - customer-facing availability state
  - sample eligibility

Private Prestigious Fabric Master
  - supplier identifiers
  - account trade prices
  - stock quantities and batches
  - supplier effective dates
  - sync provenance and audit history
```

Never put supplier cost, free-stock metres, batch references or replenishment
detail into public Shopify metaobjects, Storefront API responses or Liquid.

### B. Proposed schema recommendation

```ts
interface PrestigiousFabricMaster {
  id: string;
  supplier: "PRESTIGIOUS_TEXTILES";
  supplierProductCode: string;       // e.g. full design/colour code
  supplierDesignCode: string;
  colourwayCode: string;
  collection: string;
  design: string;
  colour: string;
  fullWidthMm: number | null;
  usableWidthMm: number | null;
  verticalRepeatMm: number | null;
  horizontalRepeatMm: number | null;
  composition: Array<{ fibre: string; percentage: number }>;
  careInstructions: string[];
  usageSuitability: string[];
  originCountryCode: string | null;
  weightGramsPerSupplierUnit: number | null;
  martindale: number | null;
  imagery: Array<{ supplierAssetId: string | null; url: string; rightsStatus: string }>;
  lifecycle: "CURRENT" | "DISCONTINUED" | "UNKNOWN";
  lifecycleSource: "PORTAL" | "FULL_DISCONTINUED_CSV" | "RECENT_DISCONTINUED_CSV" | "MANUAL";
  lastSupplierSyncAt: string | null;
}

interface PrestigiousPriceSnapshot {
  supplierProductCode: string;
  currency: "GBP";
  standardPriceNetPerMetre: number | null;
  cutPriceNetPerMetre: number | null;
  selectedCostBasis: "STANDARD" | "CUT" | "CONTRACT";
  effectiveFrom: string | null;
  observedAt: string;
  source: "OFFICIAL_FEED" | "PRICE_LIST_IMPORT" | "PORTAL_MANUAL_CHECK";
  approvedBy: string | null;
  contentHash: string | null;
}

interface PrestigiousStockSnapshot {
  supplierProductCode: string;
  unit: "METRE";
  freeStockMetres: number | null;
  numberOfPieces: number | null;
  standardPieceLengthMetres: number | null;
  quantityDueMetres: number | null;
  expectedReplenishmentAt: string | null;
  sampleCuttingsAvailable: number | null;
  batches: Array<{
    supplierBatchReference: string;  // private
    numberOfPieces: number | null;
    freeStockMetres: number;
  }>;
  observedAt: string;
  expiresAt: string;
  source: "OFFICIAL_API" | "OFFICIAL_FEED" | "PORTAL_MANUAL_CHECK";
}
```

The existing `FabricSpec` remains the pricing/compatibility aggregate. Add a
private reference to the supplier master rather than expanding the public Shopify
projection with account data.

### C. Services

- `PrestigiousCatalogAdapter`: imports supplier-approved master content.
- `PrestigiousPriceAdapter`: creates effective-dated net-cost snapshots.
- `PrestigiousStockAdapter`: returns aggregate and per-batch availability.
- `FabricAvailabilityPolicy`: compares required metres plus approved allowance
  with a single batch and aggregate stock.
- `SupplierRequirementService`: freezes the required SKU/metres after customer and
  technical approval.
- `SupplierOrderAdapter`: `MANUAL` initially; official API/EDI implementation only
  after supplier approval.
- `SupplierReconciliationService`: applies status updates without changing the
  customer order snapshot.

All adapters run server-side. Shopify receives customer-safe availability and
lead-time statements only.

## 11. Future storefront behaviour

The decision engine already knows the required face-fabric metres. Availability
should be evaluated against `requiredMetres + supplierOrderAllowanceMetres`, with
a single-batch rule where shade consistency matters.

| Supplier state | CurtainsUK behaviour |
| --- | --- |
| Sufficient stock in one batch | Permit the configured journey, show an approved lead-time message, recheck before payment/order release |
| Aggregate stock sufficient but split across batches | Route to `PRICE_WITH_REVIEW`; workroom decides whether mixed batches are acceptable |
| Low but sufficient stock | Short quote expiry, immediate recheck/reservation requirement and review flag; do not reveal exact metres |
| Insufficient for configuration | Block firm checkout for that fabric; preserve configuration and offer alternatives/sample/availability request |
| Stock due shortly | Allow save/sample or reviewed preorder only if date and due quantity are confirmed; no firm promise for `UNKNOWN` quantity |
| Temporarily unavailable | Disable firm order, retain historical/configuration reference, show non-committal availability message |
| Discontinued | Block new configurations; keep historical orders valid; any last-stock sale requires manual batch and quantity confirmation |
| Supplier price changed | New configurations use the new effective snapshot; existing quotes follow a defined expiry/price-lock policy and require acknowledgement if recalculated |

Recommended stock TTLs should be agreed with Prestigious. At minimum, recheck at
price display, checkout start, payment/approval and supplier-order release. A
displayed stock message must never be treated as a reservation unless Prestigious
provides a reservation capability and reference.

## 12. Permission and access required from Prestigious

Ask Prestigious for written answers to the following:

1. Is there an official partner API, Webtex web service, EDI interface or scheduled
   feed for products, prices, stock, batches, expected receipts and orders?
2. Can CurtainsUK receive product-master data with stable design/colour IDs,
   lifecycle, widths, repeats, composition, care and usage fields?
3. Can the feed expose actual available metres and per-batch/dye-lot availability?
4. What is the precise definition of `Free Stock` - physical, unallocated,
   available-to-promise, or subject to later allocation?
5. Are price values account-specific, and when should standard/piece versus cut
   price apply?
6. What is the price effective date, advance-notice policy and correction policy?
7. Can stock be reserved; if so, what reference, expiry and idempotency rules apply?
8. Is machine ordering supported for cut lengths, and can a required batch be
   specified?
9. Is a sandbox/test account available?
10. What authentication, IP allow-list, rate limit and credential-rotation policy
    applies?
11. Are webhooks/status feeds available for acknowledgements, back orders,
    despatches, cancellations and invoices?
12. May approved product and lifestyle imagery be syndicated into Shopify and
    Google Merchant Center, and what attribution/expiry rules apply?
13. May CurtainsUK cache stock and price data, and for how long?
14. If no formal API exists, will Prestigious authorise a documented, supported
    read-only Webtex integration rather than UI scraping?

## 13. Security findings and controls

- Credentials were entered by the user directly into the browser.
- No password, cookie, session identifier, authentication header, CSRF token or
  protected download credential was copied into source code, logs, screenshots,
  fixtures or this document.
- No raw browser request headers or bodies were persisted.
- No account, customer, invoice, payment or order record was copied into the
  investigation.
- Portal trade prices and stock are classified as private commercial data.
- A future connector must use server-side secret storage with separate staging and
  production credentials, least privilege, rotation, audit logging and egress
  restriction.
- Log redaction must cover passwords, cookies, authorization headers, CSRF values,
  query/session state, account identifiers, supplier batch references and raw
  supplier responses.
- The supplier connector must never be callable directly from Dawn or a public
  browser. Dawn calls CurtainsUK's authenticated server boundary, which returns a
  coarse customer-safe availability result.
- An unrelated browser inventory contained sensitive-looking URLs while attempting
  developer-tool discovery. None was copied into the repository or report. Future
  investigations should avoid full-browser inventories and operate only on the
  dedicated portal tab.

## 14. Go/no-go recommendation

### Go now

- Add the private schema behind a feature flag.
- Create a hand-verified pilot mapping for 5-10 colourways.
- Reconcile the official discontinued CSV.
- Verify the three PDF/portal price rows manually.
- Calibrate required-metres and single-batch checks against real jobs.
- Contact Prestigious for supported integration access.

### Do not do yet

- Do not scrape or replay private PageMethods.
- Do not automate the Webtex basket.
- Do not present exact supplier stock to customers.
- Do not treat aggregate stock as proof that one dye lot is sufficient.
- Do not publish Prestigious fabrics, enable checkout or activate Google feeds.
- Do not promise lead time until stock semantics and reservation rules are agreed.

## 15. Investigation changes

Only this architecture/investigation document is intended to be committed. No
Shopify theme, catalogue, checkout, Merchant Center, pricing rule or supplier
integration code was changed.
