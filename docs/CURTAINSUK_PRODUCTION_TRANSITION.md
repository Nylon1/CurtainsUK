# Production transition — 14 September 2026

## Final gate closure update (supersedes the earlier blockers below)

The owner authorized one server-side production TEST Draft rehearsal without changing active payment providers. The actual installation now has `write_draft_orders`, verified by `currentAppInstallation.accessScopes`. No unrelated scopes were added. Store identity is `gid://shopify/Shop/25645514861`, `carpetup.myshopify.com`, primary host `www.curtainsuk.com`.

Indexing and purchases are independent: `curtainsuk_staging_mode=false` prepares production indexing; `curtainsuk_purchase_controls_enabled=false` suppresses cart access and both ordinary/reviewed checkout forms and handlers. Unpublished/editor previews still receive noindex from theme role. Existing inherited purchase buttons remain disabled. The server remains calculate-only and cannot return a payment handoff. These theme changes were uploaded only to Dawn `182264234363`; Minimal `79650455661` remains live.

Remote desktop/390px/412px checks confirmed canonical `https://www.curtainsuk.com`, preview noindex, no mobile overflow, and no visible checkout form even after Sadira produced its £601 price. Anonymous HCI and the isolation/origin/forged-cookie/staff-auth checks passed again. Full npm tests, targeted tests, changed-file lint and typecheck passed.

The operator-only `scripts/curtainsuk-production-draft-rehearsal.mjs` reads the existing immutable Sadira snapshot, uses the existing contract and exact-financial checks, and never requests an invoice URL. Its default is calculate-only. `--create` is allowed only after exact tax/total validation, uses a private durable claim to prevent duplicate retries, verifies repeated reads and immutable snapshot contents, then deletes only its exact labelled still-open test draft. It attaches no customer/email, sends no invoice and cannot complete an order. No customer route imports this script.

**Remaining blocker: production VAT configuration.** Actual Shopify calculation returns goods £601, shipping £12.95, total £613.95, `taxesIncluded=false`, VAT £0. The approved immutable configuration requires VAT £102.33 (£100.17 goods + £2.16 delivery). Production admin independently shows United Kingdom “Not collecting”, “Include sales tax in product price and shipping rate” OFF, and “Charge sales tax on shipping” OFF. The exact-financial guard stopped before creation. Therefore production Draft creation/idempotency/cleanup are NOT yet reported PASS; no production test draft was created or invoice sent.

Owner confirmation of the business's actual VAT registration/treatment and authorization for any store-wide tax changes is pending. Those changes would also affect live Minimal. Do not invent registration details, manufacture tax lines, relabel zero VAT as included VAT, or weaken the guard to produce a passing rehearsal. Payment providers remain unchanged. Publication and purchase activation remain prohibited.

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
