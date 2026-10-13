# Meet Our Team — controlled publication candidate

Owner approved the appearance on 9 October 2026. This is visual approval only. PR #167 remains a draft; neither merge nor publication is authorised.

The hidden Shopify page is `gid://shopify/Page/693751873915`, handle `meet-our-team`, template suffix `meet-our-team`, `isPublished:false`, `publishedAt:null`. Its permanent destination is `/pages/meet-our-team`. Shopify does not publicly serve a hidden page; the development-theme alternate-template URL remains the owner preview until release. No public page or menu was changed.

The shared header snippet now renders an additive navigation component in desktop/mobile/fallback navigation. It links to the permanent page only when Shopify exposes the published page. DEVELOPMENT themes use the working alternate-template review link. The label reuses the approved “Meet the specialists” translation. No theme settings or merchant menus are overwritten.

## Release manifest and comparison

`artifacts/specialist-advisory-release/release-manifest.json` lists exactly 20 scoped theme files and SHA-256s, live prior MD5s and the required operation. Run `node scripts/prepare-advisory-release.mjs` to compare fresh supplied Admin read-back against source. Locale comparison excludes only the additive advisory namespace; the live navigation must match its protected baseline. A mismatch blocks the prepared package and needs a scoped merge. This script performs no network writes or publication.

## Procedure — only after separate owner release approval

1. Read actual remote `release/production` HEAD, PR #167 head and both required checks. Merge only through protected review when authorised. Produce the release from the exact resulting protected HEAD; never this feature checkout.
2. Read MAIN theme identity, all target-file checksums/content and page metadata again. Preserve a dated before snapshot outside the source tree, including page visibility/template. Compare with the prepared manifest. Stop on unrelated drift and merge only this feature into fresh live bytes.
3. Build a scoped upload folder from the protected source. Merge only `advisory_team` into the freshly read live English locale; apply only the additional navigation render line. Do not upload `settings_data.json`, homepage templates, merchants' settings, historical theme files or unrelated navigation changes.
4. Run official Theme Check and page/navigation tests on the merged candidate; inspect an unpublished preview on desktop/mobile. Confirm consultation previews and Coming Soon labels remain in place.
5. Upload each of the 20 explicit manifest filenames to the freshly verified MAIN ID with `shopify theme push --store carpetup.myshopify.com --theme <fresh-main-id> --path <scoped-protected-candidate> --nodelete --only <each-manifest-filename>`. A live-target CLI confirmation is a release action. Never call theme publish or upload the full development theme.
6. Read back all 20 files, including binary checksums, before making the page visible. Verify all non-manifest theme checksums are unchanged. Record exact SHA/tree, theme ID, files and timestamp.
7. With page-publication approval, set only the existing hidden page `isPublished:true` and the verified `meet-our-team` suffix. The guarded navigation now resolves to `/pages/meet-our-team` on desktop/mobile. Do not add a second merchant-menu entry.
8. Exit preview and verify the permanent page, all six profiles, keyboard/skip/automatic timer, navigation, existing homepage/Library/FI/Visualiser/House/measuring/cart routes. Capture live receipts. No AI activation or Vercel deployment accompanies this page release.

## Scoped rollback

Immediately hide the page (restore its prior unpublished state) to withdraw the navigation link. Restore only the two edited live files—locale and header—from that release's fresh before snapshot. Remove only newly introduced manifest assets if separately approved; leaving unused files is a safe reversible fallback. Keep the page record and evidence. Verify navigation and existing routes again. Never publish an old theme, revert merchant settings or roll back Vercel for this theme-only release.

## Outstanding acceptance

Physical iPhone Safari/touch and a real screen-reader run require equipment or an accessible native control surface and remain pending unless new evidence explicitly closes them. Browser viewport/keyboard and DOM accessibility evidence are not substitutions. Actual-browser reduced-motion verification is recorded separately from unit tests. No production release is inferred from a green test.
