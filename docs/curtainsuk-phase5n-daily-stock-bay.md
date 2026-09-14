# CurtainsUK daily stock and Bay instant orders

## Launch operation update — 14 September 2026

The **CurtainsUK owner/admin** is responsible for the morning supplier refresh every trading day until unattended retrieval is implemented. Obtain genuine current source data, import and approve it, then apply it at `/admin/daily-stock`. Inspect coverage per supplier/SKU; a partial successful supplier run does not establish stock for unrefreshed fabrics.

Manual application records the authenticated operator UUID, UK snapshot date, completion timestamp and per-supplier success/failure/coverage in private append-only `daily_stock_refresh_events`. Original supplier checked timestamps remain separate. Historical runs are not assigned an invented operator. Scheduled materialization is not a supplier login or retrieval.

Purchases fail closed unless the fabric has a successful genuine snapshot dated **today in Europe/London**, including before 06:00. Yesterday, future dates, missing data and failed refreshes cannot authorize purchase. Last successful source data is retained; a failure is not out-of-stock. The strict aggregate >30m floor and confirmed-order deductions remain unchanged.

Validation: regression reproduced the pre-06:00 defect before correction; current-date/future-date/failed-refresh and floor/Bay tests pass. Full npm tests pass. Database rollback test verifies operator/time logging, null-operator rejection, append-only history, denied anonymous/customer access and unchanged existing snapshots. No synthetic refresh/operator record is retained.

The historical report below describes its original staging phase, not current theme publication or operational ownership.

13 September 2026. Same branch: `feature/curtainsuk-phase-5a-prelaunch`.

The branch was pushed before implementation. Initial remote HEAD was `3df343b5397c95956f13abc7d5dad7780ef8bba3` at https://github.com/Nylon1/Apexcurtains/tree/feature/curtainsuk-phase-5a-prelaunch . No additional PR was created and nothing was merged.

| Area | Status | Evidence |
|---|---|---|
| Initial GitHub push | PASS | Exact remote HEAD verified before edits |
| Daily snapshot persistence | PASS | Private dated aggregates, optional cut price and original checked timestamp |
| UK-morning snapshot processing | PASS | Cloud pg_cron job active; 06:00 Europe/London gate accounts for GMT/BST |
| Unattended supplier refresh | BLOCKED | No executable unattended PT/SDG stock source configured |
| 30m stock rule | PASS | Strict >30 boundary, deductions, stale retention, no public quantities |
| Confirmed usage | PASS | Staff workflow; immutable-configuration metres; duplicate confirmation deducts once |
| Bay instant pricing | PASS | Real 80/182/80 cm sections, 220 cm drop; no angles or mandatory approval |
| Desktop / mobile | PASS | Actual Dawn to development Draft #D9, exact total and mobile repeat recovery |
| Existing price immutability | PASS | Previous drafts and configuration snapshots unchanged |

## Daily stock behaviour and the remaining source blocker

Customer pricing, specialist availability and checkout now read the saved aggregate stock position. They no longer run quantity-specific piece/batch/dye-lot decisions. Supplier-sync history is retained privately; old code remains available for non-v1 uses.

`effective_stock = saved_aggregate_metres - confirmed_usage_since_baseline`. Greater than 30 is available; 30 or below displays **Currently unavailable**. Supplier metres and the threshold are never included in public responses. Missing observations are unknown, not zero. Known discontinued records remain hidden, including explicit discontinued observations inserted into daily snapshots.

A failed morning leaves the last successful baseline unchanged and marks it stale. Consumption is retained against that baseline until a successful replacement arrives; midnight during an outage does not restore previously consumed metres. A new successful baseline resets/recalculates deductions from its observation timestamp. Staff-confirmed usage is keyed uniquely by immutable configuration and order, recorded once, and never caused by samples, enquiries or unpaid Draft Orders.

The private staff page `/admin/daily-stock` records confirmed usage from an actual Shopify **Order** reference and immutable configuration ID. Staff must verify the order before confirming; this is a manual operational confirmation, not a new paid-order webhook. The server derives metres and supplier identity from the stored configuration. It does not accept customer quantities or alter supplier price/stock history. Anonymous access is denied. A duplicate-confirmation SQL test ran in a transaction that was rolled back; no fictitious order usage was retained.

The active cloud job **materializes newly landed approved supplier observations** at approximately 06:00 UK time. It does not itself log into supplier portals or obtain fresh data. The existing Prestigious adapter only reads manually saved observations; the SDG stock adapter is type-only. These cannot honestly be called a daily supplier refresh.

Four genuine existing stock observations were preserved with original dates: three older Prestigious observations and the SDG pilot checked on 13 September. The first materialization recorded PT FAILED (no current observations) and SDG SUCCESS for one record only. This does not establish full-catalogue stock coverage or claim that a new portal fetch occurred. All other fabrics retain unknown stock until an authorised source supplies it.

**Exact remaining blocker:** connect an authorised unattended PT and SDG stock/price API/export or implement an agreed scheduled portal collector. Feed outputs must pass the existing normalized observation/approval process before the daily job can use them. No supplier credentials, cookies or tokens have been stored in Git. The source question remains open; no prices or fresh timestamps were invented.

## Bay browser proof

Real Sanderson Painters Garden, Violet/Crimson: three sections 80/182/80 cm, drop 220 cm, pencil pleat, standard lining, pair. Normal manufacturing logic sums coverage to 342 cm and returns £1,657 goods. Mainland SW1A 1AA adds £12.95; **Draft #D9 totals £1,669.95 including VAT**. Its immutable snapshot is INSTANT_PRICE with no review request/revision. Both 1280px desktop and 390px mobile were exercised. Mobile has no horizontal overflow. Refresh restored section widths and fabric; repeat handoff recovered the same Draft rather than creating another.

One transient Shopify-proxy catalogue HTTP 500 occurred during refresh. A reload recovered the saved configuration; no customer state or order was lost. This was not reclassified as unavailable stock. The development checkout explicitly says it cannot accept payments and Pay now is disabled.

Apex/triangular/gable remain specialist routes. Bay invalid measurements reject; missing price requires confirmation; unavailable daily stock blocks purchase; genuine specialist delivery still needs a reviewed quote. Bonded Bay lining uses the ordinary combined-layer price without a compulsory review merely for selecting it. Existing specialist/pattern/making exceptions remain manual, not provisional ordinary Bay prices.

## Verification and preserved controls

Full npm tests passed, plus the new daily-floor/checkout boundary regression. TypeScript, changed-file ESLint and preview builds passed. SQL usage deduplication was tested with rollback; anonymous database and staff endpoint access was denied. Immutable prior #D1/#D3/#D4/#D5/#D6/#D7/#D8 amounts were compared after #D9 and were unchanged. The in-memory supplier price-change proof was rerun without writing supplier prices. Final secret scan accompanies the commit.

Owner-editable shipping stays £12.95 Mainland / £19.95 Highlands & Islands / £19.95 Northern Ireland. Bonded interlining remains £5/m as one combined layer. Review email remains enquiries@curtainsuk.com. Draft creation claims, signed price confirmation and review capabilities remain intact.

Dawn 182264234363 stays unpublished. Minimal, real payments, Merchant Center and supplier ordering were not changed. The gateway points only to a Vercel preview. No new production supplier scheduler has been enabled; this is private staging snapshot processing.

Evidence: `artifacts/phase5m/phase5n-browser-proof.json`, `phase5n-daily-status.json`, `phase5n-bay-desktop.png`, `phase5n-bay-mobile.png`, `phase5n-bay-mobile-checkout.png`, `phase5n-staff-stock.png`, full test log and the existing immutable/readback artifacts.
