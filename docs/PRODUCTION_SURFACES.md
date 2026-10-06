# CurtainsUK production surfaces

The protected `release/production` branch is the release authority. Deploy only its exact HEAD after both protected checks pass. The Vercel deployment metadata must retain that SHA and tree; theme files have their own scoped upload and read-back. A Vercel `production` label alone is not storefront parity.

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

The four approved fabric derivatives remain unchanged, each 2048 × 1113 WebP. `lib/room-visualiser/assets.json` maps their content hashes to canonical fabric IDs. Immutable versioned files live in the Vercel deployment's durable static/CDN storage under the pack hash in `build.json`; the deployment is retained and the same pack is included in later releases. CDN headers are `public, max-age=31536000, immutable`. The browser loads the current curtain texture; it does not preload a catalogue of GPU textures.

Masters and provenance remain internal engineering artifacts. Source-preserving jigsaw generation and the offline pack builder are never run by a customer request. No eligibility expansion accompanies this synchronization. The frozen engine, physical mapping, room GLBs, cameras and texture hashes are covered by the existing frozen-source tests.

## Staging-reference classification

- Historical Vercel project name and compatibility domains: intentional existing service identity/compatibility, not separate staging runtime.
- `shopify.app.toml` legacy OAuth callback: compatibility only; primary application and app proxy use production hostname.
- `release/baseline.json`, `release/rollback.mjs`: historical bootstrap capture, explicitly superseded by the active manual release policy in `release/README.md`; do not invoke that stale rollback target. Rollback uses the recorded previous known-good deployment and corresponding scoped theme/app configuration backups.
- Dated rollout/audit documents: historical evidence, preserve rather than rewriting history.
- Test fixtures using a historical origin: test input only.
- `curtainsuk-visualiser-review`: isolated review project, not a customer dependency.

## Read-back required for each synchronized release

Record protected SHA/tree and zero ahead/behind; Vercel project/deployment READY, source metadata and all production domain targets; active Shopify app configuration, live theme/template/section/navigation and profile links; four downloaded texture hashes/dimensions/cache headers; public desktop and physical iPhone Safari results. A draft theme preview is a separate surface, never proof of the live theme. Exit Shopify preview before the physical-phone test. Do not report FULLY SYNCHRONISED while that test remains outstanding.

Do not modify FI, Naila, catalogue records, supplier artwork, Merchant, pricing or checkout state to make a verification pass. A stale advisory fixture is reported, not repaired through production data writes.
