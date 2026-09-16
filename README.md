# CurtainsUK

CurtainsUK is a made-to-measure curtain commerce and fabric-intelligence platform. This repository is the authoritative application source for CurtainsUK.

> **Critical rule:** Shopify is not the canonical fabric catalogue. Supplier evidence is validated into Fabric Master before it becomes CurtainsUK commercial truth.

## Sources of truth

| Domain | Authority |
| --- | --- |
| Application code | `Nylon1/CurtainsUK` |
| Production branch | `main` |
| Canonical fabric catalogue | Supabase Fabric Master |
| Operational schema | `curtainsuk_private` |
| Prestigious evidence | Authenticated Webtex |
| Sanderson evidence | Approved SDG catalogue/stock/price sources |
| Commercial stock state | CurtainsUK stock materialisation |
| Recommendation intelligence | Hybrid Curtain Intelligence (HCI) |
| Commerce, payment and orders | Shopify |
| Runtime | Vercel/runtime infrastructure; exact project linkage must be verified before changes |

A Git checkout is not a complete production backup. Runtime state also exists in Supabase, Shopify, supplier systems, HCI, deployment configuration and secrets.

## Architecture

```text
SUPPLIERS: Prestigious Webtex / Sanderson Design Group
        |
        v
SUPPLIER INTELLIGENCE
provenance -> validation -> approval -> freshness
        |
        v
SUPABASE FABRIC MASTER
supplier -> brand -> collection -> design -> colourway
media / retail profiles / stock materialisation
        |
        +--------------------+
        |                    |
        v                    v
CURTAINSUK COMMERCE <----> HYBRID CURTAIN INTELLIGENCE
catalogue facts             consultation
stock / price               customer understanding
samples                     recommendation
configuration               preference refinement
        |                    |
        +---------+----------+
                  v
          FABRIC INTELLIGENCE
          discovery / shortlist / explanation
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
          checkout / payment / order
```

The governing principle is simple: suppliers provide evidence; Fabric Master establishes catalogue truth; CurtainsUK rules establish commercial truth; HCI/Fabric Intelligence helps the customer decide; the configuration engine establishes what will be manufactured; Shopify executes commerce; humans remain authoritative for business policy.

## Repository and stack

Current source: `Nylon1/CurtainsUK`, branch `main`.

CurtainsUK was migrated from the historical `feature/curtainsuk-phase-5a-prelaunch` branch in `Nylon1/Apexcurtains`. That branch is historical. Some legacy Apex naming remains in migrated metadata; do not perform broad renames without checking runtime impact.

Current stack includes Next.js 16, React 19, TypeScript, Supabase, Shopify integration, Resend, Sharp, SheetJS/XLSX, PDF tooling and Tailwind/UI libraries.

## Fabric Master

Production Supabase project: `CurtainsUK`  
Project ref: `hqysjumypgeapgmqkcrx`  
Primary schema: `curtainsuk_private`

The private-schema boundary is deliberate. Privileged Fabric Master access belongs server-side.

Canonical hierarchy:

```text
Supplier -> Brand -> Collection -> Design -> Colourway
```

Principal catalogue infrastructure includes `suppliers`, `supplier_brands`, `fabric_collections`, `fabric_designs`, `fabric_colourways`, `fabric_retail_profiles` and `fabric_supplier_links`.

Supplier observations are deliberately separate through `fabric_catalogue_import_runs`, `fabric_catalogue_observations` and `fabric_catalogue_merge_conflicts`. An observation is evidence about a canonical fabric; it is not automatically canonical truth.

At the September 2026 infrastructure review Fabric Master contained approximately 13,148 canonical colourways, 3,354 designs, 582 collections and 9,463 media assets, including 9,680 SDG and 3,468 PT colourways. These are operational snapshots, not constants. Persisted database state takes precedence over old handover counts.

## Supplier intelligence

Current active supplier authorities are Prestigious Textiles and Sanderson Design Group.

Supplier infrastructure includes `supplier_sync_runs`, `supplier_snapshots`, `supplier_snapshot_batches`, `supplier_snapshot_prices`, `supplier_approval_policies`, `supplier_freshness_policies`, `supplier_validation_policies` and `supplier_promotion_events`.

The intended flow is:

```text
supplier evidence -> validation/policy -> Fabric Master -> commercial interpretation -> storefront
```

Never replace this with a direct uncontrolled `supplier -> Shopify` path.

## Definitive business rules

These rules come from the business owner. Do not invent additional restrictive rules without approval.

### Width

Use supplier **Full Width** for curtain calculations. `Full Width 140cm` means calculator width `140cm`. Do not require `usable_width`.

### Stock

Genuine supplier stock evidence is current for **72 hours / 3 days**:

- Free Stock >=30m -> `AVAILABLE`
- Free Stock <30m -> `OUT OF STOCK — AWAITING SUPPLIER STOCK`
- evidence older than 72 hours -> `CHECK AVAILABILITY`
- absence from supplier evidence -> unknown, **not zero**
- discontinued -> hidden from normal browsing/recommendations and not orderable

Stock infrastructure includes `daily_stock_runs`, `daily_stock_snapshots`, `daily_stock_snapshot_history`, `daily_stock_usage`, `daily_stock_refresh_events` and `daily_stock_materialization_events`.

### Samples and made-to-measure

Any `AVAILABLE` fabric automatically has a sample available and is eligible for made-to-measure curtains, subject only to genuine configuration/manufacturing constraints. Do not invent independent fabric-level gates.

### Prices

An approved supplier price remains valid until replaced by newer approved pricing. Price does not expire merely because time passed. Never invent a price.

Prestigious Textiles uses **STANDARD PRICE EX VAT**, not Cut Price.

## Intelligence layer

CurtainsUK separates factual commercial intelligence from customer recommendation intelligence.

### Commercial intelligence

CurtainsUK/Fabric Master determines factual questions: exact supplier/SKU identity, discontinued state, stock freshness and availability, approved price, Full Width, sample eligibility, made-to-measure eligibility and the actual configuration being purchased. These answers come from validated evidence and deterministic rules, not generative inference.

### Hybrid Curtain Intelligence

HCI is a separate system in `Nylon1/Hybrid-Curtain-Intelligence`. It owns consultation and recommendation reasoning: customer needs, room context, aesthetic direction, colour reasoning, practical requirements, shortlist generation and preference refinement.

CurtainsUK contains an explicit integration boundary through HCI contracts, commerce context, customer HCI sessions and consultation entry. HCI may recommend and explain; it must not override catalogue, stock, pricing or checkout truth.

### Fabric Intelligence™

Fabric Intelligence is the customer-facing combination of validated catalogue intelligence and guided discovery. Current concepts include Three Ways to Find Your Fabric, Colour Intelligence, Tonal/Complement/Contrast, 60–30–10 colour principles, mood/inspiration-led discovery and conventional catalogue browsing.

The objective is to turn thousands of fabrics into a manageable, explainable decision journey.

## Intelligence learning loop

```text
discover -> recommend -> react -> refine -> choose -> sample/configure -> purchase -> learn
```

Learning may improve preference, relevance and decision-making. Explicit likes/dislikes and reasons are strong signals. Browsing, shortlisting, sampling, configuration and purchase are useful but weaker/contextual signals and must be interpreted conservatively.

Preference learning should work on reusable characteristics such as colour family/temperature, tonal-vs-contrast direction, pattern character/scale, visual complexity, texture, sheen, formality, softness, luxury character, practical performance and budget sensitivity rather than merely memorising SKUs.

Learning may influence ranking, shortlist composition, alternatives, discovery order, explanations and follow-up questions.

Learning must never independently change supplier/SKU/collection/design identity, Full Width, supplier stock or observation time, stock rules, approved price, tax logic, discontinued state, image-to-SKU identity, manufacturing formula, shipping rules, checkout totals or historical transaction evidence.

Where practical distinguish evidence classes: `SUPPLIER VERIFIED`, `CURTAINSUK DERIVED`, `AI INTERPRETED`, `CUSTOMER STATED`, `BEHAVIOUR INFERRED`.

**Learning may change what we recommend. Learning must not change what is true.**

## Retail and media intelligence

Canonical existence does not automatically mean storefront eligibility. `fabric_retail_profiles` separates known, browsable and commercially orderable fabrics.

Media infrastructure includes `fabric_media_assets`, `fabric_media_mappings` and `fabric_media_checkpoints`.

```text
supplier source -> exact SKU validation -> permanent asset -> Fabric Master mapping -> customer experience
```

Do not use temporary/session-dependent authenticated supplier URLs as permanent storefront imagery. Preserve verified existing images. Shared imagery across multiple SKUs is valid when the supplier explicitly makes that association; image uniqueness is not an SKU identity rule.

## Prestigious Textiles / Webtex runbook

Authenticated Webtex is the authorised PT commercial source.

```text
Webtex collection -> products/colourways -> exact SKU -> direct DOM fields -> validation -> checkpoint -> Fabric Master
```

Required commercial evidence includes exact identity and, where supplied, collection/design/colourway, Full Width, Standard Price ex VAT, Free Stock, image and product/discontinued state.

Operational rules:

- direct DOM reads of visible text/image attributes are the established extraction method;
- use bounded readiness/retry logic for slow commercial fields;
- established maximum concurrency is **3 workers**;
- five workers previously caused browser-control timeouts and should not be retried casually;
- checkpoint frequently;
- resume from the newest persisted checkpoint, not an old chat/handover count;
- never unnecessarily reprocess completed collections.

Routine exceptions such as missing fields after bounded retry, missing/placeholder imagery, wallpaper/non-fabric products, discontinued products and isolated malformed records should be queued/skipped and processing should continue.

Stop the whole PT run only for: (1) Webtex authentication/access failure; (2) systemic extraction failure across multiple records/collections; or (3) evidence of incorrect SKU-to-data association.

PT imagery rules: verified exact-SKU image -> KEEP; missing + exact image -> ADD; broken/unverified + exact image -> REPLACE; identity conflict/placeholder -> exception queue. Never hotlink temporary Webtex URLs.

Known regression controls:

- **Heidi Graphite `3526/912`** — Annika, Full Width 140cm, Standard Price ex VAT £24.40/m, historical verified stock observation 101m.
- **Demi Canvas `8838/142`** — Pippin, Full Width 144cm, Standard Price ex VAT £10.40/m, historical verified stock observation 260m.

Historical stock values are regression examples, not permanently current stock claims.

Recent authorised Webtex catalogue imports were persisted on 16 September 2026 with `shopify_writes = 0`, confirming the separation between supplier ingestion and Shopify commerce.

## Sanderson Design Group

SDG has already undergone substantial catalogue, stock and price ingestion. Do not redo completed bulk imports without new supplier evidence or a specifically identified data defect.

Historical SDG stock work included 7,071 exact stock records. Absence from a later supplier file must not automatically become zero unless the source format explicitly establishes that meaning. Approved SDG prices remain valid until superseded.

## Catalogue protection and provenance

Imports should retain enough provenance to establish supplier, source, observation time, import, SKU and what changed. Do not create duplicate canonical colourways merely because formatting, whitespace, ordering, collection spelling or imagery changed.

Where supplier evidence genuinely conflicts with canonical identity, use conflict/merge handling rather than silently selecting the newest observation.

## Configuration and checkout

CurtainsUK does not send arbitrary recommendation output directly to Shopify.

```text
Fabric Master
-> validated commercial state
-> curtain configuration
-> configuration snapshot
-> checkout handoff
-> checkout execution
-> draft creation
-> Shopify
```

Relevant persistence includes `staging_configuration_snapshots`, `staging_checkout_handoffs`, `staging_checkout_executions`, `staging_draft_creation_claims` and `staging_shopify_proxy_replay_receipts`.

A configuration snapshot can retain canonical fabric identity and the supplier price snapshot used for the transaction. Checkout gates, server-side handoff and idempotency protections must not be bypassed.

## Shopify themes

Known theme state from the latest business handover:

- **CurtainsUK New Design – Live Base** — theme `182310502779`, UNPUBLISHED at handover; production-candidate development base created from the genuine live theme.
- **Updated copy of Dawn** — theme `182264136059`; historical design donor/reference only. Do not continue development here.

The currently published theme must not be replaced/published over without explicit approval. Reverify live Shopify theme state immediately before publication because Shopify changes independently of Git.

## Runtime, secrets and security

Vercel/runtime infrastructure forms part of production, but the exact CurtainsUK Vercel project was not visible through the account connection used during the September 2026 review. Do not invent a project ID; verify the actual linkage before changing production settings.

Never commit secret values. This includes Supabase privileged credentials, Shopify credentials, HCI secrets, supplier authentication and email/runtime credentials. Webtex credentials are operational secrets.

Schema changes must be deliberate and migration-backed. Inspect existing schema/relationships before creating anything new; the primary application schema is `curtainsuk_private`, not `public`. Do not weaken access controls to solve development permission problems.

One unusually heavy aggregate query during the September 2026 review returned a PostgreSQL `No space left on device` temporary-workspace error while smaller operations continued successfully. Treat recurrence as an operational warning: avoid unnecessary cross-products/retries and inspect resource health.

## Testing and release

Automated suites cover decision engine, supplier sync, supplier intelligence, supplier import, Fabric Master, Prestigious, storefront and Shopify theme integration.

```bash
npm test
npm run build
npm run lint
```

Inspect current `package.json` before running supplier/catalogue scripts rather than relying on remembered command names.

A passing build alone is not a complete release. Consider database compatibility, environment variables, Shopify/HCI integration, relevant tests, customer journey and rollback. Shopify theme publication is a separate production action.

## Recovery

### Interrupted supplier import

1. Do not restart from the beginning automatically.
2. Inspect the newest persisted checkpoint.
3. Inspect recent import-run records.
4. Establish the last successfully persisted batch and whether a partial batch committed.
5. Resume after the last confirmed point.
6. Use existing duplicate protection for unavoidable overlap.
7. Do not replay completed collections unnecessarily.

If supplier authentication expires, stop authenticated extraction, restore authorised access and resume from checkpoint. Do not substitute an unapproved public source for commercial fields simply to keep processing.

If there is evidence that price, stock or imagery may be associated with the wrong SKU, **stop the run**, preserve checkpoint/log/import identifiers and investigate before resuming. This is different from an isolated missing record, which should be quarantined while healthy processing continues.

### Production recovery boundaries

GitHub restores application source; it does not restore current Fabric Master data, Shopify runtime state/orders, supplier sessions, runtime secrets or all deployment configuration.

Fabric Master recovery should preserve canonical identity, observations, provenance, pricing evidence, stock history, media mappings, configuration snapshots and operational history. Recovery is not simply re-scraping supplier websites.

For Shopify theme work, preserve the ability to return to the known working theme. Do not destroy the functioning production theme while testing a replacement.

## AI/Codex engineering guardrails

Future engineering sessions should first determine which system is authoritative for the thing being changed and inspect persisted state before broad rewrites.

Do not repeatedly re-audit settled rules without evidence they changed. In particular: PT uses Standard Price ex VAT; Full Width is calculator width; samples and made-to-measure follow AVAILABLE; Shopify is not Fabric Master; three PT workers are the established safe maximum.
