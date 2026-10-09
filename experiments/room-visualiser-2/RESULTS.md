# Phase 1 review results — 8 October 2026

> Historical Phase 1 evidence. The later approved four-room design was integrated and published on 9 October through PR #164; see the [current source of truth](../../docs/room-visualiser-2-customer-release.md). The production/version and performance statements below retain their original Phase 1 meaning.

Experimental local prototype only. Production remains at a83b38fd8f71b967e51ebe0173603df7c29b87d3 / tree 543ef8484e74b3871cadc09ec10fac4e9fc10ccc.

## Tests and evidence

* 55 existing Room Visualiser tests passed (38 mjs + 17 TS/CJS).
* 39 existing storefront room/order-contract tests passed.
* 5 new prototype checks passed. Total: **99 passed, 0 failed**.
* Eight final browser scenarios: two profiles × desktop/narrow × baseline/prototype; zero page/WebGL errors and zero HTTP error responses.
* Closed positions, UVs, indices and initial camera match baseline byte-for-byte for both profiles and viewport sizes. Motion endpoint hashes also match.
* Fabric/profile and room switching preserve palette, position and ambience. Reduced-motion controls reach exact endpoints and fire becomes static.
* Six repeated Bedroom → Living Room cycles stabilise at 58 GPU geometry objects and 31 textures; no growth or context loss observed. Counts are renderer counters, not an exact GPU-memory measurement.
* Radiator top 78 cm / curtain hem 96 cm = 18 cm gap, verified across 120/135/137/140/150/160 cm source widths, 21 positions and lag/settle variants. Sampled cloth depth range without lag is -5.276 to +8.369 cm; added sill front is -13.5 cm, behind the cloth. The fireplace's nearest edge is x=-150.5 cm, outside STANDARD's ±115 cm cloth envelope.
* No physical iPhone Safari verification has been performed.

Durable evidence directory: C:/Users/hamza/curtainsuk-visualiser-2-evidence-20261008 . See review.html, qa-results.json, performance.json, summary.json, asset-proof.json, test logs, 79 PNG captures (including preliminary captures) and the recorded desktop workflow. Final capture filenames start baseline-/prototype-desktop-/prototype-mobile-.

## Performance

Windows Chrome, AMD Radeon integrated GPU via ANGLE D3D11. Local loopback serves identical production source in baseline mode; public catalogue/approved fabric assets are read through HTTPS. No video recording during these measurements. Narrow viewport uses the **same desktop AMD GPU**, not an iPhone GPU. These are bounded observations, not statistically controlled device certification. First-render timings are measured from viewer module entry, including loading and compilation; navigation-to-ready is separately retained in JSON.

| Version | Profile | Viewport | First render | Median open/close FPS (4 runs) | Draw submissions including post-processing | Visible scene triangles |
|---|---|---|---:|---:|---:|---:|
| baseline | STANDARD | Desktop | 5.16 s | 52.8 | 68 | 83,614 |
| prototype | STANDARD | Desktop | 12.39 s | 44.3 | 97 | 99,422 |
| baseline | FIXED140 | Desktop | 2.39 s | 59.1 | 87 | 59,214 |
| prototype | FIXED140 | Desktop | 4.79 s | 52.5 | 136 | 97,630 |
| baseline | STANDARD | Narrow | 2.07 s | 49 | 68 | 83,614 |
| prototype | STANDARD | Narrow | 2.82 s | 42.7 | 97 | 99,422 |
| baseline | FIXED140 | Narrow | 2.20 s | 60.2 | 87 | 59,214 |
| prototype | FIXED140 | Narrow | 3.02 s | 59.6 | 136 | 97,630 |

The first STANDARD prototype draw blocked for approximately 10.9 seconds on cold shader compilation. This is a material limitation, **not a production-ready load-time pass**. Warm cases are faster. The asset download/parse portion was around 0.1–0.3 seconds locally; GPU program creation dominates the cold case. No claim of equal baseline performance is made. Prototype motion remains interactive but costs frames versus baseline. Optimise shader variants/precompilation and environment passes before any rollout.

The final narrow prototype caps DPR at 1.25 instead of 1.5, preserving camera/aspect while reducing post-process targets from approximately 5.01 MiB to 3.48 MiB. Desktop targets remain 18.16 MiB. This is an explicit prototype quality trade-off.

## Assets / graphics cost

New source assets total 4,558,698 bytes (4.35 MiB), including original source textures and download metadata. The CC0 chair adds 8,916 triangles / 5,851 vertices before the original chair is removed. Active scene totals above include the curtain, all furniture and profile architecture; draw triangle totals in JSON also include shadow/AO passes.

Additional decoded room-texture storage is approximately 46–50 MiB including mipmaps and the small generated reflection field, beyond the baseline room maps (~9.08 MiB), curtain texture, shadow map and render targets. This is an estimate; browser counters do not expose exact VRAM. The baseline/prototype use the same selected curtain source sizes. No catalogue is preloaded into GPU memory.

## Visual verdict / next stage

The prototype delivers working fire/embers, room ambience, lamp lights, V1 radiator, richer wood and upholstered material response, and a more detailed chair. It remains visibly CG. The original sofa/plants, simple outdoor glazing and absence of baked indirect light prevent a luxury-photography claim. The fire is layered, and new warm point lights do not cast dynamic shadows.

Review the environment direction first; then improve authored furniture/plant/exterior detail and indirect/contact lighting while reducing shader-startup cost. A physical iPhone Safari pass and memory observation are mandatory before proposing any production integration. Do not expand the other rooms or catalogue on this branch.

## Invariants

Protected production, deployment, Shopify, FI, pricing, stock, supplier artwork, Browse, all 3,137 STANDARD and 7,866 FIXED140 assignments are unchanged. The 812 held fabrics were not processed. No merge, push, deployment, database write or catalogue eligibility update was performed.

C: initially 23.44 GiB free; owner explicitly authorised continuing and deferring storage recovery. Final observed free space 30.93 GiB. No cleanup was performed; that free-space change is not attributed to this task.
