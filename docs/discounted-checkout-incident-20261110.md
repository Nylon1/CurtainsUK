# Discounted My Home checkout incident — 10 November 2026

## Live reproduction

The same four configured products totalled £1,382.90 without a code and reached Shopify payment. With WELCOME5, the displayed total was £1,314.40 including £12.95 delivery, but two checkout attempts failed with HTTP 400. No payment was submitted. The API log for those attempts recorded `MY_HOME_CHECKOUT_INVALID`, while the customer saw an unrelated cushion error.

The four products were Abeja Linen curtains, a Dunbar Gemstone cushion, an Abeja Linen Roman blind and a Forest Shuttle Go track. PR #371 had already been merged into `release/production` and deployed before this reproduction.

## Cause and change

Discounted checkout derives a persistence key prefixed `welcome-`, `so-` or `sc-`. The track and Roman persistence service passed that derived key into the guest owner hash, which only accepts a random UUID attempt. The service now retains the derived key for idempotent persistence and binds ownership to the original UUID attempt. The UUID validation stays strict.

The cart now retains the previous quote when an entered code fails, labels it as a previous quote, and disables checkout until the new quote succeeds. Accepted promotion and sample-credit codes are restored and revalidated after refresh. The summary sits below the Shopify sticky header and the narrow-screen Order now button remains visible through the footer, with space reserved for it.

## Verification and remaining release checks

The new regression test exercises all three derived-key prefixes and rejects an unbound non-UUID key. Smart-track, cushion, theme and TypeScript checks passed locally. The original release checklist is superseded by the live evidence below. A paid order remains on hold.

The 8–10-second review delay remains open. Product authorities run concurrently, then the combined curtain-and-cushion availability review runs after them; current timing data does not isolate which authority dominates the delay.

## Live verification and source of truth

PR #374 merged as `f3bf6addb93e6eb96ee6cb6e8514c222f6238a2e` and reached the production API and MAIN Shopify theme. The exact four-product WELCOME5 cart reached Shopify payment on the first click with £1,369.95 goods, £12.95 UK delivery, a £68.50 saving and £1,314.40 total. The curtain, cushion, Roman and motorised-track specifications were present. Guest checkout did not require sign-in. Returning and retrying used the same Shopify checkout URL; duplicate draft count was not independently checked in Shopify Admin. No payment or order was submitted.

An invalid code displayed a clear correction message and preserved the previous total; checkout remained disabled until WELCOME5 was reapplied. The valid code survived refresh and back navigation. Mobile scrolling to the footer and back did not cover content. A valid private sample-credit code was unavailable for a positive live redemption test.

PR #375 merged as `e7a83c770eda826bbb8fd0b8bd88cc77c6f314aa` and is the current live runtime source. The production API deployment is `dpl_CpYnqjxFe3MZNdzTSpZ573aojZ1K`; all three production aliases point to it. The two changed MAIN theme assets were read back byte for byte against the verified source. This follow-up corrected old curtain delivery wording, removed premature track checkout wording, and kept the desktop Order now button fixed while scrolling. The live four-item cart showed £1,382.90 before a code with a visible fixed Order now button.

The e7a83 export audited 11,565 tracked files. Exactly 146 published visualiser files used their manifest-matched CRLF bytes; the protected guard passed 8 packs and 3,859 files. The source receipt is `C:/Users/hamza/curtainsuk-pr375-source.receipt.json`. An unexpected `.env.local` in the older export was removed; future release packaging rejects extra files.
