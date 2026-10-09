The homepage now makes the approved Room Visualiser part of a clearer curtain-shopping journey. A larger editorial hero leads to fabric discovery, while genuine room captures let customers switch between Living Room, Bedroom, Lounge and Office and compare Daylight/Evening previews before opening the selected room with the same fabric. An interactive heading selector and a choose/sample/make sequence connect inspiration to the existing buying routes.

The refinement adds warm ivory/deep green presentation, an image-first mobile opening, larger heading studies, keyboard/touch controls, reduced-motion support and resilient image loading. Eight room captures total 249 KB; the 5.3 KB controller starts no WebGL renderer, GLB, catalogue request or visualiser iframe on the homepage. Existing commerce, saved rooms, fabric identities and all curtain rendering/scale logic are preserved.

## Review

[Open the unpublished Shopify preview](https://www.curtainsuk.com/?preview_theme_id=182466478459&homepage_review=09abc566) · [Review and evidence](https://github.com/Nylon1/CurtainsUK/blob/feat/homepage-visual-tools-20261009/docs/homepage-studio-review-20261009.md)

Existing draft theme `182466478459` remains unpublished. No live theme, Vercel runtime, catalogue, pricing or checkout changes were made. Keep this PR in draft for visual approval; do not publish the draft theme wholesale.

## Validation

- 18 existing Shopify-theme tests passed. Official Shopify Theme Check: zero errors and no findings in changed files; existing unrelated warnings remain.
- 320, 390, 412, 768 and 1440 px Chromium checks: all eight room/lighting combinations, four headings, keyboard navigation, images, one H1, no overflow, mobile tap targets, reduced motion and JavaScript-disabled links passed.
- Mobile menu, image failure/retry, rapid switching, actual selected-room/fabric handoff and six shopping/help destination reads passed. No purchase or payment was made.
- All 18 scoped draft theme files match source checksums. Live theme role and homepage/locale checksums remain unchanged.
- Saved desktop/mobile screenshots and before/after gallery. Physical iPhone Safari acceptance remains outstanding; responsive Chromium is not a physical-device result.

After owner review and both protected checks, a separately authorized theme release must use only the scoped files from the exact protected source, with a fresh live-file comparison. No Vercel release is required.
