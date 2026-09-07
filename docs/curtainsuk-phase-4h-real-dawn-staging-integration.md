# CurtainsUK Phase 4H — Real Dawn staging integration

Date: 7 September 2026  
Branch: `feature/curtainsuk-shopify-dawn-integration`

## Outcome

The unpublished Dawn 16 theme now consumes a deployed, customer-safe staging API backed by the dedicated CurtainsUK PostgreSQL project. A customer can use the Dawn preview to select a real Prestigious Textiles or Sanderson fabric, enter standard measurements and receive the exact server-authoritative VAT-inclusive price. Bay jobs route to price-with-review. Apex, triangular and gable jobs remain blocked behind technical review.

No live theme, checkout, Merchant Center feed, supplier ordering or production supplier schedule was enabled.

## Staging surfaces

- Shopify draft theme: `CurtainsUK Phase 4A Dawn 16`, theme ID `182264234363`, Dawn `16.0.0`, role `unpublished`.
- Live theme verified before and after the push: `Minimal`, theme ID `79650455661`, role `live`.
- Backend: dedicated Vercel project `curtainsuk-staging-api`, Preview deployment only.
- Current preview API base: `https://curtainsuk-staging-p1n66mqhy-hamzas-projects-4ef62f35.vercel.app/api/staging/shopify`.
- Data source: dedicated CurtainsUK Supabase/PostgreSQL project `hqysjumypgeapgmqkcrx`.

The Dawn integration currently uses direct HTTPS calls to the preview API with an exact CurtainsUK/Shopify-origin allow-list. This is the shortest safe staging path. A first-party Shopify app proxy should replace the cross-origin preview URL before launch so deployments have a permanent same-origin path.

## Customer-safe contract

The three staging endpoints are:

- `GET /catalog`
- `POST /price`
- `POST /specialist-review`

Every response is `no-store` and `noindex`. The catalog contains only customer-facing identity/specification, imagery and simplified availability. It does not contain supplier costs, trade prices, raw stock, batch or dye-lot references, private price-verification state, credentials or margins.

The current customer-facing controlled projection contains four price-verified fabrics:

- Prestigious Textiles Formation: Escher Mocha, Dali Mocha and Diez Mocha.
- Sanderson A Painters Garden Fabrics: Painters Garden Violet/Crimson.

The PostgreSQL Fabric Master contains 32 Prestigious colourways plus the Sanderson pilot. The remaining 29 Prestigious colourways remain `PRICE_REQUIRES_VERIFICATION` and are not selectable for firm pricing.

## Routing defect and correction

The Prestigious standard example previously returned `PRICE_WITH_REVIEW` because the complexity engine treated unknown fabric weight as a technical-review reason. That coupled supplier-data completeness to curtain geometry.

The engine now leaves unknown supplier weight out of technical routing. Supplier price/stock verification remains an availability and commercial gate. A known future heavy-fabric threshold may still route a job when an approved versioned business rule defines it.

Verified results:

| Journey | Fabric | Result | Customer price | Availability |
| --- | --- | --- | ---: | --- |
| Standard 200 × 220 cm, Wave, blackout, pair | Prestigious Escher Mocha | `INSTANT_PRICE` | £890 | Availability to be confirmed |
| Standard 200 × 220 cm, Wave, blackout, pair | Sanderson Painters Garden Violet/Crimson | `INSTANT_PRICE` | £1,161 | Availability to be confirmed |
| Bay 340 × 220 cm, segments 80/180/80, Wave, blackout, pair | Prestigious Dali Mocha | `PRICE_WITH_REVIEW` | £1,004 | Availability to be confirmed |
| Apex with complete geometry and a photo filename | Prestigious Escher Mocha | `MANUAL_QUOTE` | Technical review | Payment and production blocked |

The Bay calculation uses six fabric widths and 18.9 metres. No Bay surcharge or change to the approved 35% draft margin was introduced. Its review outcome comes from the Bay window type, multi-segment geometry and track complexity. Bay photographs are now explicitly required in the browser before submission instead of producing an opaque server rejection.

## Dawn implementation

The default Dawn page template is a guarded OS 2.0 JSON template. Each CurtainsUK section renders only for its intended handle. Existing visible Shopify content records provide previewable routes without making the new staging records public:

- `/pages/curtain-visualiser` — configurator, with `window` and `fabric` query parameters.
- `/pages/solve-my-window` — 14-type Shop by Window chooser.
- `/pages/fabric-library` — PostgreSQL-backed fabric browser and sample shortlist.
- `/pages/measure-guide` — measurement guidance.
- existing Standard, Bay, Apex and Patio pages render the matching Dawn window content in the draft theme only.

Nineteen new canonical staging Page records were also created and verified as hidden. They include the five task routes and all 14 approved window families. They remain unavailable to the live store while hidden; they are launch-ready handles, not the current preview entry points.

The header shows `United Kingdom | GBP`, supply-only staging and checkout-disabled status. Account, cart, payment icons and localization selectors are hidden only when Dawn staging mode is enabled. Mobile navigation wraps instead of clipping or requiring a horizontal gesture.

## Imagery and samples

The obsolete Prestigious workbook image URLs were replaced in PostgreSQL using a deterministic supplier SKU/design/colour mapping to current official Prestigious product thumbnails. All 32 Prestigious records were refreshed; the four projected staging cards each render an image.

`Order sample` stores a non-commerce intent tied to the exact Fabric Master ID/SKU, design, colour and remembered Window Type. It creates no order or payment. The live sample price, postage, credit policy and checkout path remain unconfigured.

## Staff price verification

The private Prestigious Stock Check screen now supports a bulk paste of up to 100 rows containing SKU, cut price and optional standard price. It previews row validity, appends the normalized supplier snapshot and approval history, and promotes only validated observations to the staging projection. It performs no Shopify write.

A supplier-admin Supabase Auth user still needs to be provisioned before staff can use this deployed private screen. The API correctly refuses unauthenticated or non-admin callers.

## Sanderson export

The authorised portal's All Brands Excel export was requested, but it continued to show its build-in-progress state during this phase. No workbook was available to download, so no unverified bulk data was invented or imported. The existing one-colourway authorised Sanderson pilot remains the only Sanderson projection until the export is available and its price semantics are confirmed.

## Verification

- Full automated suite: 80 tests passed, zero failed.
- TypeScript: passed.
- Next.js production build: passed.
- Shopify Theme Check: zero errors; ten inherited Dawn warnings across seven upstream theme files.
- Desktop preview: real catalog, Prestigious and Sanderson pricing, sample intent and specialist routing verified.
- Mobile preview at 390 × 844: no document overflow; configurator responsive; task navigation adjusted to wrap.
- Public payload scan: no trade price, supplier cost, raw stock, batch, private verification or credential fields.
- Changed-file secret scan: 31 files scanned, zero suspicious credential/token findings.
- Dawn role remains `unpublished`; Minimal remains the live theme.

Screenshots were captured during browser verification for the desktop Prestigious price result, real multi-supplier fabric browser/sample state, and mobile configurator. They contain no private supplier-commercial values.

## Remaining launch blockers

1. Install a permanent first-party Shopify app/app-proxy route and move the staging API behind it.
2. Provision the authorised supplier-admin identity for the private bulk verification screen.
3. Complete and validate the Sanderson All Brands export import.
4. Verify commercial prices for the remaining Prestigious colourways.
5. Add private object storage and authenticated submission for real customer measurement photos/drawings.
6. Approve production availability freshness/promotion policy and project only approved states.
7. Run commercial calibration on real jobs and explicitly activate the pricing ruleset.
8. Complete pre-launch accessibility, browser/device, analytics, delivery, checkout and feed acceptance testing.

