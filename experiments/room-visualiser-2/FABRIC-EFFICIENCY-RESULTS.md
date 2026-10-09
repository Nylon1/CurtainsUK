# Curtain detail follow-up — 9 October 2026

[Open the updated four-room review](http://127.0.0.1:4382/rooms-review?review=fabric-detail) · [Plain and fine-pattern comparisons](http://127.0.0.1:4382/rooms-review?review=fabric-detail#fabric-samples) · [First material pass](FABRIC-DETAIL-RESULTS.md)

The approved detail treatment is retained across all four rooms. A conditional yarn-shading optimization was tested through browser-local module overrides and rejected because it produced no consistent GPU benefit. It was never installed in the live prototype. The current material, lighting hook, room integration, viewer hook and local server are byte-identical to the first detail pass's saved source snapshot.

## Review gallery

Added the existing, verified green plain Amalfi, fine Sabu Stripe and dark plain comparisons. Each can be viewed before/after in the Living Room, in close-up and under neutral Fabric Inspection, on desktop and narrow screens. These reference samples route to STANDARD, explicitly labelled; the original four-room comparison still supports both STANDARD and FIXED140.

Thirty-six original PNGs were copied byte-for-byte into the review gallery. Independent sample controls, enlarge/Escape behaviour and direct fabric links were checked. No new customer-viewer image, material, model, light, pass or dependency was added. The earlier four-room, window, lighting and fireplace evidence remains available.

The saved Daylight, Evening, Inspection and Fireplace views were visually reviewed alongside printed and plain samples. Fabric improvements remain restrained and physically scaled. Very small motifs naturally average at room distance; dark fabric remains dark. This pass makes no new claim of photographic approval or exact per-fabric weave reconstruction.

## Repeated GPU comparison

Living Room representative; three interleaved page runs for each version/profile/viewport. Each run discards four warm-up batches and records 20 valid GPU timer-query batches, each containing three complete renders with shadow updates. Figures below are medians of the three run medians, with 60 valid batches per table cell.

| Profile / viewport | Before fabric detail | Retained detail | Difference |
|---|---:|---:|---:|
| STANDARD desktop | 6.73 ms | 6.62 ms | −0.11 ms |
| FIXED140 desktop | 6.44 ms | 6.44 ms | approximately zero |
| STANDARD narrow | 2.96 ms | 3.08 ms | +0.12 ms |
| FIXED140 narrow | 2.68 ms | 2.85 ms | +0.17 ms |

The earlier isolated-frame 1.28 ms desktop increase was not reproduced by this repeated, batched method. These measurements do not prove zero overhead: narrow costs were modestly higher, and run-to-run variation remains. Batched figures should not be directly compared with the earlier isolated-frame absolute times. Keep both evidence sets.

Same Chrome/AMD ANGLE D3D11 GPU; desktop 1440 × 1000 DPR1, narrow 390 × 844 with device DPR2/internal DPR1.25. One browser process per profile/viewport, no concurrent test browser; each case uses a new page/context. This is a GPU follow-up, not a new cold-loading measurement. The unchanged renderer's last fresh-process desktop STANDARD full-navigation medians remain **4.88 s refined versus 5.10 s preceding material**, as documented in the first-pass report. Physical iPhone and customer-network checks remain outstanding.

## Rejected candidate

The candidate skipped trigonometric yarn/normal work when its existing visibility filter was exactly zero. Derivatives stayed outside conditional control flow; the source image, coordinates and filtering were unchanged. Its output was effectively identical in the sampled views, but GPU medians changed as follows:

| Profile / viewport | Retained shader | Candidate |
|---|---:|---:|
| STANDARD desktop | 6.46 ms | 6.58 ms |
| FIXED140 desktop | 6.10 ms | 6.25 ms |
| STANDARD narrow | 3.09 ms | 3.22 ms |
| FIXED140 narrow | 2.90 ms | 2.90 ms |

The candidate is saved as evidence, not used by the application. No artificial pattern enlargement, source sharpening, scale adjustment or geometry change was introduced to compensate for performance.

## Validation

- **16 runtime/prototype tests passed again**, including frozen source hashes, physical dimensions, motion, repeat metadata and immutable asset bytes. The already-installed Sharp dependency was supplied through the existing temporary loader; no package installation/change.
- Desktop and narrow gallery checks passed: all four rooms, both profiles, all lighting selections, existing before/after pairs, neutral close-ups, 18 added fabric/view/viewport combinations per layout, image loading, enlargement, Escape, direct links and no horizontal overflow. Zero console or HTTP errors.
- Live source hashes match the first-pass snapshots. All production runtime/catalogue/theme paths remain identical to protected commit `a83b38fd8f71b967e51ebe0173603df7c29b87d3`.
- Curtain geometry, normals, UVs, source artwork, dimensions, repeat/scaling logic, motion, assignments, automatic routing and all **11,003 supported fabrics** remain untouched. The first-pass exact buffer and camera comparisons remain applicable because rendering sources are unchanged.

Evidence: `C:/Users/hamza/curtainsuk-visualiser-2-fabric-efficiency-evidence-20261009/` (candidate, interleaved measurements, snapshots and gallery checks). Free disk: 31.89 GiB before / 31.73 GiB after checks. No heavy assets, dependency downloads, cleanup or deletion of previous work/evidence.

Branch remains `experiment/living-photo-composition-20261008`. No merge, push, deployment or publication.
