# CurtainsUK Phase 5D — Checkout and review rehearsal

Status: deployed to the signed staging gateway and unpublished Dawn theme. A Shopify Draft Order has deliberately not been created because current stock observations are stale and all nine delivery-rate cells remain unconfirmed.

## Staging Draft Order contract

The Phase 5C immutable configuration snapshot remains the only monetary input. The Shopify adapter builds one custom made-to-measure line item and one separately priced delivery line. It carries the configuration, fabric SKU, measurements, heading, lining, pair/single choice, fabric metres, pricing-rule version and review/quote reference. Supplier costs, margin, raw stock and batch data are rejected.

Before any test draft can be created, the adapter calls Shopify `draftOrderCalculate` and requires all of the following to match the immutable snapshot exactly:

- GBP presentment currency;
- tax-inclusive pricing;
- goods gross price;
- delivery gross price;
- VAT, including the delivery VAT allocation;
- zero discounts;
- final order total.

Any mismatch fails closed. Test drafts are tagged `CURTAINSUK_STAGING`, `DO_NOT_FULFIL` and `NO_REAL_PAYMENT`. The configuration ID returned with the displayed price deterministically derives the immutable snapshot and handoff IDs. Exact retry recovery checks the full stored snapshot before reusing it, and the stable handoff tag lets Shopify reconcile an ambiguous create response without creating another draft. The adapter contains no draft-completion or invoice-send mutation.

Execution defaults to `DISABLED`. `CALCULATE_ONLY` performs no Shopify write. `CREATE_TEST_DRAFT` requires an explicit `STAGING` deployment marker, the exact allowlisted `curtainsuk-dev.myshopify.com` checkout store and an explicit confirmation that real payments are disabled. Production store domains are denied even when the signed storefront proxy originates there.

The backend exchanges the server-only Shopify client ID and rotated app secret through Shopify's `client_credentials` grant. The short-lived Admin token is cached only in process memory and refreshed from the response expiry; it is never persisted, returned or logged. Both the grant's scope readback and `currentAppInstallation.accessScopes` must contain `write_draft_orders` before a calculation or write proceeds.

The implementation targets Shopify Admin GraphQL `2026-07`. Shopify documents `write_draft_orders` for calculation and creation, and documents the server-side client-credentials grant for an app acting on an organisation-owned store. Sources: [client credentials grant](https://shopify.dev/docs/apps/build/authentication-authorization/client-credentials-grant), [currentAppInstallation](https://shopify.dev/docs/api/admin-graphql/latest/queries/currentappinstallation), [draftOrderCalculate](https://shopify.dev/docs/api/admin-graphql/latest/mutations/draftordercalculate), [draftOrderCreate](https://shopify.dev/docs/api/admin-graphql/latest/mutations/draftordercreate), [DraftOrderInput](https://shopify.dev/docs/api/admin-graphql/latest/input-objects/draftorderinput), and [draftOrders](https://shopify.dev/docs/api/admin-graphql/latest/queries/draftorders).

## Customer acceptance and Dawn continuation

When staff mark an approved revision ready, the private review route can now generate a staging-only customer resume URL. `CURTAINSUK_STAGING_REVIEW_RESUME_URL` must be an explicit unpublished Dawn preview URL on an origin in `CURTAINSUK_STAGING_ALLOWED_ORIGINS`; there is no default customer URL. If it is missing, invalid or points outside the allowlist, the link remains blocked and the staff dashboard explains the exact configuration gap.

The resume capability is HMAC-signed, expires after 14 days and is bound to the request plus its exact latest revision. It is placed in the URL fragment rather than the query string, copied into tab-scoped `sessionStorage`, and immediately removed from the address bar. Dawn sends it only to the signed `review-acceptance` app-proxy operation. The server re-reads the durable review record, verifies the token against the latest revision and returns only the customer-safe specification, final VAT-inclusive price and simplified availability. It returns no customer PII, supplier price, margin, raw stock, batch or evidence data. Any later staff amendment invalidates the old link.

Both instant and reviewed journeys now render a `Continue to Shopify test checkout` link only when the backend reports a created or safely reused Draft Order, real payment remains disabled, and the invoice URL is HTTPS on the configured `curtainsuk-dev.myshopify.com` staging checkout host. Dawn never redirects automatically and does not render a link for disabled or calculate-only execution.

## Rehearsal results

The deterministic local rehearsal covers:

- Bay: customer submission → under review → staff amendment → approved → ready for checkout;
- Apex and Gable: submission → needs information → staff records follow-up → under review → evidence gate → approval;
- Manual Quote: no numeric customer price before staff quote, and no checkout before customer acceptance;
- immutable customer submission and linked staff revisions;
- actor, timestamp and reason requirements for every state change;
- immutable approved customer price after later supplier-cost, margin-rule or availability changes.

The focused checkout, security and catalogue rehearsal suite passes 31/31. It covers the Draft Order contract, exact calculation, create/reuse responses, price immutability, stable retry identity, Bay/Apex/Gable review state, Manual Quote suppression, actor/reason requirements, and revision-bound customer acceptance. The complete project suite is recorded in the Phase 5D launch report.

## Activated staging controls and remaining blockers

- The compromised app secret was rotated and revoked. Its replacement exists only as a sensitive staging environment value; it is absent from source, screenshots and reports.
- `curtains-uk-mtm-2` was released. Because released Shopify versions are immutable, a follow-on `curtains-uk-mtm-2-checkout` version added `write_draft_orders`; that scope was approved only on `curtainsuk-dev.myshopify.com`.
- The checkout adapter is hard-allowlisted to that development store. The production CurtainsUK store is denied as a Draft Order target.
- The unpublished Dawn review-resume route is configured in staging.
- A real Shopify-signed checkout request currently returns `BLOCKED`, performs no Shopify write and exposes no checkout URL because stock availability is stale and delivery is unconfirmed. This is the intended fail-closed result.
- An owner must confirm the nine VAT-inclusive UK delivery rates and refresh/approve supplier stock before the first remote Draft Order calculation.
- An authorised operator must then confirm the dev store cannot accept real payment before `CREATE_TEST_DRAFT` is enabled. The adapter will still refuse creation unless Shopify's tax-inclusive calculation exactly matches the immutable goods, VAT and delivery snapshot.

No live payment, Draft Order completion, invoice sending, live-theme publication, Merchant Center activation or production checkout change occurred.
