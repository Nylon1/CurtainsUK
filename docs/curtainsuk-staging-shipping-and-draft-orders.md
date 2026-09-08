# Staging shipping and three Draft Order rehearsals

2026-09-08. Branch: `feature/curtainsuk-phase-5a-prelaunch`.

The owner-approved nine-cell delivery matrix is configured in `config/curtainsuk-shipping-owner-inputs.json` and appended to the existing staging shipping-rate history. The owner can edit money through `/admin/shipping-rates`; postcode and packing rules remain in the versioned JSON configuration. No rate is inferred. A newer owner-edited rate is protected from an older rehearsal import.

| Region | Standard | Large | Oversize |
| --- | ---: | ---: | ---: |
| UK Mainland | £12.95 | £19.95 | £29.95 |
| Highlands & Islands | £19.95 | £29.95 | £44.95 |
| Northern Ireland | £19.95 | £29.95 | £44.95 |

Amounts include VAT. Standard is packed length ≤1,200 mm and weight ≤10,000 g. Large is ≤1,800 mm and ≤20,000 g after Standard is excluded. Beyond either Large limit, or explicitly declared specialist handling, is Oversize. Finished curtain drop is not packed length. There is no invented maximum parcel limit. Optional maximum constraints remain null. Missing/invalid parcel measurements, conflicting region rules and malformed postcodes require manual delivery confirmation.

BT maps to Northern Ireland. HS, IV, KW, ZE, PA20–80, PH15–50, FK17–21 and KA27–28 map to Highlands & Islands. Other UK postcodes default to Mainland. Crown Dependency postcodes JE/GY/IM are outside the UK matrix and require confirmation.

Bonded is one combined lining/interlining layer at £5 net/metre under the existing staging construction basis, without a second lining charge. The review database now accepts BONDED and rejects BONDED plus separate interlining.

## Actual test orders

All use real Sanderson **Painters Garden — Violet/Crimson**, Fabric Master `sdg-dapgpa203`, exact SKU held internally. Existing current supplier-price approval and quantity-specific supplier availability were rechecked for each case. Supplier stock was neither reserved nor ordered. The price-change simulation exists only in memory; no fabricated supplier price observation was written.

| Route | Status | Dev draft | Goods incl. VAT | Delivery incl. VAT | Order total | VAT included | Fabric required |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| INSTANT_PRICE | PASS | #D1 | £1,105.00 | £12.95 | £1,117.95 | £186.33 | 10.6 m |
| PRICE_WITH_REVIEW | PASS | #D3 | £1,657.00 | £19.95 | £1,676.95 | £279.50 | 15.9 m |
| MANUAL_QUOTE | PASS | #D4 | £3,363.00 | £44.95 | £3,407.95 | £567.99 | 31.7 m |

- Instant: standard window, 200 × 220 cm, pencil pleat, standard lining, pair; SW1A 1AA; synthetic packed parcel 120 cm / 10 kg.
- Reviewed: Bay sections 80/180/80 cm × 220 cm, pencil pleat, standard lining, pair; IV1 1AA; synthetic packed parcel 120 cm / 10 kg. Original submission retained, staff revision approved, READY_FOR_CHECKOUT recorded.
- Manual: standard window width 700 cm × drop 220 cm, pencil pleat, BONDED combined layer, pair; BT1 1AA; synthetic packed parcel 190 cm / 21 kg with specialist handling. Initial numeric price absent; staff quote calculated from the real fabric and approved before checkout readiness.

The existing services were exercised against the remote staging database and real Shopify development API. These are server-service order rehearsals with explicitly labelled synthetic packed-parcel evidence, not a claim that physical curtains were packed or that every browser checkout interaction has passed.

Remote readback verified fabric/design/colour, measurements, heading, lining, pair/single, configuration ID, pricing version, review reference, delivery postcode, totals and tax. Supplier SKU stays in the private snapshot; Shopify uses the CurtainsUK configuration SKU. No supplier cost/margin or stock/batch details enter the customer projection.

Every approved database snapshot and remote draft remained unchanged after a simulated £1/metre supplier-cost increase. New configuration calculations became £1,124 / £1,686 / £3,421 goods respectively. Direct-ID retries recovered the same three drafts with no writes. Exact IDs and revision/audit evidence are in `artifacts/phase5l-owner-inputs/draft-rehearsal.json`.

## Issues caught by the real rehearsal

1. A 43-character idempotency tag exceeded Shopify's 40-character limit. The prefix is shortened, preserving the complete UUID.
2. The development store initially calculated zero VAT. UK VAT and shipping VAT calculation were enabled **only on curtainsuk-dev**; no VAT registration number was invented and no payment provider was enabled.
3. Shopify rounds extracted shipping tax directly. The old net-first rounding differed by one penny for £19.95. Contract and database audit now use the same tax-first penny rounding. Existing goods prices remain immutable.
4. Immediate Shopify tag search lag produced duplicate test draft #D2. Only that exact confirmed duplicate was deleted. Recovery now prefers the persisted Draft Order ID and validates the exact financial/reference contract before reuse. Three drafts remain; four were created in total during debugging.
5. The older snapshot constraint omitted LARGE and the older review constraint omitted BONDED. Both were updated in staging with recorded migrations; no history was edited.

## Safety and validation

`curtainsuk-dev.myshopify.com` returned `partnerDevelopment: true`, GBP and tax-inclusive pricing. Its admin displayed “Development stores can only process test payments”. Shopify Payments setup remained incomplete and PayPal inactive. Drafts remain OPEN. No invoices sent, payments captured, supplier orders placed, Merchant Center changes, production Minimal changes or Dawn publication occurred.

Full `npm test`, TypeScript and targeted ESLint passed; the Vercel preview build passed. Tests cover postcode ranges, packed parcel boundaries, nine amounts, missing/ambiguous evidence, bonded double-charge prevention, shipping VAT pennies, tag length, direct-ID retry without create, and immutable pricing.

Private database tables retain RLS and no public policies. Anonymous/customer execution of the checkout audit RPC is denied. Supabase advisory results retain the existing [leaked-password protection warning](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection); no new public access was granted.

## Remaining launch work

- **BLOCKED:** Real customer delivery must have confirmed packed length/weight or a documented packing rule before automatic checkout. Test parcels are not a production packing policy. Approved reviews can retain trusted packed measurements; arbitrary browser parcel classes are ignored. The instant browser path still requires packing confirmation.
- **BLOCKED:** A full browser buying-flow rehearsal remains, including customer acceptance of approved revisions. This run proves the three server-service paths and remote draft contracts. The public staging checkout mode remains disabled.
- Current price/quantity-specific supplier stock must continue to be checked when a real configuration is chosen; availability is not reserved by these drafts.
- Concurrent first submissions and ambiguous network failures before a durable Shopify receipt still need launch-hardening proof. Recovery of an already recorded receipt is verified.
- Launch/payment activation remains subject to explicit owner approval. Dawn remains unpublished.

Rerun the controlled script with `node --import ./scripts/curtainsuk-server-script-loader.mjs --import tsx scripts/curtainsuk-phase5l-order-rehearsal.ts`. It requires the existing local ignored staging credentials and authenticated Shopify CLI. Its JSON checkpoint preserves the three configuration/review/order identities. It never completes a draft or sends an invoice.


## Deployed preview

API: https://curtainsuk-staging-l7ghsigu1-hamzas-projects-4ef62f35.vercel.app through the existing `curtainsuk-staging-gateway.vercel.app` alias. Dawn theme 182264234363 remains unpublished; Minimal 79650455661 remains live and unchanged.

Remote bonded smoke checks passed at 1,229 px desktop and 344 px mobile: £1,124 provisional goods price, current delivery-confirmation wording, enquiries@curtainsuk.com and no real-payment control. Mobile had no horizontal overflow. Screenshots: `artifacts/phase5l-owner-inputs/desktop-bonded-preview.png` and `mobile-bonded-preview.png`. These smoke checks do not replace the remaining full browser order rehearsal.
