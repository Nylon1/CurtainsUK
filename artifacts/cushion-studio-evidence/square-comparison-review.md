# Square drape comparison — local visual checkpoint

This is a controlled, preview-only comparison for standard square cushions. The current drape remains the construction baseline. No manufacturing specification, baseline `squarePanelPoint`/`squareDrapeFootprint`, cutting, quote, saved placement, layout geometry or workroom approval gate changed.

The owner's latest photograph informed the broader filled face and shallower lower seam only. Its artwork was not imported. Both variants use the selected real catalogue original.

## Visible alternative

The experimental profile broadens the shoulders and reduces the upward bow of the lower perimeter. At 50 cm, the lower centre seam rises 7.5 mm above the corner baseline rather than 18.75 mm. Maximum finished corner spans and the 155 mm centre depth remain unchanged. The perimeter retains the existing sewn fold. The 38 cm preview uses a lighter 20% blend to remain within the measured mapping tolerance; 45–60 cm use the full profile.

The alternative has its own surface-arc artwork coordinates, anchored at the same motif centre on both upright faces. At 50 cm its visual source footprint is 558.024 x 540.681 mm, versus the unchanged baseline 547.218 x 520.066 mm: an additional 10.805 x 20.615 mm of visible cloth. These experimental values do not enter the cut plan or price and are not manufacturing-approved.

If the extra footprint falls outside the original image at the selected anchor, the alternative shows an explicit unavailable message and neutral geometry. It does not repeat, clamp, substitute artwork or move the saved anchor. The comparison selection is ephemeral UI state, excluded from saved design/spec and quote requests, and applies only in the individual square configurator.

## Reproducible paired evidence

Local URL: `http://127.0.0.1:4357/cushion-studio-preview/`.

Use one 50 x 50 cm standard square, Cover & filling, Unpiped, **Amalfi Herb (`sdg-f1239-30`)**, source placement X100/Y100 mm. Keep Inspect front selected. Toggle Current drape / Experimental fullness under “Square shape comparison - preview only”. The two variants retain identical lighting and camera at each angle. Straight is face-on, three-quarter is approximately 35 degrees, and Side view is exactly orthogonal to the face. The right control panel may scroll between captures; the product camera does not change.

| View | Current drape | Experimental fullness |
| --- | --- | --- |
| Front | [Baseline front](square-comparison-baseline-front.jpg) | [Alternative front](square-comparison-experimental-front.jpg) |
| Three-quarter | [Baseline three-quarter](square-comparison-baseline-three-quarter.jpg) | [Alternative three-quarter](square-comparison-experimental-three-quarter.jpg) |
| True side | [Baseline side](square-comparison-baseline-side.jpg) | [Alternative side](square-comparison-experimental-side.jpg) |

The front pair shows the shallower lower bow. The side pair exposes the broader shoulder profile without increasing centre depth. Browser inspection found no broad stretched texture band. The toggle also worked via Enter, with `aria-pressed` reflecting selection. Final console warning/error readback was empty; all labels were checked after replacing corrupted replacement characters.

All six final files were recaptured after an earlier screenshot revealed an unintended X247.9 mm anchor. The earlier captures were replaced. `square-comparison-capture-state.json` records DOM readbacks immediately before and after each final screenshot: fabric `sdg-f1239-30`, `square-50`, filled, Unpiped, front selected, X100/Y100 mm throughout, with only the named variant and angle changing. Capture aborted if the anchor or any recorded state changed. Lighting has no comparison-dependent branch.

## Verification and limits

- `npm run test:cushions`: 73/73 passing, including five new comparison tests covering unchanged baseline output, separate footprint, matching faces, motif anchor, finished spans, source bounds, true-side camera and physical mapping.
- Independent metrics script: `node artifacts/cushion-studio-evidence/square-comparison-metrics.mjs`; recorded results in the adjacent JSON. It compares independent 3D surface distance with the full two-dimensional source-coordinate path in 2 mm parameter bands through the outer 20 mm, both axes and ends, five cross-sections, and all five standard square sizes.
- Worst sampled discrepancy: 0.969% at 45 cm; 0.453% at 50 cm. This is a numerical local mapping audit, not a claim that a doubly curved fabric surface is globally isometric or a validated physical sewing simulation.
- Runtime syntax checks and `git diff --check` passed. Parent independently reported typecheck passing and a useful visible comparison.

No release gate was changed. The experimental profile is not an orderable construction; the existing square drape workroom confirmation requirement remains. No push, merge, deployment or production write was performed for this checkpoint.
