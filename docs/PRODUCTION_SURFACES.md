# CurtainsUK production surfaces

## Current live audit, 19 October 2026 Europe/London

The [fresh live-site audit](LIVE_SITE_AUDIT_20261019.md) records the current source and bounded functional checks. All 67 Production environment entries match the final launch record; the complete 541-file Shopify MAIN theme matches protected source. Existing customer features and stock/maintenance schedules were not switched off. The serving runtime remains `881fd80c9c911186bd4476c5f18cbecf7058445b` on READY deployment `dpl_BWj7SCCARGac4pkYZJjYeCoiojoz`; subsequent documentation-only commits do not change it.

The audit found a broken Smart Track Studio footer guide destination, with a checked correction prepared in [PR #241](https://github.com/Nylon1/CurtainsUK/pull/241), not yet published. Room Visualiser displayed one load failure and subsequently rendered after a fresh reload; the cause was not established. Signed-in AI generation, payment and supplier release were not replayed. This record does not claim every flow passed without qualification. Earlier checkpoints below retain their dates and historical deployment identities.

## Current Motorised Curtain Tracks publication, 18 October 2026 UTC

Motorised Curtain Tracks, Smart Track Studio, the visual fitting guide and the illustrated motor guide are live. PRs #237, #238 and #239 passed both required checks before merge. The current shared-service runtime is protected `881fd80c9c911186bd4476c5f18cbecf7058445b`, tree `ab7ac4a92a3719899c07e09ebe7919a84b745f74`, serving from READY deployment `dpl_BWj7SCCARGac4pkYZJjYeCoiojoz`. PR #239 restores the remote/app controls on phones and tablets. The prior Smart Track deployment `dpl_HktUhDS9xcmgaWP9dsEWXsrb3VUF` is its immediate runtime rollback.

The existing Shopify MAIN theme `182339731835` matches the complete 541-file protected manifest after the scoped upload. The menu and My Home category use **Motorised Curtain Tracks**; the demonstration remains **Smart Track Studio**. Existing navigation and released settings are retained. Existing Supabase project `hqysjumypgeapgmqkcrx` contains the additive private smart-track migration. See [the full release and configuration record](smart-track-studio/PRODUCTION.md).

All five adviser gateways still reach `CUSTOMER_SIGN_IN_REQUIRED`. Browse Fabrics, Naila, Room Visualiser, Fabric Intelligence and Cushion Studio were checked live; existing feature switches were not disabled. Live checks covered 20 smart-track assets, Go/iOn prices, track-only and multiple-track review, excluded postcodes, saving/reopening/editing in My Home, a combined curtain/track order and one delivery charge. No payment, signed-in AI reply or new room-image analysis was performed. Later documentation-only protected commits do not change this deployed runtime identity. The deployment pointers below are historical checkpoints.

## Current mobile Guide navigation, 17 October 2026

The [mobile Guide release record](MOBILE_GUIDE_NAVIGATION_RELEASE_20261017.md) is the current authority for this scoped Shopify header repair. [PR #234](https://github.com/Nylon1/CurtainsUK/pull/234) merged at `e50889caf5af1b95d02a7cfdd2f3334506ca7cc4` and was deployed, but the owner reported that the Guide submenu still closed without navigation on a physical iPhone. [PR #235](https://github.com/Nylon1/CurtainsUK/pull/235) passed both protected checks, merged at `fe7b6e214c7aa087ee5e32c4c0a755e55d170982`, and changed only the mobile disclosure focus handling and its production theme manifest entry. Only `assets/curtainsuk-header.js` was uploaded to existing Shopify MAIN theme `182339731835`; its post-upload readback SHA-256 `323C522D8A53FB9C0C044D9A359CF178D70525F63B4D5E2D414185769261EDBC` exactly matches protected source. After a homepage reload, the owner reported that all three Guide links opened correctly in iPhone Safari. This is a physical-device result for the Guide links only, not a complete mobile or accessibility acceptance test. No Vercel, HCI, Supabase, Shopify setting, or purchase configuration changed.

## Current adviser gateway repair, 17 October 2026

The existing customer-serving Vercel aliases now serve `dpl_SDfPE1hhDmZ5LkojV8raju32gj5S` from clean protected runtime source `d82d2c088d2c7211094adb8d56f6e860adc8a30d`. The specialist production release settings and Jane's separate exact-commit approval were reconciled. Unsigned Jane and specialist gateway probes returned HTTP 401, and all five live Shopify consultation shells reached their adviser-specific sign-in boundary. A signed-in paid reply and recovery were not replayed. No theme, database or route was changed. See the [specialist advisory source of truth](CURTAINSUK_SPECIALIST_AI_ADVISORY_PLATFORM.md). The incident and shared-service deployment references below are earlier snapshots; the Cushion Studio MAIN theme readback remains unchanged.

## Resolved adviser availability incident, 17 October 2026

At the pre-repair checkpoint, Jane's unsigned consultation route reached its sign-in boundary. The four other publicly advertised specialists, Noah, James, Ben and Natalie, received an HTTP 404 at 10:34 UTC at their shared consultation gateway before authentication or a paid reply. Their browser shells displayed "This consultation is unavailable right now." The [specialist advisory source of truth](CURTAINSUK_SPECIALIST_AI_ADVISORY_PLATFORM.md) records the deployment comparison, current configuration evidence and verification limits. Do not treat the 14 October successful specialist launch as proof of current availability.

## Current Cushion Studio and My Home checkpoint, 17 October 2026

The [Cushion Studio and Design My Home production sync record](CUSHION_MY_HOME_PRODUCTION_SYNC_20261017.md) is the current authority for the serving API commit, protected theme commit, MAIN theme readback, production flag contract and bounded live mixed-order verification. Cushion Studio and Design My Home are live. The customer-serving API deployment is `dpl_EfjeysuAAuePYYYw2PiX9Du3pTYA`, built from protected runtime commit `39528f72beb79dbb880fb8d3bf130e61a0a2c785`. The latest Cushion Studio theme release is protected commit `42274a31d076b404bb3442493facf642715563a2`; its changed section was read back exactly from existing Shopify MAIN theme `182339731835`. The 17 October reconciliation records a 537-file MAIN theme manifest reproducible from the protected Dawn base plus the production overlay, without changing the live store. It supersedes the unpublished checkpoint below for these two features. Later theme-only or documentation-only commits may advance the protected branch without changing the deployed API runtime; retain and compare each exact SHA and tree separately.

## Historical unpublished Cushion Studio database checkpoint, 16 October 2026

At the owner's direction, the existing Supabase main project `hqysjumypgeapgmqkcrx` received only the additive Cushion Studio persistence migration. The source SQL SHA-256 is `9F142A659C027494D6711708078C5B432DF01DAB963CBA530A182AD0DC9A11A2`; hosted migration history names it `20261016161822_cushion_studio_distinct_persistence_20261014`. Seven new private tables and their functions are present; the design and snapshot tables had zero rows at 16:18:33 UTC. Browser roles cannot read saved designs. The dashboard listed a 16 October 01:07:02 UTC physical backup. No Shopify proxy, MAIN theme, production gateway, public route, purchase gate or customer record changed. The owner held any new preview access grant. The existing development theme and protected Vercel project remain the intended review surfaces; no duplicate app, theme, Vercel project or database remains. The candidate is unpublished and PR #201 remains draft. See [Cushion Studio release readiness](CUSHION_STUDIO_MY_HOME_RELEASE_READINESS_20261016.md) for the remaining hosted checks.

The protected `release/production` branch is the release authority. Deploy only its exact HEAD after both protected checks pass. The Vercel deployment metadata must retain that SHA and tree; theme files have their own scoped upload and read-back. A Vercel `production` label alone is not storefront parity.

## Historical production checkpoint, 14 October 2026

The [restoration and packaging release record](room-visualiser-restoration-20261014.md) and [structured production state](room-visualiser-2-production-state.json) supersede the 9 October deployment and rollback pointers. The original room-design release remains historical evidence in the [customer release record](room-visualiser-2-customer-release.md).

- PR #203 passed both required checks and merged into protected `release/production` at `345c553c4553b159a587fdc6a7de7be48ca010e6`, tree `30dc037bd09d6c11836d73686efca22aecfd36e0`.
- READY deployment: `dpl_2u63hPBwCSynV17cmV62nqRrneDw`. Vercel metadata records that exact source SHA and tree. All three existing project domains target this deployment.
- Runtime pack `d5908d6eaf486ce33e2f72a5` and FIXED140 module pack `3ef99c8970b0b92d4b5986f7` are unchanged. Final public asset readback at 18:33 UTC verified 11,016/11,016 expected hashes, HTTP 200 and usable CORS.
- Live Shopify verification covered four rooms: 24 STANDARD combinations (three lighting modes × two camera views per room) and 12 FIXED140 combinations (three camera views per room). A fresh final-deployment reload rendered successfully. Shopify MAIN theme remains `182339731835`; no theme change accompanied this repair.
- Normal prebuild now rejects missing or altered recorded visualiser assets. Use the [complete protected-source export procedure](room-visualiser-packaging.md) for future deployments.
- Packaging-release rollback: `dpl_61iUGgFHxn74kyBASisBetx2HBqN`, the verified initial restoration. Do not use the asset-incomplete incident deployment or a pre-specialist historical deployment as a routine rollback.
- Physical iPhone Safari and spoken VoiceOver remain unverified. Full app-configuration/theme readback and storage recovery were not repeated. **FULLY SYNCHRONISED is not claimed.**

### Separate development and scheduler branches

At this checkpoint, Cushion Studio [PR #201](https://github.com/Nylon1/CurtainsUK/pull/201) is OPEN/DRAFT at `437364f31343669970314f800e1c18cdb881eaa9`, with both required checks passed. It is not deployed and does not contain PR #203's latest protected release; integrate that release and rerun checks before a Cushion Studio release. The candidate and its commercial decisions remain separate from this repair.

Stock-scheduler [PR #202](https://github.com/Nylon1/CurtainsUK/pull/202) is merged into `main` at `457ef7e70193fb60559b01d6dbd5d1d45b71d13b`. The owner reports 11/11 regression tests passed and corrected code verified on the live scheduler branch. That `main` commit is not an ancestor of this protected release; this checkpoint does not claim the scheduler change was released through Vercel or independently retest the scheduler.

Documentation-only synchronisation commits may advance the protected branch without changing the deployed runtime. Keep the exact deployed commit above separate from the current branch tip and prove any intervening diff is documentation-only. Do not redeploy merely to update a handover record. `release/production` remains the storefront/API release authority; `main` is a separate scheduler source.

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
