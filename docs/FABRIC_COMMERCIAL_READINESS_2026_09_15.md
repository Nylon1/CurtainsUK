# CurtainsUK commercial readiness correction

Scope: Nylon1/CurtainsUK. No Shopify theme files, products, payments, orders, design or HCI ranking were changed. Theme 182310502779 remains the development target. Database migrations below are applied; application changes are local and require a deliberate deployment before the hosted application uses these rules. No application deployment or GitHub push was performed.

## Governing rules

- Genuine stock evidence remains current through 72 hours, inclusive. Future/missing timestamps cannot establish availability.
- At least 30m is AVAILABLE; less than 30m is OUT OF STOCK — AWAITING SUPPLIER STOCK. Existing confirmed CurtainsUK usage since the observation remains deducted; no batch/piece/dye-lot gate.
- A failed retrieval retains the last genuine observation. It remains usable until 72 hours have elapsed, then CHECK AVAILABILITY.
- Known discontinued records remain hidden and ineligible. Unknown lifecycle does not mean discontinued.
- AVAILABLE enables normal samples without any per-SKU sample flag. Missing curtain trade price does not block a sample at the genuine Shopify sample price. The signed exact-fabric identity and existing sample-product checks remain.
- Latest genuine validated, approved GBP cut price remains usable until superseded or explicitly revoked. Historical expiry fields remain intact but do not expire approval/prices. No annual list price was fabricated or inferred from Shopify retail prices.
- Calculations use `full_width_mm` (the stored supplier fabric width). Legacy `usable_width_mm` is retained but ignored for this rule. No documented exceptional override was found.
- Browse/recommend eligibility remains separate from commerce. HCI ranking is unchanged; presentation withholds discontinued records and displays the actual commercial status.

## Before → after

Database evidence captured 2026-09-15 at 12:18 UTC. This is the same 9,938-record master, with no new source observations. Figures compare previous gates with the implemented policy, not a claim that the hosted application has already been deployed.

| Measure | Before | After |
|---|---:|---:|
| Available fabrics | 0 | 2 |
| Check availability | 9,013 | 9,011 |
| Out of stock | 0 | 0 |
| Discontinued, hidden | 925 | 925 |
| Automatic calculator-ready, within the 6,328 browsable records | 265 | 6,078 |
| Genuine approved price-ready | 2 | 251 |
| Governed sample-order ready | 0 | 2 |
| Automatic made-to-measure ready, before configuration-specific delivery | 0 | 2 |

The old catalogue displayed 265 positive sample flags; that was not 265 currently orderable samples. Browsable remains 6,328. 2,685 non-discontinued records remain unmapped/non-browsable under existing image/identity governance.

## Real-record verification

| Fabric | SKU | Current result |
|---|---|---|
| Sadira Lagoon | 4262/770 | AVAILABLE; genuine price; sample and automatic MTM eligible. Stock checked 2026-09-14 08:48:17 UTC. Supplier width 147cm used instead of legacy 140cm. |
| Escher Mocha | 4269/147 | CHECK AVAILABILITY; genuine approved price remains usable. Stock observation from 6 September is stale. Supplier width 142cm. |
| Dali Mocha | 4270/147 | CHECK AVAILABILITY; genuine approved price remains usable. Stock observation from 6 September is stale. Supplier width 146cm. |
| Painters Garden Violet/Crimson | DAPGPA203 | AVAILABLE; genuine price; sample and automatic MTM eligible. Stock checked 2026-09-13 04:50:04 UTC. Supplier width 138cm. |
| Simi Spring | DAEG222949 | DISCONTINUED; excluded from browse/recommendation/sample/order. |
| Baroque Trellis Daffodil/Linen | DART236359 | DISCONTINUED; excluded from browse/recommendation/sample/order. |
| Zoffany Leighton Ink | ZALD332700 | CHECK AVAILABILITY; no approved price; existing unresolved image mapping means it remains outside normal browsing. Its 136cm supplier width is not the blocker. |

## Implementation and database changes

- Shared stock/readiness functions now drive retail detail, sample checkout preparation, configurator catalogue, pricing, supplier projection and staff review metadata.
- Private `fabric_commercial_evidence` RPC returns bounded availability/price flags. Retail search/sample filters use the same 72h/30m rule and stay paginated. Missing commercial reads fail closed for orders without taking browsing offline.
- Latest-price lookup pages through historical evidence, so repeated stock-only observations cannot displace an older approved price from a fixed candidate window.
- Approval validation accepts genuine stock-only observations without inventing a price and preserves historical genuine price evidence. Known-SKU validation now uses canonical Fabric Master instead of the incomplete legacy supplier-link table.
- Authorised SUPPLIER_ADMIN can run the existing operator refresh outside STAGING. Authentication, mutation origin checks and rate limits remain enforced.
- Operational stock rows can be superseded by newer approved observations. Private append-only history retains originals and corrections; source fields must match approved evidence. Older observations and arbitrary edits are rejected.
- Coverage reports distinguish scheduler/materialisation execution from genuine supplier coverage. No supplier retrieval automation was added, no alerts were sent, and no operator refresh was falsely recorded.
- Database promotion/immutable-configuration functions no longer require age-based price expiry or legacy CURRENT/VERIFIED catalogue flags. Genuine approved price provenance and immutable order snapshots remain required.

Applied migrations:

- `20260915121859_fabric_commercial_readiness.sql`
- `20260915122801_stock_revision_source_consistency.sql`

## Verification

- `npm test`: all suites pass (310 test executions; the theme suite is also included in the storefront glob).
- `npx tsc --noEmit`: pass.
- Changed-file ESLint: pass. Repository-wide lint remains blocked by 21 errors in unchanged legacy files, including posts/gallery, professional workspace, ArloAssistant and LazyFabricQuiz. No unrelated fixes made.
- Production build: pass using inert, non-live Supabase public build settings. A plain build initially failed because this checkout has no Supabase environment configuration. This does not prove a hosted deployment.
- `npm audit`: one existing moderate csv-parse advisory; no dependency changes made.
- Actual curtain-consumption replay over all 6,328 browsable records: 6,078 positive manufacturing requirements, 250 existing half-drop cases, no unexplained failures. Replay uses null supplier price and never invents a customer price.
- `supabase/tests/fabric_commercial_readiness.sql` and `daily_stock_operator_audit.sql`: pass, all writes rolled back. Tests cover the 30m boundary, same-day newer corrections, older-source protection, audit retention, private grants and operator attribution. No test observations remain.
- Live read-only RPC checks confirm the sample filter returns exactly Sadira and Painters Garden; CHECK AVAILABILITY returns the other 6,326 browsable records; out-of-stock filter returns zero.
- Existing source/order evidence retained. Five genuine operational snapshots and five history baselines remain; no test orders or supplier orders created.

## Remaining commercial constraints

1. Genuine stock coverage is incomplete: 1/258 PT and 1/8,755 non-discontinued SDG records currently have evidence within 72 hours. The authorised operator import/approval/materialisation workflow is available in code, but no successful operator refresh event has been recorded. The scheduled job materialises evidence; it does not retrieve supplier data.
2. 9,687 master records have no genuine approved cut-price basis (8,762 non-discontinued). Of the browsable catalogue, 6,077 lack an approved price. They remain discoverable, with purchase requiring a genuine price.
3. 250 browsable half-drop fabrics encounter the existing missing `manufacturing.halfDropMatch` rule. They remain browse/recommend eligible. No new restrictive rule or invented consumption allowance was introduced; a workroom-approved calculation method is needed before automating these cases.
4. One non-browsable record lacks supplier width: Monkey Business Charcoal, F1530/01. No width was guessed.
5. Deploy the application change deliberately before treating the public runtime as updated. No browser checkout/purchase was attempted in this task. Native legacy Shopify fabric-product bypass remediation was not expanded into this rule correction, and is not certified by these server tests.

No additional restrictive business rule was created. Any further manufacturing exception needs owner/workroom confirmation before implementation.
