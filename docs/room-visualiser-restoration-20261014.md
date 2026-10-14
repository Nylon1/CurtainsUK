# Production Room Visualiser restoration — 14 October 2026

This repair is separate from Cushion Studio / PR #201. No Shopify theme files, catalogue eligibility, curtain renderer or supplier artwork were changed.

## Incident and restoration

The canonical alias pointed to `dpl_FkVeLbGChwCwEBNvsynfhrTvUA1K`, the current specialist release. Its uploaded source contained only the basic public assets and omitted `public/room-visualiser`. The build completed because the existing prebuild compiled the premium and Naila bundles without checking the released visualiser package. All 102 files in the two current module packs returned 404. The configured immutable cache header also covered those missing paths. The live Shopify iframe remained stuck on “Preparing your fabric”.

The complete protected source at `d70a3f4ee2bca8f098a3d9acce0c2a6a5d11ed92` (tree `a73d6f59a5d131d19c92244426098283941b1389`) was exported with original Git bytes. PR #200's two required checks passed before its merge. A dry upload inventory contained all 96 files of pack `d5908d6eaf486ce33e2f72a5`, the six FIXED140 modules and catalogue textures. No renderer regeneration was performed.

Deployment `dpl_61iUGgFHxn74kyBASisBetx2HBqN` was staged as Production with automatic domain assignment disabled, verified, then promoted. Its source SHA is recorded in deployment metadata; the tree above is independently read from Git. The existing adviser source-attestation values were advanced to that protected SHA while retaining the existing public routes, provider and budget limits. Unsigned Jane, specialist and visualiser requests still return 401. This is an authentication smoke check, not a new paid model or customer-data test.

All three existing aliases point to the restored deployment: `curtainsuk-production-api.vercel.app`, `curtainsuk-staging-api.vercel.app` and `curtainsuk-staging-gateway.vercel.app`. The previously failing entry URL now returns HTTP 200 with JavaScript MIME type.

## Verification

- Staged readback: 102 module/room-pack files and five representative fabric textures matched their expected hashes; three unsigned proxy routes denied access.
- Full public readback at 18:18 UTC: **11,016 / 11,016** assets returned HTTP 200 with expected SHA-256 and usable CORS: 102 module/room files, 3,048 unique STANDARD textures and 7,866 FIXED140 images. One public FIXED140 image uses wildcard CORS, which is valid for its credential-free image request. All expected bytes matched.
- Live Shopify browser: Living Room, Bedroom, Lounge and Office each passed Daylight, Evening and Fabric inspection in both Room and Curtain camera views: **24 combinations**, with screenshots and selected-control readback. A second browser pass selected the FIXED140 Abeja — Blush fabric through Change fabric, then verified Room, Curtain and Full curtain views in every room: **12 further combinations**. STANDARD has two camera views; FIXED140 exposes the third.
- No physical iPhone or spoken VoiceOver result is claimed.
- Packaging guard: eight automated checks cover complete packages, missing entry/room/FIXED140/texture files, altered immutable bytes, an unrecorded build pointer and invocation by the normal prebuild. The full local package verifies 3,150 files / 204,383,626 bytes.

Evidence directory: `C:/Users/hamza/curtainsuk-room-visualiser-repair-evidence-20261014`. Key files: `before-pack-readback.json`, `deploy-inputs.json`, `stage-readback.json`, `live-assets.json`, `live-ui-checks.json`, `live-fixed140-ui-checks.json`, and the 36 named screenshots. Full per-asset hashes remain in the local evidence rather than duplicating the large catalogue in this document.

## Prevention and rollback

The accompanying packaging change invokes the immutable asset verifier before every normal production build and supplies a complete protected-source export command. See [packaging instructions](room-visualiser-packaging.md). A sparse or incomplete upload now fails rather than replacing production with missing assets.

For the packaging-only follow-up deployment, `dpl_61iUGgFHxn74kyBASisBetx2HBqN` is the verified restoration rollback target. The incident deployment `dpl_FkVeLbGChwCwEBNvsynfhrTvUA1K` is retained for emergency service rollback but has broken visualiser assets. Do not roll the whole service back to the older 9 October visualiser deployment: that predates the specialist service release.
