# Cushion Studio — inspection and room controls, 15 October 2026

Unpublished candidate. Approved cushion geometry, artwork placement, cutting, pricing and purchase gates are unchanged.

## Customer changes

- Front/back inspection now visibly rotates all selector shapes over 1.8 seconds, pausing briefly at the camera-relative side profile. The clock starts after mesh preparation so generation cannot consume the visible animation. Reverse and interrupted turns start from the displayed rotation. Reduced-motion users switch directly. Layout and same-face selection do not start a turn. Bolster body reverse remains one continuous wrap, not a claim of identical body faces.
- Eight upholstery colours, eight wall colours and eight floor finishes. Swatches wrap with larger keyboard/touch targets. Stone/slate options omit timber joint lines.
- Eight independent bed-cover colours, shown only for bed scenes. `colours.bedCover` is an optional arrangement property, validated as six-digit hex and retained through save/recovery/undo. Legacy designs without it retain their previous bedding. Cushion specifications and costs are unaffected.
- Supporting room furniture is authored procedurally: coffee tables, cabinets, books and a plant for sofa/armchair scenes; bedside cabinet and foot-of-bed bench for bedrooms, alongside the existing table/lamp/art. Scene props are not order items; cushions remain the shopping focus. No external model or new asset dependency was introduced.

## Verification

`npm run test:cushions`: **113/113 passed**. This includes all selector shapes, both turn directions, side pause, interruption angles, reduced-motion/no-action guards, optional bed-cover validation, legacy compatibility and durable colour recovery without changes to cushion manufacturing data. Production-style webpack build passed with build-only public Supabase placeholders.

Chrome local customer replay observed “Turning to the back” followed by “Showing the back”, with the back control pressed, and keyboard reverse turn. All six furniture settings were opened. King-bed Deep blue cover, Soft sage wall and Walnut floor survived save/reload; sofa scenes hid bedding controls. Double-bed colour keyboard selection and undo passed. At 390 × 844, document width was 375 px, swatches wrapped, and controls remained accessible. Console sweep was empty. Physical iPhone and spoken VoiceOver were not tested. Reduced-motion correctness is automated/source evidence, not an OS-setting browser replay.

Evidence: `artifacts/cushion-inspection-turn-20261015/` contains test/build logs and desktop/mobile screenshots. Screenshots show individual frames only; the local customer preview demonstrates the actual turn.

## Fabric browsing proposal

The existing candidate already searches and paginates the active shared catalogue. The proposed next enhancement is a full Browse Fabrics panel (desktop) or sheet (mobile), reusing established filters, detail/sample actions and exact fabric identities, with actions for cushion face or contrast piping. Keep recent fabrics beside the preview. This proposal has not replaced the current picker in this change.

Keep PR #201 draft. No merge, deployment, schema change, live order or purchase activation is included. Required protected checks and exact-head owner approval apply to any updated candidate.
