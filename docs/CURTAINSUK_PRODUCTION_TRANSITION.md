# Production transition — 14 September 2026

## Scope and deployment

No theme publication, payment-setting change, order creation, Merchant Center activation or supplier ordering was performed.

Gateway preview deployment: `dpl_XXvxZhbYX6KKCzW4kQYQkqxGZzUM`, alias `https://curtainsuk-staging-gateway.vercel.app`.
Dawn `182264234363` remains unpublished. Minimal `79650455661` remains live and is the rollback reference.

## Customer authentication

The public `/curtain-consultation` route reuses the existing HCI integration pinned to `41a9f3f`. It uses a server-generated, seven-day, Secure/HttpOnly/SameSite cookie with a namespaced HMAC. Customer ownership is isolated from staff ownership. Browser-supplied session IDs cannot adopt another visitor's consultation. The existing staff endpoints are unchanged.

Customer API requests retain IP and visitor rate limits, exact configured Origin validation, bounded JSON/image payloads and fail-closed service/database handling. HCI credentials and private service state remain server-side. Disabling `CURTAINSUK_HCI_CUSTOMER_ENABLED` disables this route independently of commerce.

Hosted checks: anonymous initial command 200 (1770 ms); different visitor/session 409; unapproved Origin 403; forged cookie 401; anonymous staff endpoint 401. Desktop, 390px and 412px consultation navigation worked. No horizontal overflow observed at either mobile width.

## Production checkout

Preview gateway is configured for `carpetup.myshopify.com`, `CALCULATE_ONLY`, and payment-disabled confirmation is explicitly false. Actual-store credentials are selected independently of the development-store credentials. Creating a production test draft additionally requires explicit actual-store payment safety confirmation; a development-store assertion does not authorize it.

Browser rehearsal preserved Sadira `pt-4262-770`, 180 cm coverage / 210 cm drop, pencil pleat, standard lining, pair, £601 VAT-inclusive goods and available stock. The attempted calculate-only checkout failed closed at `SHOPIFY_EXECUTION` with `SHOPIFY_DRAFT_ORDER_SCOPE_MISSING`.

Evidence: Vercel request `bj6kp-1789400796192-142c025f6df5`, diagnostic correlation `4f61e6ac-97ba-44bf-88a1-e3caa00be75c`, timestamp `1789400796192` milliseconds since Unix epoch. Required scope is `write_draft_orders`, already declared optional in the app configuration but not granted on this actual-store installation. No payment or Draft Order was created.

Actual-store Payments admin redirected to the CurtainsUK `madetomeasurecurtains` admin handle and explicitly showed Shopify Payments accepting payments and PayPal Active. These live settings were not changed.

## Indexing

Dawn canonical links now use `https://www.curtainsuk.com` with query strings removed. Unpublished/editor/visual-preview roles remain noindex. Remote homepage and configurator canonical/noindex checks passed. The existing staging switch remains ON because it also suppresses inherited purchase controls. Do not turn it off while the live-store payment boundary remains unsafe. Preview remains noindex even when this switch is subsequently disabled for production preparation.

## Validation and remaining blockers

Full npm tests passed; 24 focused regression/checkout tests passed; typecheck, local build and hosted build passed. Changed TypeScript files passed lint. Repository-wide lint still reports 22 errors in unchanged legacy/local files; these were not expanded into unrelated work.

BLOCKED: grant the actual-store app `write_draft_orders`, establish a genuinely non-payable actual-store test environment (Shopify Payments and PayPal are currently active), then rerun the production checkout and verify its exact invoice host before changing Dawn's configured checkout host. Retain all URL/idempotency/financial guards. Only then disable the coupled staging switch and verify indexable production semantics while Dawn is still unpublished. Publication requires the owner's subsequent instruction.

Do not treat the successful development-store orders as production-store verification. Do not treat these sampled healthy HCI/RPC requests as proof that a provider-wide intermittent incident has permanently ended.
