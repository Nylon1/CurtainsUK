# Build My Rooms / House of Curtains V1

Status: **unpublished local implementation; multi-curtain contract built; public House payment disabled**.

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

Five-minute review evidence binds membership, room names, house revision, destination, current prices and configuration receipts. It is not persisted as a reusable checkout. Price changes need individual acknowledgement; all measurements need final confirmation. Failed curtains leave unaffected rooms intact. No stale Shopify draft can become authoritative because this implementation creates none.

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

`ROOMS_CHECKOUT_RELEASED=false` and the server checkout command fail closed
independently of theme/env gates. The production transport is intentionally not
wired to public House checkout. On 22 September 2026 the linked project received
migration `20260921205826_multi_curtain_paid_order_contract`: RLS remained on
each new private table, browser roles retained no grants, and append-only
curtain/release triggers were present. One operator-authenticated, non-payable
House rehearsal used two rooms and three independently immutable snapshots (two
using the same SDG Fabric Master), revalidated combined fresh stock and ruleset
`3.0.0-production.1`, and exactly reconciled £2,149.00 goods + £360.33 VAT +
one £12.95 delivery line = £2,161.95 in CurtainsUK and Shopify. The invisible
Draft Order was deleted and the temporary route/credential removed. A separate
rolled-back database transaction proved House webhook reconstruction, no direct
`PAID → WORKROOM_RELEASED` transition, and exactly three release rows only after
the explicit review/approval chain. No paid/release rehearsal records persisted.

Before a separate public House-payment release, connect the final reviewed House
to fresh snapshot preparation and durable House execution persistence, obtain
Astra visual approval, reconcile the scoped live-theme diff, and obtain new owner
authority. No House payment flag is implied by this proof.

`rooms-order-contract.ts` prepares the combined contract using existing immutable
single-line builders, one delivery and private per-line identity.
`rooms-draft-order-repository.ts` supplies durable House claim/receipt helpers
for the later transport. Contract tests use synthetic Shopify financial
responses; they are **not** evidence of live Shopify reconciliation.

The staff-reviewed/manual-quote resume route is unchanged; the new retention adapter currently handles approved automated instant-price configurations only. It does not claim to import reviewed specialist quotes.

## Local review and tests

Run `npm run preview:rooms` at loopback `http://127.0.0.1:4348`. The preview has a conspicuous fixture banner, example-curtain/10-curtain controls and price/stock failure scenarios. It uses real existing production calculation code with labelled fixture supplier costs and stock, approved catalogue-image mappings, and ephemeral local signing. It loads no production credentials. Browse/Fabric Intelligence/Make Curtains navigation destinations are explicitly labelled local placeholders, not live integration tests.

- `npm run test:rooms`: 31 domain/store/contract/integration-guard tests.
- `npm run test:storefront`: run before a deployment; local source tests are expected to include the multi-contract suite.
- `npx tsc --noEmit --incremental false`: passed.
- Shopify Liquid skill validation: all ten changed theme/template/assets/locale files passed.
- `npm run verify:rooms`: 21 local browser checks, no browser errors. Evidence: `artifacts/build-my-rooms-v1/browser-verification.json`.
- Browser checks: 1/3/10 refresh, real browser close/reopen with persistent profile, local navigation/back/forward, one room with multiple windows, multiple rooms, rename/add/remove, changed price, unavailable/non-commercial/out-of-stock, final empty state; desktop 1440 / 390 / 412 no overflow with 44px removal controls.
- Storage corruption/quota, cross-tab conflicts, stale/tampered receipt, compatibility, draft-rules rejection, cumulative stock, 1/2/10-line penny reconciliation, House line property tampering, generic exact-total execution and House idempotency identity are covered by isolated tests.

Screenshots: `desktop.png`, `mobile-390.png`, `mobile-412.png`, `review.png`, `changed-price.png`, `empty-mobile.png` in the same artifacts folder. All are local fixtures.

## Remaining release verification

Do not enable the flags or deploy incomplete functionality to live for preview. Outstanding: owner visual review; server bridge from fresh House review to immutable snapshot preparation; canonical-live diff reconciliation and Shopify-hosted rendering. No payment or manufacture action is authorised by this local build.

Customer Trust V1, canonical footer/policies, consent, Fabric Master, production ruleset, stock projection, compatibility, Guided Measure, existing payment/webhook and workroom gates must remain intact during any later scoped deployment.
