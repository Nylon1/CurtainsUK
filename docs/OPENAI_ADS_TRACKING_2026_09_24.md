# OpenAI Ads tracking — CurtainsUK

## Current production architecture

CurtainsUK is Shopify-first for the live storefront and commerce. The made-to-measure curtain journey uses the CurtainsUK configurator and a server-side Shopify Draft Order handoff. Samples use the normal Shopify cart/checkout route.

## Verified production facts — 25 September 2026

- OpenAI data source: `CurtainsUK Website`.
- Existing OpenAI page-view measurement is live and reaching Ads Manager.
- Samples trigger Shopify's native `checkout_started` customer event.
- Made-to-measure curtains do not use the same checkout boundary: they create a Shopify Draft Order and surface its secure `invoiceUrl`.
- The CurtainsUK storefront already emits `curtainsuk_checkout_handoff_reached` only after the made-to-measure checkout handoff succeeds.
- Specialist/review curtains are intentionally removed from the current live customer journey.
- The OpenAI campaign remains paused while the correct curtain conversion is proven.

## Correct made-to-measure conversion boundary

For the curtain advertising campaign, map the existing successful CurtainsUK handoff event:

`curtainsuk_checkout_handoff_reached` -> OpenAI `checkout_started`

Do not use the sample checkout as the primary curtain conversion.

The live OpenAI bridge should accept both the handoff event and the later checkout-link click, using the same handoff-based event ID so OpenAI can deduplicate them:

```js
if (
  detail.event === "curtainsuk_checkout_handoff_reached" ||
  detail.event === "curtainsuk_checkout_opened"
) {
  const options = detail.handoff_id
    ? { event_id: "checkout_" + String(detail.handoff_id) }
    : undefined;

  if (options) {
    window.oaiq("measure", "checkout_started", { type: "contents" }, options);
  } else {
    window.oaiq("measure", "checkout_started", { type: "contents" });
  }
  return;
}
```

This event is curtain-specific because only the made-to-measure handoff emits `curtainsuk_checkout_handoff_reached`.

## Conversion taxonomy

- Made-to-measure checkout handoff -> `checkout_started` (primary high-intent curtain conversion)
- Paid made-to-measure curtain order -> `order_created` (ultimate sale)
- Sample checkout -> separate supporting/micro-conversion; do not use as the primary curtain campaign goal

## Campaign state

The existing £30/day UK web campaign is paused. Before activation:

1. verify a real made-to-measure handoff logs `checkout_started` in OpenAI Event Stream;
2. create/select a standard Ads Manager conversion setting based on `checkout_started`;
3. update the campaign to use that conversion goal;
4. keep the campaign paused until ads clear review and conversion tracking is confirmed.
