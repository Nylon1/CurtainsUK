# Smart Track Studio production configuration

The owner approved PR #237 at `b44893926256f9ab81187542d31caf99ac1be5a0` in [the exact-head approval](https://github.com/Nylon1/CurtainsUK/pull/237#issuecomment-6255977325). Both required checks passed and the feature merged into protected `release/production` at `697d71bc22850b8c53c0e3027328d819e5f9a96e` on 18 October 2026. This record and the theme activation preserve the approved release configuration in source. Publication is complete only after deployment and live readback.

## Existing production targets

- Vercel project `prj_vl2GLLlSf0AJAKqjs1Nk26ipKHBA` (`curtainsuk-staging-api`), team `team_U8WXxsKS9LT2DmEllVkOpihz`, Production environment. Customer origin: `https://curtainsuk-production-api.vercel.app`.
- Shopify `carpetup.myshopify.com`, existing MAIN theme `182339731835`, public store `https://www.curtainsuk.com`.
- Supabase `hqysjumypgeapgmqkcrx`. Reviewed migration `20261017162157_smart_track_distinct_checkout.sql` was applied through migration history on 18 October 2026. It adds private immutable records; no existing customer data is changed.

## Stored configuration contract

| Setting | Production value |
| --- | --- |
| `CURTAINSUK_SMART_TRACK_ENABLED` | `true` |
| `CURTAINSUK_SMART_TRACK_WEBHOOK_ENABLED` | `true` |
| `CURTAINSUK_SMART_TRACK_PURCHASES_ENABLED` | `true` after release verification |
| Shopify `curtainsuk_smart_track_enabled` | `true` |
| `ADVISORY_SHOPIFY_APPROVED_COMMIT` | Exact deployed protected source SHA |
| `ADVISORY_SPECIALISTS_APPROVED_COMMIT` | Exact deployed protected source SHA |
| Build `CURTAINSUK_BUILD_SOURCE_COMMIT` | Same exact deployed protected source SHA |
| Runtime `VERCEL_GIT_COMMIT_SHA` | Same exact deployed protected source SHA |

Persist the three smart-track flags as project Production settings, not per-deployment overrides. Preserve every existing curtain, cushion, My Home and adviser setting and secret. The shared production purchase authority and existing per-product gates remain required. Supplier pricing and product facts remain server governed; no additional package override is needed.

Manual deployments must persist both source-identity settings before building, alongside the two adviser approvals. The specialist public gateway requires the runtime Git identity to equal the compiled source. A build-only SHA is insufficient. Probe Jane and all four specialist routes after every shared-service deployment; signed-out requests must reach `CUSTOMER_SIGN_IN_REQUIRED`, not a disabled 404.

## Verified first publication, 18 October 2026 UTC

PR #238 passed both checks and merged at `0c421e6024bd152407eb6883d3e064ce7ef4e702`, tree `37295e2c9b2b25dda7029ed1486678c97e310265`. READY deployment `dpl_HktUhDS9xcmgaWP9dsEWXsrb3VUF` served all three existing aliases with that exact source metadata and all three smart-track gates enabled. The first staged deployment was rejected before promotion because the runtime Git identity was absent and specialists returned 404. The persisted identity corrected this before the verified publication.

The scoped MAIN upload and fresh complete readback matched all 541 source files. All three new pages are published. Remote migration history records `20261018223757_smart_track_distinct_checkout`; all six added tables have forced RLS, no browser-role read grants and service-role access. The existing 90 project settings were preserved except the two adviser source attestations; five source-identity and smart-track settings were added. No existing product, Naila, HCI, catalogue or adviser flag was disabled.

Live verification checked 20 served assets, Go and iOn quotes, track-only and two-track totals, one £12.95 delivery charge and an excluded postcode. The browser saved a test Go track into Design My Home alongside the existing £805 curtain: products £1,319.29, delivery £12.95, total £1,332.24, with checkout enabled after acknowledgement and a combined 4-5-week dispatch estimate. Verification stopped before checkout creation or payment. Browse Fabrics loaded 11,815 fabrics, Naila returned a consultation question, Room Visualiser rendered Abeja Linen, and Fabric Intelligence and Cushion Studio loaded. All five adviser gateways reached their normal signed-out boundary; no signed-in AI reply or new image analysis was performed.

The theme schema remains opt-in for other installations. The existing MAIN theme's enabled value is recorded in `shopify-theme/production-main-overlay/config/settings_data.json`. The full source manifest includes the reviewed Smart Track Studio files; it must match a fresh MAIN readback after the scoped upload.

Create or retain published Shopify pages with matching template suffixes: `smart-track-studio`, `smart-track-fitting-guide`, and `smart-track-motors`. At the owner's explicit release request, add **Motorised Curtain Tracks** after Cushion Studio in the shared desktop, mobile and no-JavaScript navigation. Use the same name for the product category in Design My Home; retain **Smart Track Studio** for the interactive demonstration. Keep every existing destination and use the same launch setting to control visibility. The product chooser and guides retain their additional entry points.

## Release and rollback

Deploy only the exact current protected `release/production` HEAD after both required checks pass. Stage the production deployment before promotion. Verify assets, server quotes for Go/iOn, private-table permissions, dispatch and delivery, My Home edit/review and checkout reconciliation. Paid orders remain subject to staff release; do not create a real payment merely to test publication.

The pre-release production deployment is `dpl_SDfPE1hhDmZ5LkojV8raju32gj5S`. A fresh complete MAIN backup is held at `C:/Users/hamza/curtainsuk-smart-track-release-20261018/theme-before`; all 537 baseline files matched the recorded source before release. Rollback restores the prior deployment and only the changed theme files/settings, hides the three new pages, and closes the three new flags. Retain private order evidence and migration history. Never drop paid-order records as a rollback.

Final deployment IDs, migration history identity, smoke results and readback hashes are retained with the local release evidence in `C:/Users/hamza/curtainsuk-smart-track-release-20261018`.
