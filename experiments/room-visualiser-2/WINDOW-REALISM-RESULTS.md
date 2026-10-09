# PVC windows and the user's garden — 9 October 2026

> Later photo assignments: [Office patio, Bedroom city skyline and Lounge garden](ROOM-VIEWS-RESULTS.md). The shared-window construction and its measurements below are the preceding checkpoint.

[Open Living Room](http://127.0.0.1:4382/?room=living&fabric=sdg-f1541-01) · [Four-room review gallery](http://127.0.0.1:4382/rooms-review) · [Plan](WINDOW-REALISM-PLAN.md)

Living Room, Bedroom, Lounge and Office share the new window treatment: recessed plaster side/top reveals, a warm white sill, layered anthracite PVC profiles, dark seals, drainage slots, hinges and handles. One leaf opens **38 degrees outward**, behind the curtains. The original STANDARD 212 × 228 cm opening and FIXED140 136 × 108 cm opening remain the same size. The Living Room's L-shaped sofa, right armchair and existing fireplace remain intact.

The visible garden is the **exact photograph supplied by the user**: 1280 × 1279, 658,151 bytes, verified byte-for-byte. Its aspect ratio is preserved on a separate plane behind the glazing. The grass, brick borders, planting and seating are photograph content, with no generated replacement or image retouching. The two profile placements were checked across all room, curtain and FIXED140 full views to avoid exposed image edges. Evening exposure darkens the garden and strengthens subtle glass highlights; Fabric Inspection retains its original neutral lighting.

## Matched loading and rendering

Representative Living Room comparison using `window=previous`: three interleaved fresh Chrome runs per version for desktop STANDARD, plus one run per version in the other three profile/viewport cells. Same AMD ANGLE D3D11 GPU, browser shader disk cache disabled, no competing browser test. Desktop 1440 × 1000 DPR1; narrow 390 × 844 with internal DPR1.25. Local loopback serves the room assets; catalogue and fabric services retain their actual network response times. No WAN/CPU throttling or physical phone test. Driver caches cannot be guaranteed cold.

| Desktop STANDARD median | Previous window | PVC + user garden |
|---|---:|---:|
| Viewer entry → meaningful complete render | 3.76 s | **3.73 s** |
| Navigation → ready | 4.89 s | **4.85 s** |
| Shared asset load/decode | 21.5 ms | 31.2 ms |
| GLB request / parse | 7.7 / 15.5 ms | 6.5 / 14.9 ms |
| Geometry/material/light setup | 509.0 ms | 461.7 ms |
| Shader compilation | 1,077.5 ms | 1,113.3 ms |
| GPU preparation | 345.5 ms | 404.6 ms |
| First normal pipeline draw | 259.9 ms | 256.4 ms |
| First Evening + lamps + fire activation | 16.2 ms | 15.9 ms |
| Programs before → after activation | 20 → 20 | 22 → 22 |
| Daylight GPU time, 12 samples | 8.21 ms | 8.64 ms |
| Accessible graphics-memory estimate | 77.55 MiB | 85.67 MiB |
| Transfer through ready | 12.464 MB | 13.107 MB |
| Pipeline calls / triangles | 89 / 294,347 | 104 / 294,683 |

The sharper photograph adds roughly 0.64 MB of transfer and 8.12 MiB of estimated graphics memory. Median startup is comparable, within run-to-run variation. GPU time increases about 0.43 ms. No live reflection/refraction target, added shadow light, continuous animation or runtime HDR decode is introduced. Memory excludes driver/program overhead; overlapping phases must not be summed.

| New window case | Viewer entry → ready | Navigation → ready |
|---|---:|---:|
| Desktop STANDARD, median of 3 | 3.73 s | 4.85 s |
| Narrow STANDARD, one run | 3.52 s | 4.63 s |
| Desktop FIXED140, one run | 3.24 s | 4.36 s |
| Narrow FIXED140, one run | 3.21 s | 4.49 s |

**All six candidate viewer-loading samples remain below 5.2 s.** One desktop STANDARD full-navigation sample reached **5.52 s**, so not every full page load met that threshold. Its catalogue request took 2.01 s, compared with 1.03/1.10 s in the other candidate runs; the garden load/decode was 23.6 ms and shader compilation 942.2 ms. This points to catalogue response variation as the largest recorded delay. That sample is retained. Desktop candidate viewer range: 3.71–4.41 s; navigation: 4.79–5.52 s.

These are Living Room performance measurements of the shared window treatment. Earlier furniture-stage timings for the other rooms are preserved as historical evidence rather than relabelled as new cold-load tests.

## Engineering and review

- 16 runtime/prototype tests pass, including protected production bytes, source artwork and FIXED140 radiator clearance.
- All four rooms, both profiles and both viewport sizes are checked: unchanged curtain position/UV/index hashes, scale, camera and returned motion endpoints; palette controls, lighting state, automatic profile routing, fabric dialog, animated/reduced-motion travel and staggered room switches remain functional.
- New window geometry ends at Z = −20 cm, behind the protected curtain envelope's Z = −18 cm boundary. There are no triangle intersections with that envelope. The FIXED140 radiator's 18 cm vertical curtain clearance is unchanged.
- **58,160 sight-line rays across 200 view/pose checks** sample the moving curtain surfaces and the Living fireplace through five curtain positions. The new window does not occlude them. A separate **13,532-ray photo-coverage check across 20 room/profile/camera combinations** finds no exposed image edges.
- 68 new screenshots cover Daylight open/closed, Evening, Inspection and Living Fireplace ON, both profiles and viewports. The gallery retains 68 matching pre-window images, plus earlier room-design before views.
- The final desktop and narrow gallery checks pass: all four rooms, every saved image selection, window before/after controls, Fireplace comparisons, enlargement, responsive layout and the live Living Room link. No browser or HTTP errors occurred in those final checks.
- The supplied garden photo is a static background with camera-dependent parallax relative to the frame. Glass highlights are a restrained approximation; this is not live outdoor geometry, simulated wind, physical refraction or a claim of photographic equivalence.

No curtain geometry, UV mapping, source artwork, motion, physical scale, assignment or routing source is changed. All **11,003 supported fabrics** remain unchanged. Production paths continue to match `a83b38fd8f71b967e51ebe0173603df7c29b87d3`. Work remains on `experiment/living-photo-composition-20261008`; no merge, push, deployment or publication.

Storage was checked before asset work: 33.44 GiB free; final reading: **33.24 GiB**, below the 35 GiB aim. No existing worktree, evidence or uncommitted work was deleted. The unused initial 28.8 MB HDR investigation is retained offline; the final window requests only the user's JPEG. Physical iPhone testing remains outstanding.

Evidence: `C:/Users/hamza/curtainsuk-visualiser-2-window-evidence-20261009/` contains original and new views, validation records, raw matched performance, source snapshots and hashes.
