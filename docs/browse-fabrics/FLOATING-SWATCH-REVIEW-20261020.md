# Floating swatch review

Base: protected `release/production` at `5469cd3447ffef14c1f38e673cd3ed06ac3681ef`.

Browse cards have a slight whole-card shadow, warm ivory edging around the fabric photograph, and a translucent Look closer panel with an inline expand icon. Only the image face moves: a 3 px lift and at most 1.6 degrees of mouse tilt, or a 2 px press response. The existing photograph, crop, colour, texture, pricing and destinations are retained. Keyboard focus and an open close-up strengthen the edge treatment. Browse has no saved/compare toggle, so this change does not imply a new saved state.

## Loading and interaction cost

The change adds 1,344 gzip bytes across the two existing Browse assets: 1,011 bytes of JavaScript and 333 bytes of CSS, measured against the protected base using Node gzip. It introduces no libraries, model files, images, external assets or catalogue calls. Existing image URLs, responsive sizes and lazy loading remain intact; the larger close-up still loads on request.

One delegated pointer handler serves the grid. It is enabled only for a fine mouse pointer with hover and no reduced-motion preference. A burst of pointer events schedules at most one animation frame; no frame reschedules itself. The stationary image bounds are measured on entry, and scrolling, resizing, pointer exit, presses, blur, re-rendering and motion-preference changes reset the active swatch. Only the active image receives `will-change`. Shadows are static; motion changes transform and edge opacity. The image receives no tint, filter or shine overlay.

## Verification

- Six existing filter-selection and compact-card checks passed, retaining rapid removal/reset behaviour and card identities and destinations.
- A local motion lifecycle check passed: no pointer handler in the disabled state, no work at load or on touch input, 100 pointer events coalesced into one frame and one bounds read, bounded tilt, no idle animation loop, and cleanup on scroll, catalogue re-render and reduced-motion changes.
- JavaScript syntax, Shopify validation for both changed assets, and the 576-file composed source manifest passed.
- The existing captured-catalogue preview rendered all 24 cards. Desktop and a 390 px browser viewport had readable controls; the phone content width was 375 px after the browser scrollbar, with no horizontal overflow and 44 px Look closer targets.
- The close-up opened, Escape closed it, focus returned to its original button, and the active-preview state cleared. Browser inspection showed the photographs still loaded lazily with opacity 1, no filter and no image transform. No browser errors or warnings were recorded.

The preview uses captured public catalogue data and injected response latency. These checks establish the bounded asset and interaction cost, not a new production load-time benchmark or a physical phone test. No existing protected tests or release policy were changed. The production record remains the last published release until this candidate is approved and published.
