# Cushion Studio shape range: local review, 15 October 2026

> Updated 15 October: [flat starting specification](CUSHION_STUDIO_WORKROOM_STARTING_SPEC_20261015.md) supersedes earlier panel/allowance and pending-dispatch wording below. New 50 cm panels are proposed 53 × 53 cm with 15 mm per edge, not verified measurements. Dispatch is owner-confirmed 3–4 calendar weeks from order confirmation. Earlier review evidence remains historical.

Status: unpublished candidate. No Shopify, Vercel, database, branch publication or purchase activation.

The accepted fuller 50 cm square is frozen. Its visual source block is byte-for-byte unchanged, as are its panel dimensions, cutting and pricing rules. The new profiles are original procedural geometry; no third-party furniture or cushion model was introduced.

## Review set

[Open the complete local review gallery](../artifacts/cushion-range-20261015/index.html). Every size is shown with real catalogue plain, striped and directional artwork, alone and on a sofa or bed. Each sheet includes front, three-quarter, true side and back. The bolster also includes both end caps.

Controls: Amalfi Herb (`sdg-f1239-30`), Sabu Stripe Stone/Oak (`sdg-dstr237715`), Bird Weave Brick (`sdg-dmlf236846`). Shared nominal source placement X100/Y100 mm, filled, unpiped, unchanged lighting/camera setup within each size. Physical artwork calibration uses the previously recorded owner-confirmed full width × 1000 mm; source and supplier cutting widths remain separate. JSON capture manifests retain exact specification and calibration per view. No synthetic image generation is used.

## Proposed construction, requiring workroom confirmation

These are net curved-cloth envelopes, **not approved cut dimensions**. No new seam allowance or production rate has been assumed. A confirmed per-size seam allowance is added only when configured with that profile's workroom approval. Actual required metres also depend on matching phase, supplier width, minimums, increments and quantity.

| Shape | Finished size | Proposed net panel envelope, mm | Paired construction | Furniture |
|---|---|---|---|---|
| Standard squares | 38 / 45 / 50 / 55 / 60 cm | Existing square authority unchanged | Two matching upright panels | Two-seat sofa |
| Rectangle | 30 × 45 cm | 460.185 × 316.607 | Two matching upright panels | Two-seat sofa |
| Rectangle | 38 × 50 cm | 517.388 × 401.026 | Two matching upright panels | Two-seat sofa |
| Decorative bed square | 65 cm | 681.819 × 673.352 | Two matching upright panels | King bed |
| Decorative bed square | 70 cm | 734.268 × 725.148 | Two matching upright panels | King bed |
| Round | Ø40 cm | Ø420.201 | Two matching upright circular panels | Two-seat sofa |
| Round | Ø50 cm | Ø525.251 | Two matching upright circular panels | Two-seat sofa |
| Bolster | Ø23 × 56 cm | Body 539.300 × 722.566; ends Ø233.076 | Continuous wrap plus two matching ends | Double bed |

Rectangle/bed mapping follows measured curved surface paths. Round/cap mapping preserves radial physical cloth distance; forming a flat circle into a dome necessarily introduces circumferential easing (maximum approximately 5.05% for round, 1.34% for bolster cap). This is explicitly a proposed construction awaiting workroom confirmation, not a globally distortion-free cloth simulation. The body wrap has exact physical circumference and no invented seamless repeat. No separate reverse fabric is introduced.

Outstanding confirmations: per-size panel/closure construction and seam allowances; proposed round/bed finished dimensions; nonstandard insert compatibility and supplier costs; additional making rates; piping cord/strip/join method and allowance; physical matching-cut trial. Existing commercial/dispatch gates remain unchanged. The agreed £8 standard making and other established allowances remain settled. A missing new-shape confirmation does not invalidate an otherwise approved square quote.

## Validation

- `npm run test:cushions`: **103/103 passed**, including independent geometry, per-size manufacture approval, legacy specs, malformed approval values, customer asset restrictions, quote reconciliation, furniture capacity and saved-offset collision tests.
- Full `npm test`: **637/637 passed** at the complete-suite checkpoint (102 cushion tests); the subsequent added malformed/server-rule case and final cut-gate change passed in the 103-test cushion rerun. No unrelated source changed afterward.
- `npx tsc --noEmit`: passed. Final `npm run build -- --webpack`: passed with build-only public Supabase placeholders; this was an offline production-style build, not a deployed runtime test.
- Chrome desktop: twelve sizes × three fabrics × five views, plus both bolster end views = **186 renderer captures**. Exact per-view specifications are in the adjacent manifests. Rendering reports no texture/render errors. All 186 exported PNGs pass file integrity checks; `capture-integrity.json` records their SHA-256 hashes.
- Customer browser replay: 50 cm square selection, stripe fabric, front/back/side, sofa placement, local save, saved-design recovery and undo back across recovery. Customer review shows no binding goods quote, missing dispatch notice and £4.95 VAT-inclusive delivery; secure checkout remains unavailable.
- Additional browser checks: self-piped decorative bed square and contrast-piped bolster retain the indicative piping warning; no unconfirmed strip pattern is presented as production-accurate.
- New rectangle workroom sheet: correct versioned net panel envelope, matching cut locations, separate seam-unknown and workroom approval warnings. No cutting-ready instruction is fabricated.
- Mobile-width Chrome at 390 × 844: round inspection, rectangle keyboard-activated back/side inspection and bolster ends/sofa layout; no horizontal overflow after the viewport settled (document 375 px inside 390 px viewport). This is viewport emulation, not physical iPhone testing.
- Browser console sweep: no captured error/warning entries in the review or customer test tabs. Local preview routes only; no order, paid AI, external message or production write.
- Existing square geometry is byte-for-byte protected by its regression hash. An explicit size/fabric edit now reserves the accepted visual footprint as well as construction bounds, preventing an unavailable preview at the exact source-image edge. Loading a saved design does not silently relocate its motif or rewrite its specification.

Evidence is under `artifacts/cushion-range-20261015/`: individual PNG renderer captures, original browser screenshots, exact JSON manifests, console sweep and validation logs. The full-page browser capture API timed out; the review gallery uses the complete original canvas captures and separate viewport screenshots. Physical workroom specimens, physical iPhone and spoken VoiceOver were not tested.

## Review / rollback

Run `npm run preview:cushions`, open `/cushion-studio-preview/` for the customer candidate and `/cushion-studio-preview/range-review.html` for the internal capture tool. Use `?internalReview=1` only for the retained 50 cm comparison. The customer and owner asset modes keep the review tool separate.

Review through the existing protected release workflow. Keep all Cushion Studio production/purchase flags off. No publish step is authorised here. A rollback of this local change restores the preceding local commit `746412c3b65161b62be32958bb9151dc85fae256`; do not reinterpret already saved/purchased specifications or delete shared data. Older profile-less saved designs remain supported. Future profile revisions must use a new version and immutable order evidence.
