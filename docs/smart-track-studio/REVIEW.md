# Smart Track Studio candidate

Candidate based on protected `release/production` at `5b6f4aeb98c5a5e57427ae43113e37d3759d2eb5` (PR #236). No production deployment, Shopify write, live migration, payment or fitting service is introduced by this review.

## Customer journey

- `/pages/smart-track-studio`: immediate controls and five luxury photographic rooms inspired by the owner's references. The owner's later direction replaces the catalogue demonstration with seven illustrative plain colours applied to the existing Curtain Style wave form. Centre/one-way opening, stop/resume/reverse, shared remote/app positions, group selection, day/evening, room lights and accessible controls remain. The sixth remote channel is deliberately unassigned in this five-room demonstration.
- Bedroom and patio illustrate ceiling-mounted tracks; the other three rooms show wall mounting. The motor is concealed in normal room views, with a separate explanatory hardware cutaway. Controls and captions sit outside the photograph. Desktop room and remote remain visible beside the four-step configuration. Mobile keeps a compact room and Open/Stop/Close panel visible. The shop iframe uses parent viewport messages and one outer page scroll, following the existing Cushion Studio approach.
- Go and battery iOn are separate system identities at the same price. App and Forest Link favourite demonstrations apply to Go; the iOn choice disables these unsupported controls. The actual included controller is Forest EasyTouch six-channel matt white, article 5201081006, based on the owner photo and supplied manual.
- The first step presents Plug-in track (Shuttle Go) and Battery track (Shuttle iOn) as illustrated choices with equal pricing. Configuration keeps exact customer length text, mounting, motor side viewed from inside facing the window, compatible heading, 60/80 mm wave spacing, power check, weight evidence, quantity and optional room. There is no curtain-origin question; links from existing curtain items are retained automatically. Eyelet and curved/bay tracks are excluded.
- Illustrated shortcut cards open the curtain weight calculator and the separate visual fitting guide. The last step offers Add track to my order (Update when editing) and Make curtains, which opens the established fabric browser with optional room context.
- Live server price, exact decimal price bands, stale-response protection, weight helper and measurement illustrations. Customer configuration remains savable while unresolved package facts block ordering.
- Track-only, multi-track and every curtain/cushion combination use Design My Home's existing device persistence, edit identity, revisions, order review and Shopify transport. Trying rooms never creates products. A linked curtain is re-read from its signed receipt and revalidated when changed. If its retained identity is replaced, relink it explicitly.
- `/pages/smart-track-fitting-guide`: original explanatory diagrams for measuring, wall/ceiling arrangements, motor attachment, limits, remote and battery care; accessible chapters, Go/iOn selection, print styling and manufacturer links. Bracket illustrations remain conditional until the actual supplied rail/bracket schedule is confirmed.
- Discovery is gated in Design My Home, the curtain configurator and How to use CurtainsUK. The eight-link header is unchanged. Jane, Noah and James receive track knowledge only when the server feature is released.

## Confirmed decisions (do not reopen)

| Decision | Authority / implementation |
| --- | --- |
| Straight, cut to ordered length, maximum 500 cm | Owner; exact text retained in immutable fulfilment specification |
| Go with UK three-pin plug; iOn with rechargeable battery, equal prices | Owner; distinct manufacturer systems, Go 35 kg and iOn 25 kg headline straight-track limits |
| Motor, control and all required track hardware included | Owner; no separate bracket, motor or remote charge |
| Pencil/pinch base; wave 60 or 80 mm, 10% higher supplier product cost | Owner; explicit carrier choice for wave |
| Product gross margin 30% | Owner; VAT-inclusive supplier cost divided by 0.70, unit rounded to pennies before quantity multiplication |
| £12.95 VAT-inclusive customer delivery once per order containing a track | Owner; existing postcode/geographic policy still applies |
| £10.95 supplier carriage covers one or multiple tracks in a shipment | Owner; one ledger entry per actual supplier shipment reference, not per track; no £15.64 uplift |
| Supply only | Owner; no fitting or electrical installation included |
| Dispatch all ordered products together | Owner; latest confirmed comparable ready interval, never a curtain fallback for unknown track timing |

Retail prices, inclusive of VAT and excluding order delivery:

| Exact finished track length | Pencil / pinch | Wave |
| --- | ---: | ---: |
| Up to 100 cm | £442.86 | £487.14 |
| Over 100–200 cm | £514.29 | £565.71 |
| Over 200–300 cm | £542.86 | £597.14 |
| Over 300–400 cm | £571.43 | £628.57 |
| Over 400–500 cm | £614.29 | £675.71 |

100.5 cm uses the second band while remaining 100.5 cm in the specification. Supplier costs and margin live only in the server pricing module. VAT allocation uses the existing commerce helper; VAT is not added again. No delivery-margin claim is made.

## Manufacturer evidence

Sources checked on 17 October 2026 through the [Forest UK technical library](https://www.forestgroup.co.uk/uk/downloads/technical-documents), plus the supplied PDFs and remote photograph:

| Document | Facts used / limits |
| --- | --- |
| [Shuttle Go manual V1.1, 260425](https://www.forestgroup.co.uk/user_files/download_files/download_2465_260425%2006014_Forest%20Shuttle%20Go_UM_V1.1_EN.pdf) | Pages 3–7: straight load, mains cable, built-in Wi-Fi, mounting and limits with curtains hung. Pages 8–18: pairing, copying, favourite, stack-back, direction, touch, speed, resets and app pairing. No external Wi-Fi dongle. |
| [Shuttle iOn manual, 300726](https://www.forestgroup.co.uk/user_files/download_files/download_2459_FOREST_handleidingA5_shuttle_ION_EN_300726_WEB.pdf) | Current library edition supersedes the older iOn download. Pages 4–5: remove battery to mount, limits before hanging curtains. Pages 7–10: original RF, 4-second confirmation, menu and charging. 25 kg straight headline limit; no included built-in Wi-Fi or Link favourite promise. |
| [EasyTouch manual, 041024](https://www.forestgroup.co.uk/user_files/download_files/download_1618_handleiding84x178_EasyTouch_EN_041024_WEB.pdf) | Supplied PDF used where download protection intervened. Six channels, all-channel group, Open/Stop/Close, channel arrows, favourite limited to Link, programming-only child lock, active-channel setting, two AAA cells and optional original-RF protocol mode. Default radio supports original RF and Forest Link. |
| [FMS assembly guide V1.1](https://www.forestgroup.co.uk/user_files/download_files/download_634_FMS_Manual_V1_1.pdf) | Pages 12–13: 50 cm bracket reference and first bracket near motor pulley, conditional on the supplied FMS hardware matching. Old motor/control/dongle instructions in this assembly guide are not applied to Go. |
| [FMS adjustable wave master carrier guide](https://www.forestgroup.co.uk/user_files/download_files/download_1089_ASSEMBLAGE%20Handleiding%20ANDRE%20FMS%20verstelbare%20Wave%20voorloper%20_GB_220621_WEB.pdf) | Reference for matching supplied master carrier arrangement. Its adjustment positions are not the owner's 60/80 mm carrier spacing choices. No unconfirmed carrier article is asserted. |

The purchased motor/rail/finish article must be recorded in `lib/smart-track/package.ts` after supplier confirmation; an article listed by Forest is not proof of which colour/kit this supplier provides. Manufacturer documents do not establish supplier cutting precision or dispatch time.

## Remaining supplier decisions before purchasing

1. Minimum finished track length and accepted cutting increment/precision for each package. Until confirmed, decimal entries are preserved but cannot be released for manufacture.
2. Supplied rail/system and finish, motor article/colour, actual wall/ceiling bracket schedule and carrier/master-carrier identity. Hardware inclusion is already confirmed; this is identification and safe installation evidence, not another charge.
3. Confirmation that the supplied straight rail/carrier/mounting combinations support the applicable 35 kg Go / 25 kg iOn limit across the offered lengths, or documented lower configuration limits if any.
4. Track dispatch interval, starting event and supplier commitment. Record a comparable confirmed dispatch object with approval reference; do not borrow curtain timing.

The package authority intentionally has no environment override for these facts. Fill the source-controlled package fields, version them, attach the evidence and review the resulting exact head before enabling purchases. No finish selector, arbitrary minimum, guessed bracket spacing, remote discount or lead time is offered.

## Weight and fabric evidence

The owner simplified the customer helper to one estimate: combined width of all panels, height including hems, gather multiplier and face-fabric GSM. Gather is applied once; customers entering total flat fabric width use gather 1. Selecting lined curtains adds lining using the same area and gather. The standard lining button supplies an editable 200 GSM preset. A custom GSM can replace it, and the preset can be restored. Both the value and STANDARD_PRESET/CUSTOM source persist with the specification and fulfilment snapshot.

The 200 GSM reference is grounded in [Evans Textiles' DB1 lining specification](https://evans-textiles.com/why-db1-is-still-the-market-leading-curtain-lining-and-always-will-be), published 28 January 2026. This is a clearly labelled estimate, not a claim that every lining weighs 200 GSM or that CurtainsUK supplies DB1. For 200 cm width, 250 cm height, gather 2 and face fabric 300 GSM, the result is 3 kg unlined, 5 kg with the preset, and 5.5 kg with custom 250 GSM lining. Missing face GSM gives no invented total; missing lining GSM leaves only the known fabric estimate. Unquantified interlining, tape, hooks and fittings prevent load approval from this cloth-only estimate.

Earlier saved measured or governed weight evidence remains readable and is preserved until the customer changes weight inputs. The simplified UI does not add a measured-weight route. Partial estimates never approve capacity.

For linked CurtainsUK curtains, only a server-verified receipt supplies configuration and calculated consumption. Face-cloth evidence uses Fabric Master `weight_gsm` and `full_width_mm`. The existing engine has no complete governed lining/interlining/tape/hooks weight set. The helper therefore exposes the partial cloth estimate and its making/offcut assumptions, and requests a measured total or completed evidence. Purchased offcuts are not treated as a proven minimum hanging weight. A moving preview is never load approval.

The Smart Track demonstration no longer loads Fabric Master or patterned artwork. Its upright plain wave panel is recoloured inside its alpha and composited over the selected room. Opening gathers the illustrated panels; this is not a physical cloth simulation or an installation/stack-back measurement. The 230 cm and 400 cm demonstration dimensions remain separate from ordered length. The existing released curtain visualiser, catalogue identities and its material-scale authority are unchanged. See [room visual provenance and implementation](ROOM_VISUALS.md).

## Hardware pricing audit

`prepareStagingConfiguration` in `lib/storefront/staging-pricing.ts` maps fitted hardware to measurement basis, heading compatibility and complexity. `createCurtainConfiguration` starts with no accessories. `pricing-engine.ts` prices fabric, making, lining/interlining, explicit accessories, packaging and shipping; this current self-service hardware selection does not add a physical manual track. No manual-track credit is applied. If a future package actually prices one, it needs a documented adjustment rule before an upgrade credit is offered.

## Fulfilment and release

- New private migration `20261017162157_smart_track_distinct_checkout.sql` stores immutable track snapshots, order groups, creation claims, verified paid manifests, staff supplier releases and actual shipment carriage entries. RLS excludes browser roles. Paid events remain held for staff review.
- The custom order uses `SMART_TRACK` with its own snapshot identifier. Native curtain and cushion snapshots are retained. One Shopify total is reconciled; paid lines, properties, quantity, GBP, VAT, delivery, discount absence and completed draft link are checked before persistence. Native curtain paid lifecycle and cushion stock usage run through their existing transaction. No private costs/notes appear in public line properties.
- Customer-safe failure events use the existing server logging path, release marker and request identifiers. No fabric costs, customer text or personal data are included.
- New server settings: `CURTAINSUK_SMART_TRACK_ENABLED`, `CURTAINSUK_SMART_TRACK_PURCHASES_ENABLED`, `CURTAINSUK_SMART_TRACK_WEBHOOK_ENABLED`; all default off. The existing `CURTAINSUK_PRODUCTION_PURCHASES_APPROVED` and existing per-product/My Home gates still apply. The theme setting `curtainsuk_smart_track_enabled` defaults false.
- A future scoped release must first satisfy package decisions, run this suite and the two protected PR checks, obtain exact-head owner release approval, and merge through the protected branch. Deploy only that protected head using existing infrastructure.
- The existing `release/policy-change.mjs` also protects new tests and `package.json`. Its check requires a PR comment authored by `Nylon1` with exactly `OWNER_APPROVED_POLICY_CHANGE <current full PR head SHA>`. The updated decision record explicitly leaves this approval pending; it cannot approve itself. No existing assertion or release gate is weakened.
- Apply the reviewed migration to the existing Supabase project. Add the two Shopify Pages using their matching templates. Publish only the reviewed theme files, retaining all existing `settings_data.json` values and released flags. Record the new settings in the normal production settings record, including webhook enablement before purchases. Reconcile protected source, live theme, migration state, stored settings and Vercel assets together; never use temporary deployment-only switches.
- Smoke signed asset/quote requests, both motor specifications, one saved edit, supported/unsupported postcodes, every mixed order review, checkout reconciliation and paid/staff-release recognition before opening purchase controls. This candidate does not exercise real payment. If verification fails, keep purchases closed and follow the existing rollback process.

## Verification

The initial candidate passed 50 focused and adjacent regression tests covering all five exact/decimal price bands, both motors, headings/wave spacing, VAT, quantity, manufacturing precision, weight evidence, linked changes, every mixed product combination, paid identity/reconciliation, revisions, retries, persistence, staff-release hold, carriage once and shared control state. After the visual/helper changes, the 13 smart-track tests pass again, including added standard/custom/missing lining calculations and rejection of a forged preset value. Legacy cloth/UV tests cover the retained Three.js foundation, not the new photographic composition.

The initial candidate's protected cumulative gate passed all 11 capability groups on both candidate and protected baseline (133 assertions each). The changed smart-track iframe section passes Shopify validation. The Next production build also passes after the new visual assets and lining preset, with local placeholder public Supabase environment values; no production credentials are required for this build check. A build without those existing required values fails on unrelated prerendered admin pages.

TypeScript and focused ESLint pass for the production code. Including the existing local preview harness in ESLint reports its three pre-existing explicit `any` declarations; this candidate adds no new lint suppressions or explicit `any` declarations. Existing cushion raw-asset build verification also passes.

Browser rehearsal uses `scripts/my-home-preview.ts` on localhost with synthetic commercial authorities. The original commerce rehearsal covered both motors, 100.5 cm wave price, iOn 25 kg check, save/edit identity, delivery £12.95 and the separate fitting journeys. The updated rehearsal covers photographic rooms, ceiling mounting, plain colours, lights, shared remote/app motion, the four-step form, standard/custom lining estimates and save/reopen/edit persistence. `/smart-track-embedded-preview` runs the actual theme section script locally to verify viewport pinning on desktop and 390×844 mobile. No live customer account, device, Shopify draft or payment was used. The production signed proxy and migrated hosted payment path still require scoped release smoke tests.

Review screenshots: [desktop studio](screenshots/studio-desktop.jpg), [mobile studio](screenshots/studio-mobile.jpg), [lining calculator](screenshots/studio-lining.jpg), [desktop fitting guide](screenshots/fitting-desktop.jpg), [mobile fitting guide](screenshots/fitting-mobile.jpg).

Local commands:

```powershell
$env:LOCAL_PREVIEW_PORT='4385'
node --import ./scripts/cushion-preview-register.mjs --import tsx scripts/my-home-preview.ts
npm run test:smart-tracks
```
