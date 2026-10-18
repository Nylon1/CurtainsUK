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

Persist the three smart-track flags as project Production settings, not per-deployment overrides. Preserve every existing curtain, cushion, My Home and adviser setting and secret. The shared production purchase authority and existing per-product gates remain required. Supplier pricing and product facts remain server governed; no additional package override is needed.

The theme schema remains opt-in for other installations. The existing MAIN theme's enabled value is recorded in `shopify-theme/production-main-overlay/config/settings_data.json`. The full source manifest includes the reviewed Smart Track Studio files; it must match a fresh MAIN readback after the scoped upload.

Create or retain published Shopify pages with matching template suffixes: `smart-track-studio`, `smart-track-fitting-guide`, and `smart-track-motors`. At the owner's explicit release request, add **Smart Tracks** after Cushion Studio in the shared desktop, mobile and no-JavaScript navigation. Keep every existing destination and use the same launch setting to control visibility. The product chooser and guides retain their additional entry points.

## Release and rollback

Deploy only the exact current protected `release/production` HEAD after both required checks pass. Stage the production deployment before promotion. Verify assets, server quotes for Go/iOn, private-table permissions, dispatch and delivery, My Home edit/review and checkout reconciliation. Paid orders remain subject to staff release; do not create a real payment merely to test publication.

The pre-release production deployment is `dpl_SDfPE1hhDmZ5LkojV8raju32gj5S`. A fresh complete MAIN backup is held at `C:/Users/hamza/curtainsuk-smart-track-release-20261018/theme-before`; all 537 baseline files matched the recorded source before release. Rollback restores the prior deployment and only the changed theme files/settings, hides the three new pages, and closes the three new flags. Retain private order evidence and migration history. Never drop paid-order records as a rollback.

Final deployment IDs, migration history identity, smoke results and readback hashes are retained with the local release evidence in `C:/Users/hamza/curtainsuk-smart-track-release-20261018`.
