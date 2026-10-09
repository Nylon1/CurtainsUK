# Curtain material clarity plan — 9 October 2026

Scope: improve the existing curtain's readability from the normal room camera, consistently across Living, Bedroom, Lounge and Office. Remain in the local experimental branch. Preserve all source artwork, catalogue assignments, repeat/crop transforms, geometry, UVs, dimensions, camera and motion.

## Investigation

The approved STANDARD albedo is already 2048 × 1113 for the current floral example. Both profiles use trilinear mipmapping with anisotropy capped at 4. Oblique fold faces and small on-screen pattern features lose detail during minification. Full-frame FXAA also blends high-frequency material detail; increasing the entire renderer resolution would add substantial scene cost.

STANDARD uses a 64 × 64 nearest-filtered periodic bump texture without mipmaps. Its fine frequency can become unstable under minification. FIXED140 has no equivalent cloth surface treatment. Both retain the same real fold geometry through their existing motion solvers. Broad ambient fill reduces fold separation in the wider scene.

## Limited implementation

1. Add a local material-only presentation module, applied before program preparation and on fabric/profile replacement. Retain the existing material objects and chain the original STANDARD hem shader.
2. Raise supported anisotropic filtering to a bounded value and evaluate a small minification bias using the same source texture and unchanged sampling coordinates. Keep mipmaps and linear filtering; reject visible shimmer or halos.
3. Replace the unstable unfiltered bump with a very subtle, analytically filtered cloth response in material centimetres. Fade subpixel yarn detail rather than enlarging it. Treat this as generic cloth shading, not evidence of an individual fabric's weave construction.
4. Evaluate restrained fold-cavity attenuation of indirect light using the actual folded surface position. Keep direct light, albedo, room lighting/exposure and neutral Inspection unchanged. Use the same material response in room and close-up views, with footprint-based filtering instead of view-specific scale changes.
5. Compare room/close-up images, printed and plain fabrics, closed/partly-open/open poses, all rooms, both profiles and desktop/narrow. Preserve exact buffer hashes and source/texture transforms, including on profile changes and return visits.
6. Measure matched startup, shader counts, draw calls, GPU time and accessible memory. Keep full-scene resolution, lighting passes, downloads and render targets unchanged unless evidence justifies a separately budgeted adjustment. Refresh the four-room gallery and save before/after evidence.

No new photographic approval is assumed. If a detail is smaller than a room-view pixel, it should average naturally; the pattern must not be enlarged or redrawn to make it visible.

First comparison: material/filter improvements were restrained at room distance; FXAA's subpixel blend of 1.0 still softened printed detail. Evaluate a blend of 0.45 while retaining its edge search, thresholds, existing pass, resolution and render targets. This also affects fine room-surface detail, so check edges and moving fine prints for aliasing. Keep the former AA response available with `fabricDetail=previous` and all historical baseline modes.

Technical references: the bundled Three.js r180 shader chunks and [Three.js texture filtering documentation](https://archive.threejs.org/docs/api/en/textures/Texture.html), which describes the clarity/sample-cost tradeoff of anisotropic filtering. The existing shader and pipeline sources are the implementation authority.

Disk checked before work: 32.88 GiB free. No heavy asset work is planned and existing evidence/worktrees will be retained.
