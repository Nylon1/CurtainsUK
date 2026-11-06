# Roman measuring guide (local draft)

User direction on 6 November 2026: keep the Roman visualiser and linked guide unpublished. Use pictures now, with video possible later. No production, Shopify, Vercel or feature-switch changes are part of this revision.

Local URL: http://127.0.0.1:4318/measure.html

Five stages: fit, space, width, drop, review. Inside and outside recess have separate saved measurements and checklists. Original annotated SVG pictures show each action. The media figure can later hold a video without changing the measuring flow. Navigation works in both directions and stages can be linked, for example `measure.html#outside-width`. Links do not include the customer's measurements.

Values are centimetres to one decimal place. Inside recess records the smallest of three width and three drop readings as the original recess dimensions. The final review asks Tight fit or Loose fit, then deducts the owner-approved **5 mm or 10 mm total width**, respectively, exactly once. The drop is unchanged. No final width is shown before a choice is made. Outside width adds only the supplied opening and chosen left/right overlaps; drop is measured directly from the planned headrail top to the lowered hem. No extra 7 cm headrail allowance is added. Blank values are not zero. Each fit is saved locally in this browser; there is no transmission, quote, order or automatic resize of the fixed 140 × 140 cm visualiser.

## Approved fit preference

Owner approved the recommended 5 mm total width deduction for Tight fit and 10 mm for Loose fit on 6 November 2026. Drop remains unchanged; no deduction applies outside the recess. The final choice has original comparison diagrams, no preselection, local persistence and a printed summary row. Original readings are retained separately from the calculated blind size. Minimum bracket depth, fixing clearances and stack requirements must still match the chosen hardware. Publication remains explicitly on hold.

## References checked 6 November 2026

- Dunelm: https://www.dunelm.com/info/buying-guides/how-to-measure-for-window-blinds (metal tape, three width readings, three drop readings, outside overlap). Roller-specific deductions are not applicable here.
- Blinds2go Roman measuring guide: https://www.blinds-2go.co.uk/content/instructions/b2g-measuring-guide-roman.pdf (inside readings and smallest dimensions, obstructions, outside finished dimensions). Its hardware dimensions are supplier-specific. The subsequently approved CurtainsUK deductions are recorded above.

Text and drawings are original. Outside overlap is a customer choice to be checked against their window, rather than a hidden default. The room and diagram are illustrative, not a site survey.

## Verification

- All 17 geometry, motion and measurement tests pass.
- Browser: inside record 139.8 × 140.2 cm from six unequal readings; outside record 149.6 × 160 cm from 140.2 + 5.1 + 4.3 cm and direct drop. Checks, blank-field validation, separate fit state, reload persistence, stage links and return links verified.
- Desktop and 390 px mobile visuals inspected, mobile document has no horizontal overflow. No browser console errors observed. Test measurements cleared after verification.
- Print stylesheet and print action implemented. The embedded browser's print action timed out while invoking the native print UI; PDF output has not been visually verified. Escape returned to the working guide. Check native browser print preview before public release.

Run: `node --test experiments/roman-blind-preview/measure-plan.test.mjs experiments/roman-blind-preview/geometry.test.mjs experiments/roman-blind-preview/motion.test.mjs`

### Fit-choice revision checks

Seven measurement tests pass, including both approved deductions, incomplete measurements, invalid/absent choices, nonpositive finished widths and no carry-over deduction for outside recess. Browser checked a 140 cm recess yielding 139.5 cm (Tight) or 139 cm (Loose), with a 140 cm drop unchanged. Choice and readings survive reload.

Comparison sources reviewed before the owner approval: [247 Blinds](https://www.247blinds.co.uk/measuring-guide) lists 5 mm width / 0 mm drop for Roman blinds; [Blinds2go](https://content.blinds-2go.co.uk/content/instructions/Measuring-for-Roman-blinds.pdf) specifies 10 mm width; [Emerald](https://emeraldblindsandcurtains.co.uk/measurement-guide/roman-blinds/) specifies 10 mm width / no drop deduction. These are examples of different supplier conventions, not a universal construction standard.
