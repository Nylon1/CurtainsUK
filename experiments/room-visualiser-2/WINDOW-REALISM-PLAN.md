# PVC window and garden review — 9 October 2026

The user's garden-door photograph guides the recessed plaster opening, substantial frame, visible sill/threshold and partly open leaf. Keep the accepted four room designs, existing fireplace and every curtain/fabric control. Work stays on the isolated experimental branch and the local four-room gallery.

## Ranked changes before implementation

1. Replace the tiny 256px garden crop with the user's subsequently supplied garden photograph (`740D972E-7A75-4F02-BD33-ED15C0B8D08D/1-Photo-1.jpg`), positioned outside the aperture rather than on the glazing. Copy its bytes unchanged and preserve its aspect ratio; position the lawn, brick borders and seating in the view. This supersedes the initial higher-resolution Garden Nook investigation.
2. Build actual side/top reveals, a projecting sill behind the curtain envelope, layered PVC frame profiles, dark weather seals, drainage details, hinges and handles. Anthracite PVC follows the user's reference. Preserve the current STANDARD and FIXED140 opening dimensions and radiator/curtain clearance.
3. Open one leaf outward by approximately 35–40 degrees. This gives a clear change of depth and visible edge reflections without entering the moving curtains or altering their geometry. Use subtle transparent glass/reflections with no transmission render target, new light or additional shadow pass.
4. Give the exterior coherent daylight/evening exposure; preserve neutral Fabric Inspection and the existing curtain lighting. No whole-photo warping, fake movement of buildings or decorative clutter.

## Implementation and limits

- Add an experiment-only shared window module, first inspect Living and then check the same window architecture across all four rooms and both renderer profiles.
- Keep `window=previous` for a matched comparison. Save the current source and before images without deleting prior evidence.
- Do not change production room packs, the FIXED140 window source, curtain geometry, UVs, motion, scale, source artwork, palettes, assignment registry or automatic routing. All 11,003 supported fabrics remain intact.
- Share materials, merge stationary frame/reveal geometry and keep new texture/triangle costs small. No runtime HDR decode, PMREM, refraction buffer or continuous animation is planned.
- Disk check before assets: 33.44 GiB free, below the 35 GiB aim. A 28.8 MB higher-resolution Garden Nook source was inspected before the user supplied their preferred photo. The final window uses the user photograph; no dependency installation or deletion of existing worktrees/evidence is required.

## Review gates

- Desktop and narrow screenshots for Daylight open/closed, Evening, Fireplace ON and Inspection, both curtain profiles; publish only to the local review gallery.
- Exact curtain position/UV/index/camera hashes against the preserved baseline, motion and profile routing; room switching and controls remain functional.
- Verify new geometry remains behind the curtain envelope, the original fireplace stays visible and the FIXED140 radiator keeps its verified 18 cm vertical clearance.
- Matched fresh-browser previous/new loading, shader preparation, resource size, GPU timing and estimated memory. Target under 5.2 seconds under the same local conditions; report viewer startup and full navigation separately.
- No merge, deployment or production publication. Physical iPhone testing remains separate from narrow-viewport checks.
