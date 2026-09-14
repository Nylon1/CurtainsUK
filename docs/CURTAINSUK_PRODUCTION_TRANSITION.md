# Production transition — 14 September 2026

## Purchase activation preparation — owner approved, controls still OFF

Code commit `078aa93f7d430e80c10019adb7fd36480fa374d2` is pushed. Gateway deployment `dpl_52bwoMQdeshjwfvA6TFcWkJqrJSK` (`https://curtainsuk-staging-9u7nnyxkw-hamzas-projects-4ef62f35.vercel.app`) is on the existing gateway alias with explicit `CURTAINSUK_PRODUCTION_PURCHASES_APPROVED=false` and `CALCULATE_ONLY`. The first CLI attempt lacked the required explicit team scope and failed authorization; using the verified team succeeded. Only the storefront JS and configurator section were uploaded to live Dawn; its purchase setting was not changed. Production markup confirms production checkout presentation true, purchases false, and the www canonical. Standard Sadira 180 × 211 cm / pencil pleat / standard lining / pair returned £605 VAT-inclusive goods and Fabric available in the actual browser. Desktop and 390/412px retained exact `pt-4262-770`, no overflow and no visible checkout action. This was a pricing check, not a paid transaction or a claim that it reproduced the earlier £601 configuration.

Post-deployment anonymous HCI initialization returned 200 (8.907s for this sample), cross-owner adoption 409, foreign origin 403, forged cookie 401 and anonymous staff access 401. No 504/520 was observed. No order/payment was attempted and no purchase-completed event was fabricated. The server activation flag and Dawn toggle remain OFF pending the requested operator/process confirmation and concrete owner test-order/payment details. Do not report commercial launch complete from these preparation checks.

The owner's approval is recorded. The earlier non-payable operator rehearsal did not establish a payment-capable customer boundary: runtime modes, database receipts and browser validation were still test-only. This correction adds `CREATE_PRODUCTION_DRAFT`, requiring `CURTAINSUK_PRODUCTION_PURCHASES_APPROVED=true` and the exact `carpetup.myshopify.com` store. Verified test mode and live approval are separate; active payment providers must never be described as disabled. Production contracts retain exact prices/configuration, remove test/non-fulfilment labels and add exact Fabric Master identity. Only approved production hosts can receive a checkout capability. No automatic invoice-send, payment-completion or supplier-order mutation is added.

Migration `20260914171336_production_checkout_execution` is applied. Existing 14 receipts remain unchanged, production receipts remain zero, RLS remains enabled, anon/authenticated RPC execution remains denied, and service access remains allowed. A rollback-only database fixture verified production receipts, exact financials, wrong-store/test-mode rejection, duplicate reuse and immutability, with zero leftover fixture rows. The original immutable snapshots and permanent creation claims remain intact. Regression tests also cover lost accepted responses/concurrent requests and browser mode/host/activation guards. Full `npm test`, typecheck, changed-file lint and build passed.

At 17:01–17:04 UTC, the actual database confirmed Sadira Lagoon `4262/770` has a 14 September snapshot checked at 08:48:17 UTC, passes the effective-stock floor and is not discontinued. Prestigious coverage is one current SKU; Sanderson has no current rows and its latest run failed `NO_CURRENT_SUPPLIER_OBSERVATIONS`. That is not evidence of out-of-stock and must not become purchasable stale stock. Production shipping readback remains £12.95 Mainland / £19.95 Highlands and Islands / £19.95 Northern Ireland. Shopify admin shows Shopify Payments accepting payments and PayPal Active. Fresh production app identity/scope checks passed; the old rehearsal ledger returned `NO_NEW_DRAFT`, not a new production transaction.

Activation is pending confirmation of the named daily stock/confirmed-usage operator and a concrete owner transaction amount. Public controls and the gateway remain non-payable until the required gates are met. No genuine payment, completed order or purchase-completed feedback is claimed. Merchant Center, provider configuration and supplier ordering are unchanged. Dawn remains live and Minimal remains the rollback theme. The pre-change gateway rollback deployment is `https://curtainsuk-staging-qatfrilti-hamzas-projects-4ef62f35.vercel.app`.

Activation uses the production mode plus explicit server approval and the separate Dawn purchase-controls setting. Disable both server approval/mode and the theme control immediately if checkout integrity fails; do not revert the storefront unless the storefront itself is affected. Never reuse a development/test configuration as a new production order: retained receipts/claims must reject a cross-mode reuse and require a fresh customer configuration.

## Republication — storefront live, purchases disabled

On the owner's subsequent “Publish” instruction, Dawn `182264234363` was republished from clean tracked branch state `2c0c296de7c6db3b6f99c56d25144d1008406a69`. Shopify confirmed it live; Minimal `79650455661` remains the unpublished rollback reference. No application, payment-provider or purchase-control change accompanied publication.

Immediate cookie-free checks returned 200 with the live Dawn identity and no noindex on the homepage, Fabric Library, configurator and all ten measuring/fitting routes. The configurator server markup still sets purchase controls false. Browser checks confirmed the real measuring/fitting hubs at 390/412px without overflow and no preview bar. Live catalogue search returned the four Sadira colourways on one page. Fresh anonymous HCI initialization returned 200 (7.05s on this sample); cross-owner, foreign-origin, forged-cookie and anonymous-staff probes retained their expected 409/403/401/401 boundaries. No 504/520 occurred in these sampled checks. Earlier image/palette/five-direction/refinement/sample/Standard/Bay smoke results are recorded below; they were not misrepresented as a second full HCI run. The guide-specific publication defect is resolved.

STOREFRONT LIVE — PASS. HCI LIVE — PASS. SUPABASE — HEALTHY during the sampled checks. PURCHASE CONTROLS — DISABLED. Legacy staging copy remains the previously recorded non-blocking content issue. Real checkout still requires separate owner approval; no invoice, charge or supplier order was created. Local evidence: `Downloads/republish-route-checks.json`, `republish-auth-checks.txt`, `republish-theme-roles.json`.

## Guide routing closure — READY TO REPUBLISH

The production defect was **hidden Shopify Page records**, not missing pages, wrong handles or missing Dawn templates. All ten existing guide records were Hidden. `sections/curtainsuk-guides.liquid` contains a deliberately unpublished-only 404 fallback (`request.page_type == '404' and theme.role != 'main'`): it displayed guide content in preview without making the underlying route HTTP 200. On publication that fallback correctly stopped, exposing the hidden-page 404. Navigation used the correct URLs. The pages inspected in admin used Default page; Dawn's existing `templates/page.json` includes the guides section and routes by `page.handle`.

Only the following ten Page records were set Visible in Shopify admin. No title, handle, content, template, application code, theme asset, commerce setting or purchase control was changed:

| Handle | Shopify Page ID | Dawn HTTP status |
| --- | --- | --- |
| how-to-measure | 693640298875 | 200 |
| how-to-measure-standard | 693640331643 | 200 |
| how-to-measure-doors | 693640364411 | 200 |
| how-to-measure-bay | 693640397179 | 200 |
| how-to-measure-apex | 693640429947 | 200 |
| how-to-fit | 693640462715 | 200 |
| how-to-fit-standard | 693640495483 | 200 |
| how-to-fit-doors | 693640561019 | 200 |
| how-to-fit-bay | 693640593787 | 200 |
| how-to-fit-apex | 693640626555 | 200 |

HTTP verification followed Shopify's preview redirect with its preview cookie held only in memory. Every final response identified Dawn `182264234363`, role `unpublished`, status 200, server-rendered guide markup, no hidden-guide fallback, correct real-domain canonical and preview noindex. Separate cookie-free requests also returned 200 and identified live Minimal `79650455661`. This confirms Page visibility is store-wide while the premium guide presentation remains Dawn's existing template. Evidence: local `Downloads/curtainsuk-guide-http-proof.json` (no credentials/cookies).

Browser checks opened both hubs and all eight dedicated guides with the existing diagrams, cross-links and Make my curtains destinations. Configurator contextual help mapped Standard to standard; Patio/French Doors to doors; Bay to bay; Apex/Gable/Triangular to apex, preserving the exact window query and `pt-4273-217`. A Bay return rehearsal used 81/142/83 cm sections and 211 cm drop; after following Need help measuring and Make my curtains, every value and the exact fabric remained intact. Purchase controls remained `false`. No configuration submission or new price/order was needed.

Minimal remains live; Dawn remains unpublished. This fixes only the guide-routing blocker. Publication still requires the owner's instruction; purchase activation is not authorized.

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
