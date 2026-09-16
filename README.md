# CurtainsUK

CurtainsUK is a made-to-measure curtain commerce and fabric-intelligence platform. This repository is the authoritative application source.

> **Critical:** Shopify is the current customer-facing storefront and commerce platform. Supabase Fabric Master is the canonical fabric catalogue. The Next.js/Vercel application is supporting intelligence/application infrastructure, not a second production storefront.
>
> **Before doing development work, read [`docs/CURTAINSUK_PROJECT_LEDGER_2026_09_16.md`](docs/CURTAINSUK_PROJECT_LEDGER_2026_09_16.md).** It records what is DONE + PROVEN, built but not fully proven, partial, superseded, and genuinely still outstanding. Do not rebuild or re-audit completed work without new evidence.

## Current architecture decision — September 2026

CurtainsUK remains **Shopify-first**.

- **Shopify** owns the customer-facing website/theme, cart, checkout, payments, customer commerce and orders.
- **Supabase Fabric Master** owns canonical fabric identity and validated catalogue/commercial evidence.
- **CurtainsUK Next.js/Vercel infrastructure** supports supplier intelligence, administration, APIs, decision/configuration services and other application capabilities. It is **not the current production customer storefront**.
- **HCI / Fabric Intelligence** provides recommendation and decision intelligence.
- The existing live Shopify site remains untouched while the new Shopify theme is developed and validated.
- Production-candidate theme: **CurtainsUK New Design – Live Base**, theme ID `182310502779`; unpublished at the last verified checkpoint.

A headless Next.js/Vercel storefront was considered and remains a possible future architecture if Shopify becomes a genuine constraint. It is **not the current development direction**.

Do not rebuild the customer storefront in Next.js/Vercel, replace Shopify checkout, or introduce a separate payment/order platform unless the business owner explicitly reopens that architectural decision.

## Project status — do not restart completed systems

As of the 16 September 2026 audit, CurtainsUK is already a functioning commerce system. In particular:

- Fabric Master and its customer-safe retail projection exist;
- Shopify already consumes the Fabric Master catalogue through the CurtainsUK integration;
- Fabric Intelligence/HCI integration exists and has hosted rehearsals;
- sample commerce uses a generic Shopify transaction product carrying exact Fabric Master identity;
- **real paid sample order #1034 (£1) is proven**;
- made-to-measure configuration, pricing, immutable handoff and Shopify Draft Order infrastructure are proven in staging rehearsals;
- the premium development homepage exists and should not be rebuilt;
- the full Fabric Master catalogue does **not** need to be duplicated as thousands of Shopify products.

See the project ledger for the evidence boundaries, exact snapshot counts and remaining work. A historical test proves the version/boundary it recorded; do not automatically claim that every later catalogue addition or candidate-theme change has repeated that test.

## Authority map

| Domain | Authority |
| --- | --- |
| Customer-facing storefront/theme | Shopify |
| Cart / checkout / payments / orders | Shopify |
| Code / supporting application services | `Nylon1/CurtainsUK` / `main` |
| Fabric catalogue | Supabase Fabric Master |
| Schema | `curtainsuk_private` |
| PT evidence | Authenticated Webtex |
| SDG evidence | Approved SDG sources |
| Commercial stock | CurtainsUK stock materialisation |
| Recommendations | Hybrid Curtain Intelligence (HCI) |
| Supporting runtime | Next.js/Vercel/runtime; verify exact project before production changes |

Git is not a complete production backup. State also exists in Supabase, Shopify, supplier systems, HCI, runtime configuration and secrets.

## Architecture

```text
CUSTOMER
   |
   v
SHOPIFY STOREFRONT
premium theme / Fabric Library / samples / measuring
cart / checkout / payments / customer commerce / orders
   |
   v
CURTAINSUK INTELLIGENCE + APPLICATION SERVICES
   |
   +--> Fabric Intelligence / HCI
   +--> curtain decision + configuration services
   +--> supplier intelligence / admin / APIs
   |
   v
SUPABASE FABRIC MASTER
canonical catalogue / media / retail profiles / commercial evidence
   ^
   |
SUPPLIER INTELLIGENCE
Webtex / SDG -> provenance -> validation -> approval -> freshness
```

Suppliers provide evidence. Fabric Master establishes catalogue truth. Business rules establish commercial truth. HCI/Fabric Intelligence helps the customer decide. The configuration engine establishes what will be manufactured. Shopify owns the customer-facing commerce journey and executes the transaction. Humans remain authoritative for business policy.

## Repository

Current source: `Nylon1/CurtainsUK`, branch `main`.

CurtainsUK was migrated from `Nylon1/Apexcurtains` / `feature/curtainsuk-phase-5a-prelaunch`. That branch is historical. Confirmed Apex-only public-route residue was removed from CurtainsUK in PR #2. Legacy Apex naming may still remain in harmless migrated metadata/assets; do not broadly rename identifiers without checking runtime impact.

The 16 September audit found source drift between remote `main`, two local importer fixes, exact deployed gateway code and unpublished Shopify theme files. **Reconcile deliberately before another release; do not copy an entire local tree over remote or deploy merely to make versions match.** See the project ledger for audited SHAs.

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

### Audited catalogue snapshot — 16 Sep 2026 ~16:12 UTC

- canonical colourways: **13,148**
- designs: **3,354**
- collections: **582**
- browsable: **9,248**
- colourways with imagery: **9,531**
- AVAILABLE: **8,388**
- OUT OF STOCK: **1,681**
- CHECK AVAILABILITY: **1,752**
- DISCONTINUED / hidden: **1,327**
- approved price-ready, non-discontinued: **9,882**
- governed sample-ready: **7,694**
- automatic MTM-ready before configuration/delivery: **7,436**
- duplicate exact supplier/SKU identities: **0**

These are snapshots only. Newer persisted state wins. Stock AVAILABLE is not equivalent to storefront-orderable: imagery, price and calculation constraints also matter.

## Supplier intelligence

Active authorities: Prestigious Textiles and Sanderson Design Group.

Infrastructure includes `supplier_sync_runs`, `supplier_snapshots`, `supplier_snapshot_batches`, `supplier_snapshot_prices`, `supplier_approval_policies`, `supplier_freshness_policies`, `supplier_validation_policies` and `supplier_promotion_events`.

```text
supplier evidence -> validation/policy -> Fabric Master -> commercial interpretation -> Shopify customer experience
```

Never replace this with uncontrolled direct supplier-to-Shopify writes.

**Materialisation is not supplier retrieval.** A successful stock cron can materialise saved evidence without obtaining new supplier evidence. Do not treat cron success alone as fresh stock coverage.

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

The Fabric Library/Fabric Master connection and HCI integration already exist. Do **not** rebuild them merely because they need current validation or UI refinement.

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
supplier source -> exact SKU validation -> permanent asset -> Fabric Master mapping -> Shopify customer experience
```

Never hotlink temporary authenticated supplier URLs. Preserve verified images. One supplier image may legitimately map to multiple SKUs when the supplier explicitly associates it; image uniqueness is not an identity rule.

## PT / Webtex runbook

Authenticated Webtex is the authorised PT commercial source.

```text
collection -> products/colourways -> exact SKU -> direct DOM fields -> validation -> checkpoint -> Fabric Master
```

Capture exact identity and, where supplied, collection/design/colourway, Full Width, Standard Price ex VAT, Free Stock, image and discontinued/product state.

### Current audited PT checkpoint

- **PAUSED by owner**
- 186 collection entries completed through **Luna**
- resume at **Madeira**
- Madeira listing cached; detail/import not started at audit
- processed-SKU, image and exception checkpoints preserved
- stable audited extraction concurrency was **2**

Do not restart from Annika, the original pilot or another completed collection. Inspect the newest persisted checkpoint before resuming; newer state wins.

Routine isolated failures, missing/placeholder images, wallpaper/non-fabric and discontinued products -> queue/skip and continue.

Global stop only for: Webtex authentication/access failure; systemic extraction failure across multiple records/collections; or evidence of wrong SKU-to-data association.

Image rules: verified exact-SKU -> KEEP; missing + exact source -> ADD; broken/unverified + exact source -> REPLACE; identity conflict/placeholder -> exception.

Regression controls:

- Heidi Graphite `3526/912`: Annika, width 140cm, Standard Price ex VAT £24.40/m; historical verified stock observation 101m.
- Demi Canvas `8838/142`: Pippin, width 144cm, Standard Price ex VAT £10.40/m; historical verified stock observation 260m.

Historical stock is test evidence, not a current-stock claim.

## SDG

SDG already has substantial catalogue/price/stock ingestion. Do not redo completed bulk work without new evidence or a defined defect.

At the 16 September audit, **2,566 non-discontinued SDG records remained non-browsable and 1,936 lacked approved prices**. Zoffany was the largest price gap: only two browsable and all 775 non-discontinued records lacked approved price evidence.

A preserved SDG exception artifact contained **195 identity conflicts**. Do not interpret a zero-row database merge-conflict table as proof that the artifact queue was resolved.

## Catalogue protection

Preserve provenance: supplier, source, observation time, import and SKU. Do not duplicate canonical colourways because formatting, whitespace, ordering, collection spelling or imagery changed. Genuine identity conflicts belong in merge/conflict handling, not silent newest-value-wins updates.

## Configuration and Shopify commerce

Shopify remains the current transaction and customer-commerce authority.

```text
Fabric Master -> validated commercial state -> configuration
-> configuration snapshot -> controlled Shopify handoff
-> Shopify cart/checkout/payment/order
```

Existing application persistence includes `staging_configuration_snapshots`, `staging_checkout_handoffs`, `staging_checkout_executions`, `staging_draft_creation_claims` and `staging_shopify_proxy_replay_receipts`.

These structures are supporting infrastructure and do not mean Vercel is the production storefront. Snapshots can retain canonical fabric and supplier-price evidence. Never bypass checkout gates, server-side handoff or idempotency.

### Proven commerce boundaries

- Generic sample commerce carries exact Fabric Master identity/context through Shopify.
- **Real paid Shopify sample order #1034 (£1) is proven. Do not repeat a payment merely to prove the unchanged architecture.**
- Standard/Bay curtain pricing and Draft Order handoff are proven in staging rehearsals.
- HCI/Sadira D15 reached a £613.95 staging Draft.
- A real paid made-to-measure curtain order is **not** claimed.

The full Fabric Master catalogue does **not** need to become thousands of Shopify products. Do not introduce per-fabric Shopify product proliferation without a new, explicit business requirement.

A future headless architecture or alternative commerce bridge may be investigated only if there is a real business need. Do not make it the current development programme.

## Half-drop boundary

At the audit, **303 browsable fabrics were excluded from automatic calculation by the existing `HALF_DROP_MATCH` rule**. This is a manufacturing/calculation decision, not a stock rule. Do not silently loosen it. Obtain an explicit workroom/business decision before changing the calculation boundary.

## Shopify themes

Audited 16 September state:

- **CurtainsUK Phase 4A Dawn 16** `182264234363`: MAIN / live.
- **CurtainsUK New Design – Live Base** `182310502779`: UNPUBLISHED / sole development candidate.
- **Updated copy of Dawn** `182264136059`: UNPUBLISHED / donor only.
- **Minimal** `79650455661`: UNPUBLISHED / rollback.

The candidate already contains Fabric Library/Fabric Master integration and premium Fabric Intelligence presentation. Do not rebuild those systems. Preserve the candidate theme source/evidence in the repository before relying on it for disaster recovery.

Never replace/publish over the current live theme without explicit approval. Reverify Shopify state immediately before publication.

Legacy Escher/Dali/Diez Shopify products remained active at the audit, including £0 Diez variants. Their Shopify inventory is not authoritative supplier stock. Verify actual customer bypass exposure narrowly before changing them; do not bulk-delete blindly.

## Runtime, secrets and security

Vercel is supporting application/runtime infrastructure, not the current customer storefront. Verify the exact project/repository/deployment linkage before production changes; do not infer it from labels alone.

Never commit Supabase privileged credentials, Shopify credentials, HCI secrets, supplier authentication, Webtex credentials or email/runtime secrets.

Schema changes must be deliberate and migration-backed. Inspect `curtainsuk_private` before creating anything. Do not weaken access controls to fix development permission problems.

One heavy aggregate query during the Sep 2026 review produced a PostgreSQL temporary-workspace `No space left on device` error while smaller queries continued. If it recurs, inspect resource health and query cost rather than repeatedly retrying expensive cross-products.

## Testing and release

Automated suites cover decision engine, supplier sync/intelligence