# OpenAI Ads measurement validation — 12 Oct 2026

## Goal

Align CurtainsUK measurement with the OpenAI Ads standard event taxonomy, keep diagnostic interactions separate, preserve consent, and prepare paid made-to-measure orders for server-side `order_created` delivery.

The live campaign continues to optimise only for the existing standard `checkout_started` conversion setting. Custom events are diagnostic and are not optimisation goals.

## Event contract

| Customer action | Website analytics event | OpenAI event | Notes / dedupe |
| --- | --- | --- | --- |
| Important page view | `page_viewed` | `page_viewed` | Existing Pixel behaviour preserved |
| Fabric profile view | page + fabric identity | `contents_viewed` | Product content id is the fabric id |
| Fabric selected | `fabric_selected` | `contents_viewed` + custom `fabric_selected` | Diagnostic selection signal |
| Fabric Intelligence opened | `fabric_intelligence_started` | custom | Once per page |
| Fabric Intelligence results shown | `fabric_intelligence_results_viewed` | custom | Once per browser root |
| Room Visualiser fabric used | `room_visualiser_used` | custom | Fabric id included when available |
| Sample saved as an intention | `sample_intent` | custom `sample_intent` | Not a cart addition |
| Sample actually added to Shopify cart | `sample_added_to_cart` | standard `items_added` | Content id is prefixed `sample:`; event id derives from the confirmed Shopify cart line |
| Sample checkout begins | `sample_checkout_started` | standard `checkout_started` | Sample contents are identified as `content_type: sample` |
| Curtain builder starts | `configurator_started` | custom `curtain_builder_started` | Diagnostic |
| Measurements complete | `measurement_completion` | custom `measurements_completed` | Diagnostic |
| Curtain price shown | `price_displayed` | custom `curtain_price_viewed` | Amount/currency included when available |
| Quote/review submitted | `review_submitted` / `quote_review_submitted` | standard `lead_created` + custom `quote_requested` | Configuration id used as event id when available |
| Quote accepted | `quote_accepted` | custom `quote_accepted` | **Never** treated as a purchase |
| Curtain handoff prepared | `checkout_handoff_reached` | custom `checkout_handoff_reached` | No longer counted as checkout start |
| Customer opens real curtain checkout | `checkout_opened` | standard `checkout_started` | Handoff id is used for dedupe |
| Staging-only checkout attempt | `checkout_started` with `staging_blocked` | custom `checkout_attempt_staging_blocked` | Excluded from standard checkout conversions |
| Paid made-to-measure Shopify order | Shopify `orders/paid` webhook | CAPI standard `order_created` | Stable id: `shopify_order_<order id>`; sample orders are excluded |

## Consent and attribution

The OpenAI Pixel remains behind Shopify marketing consent.

When marketing consent is allowed, the browser stores only the OpenAI attribution identifiers needed for conversion matching:

- `oppref` from the OpenAI ad landing URL.
- `__obref` from the OpenAI Pixel first-party cookie.

If marketing consent is denied or revoked, the stored attribution record is removed.

For a made-to-measure checkout, consented attribution is carried into the Shopify Draft Order as CurtainsUK order attributes and recovered by the verified `orders/paid` webhook. No raw supplier-commercial data is added.

## Conversions API

Server-side purchase delivery is implemented but fails closed to **disabled** until a server secret is configured.

Required production environment variables:

- `OPENAI_ADS_CONVERSIONS_API_KEY` — secret Conversions API key.
- `OPENAI_ADS_PIXEL_ID` — optional; defaults to the existing CurtainsUK Pixel ID `6LN4GfrhY92CkQR6Uti2NH`.
- `OPENAI_ADS_CONVERSIONS_VALIDATE_ONLY=true` — use for first validation request only; remove/set false after validation succeeds.

The paid-order webhook records the CurtainsUK order first. Ads telemetry failure does not block the paid-order lifecycle.

The CAPI event sends:

- `type: order_created`
- actual paid timestamp
- stable Shopify order event id
- actual GBP order value in minor units
- consented `oppref` / `obref` when available
- SHA-256 normalised customer email when available
- country/postcode when available

A separate OpenAI Ads conversion event setting for standard `order_created` must exist before purchase reporting is useful. It should use the existing `CurtainsUK Website` source and a 30-day click attribution window. It should **not** replace the current campaign's `checkout_started` optimisation goal yet.

## Required validation journeys

Run each journey with a clean browser session and marketing consent allowed. Record the OpenAI raw event receipt, event id, and whether the website analytics event was emitted.

1. **Fabric discovery**
   - Open Fabric Intelligence.
   - View results.
   - Select/view a fabric.
   - Expected: custom FI events, `contents_viewed`, and no checkout/lead event.

2. **Room Visualiser**
   - Open Room Visualiser and select a fabric.
   - Expected: custom `room_visualiser_used` only for the interaction.

3. **Sample**
   - Save a sample intention.
   - Add that sample to the Shopify cart once.
   - Begin sample checkout.
   - Expected: custom `sample_intent`, one standard `items_added`, one standard `checkout_started`.
   - Reopening an already-existing sample in the cart must not create a second `items_added`.

4. **Quote enquiry**
   - Submit an enquiry/review.
   - Expected: one `lead_created` and one custom `quote_requested` for the same configuration.
   - Accepting a quote may emit custom `quote_accepted`; it must not emit `order_created`.

5. **Made-to-measure curtain checkout**
   - Prepare a valid production Draft Order.
   - Expected: custom `checkout_handoff_reached`.
   - Click the verified Shopify checkout link.
   - Expected: exactly one standard `checkout_started` using the handoff id.
   - Merely preparing the handoff must not emit standard `checkout_started`.

6. **Paid curtain purchase**
   - First run CAPI with `OPENAI_ADS_CONVERSIONS_VALIDATE_ONLY=true`.
   - After validation succeeds, disable validate-only and use one controlled real paid order.
   - Expected: one server-to-server `order_created`, stable Shopify order id, actual GBP value.
   - If the same purchase is later also sent by Pixel, its Pixel `event_id` must equal the CAPI event `id`.

## Evidence to return to OpenAI

For each test, record:

- journey
- browser/server event name
- event id
- OpenAI API channel (`pixel_sdk` or `server_to_server`)
- timestamp
- duplicate count
- pass/fail
- any correction made

Do not claim CAPI purchase delivery is live until the Conversions API key and `order_created` event setting are configured and a validation-only request has passed.
