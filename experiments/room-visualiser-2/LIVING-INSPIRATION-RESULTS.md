# Living Room reference and L-shaped sofa — 9 October 2026

[Open Living Room](http://127.0.0.1:4382/?room=living&fabric=sdg-f1541-01) · [Four-room gallery with before/after views](http://127.0.0.1:4382/rooms-review) · [Implementation plan](LIVING-INSPIRATION-PLAN.md)

The Living Room follows the supplied reference's ivory upholstery, marble-and-brass tables, panelled walls, circular wall composition and sculptural chandelier. Following the user's layout correction, **the left armchair is removed and the sofa is one connected L-shaped sectional**, with its return along the left side. One matching armchair remains on the right. The sectional has a continuous upholstered shell, corner base, separate seats, back cushions and fine seams. All original Sofa, Armchair and Cushion colour controls remain connected.

The original fireplace stays in its left-hand bay. Direct old/new comparisons match its surround, firebox, logs, flame shaders/transforms, ember instances and point-light settings exactly. Fireplace ON/OFF and neutral-mode suppression pass. The two existing lamp slots now serve the chandelier and cove, retaining the same three-point-light count including the fire.

**30,434 sight-line rays across 50 view/pose checks found no obstruction** by the new furniture to the sampled curtain/opening points or the firebox. Both profiles, desktop/narrow and five curtain positions are covered. None of the 40,596 new room triangles intersects the protected curtain envelope. Original cameras, curtain geometry, UVs, physical scale, motion and automatic routing remain unchanged.

## Matched performance

Three interleaved fresh-browser runs per version for desktop STANDARD; one exploratory run per version for each other profile/viewport cell. The previous scene is available with `living=previous`.

| Desktop STANDARD metric | Previous Living Room | L-shaped Living Room |
|---|---:|---:|
| Viewer entry → complete room render, median | 3.56 s | **3.82 s** |
| Navigation → ready, median | 4.68 s | **5.05 s** |
| GLB request / parsing | 8.5 / 19.2 ms | 30.4 / 20.2 ms |
| Shared asset load/decode | 46.8 ms | 30.0 ms |
| Geometry/material/light setup | 227.3 ms | 522.5 ms |
| Shader compilation | 1.25 s | 1.26 s |
| Offscreen GPU preparation | 461.3 ms | 442.6 ms |
| First normal pipeline draw | 272.4 ms | 317.0 ms |
| First Evening + lighting + fire activation | 22.2 ms | 19.9 ms |
| Programs before → after activation | 21 → 21 | 20 → 20 |
| Daylight GPU median, 12 samples | 8.41 ms | 9.52 ms |
| Estimated accessible graphics memory | 101.61 MiB | 77.55 MiB |
| Transfer through readiness | 15.148 MB | 12.464 MB |
| Pipeline draw calls / triangles | 97 / 292,707 | 89 / 294,347 |

The sectional and original texture assembly add about 0.30 s to scene setup and 0.26 s to median viewer startup. GPU time increases by 1.11 ms. Skipping the previous scanned-chair asset removes eight requests, about 2.68 MB of transfer and 24.06 MiB of estimated graphics resources. The new materials and cove geometry are merged by material; no extra shadow light, transmission target, mirror pass or warm-activation shader compilation is introduced.

| Candidate viewport/profile | Viewer entry → ready | Navigation → ready |
|---|---:|---:|
| Desktop STANDARD, median of 3 | 3.82 s | 5.05 s |
| Narrow STANDARD, single run | 3.68 s | 4.82 s |
| Desktop FIXED140, single run | 3.64 s | 4.73 s |
| Narrow FIXED140, single run | 3.21 s | 4.37 s |

Every measured candidate stays below **5.2 seconds for both timing definitions**. Desktop candidate viewer samples range from 3.61 to 4.02 s; full navigation from 4.76 to 5.10 s. These measurements show a modest setup/frame-time cost and reduced resource use, rather than improvement in every metric.

Conditions: same Chrome executable and AMD ANGLE D3D11 GPU; fresh process per case with browser GPU shader disk cache disabled. Desktop 1440×1000 DPR1; narrow 390×844 with common internal DPR1.25. No competing test browser ran during performance measurement. Local loopback, no WAN/CPU throttling; driver caches cannot be guaranteed fully cold. Resource phases overlap and must not be summed. Memory excludes driver/program overhead. Physical iPhone testing remains outstanding.

## Verification and review

- **16 runtime/prototype tests passed**, covering frozen source/artwork hashes and FIXED140 18 cm radiator clearance across sampled widths/poses.
- Both profiles on desktop and narrow screens match original curtain position/UV/index hashes, scale and camera state at closed/open/returned endpoints. Leaving Living Room preserves the other rooms' curtain/camera state.
- All six palettes, room retention, automatic fabric routing, views, fabric dialog, keyboard controls, animated/reduced-motion endpoints and staggered room changes passed in the final isolated check.
- Fabric Inspection suppresses all warm point/probe contributions, chandelier emission, cove glow, flames and ember emission while retaining the user's warm-mode settings.
- Twenty current Living views cover Daylight open/closed, Evening, Fireplace ON and Inspection for both profiles and viewports. Twenty previous views are retained. The gallery includes all four rooms and all four before/after comparisons; other rooms' saved views are unchanged.
- Gallery image controls, fireplace comparisons, enlargement, direct Living link, L-shaped footprint, remaining right-hand armchair and responsive layout are checked on desktop and narrow viewports.

One initial concurrent verification run logged a shader validation error for the unchanged Bedroom HEADBOARD material during room switching. A complete isolated rerun passed all four cases with no browser errors; the cause was not established. The observation is retained in `verification-observations.json` rather than silently discarded.

An initial gallery check also encountered one HTTP 503 after opening the live viewer on a narrow screen; its URL was not recorded. Response-URL logging was added to the check. A complete desktop/narrow rerun passed with no HTTP or browser errors. No application change was made for this transient observation.

This is a reference-inspired real-time design, not a claim of photographic equivalence. The circular wall pieces are opaque reliefs, warm lights remain unshadowed, the cove wash is an approximation, and the existing floor/exterior and shared shadow/AO pipeline retain their limitations.

All 11,003 supported fabrics, source artwork, curtain geometry, UVs, motion, physical scale, assignments and routing sources remain unchanged. Protected production paths match `a83b38fd8f71b967e51ebe0173603df7c29b87d3`. Work remains uncommitted on `experiment/living-photo-composition-20261008`, HEAD `e3c23e027357c1d2a70494112f8dc9eb57a04531`. Nothing merged, pushed, deployed or published.

Disk was **33.91 GiB** before work and **33.47 GiB** at the final check, below the 35 GiB headroom aim. No heavy asset download, dependency installation or deletion of existing work/evidence was performed.

Evidence: `C:/Users/hamza/curtainsuk-visualiser-2-living-inspiration-evidence-20261009/` contains before/after PNGs, interaction/visibility/fireplace/gallery checks, raw performance data, summaries and source snapshots. The gallery is saved at `C:/Users/hamza/curtainsuk-visualiser-2-four-rooms-evidence-20261009/review.html`.
