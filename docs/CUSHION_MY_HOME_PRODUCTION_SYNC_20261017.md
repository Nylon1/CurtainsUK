# Cushion Studio and My Home production sync, 17 October 2026

This checkpoint supersedes the unpublished Cushion Studio checkpoint in `PRODUCTION_SURFACES.md`. It records the source, customer-serving assets, and non-secret configuration needed to reproduce the current release. The protected `release/production` branch remains the release authority. Documentation-only commits after the deployed commit do not change the runtime.

## Source and customer-serving surfaces

| Surface | Current release identity | Verification |
| --- | --- | --- |
| Protected runtime source | PR #218 merged at `fabeb144e5289f6d2a527918cdb31c39c1166f63`, tree `33c2188973598d3b13ea0236747019c30c6f367a` | Both required checks passed before merge. |
| Existing Vercel project | `prj_vl2GLLlSf0AJAKqjs1Nk26ipKHBA`, production alias `curtainsuk-production-api.vercel.app` | Alias resolved to READY deployment `dpl_7QqGjd15hiat4W57LwyjkWhALaii`; deployment metadata records the protected SHA and tree. |
| Shopify MAIN theme | `182339731835` on `carpetup.myshopify.com` | Only `assets/curtainsuk-my-home.js` was uploaded for PR #218. Remote pull SHA-256 `35ECCA09747B1D7BB01B849ECBEC4A0F386503001F9888A8043A882538D5202E` equals protected source. |
| Database | Existing Supabase main project `hqysjumypgeapgmqkcrx` | No schema or governed fabric data change in PR #218 or this release. |

The scoped MAIN theme backup for this release is held locally at `C:\Users\hamza\.codex\tmp\my-home-width-20261017\before\assets\curtainsuk-my-home.js`, SHA-256 `DB69D8F02E31C82B1281E6C0DE72D5EF3A1890EC3DC43F6D42FD64B46D0C7C41`. The prior serving Vercel deployment for an immediate rollback is `dpl_CfVvfv4oSbSD7y5eggp1SWiTB8U2`. These are scoped rollback pointers, not a request to restore the historical deployment baseline.

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

After the final alias promotion and MAIN theme readback, an isolated browser order with an eligible Abeja Linen curtain and Dunbar Gemstone filled cushion returned £605.00 and £65.66 for the items. My Home showed products £670.66, one delivery charge £12.95, and total £683.61. It displayed a combined dispatch estimate of 4-5 calendar weeks after order confirmation. The checkout control enabled after the customer specification acknowledgement. Verification stopped before the control, so no Draft Order, payment, or email was created. The non-current Amalfi Herb and Acies Amethyst records remain individually purchase-restricted; width handling does not override fabric lifecycle readiness.

The first promoted candidate was rolled back because the mixed order still showed a closed purchase gate. The existing shared production flags were then aligned with this contract, and a new deployment from the same protected source produced the live result above. Do not reuse the first candidate as a known-good release.

This record verifies the affected source, Vercel alias, MAIN theme asset, and purchase-gate behaviour. It does not claim a complete audit of every theme file, all project environment values, physical iPhone Safari, spoken VoiceOver, or a paid checkout. Those remain separate evidence requirements. No new theme, app, Vercel project, or database was created.
