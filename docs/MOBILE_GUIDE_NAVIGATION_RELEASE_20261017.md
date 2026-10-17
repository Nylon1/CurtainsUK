# Mobile Guide navigation release, 17 October 2026

## Customer result and evidence limit

On a physical iPhone in Safari, the owner reported that **Guide** expanded but tapping any of its three links closed the submenu without navigating. The affected customer destinations were `/pages/how-to-use`, `/pages/how-to-measure`, and `/pages/how-to-fit`. Desktop Chrome and earlier mobile emulation had not reproduced the failure.

The first scoped repair, [PR #234](https://github.com/Nylon1/CurtainsUK/pull/234), removed immediate disclosure and dialog closing from link clicks. It passed `curtainsuk-production-gate` and `protected-production-policy`, merged into `release/production` at `e50889caf5af1b95d02a7cfdd2f3334506ca7cc4`, and its single JavaScript asset was uploaded to MAIN. Desktop live navigation succeeded, but the owner then reported that the physical iPhone still did nothing when a Guide link was tapped. **PR #234 alone is not a physical-device pass.**

The owner clarified that tapping a Guide destination closed the open submenu without changing page. The next scoped repair, [PR #235](https://github.com/Nylon1/CurtainsUK/pull/235), prevents the header disclosure's `focusout` handler from closing it on mobile before Safari completes the link tap. Desktop focusout closing remains in place. A focused local synthetic event-order check passed for mobile and desktop, and both required protected checks passed. PR #235 merged at `fe7b6e214c7aa087ee5e32c4c0a755e55d170982`, tree `50af2850aa70459db0206855d73002ea940d5e42`.

After that upload and a homepage reload, the owner tested on the physical iPhone and reported **all three Guide links open correctly**. This is owner-reported device evidence for these links. No instrumented iPhone console/network trace, spoken VoiceOver check, or complete physical-device menu audit was performed.

## Source, live theme, and rollback evidence

| Surface | Current identity and readback |
| --- | --- |
| Protected source | `release/production` PR #235 merge `fe7b6e214c7aa087ee5e32c4c0a755e55d170982`; `shopify-theme/curtainsuk-dawn-16/assets/curtainsuk-header.js` plus the corresponding `shopify-theme/production-main-overlay/manifest.json` digest. |
| Customer MAIN theme | `182339731835` on `carpetup.myshopify.com`; only `assets/curtainsuk-header.js` was uploaded for PR #235, with `--nodelete`. No theme publication or setting change. |
| Pre-upload scoped backup | `C:\Users\hamza\.codex\tmp\cuk-guide-iphone-20261017\pre-pr235\assets\curtainsuk-header.js`, SHA-256 `A4F95E25B068FDC89029A435801CF89E4848EB23F03D457AF666B7D69F67BBEA`. This is the PR #234 asset that still failed on iPhone. |
| Post-upload scoped readback | `C:\Users\hamza\.codex\tmp\cuk-guide-iphone-20261017\post-pr235\assets\curtainsuk-header.js`, SHA-256 `323C522D8A53FB9C0C044D9A359CF178D70525F63B4D5E2D414185769261EDBC`; byte-for-byte equal to protected source. |
| Production theme source manifest | `node scripts/verify-production-theme-sync.mjs` passed for the 537 expected files. This was a local source-manifest check, not a fresh full live-theme pull. |
| Other services | Existing Vercel gateway/HCI and Supabase were not changed or redeployed for either Guide repair. Their earlier release identities remain separate. |

For an unrelated regression requiring rollback, restore only the backed-up header asset after checking current MAIN state and then read it back. The pre-PR #235 backup reintroduces the iPhone Guide failure, so it is recovery evidence rather than a healthy long-term target. The local full-theme source manifest and exact post-upload asset readback establish this scoped source/live sync; they do not establish every current MAIN file or every mobile journey.
