# Lounge reference update — 9 October 2026

Later additions: the user's [room-specific garden view](ROOM-VIEWS-RESULTS.md) and [wall-mounted TV with oak cabinet](LOUNGE-TV-RESULTS.md). The measurements below describe the earlier furniture revision.

[Open Lounge](http://127.0.0.1:4382/?room=lounge&fabric=sdg-f1541-01) · [Four-room review gallery](http://127.0.0.1:4382/rooms-review) · [Plan recorded before implementation](LOUNGE-INSPIRATION-PLAN.md)

The supplied photograph now informs the Lounge: tailored ivory seating, separate cushions and piping, a slender pale-oak table, low rounded ottoman, neutral woven rug, slim dark lamp, simplified wall mouldings, original abstract study and soft ceiling cove. The existing opening and camera compose these elements around the actual supported curtain systems. Living Room, Bedroom and Office retain their preceding design.

The new furniture uses the existing seating/cushion palette materials. Wall, floor and ceiling choices, room-specific state, fabric selection, views and curtain motion remain available. The lamp and cove share one control; both warm emission and illumination are suppressed during neutral Fabric Inspection. Geometry is merged by material and the existing light slots/shader preparation are reused. There is no new downloaded model, texture package or dependency.

## Matched local performance

Desktop STANDARD uses three interleaved fresh-process runs per version. These compare the immediately preceding Lounge with this reference-inspired revision, not with the historical Living Room 12.4-second result.

| Metric | Previous Lounge | Reference-inspired Lounge |
|---|---:|---:|
| Viewer entry → complete room render, median | 3.42 s | **3.43 s** |
| Navigation → ready, median | 4.76 s | **4.74 s** |
| Room GLB request / parsing | 9.1 / 15.2 ms | 9.5 / 15.7 ms |
| Shared asset load/decode | 27.2 ms | 23.5 ms |
| Room geometry/material/light setup | 154.9 ms | 305.4 ms |
| Shader compilation | 1.18 s | 1.09 s |
| Offscreen GPU preparation | 381.7 ms | 400.7 ms |
| First normal pipeline draw | 276.3 ms | 270.0 ms |
| First Evening + lamps activation | 9.7 ms | 11.7 ms |
| Programs before → after that activation | 19 → 19 | 19 → 19 |
| Daylight GPU median, 12 samples | 6.99 ms | 7.25 ms |
| Estimated accessible graphics memory | 73.43 MiB | 76.96 MiB |
| Transfer through readiness | 12.443 MB | 12.454 MB |

The additional geometry costs about 150 ms of setup and 3.53 MiB of estimated accessible memory. Overall desktop STANDARD startup differs by 17 ms, within the observed run variation. No warm-light shader compilation stall returns. The image uses fewer submitted triangles (209,633 versus 247,649 across the measured passes), with nine more draw calls. This is a bounded design revision, not a claim that every rendering cost improved.

| Candidate viewport/profile | Viewer entry → ready | Navigation → ready |
|---|---:|---:|
| Desktop STANDARD, median of 3 | 3.43 s | 4.74 s |
| Narrow STANDARD, single run | 3.64 s | 4.46 s |
| Desktop FIXED140, single run | 3.52 s | 4.69 s |
| Narrow FIXED140, single run | 3.21 s | 4.38 s |

All measured candidate samples meet the 5.2-second target. Matching Chrome/AMD ANGLE D3D11; GPU shader disk cache disabled; desktop 1440×1000 DPR1; narrow 390×844 common internal DPR1.25. No competing browser capture ran during timing. Local loopback, no WAN/CPU throttle; driver caches cannot be guaranteed fully cold. Resource durations overlap and must not be summed. Memory excludes driver/program overhead. Physical iPhone testing remains outstanding.

## Review and verification

- **16 runtime/prototype tests passed**, including protected source hashes, source artwork and the FIXED140 18 cm clearance check.
- Both profiles on desktop and narrow viewports passed exact closed/open/returned position, UV, index, camera and transform comparisons against the saved original baseline. The three other rooms were checked after leaving Lounge.
- All five room palette controls changed their intended materials and retained choices after returning. STANDARD/FIXED140 fabric routing, views, real animation and reduced-motion endpoints, fabric dialog, keyboard controls and staggered room switches passed without browser errors.
- Neutral Inspection has zero warm point/probe contribution and zero cove/diffuser emission. Lamp/cove OFF is also verified in Daylight.
- Sixteen new Lounge screenshots replace its gallery views; all sixteen preceding screenshots remain available in the before/after comparison. The other 52 room screenshots are retained.

The direction is adapted from the reference, while real-time GI, directional-shadow softness and some material/furniture detail still limit photographic realism. No photographic-quality approval is assumed.

Protected curtain geometry, UVs, source artwork, motion, physical scale, assignments, routing and all 11,003 supported fabrics remain unchanged. No production paths were edited. Branch: `experiment/living-photo-composition-20261008`, HEAD `e3c23e027357c1d2a70494112f8dc9eb57a04531`; changes remain uncommitted in the isolated experiment. Nothing merged, pushed, deployed or published.

Disk headroom was 34.50 GiB before this work, below the requested 35 GiB target; the previously cleared npm cache contained zero reusable cache bytes. No heavy asset work or destructive cleanup was performed. Earlier evidence and uncommitted work remain intact.

Evidence: `C:/Users/hamza/curtainsuk-visualiser-2-lounge-inspiration-evidence-20261009/` holds `performance.json`, `performance-summary.json`, `verification.json`, `gallery-verification.json`, source snapshot and before/after PNGs. The main gallery and its updated summary remain under `C:/Users/hamza/curtainsuk-visualiser-2-four-rooms-evidence-20261009/`. `?lounge=previous&room=lounge` bypasses the revision for matched comparisons.
