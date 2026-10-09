# CurtainsUK production surfaces

The protected `release/production` branch is the release authority. Deploy only its exact HEAD after both protected checks pass. The Vercel deployment metadata must retain that SHA and tree; theme files have their own scoped upload and read-back. A Vercel `production` label alone is not storefront parity.

## Verified Room Visualiser release — 9 October 2026

The current Room Visualiser source of truth is the [release/handover record](room-visualiser-2-customer-release.md) and its [structured production state](room-visualiser-2-production-state.json). Source and live assets were read back on 9 October at 09:00–09:01 UTC.

- Deployed protected commit: `800f42a27a0a6e9beb1abd92821145bf4a4b98c4`, Git tree `1150dad1d55649597d03df2dbaad01348ea98d63`, customer integration PR #164. PR #163 merged the prototype source only.
- READY deployment: `dpl_CvvQKa2zCsFbQ7eZR9Lzi31w7BCD`. Vercel's `gitCommitSha` and `curtainsukReleaseSha` both match the deployed commit. A tree field was not stored in deployment metadata; the tree above is independently read from Git, with all 96 deployed pack files checked byte-for-byte against the release checkout. Do not describe the tree as a Vercel metadata attestation.
- Runtime pack: `d5908d6eaf486ce33e2f72a5`; unchanged FIXED140 module pack: `3ef99c8970b0b92d4b5986f7`.
- All three project domains below serve the current viewer bytes. The native Shopify page and signed proxy return 200; the native page identifies live theme `182339731835` with role `main`.
- 11,003 supported identities: 3,137 STANDARD and 7,866 FIXED140. This release changes room/material presentation; catalogue eligibility and fabric assignments are unchanged.
- Physical iPhone Safari verification and storage recovery remain outstanding. Active Shopify app configuration and a complete scoped theme-file read-back were not repeated by this documentation sync; the served native page/proxy and public theme identity were checked. **FULLY SYNCHRONISED is not claimed.**

Documentation-only synchronisation commits may advance the protected branch without changing the deployed runtime. Keep the exact deployed commit above separate from the current branch tip and prove any intervening diff is documentation-only. Do not redeploy merely to update a handover record. The preserved historical `main` checkout and experimental worktrees are not deployment authorities.

## Customer route

`www.curtainsuk.com` is Shopify (`carpetup.myshopify.com`, live theme `182339731835`). It is not the Next.js storefront. `/pages/room-visualiser` is a published native page with template `page.room-visualiser.json` and Theme Editor section `curtainsuk-room-visualiser`. The section owns the full-width mount, introductory text, starting room, loading/error/retry UI, accessibility and sample advisory. The engine remains isolated in the existing same-origin Shopify app-proxy frame.

`/apps/curtainsuk-decision/*` is the installed `curtains-uk-mtm` app proxy. Its production backend and CDN are `https://curtainsuk-production-api.vercel.app`. The existing Vercel project ID is `prj_vl2GLLlSf0AJAKqjs1Nk26ipKHBA`; its historical project name is `curtainsuk-staging-api`. Retaining that identity preserves the established production settings, secrets and backing services. No second production service or catalogue is created.

The canonical production hostname is a project domain, not a manually pinned one-off deployment alias. Legacy `curtainsuk-staging-api.vercel.app` and `curtainsuk-staging-gateway.vercel.app` must follow that same production project for compatibility. The legacy OAuth callback remains accepted for existing sessions; new app/proxy traffic uses the canonical production hostname. `/api/staging/shopify-proxy` is an established authenticated route name, not a staging environment: do not rename it or bypass its HMAC checks as cosmetic cleanup.

## Native discovery

- Fabrics navigation: `curtainsuk-header-navigation` includes Room Visualiser on desktop/mobile.
- Fabrics landing: `page.fabric-library` includes the reusable `curtainsuk-visualiser-entry` section.
- Theme Editor: Room Visualiser feature can be added to other JSON templates, including the homepage, with optional governed fabric-link blocks.
- Fabric Browser and premium Fabric Profiles reuse catalogue identity and the existing eligibility gate; only the approved set offers See in room. Unsupported fabrics retain samples/purchasing and their availability message.
- Native profile CTA: `curtainsuk-room-preview-link` is the reusable identity-aware snippet.

## Runtime and storage

`lib/room-visualiser/assets.json` contains the 3,137 approved STANDARD fabric entries; `lib/room-visualiser/fixed140-assignments.json` contains 7,866 explicit FIXED140 assignments. Their union is 11,003 supported fabrics. The four original reference derivatives remain unchanged, each 2048 × 1113 WebP; their hashes, dimensions and immutable cache headers were rechecked during this sync. Later approved assets retain their existing publication and physical-scale contracts.

Immutable versioned files live in the Vercel deployment's durable static/CDN storage under the pack hash in `build.json`; the deployment is retained and the same pack is included in later releases. CDN headers are `public, max-age=31536000, immutable`. The browser loads the current curtain texture; it does not preload a catalogue of GPU textures. The four approved room environments use ordinary modules under `runtime/rooms/environment/`, with per-room design modules and photographs loaded on first selection. The local `experiments/room-visualiser-2/` review tooling is excluded from deployment.

Masters and provenance remain internal engineering artifacts. Source-preserving jigsaw generation and the offline pack builder are never run by a customer request. No eligibility expansion accompanies this synchronization. The frozen engine, physical mapping, room GLBs, cameras and texture hashes are covered by the existing frozen-source tests.

## Staging-reference classification

- Historical Vercel project name and compatibility domains: intentional existing service identity/compatibility, not separate staging runtime.
- `shopify.app.toml` legacy OAuth callback: compatibility only; primary application and app proxy use production hostname.
- `release/baseline.json`, `release/rollback.mjs`: historical bootstrap capture, explicitly superseded by the active manual release policy in `release/README.md`; do not invoke that stale rollback target. Rollback uses the recorded previous known-good deployment and corresponding scoped theme/app configuration backups.
- Dated rollout/audit documents: historical evidence, preserve rather than rewriting history.
- Test fixtures using a historical origin: test input only.
- `curtainsuk-visualiser-review`: isolated review project, not a customer dependency.

## Read-back required for each synchronized release

Record the deployed protected SHA/tree separately from any later documentation-only branch tip, and record local/remote ahead/behind; Vercel project/deployment READY, source metadata and all production domain targets; active Shopify app configuration, live theme/template/section/navigation and profile links; four downloaded texture hashes/dimensions/cache headers; public desktop and physical iPhone Safari results. Identify whether a tree is stored in Vercel metadata or independently verified from Git. A draft theme preview is a separate surface, never proof of the live theme. Exit Shopify preview before the physical-phone test. Do not report FULLY SYNCHRONISED while that test remains outstanding.

Do not modify FI, Naila, catalogue records, supplier artwork, Merchant, pricing or checkout state to make a verification pass. A stale advisory fixture is reported, not repaired through production data writes.
