# Independent browser review — in progress

Observed 14 October 2026 in Codex browser at the unpublished loopback preview, port 4357. This is a development review, not release acceptance. No Shopify or Vercel publication, paid checkout, physical iPhone or spoken VoiceOver test occurred.

## Checks observed

- Separate cushion configurator and sofa layout views; configuring Bird Weave Brick at 50 cm with offsets 300 mm across / 120 mm down, then adding to the layout, retains the product configuration.
- Front/back directional artwork visually inspected, upright with matching motif placement. Screenshots `configurator-directional-front.jpg` and `configurator-directional-back.jpg` record this state; this does not independently confirm supplier repeats or actual cutting.
- Save and return list worked locally. Restored cushion 2 retained 50 cm, Bird Weave Brick, and 300 / 120 mm offsets.
- Expanded cutting panel showed distinct 540 × 540 mm pieces at (280,560) and (280,1480), 2.02 m provisional requirement, and unresolved construction/commercial inputs. The 20 mm seam is expressly unconfirmed.
- Full collection loaded additional fabrics and displayed 11,815 available. Selecting Abeja Blush outside the four evidence examples loaded a calibrated 138 cm × 100 cm preview. Missing match metadata remains an explicit quotation blocker.
- Double-bed scene visibly includes sleeping pillows behind decorative products.
- Browser viewport override 390 × 844: document client width and scroll width both 375 px, with no horizontal overflow observed. Screenshot `mobile-bed-layout-390x844.jpg`. This is responsive browser evidence only, not device/touch verification.
- Browser console error log was empty during the initial configurator/layout checks.
- Bolster selection displays the continuous cylindrical body and separate end-cap placement controls.

## Findings sent to implementation lead

- Mobile compare control loses its accessible text and reads only a symbol; keep an explicit accessible label.
- Stage navigation disappears at mobile size; preserve access to both steps.
- Clear or label stale cutting evidence while a changed product is awaiting its new quote.
- Correct legacy “usable width” prose to the current supplier Full Width policy.
- Bolster needs an end inspection view and appropriate body/end terminology.
- Bed scene needs visible explanation that sleeping pillows are scene elements, not products in the order.
- Landing, guides, presets, reset, workroom export, customer-safe production integration and full checkout reconciliation require later verification; their absence from this initial review is not a pass.

Files are evolving during implementation. Recheck affected findings after the implementation lead confirms fixes, and distinguish this initial evidence from final acceptance.

## Final-candidate independent checks

After the implementation lead restarted the current preview on port 4357, the primary reviewer repeated the following browser checks on 14 October 2026:

- Separate configurator and layout navigation works. All four landing starts are present.
- Bird Weave Brick, 50 cm square, 300 mm across / 120 mm down: front and back show the same upright, unmirrored motif. `final-directional-front.jpg` and `final-directional-back.jpg` record the two views.
- The workroom sheet retains those exact coordinates and identifies separate 540 mm cuts at (280,560) and (280,1480), with the planning-only construction warning. Four other plain pieces share a separate fabric cutting plan, rather than multiplying a universal consumption allowance.
- Contrast piping selects a separate real fabric identity and explicitly states that its current appearance is a colour sample pending strip construction. This is not evidence of approved piping manufacture.
- Bolster has body/reverse and two end-cap inspection views. The first end was visually inspected with the directional fabric; `final-bolster-end.jpg` records this view.
- Three-seat sofa balanced preset generates three pieces resting on the seat; close and wider views work. Armchair capacity visibly keeps overflow pieces in an unplaced tray instead of overlapping them.
- Double-bed scene shows sleeping pillows as props with a visible exclusion from the order. Furniture dimensions remain illustrative, not a measured fit guarantee.
- At 390 × 844 browser viewport, document client width and scroll width are both 375 px. Keyboard ArrowRight on the scene changes the selected guided position from Left to Centre.
- Review lists three exact sizes, selected fabric, contrast finish, filling and shared face offsets. With incomplete commercial/manufacturing data, it offers saving and does not invent a selling price or permit checkout.
- The local Sample action gives an exact Bird Weave fabric-profile link when the authenticated sample service is unavailable. The live sample cart handoff was not executed.
- No browser console errors were recorded in these checks.

Final review found a persistent sample-action toast and missing selected-state semantics for guided positions; these were reported for correction. Additional corner/bed/coordination/piping guides were also requested before scope handover. Later validation records should identify their final results.

The last reload includes nine real-fabric pairing guides, including corner-sofa, double-bed, king-bed, matching, coordination and piping advice. Opening the corner guide produced four pieces in the corner scene; the double-bed guide produced its three-piece arrangement. Guided Left/Centre/Right now expose their selected state in the accessibility tree. Both workflow steps remain visibly accessible at 390 × 844. The UI worker also added a dismiss control for linked-action toasts; that correction is recorded separately from the earlier finding.

The hosted migration, authenticated ownership, actual supplier-price access, real Shopify tax reconciliation and paid lifecycle remain deployment rehearsals to perform before activation. Automated adapters and local browser checks are not substitutes for those checks. No physical iPhone, mobile Safari device, spoken VoiceOver or paid order was tested.
