# Four-room review — 9 October 2026

> Latest shared architecture: [PVC windows and the user's garden photograph](WINDOW-REALISM-RESULTS.md). All four current gallery views include that update; the earlier room-design measurements below are historical checkpoints.

> Subsequent reference updates: [Living Room with L-shaped sofa and original fireplace](LIVING-INSPIRATION-RESULTS.md), [Office with ivory armchair](OFFICE-INSPIRATION-RESULTS.md), [Bedroom with fitted wardrobe](BEDROOM-INSPIRATION-RESULTS.md) and [Lounge](LOUNGE-INSPIRATION-RESULTS.md). The gallery includes all four revised rooms and saved before/after views. The descriptions/timings below document the preceding four-room checkpoint.

**Living Room, Bedroom, Lounge and Office are ready together for local review. Nothing has been merged, pushed, deployed or published.**

- [Open the four-room gallery](http://127.0.0.1:4382/rooms-review)
- [Living Room](http://127.0.0.1:4382/?room=living&fabric=pt-1204-212) · [Bedroom](http://127.0.0.1:4382/?room=bedroom&fabric=pt-1204-212) · [Lounge](http://127.0.0.1:4382/?room=lounge&fabric=pt-1204-212) · [Office](http://127.0.0.1:4382/?room=office&fabric=pt-1204-212)
- [Implementation plan recorded before expansion](FOUR-ROOMS-PLAN.md)

## Delivered

Extended the accepted Living Room's room-only oak and textile materials, exterior view, restrained daylight and neutral Fabric Inspection to the other three rooms. Bedroom retains its upholstered bed and draped linen; Lounge retains classic seating and mouldings; Office retains its timber desk and task chair. Lamps illuminate from each room's actual fixtures. The existing fireplace remains in the Living Room. No decorative asset expansion or new asset download was needed.

Lighting settings are independently remembered for each room. Inspection immediately suppresses warm point lights and the environment probe; disabled warm controls explain that the saved settings return outside Inspection. The fabric picker, automatic STANDARD/FIXED140 routing, room palettes, curtain poses/motion, camera views and palette persistence were exercised. Ambience controls have 44-pixel touch targets and visible keyboard focus.

The gallery contains **68 saved room views** covering both profiles, desktop/narrow viewports, open/closed Daylight, Evening and Inspection, plus Living Room Fireplace ON. It shows all four rooms together and supports image enlargement and direct links to the interactive rooms. The earlier Living Room gallery and source snapshot remain available.

This extends the accepted visual direction; it does not claim full photographic realism. The previously identified geometry/baked-GI limitations remain visible. Physical iPhone review is outstanding.

## Performance result

Comparable cold desktop STANDARD Living Room, median of three counterbalanced fresh-process runs per version:

| Metric | Original baseline | Accepted Living Room version | Current four-room version |
|---|---:|---:|---:|
| Viewer entry → complete room render | 4.56 s | 6.02 s | **3.59 s** |
| Navigation → ready | 5.69 s | 7.17 s | **4.72 s** |
| First combined Evening/lamps/fire activation | — | 9.11 s | **18 ms** |
| Programs before → after first warm activation | — | 19 → 42 | **21 → 21** |
| Daylight GPU median, 12 samples | 6.86 ms | 7.49 ms | 8.04 ms |
| Estimated accessible GPU memory | 57.0 MiB | 101.6 MiB | 101.6 MiB |
| Transfer through room readiness | 10.26 MB | 15.14 MB | 15.14 MB |

The startup target of 5.2 seconds is met under these comparable local conditions. Current desktop STANDARD runs were **3.72 / 3.49 / 3.59 seconds**. Warm activation stayed below 100 ms in every measured candidate case and created no new shader programs.

The first activation problem was shader variant churn: making lamps/fire lights visible changed the active point-light count, forcing many scene and curtain programs to compile. The current renderer retains three uniform-controlled point-light slots across all rooms, using zero intensity for inactive/unavailable sources. It also compiles against the same linear half-float target used by the existing postprocessing pipeline. Compiling against the default screen target previously generated a different set of programs that could not be reused for the actual room render.

Preparation now takes place before readiness: approximately **1.15 s parallel shader compilation + 0.44 s offscreen GPU preparation**, followed by approximately **0.24 s for the first normal pipeline draw**, in the desktop STANDARD median. Zero-alpha flame draws prepare the actual blend/depth state before interaction. All this work is included in the 3.59-second result; the loading overlay does not dismiss before a complete room render. GLB parsing, texture loading and room setup remain separately recorded in the raw evidence. The chair asset loads only when Living Room is needed, so other rooms avoid its initial download.

Keeping the warm-light program stable costs about 0.55 ms per Daylight GPU frame relative to the accepted version in this sample, while remaining below the 16.7 ms GPU budget on the tested machine. Memory/transfer are unchanged for Living Room and remain areas for a later compression pass. Total device VRAM is not exposed; estimates exclude driver/program-cache overhead.

Candidate cold viewer-entry times, seconds (Living desktop STANDARD is a three-run median; other cells are single exploratory runs):

| Room | Desktop STANDARD | Desktop FIXED140 | Narrow STANDARD | Narrow FIXED140 |
|---|---:|---:|---:|---:|
| Living Room | 3.59 | 3.34 | 3.42 | 3.56 |
| Bedroom | 4.90 | 3.50 | 3.16 | 3.48 |
| Lounge | 3.50 | 2.88 | 3.38 | 3.19 |
| Office | 3.23 | 3.09 | 3.37 | 2.93 |

All measured candidate cases were below 5.2 seconds. Bedroom's desktop navigation-to-ready was 6.06 seconds; navigation includes bootstrap and is distinct from the historical viewer-entry metric. Narrow GPU Daylight median was 3.54 ms versus 3.20 ms for the accepted version and 2.72 ms for baseline. Other rooms' estimated accessible desktop STANDARD memory is approximately 73.4 MiB, with initial transfers around 12.4 MB.

Conditions: same Chrome executable and AMD ANGLE D3D11 GPU, a fresh browser process per case, GPU shader disk cache disabled; desktop 1440×1000 DPR 1; narrow 390×844 with common internal DPR 1.25 in all versions. Desktop STANDARD versions were ordered in counterbalanced blocks. There was no competing browser capture during timing. Driver caches cannot be guaranteed fully cold and public catalogue TTFB varies. Loopback transfer timings are not customer-WAN predictions; narrow viewports are not physical mobile GPU tests. No production performance claim is made.

## Verification and isolation

- **16 runtime/prototype tests passed.** These include physical radiator clearance over sampled FIXED140 poses and all six frozen widths.
- **32 room/profile/viewport/version cases passed**, including 16 candidate cases compared directly with original baseline curtain position/UV/index hashes, camera and group transforms at closed/open/returned endpoints.
- Distinct room lighting states survive room switches and fabric changes. Actual canonical fabric selections switched STANDARD → FIXED140 → STANDARD on both desktop and narrow viewports.
- Room palettes, curtain/full/room views, animated and reduced-motion endpoints, fabric dialog, keyboard controls, rapid/staggered room switches, gallery selectors and enlargement passed without browser errors. No horizontal overflow was found.
- All protected production paths remain byte-identical against `a83b38fd8f71b967e51ebe0173603df7c29b87d3`. The 11,003-fabric catalogue, artwork, geometry, UVs, physical scale, assignments and routing source are unchanged.

Branch: `experiment/living-photo-composition-20261008`, based on `e3c23e027357c1d2a70494112f8dc9eb57a04531`. Work is uncommitted and confined to the experiment. Pre-existing uncommitted composition assets and all earlier evidence were preserved. Latest disk headroom is approximately **37.1 GiB**, above the 35 GiB target.

Evidence: `C:/Users/hamza/curtainsuk-visualiser-2-four-rooms-evidence-20261009/` contains `performance.json`, `performance-summary.json`, `verification.json`, `interactions.json`, `tests.txt`, the gallery and screenshots. The accepted Living Room source is preserved in `performance-snapshot/` and can be loaded with `?mode=review`.
