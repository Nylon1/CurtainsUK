# Production transition — 14 September 2026

## Publication smoke check — rolled back

Owner authorized publication of verified Dawn `182264234363` at branch commit `5d999c83fa2880c936f9409bf6c743e91dd8a28b`, with purchases disabled. The tracked working tree was clean; fresh remote settings confirmed indexing prepared and purchase controls false. Shopify publication succeeded and live theme roles were verified. Minimal `79650455661` was preserved.

**BLOCKED: `https://www.curtainsuk.com/pages/how-to-measure` returned the storefront's 404 / Page not found when opened from Dawn's main navigation.** Following the owner's rollback instruction, Minimal `79650455661` was immediately republished. Shopify confirmed rollback and the real-domain homepage rendered the original Minimal navigation again. Dawn is no longer the live storefront. The remaining smoke matrix was stopped rather than claiming an uninterrupted pass.

Before rollback, live checks passed for homepage/canonical (www domain, no production noindex), anonymous image-first HCI, licensed room-image analysis, adding white to the confirmed palette, questions/calibration, all five direction headings (Tonal & calm correctly unavailable for this evidence), one refinement, exact Varini Woodrose `pt-4273-217` sample/detail/configurator handoff, Standard £538 and Bay £806 VAT-inclusive goods calculations. Bay used 80/140/80 cm sections and no angles or staff approval. Availability remained honestly unconfirmed; checkout forms stayed hidden and purchase controls false. HCI shortlist rendered without overflow at 390/412px; configurator checks had no overflow. Fresh hosted auth probes returned 200 for anonymous initialization, 409 for cross-session adoption, 403 for foreign origin and 401 for forged cookie/anonymous staff. No 504/520 was observed during these sampled requests; this is not a claim of permanent provider stability.

Other observed non-blocking content debt: the announcement, hero and configurator still display legacy staging/private-preview wording. No application changes or safeguard weakening were made during publication. No purchase activation, invoice, order, payment-provider change, Merchant Center activation or supplier automation occurred. The only writes during the smoke journey were test consultation/palette/reaction/sample-intent/configuration events; they are test activity, not customer quality feedback or sales.

Next: resolve the production measuring-page 404 and check the fitting/Apex guide destinations, then rerun the bounded live smoke check under renewed publication instruction. Real checkout approval has not been requested because this run was not clean. The earlier READY status below describes the pre-publication gate and is superseded by this rollback result.

## Final gate closure update (supersedes the earlier blockers below)

The owner authorized one server-side production TEST Draft rehearsal without changing active payment providers. The actual installation now has `write_draft_orders`, verified by `currentAppInstallation.accessScopes`. No unrelated scopes were added. Store identity is `gid://shopify/Shop/25645514861`, `carpetup.myshopify.com`, primary host `www.curtainsuk.com`.

Indexing and purchases are independent: `curtainsuk_staging_mode=false` prepares production indexing; `curtainsuk_purchase_controls_enabled=false` suppresses cart access and both ordinary/reviewed checkout forms and handlers. Unpublished/editor previews still receive noindex from theme role. Existing inherited purchase buttons remain disabled. The server remains calculate-only and cannot return a payment handoff. These theme changes were uploaded only to Dawn `182264234363`; Minimal `79650455661` remains live.

Remote desktop/390px/412px checks confirmed canonical `https://www.curtainsuk.com`, preview noindex, no mobile overflow, and no visible checkout form even after Sadira produced its £601 price. Anonymous HCI and the isolation/origin/forged-cookie/staff-auth checks passed again. Full npm tests, targeted tests, changed-file lint and typecheck passed.

The operator-only `scripts/curtainsuk-production-draft-rehearsal.mjs` reads the existing immutable Sadira snapshot, uses the existing contract and exact-financial checks, and never requests an invoice URL. Its default is calculate-only. `--create` is allowed only after exact tax/total validation, uses a private durable claim to prevent duplicate retries, verifies repeated reads and immutable snapshot contents, then deletes only its exact labelled still-open test draft. It attaches no customer/email, sends no invoice and cannot complete an order. No customer route imports this script.

**READY TO PUBLISH — PURCHASE CONTROLS DISABLED.** The owner confirmed VAT. UK collection was then verified active; initially Shopify added £122.79 on top, giving £736.74. The authorized store-wide “Include sales tax in product price and shipping rate” setting was enabled and saved. No registration details were invented and no payment provider was changed. Shopify now calculates `taxesIncluded=true`, goods £601, delivery £12.95, total £613.95 and included VAT £102.33 (£100.17 goods + £2.16 delivery), exactly matching the approved immutable configuration.

At `2026-09-14T16:17:24.137Z`, production TEST Draft **#D1**, `gid://shopify/DraftOrder/1578438427003`, completed verification and deletion. This is the actual production-store rehearsal, not an earlier development-store draft. Fabric Master `pt-4262-770` (Sadira Lagoon), configuration `c61bd8c1-0068-42d7-b5db-fa3eb7a999f7` and snapshot `1e4a3a48-72f8-5087-8f5a-0bf6c229da53` were preserved. Exact financials and configuration/line attributes passed. Repeated reads and the original snapshot digest proved immutability. A second operator invocation returned `NO_NEW_DRAFT`, proving the private rehearsal ledger prevented duplicate creation. Cleanup verified the draft was absent. No invoice was sent, no payment URL was requested/exposed, no order was completed and no supplier order was triggered.

Fresh anonymous HCI/security probes passed. The theme list still identifies Minimal `79650455661` as live and Dawn `182264234363` as unpublished. The remote configurator still has purchase controls `false`, both checkout forms hidden with `display:none`, the production-domain canonical, preview `noindex, nofollow, noarchive`, and no horizontal overflow. Earlier desktop/390px/412px regression checks remain applicable: this closure changed only the authorized Shopify tax setting and this report, not application code. Private evidence/ledger remain outside Git. The customer gateway remains `CALCULATE_ONLY`; this operator-only proof does not enable a customer payment handoff. Publication and purchase activation remain prohibited until separately instructed.

## Historical transition evidence (superseded by final closure above)

The sections below record the earlier investigation and its then-current blockers; they are not the current gate status.

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
