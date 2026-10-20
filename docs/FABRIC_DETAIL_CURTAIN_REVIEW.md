# Fabric detail curtain demo candidate

Base: protected `release/production` at `00c50ef2d3ad56f48e577f692ab04f43f8a0d8ce`.

This is a review candidate, not a production publication record.

## Customer experience

The canonical Fabric Detail page has a clearer purchase panel, a separate image-led Ask Jane card and one exact-fabric Wave curtain demonstration. The previous four heading illustrations are removed from this page at the owner's request. Other curtain headings remain available in the existing curtain configuration journey.

The new demonstration is a focused window view with a radiator, plant and table lamp. A simplified demonstration remote operates Open, Stop and Close. Daylight and Evening affect the presentation without changing the fabric, curtain position or order. The remote is labelled as a demonstration, not as the appearance or complete functionality of a purchased controller.

The existing full Room Visualiser remains a separate exact-fabric link. Make curtains, sample ordering, Jane, Fabric Intelligence and the optional existing Cushion Studio link keep their original identity and availability handling. The motorised track link opens Smart Track Studio and adds nothing to an order.

The stale 50% offer on this page is corrected to the owner's approved “Up to 25% off”, with T&C and prices already including the saving.

## Artwork and dimensions

The server uses the unchanged released renderer-profile resolver and manifests:

| Profile | Geometry and artwork |
| --- | --- |
| `FIXED140_SINGLE_WIDTH_V1` | Existing 140 cm pair, 70 cm finished panel per side, 120 cm drop, one approved supplier width per panel. Kept above the radiator. |
| `STANDARD` | Existing 230 cm pair, 250 cm drop and 460 cm flat-cloth mapping. Existing prepared floor-length artwork and repeat calibration are preserved. |

The manufacturer's fabric width is not overwritten with a universal 136 cm assumption. Abeja Ivory, for example, has a prepared 138 cm source. The short preview does not introduce a seam or repeat the artwork to manufacture a floor-length image. The existing standard render aliases are resolved back to the exact Fabric Master identity.

No frozen geometry, motion modules, source textures, published renderer manifests or room assets are changed. The new page imports them from their existing immutable release paths. Only the window vignette and its presentation controls are new.

The preview explicitly remains illustrative. It does not approve radiator clearances, installation dimensions, exact stack-back or motor load.

## Loading and accessibility

- Only the lightweight page controls, CSS and availability check run initially. The 3D iframe starts near the demonstration.
- Only the selected fabric render, its renderer modules and one existing garden image load. No full room packs or second catalogue browser load.
- Frames render while moving, on resizing or on lighting changes. Motion stops when the demonstration leaves view or its tab becomes hidden.
- Remote controls are labelled native buttons outside the canvas. Reduced-motion preference makes travel immediate.
- Parent/iframe messages require the exact origin, frame and fabric identity.
- A failed preview keeps the fabric image, purchase links and configuration intact. Retry creates a fresh frame for the same fabric.
- Mobile uses a horizontal remote below the image and ordinary page scrolling.

## Verification

- 26 focused fabric-detail, identity/availability and theme tests passed.
- TypeScript check passed.
- Seven changed theme files passed Shopify's Liquid/theme validator.
- Candidate composition verifies 579 theme files against its manifest.
- Browser checked Abeja Ivory (`sdg-f1325-02`) as the short single-width render and Greenery Willow (`pt-4049-629`) as a patterned floor-length render.
- Browser checked open, stop partway, resume, reverse, lighting changes and a genuine failed-preview/retry cycle.
- Mobile checked at 390 × 844 with no horizontal overflow; desktop proof captured at 1280 × 1000. No browser error or warning was observed in the completed render checks.
- Stored theme settings and all existing released runtime files/manifests have no diff.

Local review URLs while the review server is running:

- `http://127.0.0.1:55894/pages/fabric/sdg-f1325-02-abeja-ivory#cuk-curtain-demo`
- `http://127.0.0.1:55894/pages/fabric/pt-4049-629-greenery-willow#cuk-curtain-demo`

The local review is not a Shopify checkout environment and does not place orders.

## Publication scope

This candidate needs both the existing Vercel service and the scoped Shopify theme update. The optional `embed=fabric-profile` document is included in Next.js file tracing; ordinary Room Visualiser requests still return the original document. No new service, database migration or feature flag is required.

Before publication, complete the existing exact-head owner approval and protected checks, merge through the existing release process, and deploy the API build with all released environment settings preserved, including `CURTAINSUK_BUILD_SOURCE_COMMIT` for Jane. Verify the embedded document before pushing the scoped theme files. Then perform live feature checks, full theme readback and update `docs/PRODUCTION_SURFACES.md` with the actual serving commits and deployment.

The candidate manifest describes intended source composition; it is not evidence that the new files have been published to Shopify. Production's source-of-truth record remains unchanged until that scoped release is completed.
