# Square drape and inspection checkpoint

Local candidate only, 14 October 2026. Standard square sizes 38/45/50/55/60 cm only; rectangles, rounds, bolsters and decorative bed-square geometry remain unchanged. No deployment, published theme update, hosted migration, or manufacturing approval is implied.

The approved inward-bowed silhouette retains its maximum finished width/height. A 4 mm sewn corner cap softens each tip; the adjoining seam still reaches the finished dimensions. Centre depth remains 31% of finished side (155 mm for 50 cm), with fuller shoulders and subtle tension creases. A shallow perimeter fold and narrow tonal strip use the selected fabric's own coordinates; this is an unpiped sewn detail, not a decorative cord. Shadows are lighter. Sofa squares have backward lean, a modest -10 degree yaw, measured placement bounds and seat-contact compression.

The default product inspection is approximately 35 degrees from straight ahead, showing the front and shoulder together. Straight inspection remains available. Explicit front/back actions rotate for 1.8 seconds, including a short true-side dwell. Reduced-motion preference skips the animation. These controls do not change the manufacturing specification, saved pattern placement or quote. Front and back use identical upright outward artwork coordinates, never a mirrored texture.

## Physical source mapping and manufacture boundary

Source X uses the recorded full fabric width; source Y is the owner's confirmed 1000 mm. The selected nominal motif centre is retained. Each square face follows measured 3D surface arc distances from that centre, including the curved shoulder and sewn fold. Additional original-image coverage is required, rather than spreading the old 500 mm crop over a larger surface. Missing coverage withholds the artwork and exposes a placement message; it is never tiled or clamped into a stretched edge band. Fresh defaults and explicit fabric/size changes use valid bounds. Older saved square anchors remain unchanged on restore and may require an explicit placement edit.

For a 500 mm square, the final `square-drape-arc-v1` source bounds relative to the nominal top-left anchor are (-23.6088127, -7.6714043) to (523.6093800, 512.3941502) mm: a **547.2181927 x 520.0655546 mm** visible footprint. With synthetic 20 mm seam allowances, the corresponding cut panel is **587.2181927 x 560.0655546 mm**, not the older flat illustrative 540 x 540 mm. Both faces use matching expanded cuts. The test fixture requires 0.561 m raw length and orders 0.57 m with its synthetic 0.01 m increment; the owner's real 1 m minimum still applies where applicable. The `squareDrapeConfirmed` rule remains false in the local candidate. Workroom construction approval is required before binding square prices.

`geometry.d.mts` lets domain/cutting consume the same pure runtime footprint. There is no separate server approximation. The renderer is a proposed drape, not a validated fabric mechanics simulation: the numerical bound below covers the tested surface paths, not arbitrary diagonal strain or every real material's behaviour. Sofa contact deformation is an illustrative local compression and does not redefine the ordered cloth.

## Evidence and reproduction

All screenshots use 50 x 50 cm, filled, unpiped squares, nominal source anchor X=24 mm/Y=8 mm. All artwork comes solely from the calibrated original catalogue source. The reference photograph is not used as artwork. No third-party cushion model was imported.

- `square-plain-front.jpg`, `square-plain-side.jpg`, `square-plain-back.jpg`: Amalfi Herb, `sdg-f1239-30`. Side captured during the front-to-back dwell.
- `square-stripe-front.jpg`, `square-stripe-side.jpg`, `square-stripe-back.jpg`: Sabu Stripe Stone/Oak, `sdg-dstr237715`. Side captured during the same turn. The two straight faces visibly retain identical upright stripes.
- `square-refined-plain-depth.jpg`: final approximately 35 degree default inspection, Amalfi.
- `square-refined-front.jpg`, `square-refined-three-quarter.jpg`: Bird & Anemone Weave Apricot/Linen, `sdg-mind237581`, straight and final default angle.
- `square-refined-sofa.jpg`: final Amalfi square on the right of an Ink two-seat sofa, close view, -10 degree yaw and measured contact.

Start the existing local preview, choose these fabrics and size, select Unpiped, and set nominal offsets to 24/8 mm. Use Straight view then Inspect back to reproduce the side turn and matching back. Use Three-quarter view for the default-angle comparison; in Sofa layout select Two-seat sofa, Ink, The details, and Right.

`node artifacts/cushion-studio-evidence/square-arc-metrics.mjs` reproduces the quantitative audit in `square-arc-metrics.json`: full two-dimensional physical source-path distance versus independent 3D surface-path distance, in individual 2 mm bands across the outer 20 mm, both axes/ends, five cross-sections and all five standard sizes. Worst observed discrepancy is **0.7622%**; at 50 cm it is **0.1109%**. Dense seam integration avoids the earlier coarse-sampling error. Typed-array arc tables use a bounded cache. Regression tests also cover exact overall finished spans, unchanged centre depth, matching outward UVs, finite source readiness, sofa contact/bounds, explicit-only rotation and reduced-motion guards. Console warnings/errors were empty in the final Chrome review.

Earlier `square-50-*` images and `square-visual-review.md` describe the previous silhouette checkpoint. The images listed above supersede the earlier in-progress refinement captures.
