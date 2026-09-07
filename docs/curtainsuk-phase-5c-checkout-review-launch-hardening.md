# CurtainsUK Phase 5C — Checkout architecture, staff review operations and launch hardening

Date: 7 September 2026  
Current working branch: `feature/curtainsuk-phase-5a-prelaunch`  
Commit: this report ships in the Phase 5C commit; the immutable SHA is recorded in the final handoff  
Environment: non-production implementation only

## Status and scope

Phase 5C now has a code-complete staging architecture for the three checkout gates, immutable configuration snapshots, private staff review operations, secured customer evidence, a signed Shopify app-proxy gateway, UK shipping rules, customer-safe order summaries, analytics events and catalogue-readiness gates.

The implementation deliberately cannot take payment or write a checkout/draft order to Shopify. Every handoff response fixes:

- `paymentEnabled: false`;
- `shopifyWritePerformed: false`; and
- `checkoutUrl: null`.

No production Shopify, Merchant Center or supplier-ordering action was performed while preparing this report.

The Phase 5C PostgreSQL migration is applied and verified in the dedicated CurtainsUK development project. The backend is deployed as a Vercel Preview and the Phase 5C Dawn files are on the unpublished theme. The Shopify app-proxy configuration exists as an unreleased app version and intentionally remains inactive: the app client secret observed during setup must be rotated before it can be placed in the staging secret manager. The Dawn preview therefore demonstrates a clear fail-closed service state rather than claiming an authenticated end-to-end configuration.

## Environment verification placeholders

| Surface | Current evidence | Phase 5C verification status |
| --- | --- | --- |
| Git | Working tree is on `feature/curtainsuk-phase-5a-prelaunch` | Branch verified; commit recorded at handoff |
| PostgreSQL | Supabase project `CurtainsUK` (`hqysjumypgeapgmqkcrx`), private `curtainsuk_private` schema | Migration dry-run and apply passed; schema, forced RLS, grants, RPCs and append-only controls verified |
| Backend | Vercel Preview deployment `dpl_Ex8kY5PNcJuEdzZiz68AWKX8G7t4`; stable staging alias `curtainsuk-staging-gateway.vercel.app` | Deployed; unsigned proxy returns 401 and direct legacy route returns 410 with `no-store` |
| Shopify app proxy | Path `/apps/curtainsuk-decision`; app version `curtains-uk-mtm-2` | Version created but deliberately **not released** pending client-secret rotation and live negative tests |
| Dawn theme | `CurtainsUK Phase 4A Dawn 16`, ID `182264234363` | Phase 5C files pushed; remains unpublished |
| Production theme | Minimal, ID `79650455661` | Confirmed still live after both Dawn pushes |
| Checkout/payment | Code and persisted handoff contract are hard-disabled | Verified: no payment/checkout control in the preview and no Shopify write path |
| Merchant Center / supplier ordering | No implementation path added | Remain disabled/untouched |

Applied migration: `20260907173321_curtainsuk_phase5c_checkout_review_operations.sql` (SHA-256 `1AF75BFE3DADD56CE0A21570C161C63187927F809B76BEE344C706F42610F233`). The Supabase SQL editor imposed a request-size boundary, so the file was executed at a safe top-level statement boundary in two ordered transactions: each part first passed with `ROLLBACK`, then passed with `COMMIT`. The committed schema matches the single checked-in migration.

## 1. Checkout gates

The server-authoritative gate is implemented in:

- `lib/storefront/checkout-gates.ts`;
- `lib/storefront/checkout-handoff-server.ts`;
- `lib/storefront/review-acceptance-token.ts`; and
- `lib/storefront/review-acceptance-token-core.ts`.

### `INSTANT_PRICE`

The server recalculates the configuration from the Fabric Master and pricing engine. It does not accept a browser-supplied selling total. A staging handoff is eligible only when:

- the net, VAT and gross values are complete, positive and arithmetically consistent;
- the fabric is current, storefront-selectable and price verified;
- calculated fabric metres are positive;
- customer-safe availability is `FABRIC_AVAILABLE` or `LIMITED_AVAILABILITY`; and
- an approved UK shipping rate exists for the server-derived parcel class.

The instant parcel class is derived on the server from calculated fabric widths; the customer cannot select a cheaper class.

### `PRICE_WITH_REVIEW`

The provisional VAT-inclusive price may be shown. The customer submits the project, staff create immutable amendments where necessary, record a final price, approve the review and mark the exact revision `READY_FOR_CHECKOUT`. The customer-facing handoff additionally requires a short-lived acceptance capability bound to the request and exact approved revision.

Supplier availability and pricing eligibility are re-evaluated at handoff time. If a staff amendment changes fabric, the final Fabric Master ID, supplier ID and SKU must resolve to the same record; the system does not evaluate availability against the original fabric while snapshotting an amended fabric.

### `MANUAL_QUOTE`

No numeric customer price exists before staff review. The customer submits the project, staff create a priced immutable revision, approve it, and mark that exact revision ready for checkout. Only then may the accepted final quote enter the staging handoff. A manual quote cannot reach checkout with a null/zero price or without review approval.

### Immutable staging snapshot

An eligible handoff persists an append-only snapshot containing:

- configuration, request and revision IDs;
- Window Type and measurements;
- Fabric Master ID and supplier SKU;
- heading, lining and pair/single construction;
- calculated fabric metres;
- pricing-rule version;
- net, VAT and gross customer price in GBP;
- customer-safe availability;
- delivery quote, separately identified from goods; and
- accepted/recorded timestamps.

Private-key validation rejects supplier cost, trade-price, raw-stock, margin, batch and dye-lot fields recursively. Later supplier price changes cannot mutate an existing snapshot.

## 2. Staff review dashboard and workflow

The private dashboard is under `app/admin/reviews`, backed by authenticated admin routes in `app/api/admin/reviews` and `lib/storefront/review-operations-repository.ts`.

It provides:

- queue counts, status filters, search and cursor pagination;
- request/customer/contact details;
- Window Type, measurements and configuration;
- customer-safe fabric and availability details;
- provisional and final pricing;
- evidence security/retention status;
- immutable revision history; and
- append-only review audit history.

Staff can:

- move a request to a permitted state;
- request more information;
- create a new specification/final-price revision;
- approve or reject a request; and
- mark an approved exact revision ready for later checkout.

Customer-submitted content is not overwritten. Amendments require the latest predecessor revision, an actor, a timestamp and a reason. Optimistic state/revision checks prevent a stale staff screen from silently replacing a newer decision.

The six states are exactly:

- `PENDING`;
- `NEEDS_INFORMATION`;
- `UNDER_REVIEW`;
- `APPROVED`;
- `REJECTED`; and
- `READY_FOR_CHECKOUT`.

Approval/checkout readiness requires a complete final price where applicable and canonical evidence that is clean, not deleted and not expired.

## 3. Customer evidence security

The implementation is in `lib/storefront/security/evidence-*`, the private evidence API routes, `lib/storefront/review-request-repository.ts`, and the Phase 5C migration.

### Upload controls

- private Supabase Storage bucket only;
- up to eight photos and one drawing;
- 3 MiB maximum per file;
- 3.8 MB aggregate evidence limit;
- 4,000,000-byte streaming request ceiling before multipart parsing, including when `Content-Length` is absent or misleading;
- allowlisted JPG/JPEG, PNG, WebP, HEIC/HEIF and PDF formats;
- filename, extension, declared MIME and magic-byte verification;
- SHA-256 content digest; and
- server-generated object paths with no overwrite.

Accepted objects are registered as `QUARANTINED`. They cannot be approved or retrieved until a configured scanner records `CLEAN`. A malicious verdict records `REJECTED`. Scanner errors, missing configuration and invalid responses leave the object quarantined; they never promote it.

### Staff retrieval and audit

Staff retrieval requires:

- an authenticated supplier-admin identity;
- a recorded access reason;
- `CLEAN`, current and undeleted evidence;
- a signed 60-second token bound to the evidence ID and staff actor; and
- private, `no-store` download delivery with `Content-Disposition` attachment and sandboxed content policy.

Access-token issuance, download, scanner result and deletion operations append audit events. Evidence-admin mutations require exact same-origin JSON requests in addition to staff authentication.

Deletion request/completion state and their audit records are atomic service-role-only database operations. Direct evidence/log DML is revoked. Storage deletion remains an external step and completion is retryable. Retention is configurable (180-day staging default); orphan planning uses a 48-hour grace period and cleanup is disabled unless explicitly enabled. Unknown-age objects fail safe and are not deletion candidates.

### Malware-scanner blocker

No real malware provider is active or claimed in this phase. The HTTP scanner adapter is configuration-gated and accepts only an HTTPS endpoint plus a server-side bearer credential. Until a provider is selected and configured, real uploads remain `QUARANTINED` and specialist approvals with evidence remain blocked.

Before accepting customer files, operations must:

1. approve a malware-scanning provider and data-processing/retention terms;
2. store its endpoint/token and scanner actor ID only in the deployment secret store;
3. deploy the configuration to the staging backend;
4. verify clean, malicious test-file, timeout and provider-error paths end to end; and
5. document alerting and manual recovery for long-lived quarantined evidence.

## 4. Signed Shopify app-proxy gateway

The first-party gateway is implemented at `app/api/staging/shopify-proxy/[operation]/route.ts`, with security helpers under `lib/storefront/security` and configuration in `shopify.app.toml`.

Supported operations are:

- `GET catalog`;
- `POST price`;
- `POST specialist-review`;
- `POST review-request`; and
- `POST checkout-handoff`.

The gateway:

- uses Shopify's canonical app-proxy query construction, including duplicate-value grouping;
- verifies HMAC-SHA-256 with a timing-safe comparison;
- rejects missing or duplicate signatures;
- requires an exact allowlisted `.myshopify.com` shop and app-proxy path;
- enforces a five-minute replay window by default, with bounded clock skew;
- applies a durable per-shop/operation/client-address rate limit and fails closed if the limiter is unavailable;
- validates method, content type and request size;
- returns customer-safe errors; and
- marks success and error responses `no-store`, `noindex` and `nosniff`.

The gateway does not rely on `Origin` as caller authentication. The Vercel-managed forwarding address is preferred for rate-limit fingerprints. Shopify proxy trailing-slash redirects are disabled so a valid signature is not lost through framework redirection.

The older direct Origin-only staging routes remain in the repository for the reference harness but now return HTTP 410 by default. They can be re-enabled only with `CURTAINSUK_LEGACY_STAGING_API_ENABLED=true`. That flag must be absent or false in every deployed staging/production environment, and the legacy routes should be removed after the final reference-harness migration.

### Shopify secret-rotation blocker

The Shopify app client secret previously used or observed during setup must not be treated as a launch credential. Rotate/reissue it before deploying the signed gateway. Do not place either the old or replacement value in source, Git, documentation, screenshots, logs or theme settings.

Required activation sequence:

1. rotate the client secret in the authorised Shopify app administration surface;
2. store the replacement only as `CURTAINSUK_SHOPIFY_APP_SECRET` in the staging deployment secret manager;
3. configure the exact allowed shop and path through server-side environment settings;
4. redeploy so no runtime retains the previous value;
5. revoke/retire the prior credential; and
6. run live valid-signature, tampered-signature, wrong-shop, wrong-path, expired-timestamp and replay/rate-limit tests.

No secret value is recorded in this report.

## 5. Staging Shopify checkout contract

The handoff mode is `SHOPIFY_DRAFT_ORDER_EXACT_PRICE`, matching the planned Shopify Basic server-side exact-pricing approach. Phase 5C only freezes and persists the contract. It does not call Shopify Admin APIs, create a draft order/cart, return a checkout URL, take payment or release manufacture.

When later enabled, the Shopify adapter must consume only the immutable approved snapshot. It must not recalculate an approved price from a later supplier cost, accept a browser total, use approximate price-band variants or create payment before a required review is ready.

## 6. Customer order-summary UX

The unpublished Dawn configurator now has a staging handoff summary for:

- Window Type and dimensions;
- fabric/design/colour;
- heading and lining;
- pair/single construction;
- customer-safe availability;
- VAT-inclusive goods price;
- delivery shown separately; and
- review/approval status where applicable.

Supplier costs, margin, raw stock, batches and dye lots are absent from the theme and public gateway payloads. The handoff copy explicitly states that payment is disabled.

Theme-preview verification confirms that the order-summary controls are present, the page has no horizontal overflow at 390, 412, 768 or 1440 px, all visible configurator controls are at least 44 px high, UK/GBP staging copy is correct, and no payment/add-to-cart control is rendered. Because the signed app version is unreleased, the catalogue call fails closed with a clear staging-service message and leaves the pricing button disabled. End-to-end instant/review summaries remain an activation test after secret rotation.

## 7. UK shipping and fulfilment

The staging model supports:

- `UK_MAINLAND`;
- `HIGHLANDS_ISLANDS`;
- `NORTHERN_IRELAND`; and
- `STANDARD`, `OVERSIZE` and `SPECIALIST` parcel classes.

International destinations are rejected. Delivery is always separate from curtain goods and never counts toward a goods minimum. Rates are deliberately draft/null by default, so unknown delivery cannot appear as free. A handoff remains blocked until an approved positive rate is supplied server-side. Specialist/review parcel class must be present in the approved revision; instant parcel class is server-derived.

Final regional rates, parcel thresholds, carrier/service rules and fulfilment SLAs remain business/operations decisions.

## 8. Production analytics

Customer-safe event names now cover:

- configurator started;
- Window Type selected;
- measurement completion and step completion;
- validation failure;
- fabric selected;
- sample intent;
- price displayed;
- review submitted;
- review approved (emitted from the private staff workflow as `curtainsuk_review_approved`);
- quote accepted; and
- checkout handoff reached.

`checkout_started` remains a defined future event but is not emitted because checkout is disabled. Event payloads use customer-safe IDs/context and do not include supplier cost, trade price, raw stock, batch or margin data.

Analytics destination/consent configuration and event-name normalization for the staff approval event must be confirmed before production.

## 9. Catalogue expansion readiness

No wider Sanderson or Prestigious import is performed by Phase 5C. A private, read-only `READY_FOR_BULK_IMPORT` report evaluates five gates:

- authorised imagery;
- current commercial prices;
- current lifecycle;
- merge-race protection; and
- database-clock validation.

Every passing gate must carry dated evidence and a source reference. Any failed or unknown gate yields `BLOCKED`. The Phase 5C migration adds database-clock rejection for implausibly future import/source-observation timestamps while preserving the existing optimistic merge and row-lock safeguards.

Verified development-database position:

- Prestigious has 32 colourways, all with imagery/current lifecycle, but only 3 with verified pricing and storefront eligibility. Expansion is blocked on the remaining price verification.
- Sanderson Design Group has 51 colourways (the pilot plus 50-record canary), 1 with imagery/current lifecycle/verified pricing and 1 storefront-selectable. The wider 9,680-record import remains blocked on authorised imagery, current prices and lifecycle evidence.
- Across the two suppliers there are 7 brands, 20 collections and 58 designs. Merge-race protection and the database-clock gate pass; commercial/content completeness remains fail-closed.

## 10. Accessibility and device QA

Static implementation and live preview checks include:

- 44 px minimum interactive targets (`min-h-11` / Dawn equivalents);
- explicit labels and error/status regions;
- visible keyboard focus styles;
- responsive queue/configurator layouts;
- disabled/loading states; and
- preserved browser-state handling already covered by the Dawn tests.

Browser checks passed at iPhone-sized 390 × 844, Android-like 412 × 915, tablet 768 × 1024 and desktop 1440 × 1000: no horizontal overflow and every visible configurator button, input, select and textarea met the 44 px target. An axe-core audit scoped to the custom configurator reported 0 violations, 10 passes and 1 incomplete colour-contrast assessment caused by the Shopify preview bar overlapping elements. The full-page audit additionally reported issues inside Shopify's preview-toolbar iframe; those are not theme-owned. Keyboard-only and real screen-reader announcement testing still require a human/device pass after the signed proxy is active.

## 11. Security and privacy verification

Static audit results:

- canonical Shopify signature implementation matches the published Shopify vectors used in tests;
- signature comparison is timing safe;
- shop, proxy path and timestamp are independently validated;
- ambiguous duplicate signatures fail closed;
- unsigned direct legacy requests fail closed by default;
- rate-limit service failure blocks the request;
- customer-safe catalogue projection is an explicit allowlist;
- checkout snapshots recursively reject supplier-commercial keys;
- no supplier-commercial key was found in non-test public route/theme code;
- public and staff responses are non-cacheable;
- staff evidence mutations are same-origin and authenticated;
- unscanned/scanner-error evidence remains quarantined;
- only clean/current evidence can be retrieved or approved;
- storage evidence is private and staff access is signed/audited; and
- no code path performs a production theme, checkout, Merchant Center or supplier-order write.

Operational checks completed:

- all five new private tables have RLS enabled and forced;
- `anon` and `authenticated` have neither private-schema usage nor table reads;
- `service_role` has read-only table access and uses narrowly granted write RPCs;
- immutable revision mutation was rejected by the live append-only trigger;
- the one pre-existing review request was migrated to one canonical immutable revision with no orphaned request;
- the evidence bucket is private;
- the deployed unsigned app-proxy request returns HTTP 401 with `no-store`/`noindex`/`nosniff` headers;
- the deployed legacy catalogue route returns HTTP 410 with the same safe cache/index headers; and
- the private admin route redirects unauthenticated users to login (the final response also forces `private, no-store`).

Checks still pending activation:

- app-proxy release and client-secret rotation;
- valid/tampered/replay request tests through Shopify's real proxy network;
- WAF/bot-protection tuning and sustained rate-limit observation;
- scanner integration; and
- authenticated staff runtime testing with a provisioned CurtainsUK staff identity.

## 12. Automated tests completed locally

Final local verification:

- `npm test`: 161 passed, 0 failed across the decision engine, supplier sync/intelligence/import, Fabric Master, Prestigious, storefront/security and Dawn contracts;
- `npm run test:storefront`: 67 passed, 0 failed;
- `npx tsc --noEmit`: passed;
- scoped Phase 5C ESLint: passed;
- `npm run build`: passed, producing 177 routes;
- Shopify Theme Check: passed with 0 errors and 10 inherited Dawn warnings across 7 files;
- Dawn JavaScript syntax check: passed;
- `git diff --check`: passed (line-ending notices only); and
- deployed HTTP negative checks: signed-proxy 401, legacy route 410, admin redirect 307.

The repository-wide `eslint --quiet` command still reports 21 pre-existing errors in unrelated legacy application areas (legacy posts/gallery/professional-workspace pages and existing assistant/lazy-loading components); Phase 5C files pass the scoped lint. The completed suite also verifies:

- signed-proxy security tests: official HMAC vectors, allowlists, replay window, duplicates and rate-key isolation passed;
- evidence tests: magic bytes/MIME/extensions/sizes, fail-closed scanner, retention/orphan plans and actor-bound retrieval tokens passed;
- multipart tests: absent and misleading `Content-Length` are stopped by the streaming cap;
- checkout tests: all three gates, immutable pricing, supplier-commercial rejection, exact review acceptance and server-owned shipping class passed; and
- theme contract tests included in the storefront run passed; and
- the database migration dry run, committed apply, schema/RLS/grant inspection and append-only negative test passed against the CurtainsUK project only.

## 13. Screenshots

Customer-safe screenshots are stored under `docs/screenshots/phase5c/`:

- `dawn-home-desktop.png` — window-first Dawn homepage at 1440 px;
- `dawn-configurator-desktop-fail-closed.png` — desktop configurator with the signed service deliberately unavailable and checkout absent; and
- `dawn-configurator-mobile-fail-closed.png` — the same safe state at 390 × 844.

They contain no customer evidence/contact details, supplier prices/stock, credentials, tokens, cookies or database keys. Staff review, approved-summary and end-to-end pricing captures remain pending until an authorised CurtainsUK staff identity and the rotated proxy secret are active; manufacturing a privileged screenshot bypass was deliberately avoided.

## 14. Remaining launch blockers

1. Rotate the Shopify app client secret, add the replacement only to the staging secret manager, then release/install the already-created `curtains-uk-mtm-2` app version and run live signature/replay tests.
2. Configure and operationally validate a real malware scanner; current fail-closed behaviour intentionally prevents evidence approval.
3. Approve the evidence retention/deletion operator, orphan-cleanup schedule and incident procedure.
4. Approve positive UK delivery rates, parcel classification rules and fulfilment SLAs.
5. Provision/verify authorised CurtainsUK staff identities and test the complete review/acceptance communication path with non-sensitive staging data.
6. Enable/tune Vercel WAF/bot controls and observe durable rate limiting through Shopify's real proxy network.
7. Complete authorised imagery, current prices and lifecycle evidence before wider Sanderson/Prestigious imports.
8. Complete human keyboard/screen-reader testing once the proxy is active.
9. Define the later Shopify Draft Order/cart write, customer notification and payment activation procedure; Phase 5C performs no Shopify commerce write.
10. Resolve unrelated repository-wide lint debt before adopting a full-repository zero-warning gate.

## Deliverable summary

| Requested deliverable | Phase 5C draft status |
| --- | --- |
| Checkout-gate implementation | Implemented and locally tested |
| Staff review dashboard | Implemented; authenticated staff-user QA pending |
| Six-state review workflow | Implemented and locally tested |
| Upload/security hardening | Implemented fail closed; real scanner pending |
| Shopify app-proxy/auth | Backend deployed and negative-tested; Shopify version unreleased pending secret rotation |
| Staging checkout contract | Implemented; payment and Shopify writes disabled |
| Order-summary UX | Implemented and previewed fail closed; live-data summary pending proxy activation |
| UK shipping framework | Implemented with draft rates; commercial approval pending |
| Analytics | Implemented customer-safe staging events; destination/consent QA pending |
| Device/accessibility | 390/412/768/1440 px passed; custom axe audit 0 violations; human AT pass pending |
| Catalogue readiness gates | Implemented and database-counted; both wider imports correctly blocked |
| Screenshots | Three customer-safe Dawn captures recorded |
| Branch/commit | Branch recorded; commit pending |

Phase 5C remains unpublished and non-production.
