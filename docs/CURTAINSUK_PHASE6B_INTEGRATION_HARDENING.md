# Phase 6B — Integration hardening

Baseline: `3ed510cf30dc8c495620ef7f5bb741acdbc1ee14`, branch `feature/curtainsuk-phase-5a-prelaunch`. The Phase 6A theme, consultation presentation and commerce rules are preserved. No HCI service deployment, theme push/publication, payment enablement, supplier ordering or schema migration is part of this change.

## Historical checkout rejection

The original browser POST was HTTP 400, `Unable to process this request`, at **2026-09-13 10:29:58.497 UTC**. The Vercel record identifies `/api/staging/shopify-proxy/checkout-handoff`, so this was an application response, not merely a browser network failure. Original error details and a trace ID were absent.

The saved failed request has configuration `d0d6b9d7-0c83-49f0-80c6-18583e9c0adb`, accepted summary, Mainland and `SW1A 1AA`. Read-only private database inspection of its deterministic handoff `d7eb97c5-d838-5d05-83c1-9a2c1345a30e` found:

| Durable event | UTC |
| --- | --- |
| First handoff persisted | 10:38:32.085941 |
| Permanent Shopify creation claim | 10:38:34.083240 |
| `TEST_DRAFT_CREATED`, #D10 | 10:38:34.884950 |

These all belong to the successful retry (request recorded at 10:38:28.643 UTC). The checkout controller calls Shopify only **after** successful handoff persistence. Therefore the original failure was **before a successful handoff commit**, not Draft Order creation, an uncertain Shopify acceptance, or receipt persistence. There was no creation claim to release or duplicate order to repair.

The original 400 also differs from explicit proxy authentication/replay/rate-limit rejection statuses, and from ordinary unavailable-stock/shipping/review gate responses, which return a structured blocked result. Price-reconfirmation failure has a different customer message. A database/transport failure during Fabric Master, commercial, stock or shipping retrieval, or the handoff transaction itself, remains possible. **The exact original exception cannot be reconstructed from the retained evidence. No particular supplier, database operation or configuration defect is claimed as its cause.**

New request-local diagnostics identify validation, review, price/stock calculation, price confirmation, identity, commercial verification, stock snapshot, shipping, eligibility, immutable snapshot, handoff persistence, Shopify execution and receipt persistence boundaries. Only a generated request reference, static boundary and bounded error code enter private preview logs. No input, capability, customer details or commercial values are logged. Errors are rethrown unchanged; diagnostic failure cannot replace the original error. No retry, claim or financial guard changes.

## Hosted HCI boundary

`Dawn → staff-authenticated CurtainsUK route → server-only HCI transport` is prepared, **disabled**. Normal fabric/window, pricing, stock, shipping and checkout code does not import or call HCI.

- `CURTAINSUK_HCI_MODE=STAGING_INTERNAL` is the opt-in flag; absent/other values disable it. Both `CURTAINSUK_DEPLOYMENT_STAGE=STAGING` and `VERCEL_ENV=preview` are required. Production access remains denied.
- The reviewed `hci-release.ts` manifest additionally requires human-quality `READY` **and** a verified hosted service contract. Environment flags cannot override the committed BLOCKED verdict.
- Current inspected HCI source: `8efc9ce0f8d27775d4be2aff81ff39b682901d80`. The existing quality review explicitly says the human pilot is incomplete and the release is not quality-ready for a CurtainsUK integration trial. CI, scripted personas and a running local rehearsal do not constitute a human READY verdict.
- `CURTAINSUK_HCI_SERVICE_URL` and `CURTAINSUK_HCI_SERVICE_TOKEN` are server-only settings, with no `NEXT_PUBLIC_` equivalents. No real endpoint or credential is configured by this patch. Transport requires HTTPS, rejects embedded URL credentials/query tokens and redirects, has an eight-second deadline and a 32 KiB streamed response ceiling.
- Staff identity comes from existing server authentication. A stable namespaced digest identifies the owner to HCI; the browser cannot choose it. Token rotation does not change that owner. Raw staff identity and auth cookies are not forwarded.
- Requests contain only version, owner, pinned source, request ID, session ID, expected revision and a validated consultation action. No browser-authored command history, ranking inputs, price, stock or privileged catalogue access is accepted.
- Responses are reconstructed from a bounded presentation whitelist: consultation/profile, question/calibration reference, ranked exact Master IDs/SKUs, explanations and unknowns. Aggregate histories, debug/ranking internals, supplier images and credentials are discarded. Exact fabric presentation continues through the existing customer-safe catalogue.
- No automatic transport retry. The existing UI retains the request ID after a lost response. HCI must atomically scope sessions and request IDs to the server owner, enforce revisions, and return the original accepted response on replay. A conflict remains a conflict; no replacement session is silently created.

Before enabling: obtain the HCI repository's human-quality READY verdict for a full pinned commit; verify an authenticated hosted implementation of `curtainsuk-hci-service-v1`, owner/session isolation, durable request replay and the existing calibration asset contract; record reviewed evidence in the release manifest; then configure staging-only credentials and run live service contract tests. The current internal-pilot endpoint is not treated as a production API. No HCI endpoint has been deployed or its production gate bypassed.

## Verification and limits

Boundary tests cover disabled/unapproved/production denial, exact request replay, ownership, response projection, malformed identities, source drift, oversized responses, unavailable service and no fabricated fallback. Checkout diagnostic tests preserve the exact thrown object, single attempt and privacy, including logger failure. Existing storefront/commerce and theme tests remain in the full test run.

During browser verification a separate rate-limit dependency failure was captured: `/price` returned server-side 503 `ENDPOINT_RATE_LIMIT_UNAVAILABLE`, which Shopify's proxy rendered as storefront HTML 500. A later catalogue attempt had the same rate-limit failure; a subsequent catalogue request returned 400 `FABRIC_MASTER_DATABASE_OPERATION_FAILED`. These are not the historic checkout failure and are not evidence of out-of-stock or an invalid price. Reload/retry retained selections; all safeguards stayed closed during failure. Intermittent upstream database availability remains an operational reliability concern, rather than a reason to bypass guards.

Browser results and exact Draft Order readback are recorded in `artifacts/phase6b/verification.json`. Screenshots are in the same directory. Raw runtime logs, signed requests and private diagnostic material are excluded from Git.


### Remote non-HCI results

- **PASS — Desktop (1440 px):** Shop by Fabric, search, genuine Sanderson Painters Garden Violet/Crimson detail, standard window 200 × 220 cm, pencil pleat, standard lining, pair, current price/stock, Mainland postcode, Draft **#D11**. Goods **£1,105.00**, shipping **£12.95**, total **£1,117.95**, VAT **£186.33**.
- **PASS — Mobile:** Shop by Window, Bay sections 80/182/80 cm, drop 220 cm, full fabric library detour, exact same colourway, restored Bay context after refresh, pencil pleat, standard lining, pair, Northern Ireland postcode, Draft **#D12**. Goods **£1,657.00**, shipping **£19.95**, total **£1,676.95**, VAT **£279.50**. Configuration at 390 px; development checkout also inspected at 412 px.
- Both flows had **zero HCI requests and no HCI consultation context**. Both development checkouts explicitly said the store cannot accept payments and disabled Pay now. All nine prior Draft Order objects were unchanged in before/after readback.
- The existing bonded-interlining complexity condition was exercised and still required review (provisional price); it was not bypassed. This phase did not change its £5/m combined cost basis.
- **PASS — Validation:** full npm test suite, final storefront 133/133, focused hardening 7/7, TypeScript, build, changed-file lint and secret scan. No claim of repository-wide lint cleanup.
- **BLOCKED — Historical root cause:** original exception missing from retained logs; proven boundary is before successful handoff persistence.
- **BLOCKED — Operational reliability:** intermittent rate-limit/Fabric Master database dependency failures need investigation with retained provider diagnostics. Recovery was safe, but a successful retry is not a permanent fix.
- **BLOCKED — HCI activation:** human-quality READY and authenticated hosted service contract remain absent.

The Shopify preview toolbar iframe intercepted some automated pointer targets. Those actions used native focus/Enter on the actual control; the toolbar was not removed and this is not a physical-device touch certification. No UI redesign was performed.
