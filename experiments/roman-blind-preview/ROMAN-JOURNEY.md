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
- Standard Roman cutting allowances of 10 cm total side seams and 25 cm total top/hem, with the existing pattern policy and 0.1 m rounding. See the 6 November allowance decision below.
- Existing making rate £25 net per width, standard lining £4/m or blackout £6/m, target gross margin 35%, VAT 20%, nearest £1 retail rounding.
- Adds the next verified Evans BSXL 1:4 set-size headrail tier. Observed in the signed-in Evans account: 100 cm SKU 790471 £20.24 net; 140 cm 790472 £24.01; 180 cm 790473 £26.25. Sources: `https://evans-textiles.com/evaglide-1-5-4-100cm-breakaway-roman-blind-790471`, equivalent 140/180 cm product pages. Checked 6 November 2026. No promotion assumed.
- The Evans 1:4 set-size range is listed to 300 cm. Above 180 cm, trade prices for the 250/300 cm tiers are not yet recorded and return confirmation. Above 300 cm returns a custom quote. Drops above 350 cm, missing verified inputs and half-drop matches also return confirmation. Catalogue selection and design saving remain available.
- Owner confirmed the priced Evans set-size SKU is supplied as a full kit. Evans separately lists component rods/bottom bars for customers purchasing parts. Weight/capacity still needs a fabric-specific check. No checkout, order, payment, delivery promise or stock mutation occurs.

Supplier costs and credentials stay server-side. Only listed static assets are served. The core costing file, API module and integration-check script are excluded. The local host/origin checks keep the read API on the preview origin. Use the existing private environment at launch; do not copy it into source or static assets. The repository server-script loader supplies Next's server-only marker semantics for this trusted local Node process.

## Verification

- The Roman price suite now has seven passing checks including join threshold, rail range, missing inputs, lining changes, pattern rounding and unmodified shared rules. Geometry, motion and measurement checks passed previously.
- `roman-live-check.mjs` compares the API estimate and stock response directly with shared curtain supplier/stock functions for PT and SDG examples. Both agree; private input fields are absent; private module routes return 404.
- Catalogue pagination checked across an upstream page boundary; all pages use the original total. Search, selection, saved restoration, lining price update and measurement import checked in the browser.
- Earlier prices predate the standard Roman cutting allowances and must not be reused. The live UI recalculates from the latest rule. Verification examples are not stock promises.
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

## Roman cutting and Evans range check, 6 November 2026

Owner approved standard allowances, fabric joins when the required cut width exceeds usable fabric width, and a complete Evans kit as the intended CurtainsUK supply. The estimate now uses a 10 cm total side-seam allowance and 25 cm total top/hem allowance for fabric and lining, based on the British Institute of Interior Design / Studio 12 fabric calculation guide (https://biid.org.uk/sites/default/files/How%20to%20Survey%20Windows%20and%20Calculate%20Fabric.pdf, p. 5). Thus a 140 cm finished blind requires 150 cm cut width and two widths of 142 cm usable fabric. Pattern allowances, shared fabric cost, lining rates, labour, margin and VAT remain unchanged.

Evans publicly lists 1:4 breakaway set-size rails up to 300 cm, SKU 790475, rated 10 kg (https://evans-textiles.com/evaglide-1-5-4-300cm-breakaway-set-size-roman-blin-790475). Widths above 300 cm return a custom-quote message. The 250 and 300 cm tiers remain price-to-confirm because their trade costs are not recorded. The 350 cm drop review limit remains a local guard; no published maximum drop for this exact kit was found.

Evans also sells bottom bars and rods separately, including SKU 790482 for 140 cm (https://evans-textiles.com/evaglide-140cm-roman-blind-bottom-bars-1-rods-kit-790482). Owner clarified these are individual replacement/DIY parts and confirmed the CurtainsUK price includes the full Evans kit. The UI now says so. The estimate label remains for stock, workroom review and delivery; no checkout is enabled.
