# Single-rate staging launch shipping

Owner instruction supersedes the nine-cell launch classification and Phase 5M packing gate.

| Region | VAT-inclusive ordinary delivery |
|---|---:|
| UK Mainland | £12.95 |
| Highlands & Islands | £19.95 |
| Northern Ireland | £19.95 |

BT routes to Northern Ireland. HS, IV, KW, ZE, PA20–PA80, PH15–PH50, FK17–FK21 and KA27–KA28 route to Highlands & Islands. Other valid UK postcodes default to Mainland. Invalid/conflicting postcodes require delivery confirmation. Existing exclusions for non-UK Crown Dependencies remain.

`config/curtainsuk-shipping-owner-inputs.json` selects `SINGLE_RATE`, policy `phase5m-single-rate-shipping-v3`. Ordinary orders use the regional Standard entry internally for compatibility with immutable order history; no customer or staff parcel-class selection, dimensions or weight evidence is required. Rates remain editable through the existing audited staging delivery admin. Large/Oversize rates and thresholds are dormant future configuration, not automatic launch charges. `PARCEL_CLASSES` can be reintroduced after operational validation.

## Delivery after review

Specialist window journeys, configurations exceeding the existing making-review width/drop thresholds, and staff-documented commercial, unusually heavy or specialist delivery flags require **Delivery confirmed after review**. Ordinary Bay review does not itself imply specialist shipping. Fabric GSM/appearance never invents a packed weight.

Before marking a specialist review ready, staff adds an exact `delivery_confirmation` to the existing immutable revision:

```json
{
  "postcode": "BT1 1AA",
  "region": "NORTHERN_IRELAND",
  "gross_amount_minor": 4495,
  "reason": "Example only: replace with the actual approved delivery quote and its source"
}
```

The example is not an automatic rate. Staff quotes require a positive VAT-inclusive amount, valid postcode and matching region, plus the existing authenticated revision/approval trail. The quote is accepted only from the approved server-side revision and only for its exact destination. Customer-supplied amounts/classes cannot override it. Changing the specification creates another revision; it never rewrites an approved order.

## Safety and verification

Staging API and unpublished Dawn only. Shopify test handoffs remain allowlisted to `curtainsuk-dev.myshopify.com`, with partner-development/test-only verification. The app declares `write_draft_orders` as optional so the production shop need not grant it. Dedicated checkout credentials avoid coupling the Draft Order client to the main-store proxy secret. No publication, payment-provider activation, invoice sending or supplier orders.

Regression tests cover three rates without packing, postcode boundaries, legacy multi-class operation, specialist/manual quotes and destination mismatch. Existing price/stock/review gates and immutable snapshots remain.
