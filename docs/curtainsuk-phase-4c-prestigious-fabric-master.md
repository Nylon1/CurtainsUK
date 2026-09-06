# CurtainsUK Phase 4C — Prestigious Fabric Master and stock verification

Status: unpublished staging implementation only

Date: 2026-09-07

Shopify target: CurtainsUK Phase 4A Dawn 16, theme ID `182264234363`

## Outcome

The synthetic customer catalogue has been replaced with a controlled pilot of 20 real Prestigious Textiles Formation colourways. Public catalogue data is separate from supplier-commercial records. The decision engine only receives a face-fabric cost after a colourway cut price has been manually verified.

Webtex remains a manual verification source. No Webtex endpoint, cookie, token or credential is used by the application.

Where the August PDF and the current authorised portal observation differ, the current observation is retained with source provenance. This applies to Escher's 145 cm full width; its 140 cm usable width is unchanged.

## Sources and mapping

| Source | Fields used | Handling |
|---|---|---|
| Prestigious August 2026 PDF price/spec list (`Default.aspx.pdf`) | design code, collection, full width, usable width, vertical repeat, composition, care code, usage code, design-level price | Public technical data; design-level price copied only to the private reference field and never treated as a verified colourway cost |
| Official Formation Shopify CSV/XLSX export | design, colour, stable SKU, legacy image reference | Public pilot catalogue and exact sample intent; legacy paths were mapped to the current official Formation image location and all 20 pilot images were verified reachable |
| Official discontinued CSV exports identified in Webtex | SKU lifecycle transitions | Parser and non-destructive transition logic implemented; application of a current export awaits a supplied file/run |
| Manual Webtex observations | current standard price, cut price, aggregate stock, pieces and timestamp | Private server/admin record only |

The stable join key is the Prestigious SKU in `design-code/colour-code` form, for example `4269/147`.

## Pilot colourways

| Design | Design code | Colours / SKUs |
|---|---:|---|
| Escher | 4269 | Mocha `4269/147`, Canopy `4269/658`, Mercury `4269/934`, Angora `4269/975` |
| Dali | 4270 | Mocha `4270/147`, Woodrose `4270/217`, Canopy `4270/658`, Mercury `4270/934`, Angora `4270/975` |
| Diez | 4271 | Mocha `4271/147`, Woodrose `4271/217`, Canopy `4271/658`, Mercury `4271/934`, Angora `4271/975` |
| Sarcone | 4272 | Mocha `4272/147`, Woodrose `4272/217`, Canopy `4272/658`, Mercury `4272/934`, Angora `4272/975` |
| Varini | 4273 | Mocha `4273/147` |

Only the three portal-observed Mocha colourways have `VERIFIED` cut prices. The other 17 are `PRICE_REQUIRES_VERIFICATION`; the engine refuses to calculate them. A PDF/design price is never silently promoted to a verified colourway price.

## Public and private boundaries

Public `PrestigiousPublicFabric` data contains supplier, collection, design, colour, SKU, full/usable width, repeats, composition, care/use codes, image, sample availability, lifecycle, coarse availability and price-readiness status.

Private `PrestigiousPrivateSupplierRecord` data contains standard trade price, cut trade price, PDF design reference price, costing price, free stock, batch references, usable metres by batch, pieces, next-due data, notes and verification timestamp.

Only the private server-side resolver can attach `costingPriceUsedExVat` to a temporary FabricSpec for calculation. The Shopify catalogue contract explicitly projects allowed fields and its tests scan for private field names. The Dawn theme never receives direct cost or supplier stock quantities.

## Stock decision

```text
required curtain metres
        |
        v
current verification? -- no --> UNKNOWN --> Availability to be confirmed
        |
       yes
        |
one compatible batch has enough usable metres?
        | yes                         | no
        v                             v
AVAILABLE / LOW_STOCK       aggregate enough across batches?
                                      | yes
                                      v
                           INSUFFICIENT_SINGLE_BATCH
```

The internal states are `UNKNOWN`, `AVAILABLE`, `LOW_STOCK`, `INSUFFICIENT_SINGLE_BATCH`, `DUE`, `TEMPORARILY_UNAVAILABLE` and `DISCONTINUED`. Aggregate stock never proves manufacturability. One compatible dye lot must cover the calculated requirement.

The freshness default is 24 hours. Once older than 24 hours, an otherwise positive record becomes `UNKNOWN` for customers.

Customer labels are limited to:

- Fabric available
- Limited availability
- Available soon
- Availability to be confirmed
- Temporarily unavailable
- No longer available

## Manual staff workflow

The protected `/admin/prestigious-stock` staging page lets an authenticated staff user search by design, colour or SKU, enter the required curtain metres, inspect the last private verification, open the normal Prestigious Webtex page, and record:

- total free stock;
- batch reference and metres in that batch;
- pieces;
- next-due date and quantity;
- current standard and cut prices;
- notes and verification time.

The pilot store is process-memory only. It is intentionally non-production and does not submit anything to Prestigious. A private database table, row-level access policy, audit trail and staff-role check are required before multi-user staging or production use.

## Example real-fabric price

Configuration: 200 cm track width, 220 cm drop, pair, Pencil Pleat, Standard lining, Escher Mocha `4269/147`.

| Component | Result |
|---|---:|
| Face-fabric widths | 4 |
| Face-fabric metres | 10.2 m |
| Verified cut cost | £30.50/m net |
| Face-fabric cost | £311.10 net |
| Lining metres / cost | 10.2 m / £40.80 net |
| Make-up | £100.00 net |
| Heading adjustment | £0.00 |
| Direct cost | £451.90 net |
| Selling price at 35% target margin | £695.23 net |
| VAT | £139.05 |
| Unrounded gross | £834.28 |
| Customer total | **£834** |

Delivery remains separate and checkout remains disconnected. The current manual observation did not include a confirmed single-batch quantity, so the customer availability result is “Availability to be confirmed”.

## Lifecycle handling

The discontinued import matches stable supplier SKU values and changes an active record to `RETIRED` / `DISCONTINUED`. It does not delete records. Storefront selection filters retired colourways, while historical configuration and order identifiers remain resolvable.

## Shopify/Dawn state

The Dawn fabric browser now renders real Prestigious imagery, design, colour, collection, composition, usable width, repeat, sample action and coarse availability. Sample intents persist the exact SKU. The configurator still delegates pricing, compatibility, stock and complexity decisions to controlled endpoints.

No product, variant, metafield, checkout, Merchant Center or live Minimal-theme record was changed.

## Remaining blockers

1. Manually verify cut price for the remaining 17 pilot colourways.
2. Record current batch-level usable metres for any colourway that should display as available.
3. Supply/run the latest official discontinued CSV; the portal export was not present in the local project files during this build.
4. Add a private staging database table with audit history and Supabase RLS for persistent staff verification.
5. Confirm whether multiple pieces carrying the same supplier batch reference can be combined safely for a single curtain job.
6. Confirm low-stock headroom (pilot code uses 5 m above the calculated requirement).
7. Map care/usage codes to approved customer wording rather than exposing only the supplier codes.
8. Confirm horizontal repeat and weight for Sarcone and Varini from an authorised current source.
9. Confirm sample price, postage, fulfilment and resumption policy before enabling sample checkout.
10. Complete a production security review and role-based authorisation before any activation.
