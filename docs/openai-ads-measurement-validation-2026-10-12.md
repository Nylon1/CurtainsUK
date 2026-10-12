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

A successful response is logged as `OPENAI_ADS_ORDER_CREATED_VALIDATED`. Validation-only events are not recorded as conversions. Keep validation-only enabled until the owner separately authorises live purchase measurement and a genuine paid-order test.

An OpenAI Ads standard `order_created` conversion event setting must also be created against the existing CurtainsUK Website conversion source. It should use a 30-day click attribution window. Do not replace the existing campaign optimisation event (`checkout_started`) yet.

## Controlled journeys

1. Fabric Intelligence: open it, receive results and select a fabric.
2. Room Visualiser: select a fabric in a room scene.
3. Sample: save sample intent, add once to cart, then begin checkout.
4. Quote: submit an enquiry and, separately, accept a quote.
5. Curtain checkout: prepare the Draft Order, then click the verified Shopify checkout link.
6. Purchase: CAPI validation-only with synthetic non-customer data. A real paid order is outside the present approval.

For every journey record the event name, event id, timestamp, API channel (`pixel_sdk` or `server_to_server`), duplicate count and pass/fail result.

## Live validation update, 12 October 2026

Protected production advanced from handoff `1e59b0ccc9a2a6c54d039b4d939e2221f003015f` to `f65ca950b0c11a794682f726d84a80234fc8ddbb` through owner-approved PR #177. Both required checks passed. PR #175 remains closed, and PR #176 remains merged. The consent callback fix has four passing regression cases for cached/deferred callbacks and allowed/denied consent.

Vercel production deployment `dpl_JB7BJH39acFaXNygLTQ6FMEX3R7R` is READY at that protected SHA. No runtime errors were returned for the post-deployment window beginning 15:25 UTC. The production CAPI key is configured as a sensitive server-only variable; validate-only remains true. One call through the existing sender returned HTTP 200 / validated at 15:13:52 UTC, using synthetic order `9991791818031938`, GBP 100 minor units and event ID `shopify_order_9991791818031938`. No real payment or paid-order test occurred.

The MAIN theme remains `182339731835`, **CurtainsUK - Curtain Style V1 review**. Three scoped files have been backed up and read back byte-identical to protected source:

| File | Before MD5 | After MD5 | Shopify updated UTC |
| --- | --- | --- | --- |
| `layout/theme.liquid` | `a5c740ed65e1782390880216dc9b8c7e` | `7f7ad5cc5d3a6f72e36af054fc0ed283` | 15:16:13 |
| `assets/curtainsuk-sample-checkout.js` | `4eba3bed8ac74d1dc7012e5b4bc42adb` | `abafcb1510996057135bbbab48b2f26b` | 15:45:32 |
| `assets/curtainsuk-storefront.js` | `50050a564407da314fc560806030a7ec` | `8c7da369d93d685982d32e88de258739` | 15:45:32 |

The two asset backups match older Git blobs exactly, with no Shopify-only changes. The shared storefront asset also catches up the previously protected fabric-drawer change from `6b113a7e`; the separately published Room Visualiser renderer/runtime was not deployed or edited. None of these files overlaps the 836-file PR #169 inventory. No whole-theme upload, theme publication, catalogue rebuild or pricing change was performed.

The purchase setting **CurtainsUK Purchase** uses standard `order_created`, 30-day click / 1-day view, with no campaign attached. The existing campaign still has exactly one conversion setting, **CurtainsUK Curtain Checkout** (`checkout_started`), and its GBP 20 daily budget remains unchanged. Seventeen distinct requested hints were appended to the existing 43. Ten requested ad variants were created PAUSED; the three existing active ads were preserved. The collection preview tool returned unverified; a saved-ad browser preview rendered correctly. Activation is not authorised.

### Verified journeys and remaining evidence limits

- Sample add: Abeja Ivory was added once at quantity one. Re-selecting it kept quantity one; the original four cart samples were preserved. Sample checkout reached Shopify/Shop Pay without payment. The added sample was removed after testing.
- Guided discovery: the existing Browse/Naila journey accepted design preferences and returned 817 fabrics. The premium landing page separately exposed room-image upload, but no paid image-analysis call was made.
- Room Visualiser: selected Abeja Ivory in the published room runtime, without checkout.
- Quote: the clearly labelled synthetic enquiry was saved as `CUK-C9F45F15-488B-4505-A9AF-E11E9A31B05F`. Staff login is required to close it; it must not be actioned.
- Curtain checkout: a separate browser with no saved rooms was used for a labelled synthetic 180 x 200 cm Abeja Ivory pair, pencil pleat, blackout. Governed price was GBP 682 plus GBP 12.95 delivery. Shopify checkout opened without payment. The customer's existing saved curtain in the other browser was preserved.
- Provider raw-feed readback confirms `page_viewed`, `contents_viewed`, custom `curtain_builder_started` and `curtain_price_viewed`. The feed is sampled and does not expose event IDs. Other journey events and exact provider duplicate counts remain unverified, not failed by inference from absence in a sample.
- Website dataLayer behavior is exercised by local script execution. A live-browser dataLayer export and GA4 consumer/persistence have not been verified. Do not describe these as stored GA4 events.

### Remaining House checkout signal correction

The active House of Curtains route uses `assets/curtainsuk-rooms.js`. Its successful navigation emitted only the diagnostic handoff event, so updating the shared single-curtain asset could not complete this route's standard conversion signal. The correction records both events in the website dataLayer, keeps preparation diagnostic-only, and emits `checkout_opened` only after `location.assign` accepts the already verified Shopify URL. The existing bridge maps that to `checkout_started` using the stable `checkout_rooms_<house>_<revision>` ID. A changed revision, invalid URL, failed lookup or failed navigation cannot produce that standard event. Analytics failures cannot block navigation. No checkout, pricing, stock or payment contracts change.

This correction is locally tested, **not yet published**. Ten new behavioral cases plus the four consent regressions pass. Retries retain one deduplication identity; this is not proof of provider-side deduplication. The live rooms asset was backed up with MD5 `b6996ce07b8230033e59fae73511f6e5`. Its future deployment needs the protected checks and fresh exact-commit owner approval required for test changes.

### Rollback and evidence

Private local evidence and exact live backups are in `C:\Users\hamza\.codex\tmp\ads176-validation-20261012`. Before rollback, compare the current live file to the recorded after-checksum; stop if it has changed. Restore only the affected backed-up file with Shopify CLI `--only`, `--nodelete`, `--allow-live`, targeting theme `182339731835`, then read it back. Do not publish a different theme. The prior Vercel deployment is `dpl_4jz5WLzAjGq1mWPW6wB1jqfdn3uN`; an owner-authorised rollback should preserve the validation-only environment setting. Keep the new ads paused and the purchase setting unattached to the campaign.
