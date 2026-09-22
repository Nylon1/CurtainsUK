# Build My Rooms / House of Curtains V1

Status: **public House checkout source connection implemented behind a separate server gate; awaiting deployed private proof and Astra theme integration; not published**.

## Public House checkout operation, 22 September 2026

The public `rooms` gateway command now supports a House checkout operation without
changing the Shopify theme. The source intentionally uses the existing House
review, snapshot, Draft Order, webhook and workroom components rather than a new
cart or pricing path.

- `CURTAINSUK_ROOMS_CHECKOUT_RELEASED=true` is a separate server-side gate. It
  defaults to closed and is required in addition to the existing production
  purchase approval, production deployment stage and `CREATE_PRODUCTION_DRAFT`
  configuration. Single-curtain approval does not implicitly open House payment.
- Checkout reruns the complete House review before it creates a Draft Order:
  canonical Fabric Master, current commercial eligibility, aggregate fresh stock,
  `3.0.0-production.1`, hardware/heading compatibility, raw measurements and
  signed retained configuration evidence are all checked again.
- A fresh price returns `PRICE_CHANGED` with the affected room/window review
  details. Combined stock returns `STOCK_CHANGED`; a malformed or no-longer
  eligible line returns `INVALID_CONFIGURATION`; an expired or unconfirmed
  review returns `REVIEW_REQUIRED`; safe failures return `ERROR`. Browser code
  only needs these statuses and never receives supplier cost, snapshot IDs or
  other operational detail.
- On success, each curtain is persisted as an immutable snapshot and becomes an
  individual Shopify Draft Order line. The original House ID, room ID/name and
  retained configuration identity remain in private line properties. One
  existing governed delivery charge is used for the House.
- Shopify must reproduce exact goods, VAT, delivery and total before the server
  returns the HTTPS checkout URL. The existing allowed-host validation restricts
  a production checkout URL to `www.curtainsuk.com` or
  `carpetup.myshopify.com`.
- The House fingerprint is the durable Draft Order idempotency key. A changed
  House has a new fingerprint and cannot reuse a prior prepared Draft Order.
  Repeated unchanged checkout requests recover the same verified Draft Order.
- The contract preserves the existing `PAID → CURTAINSUK REVIEW` webhook path.
  It cannot release a room or curtain to the workroom; release remains an
  explicit staff action for the whole House.

The public release gate must remain closed while the endpoint is deployed and
privately rehearsed through the genuine signed Shopify app proxy. The rehearsal
may retrieve the validated checkout URL but must not open it, issue an invoice,
email a customer, collect payment or release manufacture. The created private
Draft Order must then be deleted under the existing auditable procedure. No
Shopify theme files are part of this backend-only change.

## Authorised release check, 22 September 2026

Historical pre-connection record. Release baseline: `1ff71b1`, with visual baseline `a1250b6` and prior private commerce rehearsal baseline `af8feef`. The fixture correction changed tests only. The listed checks proved the original nonpayable behavior; this record is superseded by the gated public operation above.

Immediately before any mutation, Shopify CLI confirmed `182339731835` remains the live theme on `carpetup.myshopify.com`. A fresh pull into `artifacts/build-my-rooms-release-prep/final-live-182339731835` matched all five shared files in the approved 16-file manifest by SHA-256. All ten checked Customer Trust files also matched. No theme, gateway, environment, payment, page or lifecycle mutation was performed, so no rollback was required.

The former deployment blocker, now resolved in source, was reproducible as follows:

- `rooms-server.ts` explicitly passes `null` to `executePreparedHouseCheckout` for customer checkout.
- `rooms-checkout-server.ts` rejects `CREATE_PRODUCTION_DRAFT` or a production deployment stage before persistence/network execution.
- `rooms-order-contract.ts` constructs a staging House with `paymentEnabled: false` and `MULTI_SNAPSHOT_PUBLIC_PAYMENT_DISABLED`.
- `rooms-core.ts` fixes `ROOMS_CHECKOUT_RELEASED` to false.
- `houseCheckoutCustomerResult` always returns a null checkout URL. The Rooms browser handler only displays the returned message; it has no successful checkout navigation.
- `rooms.test.ts` explicitly verifies rejection of production transport with zero network calls. The 29-check browser matrix likewise verifies a prepared-but-disabled result.

The current Vercel gateway inspection resolved to ready production deployment `dpl_GbfAvYMiBZuuPGAoJLCRJCiPRc9A`, project `curtainsuk-staging-api`. This identifies the deployment only; it is not evidence that the final Rooms bridge is deployed or enabled. A normal live Make Curtains browser check confirmed the existing page, footer, policies and consent controls remain visible.

The required source connection is now implemented. Remaining work is the deployed private proof through the genuine app proxy, followed by Astra's guarded browser navigation and a separately authorised scoped theme deployment. No pricing, stock, compatibility or manufacturing policy change is required.

All historical "awaiting owner visual approval" statements below describe earlier checkpoints and are superseded by this release check. Build My Rooms is not live. Existing live Make Curtains remains in place.

## Source and deployment policy

- Feature branch: `feature/build-my-rooms-v1`; isolated worktree: `C:/Users/hamza/curtainsuk-build-my-rooms`; base: `042235f`.
- Canonical production store: `carpetup.myshopify.com`; public domain: `www.curtainsuk.com`.
- Canonical live Shopify theme: **182339731835**.
- Do not create duplicate themes for feature development/review. Do not deploy to, delete or otherwise alter historical themes.
- The scoped Supabase migration and one temporary, operator-authenticated gateway rehearsal route were deployed on 22 September 2026 solely to prove the private multi-line contract. The route and its credential were removed immediately after the invisible Draft Order was deleted. No Shopify theme, live Page, settings, public House payment, customer invoice, email, order completion or payment was performed.
- Before ANY deployment, download/read the then-current canonical live scoped files and compare them with the intended Git diff. Merge intervening Customer Trust and other live changes. Do not overwrite the current theme with this historical worktree wholesale.
- Git holds known-good files for scoped rollback. Theme duplication is not the rollback strategy.

## Customer experience

House → Rooms → immutable curtain configurations, with stable UUIDs at every level. One room supports multiple windows. Room names can change; priced curtain specifications cannot. Customers can keep/remove curtains, remove rooms, add a room/window, return to Browse or Fabric Intelligence, and review the whole house.

The feature-gated Make Curtains integration replaces the instant-price handoff with **Add to my rooms**, asking only an optional room name/existing room. Retention requires an independently server-validated configuration and signed price confirmation. Reusing a fabric carries only its exact Fabric Master identity, not measurements/options. A new-room entry discards only the transient cached configurator evaluation, ensuring a new configuration identity; it never clears saved rooms.

Cards show an exact governed fabric photograph plus an explicitly neutral approved heading study, not an invented finished-curtain simulation. Pair/single, dimensions and other specifications are text, not claims that the neutral visual reproduces those dimensions. Missing imagery uses a truthful text fallback; no room is deleted.

The existing sample cart and single-curtain production checkout remain unchanged when the feature is disabled. Earlier commits `d30e191` and `710d569` informed keep/remove, customer-readable metadata and Browse return semantics. Their single-order checkout adapter is not repurposed as a multi-room basket. The pre-existing configurator project storage remains a temporary editing draft, not a competing retained-house model.

## Device persistence

`assets/curtainsuk-rooms-store.js` is the single retained-house store. Key `curtainsuk_house_v1`; organisational intent uses `curtainsuk_room_intent_v1`.

Schema version 1 stores house ID/revision/timestamp, rooms with ID/name, and each curtain's configuration ID, exact Fabric Master, raw dimensions/configuration, design intent, public fabric imagery/identity, server-signed retained receipt, validated price/time/version and visual references. No screenshots, secret keys, supplier costs or checkout URLs are stored.

Changes save immediately. Web Locks coordinate supporting browsers; revision checks reject stale writes. Cross-tab events and history restoration refresh the displayed state. Storage failures do not claim success, and corrupt data is retained for recovery rather than silently replaced. Browser/site-data clearing or private-session expiry can erase device storage; cross-device saving is not promised. IDs/schema allow a future account-backed store without implementing accounts now.

## Server authority

The existing signed app-proxy security/rate-limit boundary accepts a new `rooms` operation only when `CURTAINSUK_ROOMS_ENABLED=true`. The production environment has **not** been changed. Theme behaviour separately requires `settings.curtainsuk_rooms_enabled` (default false; no settings_data changes).

`rooms-server.ts` delegates to the existing canonical Fabric Master, production pricing, signed confirmation, fresh stock and governed delivery services. No replacement prices/compatibility rules are introduced. Every accepted calculation must actually report `3.0.0-production.1`, fresh stock and ORDER_READY/INSTANT_PRICE. Review revalidates each retained receipt; browser prices/identity are not authority.

Retained receipts are domain-separated HMACs using the existing server-only signing secret. They are customer-safe configuration evidence, not perpetual price or payment authorisation. Their integrity can survive expiry of the original short-lived price confirmation, but every review independently calculates current price/eligibility. Secret rotation may require affected curtains to be configured again; fail closed, never silently substitute.

House review also verifies aggregate cloth requirements for repeated use of the same fabric. Delivery uses one existing SINGLE_RATE quote with the actual maximum drop/review flags and aggregate requirements. No delivery amount is hard-coded into the customer UI. A future departure from the approved SINGLE_RATE policy fails closed pending review.

Five-minute review evidence binds membership, room names, house revision, destination, current prices and configuration receipts using compact signed digests. It is not persisted as a reusable checkout. Price changes need individual acknowledgement of each current amount; all measurements need final confirmation. Failed curtains leave unaffected rooms intact. No stale Shopify draft can become authoritative because the public preparation path creates none.

## Multi-snapshot paid-order contract

The original checkout was intentionally one-snapshot-per-order. This branch
adds a narrow relational extension without changing pricing, Fabric Master,
stock, compatibility or the lifecycle meanings:

- Migration `20260921205826_multi_curtain_paid_order_contract.sql` preserves
  historic `SINGLE_CURTAIN` records and adds `HOUSE` records. Each paid order
  has relational `mtm_paid_order_curtains` rows containing snapshot,
  configuration, room and window identity. It does not store production lines
  as one unstructured JSON document.
- `mtm_workroom_release_packet_curtains` is likewise relational. One explicit
  staff House release emits all of its curtain rows; V1 has no partial release.
- The signed `orders/paid` webhook now accepts either the historic single
  snapshot or an HMAC-authenticated Shopify House with every private line
  property reconstructed and checked before the RPC persists it.
- House Draft Orders use one governed delivery line, exact summed goods/VAT,
  private per-line production identity, a House/revision/fingerprint and a
  durable House-fingerprint creation claim. The payment transport continues to
  reject public House payment.

Sending many curtain lines under the first snapshot would omit other curtains
from production review. Creating several unrelated checkouts would violate the
single House order. Neither behaviour is allowed.

`ROOMS_CHECKOUT_RELEASED=false` and an explicit null transport configuration keep
public House payment closed independently of theme/env gates. Continue now calls
the server preparation bridge described below. On 22 September 2026 the linked project received
migration `20260921205826_multi_curtain_paid_order_contract`: RLS remained on
each new private table, browser roles retained no grants, and append-only
curtain/release triggers were present. One operator-authenticated, non-payable
House rehearsal used two rooms and three independently immutable snapshots (two
using the same SDG Fabric Master), revalidated combined fresh stock and ruleset
`3.0.0-production.1`, and exactly reconciled £2,149.00 goods +
one £12.95 delivery line = £2,161.95, including £360.33 VAT, in CurtainsUK and Shopify. The invisible
Draft Order was deleted and the temporary route/credential removed. A separate
rolled-back database transaction proved House webhook reconstruction, no direct
`PAID → WORKROOM_RELEASED` transition, and exactly three release rows only after
the explicit review/approval chain. No paid/release rehearsal records persisted.

Before a separate public House-payment release, verify the final bridge in the
approved hosted environment, obtain owner visual approval, reconcile the scoped
live-theme diff, and obtain new owner authority. No House payment flag is implied
by this proof or by the local final integration.

`rooms-order-contract.ts` prepares the combined contract using existing immutable
single-line builders, one delivery and private per-line identity.
`rooms-draft-order-repository.ts` supplies durable House claim/receipt helpers
used by the nonpayable server binding. Contract tests use synthetic Shopify financial
responses; they are **not** evidence of live Shopify reconciliation.

The staff-reviewed/manual-quote resume route is unchanged; the new retention adapter currently handles approved automated instant-price configurations only. It does not claim to import reviewed specialist quotes.

## Local review and tests

Run `npm run preview:rooms` at loopback `http://127.0.0.1:4348`. The preview has a conspicuous fixture banner, example-curtain/10-curtain controls and price/stock failure scenarios. It uses real existing production calculation code with labelled fixture supplier costs and stock, approved catalogue-image mappings, and ephemeral local signing. It loads no production credentials. Browse/Fabric Intelligence are labelled navigation placeholders. The Make Curtains fixture exercises the actual existing room-choice/Add hook and retain endpoint with a server-priced example; it does not reproduce or prove the live configurator. Three exact approved public image mappings are retained in `scripts/rooms-preview-media.json`, avoiding reliance on an ignored local media report.

- `npm run test:rooms`: 36 domain/store/contract/final-bridge tests, including exact-name punctuation preservation.
- `npm run test:storefront`: run before a deployment; local source tests are expected to include the multi-contract suite.
- `npx tsc --noEmit --incremental false`: passed.
- Shopify Liquid skill validation: all ten changed theme/template/assets/locale files passed.
- `npm run verify:rooms`: see the current exact check count and result in `artifacts/build-my-rooms-v1/browser-verification.json`.
- Browser checks: 1/3/10 refresh, real browser close/reopen with persistent profile, local navigation/back/forward, one room with multiple windows, multiple rooms, rename/add/remove, changed price, unavailable/non-commercial/out-of-stock, final empty state; desktop 1440 / 390 / 412 no overflow with 44px removal controls.
- Storage corruption/quota, cross-tab conflicts, stale/tampered receipt, compatibility, draft-rules rejection, cumulative stock, 1/2/10-line penny reconciliation, House line property tampering, generic exact-total execution and House idempotency identity are covered by isolated tests.

Screenshots: `desktop.png`, `mobile-390.png`, `mobile-412.png`, `review.png`, `changed-price.png`, `empty-mobile.png` in the same artifacts folder. All are local fixtures.

## Final integration — 22 September 2026

`rooms-checkout.ts` verifies the signed review and full House request, then calls
the same authoritative review again. Changes since review return fresh line
issues/prices, clear the old confirmations and leave device storage untouched.
Only the exact reviewed current amount can satisfy each price acknowledgement.
The existing immutable snapshot builder and checkout gate prepare every curtain,
then `buildHouseDraftContract` combines them with one delivery and exact included VAT.

Execution configuration IDs are deterministic for the accepted House/commercial
revision; unchanged retries preserve the snapshot and contract identity. A new
accepted price, membership or destination gets distinct execution IDs, avoiding
the existing database uniqueness constraint on configuration IDs. The original
saved curtain ID remains in `_curtainsuk_retained_configuration_id`; House/Room
identity and raw validated configuration remain in the private server record.
The existing persistence summary retains interlining, stack direction and other
validated options in addition to the established measurement snapshot.

`rooms-checkout-server.ts` binds prepared snapshots to the existing persistence,
House claim/recovery, exact Shopify financial validation and execution-receipt
services. Its default is no writes; the public command passes **null explicitly**
and never reads the single-curtain payment environment configuration. Production
transport is rejected. The owner can exercise Continue locally and see a truthful
prepared-but-not-open result; no invoice URL or private production attributes are
returned. Nonpayable operator execution is implemented but was not executed in
this final integration task. The earlier private live rehearsal remains separate
evidence; it does not prove deployment of this new bridge.

The final acceptance matrix and evidence limitations are in
`artifacts/build-my-rooms-v1/final-integration.md`. No remote deployment, Draft
Order, theme duplication, theme publication, payment or manufacture was performed.

## Remaining release verification

### Final reference-led local visual pass

The populated header reads “Your home is taking shape”, with room/window counts
and quiet saving reassurance. Card headings join the exact fabric design and
colour with an authored comma; official punctuation within either name remains
untouched. Full-width white room panels show the approved selected neutral heading
study prominently, labelled as not the chosen fabric or room. The exact Fabric
Master photograph stays in a separately labelled inset. Cards retain immutable
specifications, Remove action, and the existing
governed Fabric Detail route with the exact encoded Fabric Master ID. The
customer measurement label is “Size”; no stored measurement field was changed.

“Which room is next?” offers Bedroom, Dining Room, Kitchen, Home Office, Child’s
Room and Other Room. Five photographic room choices and the editorial hero are
AI-generated room inspiration, never exact fabric or finished-curtain evidence.
The Other Room cue stays restrained. Asset prompts/provenance are recorded in
`artifacts/build-my-rooms-v1/room-inspiration-assets.json`. Choosing a room saves it and
the organisational intent before discovery navigation. The primary discovery
action is “Find fabric for another room”; Browse fabrics is secondary. The
summary says “One place, whole home”. Mobile DOM order puts Summary before final
Review. Desktop now uses a full-width bottom House summary, aligned specification
rows and stronger action hierarchy, with a quiet saved panel in the hero.

Zero curtains always shows the intentional empty state, including when empty
organisational rooms remain saved. It keeps Build My Rooms, the home-building
line and Start your first room, with a restrained window cue and reduced gap.
The local render observer proves saved arrival renders populated on its first
DOM update without an empty-state flash. The real store still commits before
navigation; no storage schema or immutable configuration contract was altered.

Current local validation: 36 Rooms tests, 243 storefront tests, 29 browser
regression checks, TypeScript and diff checks pass. The separate final visual
capture checks zero-curtain semantics, 390/412 Summary-before-Review ordering,
imagery loading and customer copy. Reproduce with
`node scripts/capture-rooms-visual.cjs` while the preview is running. The gallery
`artifacts/build-my-rooms-v1/owner-review.html` opens the final populated view
without requiring an owner browser to seed localStorage. Final screens are
`final-empty.png`, `final-one-room-one-window.png`,
`final-one-room-two-windows.png`, `final-three-rooms.png`,
`final-mobile-390.png`, `final-mobile-412.png` and `final-guarded-checkout.png`.
All prices/stock in those screenshots are labelled local fixtures, not live
quotes. The preceding locked-copy pass changed three authored order-contract
display separators only. This photographic revision makes no changes to commerce,
store, bindings, identity, pricing, stock or operational rules. Parent independently
confirmed 243 storefront tests and Shopify validation of the three edited theme
files (artifact `rooms-photographic-upgrade`, revision 2). Publication is held for
owner visual approval and hosted/live-diff verification, not claimed complete.

Do not enable the flags or deploy to live for preview. Outstanding: owner visual
approval remains the current gate. The final editorial polish keeps the existing
structure while enlarging the dominant curtain study and exact-fabric inset,
using readable editorial specifications after price, enlarging room photo tiles,
and reducing the populated header to a compact saved-House introduction. Empty
state retains its aspirational hero. Review uses compact visual cards matched by
configuration ID, authoritative available review fields/current price, and explicit
saved/unverified detail labels on blocked fallbacks. No price is calculated in the
browser. Review subtotal, delivery and total follow cards before confirmation.

The expanded gallery has 17 screens: the original seven plus 390/412 one-window
and two-window views, returning House at all three widths, and full-page visual
Review at all three widths. The fixture caveat remains visible in the screenshots and gallery.
Parent independently confirmed 243 storefront tests, zero authored em dashes,
empty protected diff, and Shopify validation of both edited assets, artifact
`rooms-final-editorial-polish`, revision 1. No storage, schema, server or commerce
contract changed in this polish. Publication still requires owner visual
approval, canonical-live diff reconciliation, Shopify-hosted rendering and hosted
verification of this exact final bridge before a separately authorised release.
No payment or manufacture action is authorised by this local build.

Customer Trust V1, canonical footer/policies, consent, Fabric Master, production ruleset, stock projection, compatibility, Guided Measure, existing payment/webhook and workroom gates must remain intact during any later scoped deployment.
