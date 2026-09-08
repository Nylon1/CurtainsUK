# Confirmed bonded layer and blocked shipping preflight

Owner confirmation: bonded interlining costs GBP 5 per metre as one complete combined lining/interlining layer. It does not add an ordinary lining cost. This follows the existing net material-cost convention; retail VAT is calculated by the normal engine.

Implemented as `lining: BONDED`, `interlining: NONE`. The new option reuses the existing staging material width (1,380 mm), top/bottom allowances and labour basis. No separate lining or interlining material is added. A contradictory request for BONDED plus separate INTERLINING fails both configuration validation and direct pricing. Old separate-interlining configurations are not reinterpreted. Pricing version `2.3.0-draft.1` supersedes `2.2.0-draft.1`; saved approved/order snapshots are not rewritten. This is still a draft staging rule, not production activation.

## Read-only real-fabric preflight

Exact Sanderson fabric `sdg-dapgpa203` (Painters Garden, Violet/Crimson), using its currently approved cut-price basis and the existing unexpired supplier availability evidence:

| Configuration | Face metres | Goods including VAT | Net | VAT | Stock for quantity |
| --- | ---: | ---: | ---: | ---: | --- |
| Standard 200 × 220 cm pair, pencil, standard lining | 10.6 | GBP 1,105 | GBP 920.83 | GBP 184.17 | FABRIC_AVAILABLE |
| Same pair with complete bonded layer | 10.6 | GBP 1,124 | GBP 936.67 | GBP 187.33 | FABRIC_AVAILABLE |
| Bay 80/180/80 × 220 cm pair, pencil, standard lining | 15.9 | GBP 1,657 provisional | GBP 1,380.83 | GBP 276.17 | FABRIC_AVAILABLE |

No amount above includes delivery. Manual Quote initial customer price remains null. A simulated higher supplier cost changed only a new calculation; existing results remained byte-for-byte unchanged. The simulated cost was never written to supplier history. These are calculation checks, not proof of remote Draft Order immutability.

## Shipping is still absent

Owner approval to apply the agreed matrix has been received, but the numerical matrix and operational rules are not present in this conversation or `config/curtainsuk-shipping-owner-inputs.json`. A fresh read of `staging_shipping_rate_versions` also found every current rate null, including all nine active region/class cells. Historical specialist cells remain unchanged. No fixture delivery rate was treated as owner-approved.

Required input: UK Mainland, Highlands/Islands and Northern Ireland × standard/large/oversize gross charges; postcode mappings; parcel size/weight thresholds and maximums; and the packing rules that map curtain quantities/drop to a parcel. The existing staff-approved manual override requires an exact quote and configuration/revision reference.

| Route | Status | Reason |
| --- | --- | --- |
| INSTANT_PRICE → remote test Draft Order | BLOCKED | Shipping charge/rules unavailable |
| PRICE_WITH_REVIEW → remote test Draft Order | BLOCKED | Shipping prerequisite unavailable; final staff approval/order sequence not repeated |
| MANUAL_QUOTE → remote test Draft Order | BLOCKED | Shipping prerequisite unavailable; final staff quote/approval/order sequence not repeated |
| Remote approved order price immutability | BLOCKED | No remote Draft Orders created in this run |
| Combined bonded-layer calculation | PASS | GBP 5/m once; duplicate layer rejected |

Tests: two new regressions failed before implementation and pass afterward. Decision engine 24/24, storefront 109/109, fabric master 47/47, TypeScript pass. The existing Bay golden calculation retains every numeric expectation; only its current pricing version changes. Detailed real preflight: `artifacts/phase5l-owner-inputs/preflight.json`.

No deployment, Dawn publication, Shopify write, payment change, database write, Merchant Center activation or supplier order occurred in this correction. The mailbox-only remote deployment remains intact. Bonded code/theme changes are committed locally pending completion of shipping inputs and the full staging rehearsal. HCI PR #21 and its checkout were untouched.
