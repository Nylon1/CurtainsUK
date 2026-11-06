# Roman layout and visual references

Checked 6 November 2026. This replaces the initial equal full-fold prototype calculation.

## Standard layout

- [Just Fabrics: workroom making guide](https://www.justfabrics.co.uk/blogs/inspiration/how-to-make-a-high-quality-lined-roman-blind): subtract the headrail allowance, choose an odd half-section count, put the first rod one half-section above the bottom and successive rods two half-sections apart.
- [Sew Helpful: standard fold calculation](https://www.sew-helpful.com/roman-blind-lined-step2.php): rod count is `(halfSections - 1) / 2`; theoretical raised coverage is headrail allowance plus one fold depth. Hardware can create a small extra stack offset.

For drop H, allowance A, n rods: `d = (H-A)/(2n+1)`. Rods measured from the bottom are `d, 3d, 5d, ...`. The 140 cm / 7 cm example selects n=3, d=19 cm, rods at 45, 83 and 121 cm from the top. Raised coverage is 26 cm before construction effects.

## Cascade layout

- [Roman Blind Wizard explanation](https://www.romanblind-wizard.co.uk/Home/HowTo): folds increase towards the bottom by the cascade increment.
- [Sew Helpful cascade calculator](https://www.sew-helpful.com/cascading_blind_calculator.php), independently operated in the browser with drop 140, headrail 7, bottom flap extension 2, cascade increment 2, cascade sections 2 (three rods). Output: top fold 16.4 cm, compensated actual headrail 7.2 cm, raised coverage 29.6 cm; rods from bottom 22.4, 63.2 and 100 cm.

Our unrounded derivation preserves the owner's exact 7 cm headrail: full loop depths are `d, d+c, ... d+(n-1)c`, followed by bottom half-section `d+nc`. Thus `H-A = (2n+1)d + n²c`. With n=3 and c=2 cm, d=16.428571 cm, bottom half=22.428571 cm and raised coverage=29.428571 cm. The small difference from the calculator is its rounding and headrail compensation. The 15–20 cm target applies to the top fold; lower cascade folds grow beyond it. No additional decorative bottom extension is assumed beyond the continued 2 cm step.

Both results remain estimates pending the workroom's hardware, lining, hem and finished stack checks. No manufacturer-specific construction certification is claimed.

## Visual-only references

- User-supplied photo: subtle rod-pocket creases on the lowered face, gentle panel fullness and rounded lower return.
- [Blindtex operation demonstration](https://www.youtube.com/shorts/vbYUVKf0G5k): lower folds gather as the blind rises; upper cloth remains extended.
- [Gotain reel](https://www.instagram.com/reel/DYfBgeVxhc_/): visible horizontal seams, soft lower edge and translucent fabric. Transmission is fabric-specific and has not been copied across the catalogue.
- [Blinds By Post motorised Roman](https://www.youtube.com/shorts/wlyrP62t49M): additional user-supplied motion/detail reference.

No reference footage or supplier fabric artwork is altered or bundled into the preview. Surface relief is original procedural geometry; light/shadow detail does not change material UV calibration or the calculation's vertical endpoints.
