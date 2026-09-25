# Prestigious Standard Price correction — 15 September 2026 (superseded)

> Superseded on 25 September 2026 by the owner's clarification that CurtainsUK
> uses Prestigious Textiles Cut Price. See `PT_CUT_PRICE_POLICY_2026_09_25.md`.

## Result
This was the previous commercial-basis decision. The later PDF cohort adds a
source-scoped Cut-only fallback without rewriting source evidence or changing
the existing Standard-price selection.

Code commit: `c762683d348874ceccbcfb62cc3d431e20cc4168`.
Existing approved application baseline: `98fc01d` (Full Width, 72-hour stock validity, >=30m and shared sample/curtain availability).

## Pilot verification
The fixed cohort is the original 219 imported colourways: 203 current and 16 discontinued. No new records or collections were imported.

| Measure | Before database correction | After |
|---|---:|---:|
| Current pilot colourways | 203 | 203 |
| Approved price ready | 32 | 203 |
| Price + current stock ready | 32 | 186 |
| Out of stock | 17 | 17 |
| Discontinued, hidden | 16 | 16 |

All 203 current colourways passed a read-only replay through the actual supplier-price selector and curtain-consumption/pricing engine using database-read-back Standard Prices. The calculation used supplier Full Width, never legacy Usable Width.

Controls:
- Heidi Graphite 3526/912: GBP24.40/m ex VAT; Full Width 140cm; Free Stock 101m; current to 18 September 2026 13:50:10 UTC.
- Demi Canvas 8838/142: GBP10.40/m ex VAT; Full Width 144cm; Free Stock 260m; current to 18 September 2026 13:54:15 UTC.
- Both pass approved-price and AVAILABLE stock checks.

### Remaining customer-facing limitation
Only 32 pilot colourways currently pass the existing storefront sample/MTM readiness model. A further 154 current, stock-available fabrics (including both controls) have not had their privately validated images associated with the storefront or catalogue visibility enabled. They have genuine price, stock and usable calculation specifications, but are not yet selectable by customers. Public Heidi detail correctly remains 404 under that existing visibility rule.

This patch does not change imagery or catalogue activation. It would be inaccurate to report 186 customer-orderable pilot fabrics. No price, stock or sample flags were fabricated to bypass visibility.

## Hosted verification
Project: `curtainsuk-staging-api`, ID `prj_vl2GLLlSf0AJAKqjs1Nk26ipKHBA`.
Deployment: `dpl_Dbh9TKJbk7TMbhfXHLR29yhLDUMS`.
URL: https://curtainsuk-staging-inbgrxbyz-hamzas-projects-4ef62f35.vercel.app
Existing gateway alias updated: https://curtainsuk-staging-gateway.vercel.app
Vercel target/environment remains preview; project settings, secrets and feature flags were not changed. No Shopify theme was deployed or edited.

Rollback deployment retained: `dpl_FkpWDqCxhmPeXxLGPQmX2tAPscg3`, https://curtainsuk-staging-6deoxoq01-hamzas-projects-4ef62f35.vercel.app

Read-only public Shopify proxy test for existing visible pilot SKU 4227/192:
- Same Standard window, 180cm track width, 210cm drop, pencil pleat, standard lining, pair.
- Before: MANUAL_QUOTE / PRICE_CONFIRMATION_REQUIRED, no numeric price.
- After: HTTP200, INSTANT_PRICE, GBP541 goods, 11.8m, ORDER_READY, stock not stale.
- Hosted price and metres exactly match the local real-evidence replay.
- Visible pilot retail detail and HCI entry return HTTP200.
- Unsigned direct gateway requests remain HTTP401.
- Public checked responses contain no supplier commercial price/stock fields.
- Five runtime log entries checked after deployment; no observed 504/520, database or readiness failures.
- No checkout, Draft Order, customer order or supplier order was created.

## Evidence preservation
Before/after database digests are identical for:
- 481 PT supplier snapshots;
- 481 PT price rows;
- 962 PT promotion events;
- all 15 existing configuration snapshots.

Pilot Standard Prices and null Cut Price fields are unchanged. Original Webtex evidence and private image files were not modified. Source evidence/verification exports remain in ignored private artifacts.

## Changes
- Supplier-specific approved-price selector and its repository query.
- Existing pricing and checkout-readiness consumers use the supplier-specific selector; checkout still does not reprice approved configurations.
- Three existing SQL functions now select Standard for PT and retain Cut for other suppliers.
- Migration: `20260915152734_prestigious_standard_price.sql`.
- Read-only SQL assertions: `supabase/tests/prestigious_standard_price.sql`.
- Regression tests cover both controls, Standard-vs-Cut precedence, rejection of Cut-only PT evidence, approval/revocation, age-independent approved prices, newer approved prices, source immutability and unchanged SDG basis.

## Validation
- Tests-first: new tests reproduced the defect before implementation.
- Final npm test: 314 test executions, all pass.
- Changed-file ESLint: pass.
- Clean tracked-source TypeScript check: pass.
- Hosted Next.js build/typecheck: pass.
- Read-only database assertions: pass.
- 203/203 real current pilot pricing/consumption replays: pass.
- The ordinary workspace typecheck also picks up an unrelated ignored pilot helper's existing TS7022 error; the clean deployment source excludes private pilot files and passes.
- A local isolated build could not resolve dependencies outside its Turbopack root; the actual hosted build installed its own dependencies and passed. No application config was changed to work around that local environment issue.

No scaling, theme edits, theme publication, recommendation changes or evidence rewrites.
