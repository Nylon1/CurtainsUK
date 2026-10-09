# Lounge TV — 9 October 2026

[Open Lounge](http://127.0.0.1:4382/?room=lounge&fabric=sdg-f1541-01&roomViews=selected&loungeTv=current) · [Four-room gallery](http://127.0.0.1:4382/rooms-review?review=lounge-tv)

A 55-inch wall-mounted TV occupies the clear wall to the right of the window, with a floating pale-oak cabinet beneath. The screen is off, with restrained material reflections. The garden photograph, window, curtains, furniture, camera and lighting controls are retained. There is no new video, texture download, light, reflection render target or dependency. Geometry shares the existing oak/bronze materials and adds one screen material.

`loungeTv=previous` omits the TV and cabinet for matched local comparison. This is confined to the isolated prototype.

| Desktop STANDARD metric | Before TV | With TV |
|---|---:|---:|
| Viewer start → ready | 4.23 s | 3.79 s |
| Navigation → ready | 5.39 s | 4.42 s |
| Scene setup | 347 ms | 408 ms |
| Shader compilation | 1.20 s | 1.31 s |
| Shader programs | 21 | 21 |
| Submitted draw calls | 89 | 92 |
| Submitted triangles | 209,969 | 220,553 |
| Exterior image requests | 1 | 1 |

One fresh Chrome process per version, 1440 × 1000 DPR1, the same AMD ANGLE D3D11 GPU and browser shader disk cache disabled; no competing capture browser or artificial throttling. These are single exploratory runs. Catalogue latency fell from 1.52 s to 1.15 s, so the faster total is not attributed to the TV addition. The overall 5.2-second target remains outstanding across the earlier four-room review; this pair does not supersede those measurements.

All four existing Lounge interaction cases passed: STANDARD/FIXED140 on desktop/narrow, exact curtain geometry/UV/index/camera comparisons, motion, palettes, neutral Fabric Inspection, fabric routing, keyboard controls, room-state retention and switches. An initial narrow routing attempt encountered a catalogue-load error; both narrow cases passed when rerun, with no browser errors in the completed cases. Physical iPhone testing is outstanding.

Sixteen current Lounge screenshots refresh the four-room gallery. The preceding sixteen are retained in `C:/Users/hamza/curtainsuk-visualiser-2-lounge-tv-evidence-20261009/`, alongside timings, verification and source snapshots. The other rooms' gallery images are unchanged.

The 11,003 supported fabrics, curtain artwork, geometry, UVs, physical scale, motion, assignments and automatic routing remain unchanged. Work remains on `experiment/living-photo-composition-20261008`. Nothing merged, pushed, deployed or published. Free disk space was 32.97 GiB before work; no asset package or dependency was downloaded and no previous work or evidence was deleted.
