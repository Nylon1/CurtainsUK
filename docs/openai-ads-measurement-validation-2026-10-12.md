# OpenAI Ads measurement validation — 12 Oct 2026

## Measurement contract

CurtainsUK keeps the existing ChatGPT Ads campaign optimised to the standard `checkout_started` event. Diagnostic interactions remain custom events and are not optimisation goals.

| Journey step | Website analytics | OpenAI measurement |
| --- | --- | --- |
| Page view | normal site page analytics | `page_viewed` |
| Fabric profile view | `curtainsuk_fabric_profile_viewed` | `contents_viewed` |
| Fabric selection | existing storefront analytics | `contents_viewed` + custom `fabric_selected` |
| Fabric Intelligence opened | `curtainsuk_fabric_intelligence_started` | custom `fabric_intelligence_started` |
| Fabric Intelligence results | `curtainsuk_fabric_intelligence_results_viewed` | custom `fabric_intelligence_results_viewed` |
| Room Visualiser fabric used | `curtainsuk_room_visualiser_used` | custom `room_visualiser_used` |
| Sample intent | existing storefront analytics | custom `sample_intent` |
| Confirmed sample cart addition | existing storefront analytics | standard `items_added` + custom sample diagnostic |
| Sample checkout begins | existing storefront analytics | standard `checkout_started`, with sample content metadata |
| Quote/review submitted | existing storefront analytics | standard `lead_created` + custom `quote_requested` |
| Quote accepted | existing storefront analytics | custom `quote_accepted` only |
| Curtain checkout handoff prepared | existing storefront analytics | custom `checkout_handoff_reached` only |
| Customer opens verified curtain checkout | existing storefront analytics | standard `checkout_started` |
| Paid made-to-measure curtain order | verified Shopify `orders/paid` webhook | CAPI standard `order_created` |

## Dedupe and attribution

- Browser `checkout_started` uses the stable checkout/handoff event id.
- Confirmed sample `items_added` uses a stable sample cart event id.
- Paid purchase CAPI uses `shopify_order_<Shopify order id>`.
- If a purchase is ever also emitted through the Pixel, it must reuse the same event id.
- `oppref` and `__obref` are retained only after Shopify marketing consent and are carried through the made-to-measure Draft Order into the paid-order webhook.

## CAPI activation

Production currently requires a server-only `OPENAI_ADS_CONVERSIONS_API_KEY`.

The first controlled purchase should run with:

`OPENAI_ADS_CONVERSIONS_VALIDATE_ONLY=true`

A successful response is logged as `OPENAI_ADS_ORDER_CREATED_VALIDATED`. Validation-only events are not recorded as conversions. After validation succeeds, switch the flag to false and repeat with the first genuine paid order.

An OpenAI Ads standard `order_created` conversion event setting must also be created against the existing CurtainsUK Website conversion source. It should use a 30-day click attribution window. Do not replace the existing campaign optimisation event (`checkout_started`) yet.

## Controlled journeys

1. Fabric Intelligence: open it, receive results and select a fabric.
2. Room Visualiser: select a fabric in a room scene.
3. Sample: save sample intent, add once to cart, then begin checkout.
4. Quote: submit an enquiry and, separately, accept a quote.
5. Curtain checkout: prepare the Draft Order, then click the verified Shopify checkout link.
6. Purchase: first CAPI validation-only, then one real paid made-to-measure order.

For every journey record the event name, event id, timestamp, API channel (`pixel_sdk` or `server_to_server`), duplicate count and pass/fail result.
