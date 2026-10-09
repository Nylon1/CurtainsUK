# Living Room refinement review — 9 October 2026

**Not approved for production.** The limited second prototype improves lighting balance and initial rendering cost, but does not meet photographic realism or the 5.2-second STANDARD target. Nothing has been merged, pushed, deployed or published. Changes remain uncommitted on `experiment/living-photo-composition-20261008`, based on `e3c23e027357c1d2a70494112f8dc9eb57a04531`.

The [implementation plan](REFINEMENT-PLAN.md) was saved before implementation. The private [review gallery](http://127.0.0.1:4382/review) compares saved first/second prototypes in Daylight, Evening, Fireplace ON and neutral Fabric Inspection, with open/closed Daylight curtains, both profiles and desktop/narrow viewports. Evidence is in `C:/Users/hamza/curtainsuk-visualiser-2-refinement-evidence-20261008`.

## Performance diagnosis

Viewer-entry to first completed meaningful room render, seconds:

| Viewport / profile | Original baseline | First prototype | Second prototype |
|---|---:|---:|---:|
| Desktop STANDARD, median of 3 | 4.73 | 13.37 | 6.41 |
| Desktop FIXED140, one run | 3.64 | 12.21 | 4.95 |
| Narrow STANDARD, one run | 6.30 | 12.74 | 6.42 |
| Narrow FIXED140, one run | 4.68 | 13.06 | 5.32 |

Desktop STANDARD second-prototype runs were 6.86 / 6.19 / 6.41 seconds: about 52% faster than the first prototype, still 36% slower than the equivalent baseline. **Target failed.** Navigation-to-ready medians were 5.96 / 14.55 / 7.56 seconds respectively; these include page bootstrap and are a different metric.

Each run used a fresh Chrome process, ANGLE D3D11 on the same AMD integrated GPU, disabled GPU shader disk cache, the same fabric and source endpoints, and no recording or explicit compilation before normal startup. Desktop was 1440×1000 at DPR 1. Narrow was 390×844, device DPR 2, with internal DPR forced to 1.25 for every version. Desktop STANDARD has three repeats per version; other cells are exploratory single samples. Driver caches cannot be guaranteed fully cold, order was not randomized, and upstream TTFB can vary. These are loopback measurements, not a customer WAN simulation or physical mobile test. The original 5.2/12.4-second observations were single runs without this fresh-process control; they should not be treated as a precise like-for-like benchmark.

The dominant regression is completed first-draw work, rather than GLB parsing alone:

| Desktop STANDARD phase | Baseline | First prototype | Second prototype |
|---|---:|---:|---:|
| First draw / GPU completion, median | 3.51 s | 11.41 s | 4.49 s |
| Room GLB parse, median | 19.2 ms | 18.5 ms | 17.6 ms |
| Resource transfer total | 10.27 MB | 14.08 MB | 15.15 MB |
| Longest resource duration | 1.06 s | 1.14 s | 1.40 s |
| Longest response-body interval | 24.4 ms | 11.0 ms | 9.6 ms |

Resource durations include waiting/TTFB; parallel intervals must not be summed. Local response-body times do not predict slower customer networks. Instrumented second-prototype experimental asset loading was roughly 93 ms in a representative run, including about 85 ms for chair loading/parsing, 37 ms for textile loading/decoding and 31 ms for floor maps. Scene/material/geometry/fireplace setup was about 225 ms. These phases overlap and are not additive. Shader-only diagnostic runs with explicit `compileAsync` showed approximately 1.3–2.4 seconds across exploratory candidates; normal first-draw timing also includes GPU compilation, texture upload, shadows and postprocessing, so it cannot be labelled a pure shader measurement.

Room-only MeshStandard conversion, fewer initial point-light variants and common material map features reduced initial draw cost. Deferring visible warm lights exposed an unacceptable tradeoff: **the first completed Evening + lamps + fireplace render stalls for 8.74 seconds on desktop and 8.65 seconds in the narrow test**. Subsequent frames are fast. This is shifted initialization work, not a resolved performance problem.

Daylight GPU median over 12 non-disjoint timer-query samples:

| Viewport | Baseline | First prototype | Second prototype |
|---|---:|---:|---:|
| Desktop | 6.57 ms | 8.50 ms | 5.77 ms |
| Narrow | 2.74 ms | 3.97 ms | 3.15 ms |

Estimated accessible texture/buffer/render-target/shadow memory is 57.0 / 98.6 / 101.6 MiB on desktop and 42.3 / 83.9 / 86.9 MiB narrow. These are estimates, not measured total VRAM: driver, shader-cache and some renderbuffer overhead are excluded. Added room textile texture increases memory despite faster shaders. Memory and transfer still need reduction.

## Photographic comparison and ranked improvements

Reference: [Camilla Reid Interiors, Springfield Road, photography by Ben Pipe](https://www.camillareidinteriors.com/work/springfieldroad). The saved private reference `reference-living-004.jpg` shows directional window light, soft ceiling bounce, deep local contacts, fabric compression and near-vertical architectural lines. It was used for comparison only, not as a room texture.

1. **Lighting, exposure and indirect illumination.** The prototype still has excessively uniform fill and incomplete window-directed bounce. The second version reduces Daylight fill and adds a small HDR-derived spherical-harmonic light probe, with restrained exposure. This is not baked GI and cannot capture wall occlusion or local colour bleeding. Bake room-only Daylight/Evening irradiance and contact illumination, separating irradiance from albedo and excluding moving curtains. Preserve neutral Inspection lighting and remove probe/warm contributions there.
2. **Furniture detail and proportions.** Broad sofa cushions remain regular, inflated primitive forms, with insufficient seams, piping, creases and compression. The existing chair reads better after correcting wood metalness, but does not solve the sofa. Replace the sofa with a dimension-matched authored asset, approximately 15–25k triangles, optimized 1k textures, believable cushion joins and edge radii. No extra decorative objects are required.
3. **Materials, roughness and reflections.** Repeated surfaces still look uniformly clean and lack convincing grazing-angle variation. The second version uses room-only Standard materials, restrained floor/upholstery normals and shared shader features. The packed ARM texture is valid AO-red/roughness-green/metalness-blue; it was not a channel error. Removing metallic maps required explicitly restoring nonmetal wood to metalness zero. Use calibrated room-only roughness/normal atlases and compressed textures; retain all fabric artwork and assignments untouched. No runtime PMREM or global environment map is loaded in this candidate, so reflective surfaces still need a carefully budgeted environment solution.
4. **Walls, floor, ceiling and contacts.** Wall/floor scale is more coherent but ceiling emission and generic fill remain approximations. Furniture-floor contacts and room corners lack photograph-like soft, localized grounding. Bake architectural bounce/contact shadows at modest resolution; use subtle paint roughness and correctly scaled wood normals. Do not compensate with stronger full-screen AO, which can dirty the fabric.
5. **Window glass and daylight.** A small HDR-derived exterior plate now shows through room-window UVs, replacing an obscured/tinted view. This changes only room-window UVs, never curtain UVs. It is a static plate with no parallax, Fresnel or refraction. Establish a believable exterior horizon, consistent light direction and inexpensive Fresnel reflections; avoid expensive transmission on mobile.
6. **Fireplace flame and illumination.** Independent phase offsets and normal alpha blending reduce the repeated additive flame appearance. It is still layered procedural geometry, with no volumetric depth or realistic illumination occlusion. A short optimized flame atlas and bounded or baked warm illumination are preferable. Avoid changing point-light counts on first interaction; the measured first-toggle stall is a release blocker. Do not add mobile point-light shadow maps without evidence of budget headroom.
7. **Camera and photographic presentation.** Current perspective remains recognizably a product visualizer, and broad visible room surfaces expose simplified geometry. Camera parameters were preserved for comparison. A later room-only composition trial can use corrected verticals and a slightly longer photographic lens without altering physical curtain scale or inspection views. Keep restrained ACES/exposure; avoid heavy bloom, depth of field or colour grading that obscures fabric fidelity.

## Limited second prototype

Reused existing room/chair assets; no decorative asset expansion. Added offline HDR-derived irradiance coefficients and a small exterior image, room material normalization, a subtle upholstery normal, reduced Daylight fill, corrected room-window view mapping and nonmetal furniture semantics, and less additive/repetitive flame layers. The offline CubeUV binary is retained as evidence but is not fetched at runtime. Evening and Inspection settings remain preserved; warm fire/lamps/probe are suppressed in Inspection.

The improvements are incremental. They do not constitute premium photographic approval. The before/after gallery makes the remaining geometric and illumination limitations visible rather than hiding them with postprocessing.

## Proposed next implementation sequence

1. Resolve startup and first-toggle shader variants together: fixed shader feature counts, material sharing, room-only baked Daylight/Evening illumination, and bounded warm glow. Measure asset fetch, decoding, geometry/setup, explicit shader compilation, first meaningful draw and first warm interaction independently. Lazy-load genuinely optional assets after a complete room render, never report an incomplete room as ready.
2. Reduce room texture transfer and decoded memory with KTX2, packed maps/atlases and shared materials. Use approximately 1k room maps on desktop and 512 on mobile where visually acceptable; retain all original curtain source artwork. Benchmark normal DPR and a declared common-DPR comparison separately. Deferred fireplace work must not introduce a blocking first interaction.
3. Add the dimension-matched sofa and architectural lightmaps, then calibrate paint/wood/fabric roughness, window view and contacts against the reference. Keep camera and lighting states reproducible and Inspection neutral.
4. Repeat fresh-process tests with randomized order and more repeats, controlled customer-like network conditions, desktop and actual iPhone. Accept only after comparable cold STANDARD is at or below 5.2 seconds, warm controls have no blocking initialization, memory is within a declared mobile budget, and photographic review approves the images. Physical iPhone testing remains outstanding.

## Engineering and storage

Protected production paths (`lib`, `public`, `app`, `shopify-theme`, package files) have no diff against `a83b38fd8f71b967e51ebe0173603df7c29b87d3`. Exact curtain position/UV/index hashes, camera and group transform checks cover closed/open/returned endpoints for both profiles, with baseline/first/second desktop comparisons and final narrow checks. Existing routing, fabric assignments, palettes, source artwork, physical scale and all 11,003 supported fabrics remain unchanged. The prior 18 cm FIXED140 radiator clearance is preserved; no curtain/radiator placement change was made. Fifteen runtime/prototype tests passed in this refinement; the previous 99-test report is historical, not a new 99-test run.

Free disk was checked at 29.67 GiB before asset work. Disposable npm cache was cleared using npm's cache command. Latest free space is above 38 GiB, exceeding the 35 GiB working-headroom goal. Existing worktrees, evidence and pre-existing uncommitted composition assets were preserved.
