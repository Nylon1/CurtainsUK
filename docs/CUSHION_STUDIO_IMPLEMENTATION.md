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

Rollback after any future activation: close cushion and mixed purchase gates first; hide the native page entry/profile CTA and navigation; close the hosted preview gate if the customer surface itself is faulty. Retain immutable snapshots, paid records and the schema. Keep an authenticated paid receiver available for already-created unpaid drafts and webhook retries, or deliberately return retryable errors until a repaired receiver is deployed—never acknowledge an unrecorded payment. Revert only this candidate's source through a protected PR, rerun both required checks, and deploy the exact approved protected HEAD. Do not erase ordered specifications or restore a mutable design over an order.

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


## Remaining shape range — 15 October 2026 (unpublished)

All twelve selector sizes now share one size authority in `geometry.mjs`: five standard squares, two rectangles, two decorative bed squares, two rounds and the bolster. The accepted 50 cm square visual and its existing cutting/pricing authority are unchanged. New non-square selections carry `constructionProfile: "shaped-filled-v1"` inside the version-1 cushion specification. The parser, saved design, quote hash and immutable fulfilment snapshot preserve this value. Existing saved specifications without it retain their original construction; they are not silently reinterpreted.

Rectangles and bed squares have independent softly filled paired surfaces, rounded sewn corners, thin seams and measured cloth paths. Rounds have two shallow domed circular panels. The bolster has an exact-scale continuous cylinder wrap and two identical upright domed circular ends. Its cap rise forms part of the finished 560 mm overall length. Opposite body views necessarily show different parts of one wrap; the end panels match. Source bounds include the curved cloth extents, with no finite-image extension or seamless tiling assumption. Arrangement positions account for each shape's own depth, lean, rotation and bounded seat contact. Saved offsets cannot cause accepted cushion bounding volumes to overlap.

The new profiles are **manufacturing proposals**, not approved patterns. `construction.shapedConstructionBySize[sizeId]` must contain the exact profile version, a finite per-edge seam allowance, boolean `confirmed: true` and a nonempty approval reference before that size becomes binding. Missing allowances produce explicitly labelled **net envelopes only — do not cut**. They never borrow the standard-square allowance. Proposed round/bed dimensions, additional making/piping rates, compatible nonstandard inserts, commercial evidence and dispatch retain their independent gates. Confirming one size does not approve another. The global existing standard-square construction rules and rates are unchanged.

The customer preview note is: “Visual example. Fullness, folds and colour may vary with fabric, filling and lighting.” The 50 cm fill comparison requires both local owner review and `?internalReview=1`; it is not shown in the normal customer journey. Matching every rendered crease is not an acceptance condition. The workroom trial remains an internal manufacturing control.

`range-review.html` is an owner-only local review tool using the actual customer renderer. It captures plain, striped and directional fabrics across front, three-quarter, true-side, back and furniture views for each size, with both end views for the bolster. Customer asset configuration rejects this page and its script. See [range review and validation](CUSHION_STUDIO_SHAPE_RANGE_REVIEW_20261015.md). No publication or gate change is included.
