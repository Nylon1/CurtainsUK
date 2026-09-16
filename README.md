# CurtainsUK

CurtainsUK is a made-to-measure curtain commerce and fabric-intelligence platform. This repository is the authoritative application source.

> **Critical:** Shopify is not the canonical fabric catalogue. Supplier evidence must pass through Fabric Master and CurtainsUK commercial rules.

## Authority map

| Domain | Authority |
| --- | --- |
| Code | `Nylon1/CurtainsUK` / `main` |
| Fabric catalogue | Supabase Fabric Master |
| Schema | `curtainsuk_private` |
| PT evidence | Authenticated Webtex |
| SDG evidence | Approved SDG sources |
| Commercial stock | CurtainsUK stock materialisation |
| Recommendations | Hybrid Curtain Intelligence (HCI) |
| Checkout/payment/orders | Shopify |
| Runtime | Vercel/runtime; verify exact project before changes |

Git is not a complete production backup. State also exists in Supabase, Shopify, supplier systems, HCI, runtime configuration and secrets.

## Architecture

```text
SUPPLIERS (Webtex / SDG)
        |
        v
SUPPLIER INTELLIGENCE
provenance -> validation -> approval -> freshness
        |
        v
FABRIC MASTER
supplier -> brand -> collection -> design -> colourway
media / retail profiles / stock
        |
        +------------------+
        |                  |
        v                  v
CURTAINSUK COMMERCE <--> HCI
facts / price / stock     consultation / recommendation
        |                  |
        +--------+---------+
                 v
        FABRIC INTELLIGENCE
                 |
                 v
        CURTAIN CONFIGURATION
                 |
                 v
        CONFIGURATION SNAPSHOT
                 |
                 v
        CONTROLLED SHOPIFY HANDOFF
                 |
                 v
              SHOPIFY
```

Suppliers provide evidence. Fabric Master establishes catalogue truth. Business rules establish commercial truth. HCI/Fabric Intelligence helps the customer decide. The configuration engine establishes what will be manufactured. Shopify executes commerce. Humans remain authoritative for business policy.

## Repository

Current source: `Nylon1/CurtainsUK`, branch `main`.

CurtainsUK was migrated from `Nylon1/Apexcurtains` / `feature/curtainsuk-phase-5a-prelaunch`. That branch is historical. Legacy Apex naming may remain in migrated metadata; do not broadly rename identifiers without checking runtime impact.

Stack: Next.js 16, React 19, TypeScript, Supabase, Shopify integration, Resend, Sharp, SheetJS/XLSX, PDF tooling and Tailwind/UI libraries.

## Fabric Master

Supabase project: `CurtainsUK`  
Project ref: `hqysjumypgeapgmqkcrx`  
Schema: `curtainsuk_private`

The private-schema boundary is deliberate; privileged access belongs server-side.

Canonical hierarchy:

```text
Supplier -> Brand -> Collection -> Design -> Colourway
```

Core tables include `suppliers`, `supplier_brands`, `fabric_collections`, `fabric_designs`, `fabric_colourways`, `fabric_retail_profiles` and `fabric_supplier_links`.

Observations/provenance are separate through `fabric_catalogue_import_runs`, `fabric_catalogue_observations` and `fabric_catalogue_merge_conflicts`. An observation is evidence, not automatically canonical truth.

September 2026 operational snapshot: ~13,148 colourways, 3,354 designs, 582 collections and 9,463 media assets; 9,680 SDG and 3,468 PT colourways. These are snapshots only. Newer persisted state wins.

## Supplier intelligence

Active authorities: Prestigious Textiles and Sanderson Design Group.

Infrastructure includes `supplier_sync_runs`, `supplier_snapshots`, `supplier_snapshot_batches`, `supplier_snapshot_prices`, `supplier_approval_policies`, `supplier_freshness_policies`, `supplier_validation_policies` and `supplier_promotion_events`.

```text
supplier evidence -> validation/policy -> Fabric Master -> commercial interpretation -> storefront
```

Never replace this with uncontrolled direct supplier-to-Shopify writes.

## Definitive business rules

These are owner-approved. Do not invent additional restrictions.

### Width
Use supplier **Full Width**. `140cm Full Width -> 140cm calculator width`. Do not require `usable_width`.

### Stock
Supplier stock evidence is current for **72 hours / 3 days**:

- Free Stock >=30m -> `AVAILABLE`
- Free Stock <30m -> `OUT OF STOCK — AWAITING SUPPLIER STOCK`
- evidence >72h -> `CHECK AVAILABILITY`
- absent supplier evidence -> unknown, **not zero**
- discontinued -> hidden/not orderable

Stock infrastructure includes `daily_stock_runs`, `daily_stock_snapshots`, `daily_stock_snapshot_history`, `daily_stock_usage`, `daily_stock_refresh_events` and `daily_stock_materialization_events`.

### Samples / curtains
Any `AVAILABLE` fabric automatically has a sample available and is eligible for made-to-measure curtains, subject only to genuine configuration/manufacturing constraints.

### Prices
Approved supplier prices remain valid until superseded. They do not expire with stock freshness. Never invent a price.

PT uses **STANDARD PRICE EX VAT**, not Cut Price.

## Intelligence layer

CurtainsUK separates factual commercial intelligence from recommendation intelligence.

**CurtainsUK/Fabric Master** determines supplier/SKU identity, discontinued state, stock/freshness, approved price, Full Width, retail/sample/curtain eligibility and the configuration being purchased. These are evidence/rule-driven facts, not generative guesses.

**HCI** (`Nylon1/Hybrid-Curtain-Intelligence`) owns consultation: customer/room understanding, aesthetic and colour reasoning, practical requirements, shortlist generation and preference refinement. CurtainsUK has explicit HCI contract/context/session boundaries. HCI may recommend and explain; it must not override commercial truth.

**Fabric Intelligence™** is the customer-facing combination of catalogue intelligence and guided discovery: Three Ways to Find Your Fabric, Colour Intelligence, Tonal/Complement/Contrast, 60–30–10, inspiration-led discovery and conventional browsing.

## Learning loop

```text
discover -> recommend -> react -> refine -> choose -> sample/configure -> purchase -> learn
```

Explicit likes/dislikes and reasons are strong signals. Views, shortlists, samples, configurations and purchases are useful but contextual signals. Learn reusable characteristics—colour family/temperature, contrast direction, pattern character/scale, texture, sheen, formality, softness, luxury character, performance and budget sensitivity—not just SKUs.

Learning may change ranking, shortlist composition, alternatives, discovery order, explanations and follow-up questions.

Learning must never independently change SKU/supplier/collection/design identity, Full Width, supplier stock/time, stock rules, approved price, tax logic, discontinued state, image identity, manufacturing formula, shipping, checkout totals or historical evidence.

Evidence classes should remain distinct where practical: `SUPPLIER VERIFIED`, `CURTAINSUK DERIVED`, `AI INTERPRETED`, `CUSTOMER STATED`, `BEHAVIOUR INFERRED`.

**Learning may change what we recommend. Learning must not change what is true.**

## Retail and media

Canonical existence does not equal storefront eligibility. `fabric_retail_profiles` separates known, browsable and orderable fabrics.

Media uses `fabric_media_assets`, `fabric_media_mappings` and `fabric_media_checkpoints`:

```text
supplier source -> exact SKU validation -> permanent asset -> Fabric Master mapping -> storefront
```

Never hotlink temporary authenticated supplier URLs. Preserve verified images. One supplier image may legitimately map to multiple SKUs when the supplier explicitly associates it; image uniqueness is not an identity rule.

## PT / Webtex runbook

Authenticated Webtex is the authorised PT commercial source.

```text
collection -> products/colourways -> exact SKU -> direct DOM fields -> validation -> checkpoint -> Fabric Master
```

Capture exact identity and, where supplied, collection/design/colourway, Full Width, Standard Price ex VAT, Free Stock, image and discontinued/product state.

Rules:

- direct DOM reads are the established method;
- use bounded readiness/retry for slow fields;
- maximum established concurrency: **3 workers**;
- five workers previously caused browser-control timeouts;
- checkpoint frequently;
- resume from newest persisted state, not old chat counts;
- do not unnecessarily reprocess completed collections.

Routine isolated failures, missing/placeholder images, wallpaper/non-fabric and discontinued products -> queue/skip and continue.

Global stop only for: Webtex authentication/access failure; systemic extraction failure across multiple records/collections; or evidence of wrong SKU-to-data association.

Image rules: verified exact-SKU -> KEEP; missing + exact source -> ADD; broken/unverified + exact source -> REPLACE; identity conflict/placeholder -> exception.

Regression controls:

- Heidi Graphite `3526/912`: Annika, width 140cm, Standard Price ex VAT £24.40/m; historical verified stock observation 101m.
- Demi Canvas `8838/142`: Pippin, width 144cm, Standard Price ex VAT £10.40/m; historical verified stock observation 260m.

Historical stock is test evidence, not a current-stock claim.

Authorised Webtex catalogue imports were persisted on 16 Sep 2026 with `shopify_writes = 0`, confirming supplier ingestion is separated from Shopify commerce.

## SDG

SDG already has substantial catalogue/price/stock ingestion. Do not redo completed bulk work without new evidence or a defined defect. Historical stock ingestion included 7,071 exact records. Absence from a later file is not automatically zero. Approved prices remain valid until superseded.

## Catalogue protection

Preserve provenance: supplier, source, observation time, import and SKU. Do not duplicate canonical colourways because formatting, whitespace, ordering, collection spelling or imagery changed. Genuine identity conflicts belong in merge/conflict handling, not silent newest-value-wins updates.

## Configuration and checkout

```text
Fabric Master -> validated commercial state -> configuration
-> configuration snapshot -> checkout handoff -> execution
-> draft creation -> Shopify
```

Persistence includes `staging_configuration_snapshots`, `staging_checkout_handoffs`, `staging_checkout_executions`, `staging_draft_creation_claims` and `staging_shopify_proxy_replay_receipts`.

Snapshots can retain canonical fabric and supplier-price evidence. Never bypass checkout gates, server-side handoff or idempotency.

## Shopify themes

Latest handover state:

- **CurtainsUK New Design – Live Base** `182310502779`: UNPUBLISHED at handover; production-candidate base copied from genuine live theme.
- **Updated copy of Dawn** `182264136059`: design donor/reference only; do not develop further.

Never replace/publish over the current live theme without explicit approval. Reverify Shopify state immediately before publication.

## Runtime, secrets and security

The exact CurtainsUK Vercel project was not visible through the account connection used during the Sep 2026 review. Do not invent a project ID; verify linkage before production changes.

Never commit Supabase privileged credentials, Shopify credentials, HCI secrets, supplier authentication, Webtex credentials or email/runtime secrets.

Schema changes must be deliberate and migration-backed. Inspect `curtainsuk_private` before creating anything. Do not weaken access controls to fix development permission problems.

One heavy aggregate query during the Sep 2026 review produced a PostgreSQL temporary-workspace `No space left on device` error while smaller queries continued. If it recurs, inspect resource health and query cost rather than repeatedly retrying expensive cross-products.

## Testing and release

Automated suites cover decision engine, supplier sync/intelligence/import, Fabric Master, Prestigious, storefront and Shopify theme integration.

```bash
npm test
npm run build
npm run lint
```

Inspect current `package.json` for supplier/catalogue scripts. A passing build alone is not a release: consider database compatibility, environment variables, Shopify/HCI integration, relevant tests, customer journey and rollback. Shopify theme publication is a separate production action.

## Recovery

For an interrupted supplier import: inspect the newest persisted checkpoint and import runs; establish the last committed batch; resume after the confirmed point; rely on duplicate protection for unavoidable overlap; do not replay completed collections unnecessarily.

If authentication expires, stop, restore authorised access and resume. Do not substitute an unapproved source for commercial fields.

If price/stock/image data may be attached to the wrong SKU, **stop the run**, preserve checkpoint/log/import identifiers and investigate. Isolated bad records should instead be quarantined while healthy processing continues.

Git restores code, not Fabric Master data, Shopify orders/state, supplier sessions, runtime secrets or all deployment configuration. Fabric Master recovery must preserve identity, observations, provenance, prices, stock history, media mappings, configuration snapshots and operational history—not merely re-scrape current supplier websites.

For Shopify theme work, always preserve a rollback path to the known working theme.

## AI/Codex guardrails

Before changing anything, determine which system is authoritative and inspect persisted state.

Do not repeatedly re-audit settled rules without evidence they changed. Do not invent technical complexity such as mandatory `usable_width`, separate sample-stock gates, automatic price expiry or zero stock from missing evidence.

Do not destructively “clean up” unknown tables, historical records, verified images, catalogue identities, migration history or operational identifiers before understanding why they exist.

For individual bad supplier records: **quarantine and continue**. For systemic identity risk: **stop**.

Chat/handover counts may be historical. Newer persisted state wins.

If an engineering choice changes business policy—stock threshold/freshness, price source, sample eligibility, exclusions, manufacturing calculations or live theme publication—ask the business owner rather than silently turning an assumption into company policy.

## Operating principle

**AI recommends. Fabric Master establishes facts. CurtainsUK rules establish what can be sold. The configuration engine establishes what will be manufactured. Shopify executes the transaction. Humans set business policy.**
