# Roman blind visual study

Local preview only, based on protected source `48170133`. Start from the repository root:

```
node experiments/roman-blind-preview/server.mjs
node --test experiments/roman-blind-preview/geometry.test.mjs
```

Open http://127.0.0.1:4318. The server binds only to loopback and serves an explicit asset allowlist. No production theme, runtime, flag, database or fabric eligibility changes are included.

## Agreed scope

- A 140 × 140 cm window and matching illustrative blind face.
- Stacked and cascade choices, continuous drag, range input, keyboard adjustment and lowered/halfway/raised presets.
- Fabric stays in material coordinates while the blind lifts. Three existing catalogue images with recorded widths above 140 cm are included. Their source hashes are recorded in fabrics.json.
- Owner confirmation on 6 November 2026: all source photographs represent physical squares, one full fabric width in both dimensions. This prototype uses recorded **full** widths (142 cm for the two PT examples, 141.5 cm for Sabu Stripe), not the separate usable width. It does not extend or tile artwork.
- Coverage readouts are computed from the same geometry as the preview, including the residual stack. 50% raised is half the available travel, not a claim of 70 cm clear glass.

## Explicit limitations

The fold model is an original illustrative surface, not a validated physical cloth simulation or manufacturing model. Owner-supplied inputs: 7 cm headrail allowance, 15–20 cm target fold depth and 2 cm cascade increment. Four fold sections are calculated from the 133 cm remaining drop. Stacked front depth is 16.625 cm; cascade front depth is 17.375 cm, with the first three returns offset by 2 cm and section lengths balanced to preserve the same cloth length. Resulting raised coverage is approximately 23.6 cm for stacked and 30.4 cm for cascade. The 7 cm allowance is assumed to occupy the top of the window, not sit above it. These are labelled preview estimates in the interface. Workroom rod spacing, headrail, returns, hems, cascade specification and mounting position must be confirmed before quoting finished stack coverage. The short folded return is a continuous-texture simplification, without separate lining.

Room geometry is original illustrative context. The existing approved garden reference and locally bundled Three.js renderer are reused. No new third-party scene asset or AI-generated supplier artwork is used. Fabric appearance is subject to screen/lighting differences.

Full room customisation, arbitrary window sizes, complete catalogue search, production fitting/calculation rules, quoting and checkout are future scope. Existing curtain/cushion calibration is untouched.
