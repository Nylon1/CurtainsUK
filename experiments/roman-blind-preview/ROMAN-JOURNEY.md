# Roman blinds journey, local preview

Prepared 6 November 2026. Do not publish without the owner's later instruction.

## Pages

- `/roman.html`: luxury landing page, supplied lounge photograph, transparent CurtainsUK logo, four poster links, fold comparison and fabric introduction.
- `/index.html`: existing 140 × 140 cm visualiser. Landing links select room view or a fold style.
- `/measure.html`: existing inside/outside measuring guide. Its final review links to shopping.
- `/install.html`: existing six-stage Evans BSXL installation guide.
- `/shop.html`: finished measurements, full live catalogue search/pagination, standard/blackout lining, stacked/cascade, saved design and server-calculated estimate.

Every page shares the same home/navigation/footer. `curtainsuk-roman-design-v1` holds choices locally. Measurement import reads the existing guide and applies no second deduction. Fabric choices collapse into a compact summary after selection. A selected fabric with a confirmed full-width square at least 140 cm wide can appear in the visualiser; narrower/missing-width images leave the shop selection intact and show an explained example in the fixed-size preview. The visualiser still illustrates ivory lining and does not resize to the ordered dimensions.

## Shared curtain commercial and availability logic

Owner instructed that Roman fabric pricing/availability follow curtains. The local API imports the existing `fabricMasterRecordById`, `fabricIsPriceEligible`, `verifiedSupplierCostMinor`, `toDecisionEngineFabric`, production pricing rule set and `dailyStockProjection`. It does not create a second catalogue, alter eligibility, write supplier evidence or switch production flags.

The same stock function handles supplier freshness, existing usage and the required metres. The Roman adapter supplies its flat fabric requirement. Stale/insufficient/unavailable stock remains distinct from a price estimate; no ordering or stock reservation is implemented here.

The catalogue uses the existing customer-safe retail endpoint with browseGuide/browseCards enabled, including all 11,815 browsable fabrics observed at verification. Six cards per local page are slices of the existing 24-card server pages. No visualiser-only catalogue filter is applied to shopping.

## Estimate calculation and limits

The unchanged production rate set is `3.0.0-production.1`. For this Roman preview:

- Flat single-blind fabric widths, without curtain fullness, pair balancing, overlap or returns.
- Existing top/hem costing allowances (15 cm + 20 cm), pattern policy and 0.1 m rounding. These are costing assumptions, not an approved Roman workroom cutting plan.
- Existing making rate £25 net per width, standard lining £4/m or blackout £6/m, target gross margin 35%, VAT 20%, nearest £1 retail rounding.
- Adds the next verified Evans BSXL 1:4 set-size headrail tier. Observed in the signed-in Evans account: 100 cm SKU 790471 £20.24 net; 140 cm 790472 £24.01; 180 cm 790473 £26.25. Sources: `https://evans-textiles.com/evaglide-1-5-4-100cm-breakaway-roman-blind-790471`, equivalent 140/180 cm product pages. Checked 6 November 2026. No promotion assumed.
- Over 180 cm wide or 350 cm drop, missing verified inputs and half-drop matches return confirmation instead of an invented price. Catalogue selection and design saving remain available.
- The headrail tier assumes workroom sizing from the stock rail. Rods/bottom-bar kits, complete assembly cost, final Roman allowances, weight/capacity checks and final supplier mechanism still require workroom confirmation. Do not treat the estimate as a payable quotation or imply every width has a final price. No checkout, order, payment, delivery promise or stock mutation occurs.

Supplier costs and credentials stay server-side. Only listed static assets are served. The core costing file, API module and integration-check script are excluded. The local host/origin checks keep the read API on the preview origin. Use the existing private environment at launch; do not copy it into source or static assets. The repository server-script loader supplies Next's server-only marker semantics for this trusted local Node process.

## Verification

- 25 geometry, motion, measurement and Roman price tests pass, including rail boundaries, missing inputs, lining changes, pattern rounding and unmodified shared rules.
- `roman-live-check.mjs` compares the API estimate and stock response directly with shared curtain supplier/stock functions for PT and SDG examples. Both agree; private input fields are absent; private module routes return 404.
- Catalogue pagination checked across an upstream page boundary; all pages use the original total. Search, selection, saved restoration, lining price update and measurement import checked in the browser.
- 139 × 140 cm Inverness example changes from £175 standard to £188 blackout; its current shared stock response is out of stock. Values are verification examples, not a stock promise.
- Tested mobile 390 px and desktop; no horizontal overflow in landing, shopping or measuring. Shared links and selected cascade/fabric visualiser entry checked. Clearing dimensions removes the previous price immediately.
- Existing supplied hero photo is copied unchanged. Original SVG diagrams form the measuring/install posters. No live Shopify/Vercel deployment or live configuration change.

## Landing imagery revision, 6 November 2026

- Room visualiser poster now uses `assets/roman-room-preview.png`, captured from the actual local lounge renderer with Inverness Caramel, stacked folds, 50% raised and the saved sage/evening room palette.
- Stacked/cascade comparison uses matching renderer captures at 100% raised in detail view, with Sabu Stripe Stone/Oak. Same camera and crop show the fold edges beneath the headrail. The obsolete slat-like CSS illustrations were removed.
- `capture=1` hides scene overlays for screenshot capture without changing geometry or camera. Room capture used a 914 x 640 scene crop; fold captures used x190/y120/600x280 at the normal desktop viewport. No AI reconstruction or altered fabric imagery.
- Comparison links use `view=detail&style=stacked|cascade&lift=100`; the visualiser validates view/style and clamps finite lift values. Normal entry stays fully lowered. Screenshot mode is not included in customer links.
- Desktop and 390px mobile checked: no horizontal overflow, all images load, no console errors. Cascade link confirmed detail view, cascade selected and 100% raised. Syntax and diff checks pass. Still local only.

## Visualiser fabric catalogue, 6 November 2026

The Roman visualiser now has a collapsible search under its featured swatches. It reads the same 11,815-fabric retail catalogue as Shop now, six results per page. It fetches exact fabric details on selection because catalogue browse cards omit full width. A selected fabric is saved in the shared design state and follows into Shop now; returning to the visualiser restores it.

The fixed 140 cm window previews a catalogue fabric only when the verified width is at least 140 cm, its image loads from the CurtainsUK Shopify CDN and the source photograph is square within 5%. Texture UVs use the recorded physical width. An unsuitable or unavailable image leaves the last valid blind in place and explains why; the fabric remains selectable in Shop now. Three featured local swatches remain quick choices.

Checked Acies Peacock (140 cm) in room view, persistence after reload and the handoff to Shop now. Abeja Blush (138 cm) gives the width explanation. Mobile 390 px has no horizontal overflow; desktop catalogue grid and image loading were inspected. No live publication.
