# CurtainsUK Phase 5B — Launch hardening and Sanderson canary

Date: 7 September 2026

Branch: `feature/curtainsuk-phase-5a-prelaunch`

Commit: recorded in the final Phase 5B handoff (this document is part of that commit)
Theme: unpublished Dawn 16, ID `182264234363`

## Verdict

The launch-blocking pricing, validation, Bay and review-handoff defects found in Phase 5A have been corrected in the non-production stack. A `MANUAL_QUOTE` no longer returns or renders a numeric selling price, specialist geometry is validated before routing, Bay no longer asks the customer for angles, and review jobs can be saved durably in the private CurtainsUK PostgreSQL project without enabling payment or manufacture.

A 50-colourway Sanderson Design Group canary has also been applied through the supplier-neutral Fabric Master path. It represents all six approved brands and is visible in the unpublished Dawn fabric browser, but remains deliberately blocked from pricing because the source workbook contains no verified commercial price. The existing verified Sanderson pilot `DAPGPA203` was preserved byte-for-byte.

The canary is not approval to import the remaining approximately 9,600 mapped records. The principal catalogue blocker is imagery: the authorised workbook has no image/media field, so the 50 new colourways currently use a customer-safe placeholder rather than an approved product image. Prices, current lifecycle and current availability also remain unverified.

No live theme, production Minimal theme, checkout, Merchant Center feed, supplier ordering or production supplier schedule was enabled or changed.

## Staging surfaces

- PostgreSQL: dedicated CurtainsUK Supabase project `hqysjumypgeapgmqkcrx`.
- Shopify development theme: `CurtainsUK Phase 4A Dawn 16`, theme ID `182264234363`, role `unpublished`.
- Production theme: `Minimal`, theme ID `79650455661`, still `live` and untouched.
- Backend: Vercel Preview deployment only.
- Preview API base: `https://curtainsuk-staging-8n6r5mdbj-hamzas-projects-4ef62f35.vercel.app/api/staging/shopify`.
- Checkout: disabled in both the CurtainsUK flow and inherited Dawn commerce controls.

## Launch-blocker corrections

### Manual Quote

`MANUAL_QUOTE` is now a quote-only state throughout the server and storefront contracts:

- the public price response returns `totalAmountMinor: null`, `netSellingPriceMinor: null` and `vatMinor: null`;
- Dawn displays **Price confirmed after technical review** instead of a number;
- the project may be submitted for review;
- payment and manufacture remain blocked; and
- a PostgreSQL constraint prevents a `MANUAL_QUOTE` review record from storing a provisional price.

`PRICE_WITH_REVIEW` remains able to show a VAT-inclusive provisional price.

### Specialist measurement validation

Apex, triangular and gable inputs now reject non-finite, zero and negative critical measurements before classification. Geometry checks cover the relationship between base width, peak height, left/right verticals and supplied slopes. Specialist review remains mandatory even when the geometry is internally consistent and the fabric is available.

The browser and API both reject invalid geometry. A 700 cm standard configuration still routes to `MANUAL_QUOTE`, but now exposes no customer price.

### Bay journey

The Bay journey now asks for:

- whether a track or pole is already fitted;
- number of sections;
- width of each section;
- finished drop;
- pair/single construction;
- opening/stack preference;
- heading, fabric and lining; and
- an optional photo in the customer UI, subject to the Window Type evidence rule used at submission.

It does not ask for bay angles. `total_coverage_width` is derived exclusively from the sum of section widths. The current validation requires 2–8 sections, one width per section, positive/plausible widths of 10–600 cm, and a total within the supported curtain-routing limits. This keeps curtain pricing separate from future track-engineering or fitting work.

The reference Bay case — sections 80 + 180 + 80 cm, 220 cm drop, Dali Mocha, Wave, blackout, pair — returns `PRICE_WITH_REVIEW`, six fabric widths, 18.9 m and a provisional VAT-inclusive price of £1,004.

### Relevant fields only

Standard rectangular journeys no longer show specialist drawing/upload copy or unnecessary specialist-review warnings. Window-specific controls are rendered only for the selected `WindowType`. Customer selections are URL-backed and survived the tested Back/Forward and sample-resume journeys.

### Storefront routes

The task-led Inspiration and Help links now resolve to sections in the unpublished homepage instead of 404 routes. Samples resolves to the fabric-library sample section, and the Dawn fabric-library page includes the sample basket. No existing live Page record was repurposed.

## Durable review-request implementation

Bay review and Apex, triangular and gable submissions now enter a staging-only server-authoritative review endpoint. The API recalculates the configuration, verifies a short-lived signed submission token, resolves the Fabric Master record and availability server-side, uploads accepted evidence to a private bucket, then invokes a narrow database function.

Each request stores:

- stable request and configuration IDs;
- Window Type and normalized measurements;
- Fabric Master ID, supplier ID and supplier SKU;
- heading, lining/interlining, pair/single and stack direction;
- fixing position where required;
- customer-safe availability state;
- pricing outcome and provisional price only where allowed;
- calculation version;
- private evidence references and customer notes;
- review state; and
- database-owned submission/update timestamps.

`configuration_id` is unique, making repeated submissions idempotent. A second submission returns the existing receipt rather than creating another request, payment or manufacture instruction. Review history is append-only; submitted content becomes immutable and staff state changes require an actor and reason.

### Review security boundaries

- Review tables use forced RLS. `anon` and `authenticated` browser roles receive no table, function or storage access.
- The service role can read review state but writes only through narrowly granted `SECURITY DEFINER` functions.
- The evidence bucket is private, limited to approved image/PDF MIME types and a 3 MiB object cap.
- The server enforces request/body, file-count and aggregate-size limits and verifies file signatures rather than trusting filename extensions.
- Failed persistence removes newly uploaded objects when it can prove they are not referenced by a committed row.
- The rate limiter stores an HMAC/SHA-256 visitor fingerprint rather than a raw address or browser identifier. Database time defines the hourly window, and missing fingerprint/limit inputs fail closed.
- Supplier costs, prices, raw stock, dye lots, credentials and database secrets are absent from customer payloads and theme storage.

This is a staging submission layer, not yet a complete production upload service. Malware scanning, signed staff retrieval, retention/deletion policy and orphan cleanup remain launch work.

## Database migrations

The following Phase 5B migrations were applied in order to the dedicated CurtainsUK development project and then inspected/tested directly:

1. `20260907153430_phase5b_sanderson_canary_merge_safety.sql`
2. `20260907153457_phase5b_staging_review_requests.sql`
3. `20260907160738_phase5b_review_security_hardening.sql`
4. `20260907165200_phase5b_rate_limit_null_guards.sql`

The migration set adds source-observation provenance and revision-bound catalogue merges, full normalized catalogue observation history, explicit merge conflicts, durable review requests/events, private evidence storage, audited state transitions and a fail-closed submission limiter.

Direct development-database checks passed for:

- expected tables, columns, indexes and constraints;
- `MANUAL_QUOTE` null-price enforcement;
- specialist fixing-position enforcement;
- database-owned timestamps;
- idempotent request creation;
- append-only event history and immutable submitted content;
- audited staff transitions;
- old broad RPC signatures removed;
- service-role-only execution and forced RLS boundaries;
- anonymous/authenticated denial;
- private evidence bucket configuration; and
- null fingerprint/limit rejection.

The destructive portions of the database test were exercised in a transaction and rolled back.

## Sanderson merge-safety correction

The bulk-apply path now keys relationships by stable supplier ID/SKU and permanent Fabric Master ID, not by fabric names. It uses a current-master comparison plus the expected existing `updated_at` revision and row locking at apply time.

Deterministic precedence is:

1. A newer verified commercial observation wins.
2. An authorised catalogue import may enrich missing identity/specification fields.
3. An older source cannot overwrite a newer master revision.
4. An import cannot downgrade `VERIFIED` pricing, a known lifecycle, approved imagery/sample state, or storefront selection.
5. Conflicting commercial changes are retained as explicit pending merge conflicts rather than silently applied.

Every applied row appends its normalized source record, merge action, protected fields and provenance to catalogue history. Existing IDs must match on update; insert collisions and changed revisions fail the batch. The verified Sanderson pilot `DAPGPA203` is excluded from the canary and must compare as `PRESERVE_NEWER_EXISTING`; pre/post-apply fingerprints proved it remained unchanged.

Before the approximately 9,600-row import, the apply path should also receive a deliberate concurrent-writer database test and stricter database-clock validation of future source timestamps.

## Sanderson canary

Source: the authorised Sanderson Design Group All Product Data XLSX previously inspected in Phase 5A. It contains 15,550 products, 9,818 eligible target-brand fabric rows and 9,680 safely mapped catalogue/specification records. Its embedded observation is from February 2026, so its stock and lifecycle fields were not treated as current.

Exactly 50 new, unique, catalogue-quality colourways were selected deterministically across six brands:

| Brand | Canary colourways |
| --- | ---: |
| Sanderson | 9 |
| Harlequin | 9 |
| Morris & Co. | 8 |
| Zoffany | 8 |
| Scion | 8 |
| Clarke & Clarke | 8 |
| **Total** | **50** |

Canary fields include supplier SKU, brand, collection, design, colour, full width, repeat/pattern match and composition where explicitly present in the workbook. Missing usable width, imagery, sample state, commercial price, current stock and current lifecycle remain unknown rather than inferred.

All 50 records are:

- `PRICE_REQUIRES_VERIFICATION`;
- not storefront-selectable for pricing;
- staging-catalog-visible for controlled UX review;
- lifecycle `UNKNOWN`; and
- represented by 50 append-only import observations.

The customer-safe catalog now contains 54 unique fabrics: four verified/configurable pilot fabrics plus the 50 blocked Sanderson canaries. The Dawn browser exposes the same search/filter, exact-SKU sample-intent and configurator architecture for both suppliers. A canary cannot be priced through a direct URL or direct API request.

## End-to-end evidence

| Scenario | Verified result |
| --- | --- |
| Standard + Prestigious | 200 × 220 cm, Pencil, Standard, pair: `INSTANT_PRICE`, 4 widths, 10.2 m, £834, availability to be confirmed |
| Standard + Sanderson | 200 × 220 cm, Wave, Blackout, pair: `INSTANT_PRICE`, 4 widths, 10.6 m, £1,161, availability to be confirmed |
| Bay without angles | 80/180/80 cm, 220 cm drop, Wave, Blackout, pair: `PRICE_WITH_REVIEW`, 6 widths, 18.9 m, £1,004 provisional |
| Apex | Valid geometry returns review route, no numeric customer price, payment/manufacture blocked |
| Triangular | Valid geometry returns review route, no numeric customer price, payment/manufacture blocked |
| Gable | Valid geometry returns review route, no numeric customer price, payment/manufacture blocked |
| Oversized standard | 700 cm width returns `MANUAL_QUOTE`, with all customer price fields null |
| Unverified canary | Visible for catalogue review but rejected by price and specialist endpoints |
| Invalid specialist geometry | Zero/negative/inconsistent dimensions return HTTP 400 |
| Invalid Bay | Bad section counts/widths return HTTP 400; angles are absent from the contract |
| Sample/resume | Exact supplier SKU/design/colour and Window Type survive the staging sample intent; no order is created |

The deployed catalog check returned HTTP 200, contract schema `2.0`, staging environment, checkout disabled, 14 Window Types and 54 unique fabrics. Public responses passed a supplier-commercial leakage scan and carried the intended CORS, `no-store` and `noindex` controls.

Real Chrome verification confirmed that Dawn could retrieve the cross-origin staging data, calculate an exact server price, show VAT and delivery wording, render the 54-fabric browser and preserve form state with Back/Forward navigation. The Samples task link resolved to the exact sample section. At 390 × 844, configurator controls remained touch-sized and the page had no horizontal overflow.

A synthetic Apex persistence smoke test also crossed the deployed review boundary with a checked-in test image. It created request `25e3ab94-18e6-4849-aca3-ee4aaf99296b` in `PENDING`, with one private evidence reference, one append-only submission event, a database-owned timestamp, no provisional numeric price and payment/production blocked. A direct read-only query against the CurtainsUK project confirmed those values.

## Automated verification

- Full repository suite: 116 tests passed, zero failed.
- Dawn theme contract suite: 14 tests passed, including all 14 routes and the curved/bow, corner and awkward/unusual route contracts.
- TypeScript: passed.
- Next.js production build: passed locally and in Vercel; 175 routes/pages generated.
- Vercel Preview HTTP journey matrix: passed for catalog, standard Prestigious, standard Sanderson, Bay, specialist shapes, `MANUAL_QUOTE`, invalid geometry, Bay limits and unverified fabric rejection.
- Shopify Theme Check: zero errors; ten inherited Dawn warnings remain in upstream theme files.
- Development-database migration/security transaction: passed, including the null-rate-limit guard.
- Scoped ESLint and JavaScript syntax checks: passed.
- Diff whitespace check: passed.

## Canary gates

| Gate before wider import | Phase 5B status |
| --- | --- |
| Zero duplicate supplier-SKU collisions | Pass for the 50-row canary |
| Zero verified-record downgrades | Pass; `DAPGPA203` unchanged |
| Supplier-commercial data absent from public responses | Pass |
| Collection/design mappings structurally valid | Pass for selected rows |
| Pricing eligibility correct | Pass; all 50 remain blocked |
| Lifecycle state not overstated | Pass; all 50 remain `UNKNOWN` |
| Dawn catalog/search/filter performance acceptable | Pass for 54 records on tested desktop/mobile paths |
| Authorised images resolve | **Blocked**; workbook supplies no imagery for the 50 canaries |

The wider import must not proceed until every gate passes.

## Screenshots

Customer-safe Chrome captures are attached to the Phase 5B task handoff for:

- the unpublished Dawn homepage with the repaired task navigation;
- the 54-record multi-supplier browser, including a configurable Sanderson pilot beside blocked Morris & Co. canaries;
- a real Sanderson standard result at £1,161;
- the Bay 80/180/80 journey with no angle input and a £1,004 provisional review price;
- the 700 cm `MANUAL_QUOTE` result with no numeric price; and
- the completed 390 × 844 journey, with no horizontal overflow and all visible controls at least 44 px high.

The browser extension did not have local-file URL permission, so it could not attach the test image through the visible Chrome file chooser. The same deployed review endpoint was therefore exercised by the committed staging smoke script, and the resulting durable request/evidence/event were verified directly in PostgreSQL. No production or customer file was used.

## Remaining launch blockers

1. Obtain/map authorised current imagery for the 50 Sanderson canaries; placeholders are acceptable only for staging QA, not launch or wider import approval.
2. Verify Sanderson commercial prices and current lifecycle/availability from an authorised current source. The February workbook is catalogue/specification evidence only.
3. Put the public staging path behind a signed first-party Shopify app proxy (or equivalent request authentication) and bot protection. An Origin allow-list is a browser control, not caller authentication.
4. Add evidence malware scanning, signed staff retrieval, retention/deletion policy and orphan cleanup before accepting real customer files.
5. Provision and test the staff triage workflow, response SLA and permitted review-state transition policy.
6. Run a database-level concurrent-import race test and add database-clock future-source-time enforcement before the remaining Sanderson bulk apply.
7. Verify remaining Prestigious cut prices and expand authorised Prestigious colourway imagery/data.
8. Design and approve the three checkout gates; checkout remains disabled for instant, review and specialist journeys.
9. Complete production analytics, UK shipping, accessibility/device coverage, Merchant Center/feed and operational acceptance testing.
10. Resolve the repository-wide pre-existing lint debt separately; scoped Phase 5B checks should remain clean.

Phase 5B remains unpublished and non-production.
