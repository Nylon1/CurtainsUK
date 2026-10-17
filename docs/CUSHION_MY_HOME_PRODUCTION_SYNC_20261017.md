# Cushion Studio and My Home production sync, 17 October 2026

This checkpoint supersedes the unpublished Cushion Studio checkpoint in `PRODUCTION_SURFACES.md`. It records the source, customer-serving assets, and non-secret configuration needed to reproduce the current release. The protected `release/production` branch remains the release authority. Theme-only and documentation-only commits after the API deployment do not change its runtime.

## Current source reconciliation, 17 October 2026 at 05:23 UTC

PR #222 passed `curtainsuk-production-gate` and `protected-production-policy` and merged into protected `release/production` at `3e91a6450bcac86a6d77744232b28cf8aa077d8f`, tree `2b1a5741a4f17c0e4dffb98b9d2e8f23040b09c3`. The local checkout and remote protected branch were at this commit with zero ahead/behind when inspected. PR #222 changed only `assets/curtainsuk-my-home.js` and `.css`; it did not require a new API deployment. The live API alias still resolves to READY deployment `dpl_EoUhue7dKHjYZhg8zcRHTGid8KNR`, whose metadata records the earlier protected API source `32535688efd33906543ddf0c34ff6c33f726c665` and tree `38f4b63d27f82f72de0042c0d3d2f12749cf9946`. The intervening protected diff contains only this record and those two Shopify assets.

MAIN theme `182339731835` was pulled in full from `carpetup.myshopify.com`. The two PR #222 assets match protected source exactly by SHA-256: My Home JS `C4F44483365EE237B83419D289069B53ECEDF02119E418BB0CB7B892D7D6711E` and CSS `F0B95172F6A4E1ED1EE018BF6489726ACD06F3C691E24DA498326D4E3CB0A005`. Live My Home review displayed the one delivery charge, the combined 4-5 week dispatch estimate and a specific disabled-checkout reason; an eligible curtain and cushion review calculated £670.66 products, £12.95 delivery and £683.61 total. Its checkout control enabled after the specification acknowledgement. An earlier bounded signed-in mixed-order test reached Shopify checkout; no payment or customer email was sent. This is not a replay of the owner's five-item saved order.

The full pull exposed historical theme drift outside the two PR #222 files. `shopify-theme/curtainsuk-dawn-16` has 515 theme files. MAIN has 537. Five shared files have substantive differences, including live purchase settings, header composition and cart templates; 22 older or app-owned files exist only on MAIN. These have been captured without editing MAIN in `shopify-theme/production-main-overlay`. The base plus overlay reproduces all 537 pulled MAIN files under the semantic comparison recorded in `shopify-theme/production-main-overlay/manifest.json`. The comparison parses JSON after Shopify's generated comment and normalizes text line endings and trailing whitespace; it does not claim byte equality for Shopify-normalized files. The scoped JS and CSS hashes above are exact byte equality. Run `node scripts/verify-production-theme-sync.mjs` to verify protected source against the manifest, or add `--live <fresh MAIN pull directory>` to compare a new readback. Use `--output <empty directory outside the repository>` to materialize the complete theme before a future full-theme deployment. Do not upload the overlay alone.

The Production environment on the existing Vercel project still lists the seven Cushion Studio and My Home keys in the table below with the approved non-sensitive values. The four shared keys remain marked sensitive, so their values were not exported or copied into Git; the successful live mixed review and checkout boundary are runtime evidence that the gates were open. No `CUSHION_STUDIO_PRICING_RULES_JSON` override is listed, so the protected default remains the server rule. The owner left the delivery policy unchanged: £4.95 once for cushion-only orders; the governed curtain charge once for curtain and mixed orders, currently £12.95 for ordinary UK Mainland delivery. Curtains and mixed orders retain the postcode review because the governed policy has distinct regional and specialist charges. No Shopify, Vercel or database configuration was changed for this reconciliation.

This reconciliation proves the current MAIN theme file set can be reconstructed from protected source and identifies the exact serving API commit and named production gates. It does not establish decrypted secret parity, an exhaustive Vercel generated-file manifest, physical iPhone Safari, spoken VoiceOver, or a paid order. Keep those evidence limits separate from the verified release surfaces.

## PR #220 release checkpoint retained for history

| Surface | Current release identity | Verification |
| --- | --- | --- |
| Protected runtime source | PR #220 merged at `32535688efd33906543ddf0c34ff6c33f726c665`, tree `38f4b63d27f82f72de0042c0d3d2f12749cf9946` | Both required checks passed before merge, including Nylon1's exact-head policy approval. |
| Existing Vercel project | `prj_vl2GLLlSf0AJAKqjs1Nk26ipKHBA`, production alias `curtainsuk-production-api.vercel.app` | Alias resolved to READY deployment `dpl_EoUhue7dKHjYZhg8zcRHTGid8KNR`. The deployment was staged from the exact protected checkout with its SHA supplied at build time and its SHA and tree supplied as deployment metadata. |
| Shopify MAIN theme | `182339731835` on `carpetup.myshopify.com` | Only `assets/curtainsuk-my-home.js` was uploaded for PR #220. Remote pull SHA-256 `B4B9617E35C5AC4BA839D67B3FACC599098354B98EF3EE89E1F2D530E7309701` equals protected source. |
| Database | Existing Supabase main project `hqysjumypgeapgmqkcrx` | No schema or governed fabric data change in PR #218 or this release. |

The scoped MAIN theme backup for PR #220 is held locally at `C:\Users\hamza\.codex\tmp\my-home-pr220-20261017\before\assets\curtainsuk-my-home.js`, SHA-256 `35ECCA09747B1D7BB01B849ECBEC4A0F386503001F9888A8043A882538D5202E`. The prior serving Vercel deployment for an immediate rollback is `dpl_7QqGjd15hiat4W57LwyjkWhALaii`. Restore only this theme asset and the prior alias target if this release regresses. The older PR #218 backup remains historical evidence.

## Production configuration contract

These are server-side settings on the **existing** Vercel project, Production environment only. The seven Cushion Studio and My Home keys were created for this release. Four existing shared keys were explicitly set to their approved production values before the final deployment. No credential value belongs in this record.

| Key | Required value | Role |
| --- | --- | --- |
| `CUSHION_STUDIO_HOSTED_ENABLED` | `true` | Hosted API and persistence. |
| `CURTAINSUK_MY_HOME_ENABLED` | `true` | Shared order entry. |
| `CUSHION_STUDIO_PURCHASES_ENABLED` | `true` | Cushion purchase gate. |
| `CUSHION_STUDIO_WEBHOOK_ENABLED` | `true` | Paid-order fulfilment receiver gate. |
| `CUSHION_STUDIO_MIXED_ENABLED` | `true` | Mixed curtain and cushion review. |
| `CUSHION_STUDIO_COMMERCIAL_APPROVAL_REFERENCE` | `OWNER_20261016_CUSHION_RATE_FIT_AND_PURCHASE_APPROVAL` | Owner's cushion commercial approval. |
| `CUSHION_STUDIO_MIXED_SHIPPING_APPROVAL_REFERENCE` | `OWNER_20261016_SINGLE_DELIVERY_HELD_MIXED_ORDER` | Owner's combined delivery approval. |
| `CURTAINSUK_PRODUCTION_PURCHASES_APPROVED` | `true` | Existing shared production purchase authority. |
| `CURTAINSUK_ROOMS_ENABLED` | `true` | Existing House curtain capability. |
| `CURTAINSUK_ROOMS_CHECKOUT_RELEASED` | `true` | Existing House checkout gate. |
| `CURTAINSUK_DEPLOYMENT_STAGE` | `PRODUCTION` | Existing production pricing and checkout stage. |

The existing Shopify Draft Order mode must remain `CREATE_PRODUCTION_DRAFT`; existing Shopify store and app credentials, Supabase credentials, and proxy authentication settings remain prerequisites. Their values are not copied into Git. Vercel hides the four shared values on readback because they are marked sensitive. The release write operations succeeded, the new key names and Production targets were listed, and the live mixed-order review and checkout-enabled boundary exercised the combined gates. This is runtime evidence of the gate state, not a decrypted configuration export. A future deployment must set and verify this contract before promotion; a READY build alone is insufficient.

## Bounded live proof

After the PR #220 alias promotion and MAIN theme readback, an existing browser order with an Abeja Linen curtain and Dunbar Gemstone filled cushion returned £605.00 and £65.66 for the items. My Home showed products £670.66, one delivery charge £12.95, and total £683.61. It displayed a combined dispatch estimate of 4-5 calendar weeks after order confirmation. The checkout control enabled after the customer specification acknowledgement. Verification stopped before the control, so no Draft Order, payment, or email was created. The Dunbar cushion image rendered its selected striped fabric instead of the neutral style study.

The live Cushion Studio server quoted a 50 cm filled, unpiped Amalfi Herb cushion at £70.72 and the same Acies Amethyst configuration at £75.40. A temporary Acies item was added to My Home and repriced at £75.40. The mixed order then showed products £746.06, one £12.95 delivery charge, and total £759.01. The temporary Acies item was removed; the original two-item order repriced back to £683.61. These facts establish that lifecycle `UNKNOWN` does not itself block a cushion when the shared commercial eligibility rule, verified cost, fresh stock and cutting requirements pass. Explicitly discontinued, stale, missing-cost and other unsupported configurations retain their individual safeguards. The exact third fabric in the owner's photograph was not identifiable from the image and was not claimed as tested.

During PR #218, the first promoted candidate was rolled back because the mixed order still showed a closed purchase gate. The existing shared production flags were then aligned with this contract, and a new deployment from that protected source produced the prior live result. Do not reuse the first PR #218 candidate as a known-good release.

This record verifies the affected source, Vercel alias, MAIN theme asset, and purchase-gate behaviour. It does not claim a complete audit of every theme file, all project environment values, physical iPhone Safari, spoken VoiceOver, or a paid checkout. Those remain separate evidence requirements. No new theme, app, Vercel project, or database was created.
