# OpenAI Ads tracking — CurtainsUK

## Verified production architecture

CurtainsUK is Shopify-first for the live storefront and commerce. Fabric Intelligence / HCI and configuration services run through the CurtainsUK app-proxy and supporting Next.js/Vercel infrastructure.

The current MAIN Shopify theme already contains the OpenAI Measurement Pixel and a CurtainsUK analytics bridge.

## Verified live status — 25 September 2026

- OpenAI data source: `CurtainsUK Website`.
- Standard conversion setting: `CurtainsUK Lead` -> `lead_created`.
- Live page-view events are reaching OpenAI Ads Event Stream.
- The live storefront bridge emits `lead_created` only after a successful persisted review/quote submission.
- The live storefront attempts `checkout_started` before Shopify checkout, but a real no-payment rehearsal reached Shopify checkout without that event appearing in OpenAI Event Stream.
- The Ads campaign remains paused while conversion measurement is proven.

## Checkout fix

Use Shopify Customer Events for the checkout boundary rather than relying only on the preceding storefront click.

Immediate implementation: Shopify **Custom Pixel**, stored in this repository at:

`docs/shopify-custom-pixel-openai-ads.js`

The custom pixel subscribes to Shopify's native:

- `checkout_started` -> OpenAI `checkout_started`
- `checkout_completed` -> OpenAI `order_created`

It reads the first-party OpenAI `__oppref` cookie through Shopify's controlled `browser.cookie` API and forwards the original attribution identifier to OpenAI's browser measurement endpoint.

It does **not** send email, phone, address, customer name, order identifiers or other customer personal data.

For GBP checkouts it also sends the Shopify checkout total in integer pence. For any other currency it omits value rather than assuming a minor-unit conversion.

## Shopify Custom Pixel privacy

Configure the custom pixel in Shopify Admin to require:

- Analytics: required
- Marketing: required
- Preferences: not required
- Sale of data: disabled / not required

Shopify Customer Events provides the checkout lifecycle coverage that theme JavaScript cannot provide reliably.

## Test sequence

1. Add and connect the custom pixel in Shopify Admin.
2. Ensure marketing consent is granted in the test browser.
3. Start a CurtainsUK made-to-measure checkout without paying.
4. Confirm `checkout_started` appears in OpenAI Ads Event Stream.
5. Do not make a payment merely to test the checkout-start event.
6. Leave the campaign paused until the required measurement checks pass.

## Longer-term purchase reliability

For confirmed paid orders, add OpenAI Conversions API delivery from the trusted server/order boundary and deduplicate it against the browser `order_created` event with a shared event ID. This is separate from the immediate checkout-start fix.
