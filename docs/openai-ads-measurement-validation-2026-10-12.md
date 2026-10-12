# OpenAI Ads measurement validation — 12 Oct 2026

> **CURRENT SOURCE OF TRUTH — synchronized after PR #180**
>
> Functional production baseline (last runtime/theme-changing merge): `58a97377359049e621676d01a66d74aeec6283a1`. Later documentation-only source-of-truth merges do not change the deployed runtime.
>
> Shopify MAIN theme: `182339731835` — **CurtainsUK - Curtain Style V1 review**.
> The live `layout/theme.liquid` readback matches the protected source byte for byte after the PR #180 one-file release. Final SHA-256: `8d055fcdf7a4e412b6f499e8be37226dad234fc6b40bdd6a12885d7160d9ff0f`.
>
> OpenAI Ads optimisation remains **only** standard `checkout_started` for the active CurtainsUK conversion campaign. `CurtainsUK Purchase` uses standard `order_created`, 30-day click / 1-day view, and remains unattached to any campaign for measurement only.
>
> Server-side purchase CAPI is implemented and the synthetic validation-only request returned HTTP 200. No genuine purchase conversion has yet been proven from a paid CurtainsUK curtain order, and no real payment was made during validation.
>
> Live cross-tab consent regression passed after PR #180: opening a second consented storefront tab no longer revokes Pixel consent in the first; explicit denial still blocks measurement before and after reload. The provider's sampled raw feed did not independently surface that exact cross-tab test run, so browser SDK delivery is verified but provider receipt for that specific test is not claimed.
>
> PRs #177, #178, #179 and #180 are incorporated into this source of truth. PR #175 remains closed. Jane / PR #169 and its indexing process were not changed.


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

Historical pre-release state: this correction was locally tested but unpublished when PR #178 was prepared. Ten new behavioral cases plus the four consent regressions passed. Retries retain one deduplication identity; this is not proof of provider-side deduplication.

Owner approval for exact PR #178 commit `42f0f13670898d58e5c83837753580d5390aa13f` was recorded at https://github.com/Nylon1/CurtainsUK/pull/178#issuecomment-6127899025. Both required checks passed. The protected merge is `4e68f4f559df3f1cd740c2b762a69ff2dc7e784c`. Only `assets/curtainsuk-rooms.js` was uploaded at 16:06:41 UTC. Its live before MD5 was `b6996ce07b8230033e59fae73511f6e5`, after MD5 `326349b4e7dafd2aabe34489b9e05db5`, and after SHA-256 `b7c5ef898b8b109eab175d7b7534552ee0a31b0126cd6f939183d803133483be`. Fresh backup matched the preceding protected source exactly; Shopify readback matches the merge byte for byte. The synthetic checkout opened without payment. Draft `#D33` (`1581948731771`) was OPEN with `order: null`. The isolated browser initially withheld marketing consent, and the SDK correctly dropped its events. Consent was subsequently granted through Shopify's visible preferences for the controlled retest.

### Room iframe measurement follow-up, released in PR #179

Live source inspection identified that fabric selection occurs inside the published Room Visualiser iframe. DOM events do not bubble from that document to the outer Shopify page, where the Ads bridge had its listener. The follow-up binds only the existing same-origin `/apps/curtainsuk-decision/room-visualiser` document in the named room iframe. It leaves renderer, catalogue, runtime, geometry and selection logic unchanged. Repeated load notifications bind once per document; a new room document is bound after navigation. Cross-origin, unrelated and inaccessible documents are ignored. Selection remains a custom diagnostic and never produces checkout or purchase.

Six additional behavioral tests cover actual bridge execution, website dataLayer output, custom-only dispatch, deferred loading, repeat binding, replacement documents, unrelated origins/paths and denied consent. All 20 consent/House/frame cases passed locally. Owner approval covered exact PR #179 commit `8dff2655aa55801948d70f59e39ef6a3c65b31bc`; both checks passed and the protected merge is `cbceae54a3c84e87f7ba79c835e3217a19157d1f`. Only `layout/theme.liquid` was deployed at 16:29:37 UTC. Fresh live backup matched the previous protected file exactly. Live after MD5 `3233a46f31cffd0140f6b42f18796328`, SHA-256 `64045f33266fc3c5b5069e284e73ee687047159505125442e796faffd1940955`, and full content match the protected release. No other theme file was uploaded in this release. The storefront and published room rendered normally; provider receipt remains a separate test.

### Cross-tab consent correction, released in PR #180

Live SDK logs showed an existing tab reporting consent revocation from persisted storage when another storefront page opened, despite Shopify's marketing preference remaining checked. The bridge published a temporary `consent=false` before Shopify's asynchronous privacy callback on every page. The official SDK propagates persisted denial across tabs without automatically propagating the later grant. This caused genuine Fabric Intelligence result events to be dropped in the original tab.

The correction waits for Shopify's actual decision before installing and initialising the Pixel, queues that decision before init, and suppresses all measurement while consent is unknown or denied. It does not replay commerce events collected before consent. Actual refusal still reaches the SDK. It changes only the bridge, its regression tests and this record; no Naila, renderer, checkout, indexing, campaign or supplier logic changes.

Three new behavioral regressions cover two tabs with the SDK's denial propagation, delayed denial without commerce replay, and fresh-SDK installation with consent before init. All 23 consent/House/frame tests passed. Owner approval covered exact PR #180 head `7c82e70a38414762447aae9de9ab4405698ea6b5`; both required checks passed and the protected merge is `58a97377359049e621676d01a66d74aeec6283a1`.

Only `layout/theme.liquid` was deployed to MAIN theme `182339731835` at 17:07:15 UTC. The live file was backed up first, the previous live content matched the preceding protected source, and the post-release readback matches the PR #180 protected source byte for byte. SHA-256 advanced from `64045f33266fc3c5b5069e284e73ee687047159505125442e796faffd1940955` to `8d055fcdf7a4e412b6f499e8be37226dad234fc6b40bdd6a12885d7160d9ff0f`.

Live cross-tab validation passed: the first tab continued queuing/flushing Pixel diagnostics after a second consented storefront tab opened, without reloading or regranting consent. Explicit denial produced zero queued Pixel events and remained effective after reload; the original consent preference was restored afterward. No checkout, order or payment was created. The provider raw feed remained sampled/older and did not independently expose this exact test run, so provider receipt is not claimed.

Further raw provider samples now include `fabric_intelligence_started`, `fabric_selected`, `measurements_completed`, confirmed sample `items_added` and custom `sample_added`. Sample metadata includes exact fabric `sdg-f1325-02`, GBP 250 and quantity 1. Samples remain incomplete and lack event IDs, so exact provider deduplication and absent events are not inferred.

A later Vercel readback shows READY deployment `dpl_EZj1jj1rDV3Mb4BjEb3TNwM7Mghf` from historical protected SHA `1e59b0ccc9a2a6c54d039b4d939e2221f003015f`, created after this task's `f65ca950` deployment. The changes from that SHA through `4e68f4f5` are only Shopify files, tests and this document; backend source is identical. This later redeploy was not initiated by the PR #178 one-file release. One runtime HTTP 409 was observed at 16:08:25 UTC on the Shopify proxy during the repeat synthetic journey; the checkout still opened. Do not report zero runtime errors. Jane's existing zero-error gate held writes and recovered without a code or limit change.

### Rollback and evidence

Private local evidence and exact live backups are in `C:\Users\hamza\.codex\tmp\ads176-validation-20261012`. Before rollback, compare the current live file to the recorded after-checksum; stop if it has changed. Restore only the affected backed-up file with Shopify CLI `--only`, `--nodelete`, `--allow-live`, targeting theme `182339731835`, then read it back. Do not publish a different theme. The prior Vercel deployment is `dpl_4jz5WLzAjGq1mWPW6wB1jqfdn3uN`; an owner-authorised rollback should preserve the validation-only environment setting. Keep the new ads paused and the purchase setting unattached to the campaign.
