# CurtainsUK live-site audit, 19 October 2026

**Subsequent publication:** the owner approved the guide fix after this audit. PR #241 is now merged and live from protected runtime `b8faa4e96a3b4cea2c4393041b6e9c5152b4b8f4` on `dpl_6wMYuRjo38cURYrwQUuzbuqM4mE8`. See [the current release record](GUIDE_LINK_RELEASE_20261019.md). The audit results and source identities below remain the original midnight checkpoint, not the current deployment pointers.

This is a fresh live audit performed shortly after midnight Europe/London on 19 October (18 October 23:23-23:42 UTC). It records availability, bounded functional checks and production synchronisation. It does not certify every customer combination, a new payment, signed-in AI generation or supplier fulfilment.

## Result

No released feature was found switched off. All 67 Production environment entries match the final Smart Track launch readback, and the full 541-file Shopify MAIN theme matches the protected manifest. Runtime identity and all three serving aliases agree. Supplier refresh and database maintenance schedules remain active.

There is one confirmed broken link: Smart Track Studio's footer uses `/pages/how-to-use-curtainsuk` (HTTP 404). The correct published guide is `/pages/how-to-use` (HTTP 200), which includes the smart-track walkthrough. [PR #241](https://github.com/Nylon1/CurtainsUK/pull/241), head `1089c3d90794727fd0ebc3ad680473890f1492bc`, corrects that single link and passed both required checks. It is prepared but **not merged or deployed** at this checkpoint. The live site still has the incorrect footer destination. The ordinary header Guide destination already works.

Room Visualiser also displayed a load error during the browser audit. Retry entered loading; a fresh isolated page reload subsequently rendered the Living Room with Abeja Linen successfully. Its 102 recorded runtime/room assets and one applicable sample texture all returned HTTP 200 with matching hashes. The initial failure's root cause was not established; do not describe this as an uninterrupted pass or a proven fix. No feature flag was changed to recover the view.

## Source of truth

| Surface | Verified identity |
| --- | --- |
| Protected source at audit start | `release/production` at `6d7ff1e076f59c4bd98ad8b31f26f2a7694b9420` |
| Actual shared-service runtime | `881fd80c9c911186bd4476c5f18cbecf7058445b` |
| Actual runtime Git tree | `ab7ac4a92a3719899c07e09ebe7919a84b745f74` |
| READY Vercel deployment | `dpl_BWj7SCCARGac4pkYZJjYeCoiojoz` |
| Existing Vercel project | `prj_vl2GLLlSf0AJAKqjs1Nk26ipKHBA`, historical name `curtainsuk-staging-api` |
| Shopify store / MAIN theme | `carpetup.myshopify.com` / `182339731835` |
| Complete MAIN theme readback | 541 of 541 manifest files matched |
| Existing Supabase project | `hqysjumypgeapgmqkcrx` |
| Latest hosted migration | `20261018223757_smart_track_distinct_checkout` |
| Separate supplier-scheduler source | `main` at `457ef7e70193fb60559b01d6dbd5d1d45b71d13b` |

At audit start, the protected tip differs from the actual runtime in four documentation files only. This audit is also documentation-only and must not be described as a new runtime deployment. The protected commit containing this record is the updated documentation authority; the runtime SHA above remains the serving software identity. `main` remains the separately documented scheduler source, not the storefront release source.

Fresh Vercel API inspection confirmed READY and exact `releaseSha`, `gitCommitSha` and `gitTree` metadata. All three existing aliases resolve to that deployment: `curtainsuk-production-api.vercel.app`, `curtainsuk-staging-api.vercel.app` and `curtainsuk-staging-gateway.vercel.app`. No alias, deployment, theme, database data or production setting was changed during this audit.

## Customer-facing checks

| Feature | Fresh live evidence | Limit |
| --- | --- | --- |
| Navigation, help and policies | 40 initial public URLs checked: 39 HTTP 200, one incorrect smart-track guide destination HTTP 404. The additional canonical guide returned HTTP 200. Main navigation retains all existing tools and Motorised Curtain Tracks. | HTTP availability is not a full interactive test of every page. |
| Browse Fabrics | 11,815 fabrics loaded. Search for Abeja Linen returned one matching fabric and its profile. | Not every catalogue record checked. |
| Naila | Start my consultation reached the question about darker rooms, privacy, soft daylight or appearance. Browse on my own returned to the catalogue. | Full recommendation journey not replayed. |
| Fabric profile and samples | Abeja Linen profile loaded. A £2.50 sample reached the Shopify cart, with checkout available. The audit sample was removed and the cart returned to empty. | No payment made. |
| Curtain configurator | Standard window, fitted track, 200 cm width, 220 cm drop, Abeja Linen, pencil pleat, unlined, centre-opening pair produced a £605.00 live quote with fabric available. | No new curtain order item or payment created. |
| Cushion Studio | Native embedded preview rendered; catalogue search and fabric/size changes worked. 50 cm filled unpiped Amalfi Herb quoted £70.72. | The sampled 45 cm Abeja Linen cushion remained review-required; the API still reported global `purchaseEnabled: true`. Individual configuration holds are not a global feature shutdown. No purchase or saved-design recovery replay. |
| Room Visualiser | Living Room rendered Abeja Linen after fresh reload; 103 runtime/room/sample assets matched protected hashes. | Earlier load failure noted above. All room/lighting/device combinations were not replayed. |
| Fabric Intelligence | Premium entry loaded its room/reference choices, photograph input and privacy guidance. | No new photo upload, paid analysis or full shortlist run. |
| Jane, Noah, James, Ben, Natalie | Each live signed Shopify proxy gateway returned HTTP 401 `CUSTOMER_SIGN_IN_REQUIRED`, rather than a disabled 404. This exercises the release/source gates before customer authentication. | No signed-in reply, paid model call or conversation recovery. |
| Smart Track Studio | Actual remote controls rendered. Open, Close and Stop responded; Stop paused partway. Switching to App demo and back retained the stopped state. Go and iOn quotes succeeded. | Physical remote/device connectivity is outside the web demo. |
| Track commerce | Go 200 cm pencil £514.29; iOn 200 cm wave £565.71. Track-only review total £527.24; two-track review £1,092.95. Each applied one £12.95 delivery charge. Unsupported BT postcode blocked purchasing. 20 track assets loaded; source-backed binary/script/style hashes matched. | No new Shopify draft, payment or supplier release. |
| Design My Home | Existing two rooms and one £805 Abeja Linen curtain reopened intact. Product chooser offers curtains, cushions and Motorised Curtain Tracks. Current order requires a postcode before checkout, as intended. | No existing item was edited or removed. Mixed curtain/track add, reopen, edit and cleanup evidence remains in the preceding release record; not repeated here. |
| Track fitting and motor guides | Both published pages and their runtime guide assets returned HTTP 200. | Fitting is supply-only; no physical installation validation. |

No test sample remains in the Shopify cart, and no additional product remains in Design My Home. The original saved curtain and rooms were preserved. Browser verification used desktop Chrome; physical iPhone Safari, VoiceOver and other browser/device combinations were not retested.

## Settings, data and background operations

The 95 project environment entries include 67 targeted to Production. All 67 entries matched the final launch readback, including key identities, types, targets, timestamps and stored representations. No entry was removed or changed. Sensitive values were not decrypted or published; metadata parity is not a secret-value export. Functional gateway and quote checks provide additional evidence of effective live enablement.

The plain Production flags for Smart Track hosted service, purchases and webhook, Cushion Studio hosted service, purchases, webhook and mixed orders, and Design My Home are all `true`. Build and persistent runtime source attestations both equal `881fd80c9c911186bd4476c5f18cbecf7058445b`. Existing adviser/provider/budget settings were preserved. Restricted-preview and other operational safety switches must not be indiscriminately enabled in the name of keeping public features available.

The fresh complete MAIN pull passed `scripts/verify-production-theme-sync.mjs --live` for 541 files. This uses the existing manifest's semantic JSON comparison and text normalisation, not a claim that Shopify preserves every original byte. It includes stored theme settings, the released smart-track flag and navigation.

Supabase migration history contains 89 entries. The expected cushion persistence, order-owned cushion snapshots and smart-track migrations are present under their recorded hosted timestamps. All six smart-track and six matching cushion tables inspected have RLS and FORCE RLS enabled, with no anon or authenticated SELECT privilege. All 12 advisory tables inspected have RLS and no anon/authenticated SELECT; FORCE RLS remains as defined by the existing schema. This is a scoped privilege/schema check, not a complete database dump or checksum of every historical function.

All three recorded database jobs are active, and their latest runs succeeded: daily stock at 06:00 UTC, browse projection at 19:10 UTC and Jane retention at 03:20 UTC on 18 October. No retention, indexing or supplier job was manually triggered.

The GitHub SDG and PT stock workflows are active. The latest four runs of each succeeded on the separate scheduler source above. Latest checked runs were [SDG 39175344806](https://github.com/Nylon1/CurtainsUK/actions/runs/39175344806) and [PT 39169471228](https://github.com/Nylon1/CurtainsUK/actions/runs/39169471228). Both reported `NOT_DUE`. Their last full successful supplier refreshes were 17 October 18:36:05 UTC (SDG) and 19:57:22 UTC (PT), approximately 29 and 28 hours old at audit, within the existing 96-hour freshness policy. Next due times are 20 October 18:36 and 19:57 UTC respectively.

Recent deployment error-log review found one QUOTE failure event for a GET to the quote endpoint at 23:17:05 UTC, before this audit's successful POST quote checks. It did not include a detailed cause. Valid quote POSTs passed during this audit; the single event must not be presented as either a proven customer outage or an error-free monitoring result.

## Evidence and release boundary

Local evidence is under `C:\Users\hamza\curtainsuk-live-audit-20261019`: complete theme pull and log, `public-audit.json`, `smart-track-live-smoke.json` and `environment-parity.json`. The public audit records exact paths, statuses and asset hash comparisons; it intentionally remains failed because the wrong guide destination is still live. Existing test infrastructure was reused; no new test framework was introduced.

The guide correction in PR #241 is deliberately separate from this documentation record. This audit request does not publish a new production runtime. To release it, follow [the protected production policy](../release/README.md): merge only after required checks, deploy the exact protected production head with owner authorisation, preserve all existing feature settings and matching adviser/source attestations, then repeat the scoped live checks. Do not deploy the feature branch or falsely advance the runtime identity in this report.
