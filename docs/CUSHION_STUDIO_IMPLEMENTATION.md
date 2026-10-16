# Cushion Studio implementation candidate

This candidate originated from protected `release/production` commit `d70a3f4ee2bca8f098a3d9acce0c2a6a5d11ed92` and is reconciled with the later protected Room Visualiser restoration through `b926c116388a176f12f618acc9297d51b0269478`. It adds a distinct cushion product domain. Existing curtain specifications, renderer eligibility, room packs, pricing and checkout remain authoritative for curtains. No Shopify page, navigation, hosted schema, public feature flag or paid action is activated by local development.

## Two separate experiences

1. **Cushion Configurator:** select the real fabric, shape, finished size, cover/filled option, edge treatment and linked artwork placement. Inspect either outward face. Front and back use the identical upright motif position, not merely the same colourway. Bolsters use one continuous body strip and two matching end caps.
2. **Cushion Layout:** add configured cushions to a newly authored two-seat sofa, three-seat sofa, corner sofa, armchair, double bed or king bed. Change furniture/wall/floor colours, position pieces with guided controls, compare arrangements, undo, save and return to individual cushion editing. Furniture and any bedding props are not sale items.

Square sizes are 38/45/50/55/60 cm; rectangles are 30×45 and 38×50 cm. Round 40/50 cm and decorative bed squares 65/70 cm are proposed workroom defaults. Bolster dimensions are Ø23×56 cm. This product does not include seating cushions, sleeping pillows or decorative trims.

## Run the review

```powershell
npm run preview:cushions
```

Open `http://127.0.0.1:4357/cushion-studio-preview/`. This loopback server has a separate local-only marker loader; it does not modify dependencies or weaken hosted `server-only` checks. Browser state is editable. Explicit server saves persist atomically under ignored `.cushion-studio-data/` with optimistic revisions. The local preview can show owner cost and manufacturing diagnostics. Customer responses use a strict retail-only projection.

```powershell
npm run test:cushions
node --test lib/cushion-studio/runtime/geometry.test.mjs
npx tsc --noEmit
```

Manufacturing, commerce, mixed orders, geometry, capacity and saved-revision tests are included in `npm test`. The public catalogue is read-only. Without the configured private database connection, original fabric discovery and physical preview still work, but supplier costs are deliberately unavailable. No demonstration fabric prices are invented. Arithmetic fixtures explicitly use synthetic £20/metre and other test rates.

## Source of truth and physical cloth

`domain.ts` defines the versioned manufacturing specification; `cutting.ts` creates both matching cuts and workroom instructions; `pricing.ts` costs that exact plan. Scene placement is independent of manufacturing placement. The same specification is retained in saved designs and copied into immutable ordered snapshots.

Owner clarification on 14 October 2026 establishes that **original images represent one recorded Full Width ×1000 mm**. X and Y physical extents are independent; square image pixels do not imply square physical coverage. The four first-demonstration original hashes and source records are in `config/cushion-studio-fabric-evidence.json` and `artifacts/cushion-studio-evidence/`. The full active catalogue is not restricted to these examples or to curtain-renderer eligibility. Other approved original MAIN mappings can use the same owner calibration rule.

Supplier **Full Width** is also the existing approved calculation-width policy, as documented by the project ledger and PT Standard Price correction. It retains separate provenance from image calibration even where their numeric values coincide. Missing usable-width data does not override this existing policy.

No image is assumed tileable. Placement stays within finite original coverage. Patterned cutting requires an evidenced repeat lattice, and aligns duplicate pieces through whole repeat shifts. One vertical repeat is reserved to register the photographed motif against the physical bolt; the image origin is not assumed to be the bolt start. Unknown/half-drop matching remains an explicit workroom case. Conservative circle bounding boxes avoid invented nesting savings. Piping fabric cutting requires confirmed strip width, direction and joins; indicative piping appearance is not an exact artwork claim.

The 50 cm plain example becomes two 54 cm cuts across 140 cm under the stated 20 mm seam planning allowance. This yields 0.54 **raw** metres, not a universal per-cushion allowance. The owner subsequently confirmed a **1 metre minimum cut**: the example buys 1 m. Sets are repacked by actual fabric identity; that minimum applies once to each distinct main/contrast cloth group, not to each cushion. Larger-cut increments remain unknown unless evidenced; a 1 m minimum does not mean whole-metre increments. A requirement at or below the confirmed minimum can buy that known 1 m cut; a larger requirement remains unorderable without increment evidence. Exact supplier overrides require verified terms provenance.

## Editable commercial rules

Rules are server-authored and versioned; client requests cannot set costs, margin, VAT or retail prices. A local owner can provide `.cushion-studio-data/pricing-rules.json`. The starting values are exported by `PREVIEW_PRICING_RULES`, `CUSHION_MAKING_RATE_CARD` and `CUSHION_FIXED_COSTS`.

The hosted rule source is server-only `CUSHION_STUDIO_PRICING_RULES_JSON`. Supplier minimums/increments and original-source evidence are attached to their exact Fabric Master IDs in the evidence adapter; this is not a second supplier-price list. Commercial unit costs continue to come from current approved database evidence.

Exactly one making rate is selected per piece:

| Size family | Unpiped | Self-piped | Contrast-piped | Status |
| --- | ---: | ---: | ---: | --- |
| Standard squares and rectangles | £8 | £11 | £12 | £8 approved; piping defaults proposed |
| Round 40/50; bed square 65 | £10 | £13 | £14 | Proposed workroom defaults |
| Bolster Ø23×56; bed square 70 | £12 | £15 | £16 | Proposed workroom defaults |

Making includes cutting, sewing, matching and zip fitting. Piped making rates include the proposed cord and labour allowance. Do not add a separate cord charge or a second £8 baseline. Main fabric and piping fabric metres are separate material requirements at current approved supplier net cost.

Other components are sundries £1.20, standard insert £5 when filled, packaging £1 and overhead £3 (including payment fees). Thus standard fixed cover costs are £13.20/£16.20/£17.20 and filled costs £18.20/£21.20/£22.20. These totals are checks, not additional line items. Round, bolster and large bed inserts need their own compatible supplier costs; no £5 fallback applies.

The owner selected an editable **40% starting retail margin** on 14 October 2026, superseding the earlier unset-margin candidate. Retail ex VAT is `totalCost / (1 - margin)`, rounded to the nearest penny. Current supplier costs and owner component allowances share the net VAT basis. The server imports the existing locked UK store VAT authority (20%), rather than asking for another VAT decision. VAT is rounded per Shopify quantity-one custom line and separately for delivery. Staff diagnostics retain the target and resulting margin after rounding and any explicitly configured discount. Customer delivery and supplier carriage are distinct per-order amounts. Customer projections exclude supplier costs, margin and workroom-only diagnostics.

The original synthetic no-minimum plain 50 cm filled example costs £29 net **only when 0.54 m can be purchased**: at 40%, the unrounded retail net is £48.3333…, rounded to £48.33, with £9.67 VAT and £58.00 including VAT. Under the subsequent owner-confirmed **1 m minimum**, the same illustrative £20/m fabric costs £20: filled net cost is £38.20 and retail is **£63.67 net + £12.73 VAT = £76.40**; cover-only net cost is £33.20 and retail is **£66.40 including VAT**, before separate delivery. Staff see the actual margin after penny rounding. These are arithmetic fixtures, not supplier quotes; real fabric costs still come from the existing approved database reader.

Each set member receives its attributable making/insert cost and a share of its actual fabric group's cloth cost based on cut area. Only shared cloth waste, minimums and carriage are apportioned. Largest-remainder allocation conserves pennies. The same item totals feed review, immutable snapshots and Shopify reconciliation.

## Persistence, checkout and paid manufacturing

Cushion snapshots have product type `CUSHION` and a separate schema from curtain snapshots. Checkout rereads fabric identity, approved cost, stock, rules and specification, rejects stale quote hashes, persists immutable snapshots, and uses the existing checked Shopify Draft Order transport. Tests inject a transport for a non-purchasing rehearsal; this is not evidence of a live transaction.

Mixed review resolves the existing signed retained House receipts, reruns native curtain pricing and cushion cutting, then aggregates cloth requirements for any shared fabric before a combined stock check. One explicitly approved shared delivery replaces separate delivery charges. The customer acknowledges changed curtain prices and measurements before checkout. Native curtain snapshots and cushion snapshots remain distinct. Retry reuses the original checkout group and snapshot identities.

Paid processing verifies raw-body Shopify authentication, immutable IDs/digests, quantity, currency, all goods/shipping/tax/order totals, the trusted checkout group and its completed Shopify draft-to-order link. A unique paid snapshot claim prevents a second order claiming the same manufacturing snapshot. Mixed curtain lines enter the existing native paid lifecycle in the same database transaction; cushion usage enters shared stock accounting without double-counting curtain usage. Paid events retain staff review: they do not release manufacture. An editable layout is never a manufacturing instruction for an already ordered item.

The offline migration is source only until separately reviewed and applied. Hosted design ownership uses Shopify's signed `logged_in_customer_id`; the app proxy strips cookies, so cookie-based ownership is not assumed. See [Shopify's app-proxy authentication documentation](https://shopify.dev/docs/apps/build/online-store/app-proxies/authenticate-app-proxies).

## Controlled rollout

The Shopify `page.cushion-studio.json` template and section are dormant, with `enabled:false`. Planned navigation is **Cushions & Pillows → `/pages/cushion-studio`**. Do not point customers at the page until the gated backend, source mappings, manufacturing confirmations and commercial readiness are accepted.

Implemented but not activated:

- Signed app-proxy asset/API routes, account-owned save/restore, customer-safe quotes, current sample service and Shopify cart handoff.
- Cushion and mixed review/checkout, immutable persistence, checked existing Draft Order transport and authenticated paid processing.
- Offline migration `20261014163749_cushion_studio_distinct_persistence.sql`, owner-only rules, dormant theme page and fabric-profile CTA.

All release gates default off: `CUSHION_STUDIO_HOSTED_ENABLED`, `CUSHION_STUDIO_PURCHASES_ENABLED`, `CUSHION_STUDIO_WEBHOOK_ENABLED`, `CUSHION_STUDIO_MIXED_ENABLED`. Purchases also require `CUSHION_STUDIO_COMMERCIAL_APPROVAL_REFERENCE`, existing production payment approval and production transport configuration. Mixed checkout additionally requires native Rooms release gates and `CUSHION_STUDIO_MIXED_SHIPPING_APPROVAL_REFERENCE`; it does not infer parcel suitability from cloth weight. Admin draft/order read access is needed to reconcile paid identity. The migration has **not** been applied, production credentials have not been exercised and no payment has been made.

Remaining business inputs are not fabricated: larger-cut ordering increments; supplier carriage and mixed delivery applicability; confirmed matching-cut construction, seams/closure; affected proposed higher making/size/piping approvals and piping strip construction; compatible nonstandard inserts. The approved full-catalogue suitability, £8 standard making, other standard fixed cost components, editable 40% starting margin and 1 m minimum cut are established, not blockers. Only affected configurations are ineligible for binding prices. The public-catalogue local demonstration has no private supplier cost access, so its quotations remain explicitly non-binding.

Existing evidence was checked: `docs/curtainsuk-prestigious-integration-investigation.md` explicitly leaves minimum cut increments/rounding and carriage unverified. The curtain engine's 0.1 m calculation increment is not evidence of supplier-specific cushion ordering terms. `docs/curtainsuk-single-rate-launch-shipping.md` and the current shipping policy establish one-charge ordinary curtain delivery (£12.95 UK mainland; £19.95 Highlands/Islands or Northern Ireland, including VAT), but do not approve cushion parcel or mixed-order coverage. Preserve the existing curtain SINGLE_RATE behavior; do not silently apply its charge to cushions or invent supplier terms.

The owner subsequently confirmed **£4.95 customer delivery INCLUDING VAT**, once per cushion-only order. Rules version `cushion-cost-basis-v3-owner-delivery495` stores authoritative gross `customerDeliveryGrossMinor: 495`; existing Shopify tax-inclusive allocation gives **83p VAT and 412p net**, without reconstructing a different gross from rounded net. Customer review shows this charge even while goods require review, explicitly stating it is not a complete quote. Immutable checkout evidence retains gross/net/VAT and order-level scope; paid reconciliation checks the persisted contract. Mixed orders still require independently approved shared delivery and do not add £4.95 to it.

Actual carrier expense is a separate staff-only **net** field, `carrierCostMinor`, initially unknown. It does not inflate customer delivery or product cost/margin, duplicate supplier carriage, or add a payment fee. Staff delivery contribution is 412p less actual net carrier expense and remains unknown until the expense is recorded. Unknown carrier expense does not itself block the fixed customer charge. Legacy net `carriageMinor` rules remain readable for earlier explicit configurations, but setting both net and gross authorities is rejected. No live gates are activated by these defaults.

Before activation: review/applied-schema tests, configured database/server commercial rules, affected manufacturing approvals, verified shipping/carriage, hosted account/save/return and mixed paid rehearsal, production capability checks, and physical mobile Safari verification. Deploy only the exact approved protected release HEAD following `release/README.md`; enabling a feature branch or local checkout is not a production deployment path.

Rollback after any future activation: close cushion and mixed purchase gates first; hide the native page entry/profile CTA and navigation; close the hosted preview gate if the customer surface itself is faulty. Retain immutable snapshots, paid records and the schema. Keep an authenticated paid receiver available for already-created unpaid drafts and webhook retries, or deliberately return retryable errors until a repaired receiver is deployed-never acknowledge an unrecorded payment. Revert only this candidate's source through a protected PR, rerun both required checks, and deploy the exact approved protected HEAD. Do not erase ordered specifications or restore a mutable design over an order.

Three.js and asset provenance are recorded in `lib/cushion-studio/runtime/SOURCES.md`. No unidentified MIT configurator code or third-party sofa model was adopted.


## Offline hosted customer rehearsal

The exported hosted route binds unchanged production dependencies. A server-owned factory now permits the same handler to be exercised offline with signed synthetic Shopify app-proxy requests, temporary owner-separated storage, synthetic fabric/rate evidence and a non-writing review transport. Request data cannot select or replace these dependencies.

The rehearsal checks anonymous save rejection, invalid/expired signatures, cross-origin requests, two customers using the same design ID without seeing each other's designs, revision conflicts, customer-safe ready/unready quotes, exact delivery, fresh checkout revalidation, immutable snapshots and retry identity reuse. It also verifies the default-off route invokes no authentication or persistence and forbids network calls. It exposed generic 503 responses for rejected authentication, stale checkout prices and rate limits. Those now return safe 403/409 responses or the existing 429 retry guidance; invalid/oversized input returns 400/413, while unexpected internal failures remain private 503 responses.

This proves local HTTP-handler orchestration, not hosted database/RLS behavior, live Shopify transport, rate-limit RPC operation, deployed app-proxy wiring or physical mobile Safari. Those release checks remain required. Cushion dispatch/lead-time wording must be confirmed separately before purchase activation; the curtain delivery lead time is not cushion authority, and no dispatch promise is fabricated in this candidate.


## Dispatch confirmation required for binding orders

Cushion dispatch has no assumed default and never inherits curtain lead times. Server-owned `dispatchEstimate` in the rules is nullable. A valid confirmation records `version`, `status: "confirmed"`, `minimumWorkingDays`, `maximumWorkingDays`, `startsFrom` (`order-confirmation` or `fabric-availability-confirmation`), `confirmedAt` (ISO timestamp) and `approvalReference`. Staff must provide the actual confirmed range and start event; test ranges are synthetic and are not configuration defaults.

The rules version is now `cushion-cost-basis-v4-dispatch-required`. Missing, proposed or incomplete dispatch authority leaves nonbinding design, price and mixed review exploration available, but `purchaseReady` is false and hosted customer purchase controls remain disabled. Approved-production cushion checkout and mixed execution independently reject missing confirmation before persistence or transport; browser flags cannot bypass this check. The entire dispatch rule participates in the existing quote hash, so a changed range/version/provenance requires a fresh customer review.

Customer review displays only the version, working-day range, start event and generated wording: **estimated cushion dispatch**, expressly not a guaranteed delivery date. Internal approval references and confirmation timestamps are excluded from customer quotes. Mixed review identifies this as the cushion estimate, without promising a combined delivery date. Every ordered cushion's immutable manufacturing snapshot retains the exact confirmed authority; private commercial rules retain it too. Shopify line attributes retain the customer wording and dispatch version. Subsequent edits to the live rule do not rewrite ordered evidence.

All launch gates, VAT, margin, fabric minimums and GBP4.95 customer delivery are unchanged. No confirmed dispatch estimate has been configured, so binding cushion-only and mixed purchases remain unavailable even if the broader purchase gates were accidentally opened.

## Standard-square visual refinement and 50 cm fill trial

The 38/45/50/55/60 cm squares use a sewn-cover silhouette with full finished corner spans, inward-drawn edges, a filled centre and subtle tension folds. The material mapping follows physical surface distance from the centre through the curved shoulder to the thin seam; front and back retain the same upright artwork and selected placement. On sofas and armchairs, squares lean into the backrest and seat with a bounded contact patch. The later shape-range stage below adds separate versioned construction profiles for non-square products.

For **50 cm squares only**, the owner accepted the broader-fullness variant as the default *visual* preview on 15 October 2026 and stopped further visual refinement. The baseline silhouette remains available for internal controlled comparison only (local owner preview with internalReview=1). This choice does not alter the versioned cushion specification, panel dimensions, two matching cuts, fabric calculation, making rate, insert allowance, quote or workroom instruction. The visible fullness may result from the fill and insert within the existing cover, but this has not been physically demonstrated. Matching every rendered crease is not a launch requirement. The visualiser still withholds an artwork preview if the finite recorded original cannot cover the chosen placement; it does not tile or silently change that placement. The current note beside it reads: “Visual example. Fullness, folds and colour may vary with fabric, filling and lighting.”

The [controlled visual comparison](../artifacts/cushion-studio-evidence/square-comparison-review.md) shows baseline and fuller geometry with identical fabric, placement, light and front/three-quarter/true-side cameras. The [50 cm workroom trial brief](CUSHION_STUDIO_50CM_WORKROOM_TRIAL.md) is ready to forward: plain cloth checks sound construction, stripes check edge distortion, and a directional pattern checks identical upright faces and physically matching cuts. Only documented manufacturing changes to insert, panels, cutting or making time from the trial should revise the shared versioned specification and server quote. Square purchase activation stays behind the existing workroom approvals.

This is original procedural geometry informed by the supplied form reference, not a cloth simulation or a manufacturing prediction. No reference photograph or third-party model is used as fabric artwork. All release gates remain unchanged and off.

Local verification for this visual-default change: `npm run test:cushions` passed 76/76, the full `npm test` passed, `npx tsc --noEmit` passed, and a production-style webpack build completed with placeholder public Supabase values. Browser captures show the filled 50 cm square in the configurator and resting on the two-seat sofa. No physical workroom trial, release, deployment or live purchase was performed.


## Remaining shape range: 15 October 2026 (unpublished)

All twelve selector sizes now share one size authority in `geometry.mjs`: five standard squares, two rectangles, two decorative bed squares, two rounds and the bolster. The accepted 50 cm square visual and its existing cutting/pricing authority are unchanged. New non-square selections carry `constructionProfile: "shaped-filled-v1"` inside the version-1 cushion specification. The parser, saved design, quote hash and immutable fulfilment snapshot preserve this value. Existing saved specifications without it retain their original construction; they are not silently reinterpreted.

Rectangles and bed squares have independent softly filled paired surfaces, rounded sewn corners, thin seams and measured cloth paths. Rounds have two shallow domed circular panels. The bolster has an exact-scale continuous cylinder wrap and two identical upright domed circular ends. Its cap rise forms part of the finished 560 mm overall length. Opposite body views necessarily show different parts of one wrap; the end panels match. Source bounds include the curved cloth extents, with no finite-image extension or seamless tiling assumption. Arrangement positions account for each shape's own depth, lean, rotation and bounded seat contact. Saved offsets cannot cause accepted cushion bounding volumes to overlap.

The new profiles are **manufacturing proposals**, not approved patterns. `construction.shapedConstructionBySize[sizeId]` must contain the exact profile version, a finite per-edge seam allowance, boolean `confirmed: true` and a nonempty approval reference before that size becomes binding. Missing allowances produce explicitly labelled **net envelopes only: do not cut**. They never borrow the standard-square allowance. Proposed round/bed dimensions, additional making/piping rates, compatible nonstandard inserts, commercial evidence and dispatch retain their independent gates. Confirming one size does not approve another. The global existing standard-square construction rules and rates are unchanged.

The customer preview note is: “Visual example. Fullness, folds and colour may vary with fabric, filling and lighting.” The 50 cm fill comparison requires both local owner review and `?internalReview=1`; it is not shown in the normal customer journey. Matching every rendered crease is not an acceptance condition. The workroom trial remains an internal manufacturing control.

`range-review.html` is an owner-only local review tool using the actual customer renderer. It captures plain, striped and directional fabrics across front, three-quarter, true-side, back and furniture views for each size, with both end views for the bolster. Customer asset configuration rejects this page and its script. See [range review and validation](CUSHION_STUDIO_SHAPE_RANGE_REVIEW_20261015.md). No publication or gate change is included.

## Round visual fill: 15 October 2026 (unpublished)

The 40 and 50 cm round previews now use broader filled shoulders, subtle seam creases and a softer perimeter, with a more revealing three-quarter camera. This supersedes only the round visual appearance above. Manufacturing profiles, net cutting envelopes, prices, gates and the accepted square remain unchanged. Radial artwork distance is calibrated through the surface; finite-photo bounds are checked separately for the new visual envelope. See the [matched original/updated review and 109-test validation](CUSHION_STUDIO_ROUND_PREVIEW_REVIEW_20261015.md), including the explicit circumferential easing limitation. No physical workroom result is claimed.

The subsequent [soft-cover review](CUSHION_STUDIO_ROUND_SOFT_COVER_REVIEW_20261015.md) supersedes that round visual with a deeper convex fill, broader contact and corrected round lighting. It introduces separate visual furniture clearance while preserving manufacturing/cost authority. The cushion suite passes 110 tests. Neither round review changes the accepted square or production gates.

Owner confirmed “Assets approved” on 15 October 2026 for the round soft-cover assets at `5a1e82cdff52ee5ef4e567381704cdcb623b9df7`. These are now the accepted round visual baseline; further visual refinement requires a new request. Manufacturing, purchase activation and publication remain separately gated.

## Inspection movement and room controls: 15 October 2026

The [interaction and room review](CUSHION_STUDIO_INTERACTION_ROOM_REVIEW_20261015.md) extends visible front/back turns to every selector shape, adds eight upholstery/wall/floor options and independent bed-cover colour, and furnishes the scenes with original supporting props. Optional `colours.bedCover` belongs only to the saved arrangement; legacy designs and manufacturing remain unchanged. The approved cushion geometry is untouched. Cushion tests pass 113/113 and the production-style build passes. Full Browse Fabrics integration remains a documented proposal; existing catalogue search/pagination continue to work.

## 15 October: flat workroom proposals, dispatch and customer guidance

The [new owner starting specification](CUSHION_STUDIO_WORKROOM_STARTING_SPEC_20261015.md) supersedes earlier preview-derived cutting assumptions for new configurations. New specs explicitly select `flat-sewn-v1`; legacy saved and ordered specifications keep their previous contract. All twelve proposed panels use 15 mm per edge, independently of visual fullness. New plans use verified usable cutting width where supplied, and missing width remains provisional. Standard £8 making and fixed allowances remain settled; inserts require compatible supplier evidence for new filled configurations. Piping 4 mm cord / 40 mm strips are unconfirmed proposals; bias yield is not assumed.

Owner dispatch is now 3-4 calendar weeks after order confirmation. Missing or malformed dispatch still prevents checkout, and confirmed dispatch alone never clears workroom or commerce gates. Existing working-day snapshots retain their original units. Customer review renders the server-projected dispatch estimate.

The numbered selector now announces Editing cushion N and the room view marks the selected cushion with subtle corner brackets. A keyboard-accessible How to use Cushion Studio disclosure explains both design and arrangement steps. Customer-facing Cushion Studio text contains no em dashes. No published page, purchase gate or infrastructure was changed.

Verification: all 122 cushion tests passed; production-style webpack build passed. Local browser review verified 530 × 530 mm panels for 50 cm, 0.53 m net plain consumption, one 1 m minimum, correct weeks in customer review and gated ordering. Selection was checked for both cushions; native help disclosure worked by click and Enter. Mobile emulation at 390 × 844 had 375 px document width with no horizontal overflow. Physical iPhone and spoken VoiceOver were not tested. Screenshots and logs: `artifacts/cushion-flat-guidance-20261015`.

### Illustrated guidance and complete button polish

The owner requested visual help in place of plain instruction lists. The two stages now use sage/lilac cards, original cushion/sofa SVG illustrations, tidy headings, numbered steps and compact captions. All Cushion Studio button families now share restrained corners, consistent spacing, clear active states, 44 px minimum targets, keyboard focus, fine-pointer hover and press feedback. Disabled and reduced-motion states remain explicit. Shape, stage and camera buttons expose selected state accessibly. This is presentation only; accepted cushion geometry and manufacturing rules are unchanged.

Full regression result before this final presentation pass: 657/657. Final CSS parsing, JavaScript syntax and browser checks passed; latest captures are `help-illustrated-desktop.png`, `help-illustrated-mobile.png` and `polished-layout-buttons.png` in the same evidence folder. The separate site-wide How to use page is draft PR #205 and is not bundled into Cushion Studio.

## Fabric discovery filters, 15 October 2026

The full collection panel now offers governed colour and pattern choices and named fabric price tiers. It uses the existing Browse search and exact five guide-price IDs and boundaries, with Cushion-only presentation names: Essential (under £50), Premium (£50 to under £100), Luxury (£100 to under £150), Premium Luxury (£150 to under £250), Super Luxury (£250+). These names were used as the proposed default while optional owner naming feedback was pending. They are not Naila's four-tier policy and do not change Browse or cushion quotation rules. The customer note explicitly distinguishes fabric guides from finished cushion prices.

Filters apply on the server before pagination to the shared active catalogue. The UI retains selected fabric records separately from visible result IDs, so changing filters, empty results and clearing search preserve the configured cushion. Load-more retains filters. New searches reset pagination and invalidate older requests; failed first pages offer retry without skipping ahead. Only public facet values, labels and counts are returned. No private supplier costs or curtain-renderer eligibility restrictions are introduced.

Verification: 124/124 Cushion Studio tests passed. Production-style webpack build passed with build-only public Supabase placeholders. Browser checks in Chrome covered the full catalogue (11,815 at the time sampled), blue + stripe + Premium (156), pagination (24 to 48), zero matches and clear reset. Super Luxury returned 264. The selected Amalfi cushion remained unchanged throughout filtering. Mobile emulation at 390 × 844 had no horizontal overflow and all filter selects measured 44 px high; keyboard Tab reached Pattern from Colour. No browser console errors were observed. Physical iPhone and spoken VoiceOver were not tested. Evidence: `artifacts/cushion-fabric-filters-20261015`.

Astra reviewed the filtering contracts and identified debounce and failed-search pagination cases, both corrected before final verification. No manufacturing, geometry, pricing, approval or purchase gate changes. No production deployment or merge.
The existing square journey was also replayed after filtering: selecting Bird Weave Brick updated the cushion fabric, animated back inspection reached Showing the back, and Add to my layout opened the sofa arrangement.

## Empty filters in the existing preview, 15 October 2026

Confirmed a local preview version mismatch on port 4362: the page loaded current runtime files from disk, but its long-running Node process still used the server module from before facet support. Its catalogue response returned 11,815 fabrics with no facets. Port 4364 returned the same catalogue with five tiers and 14 colour options. This was a stale local process, not absent governed catalogue data.

Restarted only the identified Cushion Studio process on port 4362, retaining the address and existing browser design. The existing tab then loaded 14 colours, 21 patterns and five tiers. Selecting blue returned 3,187 matches; the selected Chrysanthemum Toile / Cochineal Pink bolster remained unchanged. Screenshot: `artifacts/cushion-fabric-filters-20261015/restored-4362.png`.

The local preview command now uses Node watch mode with preserved output so server imports reload when changed. Verified a restart by updating only the modification timestamp of the imported browse module, without altering its content. No customer runtime or manufacturing changes required; no production deployment or merge. Owner confirmed the five tier labels after the previous review.

Owner presentation refinement: the dropdown is now labelled Fabric tier and shows only Essential, Premium, Luxury, Premium Luxury and Super Luxury, plus All tiers. Numeric ranges are no longer shown in dropdown labels. The five authoritative Browse band IDs, boundaries and server filtering are unchanged. JavaScript syntax and whitespace checks passed; verified labels in the corrected port 4362 preview.

## Rendered pairing cushions and finish availability, 15 October 2026

Thoughtful pairings now uses actual rendered cushions instead of rounded fabric swatches. The same guide-piece builder supplies each thumbnail and its Start action, including size, accepted filled geometry, fabric identity, physical calibration, finish and normalized placement. Astra added one lazy sequential thumbnail renderer with texture readiness, a bounded cache and a fixed 70 cm camera frame so smaller cushions remain visibly smaller. The interactive visualiser's camera and geometry defaults are unchanged. Thumbnails render only as cards approach view, have no idle animation loop, reuse repeated pieces and dispose their context when leaving. An unavailable preview is labelled explicitly rather than substituting misleading artwork.

Contrast piping is removed from the finish selector, its fabric control and the proposed contrast guide. Unpiped and self-piped remain. Existing saved contrast specifications are preserved with a targeted instruction to choose another finish; server quotation blocks their binding price and checkout even with otherwise confirmed making rates. The regression verifies rejection before persistence or execution, while 32 supported pieces still retain immutable supplier references. The underlying future contrast construction and rates remain intact.

Verification: 125/125 Cushion Studio tests passed. Production-style webpack build passed with build-only public Supabase placeholders; generated local and hosted route traces include guide-thumbnails.mjs. Chrome rendered all 23 thumbnails across eight guides with no observed console errors. Desktop and 390 x 844 mobile emulation showed the filled three-quarter cushions and no horizontal overflow. The finish selector contains only Unpiped and Self-piped. Fabric tier dropdown contains only All tiers plus the five approved names. Physical iPhone and spoken VoiceOver remain unverified. Evidence: artifacts/cushion-pairings-20261015. No publication, merge or production change.
A separate localhost browser session also opened Quiet texture from its rendered card, entered Sofa layout and created two cushions. The user's original 127.0.0.1 design was not replaced during that check.

## Release-readiness fixes, 15 October 2026

The review now shows each server-allocated cushion line price, quantity where greater than one, VAT-inclusive order total and one delivery charge even when release permission is off. Set line prices use the set quotation's allocations by specification ID, not independently quoted cushion prices added together. Unready quotes do not expose stale prices. Individual review uses its standalone quotation.

Hosted `purchaseEnabled` now means global release permission only. Each chosen individual or set must separately have `purchaseReady`, including confirmed dispatch, before the customer sees a checkout action. A blocked unrelated piece no longer disables an eligible individual. An unready complete set still cannot proceed. The server independently requotes the requested specifications before persistence or execution. The main summary and mixed-review return action use the same selected-scope eligibility rule. No gate is enabled by this change.

The local preview preserves its validated localhost or 127.0.0.1 request origin rather than reconstructing localhost requests as 127.0.0.1. Host allowlisting, same-origin POST validation and loopback binding remain enforced; absolute request targets cannot escape the accepted origin. A fresh localhost browser session saved `Readiness fixes1`, reloaded, reopened it from the server list and retained both fabrics, sizes and shared placements. Only a local test design was created.

Validation: 668/668 full regression tests, including 133/133 Cushion Studio tests. Production-style webpack build with build-only public placeholders passed; both local and hosted deployment traces include `review.mjs`. The hosted regression covers release-off rejection, ready individual beside blocked set, set rejection, and missing dispatch rejection before writes. Chrome browser checks cover real local save/reopen and safe review, plus the actual review renderer with clearly labelled synthetic pricing fixtures on desktop and 390 x 844 mobile. The synthetic harness has no checkout transport. Prices in these screenshots are test data, not supplier-backed customer quotes. Mobile review has no horizontal overflow; no console warnings/errors observed on the local save/reopen page.

Evidence: `artifacts/cushion-readiness-fixes-20261015`. Hosted production account recovery, live Shopify order reconciliation, physical iPhone and spoken VoiceOver remain unverified. Manufacturing and commercial approvals remain unset. The [forwardable workroom confirmation checklist](CUSHION_STUDIO_WORKROOM_STARTING_SPEC_20261015.md#confirmation-checklist-for-the-owner-to-forward) separates the remaining acceptance records from already settled owner decisions. No production writes, deployment, merge or purchasing activation.

## Owner construction decisions, 15 October 2026

This entry supersedes the preceding blanket statement that all manufacturing approvals remain unset. Owner acceptance now covers the flat panel dimensions, 15 mm per-edge allowance and lower-seam concealed zip where practical for five standard squares, two rectangles and both bed squares. `cushion-construction-v3-owner-flat-acceptance` records these nine per-size approvals with `approvalAuthority: owner` and the dated source reference. Workroom output identifies owner acceptance explicitly and does not claim a physical trial. Historical rules without an authority label use neutral acceptance wording. Unknown authority or malformed reference fails closed.

Round 40/50 and bed 65/70 finished sizes are accepted separately. Round panel dimensions are specified but perimeter seam/zip construction remains gated. Bolster product dimensions and starting panels are retained while circular joins, closure and artwork orientation await workroom acceptance. Self-piping retains the owner-accepted 4 mm cord / approximately 40 mm strip starting specification, with cutting direction, joins and consumption still unconfirmed. Additional making amounts remain proposed pending clarification of the owner's recommendation wording; the agreed standard unpiped £8 is unchanged.

Pricing rules advance to `cushion-cost-basis-v6-owner-flat-acceptance`, invalidating stale quote hashes. Existing immutable order snapshots and legacy geometry/construction interpretations are not rewritten. Shared-fabric layouts, matching waste and the 1 m minimum per fabric group remain unchanged. Supplier increments above 1 m, supplier carriage, insert SKU/dimensions/cost records, actual outbound expense and mixed shipping arrangement/charge remain factual gaps. Verified usable width, repeats, direction, stock and governed costs remain independently required. None of these decisions enables a release or purchase flag.

Verification: 135 Cushion Studio tests pass, covering all twelve panel geometries, nine owner-accepted constructions, circular/piping/insert and supplier-data blockers, owner provenance, malformed approval rejection, shared minimum and unchanged legacy gates. TypeScript validation passed; the final construction-message refinement passed all seven focused flat-manufacturing tests and the diff check. Physical workroom trials and live checkout are not claimed.

## Owner approval of additional making rates, 15 October 2026

The owner's explicit "Approved" response resolves the preceding rate clarification. All twelve sizes now use approved complete unpiped/self-piped making charges: standard squares and rectangles £8/£11; rounds and 65 cm bed squares £10/£13; bolster and 70 cm bed square £12/£15. Piped rates include cord and labour, with piping fabric calculated separately. No second baseline or additional payment-fee allowance is added.

Default pricing rules are `cushion-cost-basis-v7-owner-making-approval`. They include the complete rate card and dated owner approval references so quote hashes and immutable rule snapshots retain the actual approved rates. Explicit staff-owned custom rules are not overwritten. Contrast rates remain proposed and contrast selection/purchase remains unavailable. Round/bolster construction, self-piping method/yield, insert evidence, supplier commercial evidence, dispatch and release gates remain independent. Purchasing is not activated by this approval.

Validation: 136/136 Cushion Studio tests and TypeScript checks passed. The new matrix verifies exact complete rates across all twelve sizes, no duplicate baseline, and unchanged circular-construction, self-piping and insert blockers. The historical proposed-rate test now supplies an explicitly unapproved custom rate rather than assuming the owner defaults remain proposed. Evidence: `artifacts/cushion-readiness-fixes-20261015/approved-making-tests.log`. No deployment, merge or live transaction.

## Round, bolster, hollowfibre and piping instructions, 15 October 2026

The latest owner instructions supersede the remaining round/bolster construction gaps above. Construction version `cushion-construction-v4-round-bolster-piping-proposal` records all twelve flat constructions as owner-accepted, without claiming a physical workroom trial. Rounds use two circular panels, 15 mm seams and a concealed perimeter zip, with no side band. The bolster uses its 590 × 752.567 mm body cut and two 260 mm circular ends, with a concealed body-seam zip. Both ends retain identical upright unmirrored placement; the body wrap is separate and continuous matching across the end joins is not promised. Accepted visual geometry, physical artwork mapping and the visual-example note are unchanged. Accepted round/bed size labels no longer say proposed.

New filled specifications retain `fillingType: hollowfibre`. The customer chooses that one filling or cover-only. Quote eligibility requires compatible supplier records identifying hollowfibre, size, dimensions and cost; the agreed £5 standard allowance is retained only for compatible standard inserts. Cover-only does not depend on insert records. Legacy saved fillings remain explicitly unspecified until the customer selects the new filling; saved and purchased specifications are not silently rewritten. Pricing rules advance to `cushion-cost-basis-v8-round-bolster-hollowfibre`.

The piping proposal records 4 mm cord, 40 mm strips and finished piped perimeter plus 300 mm per cushion. The 50 cm square therefore records 2300 mm of strip. Straight strips are proposed for squares/rectangles, including bed squares; rounds and bolster ends use a bias proposal. Straight planning reserves all shared main panels first, tries suitable rectangular remnants, then adds only the extra cloth needed. Proposed layouts remain outside charged cloth. Confirmed straight costing requires separately confirmed allowance, method, strip/cord dimensions, usable width and sufficient joining allowance. The global piping flag alone cannot bypass these checks. Bias has a gross length target only, with no invented yield or price. Exact piping artwork remains indicative because strip source registration is not established. Legacy piping without the new proposal keeps its existing contract.

The internal workroom sheet now displays the server's construction instructions and separate provisional strip coordinates/lengths. It distinguishes owner acceptance from outstanding fabrication and commercial evidence. Self-piping remains blocked; contrast remains unavailable. Existing supplier, matching, insert, dispatch, mixed-delivery and release gates remain independent. No purchasing activation, merge, deployment or external workroom communication occurred.

Validation: full regression suite 681/681, including 146 Cushion Studio tests and eight piping cases. Tests cover shared remnants without panel overlap, one minimum per fabric group, extra cloth only for shortfalls, join-budget rejection, missing usable width, bias blocking, hollowfibre compatibility, legacy preservation and unaffected cover-only configurations. Final production-style webpack build and TypeScript checks passed using build-only public Supabase placeholders. The final presentation additions passed JavaScript syntax and browser checks.

Chrome on isolated localhost:4365 verified round size labels/closure, bolster body and two end cuts, cover-only versus hollowfibre selection, the 50 cm square's provisional 2.30 m piping target, gated review, and save/reopen of `Construction hollowfibre1` with its filling retained. No console warnings/errors were observed. Only the agent's local test design was updated. Evidence: `artifacts/cushion-readiness-fixes-20261015/construction-regression.log`, `construction-build.log` and `hollowfibre-reopened.png`. Physical workroom trial, physical iPhone, spoken VoiceOver and live checkout were not tested.

## Owner-selected Dunelm insert source, 15 October 2026

Following inspection of all nine currently listed Dunelm pad products, the owner selected the Square Cotton Cushion Pad range, product 1000114896. Its product description explicitly identifies hollowfibre. Default rules advance to `cushion-cost-basis-v9-dunelm-insert-source` and retain source, observation date, advertised dimensions, gross retail price, VAT normalization and fit/SKU status in the immutable rule evidence. Existing staff-authored custom rules are not overwritten.

The 45 cm pad is an exact advertised size match with SKU 30287925: £6 gross / £5 net. This resolves that insert record only and preserves the agreed standard allowance. No physical trial is claimed. The exact advertised 70 cm pad costs £14 gross / £11.67 net, but its variant SKU was not verified, so its record remains unconfirmed and filled quotation stays blocked. The defaultSkuId in the starting URL remains 30287925 after choosing another size and must not be reused as that variant's SKU.

Other price candidates, all awaiting fit and SKU confirmation: 37 cm for the 38 cm cover £4 gross / £3.33 net; 52 cm for 50 cm £7 / £5.83; 57 cm for 55 cm £9 / £7.50; 62 cm for 60 cm £10 / £8.33; 67 cm for 65 cm £12 / £10. No automatic size substitution or oversized preview-driven filling is approved. Rectangles, rounds and the 23 × 56 cm bolster have no verified matching hollowfibre product in the nine-product listing. Cover-only quotations remain independent of these insert gaps. Provisional prices are retained for staff evidence but are not silently used in a binding quote.

Source: https://www.dunelm.com/product/cotton-cushion-pad-1000114896 (live selector and description inspected 15 October 2026). VAT-inclusive pricing and separate delivery are documented at https://www.dunelm.com/info/help/terms-and-conditions. Their terms reserve cancellation of orders intended for direct resale; ongoing business supply and order-level carriage remain to be confirmed. No order, supplier agreement, stock reservation or guaranteed availability is implied by this source choice. Customer delivery remains £4.95, margin remains 40%, dispatch remains 3-4 calendar weeks, and purchasing remains gated.

Validation: 148/148 Cushion Studio tests and TypeScript passed. The final focused insert checks also passed for individual/set costs, VAT normalization, shared fabric minimum, fit/SKU blockers and unaffected cover-only pricing. Evidence: artifacts/cushion-readiness-fixes-20261015/dunelm-inserts-tests.log and dunelm-typecheck.log. No production change, merge, deployment or purchase activation.


## Dunelm standard range revision, 15 October 2026

Exact standard cotton-pad variants are recorded in `insert-sourcing.ts` and the latest section of `CUSHION_STUDIO_WORKROOM_STARTING_SPEC_20261015.md`. This is preparation, not a completed size replacement: supplier pad-to-cover fit guidance is not established. Do not infer cover sizes or relabel polyester-only rectangle/bolster descriptions as hollowfibre. No suitable hollowfibre round pad was found. Bespoke inserts are no longer a sourcing requirement.

Speculative oversized pad pairings were removed. A Dunelm filled quote now needs versioned fit evidence for the exact finished cover dimensions. Cover-only remains independent. Original size IDs, saved dimensions and render geometry are preserved. Manufacturing and rate approvals explicitly name the original twelve IDs, preventing accidental approvals as the registry grows. Size edits explain old/new dimensions and placement adjustments and retain Undo.

Selector size replacement, guide arrangements and revised cutting panels remain pending supplier fit guidance. Update them atomically once provided, keeping pad and cover dimensions separate. No merge, publication or deployment.

## Implemented standard-insert range, 16 October 2026

The owner's explicit fit pairings now supersede the previous pending selector replacement. Active range: squares35/40/45/50/55/60, bed squares65/68, rectangles28x48 and38x58, rounds40/50, and replacement bolster diameter19 x length44 cm. Exact pad identities, prices, proposed cover/cut dimensions and scoped outstanding checks are recorded in the latest section of `CUSHION_STUDIO_WORKROOM_STARTING_SPEC_20261015.md`.

New additive `rangeVersion: standard-inserts-v1` selects current insert associations. Missing rangeVersion retains legacy source semantics, including 45 cm cover with historical 45 cm pad. Original size IDs and dimensions remain permanent. Explicit size/filling changes opt in, explain revalidation and support Undo. Saved and purchased specifications are not silently resized. The old23x56 bolster is retained only for saved compatibility. Preview geometry algorithms and the accepted50cm shape remain unchanged; the new cylinder's preview, layout bounds and UV scale derive from its190mm diameter/440mm length.

Construction v5 records new dimensions as proposals with15mm seams. Pricing v11 records actual selected pad costs separately from fit approval and exposes safe pad/cover/filling facts for each selected piece and review. Known proposed costs feed internal nonbinding estimates. Customer totals and checkout remain blocked until required evidence is present. Checkout snapshots resolve inserts through the same versioned specification. Generic polyester is allowed to match supplier-confirmed hollowfibre; an old explicit hollowfibre choice cannot silently become generic polyester.

Dunelm SKU30926140 is an actual cylindrical cotton-cased polyester pad, advertised46x20cm atGBP6. Proposed cover diameter19 x length44cm uses body470x626.903mm plus two220mm circular ends. Its compatible fit remains unverified. Willows exact Round variants supply45cm/55cm pads for40cm/50cm covers; their advertisedGBP5.99/6.99 costs are retained without inventing reclaimable VAT. General and shape-specific guidance, presets, selectors, workroom details and prices now agree.

No production changes, purchasing activation, merge or deployment.

Validation of this revision: 692/692 full regression tests passed, including157/157 Cushion Studio tests. Production-style `npm run build -- --webpack` passed, including TypeScript and170 static pages, with build-only public Supabase placeholders. The first attempt without local public Supabase build settings stopped on admin prerender; no production credential/configuration changes were made. Existing released visualiser packaging retained3150 files across2 packs. This is local build evidence, not live deployment acceptance.

Chrome local review at `http://localhost:4372/cushion-studio-preview/` verified the new bolster selector, separate pad/cover identity, 470x626.903mm body/two220mm end cuts, GBP22.20 known fixed filled cost, blocked purchase, plain/stripe rendering and sofa placement. The isolated design `Range check 20261016 cylinder` saved and reopened with its new range, dimensions and filling intact. A name-entry timing issue found during this check was corrected by recording input before asynchronous redraw and reading the field on Save. Rectangle28x48/38x58 and round40/50 selectors were checked; round40 displayed Willows45cm pad separately. No browser console errors/warnings were observed in the bounded check. The round click reported a browser-control timeout, but the subsequent live DOM confirmed the selected round and correct pad metadata. Browser automation timeout is not a customer runtime failure.

Tests additionally verify legacy45cm source association versus new47cm pad, legacy bolster dimensions, explicit migration/Undo, per-item/set price allocation, one shared1m minimum, real matching-cut repeat offsets, new cylinder bounds/end UVs, physical-scale geometry and proposed-fit gates. Astra review found a missing-evidence bypass in custom new-range insert rules; the gate now requires versioned fit evidence even when source metadata is omitted, covered by a regression assertion. Original cover-only approvals remain independent.

Evidence: `artifacts/cushion-range-20261016/regression.log`, `tests.log`, `build.log`, `typecheck.log`, `bolster-striped.png`, `bolster-sofa.png` and public sourcing JSON. No physical fit trial, physical iPhone, spoken VoiceOver or live checkout was performed. No merge, deployment or purchasing activation. Pending decisions and per-configuration blockers are in the current workroom section.


## My Home candidate review, 16 October 2026

Status: implemented and locally verified, unpublished. This section supersedes earlier mixed-delivery uncertainty. The owner approved holding the complete order and dispatching together using the latest confirmed product estimate, with one existing curtain delivery charge for curtain-containing orders or GBP 4.95 for cushion-only orders. Customer VAT labels are omitted; tax calculation and gross totals remain accurate.

### Infrastructure and journey

The candidate retains `/pages/build-my-rooms`, `curtainsuk_house_v1`, House IDs, saved room/curtain records, signed curtain retention, existing pricing and checkout contracts. My Home is the customer-facing name. Additive typed cushion items retain source design/piece identities, quantity and separate specifications. Future product families can extend the model without relabelling curtains.

Explicit Add actions add one cushion, a set or a curtain. Saved arrangements remain separate. Editing replaces the same item, preserves quantity and does not overwrite the original cushion design. Duplicate source additions are idempotent. Rooms are optional. My Home saves/reopens on this device; cross-device account order storage is not claimed.

Server review recalculates all ordered cushions together with shared fabric minimums, combined stock, one delivery and held-together dispatch. Missing or incomparable dispatch estimates block checkout. Checkout revalidates price, stock, membership and specification approvals. Retry keys retain the exact reviewed contract and reject changed membership. Curtain quantities create separate immutable fulfilment snapshots. Product manufacturing specifications remain distinct.

The existing House palette/serif headings now accompany product cards, fabric thumbnails when retained, interactive buttons, quantity steppers, focus states, a product picker and responsive summary. Customer content excludes em dashes, separate VAT breakdown and workroom instructions. Internal cutting/workroom exports remain owner-review-only. Customer blockers explain option, availability, price or dispatch confirmations without internal construction instructions.

### Verification

- Full `npm test`: 710/710 executions passed, including 174 Cushion Studio tests. This includes 18 theme tests repeated by the existing package command, so it is not a unique-test count.
- Production-style `npm run build -- --webpack`: passed, including TypeScript/prerendering. Command-local public Supabase placeholders were used. Production settings were untouched. Visualiser packaging retained 3,150 assets across two packs.
- Automated coverage: single cushions, sets, curtain-only/mixed orders, shared pricing, one delivery, missing/latest dispatch, changed stock/prices, quantity snapshots, retry identity, scoped blockers, explicit checkout confirmation, legacy saved records, revision conflicts, stable edits and optional rooms. Signed hosted-route tests verify guest nonbinding review and independent gates without hosted writes.
- Chrome localhost:4375, desktop 1440 x 900 and mobile emulation 390 x 844: single cover add, quantity repricing, edit 45 to 50 cm retaining quantity three, reopen, standard curtain live price/retained add, mixed review, optional room creation, two-cushion save/reopen, explicit set add and removal.
- Removing curtains returned delivery to GBP 4.95 and dispatch to 3-4 calendar weeks. Mixed review used synthetic curtain delivery and dispatch. Local amounts are test fixtures, not approved live offers.
- Mobile order view had no horizontal overflow; product picker focused its first link. No console errors/warnings were captured in the bounded check. Physical iPhone and spoken VoiceOver were not tested.
- Local checkout remained gated. Real Shopify checkout creation/payment, production authentication and live price reconciliation were not performed.
- External Shopify Liquid validation could not run: the toolkit lacked `@shopify/theme-check-common`. Repository theme assertions and JavaScript syntax checks passed. External Theme Check is not claimed as passed.

Evidence: `artifacts/my-home-20261016/regression-final.log`, `build-final.log`, `mixed-order-desktop.png`, `mixed-order-mobile.png`. `scripts/my-home-preview.ts` is an unpublished rehearsal with synthetic authorities, in-memory design persistence and disabled purchase execution; it refuses production execution.

### Defects corrected

The standard curtain form re-enabled hidden required corner inputs, blocking its ordinary journey. The fix has a regression test. Other fixes protect edit revisions, quantities and original cushion designs; refresh after room creation; prevent stale in-flight curtain prices; preserve retry error recovery; and defer owner-bound persistence until needed. No unresolved customer-facing defect was observed in the bounded tested flows. This is not full live acceptance.

### Remaining factual confirmations

| Confirmation | Proposed resolution | Affected configurations |
|---|---|---|
| Structured curtain dispatch authority | Record the existing approved range, units, start trigger and evidence in `CURTAINSUK_MY_HOME_CURTAIN_DISPATCH_JSON`. Never adopt the local 5-6-week fixture. | Curtain-only and mixed My Home checkout; cushion-only independent. |
| Supplier increments above 1 m and carriage | Use exact existing arrangements once per relevant shared group/order. Do not invent zero carriage. | Products using a supplier with missing required evidence. |
| Proposed new dimensions and pad fit | Confirm representative fit and revised construction. Matching every rendered crease is unnecessary. | Filled pairings; new 35/40 squares, 28 x 48 and 38 x 58 rectangles, 68 bed square and 19 x 44 bolster construction. Accepted cover-only sizes remain independent. |
| Round insert cost/VAT basis | Obtain Willows invoice/basis; do not invent a VAT deduction. | Filled rounds only. |
| Current insert stock | Revalidate exact SKUs. Earlier out-of-stock observations concerned Dunelm 57 cm square and 40 x 60 rectangle pads. | Their filled pairings, not cover-only. |
| Self-piping consumption/construction | Confirm straight/bias method, joins and usable remnants. | Self-piped configurations only. Contrast piping remains unavailable. |
| Actual carrier expense and retail insert supply | Record invoice cost and confirm ongoing supplier business supply terms. | Margin evidence and affected procurement. Customer delivery policy is already settled. |

Approved making rates/allowances, 40% margin, customer delivery policy and cushion dispatch are settled. Do not reopen them as missing decisions.

### Release and rollback

Keep the new `CURTAINSUK_MY_HOME_ENABLED` and existing purchase/release gates closed pending approval. No environment was changed. Review theme and gateway together: the new section requires its API, store and bridge assets. Follow protected `release/production` and exact-commit approval. Before release, verify actual proxy/authentication, approved delivery/dispatch, retained orders, checkout reconciliation and deployment assets in an authorised preview.

Rollback restores the previous approved House section/assets and gateway together. Merely disabling the API behind the new page is insufficient. Preserve additive local order state and immutable purchased snapshots; do not clear designs. No merge, deploy, Shopify upload, production database write, Draft Order or payment occurred.


## My Home editorial presentation revision, 16 October 2026

Owner direction: preserve My Home's shared order structure while bringing forward the original House page's generous imagery and premium presentation. This supersedes the compact list-only visual treatment in the earlier candidate review.

The candidate now reuses the original editorial hero, five room inspiration photographs, heading-study imagery, larger product specification panels, optional room grouping and room renaming. The shared order summary, explicit Add actions, existing item IDs, server pricing, one delivery and checkout restrictions remain. Unassigned pieces retain a quick direct purchase route. Fabric images are labelled as fabric details and neutral heading studies as inspiration, not fabricated renders of selected products. No new image dependency was introduced.

Verified in Chrome at 1440 x 900 and mobile emulation 390 x 844: room assignment and rename retained shared prices, curtain live price and Add retained the product in the correct room, removing another piece recalculated the combined total, and the Bedroom image opened a prefilled optional-room dialog with cancellation returning focus. Mobile had no horizontal overflow. All observed images loaded. Visible copy contained no em dashes or workroom instructions. No physical-device result is claimed.

Focused My Home store, pricing/checkout and curtain validation regression tests: 16/16 passed. JavaScript syntax passed. The prior full build/tests belong to the preceding functional candidate; this presentation revision was verified with focused tests and browser inspection. Evidence: `artifacts/my-home-20261016/editorial-regression.log`, `editorial-hero.png`, `editorial-mobile.png`. Everything remains unpublished; no production changes or checkout execution.


## Shape-specific My Home image cards, 16 October 2026

Retained the curtain heading-study image and selected-fabric inset. Cushion order cards now use the same presentation: a neutral shape-specific image plus a separate linked chosen-fabric card, Edit, Remove and Add another cushion. Images derive from the existing Cushion Studio geometry and selected size/construction profile. Neutral study artwork and placement exist only in a copied display specification. No supplier calibration, purchased artwork placement, cutting or price is replaced.

The owner requested white behind cushions. My Home studies now use a white studio backdrop with a soft transparent contact shadow. This optional renderer setting does not change the configurator's accepted geometry or default scene appearance. One lazy rendering context serves visible cards, caches results and is disposed on page exit. Unavailable rendering has a clear Edit fallback rather than endless loading. No images are stored in the order or added to fulfilment snapshots.

Verified all five families in the local browser: square50, rectangle28x48, round40, bed-square65 and bolster19x44. All rendered and the review harness verified each original specification was unchanged. The My Home square card rendered with its inset and actions. Focused order/store/asset tests passed18/18; thumbnail/shape geometry tests passed9/9; TypeScript and JS syntax passed. No console errors were observed in the shape review. Evidence: `cushion-card-tests.log`, `cushion-card-geometry.log`, `cushion-card-typecheck.log`, `cushion-card-white.png` and `cushion-shape-studies.png` under `artifacts/my-home-20261016/`.

The asset allowlist includes `my-home-thumbnails.mjs` and its existing scene/geometry/guide dependencies. Release must deploy that gateway bundle alongside the My Home theme changes. The local shape-review route is only part of the unpublished rehearsal server. No production deployment, purchase activation or order creation.

### Room product choices and curtain fabric cards, 16 October 2026

- Creating an optional room now opens a room-named choice of Add curtains or Add cushions. Existing room headers also offer Add a product. Both destinations carry room context; no product enters the order until its explicit Add action.
- Cushion sets inherit the target room on first addition. Repeated additions and edits preserve existing item identities and room assignments, including an intentionally unassigned item. Missing room references fail without writing partial state.
- Curtain cards now include Add another curtain alongside Edit and Remove, keeping the selected room and fabric. Cushion add-another controls also retain room context.
- My Home receives current customer-safe curtain fabric metadata through the existing server review. This restores missing photographs on older saved entries without modifying signed manufacturing records. Image-only changes do not change the financial review identity. Failed images retain a named, linked fabric card.
- Local review uses the registered pt-4269-147 artwork from the approved Fixed 140 asset URL because the historical supplier image URL returns 403. This preview override does not change production catalogue records.
- Validation: 21 focused tests passed, including mixed totals/retries, room-targeted sets, duplicate/edit preservation and photo refresh without price/review changes. TypeScript check passed. Browser verification confirmed new-room choices and a cushion assigned to the new Bedroom review room. No publication, deployment, Shopify writes or payment.

### Final room and Add controls decision, 16 October 2026

- Add curtains, including Add another curtain, opens the existing Browse Fabrics destination first. The existing room-intent bridge retains the selected room through fabric discovery to Make Curtains. Edit continues to reopen the existing configured item.
- Remove room removes that room and all its curtain/cushion order items from My Home and checkout. The confirmation states the item count and effect. Other rooms and separate saved designs remain intact. This supersedes the interim suggestion to leave removed-room items unassigned.
- Remove item removes just that item. Both actions invalidate the review and recalculate the actual remaining order, including shared fabric requirements, dispatch and delivery. Empty orders cannot check out. Concurrent stale room deletion is rejected.
- 22 focused checks passed. Added coverage verifies mixed-room removal, remaining item preservation, checkout payload exclusion, save/reopen and empty-order removal. Local Browse uses production browser JS with one synthetic fixture, not a claim of live full-catalogue validation.
- Browser follow-through confirmed Add another curtain -> Browse Fabrics -> View Fabric -> Make Curtains -> live fixture price review retains Living room review as the selected room. No curtain was added during this check. Registered curtain fabric image loaded successfully. Empty-room removal and its confirmation were exercised only on a disposable local room.

## Final My Home local acceptance, 16 October 2026

The consolidated current verdict, evidence and configuration-specific blockers are in [Cushion Studio and My Home release readiness](CUSHION_STUDIO_MY_HOME_RELEASE_READINESS_20261016.md). It supersedes earlier local test counts: 713 successful executions, including 177 cushion tests, plus a successful production-style build. Final browser acceptance covered actual Add/edit/save/reopen/remove actions, individual/set totals, one delivery, combined dispatch and empty-order checkout protection in an isolated local fixture session.

The generated deployment manifests initially omitted the raw cushion geometry module. Explicit tracing and a new postbuild guard now verify 14 required runtime/vendor files on each cushion route. Existing room visualiser packaging still retains 3,150 files. Empty-order wording and zero totals were also corrected. No production changes or release activation occurred.

## Owner facts and workroom acceptance, 16 October 2026

The owner has since confirmed a 4-5 calendar-week curtain dispatch estimate from the point of order, 1 m ordering increments for every fabric, and workroom acceptance of all proposed active-range construction and insert-fit details. The server records successful order confirmation as the dispatch start. Combined curtain/cushion review uses the later curtain estimate. Shared cutting rounds to the next whole metre only after compatible ordered pieces are packed together.

The active standard-insert range now carries owner-reported workroom fit and construction provenance. Historical saved size meanings are unchanged. The selected Willows round variants were checked at GBP 5.99 and GBP 6.99; their published variant IDs identify them because the SKU fields are blank. Costing uses the full advertised outlay without an input VAT deduction. No measured trial record is claimed.

The workroom later clarified that 30 cm is the total extra strip length, without a per-join amount. Straight self-piping for flat covers now uses that approved gross reserve and includes its actual strip layout in shared cloth costing. Bias piping for rounds and bolster ends still needs a reliable yield/layout. Supplier carriage, exact governed fabric facts, current stock, live Shopify integration and release gates remain separate checks. The updated scoped verdict is in [Cushion Studio and My Home release readiness](CUSHION_STUDIO_MY_HOME_RELEASE_READINESS_20261016.md).
