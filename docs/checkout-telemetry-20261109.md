# Checkout telemetry: 9 November 2026

## Production baseline before this change

Shopify Analytics reported 1,547 human sessions in the preceding 30 days, 22
sessions with native cart additions, 28 sessions reaching checkout and two
completed checkouts. The 9 November checkout count includes release QA. These
figures do not describe a single made-to-measure funnel: the site creates draft
invoice checkouts outside Shopify's native cart.

Shopify listed ten unrecovered abandoned checkouts since 10 October, all for
samples, home visits or Palm House products. Shopify records an abandoned
checkout only after contact details are entered. The list therefore misses
earlier checkout exits and cannot establish where made-to-measure buyers stop.

The private customer journey ledger recorded 41 native cart views, eight native
cart additions and zero checkout-start events over 30 days. On the made-to-measure
cart, ten anonymous journeys had 64 API requests over five seconds, and four
journeys had API network failures. These are consented browser events, not a
verified human population; QA and automated visits can be present. Two 503
Cushion Studio service errors on 9 November coincided with release QA. None of
this proves a cause for the lack of orders.

## Measurement added

- The existing consented, private customer journey store records configured cart
  view, review ready/blocked/failed, Order now, handoff ready/failed and checkout
  return. It records only a fixed product combination such as `CURTAIN_ROMAN`.
- A Shopify Customer Events custom pixel records checkout entry, contact,
  address, shipping, payment submitted and checkout completed. It submits the
  checkout token and event ID over TLS to the receiver, which immediately HMACs
  both before storage. The database retains only the HMACs, fixed stage and
  product combination, price totals, a discount-present flag and a QA flag.
- The Customer Experience staff dashboard displays distinct anonymous journeys
  and distinct checkouts by step, plus the last observed step of sequences idle
  for at least 24 hours. The two streams are not yet individually joined.
- Both stores retain events for 30 days. The pixel requires Analytics permission
  only. It sends no name, email, phone, address, fabric, measurements, URL,
  discount code or payment details. Tracking is asynchronous and cannot block
  the order.

## Release order and verification

1. Merge the reviewed PR through the protected `release/production` checks.
2. Apply `20261109131646_checkout_stage_telemetry.sql` to Supabase project
   `hqysjumypgeapgmqkcrx`. Verify the table's private grants, RLS, index and
   retention job.
3. Deploy the exact protected source to the established production Vercel API
   aliases. Verify an unauthenticated staff report is denied and a synthetic
   `isTest: true` checkout event is accepted, deduplicated and excluded from
   normal report counts.
4. Compare both changed theme assets with the current MAIN theme, back them up,
   and upload only `customer-journey.js` and `curtainsuk-my-home.js` to theme
   `182339731835`. Read back the exact assets.
5. Create the `shopify-pixels/checkout-funnel.js` custom pixel under Shopify
   Settings → Customer events. Set its privacy permission to **Analytics only**,
   connect it, and verify its live status with Shopify Pixel Helper.
6. With Analytics permission, exercise a guest curtain and a mixed cart through
   checkout entry without payment. Mark QA storage with
   `sessionStorage.setItem('cuk_qa_telemetry','1')`. Confirm cart steps and pixel
   stages persist as QA and are excluded from the staff funnel. Clear the QA
   flag afterwards. Verify consent denial sends nothing.

The prior request to hold a paid test remains in force. Without a completed
purchase, `CHECKOUT_COMPLETED` is verified by contract tests and future real
orders only. A missing completion event can also reflect consent changes,
blocked pixels or a later purchase; it is an investigation signal, not proof of
an abandoned customer. Checkout tokens can be absent from Shopify events, in
which case the pixel skips that event rather than merging unrelated checkouts.

Rollback disables the custom pixel, restores the two backed-up theme assets and
returns the production API aliases to the preceding deployment. Leave the
private additive table for retention to clear; no commerce data is changed.
