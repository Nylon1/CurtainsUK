# Service panels and pre-footer — 15 September 2026

Target **182310502779**, CurtainsUK New Design – Live Base, remains unpublished. Live and donor were not edited.

Only these theme files changed:
- `sections/curtainsuk-inspiration-help.liquid`
- `sections/curtainsuk-help-footer.liquid`
- `assets/curtainsuk-home-editorial.css`

The service panels use equal-width, aligned image/eyebrow/heading/copy/action rows. Measuring is now the primary support action. Fitting and the existing specialist configurator remain available. Existing explanatory text is retained, with the requested heading punctuation and CTA treatment.

Existing unique Shopify Files assets:
- `curtainsuk-modern-luxury-interior.jpg`: tall curtained windows and a complete contemporary room for window inspiration.
- `curtainsuk-layered-sheer-grey-curtains.jpg`: fitted curtain track, folds and sheer layering for measuring/fitting support.

Both use responsive Shopify image URLs, intrinsic dimensions, lazy loading and equal 4:3 crops. No images were uploaded or replaced elsewhere on the homepage.

The homepage help area is now a deliberate service strip with Measure, Fit, Samples, Advice and Privacy routes. All original URLs remain. The business address was duplicated in the two edited areas, but absent from the actual native footer: it is therefore retained once in a compact contact row in the strip. The existing `/#curtainsuk-help` anchor now points to that contact row. The underlying contact/store information remains intact.

The actual footer, footer group and other page templates remain unchanged. The old help-footer markup is preserved byte-for-byte in the non-homepage Liquid branch.

Verification:
- Desktop 1229px and mobile 390/412px passed visual review, image crops, tap targets and overflow checks.
- Desktop image tops/heights, heading starts, copy starts and CTA rows match between the two panels. CTA targets are 48–52px; service navigation targets are 80px.
- Both images loaded; neither duplicates an existing homepage image; no duplicate DOM IDs.
- Rendered upper homepage section HTML matched the captured pre-change state. Existing editorial CSS above the commercial component is unchanged.
- Measuring, fitting, samples, window inspiration, configurator and room-image privacy destinations loaded. Contact anchor navigated to the retained address/email. No purchase/order action was taken.
- All three files passed Shopify full-theme-context component validation. Whole-theme validation remained at the same 19 pre-existing findings, with no added findings.

Preview: https://www.curtainsuk.com/?preview_theme_id=182310502779
