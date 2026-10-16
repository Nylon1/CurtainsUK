# Round cushion visual refinement — 15 October 2026

Status: local unpublished candidate. No Shopify, Vercel, database, remote branch, purchase or workroom approval change.

[Original/updated comparison](../artifacts/cushion-round-realism-20261015/index.html) covers both 40 and 50 cm rounds with plain Amalfi Herb, Sabu Stripe Stone/Oak and directional Bird Weave Brick. Each includes front, three-quarter, true side, back and sofa views. Exact versioned specifications and artwork calibrations accompany all 60 captures.

The round preview now has broader filled shoulders tapering to a thin seam, short irregular tension creases and a slightly drawn-in perimeter between the cardinal diameter points. A 45-degree three-quarter camera makes the depth clearer. The existing furniture lean and seat compression remain in use. Original and updated comparisons use identical cameras, lighting, fabric and placement. The accepted fuller square is unchanged.

This is a visual fill alternative, not a revised manufacturing specification. Existing versioned circular panel geometry, cutting footprints, seam-allowance gates, centre-depth authority, prices and workroom instructions remain unchanged. The front and back use the same upright artwork coordinates; back geometry is reversed without mirroring the artwork. Both surfaces close at the same perimeter.

UV distance follows measured radial surface distance through the curved shoulder and seam. Circumferential easing is approximately 7%, bounded below 8% in the independent test: this is a visual approximation, not a globally isometric cloth simulation. The new visual source envelope is independently checked against the finite calibrated photograph. Insufficient artwork is withheld rather than stretched or tiled. Explicit size/fabric/placement edits respect both visual and construction bounds; loading an existing saved design does not silently move its motif. No increased fabric consumption or rate is inferred from visual fullness.

## Verification

- Cushion suite: **109/109 passed**, including six new independent round visual regressions: frozen construction source, diameter, front/back seam closure and upright UV equality, physical radial scale near the seam, bounded circumferential easing, finite artwork bounds and furniture support.
- Production-style `npm run build -- --webpack`: passed using build-only public Supabase placeholders; no deployment or live commerce test.
- Chrome local renderer: **60 captures** (two sizes × three fabrics × five views × original/updated). Each completed without reported texture/render errors; browser console evidence is retained separately.
- Existing square regression remains part of the passing cushion suite. Physical workroom specimens, physical iPhone and spoken VoiceOver were not tested.

The customer note remains: “Visual example. Fullness, folds and colour may vary with fabric, filling and lighting.” Purchase remains gated on existing approvals. Physical manufacture, including matching cuts, must still be confirmed internally; matching every rendered crease is not an approval requirement.

## Review and rollback

Run the existing local cushion preview. The owner-only range review uses the updated round by default; `range-review.html?roundBaseline=1` retains the original for comparison. It is excluded from customer asset serving. Roll back this visual change to preceding local commit `4bd1794078f91a0e4e4f5a395d5a3d146059ccf4` through the normal review workflow if needed. Do not reinterpret purchased specifications or change production flags.
