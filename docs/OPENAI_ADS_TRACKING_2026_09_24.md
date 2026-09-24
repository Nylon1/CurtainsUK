# OpenAI Ads tracking — CurtainsUK

## Architecture

CurtainsUK remains Shopify-first for production commerce. Fabric Intelligence and decision/configuration services are served through the CurtainsUK Shopify app proxy and supporting Next.js/Vercel infrastructure.

Tracking must therefore preserve one attribution journey across Shopify and the app-proxy intelligence layer.

## Ads Manager

Data source: `CurtainsUK Website`

Primary optimisation event: `lead_created`

Do not put Ads Manager identifiers in this document other than the public pixel configuration value passed through the web-pixel settings.

## Shopify customer events

The `curtainsuk-openai-ads` web pixel subscribes to Shopify standard commerce events and CurtainsUK custom events.

CurtainsUK custom event contract:

- `curtainsuk:fabric_intelligence_started`
- `curtainsuk:palette_created`
- `curtainsuk:fabric_selected`
- `curtainsuk:quote_submitted` -> OpenAI `lead_created`

Commerce events:

- Shopify `checkout_started` -> OpenAI `checkout_started`
- Shopify `checkout_completed` -> OpenAI `order_created`

## Attribution

The web pixel records the OpenAI `oppref` query parameter in Shopify pixel local storage when present. The app-proxy customer experience remains on `www.curtainsuk.com`, so the click reference is not deliberately discarded when moving into Fabric Intelligence.

## Activation

1. Deploy the Shopify app version containing the web pixel extension.
2. Approve the added `write_pixels` and `read_customer_events` scopes.
3. Activate the web pixel for the shop with the CurtainsUK Website Pixel ID.
4. Publish the custom events from the relevant live customer actions.
5. Run a real non-payment test through the journey and confirm events in Ads Manager Event Stream.
6. Keep advertising campaign paused until `lead_created` is observed.
