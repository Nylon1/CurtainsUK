# Room Visualiser 2 — current release and source of truth

**Published on 9 October 2026.** [Open the live Room Visualiser](https://www.curtainsuk.com/pages/room-visualiser). Living Room, Bedroom, Lounge and Office now use the approved room designs, window photographs, lighting/fireplace controls and fabric-detail treatment in the existing customer runtime.

The four approved designs were first merged as review-only source in [PR #163](https://github.com/Nylon1/CurtainsUK/pull/163), then connected to the customer runtime and published through [PR #164](https://github.com/Nylon1/CurtainsUK/pull/164). The implementation plan below is completed work, not an outstanding activation task.

## Current authority and release receipt

| Item | Verified value |
| --- | --- |
| Release authority | `Nylon1/CurtainsUK`, protected `release/production` |
| Deployed commit | `800f42a27a0a6e9beb1abd92821145bf4a4b98c4` |
| Deployed source Git tree | `1150dad1d55649597d03df2dbaad01348ea98d63` |
| Vercel project | `prj_vl2GLLlSf0AJAKqjs1Nk26ipKHBA` (`curtainsuk-staging-api`, historical name) |
| READY deployment | `dpl_CvvQKa2zCsFbQ7eZR9Lzi31w7BCD` |
| Deployment URL | `https://curtainsuk-staging-1ur8idqz1-hamzas-projects-4ef62f35.vercel.app` |
| Production backend/CDN | `https://curtainsuk-production-api.vercel.app` |
| Native Shopify page / live theme | `/pages/room-visualiser` / `182339731835`, role `main` |
| Runtime pack / FIXED140 module pack | `d5908d6eaf486ce33e2f72a5` / `3ef99c8970b0b92d4b5986f7` |
| Previous known-good deployment | `dpl_FqkeuFMtFwnJAELn9kXChF2eXRfE` |

The Vercel deployment was built from a clean checkout of the exact protected HEAD after both required PR checks passed. It was staged with production settings, verified, then promoted without rebuilding. The native Shopify shell, theme and signed-proxy implementation were unchanged. Rollback uses the previous deployment above, not the historical `release/baseline.json` bootstrap target.

The [structured production-state record](room-visualiser-2-production-state.json) is the machine-readable companion. Fresh read-back at 09:00–09:01 UTC confirms Vercel's `gitCommitSha` and `curtainsukReleaseSha`, all 96 pack files, all three project domains, the public theme identity and the four original reference texture hashes/dimensions/cache headers. Vercel has no stored tree metadata field for this deployment; the tree is independently verified from Git. The current protected branch can move forward for documentation-only changes while the deployed commit remains the value above. No new deployment is part of this documentation sync.

## Final release verification and remaining work

- 63 local automated tests passed; protected capability CI passed all 133 tests on both candidate and trusted trees, with zero failures.
- 16 local, 16 staged and 16 live room/profile/viewport combinations passed. Live checks used the genuine Shopify page and signed iframe. Daylight/Evening/Inspection, Fireplace, room/view switching, curtain motion, colours, fabric drawer and both profiles remain functional.
- All 68 saved local screenshots match the accepted prototype pixel for pixel. Graphics fallback and recovery from a failed room-image request passed.
- Live Shopify single-run navigation-to-ready observations: desktop STANDARD 5.812 s, narrow STANDARD 5.532 s, desktop FIXED140 5.910 s, narrow FIXED140 5.426 s. These real-network observations are distinct from the matched local benchmark below.
- An external Extendons calculator request returns HTTP 403 on this non-product page with both the previous and current renderer. It is recorded separately; no visualiser JavaScript, asset or catalogue HTTP errors occurred in the live checks.
- **Physical iPhone Safari testing remains outstanding.** Narrow Chrome emulation is not a physical-device result. Complete scoped Shopify app-configuration/theme-file read-back was not repeated for this documentation update. This record does not claim FULLY SYNCHRONISED.
- Storage cleanup remains owner-deferred. C: had 30.09 GiB free at the sync preflight; the target remains over 35 GiB. No worktree, evidence or uncommitted work was deleted. Vercel tree-metadata attestation should be included in a future authorised runtime release; the existing deployment is identified by its verified SHA and byte-matched assets.

Use the source folders below for future work. Preserve the archived prototype and the historical `main` checkout, which contains separate local commits and untracked theme work; they are not the live release authority.

- Customer implementation: `lib/room-visualiser/runtime/rooms/environment/`, lifecycle integration in `rooms/viewer.mjs`, immutable build pointer in `lib/room-visualiser/build.json`.
- Archived review: `experiments/room-visualiser-2/`, whose loopback server is pinned to original pack `2bfef31e733fa962d19cde85`; no customer dependency on its runtime hooks.
- Release/sync worktree: `C:/Users/hamza/curtainsuk-room-visualiser-2-customer-20261009`.
- Original review worktree: `C:/Users/hamza/curtainsuk-fixed140-v1-tranche-3-20261008`, preserved on `experiment/living-photo-composition-20261008`.

## Completed implementation plan

1. Package the approved environment as ordinary runtime modules. Use relative, immutable asset URLs; remove local comparison switches, the unused scanned chair, and the experiment's server-side code injection. Load only the selected room's design and photograph initially.
2. Connect room preparation, material updates, palettes, contact shadows and shader preparation through explicit viewer lifecycle hooks. Retain the approved narrow-screen pixel ratio and fabric-sensitive FXAA setting.
3. Keep both curtain engines, geometry, normals, UVs, artwork, dimensions, repeat calibration, motion, assignments, catalogue eligibility and automatic renderer routing unchanged. Keep the original frozen lighting module; the environment owns its approved lighting variant.
4. Rebuild the immutable room pack without rebuilding fabric derivatives. Check source/pack equality and frozen hashes, then compare the actual customer pack with the accepted prototype on desktop and narrow viewports. Exercise all rooms, lighting, curtains, colours and both renderer profiles.
5. Submit through the protected production PR checks. Deploy only the exact protected production HEAD, verify the staged assets, promote, and immediately check the live Shopify entry and iframe. Preserve the previous deployment for rollback.

## Constraints and evidence

- Existing review checkout and evidence remain intact.
- Disk check before work: 30.42 GiB free. No large asset downloads or worktree/evidence deletion is planned. This packaging work does not resolve the previously deferred 35 GiB storage target.
- Physical iPhone testing requires a device and remains outstanding; narrow Chrome checks are reported separately.

## Validation before merge

- 63 automated tests passed, covering the immutable pack, frozen geometry/UV/motion/cameras, fabric derivatives, routing, shared shell, palette state, Shopify mounting and publication safeguards.
- 16 browser combinations passed: four rooms × STANDARD/FIXED140 × desktop/narrow Chrome. Checks include Daylight/Evening/Inspection/Fireplace, palettes, saved ambience, fabric drawer, profile changes, animated motion, rapid room changes, window sightlines, photograph aspect ratios and the 18 cm radiator clearance. No JavaScript or HTTP errors, and no horizontal overflow.
- All 68 saved room screenshots match the accepted prototype pixel for pixel. User photographs and material assets are byte-identical to the accepted sources.
- Supported identities remain 3,137 STANDARD + 7,866 FIXED140 = 11,003 unique fabrics. Eligibility, assignments, source art and derivative assets were not changed.
- Active environment assets total 3,590,356 bytes; the new immutable room pack is `d5908d6eaf486ce33e2f72a5`. Other room photographs/design modules load on first selection. Unused scanned furniture, HDR files and experiment tooling are excluded from deployment inputs.

## Matched performance

Measurements used fresh Chrome processes on the same machine/GPU, disabled shader disk cache, cold browser caches, reduced motion, the same fabric (`sdg-f1541-01`), room and 1440 × 1000 viewport. Loopback assets and the same public catalogue endpoint were used in every case. Three interleaved runs per desktop STANDARD variant; narrow and FIXED140 numbers are single-run smoke measurements, not device benchmarks.

| Desktop STANDARD | Original renderer | Approved prototype | Customer pack |
| --- | ---: | ---: | ---: |
| Navigation to ready, median | 5.919 s | 4.796 s | 4.890 s |
| Viewer initialisation, median | 4.836 s | 3.724 s | 3.802 s |
| GLB parse, median | 12.4 ms | 14.0 ms | 15.6 ms |
| GPU frame sample, median | 6.26 ms | 8.85 ms | 8.46 ms |

Customer pack phase medians: environment download/decode 27.2 ms, room geometry/material setup 425.3 ms, shader preparation 1,092.3 ms, offscreen GPU preparation 394.1 ms, first visible draw 264.4 ms. These phases overlap other loading work and should not be summed. Full resource download timings are recorded separately in the evidence JSON. Fireplace activation introduced no additional shader programs.

Customer navigation-to-ready smoke measurements: narrow STANDARD 4.672 s, desktop FIXED140 4.637 s, narrow FIXED140 4.258 s. Narrow Chrome uses the accepted 1.25 DPR cap. Estimated scene texture, geometry, postprocess and shadow allocations match the approved prototype (approximately 85.7 MiB combined on desktop STANDARD); browser APIs do not expose exact VRAM usage.

The customer integration meets the 5.2 s local cold STANDARD target in this comparison and retains the approved prototype's GPU/memory profile. These local results are not mobile-network or physical-iPhone measurements.

Evidence: `C:/Users/hamza/curtainsuk-visualiser-2-customer-evidence-20261009/` contains `RELEASE.md`, `release-receipt.json`, the review gallery, 68 screenshots, interaction verification, visual parity, full performance records, test log, protected CI artifacts, staged verification and `live-verification.json`. Fresh source reconciliation is recorded in `source-sync-readback.json` and `source-sync-deployment.json`. Historical release receipts remain unchanged; the documentation-sync receipt is recorded separately.
