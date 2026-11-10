# Welcome offer release, 10 November 2026

The storefront arrival popup offers email signup for `WELCOME5` and a direct route to order fabric samples. The popup explains the separate personal 10% sample offer, curtain sample credit, and the one-per-order percentage-code rule. It appears once per browser, can be dismissed, and can be reopened from **Use welcome offer · 5%** in Design My Home cart. A successful Shopify newsletter signup reveals the code and saves it on that device. Guest checkout remains available.

The cart applies one promotion code at a time. `WELCOME5` saves 5% on product goods across curtains, Roman blinds, cushions and motorised tracks, including mixed carts; delivery is not discounted. The personal sample code retains its existing 10% and £150 conditions and cannot stack with WELCOME5. Eligible curtain sample credit may accompany either code. The first-order condition is intentionally a customer-facing welcome offer rather than a strict customer-history gate, as requested.

## Verification before release

- TypeScript compilation passed. The targeted My Home and offer suite passed 31 tests, including guest welcome review, exact draft-order amounts, mixed-cart retry, four product kinds, delivery exclusion, the unchanged personal offer, and the new private reservation migration. Wider storefront, cushion and smart-track suites passed 403, 202 and 16 tests; Shopify theme tests passed 18 tests.
- Shopify Liquid full-theme validation passed all six changed theme files; the only warning concerns an existing `scheme_classes` reference at `layout/theme.liquid:499`.
- Static browser previews at 320 × 568, 390 × 844, and 1440 × 900 kept the close control, email field, main action and sample link accessible. At 320px the dialog scrolls internally. A browser behavior smoke test passed first-landing display, dismissal persistence, cart-triggered reopening and signup-success code reveal.
- No live Shopify signup, production draft order, invoice, payment, or paid order was submitted by these local checks.

## Release order

1. Obtain the exact-current-head Nylon1 approval comment and pass both protected PR checks, then merge to `release/production`.
2. Apply `20261110054127_welcome_offer_sample_credit.sql` to the existing production Supabase project before deploying the new API. Verify the function is invoker-security and executable only by `service_role`; test its expected discount with a disposable or transactional sample grant.
3. Deploy the exact merged production API and verify guest WELCOME5 review and checkout handoff with disposable unpaid draft orders. Check curtains, Roman blinds, cushions, tracks, mixed carts, welcome plus sample credit, personal 10% replacement, delivery, and repeat requests. Delete only QA drafts.
4. Back up the current Shopify MAIN theme assets, then upload only the changed theme files: `layout/theme.liquid`, `snippets/curtainsuk-welcome-offer.liquid`, `assets/curtainsuk-welcome-offer.js`, `assets/curtainsuk-welcome-offer.css`, `assets/curtainsuk-my-home.js`, and `assets/curtainsuk-my-home.css`. Read back each changed asset and test popup signup, cart reopen, code application and mobile scrolling in the real theme.

Keep the current production theme live until the backend and database are verified. If the storefront release must be rolled back, restore those six backed-up theme files and the previous Vercel deployment. The private migration extends the existing function without changing its public grants.
