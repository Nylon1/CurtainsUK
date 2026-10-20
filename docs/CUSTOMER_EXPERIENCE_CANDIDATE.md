# Customer Experience candidate

This change is a review candidate based on protected `release/production` at
`922bc2849a4fe650581c058d502879e6a0e35518`. It is not a record of a live
publication.

## What staff can see

`/admin/error-centre` requires the existing staff review role. It shows
consented anonymous visit starts, page paths, cart additions, cart visits,
checkout starts, browser errors, slow-page and slow-API bands, popular pages,
broad arrival channels and a per-session timeline. Confirmed paid-order counts
come from the existing curtain, cushion and smart-track paid records. Mixed
orders are deduplicated by Shopify order ID. Paid orders are deliberately not
joined to anonymous browsing sessions.

Each new consented visit also sends one email through the existing Resend
dependency when the production sender, recipient and key are configured. The
private alert claim and provider idempotency key avoid duplicate mail for one
journey. Failed deliveries are visible on the dashboard; email delivery is
not guaranteed when the provider or connection is unavailable. Staff can
also enable browser notifications while the dashboard is open. It refreshes
every 15 seconds, with permission granted by staff in their browser.

## Collection and limits

The theme collector runs only after Shopify analytics consent. It stores a
random ID for this browser session in session storage and resets it after 30
minutes idle. The private database receives allowlisted paths and event names,
safe error codes, browser family, broad arrival category, timing band, theme
release label and request correlation ID. It never receives URL query strings,
referrer domains, search terms, form values, cart contents, measurements,
prices, IP addresses, raw user agents, raw error messages or personal identity.
The client stops and clears its session ID when analytics permission is
revoked. The database deletes events after 30 days.

The journey ends before Shopify hosted checkout. Server faults across Next.js
routes are captured with route templates and fixed codes. Handled 5xx failures
are also recorded at the signed Shopify app proxy (fabric search/detail, Room
Visualiser, Fabric Intelligence, pricing, samples, Design My Home and checkout
handoff), Fiona and Jane adviser gateways, direct Fabric Intelligence and
catalogue endpoints, Cushion Studio, Smart Track Studio and stock-admin
endpoints. The dashboard separates those service errors from browser reports,
and each server reference ID is also written to server logs for correlation.
Successful stock imports, supplier inventory changes and Shopify-hosted
checkout faults remain in their existing operational records; the new
dashboard reports an error when the site-facing request fails. It is not a
replacement for supplier audit or payment reconciliation.

Browser reports can be missed
when the network is offline, the browser blocks scripts or analytics consent
is declined. Counts are useful signals, not a census of every visitor. A new
visit means a new anonymous session, not a provably first-time customer.

Vercel's IP geolocation is not used for visitor regions because this endpoint
is behind Shopify's app proxy. Its geolocation headers may describe the proxy
rather than the shopper. An order-region aggregate can be considered from
existing verified delivery data in a separate scoped review, without joining
it to browsing journeys.

## Release sequence

1. Review and merge the candidate with the protected production checks and
   required exact-head approval.
2. Apply `20261020205026_customer_journey_error_centre.sql` to the existing
   Supabase project. Verify the private table, function and retention job.
3. Verify the three private Vercel Production settings configured on 20
   October 2026: `RESEND_API_KEY`, `CURTAINSUK_VISIT_ALERT_EMAIL` and
   `CURTAINSUK_VISIT_ALERT_FROM`. The new key has sending-only access to the
   existing verified Apex domain. The destination address and token are never
   committed to source. All prior environment entries were preserved. A new
   deployment is required before the current service can read these settings.
4. Publish the existing Vercel service from the exact protected commit.
5. Upload only the changed theme layout and new asset to the existing Shopify
   main theme. Preserve all existing settings and feature flags.
6. Test one consented visit, a declined-consent visit, a cart addition, a
   browser error and a slow-load signal. Confirm the staff view and browser
   and email notifications. Check Browse Fabrics, Room Visualiser, Cushion Studio, Smart
   Track Studio, advisers, Design My Home, sample ordering and checkout entry.

This candidate branch does not change deployment aliases, Shopify theme
settings or feature flags. The three new production email settings were added
separately, with existing settings preserved. The current Resend allowance is
100 emails per day and 3,000 per month; alerts beyond the allowance can fail
and will be visible in the private dashboard. There is no guarantee of
delivery during provider outages or once the allowance is exhausted.
