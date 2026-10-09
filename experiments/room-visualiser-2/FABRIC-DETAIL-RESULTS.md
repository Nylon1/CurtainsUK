# Curtain fabric detail — 9 October 2026

Follow-up: [repeated GPU measurements and additional plain/fine-pattern gallery comparisons](FABRIC-EFFICIENCY-RESULTS.md). The conditional shader candidate was rejected; this material implementation is retained unchanged. Both measurement methods are preserved and distinguished in that report.

[Compare all four rooms](http://127.0.0.1:4382/rooms-review?review=fabric-detail) · [Open Living Room](http://127.0.0.1:4382/?room=living&fabric=sdg-f1541-01&fabricDetail=current) · [Implementation plan](FABRIC-DETAIL-PLAN.md)

The material refinement applies to STANDARD and FIXED140 in Living, Bedroom, Lounge and Office. The gallery opens with closed curtains for full-width comparison and includes the preceding rendering, current rendering and neutral close-up references. Open/closed poses, lighting, profiles and desktop/narrow screenshots remain selectable.

## Changes, in order of contribution

1. **Pattern clarity:** supported anisotropic filtering increases from 4 to 8, with a restrained −0.3 mip bias. Mipmaps, linear filtering, source pixels and every repeat/crop coordinate are retained. The existing FXAA pass uses less subpixel blending (0.45 instead of 1.0), retaining its edge search and thresholds. This also makes fine room-surface detail slightly crisper; it adds no pass or resolution increase.
2. **Fold readability:** bounded attenuation of indirect diffuse light in the actual rearward folds gives the valleys more separation. This is an approximation of local bounce occlusion, not baked GI. Direct lighting and source albedo are not multiplied by this term.
3. **Cloth response:** the nearest-filtered STANDARD bump is replaced with subtle analytical cloth shading, filtered by its screen footprint. Unresolvable yarn detail fades away instead of becoming a coarse invented weave. Both profiles use this generic surface response; it is not a claim about each fabric's construction. Roughness is 0.94; STANDARD's sheen is reduced to 0.12 with neutral white highlights.

The same material object, source texture and physical coordinates remain active in room and close-up views. There is no camera-dependent pattern enlargement, repainting, saturation adjustment, displacement or new crease geometry. Neutral Fabric Inspection retains its lighting and zero warm-light contribution. The existing STANDARD hem/tape shader is chained rather than replaced. `fabricDetail=previous` restores the preceding material and FXAA response for local comparison.

## Matched performance

Living Room is the performance representative; all four rooms receive functional and visual checks. Desktop STANDARD uses three interleaved fresh-process runs per version. Other cells are one exploratory run per version.

| Viewport / profile | Before viewer → ready | Refined viewer → ready | Before navigation → ready | Refined navigation → ready |
|---|---:|---:|---:|---:|
| Desktop STANDARD, median of 3 | 3.98 s | 3.74 s | 5.10 s | 4.88 s |
| Narrow STANDARD | 3.25 s | 3.42 s | 4.32 s | 3.92 s |
| Desktop FIXED140 | 3.53 s | 3.67 s | 4.66 s | 4.82 s |
| Narrow FIXED140 | 3.26 s | 3.39 s | 4.41 s | 3.84 s |

All six refined full-navigation samples were below 5.2 s in these local conditions. Catalogue response and bootstrap variation are included; the faster totals are not attributed solely to the material change. Desktop STANDARD catalogue median decreased from 1.23 to 1.09 s; shader compilation stayed about 1.23 s.

| GPU/resource metric | Before | Refined |
|---|---:|---:|
| Desktop STANDARD GPU median, 12 valid samples | 7.68 ms | 8.96 ms |
| Narrow STANDARD GPU median | 3.93 ms | 3.87 ms |
| Desktop FIXED140 GPU median | 8.41 ms | 8.67 ms |
| Narrow FIXED140 GPU median | 3.70 ms | 3.68 ms |
| STANDARD programs / submitted draw calls | 22 / 104 | 22 / 104 |
| FIXED140 programs / submitted draw calls | 19 / 119 | 19 / 119 |
| Desktop STANDARD accessible memory estimate | 85.67 MiB | 85.65 MiB |

The desktop STANDARD GPU sample increased by 1.28 ms; this cost is disclosed rather than presenting the change as uniformly faster. Narrow GPU samples were effectively unchanged. No added image/model download, render target, light or draw pass. Warm-light activation creates no additional programs; the slowest refined activation in the exploratory set was 58 ms.

Same AMD ANGLE D3D11 GPU; Chrome process restarted for each timing case; shader disk cache disabled. Desktop 1440 × 1000 DPR1; narrow 390 × 844 device DPR2/internal DPR1.25. No concurrent test browser, artificial network/CPU throttling or physical phone. Driver caches cannot be guaranteed cold. Timing phases overlap and must not be summed. Memory estimates exclude driver/program overhead. These local results do not establish customer-network performance or physical iPhone approval.

## Verification and evidence

- **16 runtime/prototype tests passed.** The existing runtime suite needed the already-installed Sharp dependency through a temporary external loader; no dependency install, package edit or protected test-source change was made.
- **16 room/profile/viewport cases passed:** exact original curtain/camera comparisons, open/closed motion, material palettes, catalogue routing, room-state retention, staggered switches and neutral Inspection; zero browser/HTTP errors in the completed cases.
- Before/after STANDARD and FIXED140 position, normal, UV and index hashes match at closed, half-open and open poses. Source URL, dimensions, colour space, wrapping, flip, repeat, offset, plan, camera and group transforms match.
- **12 fabric sample cases passed:** green plain Amalfi, fine Sabu Stripe and dark plain fabric, before/after on desktop/narrow. Camera changes preserve the same geometry, material and texture objects and shader count. Fine-pattern intermediate poses were saved for motion review.
- The direct-render capability fallback passed with floating-point postprocessing disabled. Physical iPhone testing remains outstanding.
- Sixty-eight room images were refreshed, sixty-eight immediate before images retained, and neutral desktop close-up pairs saved. Gallery controls include the new fabric comparison.

Source and evidence snapshots: `C:/Users/hamza/curtainsuk-visualiser-2-fabric-detail-evidence-20261009/`. The original production paths remain byte-identical to `a83b38fd8f71b967e51ebe0173603df7c29b87d3`. All 11,003 supported fabrics, source artwork, dimensions, repeat/scaling logic, UVs, motion, assignments, routing and the 18 cm FIXED140 radiator clearance remain intact.

Branch: `experiment/living-photo-composition-20261008`. Nothing merged, pushed, deployed or published. Disk was 32.88 GiB before work and 32.05 GiB at the final check, below the earlier 35 GiB aim. No heavy asset/dependency download or deletion of prior work/evidence was performed.
