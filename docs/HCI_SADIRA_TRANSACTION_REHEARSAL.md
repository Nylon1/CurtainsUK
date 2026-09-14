# HCI Sadira transaction rehearsal — 14 September 2026

Continues `8876236` on `feature/curtainsuk-phase-5a-prelaunch`. HCI remains pinned to `41a9f3f`. No recommendation code or weights changed. Dawn remains unpublished and customer HCI disabled.

## Completed

Authenticated Webtex identified exact SKU `4262/770`, Sadira Lagoon, Rustic Persian. Aggregate Free Stock, current Cut Price ex VAT and sample availability were read at 08:48:17 UTC. The current cut price matched the existing approved basis. The private observation was ingested, validated and manually approved through `SupplierIntelligenceService`, then passed to `materialize_daily_stock`. `daily_stock_position` returned a fresh available state under the unchanged aggregate-minus-confirmed-usage rule. No batch details, reservations or supplier orders were used. The observation remains private and out of Git.

The existing HCI-origin configuration was retained:

- Consultation: `d8052224-4554-428c-9873-c94fefc665d4`
- Strategy: `overall` / Based on your taste
- Fabric Master: `pt-4262-770`
- Configuration: `026eb64d-170b-445d-8c4c-1578c7337725`
- 180cm coverage, 210cm drop, pencil pleat, standard lining, pair
- 11.8m manufacturing requirement, governed 500mm pattern allowance
- Pricing: `2.3.0-draft.1:curtainsuk-pattern-allowance-v1`

The desktop browser created **Draft #D13** (`gid://shopify/DraftOrder/1611445469558`) in **curtainsuk-dev.myshopify.com**:

| Component | VAT-inclusive amount |
| --- | ---: |
| Curtains | £601.00 |
| Mainland delivery, SW1A 1AA | £12.95 |
| Total | £613.95 |
| VAT included in total | £102.33 |

Shopify readback verified identity, heading, lining, pair, dimensions, pricing version, postcode and exact totals. The immutable private summary retains pattern provenance and the signed HCI consultation context. Customer line items contain no supplier cost, margin, supplier-stock quantity, batch or dye lot.

The actual Shopify checkout displayed “This store can’t accept payments right now” and a disabled Pay now button. No personal contact/address or payment data was submitted. The development-store plan was independently verified before Draft creation.

## Demonstrated integration defect and correction

The first attempt failed at `HANDOFF_PERSISTENCE`, before Shopify execution. The database rejected `patternAllowance` and `consultationContext` as unknown summary keys. No snapshot or Draft existed for Sadira after that rejection.

A rollback regression reproduced `Invalid or private checkout snapshot payload`. Two narrow migrations extend the existing summary allowlist and validate these fields:

- Only the exact 500mm default or 0mm no-match policy objects are accepted.
- Context accepts only five string fields, matching Fabric Master identity, known strategy, bounded policy version and an existing consultation session.
- Refined SHA-256 versions and the existing session-bound `initial:` version are supported.
- Unexpected/private nested fields, wrong identity, invalid session and altered allowance are rejected.

All existing price, review, shipping, commercial-expiry, immutable-history and access checks remain. Anonymous and ordinary authenticated roles still cannot execute the snapshot function. Regression inserts roll back. No schema table or new catalogue architecture was introduced.

## Browser and immutability checks

Desktop 1440px created the original Draft. Refresh/reprice and checkout recovery at 390px and 412px retained the same configuration, £601 goods, £12.95 delivery, £613.95 total and same handoff. Database readback confirms **one snapshot and one distinct Draft**, despite repeated requests. Actual document geometry was verified: 375px content width at 390px viewport and 397px at 412px, with matching scroll widths and no horizontal overflow. Screenshots were captured and visually inspected in the browser session. The Shopify checkout was inspected on mobile and desktop, including its expanded item/tax summary and disabled payment state.

The price-change simulation was process-local only: a newer supplier cost produced **£623.00 goods for a new calculation**. The original database snapshot and Shopify Draft were read before and after and were identical, remaining £601 goods. No invented supplier-price observation was written.

## Hosted latency

The unchanged hosted intelligence flow was rerun for five fresh sessions using the frozen room image and answers: **225/225 HTTP requests succeeded**, with the same selected-identity/order digest as the prior run:
`5e20eca33b4f4b8a3eaf38cd8271099b6f708013c9312b098abb414af765f4e1`.

| Operation | p50 | p95 |
| --- | ---: | ---: |
| Session start | 1.084s | 8.305s |
| Image processing | 2.957s | 5.285s |
| Palette edit/confirmation | 0.937s | 3.630s |
| Strategy generation | 2.280s | 2.797s |
| Refinement | 2.852s | 3.163s |
| Fabric detail hydration | 0.831s | 0.999s |
| Sample-intent persistence | 1.561s | 2.674s |

These are small-sample HTTP measurements including gateway persistence, excluding browser rendering. First start is a cold candidate, not an independently forced cold boot. A browser recovery exceeded the automation tool's 3-second wait limit and was visibly complete by the next observation at 8.804s; this is an observation interval, not an exact 8.804-second response or a meaningful p95. Initial Draft-creation timing was not captured precisely while investigating the persistence defect. No latency figures have been fabricated for those boundaries.

## Validation

- Staging SQL regression: valid refined/initial provenance persists; five malformed/private variants rejected; all fixtures rolled back.
- TypeScript no-emit and changed-script ESLint pass.
- 149 storefront tests pass, including existing stock-floor, checkout/idempotency, pricing and privacy tests.
- Current supplier evidence retained privately; no downloaded credentials or raw supplier stock in committed reports.
- Security advisor retains the expected informational RLS-without-policies notices for service-only tables and an existing leaked-password-protection warning. No new function access was granted. [Advisor explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

## Genuine remaining blockers

1. **Confirmed-order feedback:** Shopify denies completed-order reads because the development app lacks `read_orders`. Owner approval for a development-store-only optional scope was requested. No permission was expanded, no Draft was converted, no paid purchase event was fabricated, and no test Draft was deducted as confirmed real usage. After permission, verify a payment-pending test order and append its explicitly staging confirmation; do not label it paid.
2. **Daily refresh operation:** this exact stock observation is genuine and saved, but an unattended authorised supplier source for each morning's refresh still needs to be connected and validated. The materializer itself already exists.
3. **Customer HCI activation:** privacy/retention and human recommendation/UX approval remain required. The measured cold behaviour and refinement latency should be considered in that approval; this run made no ranking or warm-performance changes.

No Dawn publication, live payment activation, Merchant Center activation or supplier ordering occurred.
