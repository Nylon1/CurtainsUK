# Discounted My Home checkout incident — 10 November 2026

## Live reproduction

The same four configured products totalled £1,382.90 without a code and reached Shopify payment. With WELCOME5, the displayed total was £1,314.40 including £12.95 delivery, but two checkout attempts failed with HTTP 400. No payment was submitted. The API log for those attempts recorded `MY_HOME_CHECKOUT_INVALID`, while the customer saw an unrelated cushion error.

The four products were Abeja Linen curtains, a Dunbar Gemstone cushion, an Abeja Linen Roman blind and a Forest Shuttle Go track. PR #371 had already been merged into `release/production` and deployed before this reproduction.

## Cause and change

Discounted checkout derives a persistence key prefixed `welcome-`, `so-` or `sc-`. The track and Roman persistence service passed that derived key into the guest owner hash, which only accepts a random UUID attempt. The service now retains the derived key for idempotent persistence and binds ownership to the original UUID attempt. The UUID validation stays strict.

The cart now retains the previous quote when an entered code fails, labels it as a previous quote, and disables checkout until the new quote succeeds. Accepted promotion and sample-credit codes are restored and revalidated after refresh. The summary sits below the Shopify sticky header and the narrow-screen Order now button remains visible through the footer, with space reserved for it.

## Verification and remaining release checks

The new regression test exercises all three derived-key prefixes and rejects an unbound non-UUID key. Smart-track, cushion, theme and TypeScript checks pass locally. The production API and MAIN theme still require deployment and a fresh live four-product checkout check before this incident can be closed. Verify £1,314.40 at payment, repeat with a fresh cart, and confirm retry does not create duplicate drafts. Test invalid and valid codes, sample credit, desktop and mobile scrolling, and the final Shopify total. A paid order remains on hold.

The 8–10-second review delay remains open. Product authorities run concurrently, then the combined curtain-and-cushion availability review runs after them; current timing data does not isolate which authority dominates the delay.
