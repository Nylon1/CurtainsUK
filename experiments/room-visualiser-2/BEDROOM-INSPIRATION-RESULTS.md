# Bedroom reference and fitted wardrobe — 9 October 2026

[Open Bedroom](http://127.0.0.1:4382/?room=bedroom&fabric=sdg-f1541-01) · [All four rooms and saved before/after views](http://127.0.0.1:4382/rooms-review) · [Implementation plan](BEDROOM-INSPIRATION-PLAN.md)

The Bedroom now follows the supplied photograph's ivory-and-brass direction: tall channelled upholstery, matching padded bed base, fuller layered pillows, a softly draped duvet, folded throw, restrained wall panels and original abstract artwork. The bed moves to the right of the existing window. Paired bedside cabinets/lamps, a compact tiered chandelier and ceiling cove provide the warm lighting treatment.

The requested built-in wardrobe fills the left wall: six panelled doors, slim brass handles, a recessed plinth and full-height cornice. Its carcass is approximately 2.84 m wide and 60 cm deep. The chair moves forward; measured geometry leaves **63.64 cm** from the handles to its nearest point. No new room triangle intersects the protected curtain clearance envelope. This checks the rendered arrangement, not a construction specification.

All six existing Bedroom palette controls remain active. The bedspread, upholstery and cushions use their original selectable materials. Room-specific palettes, fabric selection/routing, views and curtain motion are preserved. The single **Room lighting** control operates the warm fixtures and cove; neutral Fabric Inspection suppresses all warm lights and fixture emission.

## Performance

Three interleaved fresh-process runs per version for desktop STANDARD; other profile/viewport cells use one exploratory run each. The previous Bedroom is available with `?room=bedroom&bedroom=previous`.

| Desktop STANDARD metric | Previous Bedroom | Bedroom + wardrobe |
|---|---:|---:|
| Viewer entry → complete room render, median | 3.47 s | **3.86 s** |
| Navigation → ready, median | 4.60 s | 5.05 s |
| GLB request / parsing | 9.9 / 16.8 ms | 10.4 / 18.7 ms |
| Shared asset load/decode | 28.4 ms | 26.6 ms |
| Geometry/material/light setup | 137.2 ms | 512.1 ms |
| Shader compilation | 1.20 s | 1.13 s |
| Offscreen GPU preparation | 413.0 ms | 409.3 ms |
| First normal pipeline draw | 309.4 ms | 305.5 ms |
| First Evening + lighting activation | 11.5 ms | 13.4 ms |
| Programs before → after activation | 19 → 19 | 19 → 19 |
| Daylight GPU median, 12 samples | 6.89 ms | 9.77 ms |
| Estimated accessible graphics memory | 73.37 MiB | 77.03 MiB |
| Transfer through readiness | 12.381 MB | 12.396 MB |

The additional room geometry costs approximately 0.40 s of total startup, 2.88 ms of measured GPU frame time and 3.66 MiB of estimated accessible memory. It stays under the 5.2-second viewer-loading target and 16.7 ms GPU frame budget on this machine. This is a measured quality/performance tradeoff, not a claim that every cost improved. Repeated upholstery geometry is cached during assembly; shapes are merged by material and the existing three light slots/shader preparation are reused. No new asset package or transmission buffer is loaded.

| Candidate viewport/profile | Viewer entry → ready | Navigation → ready |
|---|---:|---:|
| Desktop STANDARD, median of 3 | 3.86 s | 5.05 s |
| Narrow STANDARD, single run | 4.09 s | 5.10 s |
| Desktop FIXED140, single run | 3.82 s | 4.99 s |
| Narrow FIXED140, single run | 3.34 s | 4.50 s |

All measured candidate viewer-entry samples are below 5.2 seconds. One desktop STANDARD navigation-to-ready sample was **5.22 s**, including bootstrap/catalogue timing. The historical viewer-entry metric and full navigation timing are recorded separately rather than conflated.

Conditions: same Chrome executable and AMD ANGLE D3D11 GPU, fresh process per case, browser GPU shader disk cache disabled, desktop 1440×1000 DPR1, narrow 390×844 common internal DPR1.25. No competing browser capture during timing. Local loopback, no WAN/CPU throttling; driver caches cannot be guaranteed fully cold. Resource phases overlap and must not be summed. Memory excludes driver/program overhead. Physical iPhone testing remains outstanding.

## Verification and review

- **16 runtime/prototype tests passed**, including frozen source/artwork hashes and FIXED140 18 cm radiator clearance across sampled poses/widths.
- Both profiles on desktop and narrow screens match original curtain position, UV, index, scale and camera hashes at closed/open/returned endpoints. Leaving Bedroom also preserves the other three rooms' curtain/camera state.
- All six colour controls change the intended materials and retain choices after returning. STANDARD/FIXED140 fabric routing, views, animated/reduced-motion endpoints, keyboard controls, fabric dialog and staggered room switches passed without browser errors.
- Inspection has zero warm point/probe contribution, cove glow, lamp emission and chandelier emission. Lamps/cove OFF is also checked in Daylight.
- All four rooms remain together in the gallery. Its lighting/profile/viewport/pose controls, Living Room fireplace view, Bedroom/Lounge before-and-after enlargement, and direct Bedroom link passed on desktop and narrow viewports. No horizontal overflow was found.
- Sixteen new Bedroom views replace its gallery images. All sixteen prior views are retained; the other rooms' saved images are unchanged.

The reference informs the rendered design; photographic realism is not assumed. The faceted chandelier approximates crystal without transmission, warm lights remain unshadowed, and the shared shadow/AO pipeline still limits fine detail, especially at narrow resolution.

All 11,003 supported fabrics, curtain geometry, UVs, artwork, motion, physical scale, assignments and routing sources remain unchanged. Protected production paths are byte-identical against `a83b38fd8f71b967e51ebe0173603df7c29b87d3`. Work remains uncommitted on `experiment/living-photo-composition-20261008`, HEAD `e3c23e027357c1d2a70494112f8dc9eb57a04531`. Nothing merged, pushed, deployed or published.

Disk was 34.53 GiB before work and approximately 34.10 GiB at the latest check, below the desired 35 GiB headroom. No heavy asset download, dependency install or destructive cleanup was performed; existing work and evidence remain intact.

Evidence: `C:/Users/hamza/curtainsuk-visualiser-2-bedroom-inspiration-evidence-20261009/` contains before/after PNGs, `verification.json`, `gallery-verification.json`, `performance.json`, `performance-summary.json`, source snapshots and validation metadata. The main gallery remains `C:/Users/hamza/curtainsuk-visualiser-2-four-rooms-evidence-20261009/review.html`.
