# Office reference and luxury armchair — 9 October 2026

[Open Office](http://127.0.0.1:4382/?room=office&fabric=sdg-f1541-01) · [All four rooms and before/after views](http://127.0.0.1:4382/rooms-review) · [Plan recorded before implementation](OFFICE-INSPIRATION-PLAN.md)

The supplied reference informed fitted walnut cabinetry, recessed warm shelves, a slender executive desk with integrated drawers, a tailored taupe office chair and ceiling cove. The requested luxury armchair sits on the right: ivory upholstery, separate soft cushions, a welted seat and recessed walnut base, angled towards the desk. Original small grain/weave textures and merged procedural furniture replace the previous basic Office furniture. No external model or texture package was downloaded.

The existing central window and curtains remain clear of furniture. **71,370 camera rays across 50 camera/pose combinations found zero obstructions** by the new furniture. This covers both curtain profiles, desktop/narrow viewports, room/detail views and five positions through curtain travel. All 34,574 new room triangles also pass the physical curtain-envelope intersection check. Closing curtains still covers the glass as intended; no curtain functionality was disabled to keep the view clear.

All five original Office colour controls remain active and retain selections on return. The desk and executive chair use their existing editable materials; the added lounge armchair is fixed ivory. The Shelves & cove control operates the warm fixtures. Fabric Inspection disables every warm point/probe contribution, shelf emission and cove/shelf wash. Camera composition, geometry, UVs, motion and automatic fabric routing remain unchanged.

## Matched performance

Three interleaved fresh-browser runs per version for desktop STANDARD; the other profile/viewport cells have one exploratory run each. `office=previous` selects the previous Office arrangement for comparison.

| Desktop STANDARD metric | Previous Office | Office + armchair |
|---|---:|---:|
| Viewer entry → complete room render, median | 3.21 s | **3.63 s** |
| Navigation → ready, median | 4.06 s | **4.82 s** |
| GLB request / parsing | 24.1 / 14.3 ms | 7.8 / 17.6 ms |
| Shared asset load/decode | 25.9 ms | 29.6 ms |
| Geometry/material/light setup | 127.8 ms | 261.5 ms |
| Shader compilation | 1.05 s | 1.17 s |
| Offscreen GPU preparation | 338.9 ms | 408.1 ms |
| First normal pipeline draw | 276.6 ms | 292.7 ms |
| First Evening + lighting activation | 12.1 ms | 14.5 ms |
| Programs before → after activation | 19 → 19 | 19 → 19 |
| Daylight GPU median, 12 samples | 6.31 ms | 8.17 ms |
| Estimated accessible graphics memory | 73.39 MiB | 76.11 MiB |
| Transfer through readiness | 12.406 MB | 12.418 MB |
| Pipeline draw calls / triangles | 71 / 245,621 | 97 / 243,061 |

The revised scene adds approximately 0.42 s to median viewer startup, 1.87 ms to measured GPU frame time and 2.72 MiB of accessible graphics resources. Geometry assembly and GPU/shader preparation increase; asset transfer changes by only about 12 KB. The shelf/cove surfaces add draw submissions despite fewer rendered triangles. The shared renderer still dominates startup. No new shader programs appear when the warm lighting is enabled; one candidate first-activation sample was 75.4 ms, with the other two at 12.1 and 14.5 ms.

Every measured candidate stays below **5.2 seconds for both viewer-entry and full navigation timing**. The new design has a measured cost; it does not improve every performance metric. Desktop STANDARD runs varied from 3.33–3.81 s for the candidate and 2.77–3.99 s for the previous scene, so the three-run comparison is indicative rather than a statistically precise regression estimate.

| Candidate viewport/profile | Viewer entry → ready | Navigation → ready |
|---|---:|---:|
| Desktop STANDARD, median of 3 | 3.63 s | 4.82 s |
| Narrow STANDARD, single run | 3.44 s | 4.58 s |
| Desktop FIXED140, single run | 3.06 s | 4.25 s |
| Narrow FIXED140, single run | 2.71 s | 4.00 s |

Conditions: same Chrome executable and AMD ANGLE D3D11 GPU, fresh process per case, browser GPU shader disk cache disabled, desktop 1440×1000 DPR1, narrow 390×844 with common internal DPR1.25. No other browser capture ran during measurement. Local loopback, no WAN/CPU throttling; driver caches cannot be guaranteed fully cold. Resource phases overlap and must not be summed. Memory is an estimate that excludes driver/program overhead. Physical iPhone testing remains outstanding.

## Verification and review

- **16 runtime/prototype tests passed**, including frozen source/artwork hashes and FIXED140 18 cm radiator clearance across sampled poses and widths.
- Both profiles on desktop and narrow screens match original curtain position/UV/index hashes, scale and camera state at closed/open/returned endpoints. Switching to each other room preserves its original curtain/camera state.
- All five palette controls, selection retention, automatic STANDARD/FIXED140 routing, fabric dialog, views, animated/reduced-motion endpoints, keyboard controls and staggered room switches passed without browser errors or horizontal overflow.
- All sixteen previous Office screenshots are retained. Sixteen new views cover both profiles, desktop/narrow, Daylight open/closed, Evening and Inspection. Other rooms' saved views are unchanged.
- The gallery contains all four rooms, with separate Office, Bedroom and Lounge before/after comparisons. Gallery controls, image enlargement, direct Office link and Living Room fireplace views are checked on desktop and narrow viewports.

The design uses the reference's materials and furniture language; photographic realism is not claimed. Procedural upholstery, gradient light-wash plates and unshadowed warm point lights retain visible real-time-rendering limitations. The existing floor/exterior imagery and shadow/AO pipeline are unchanged by this Office update.

All 11,003 supported fabrics, source artwork, curtain geometry, UVs, motion, physical scale, assignments and routing sources remain unchanged. Protected production paths match `a83b38fd8f71b967e51ebe0173603df7c29b87d3`. Work remains uncommitted on `experiment/living-photo-composition-20261008`, HEAD `e3c23e027357c1d2a70494112f8dc9eb57a04531`. Nothing merged, pushed, deployed or published.

Disk was approximately **33.95 GiB** before work and **33.95 GiB** at the latest check, below the 35 GiB headroom aim. This task downloaded no heavy assets, installed no dependencies and deleted no existing work or evidence.

Evidence: `C:/Users/hamza/curtainsuk-visualiser-2-office-inspiration-evidence-20261009/` contains before/after PNGs, interaction and visibility verification, raw performance records, summaries and source snapshots. The four-room review is also saved at `C:/Users/hamza/curtainsuk-visualiser-2-four-rooms-evidence-20261009/review.html`.
