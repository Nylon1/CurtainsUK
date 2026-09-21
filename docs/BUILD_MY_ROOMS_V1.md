# Build My Rooms / House of Curtains V1

Status: **unpublished local implementation; combined checkout blocked**.

## Source and deployment policy

- Feature branch: `feature/build-my-rooms-v1`; isolated worktree: `C:/Users/hamza/curtainsuk-build-my-rooms`; base: `042235f`.
- Canonical production store: `carpetup.myshopify.com`; public domain: `www.curtainsuk.com`.
- Canonical live Shopify theme: **182339731835**.
- Do not create duplicate themes for feature development/review. Do not deploy to, delete or otherwise alter historical themes.
- No Shopify/Vercel/Supabase deployment, live Page creation, settings change, order creation or payment was performed for this feature.
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

## Exact release dependency — multi-snapshot paid orders

Evidence in the current source:

- `app/api/webhooks/shopify/orders-paid/route.ts` resolves one `curtainsuk_snapshot_id` order attribute.
- `supabase/migrations/20260920183654_mtm_paid_order_lifecycle.sql` uniquely associates both one snapshot ID and one Shopify order GID with a paid-order record.
- The workroom packet/review path is snapshot-specific.

Sending many curtain lines under the first snapshot would omit other curtains from production review. Creating several unrelated checkouts would violate the single house order. Neither workaround is acceptable.

The owner's protected webhook/lifecycle/schema files remain **untouched**. `ROOMS_CHECKOUT_RELEASED=false` and the server checkout command fail closed independently of theme/env gates. A production release needs explicit authority for a narrowly scoped order→many snapshots extension, not a pricing or lifecycle-policy redesign:

1. Associate every immutable line/snapshot with one order atomically and idempotently; verify full house fingerprint and line membership.
2. Register paid→review for all retained curtains. Payment and approval still must not automatically release any workroom job.
3. Keep approval/release staff-only and explicitly scoped to all relevant snapshots; prove partial/failure/replay paths.
4. Only then connect final server revalidation, price-change acknowledgements and fresh per-line snapshots to a multi-line Shopify calculate/create transport. Bind draft identity to house revision, invalidate superseded handoffs, and reconcile exact goods/VAT/one delivery/total before returning checkout.
5. Rehearse 1/2/multi-room Draft Orders without sending invoices/payment, then review before live activation.

`rooms-order-contract.ts` prepares the future combined contract using existing immutable single-line builders, one delivery and private per-line identity. It does not call Shopify. Contract tests use synthetic Shopify financial responses; they are **not** evidence of live Shopify reconciliation.

The staff-reviewed/manual-quote resume route is unchanged; the new retention adapter currently handles approved automated instant-price configurations only. It does not claim to import reviewed specialist quotes.

## Local review and tests

Run `npm run preview:rooms` at loopback `http://127.0.0.1:4348`. The preview has a conspicuous fixture banner, example-curtain/10-curtain controls and price/stock failure scenarios. It uses real existing production calculation code with labelled fixture supplier costs and stock, approved catalogue-image mappings, and ephemeral local signing. It loads no production credentials. Browse/Fabric Intelligence/Make Curtains navigation destinations are explicitly labelled local placeholders, not live integration tests.

- `npm run test:rooms`: 27 domain/store/contract/integration-guard tests.
- `npm run test:storefront`: 230 passing tests.
- `npx tsc --noEmit --incremental false`: passed.
- Shopify Liquid skill validation: all ten changed theme/template/assets/locale files passed.
- `npm run verify:rooms`: 21 local browser checks, no browser errors. Evidence: `artifacts/build-my-rooms-v1/browser-verification.json`.
- Browser checks: 1/3/10 refresh, real browser close/reopen with persistent profile, local navigation/back/forward, one room with multiple windows, multiple rooms, rename/add/remove, changed price, unavailable/non-commercial/out-of-stock, final empty state; desktop 1440 / 390 / 412 no overflow with 44px removal controls.
- Storage corruption/quota, cross-tab conflicts, stale/tampered receipt, compatibility, draft-rules rejection, cumulative stock and 1/2/10-line penny reconciliation are covered by isolated tests.

Screenshots: `desktop.png`, `mobile-390.png`, `mobile-412.png`, `review.png`, `changed-price.png`, `empty-mobile.png` in the same artifacts folder. All are local fixtures.

## Remaining release verification

Do not enable the flags or deploy incomplete functionality to live for preview. Outstanding: owner visual review; approved multi-snapshot extension; deployed full Make Curtains/Fabric Intelligence/Browse round trips and same-device identity continuity; real Shopify financial reconciliation and paid-review coverage; canonical-live diff reconciliation and Shopify-hosted rendering. No payment or manufacture action is authorised by this local build.

Customer Trust V1, canonical footer/policies, consent, Fabric Master, production ruleset, stock projection, compatibility, Guided Measure, existing payment/webhook and workroom gates must remain intact during any later scoped deployment.
