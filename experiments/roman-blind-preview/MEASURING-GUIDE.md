# Roman measuring guide (local draft)

User direction on 6 November 2026: keep the Roman visualiser and linked guide unpublished. Use pictures now, with video possible later. No production, Shopify, Vercel or feature-switch changes are part of this revision.

Local URL: http://127.0.0.1:4318/measure.html

Five stages: fit, space, width, drop, review. Inside and outside recess have separate saved measurements and checklists. Original annotated SVG pictures show each action. The media figure can later hold a video without changing the measuring flow. Navigation works in both directions and stages can be linked, for example `measure.html#outside-width`. Links do not include the customer's measurements.

Values are centimetres to one decimal place. Inside recess records the smallest of three width and three drop readings with **no deduction**. Outside width adds only the supplied opening and chosen left/right overlaps; drop is measured directly from the planned headrail top to the lowered hem. No extra 7 cm headrail allowance is added. Blank values are not zero. Each fit is saved locally in this browser; there is no transmission, quote, order or automatic resize of the fixed 140 × 140 cm visualiser.

## Construction decision still required before publication

CurtainsUK's workroom must confirm its recess fitting allowance and order-size convention. The draft clearly calls inside measurements a recess record, not a production size. Minimum bracket depth, fixing clearances and stack requirements must match the chosen hardware. No other supplier's deductions or minimum depths have been adopted.

## References checked 6 November 2026

- Dunelm: https://www.dunelm.com/info/buying-guides/how-to-measure-for-window-blinds (metal tape, three width readings, three drop readings, outside overlap). Roller-specific deductions are not applicable here.
- Blinds2go Roman measuring guide: https://www.blinds-2go.co.uk/content/instructions/b2g-measuring-guide-roman.pdf (inside readings and smallest dimensions, obstructions, outside finished dimensions). Its automatic deductions and stated hardware dimensions are supplier-specific and are not CurtainsUK policy.

Text and drawings are original. Outside overlap is a customer choice to be checked against their window, rather than a hidden default. The room and diagram are illustrative, not a site survey.

## Verification

- All 17 geometry, motion and measurement tests pass.
- Browser: inside record 139.8 × 140.2 cm from six unequal readings; outside record 149.6 × 160 cm from 140.2 + 5.1 + 4.3 cm and direct drop. Checks, blank-field validation, separate fit state, reload persistence, stage links and return links verified.
- Desktop and 390 px mobile visuals inspected, mobile document has no horizontal overflow. No browser console errors observed. Test measurements cleared after verification.
- Print stylesheet and print action implemented. The embedded browser's print action timed out while invoking the native print UI; PDF output has not been visually verified. Escape returned to the working guide. Check native browser print preview before public release.

Run: `node --test experiments/roman-blind-preview/measure-plan.test.mjs experiments/roman-blind-preview/geometry.test.mjs experiments/roman-blind-preview/motion.test.mjs`
