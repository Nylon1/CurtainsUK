# Room Visualiser 2 customer integration

The four approved room designs and fabric-detail treatment were merged as review-only source in PR #163. This change connects that accepted implementation to the existing customer visualiser.

## Implementation plan

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

Evidence: `C:/Users/hamza/curtainsuk-visualiser-2-customer-evidence-20261009/` contains the review gallery, 68 screenshots, interaction verification, visual parity, full performance records and test log. The deployment receipt and live checks will be saved there separately after the protected release.
