# Refinement plan — recorded before implementation

Scope: local experimental Living Room only. No merge, deployment or protected runtime/catalogue changes. Existing uncommitted composition assets are preserved.

The reported 5.164s / 12.394s comparison uses the same AMD D3D11 GPU, viewport and STANDARD fabric, but one browser executes baseline then prototype: GPU shader caches/order are uncontrolled. Treat as an observation, not a controlled cold comparison. First draw grows 3.740s → 10.908s; transfer grows 10.270MB → 14.076MB. The 7.168s draw increase explains most of the 7.230s total increase. `gl.finish()` includes GPU completion; it does not isolate compilation. Repeat in fresh processes with disk shader caching disabled and record resource, parse, setup, explicit compile, first draw and GPU timing separately.

Visual ranking:
1. Lighting: excessive frontal rectangular fill and hemisphere wash flatten the room. Use a window-directed key, lower fill and the existing CC0 garden HDR for coherent reflections. Preserve Inspection intensity/exposure and neutral sources.
2. Indirect light/contact: no baked bounce or directional occlusion; screen AO is local and cannot replace GI. Next authored asset pass should bake two room lightmaps (day/evening), excluding movable curtains and recolourable fabric diffuse. Preserve neutral albedo; avoid baking warm casts into fabric.
3. Sofa: rigid, repeated cushion volumes and missing piping/compression remain a dominant silhouette limitation. Replace with a licensed, dimension-matched asset in a later asset pass, with 15–25k triangles and 1k maps. Do not add decorative objects.
4. Materials: calibrate roughness and textile normal amplitude; floor packed ARM must not be used indiscriminately as AO. Use standard PBR for room upholstery to reduce physical shader variants; keep curtain materials untouched. Reuse existing authored textile normal maps.
5. Window: opaque blue glazing is a large photographic failure. Try an inexpensive HDR-derived exterior view on the existing window surface, avoiding transmission/refraction passes. A subsequent real exterior plate with correct horizon and restrained Fresnel reflection is preferable.
6. Fire: repeated crossed additive fields lack flame structure and cast light through solid objects. Limit luminance/extent; later use a licensed flame atlas plus bounded local illumination or baked glow, without expensive point shadows on mobile.
7. Presentation: retain protected camera for comparison. Eye-level vertical correction and a longer focal length can be evaluated separately after engineering sign-off. Keep ACES and restrained exposure; no bloom, vignette, depth of field or colour grading in Inspection.

Second prototype: reuse already downloaded HDR/textile assets, simplify room PBR, reduce light wash, correct floor channels and exterior, instrument phases. Retain the first prototype as a selectable local comparison. No heavy asset acquisition while free space is 29.67GiB. Inspect disposable caches before cleanup; never delete worktrees, evidence or uncommitted work.

Acceptance: fresh-process repeated STANDARD comparison ≤5.2s under equivalent conditions, before/after day/evening/fire screenshots on desktop/narrow viewport, both curtain profile hashes unchanged, no errors. Narrow viewport is not physical mobile GPU certification. If target fails, report failure and retain isolation.

Photography references: Ben Pipe's Springfield Road photography (https://www.camillareidinteriors.com/work/springfieldroad) and House & Garden's Thea Speake neutral sitting room (https://www.houseandgarden.co.uk/article/neutral-decoration-schemes-to-copy). Compare tonal gradients, exterior exposure, cushion seams/compression, wood highlights and contact darkness, rather than object count.

Technical references: https://threejs.org/docs/pages/MeshPhysicalMaterial.html and https://threejs.org/docs/pages/WebGLRenderer.html . Physical materials cost more per pixel; compileAsync can reduce blocking but does not remove total shader work.
