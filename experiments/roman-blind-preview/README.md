# Roman blind visual study

Local preview only, based on protected source `48170133`. Start from the repository root:

```
node experiments/roman-blind-preview/server.mjs
node --test experiments/roman-blind-preview/geometry.test.mjs experiments/roman-blind-preview/motion.test.mjs
```

Open http://127.0.0.1:4318. The server binds only to loopback and serves an explicit asset allowlist. No production theme, runtime, flag, database or fabric eligibility changes are included.

## Agreed scope

- A 140 × 140 cm window and matching illustrative blind face.
- Room view is the fourth camera option. A 4.8 × 5.2 × 2.8 m illustrative lounge uses metre-scale geometry, including a 2.2 m sofa, armchair, coffee table, rug, rear console, art and lighting. The window opening stays exactly 1.4 × 1.4 m across all views; cameras change perspective, never model scale. Reverse reveals this same 3D interior as the blind opens, with warm-grey exterior surround for ivory contrast. Room dimensions are not customer measurements.
- Stacked and cascade choices, continuous drag, range input, keyboard adjustment and lowered/halfway/raised presets.
- Full travel takes eight seconds with a gentle start and stop; half travel takes four. Retargeting starts from the current position. Direct dragging follows the hand, and reduced-motion preferences bypass animation. Position and coverage readouts follow the rendered blind.
- Shallow, local creases develop around the fold being gathered. They follow the material and remain stable when stopped midway, without artificial flutter or changing the calculated coverage.
- Fold returns use a continuous semicircular cross-section with material allocated to the curved bend, instead of a sharp doubled-back sheet. Smooth panel fullness and separated return layers improve the gathering silhouette. Geometry checks cover continuity at each rod and less than 2% cross-section length deviation from the shallow fullness.
- Fold returns nest with 30, 20 and 10 mm radii and 10 mm settled face fullness. Different return depths expose each section's edge, while a short overlap between gathering stages makes the next panel fold behind the previous one. These are illustrative appearance parameters, not workroom construction dimensions.
- Soft contact shading follows the lower edge of overlapping folds and fades as they open. It darkens the recessed layer only, while retaining the supplier photograph and existing room lighting.
- A right-side beaded operating chain circulates around a fixed pulley/tensioner loop. Its two strands move in opposite directions, reverse on lowering and stop at the current blind position. The animation follows direct dragging and reduced-motion updates too. Chain travel is illustrative, not a specified gearbox ratio.
- The fold detail angle looks slightly upward so the returning sections remain visible underneath the front layer.
- The fabric face and ivory lining render on opposite sides of the same moving surface. The reverse is unpatterned and retains the fold/contact shading as sections turn over. A Reverse view allows direct inspection, with a small "Ivory lining" note beside the blind style caption.
- Fabric stays in material coordinates while the blind lifts. Three existing catalogue images with recorded widths above 140 cm are included. Their source hashes are recorded in fabrics.json.
- Owner confirmation on 6 November 2026: all source photographs represent physical squares, one full fabric width in both dimensions. This prototype uses recorded **full** widths (142 cm for the two PT examples, 141.5 cm for Sabu Stripe), not the separate usable width. It does not extend or tile artwork.
- Coverage readouts are computed from the same geometry as the preview, including the residual stack. 50% raised is half the available travel, not a claim of 70 cm clear glass.

## Explicit limitations

The fold plan now uses the conventional odd half-section method, with the shorter bottom half-section included. The owner's 7 cm headrail allowance and 15–20 cm target select seven half-sections and three rods for the 140 cm example. Standard depth is 19 cm and theoretical raised coverage is 26 cm. Cascade starts at 16.428571 cm and grows by the specified 2 cm towards a 22.428571 cm bottom half; theoretical raised coverage is 29.428571 cm. These replace the earlier full-fold-only estimates of 23.6 and 30.4 cm. The exact 7 cm allowance is retained instead of adjusting it to absorb rounded mark positions. See SOURCES.md for published guidance, derivation and independent calculator comparison.

The fold animation is an illustrative surface, not a validated physical simulation. Surface relief now adds restrained rod-pocket creases, gentle panel fullness, rounded returning folds and bottom-hem thickness. These are kept in material coordinates and do not alter physical artwork calibration. Raised coverage remains an estimate pending workroom hardware, lining, hem and stack checks. The headrail allowance is assumed inside the window opening.

Room geometry is original illustrative context. The existing approved garden reference, oak/weave maps and locally bundled Three.js renderer are reused. No new third-party scene asset or AI-generated supplier artwork is used. Fabric appearance is subject to screen/lighting differences.

Full room customisation, arbitrary window sizes, complete catalogue search, production fitting/calculation rules, quoting and checkout are future scope. Existing curtain/cushion calibration is untouched.
