# CurtainsUK

CurtainsUK is a made-to-measure curtain commerce and fabric-intelligence platform. This repository is the authoritative application source for CurtainsUK.

> **Critical rule:** Shopify is not the canonical fabric catalogue. Supplier evidence is validated into Fabric Master before it becomes CurtainsUK commercial truth.

## Production authority map

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

A Git checkout alone is **not** a complete production backup. Runtime state also exists in Supabase, Shopify, supplier systems, HCI, deployment configuration and secrets.

## Architecture

```text
SUPPLIERS
Prestigious Webtex / Sanderson Design Group
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

The governing principle is:

- **Supplier systems provide evidence.**
- **Fabric Master establishes catalogue truth.**
- **CurtainsUK business rules establish commercial truth.**
- **Fabric Intelligence/HCI helps the customer decide.**
- **The configuration engine establishes what will be manufactured.**
- **Shopify executes commerce.**
- **Humans remain authoritative for business policy.**

## Repository and stack

Current source repository: `Nylon1/CurtainsUK`, branch `main`.

CurtainsUK was migrated from the historical `feature/curtainsuk-phase-5a-prelaunch` branch in `Nylon1/Apexcurtains`. That Apex branch is historical and must not be used as the current CurtainsUK development source.

The application currently uses Next.js 16, React 19, TypeScript, Supabase, Shopify integration, Resend, Sharp, SheetJS/XLSX, PDF tooling and Tailwind/UI libraries.

Some legacy Apex naming remains in migrated metadata (for example the package name). Treat it as migration residue. Do not perform broad renames without checking runtime impact.

## Fabric Master

Production Supabase project: `CurtainsUK`

Project ref: `hqysjumypgeapgmqkcrx`

Primary schema: `curtainsuk_private`

The private-schema boundary is deliberate. Privileged Fabric Master access belongs server-side.

### Canonical hierarchy

```text
Supplier -> Brand -> Collection -> Design -> Colourway
```

Principal catalogue tables include:

- `suppliers`
- `supplier_brands`
- `fabric_collections`
- `fabric_designs`
- `fabric_colourways`
- `fabric_retail_profiles`
- `fabric_supplier_links`

Supplier observations and canonical identity are intentionally separate:

- `fabric_catalogue_import_runs`
- `fabric_catalogue_observations`
- `fabric_catalogue_merge_conflicts`

A supplier observation is evidence about a canonical fabric. It is not automatically canonical truth.

### Operational scale

At the September 2026 infrastructure review Fabric Master contained approximately:

- 13,148 canonical colourways
- 3,354 designs
- 582 collections
- 9,463 media assets
- 9,680 Sanderson Design Group colourways
- 3,468 Prestigious Textiles colourways

These are operational snapshots, not constants. Persisted database state takes precedence over old handover counts.

## Supplier intelligence

Current active supplier authorities:

- Prestigious Textiles
- Sanderson Design Group

Supplier intelligence infrastructure includes:

- `supplier_sync_runs`
- `supplier_snapshots`
- `supplier_snapshot_batches`
- `supplier_snapshot_prices`
- `supplier_approval_policies`
- `supplier_freshness_policies`
- `supplier_validation_policies`
- `supplier_promotion_events`

The intended flow is:

```text
supplier evidence -> validation/policy -> Fabric Master -> commercial interpretation -> storefront
```

Do **not** replace it with `supplier -> Shopify`.

## Definitive commercial rules

These rules came from the business owner. Do not invent additional restrictive rules without approval.

### Width

Use supplier **Full Width** for curtain calculations.

`Full Width 140cm -> calculator width 140cm`

Do not require `usable_width`.

### Stock

Genuine supplier stock evidence is current for **72 hours / 3 days**.

- Free Stock >= 30m -> `AVAILABLE`
- Free Stock < 30m -> `OUT OF STOCK — AWAITING SUPPLIER STOCK`
- stock evidence older than 72 hours -> `CHECK AVAILABILITY`
- absence from supplier evidence -> unknown, **not zero stock**
- discontinued -> hidden from normal browsing/recommendations and not orderable

Raw stock evidence and customer-facing availability are separate layers.

Stock infrastructure includes:

- `daily_stock_runs`
- `daily_stock_snapshots`
- `daily_stock_snapshot_history`
- `daily_stock_usage`
- `daily_stock_refresh_events`
- `daily_stock_materialization_events`

### Samples

Any `AVAILABLE` fabric automatically has a sample available.

Do not create an independent sample-stock gate unless business policy changes.

### Made to measure

Any `AVAILABLE` fabric is eligible for made-to-measure curtains, subject to genuine configuration/manufacturing constraints.

### Prices

An approved supplier price remains valid until replaced by newer approved supplier pricing. Prices do not expire merely because time has passed.

Never invent a price.

### Prestigious price

Prestigious Textiles uses **STANDARD PRICE EX VAT**, not Cut Price.

## Intelligence layer

CurtainsUK does not use one uncontrolled generic AI. It separates factual commercial intelligence from customer recommendation intelligence.

### CurtainsUK commercial intelligence

CurtainsUK answers factual questions such as:

- Does this fabric exist?
- What is its exact supplier/SKU identity?
- Is it discontinued?
- Is stock evidence current?
- What is its commercial availability?
- What is its approved price?
- What is its Full Width?
- Can it be sampled?
- Can it be configured as a made-to-measure curtain?
- What configuration is actually being purchased?

These answers come from validated evidence and deterministic business rules, not generative inference.

### Hybrid Curtain Intelligence

HCI is intentionally a separate intelligence system (`Nylon1/Hybrid-Curtain-Intelligence`).

HCI owns consultation and recommendation reasoning: customer needs, room context, aesthetic direction, colour reasoning, practical requirements, shortlist generation and preference refinement.

CurtainsUK contains an explicit HCI integration boundary including HCI contracts, commerce context, customer HCI sessions and consultation entry.

HCI may recommend and explain. It must not override Fabric Master, stock, pricing or checkout truth.

### Fabric Intelligence™

Fabric Intelligence is the customer-facing combination of validated catalogue intelligence and guided discovery. Current concepts include:

- Three Ways to Find Your Fabric
- Colour Intelligence
- Tonal / Complement / Contrast
- 60–30–10 colour principles
- mood/inspiration-led discovery
- conventional catalogue browsing

The aim is to turn a catalogue of thousands of fabrics into a manageable, explainable decision journey.

## Intelligence learning loop

Learning is allowed to improve **preference, relevance and decision-making**. It is not allowed to rewrite commercial truth.

```text
discover -> recommend -> react -> refine -> choose -> sample/configure -> purchase -> learn
```

Useful explicit signals include likes/dislikes and reasons, colour/pattern/texture preferences, practical requirements, budget direction and requests for alternatives.

Implicit signals such as repeated viewing, shortlisting, sampling, configuration and purchase can also inform ranking, but must be interpreted conservatively. A page view is not proof of preference and a sample is not proof of purchase intent.

Preference learning should operate on reusable characteristics rather than simply memorising SKUs: colour family/temperature, tonal-vs-contrast direction, pattern character/scale, visual complexity, texture, sheen, formality, softness, luxury character, practical performance and budget sensitivity.

### What learning may change

Learning may influence:

- recommendation ranking
- shortlist composition
- alternative selection
- discovery order
- explanations
- suggested colour/pattern direction
- useful follow-up questions

### What learning must never independently change

- supplier or SKU identity
- collection/design identity
- Full Width
- supplier stock quantity or observation time
- stock rules
- supplier/approved price
- VAT/tax logic
- discontinued state
- image-to-SKU identity
- manufacturing formula
- shipping rules
- checkout totals
- historical transaction evidence

### Evidence classes

Where practical distinguish:

- `SUPPLIER VERIFIED`
- `CURTAINSUK DERIVED`
- `AI INTERPRETED`
- `CUSTOMER STATED`
- `BEHAVIOUR INFERRED`

AI interpretation must never be written into supplier-verified fields as if it were supplier fact.

**Learning may change what we recommend. Learning must not change what is true.**

## Retail intelligence

Canonical existence does not automatically mean storefront eligibility.

`fabric_retail_profiles` provides a separate retail interpretation so CurtainsUK can distinguish known, browsable and commercially orderable fabrics.

Discontinued, incomplete or commercially unresolved records can therefore remain historically/canonically known without being offered for sale.

## Media intelligence

Media infrastructure includes:

- `fabric_media_assets`
- `fabric_media_mappings`
- `fabric_media_checkpoints`

The intended pipeline is:

```text
supplier source -> exact SKU validation -> permanent asset -> Fabric Master mapping -> customer experience
```

Do not use temporary/session-dependent authenticated supplier URLs as permanent storefront imagery.

Preserve verified existing images. Shared supplier imagery across multiple SKUs is valid where the supplier explicitly makes that association; image uniqueness is not an SKU identity rule.

## Prestigious Textiles / Webtex runbook

Authenticated Webtex is the authorised PT commercial source.

The established catalogue flow is:

```text
Webtex collection -> products/colourways -> exact SKU -> direct DOM commercial fields -> validation -> checkpoint -> Fabric Master
```

Required fields include exact identity and, where supplied, collection/design/colourway, Full Width, Standard Price ex VAT, Free Stock, image and product/discontinued state.

### Extraction rules

- Use direct DOM reads of visible text/image attributes.
- Use bounded readiness/retry logic for slow commercial fields.
- Maximum established concurrency: **3 workers**.
- Five workers previously caused browser-control timeouts and should not be retried casually.
- Checkpoint frequently.
- Resume from the newest persisted checkpoint, not an old chat/handover number.
- Never unnecessarily reprocess completed collections.

### Routine exceptions: queue and continue

Examples include missing fields after bounded retry, missing/placeholder imagery, wallpaper/non-fabric products, discontinued products and isolated malformed records.

### Global stop conditions

Stop the whole PT run only for:

1. Webtex authentication/access failure;
2. systemic extraction failure across multiple records/collections;
3. evidence of incorrect SKU-to-data association.

Identity corruption is fundamentally different from an isolated bad record.

### PT imagery

- existing exact-SKU verified image -> KEEP
- missing + exact Webtex image -> ADD
- broken/unverified + exact Webtex image -> REPLACE
- identity conflict -> exception queue
- placeholder -> exception queue

Do not hotlink temporary Webtex URLs.

### Known PT regression controls

**Heidi Graphite — SKU `3526/912`**

- Collection: Annika
- Full Width: 140cm
- Standard Price ex VAT: £24.40/m
- historical verified Free Stock observation: 101m

**Demi Canvas — SKU `8838/142`**

- Collection: Pippin
- Full Width: 144cm
- Standard Price ex VAT: £10.40/m
- historical verified Free Stock observation: 260m

Historical stock quantities are regression examples, not permanently current stock claims.

Recent authorised Webtex catalogue imports were persisted on 16 September 2026 with `shopify_writes = 0`, confirming the intended separation between supplier ingestion and Shopify commerce.

## Sanderson Design Group

SDG has already undergone substantial catalogue, stock and price ingestion. Do not redo completed bulk imports without new supplier evidence or a specifically identified data defect.

Historical SDG stock work included 7,071 exact stock records. Absence from a later supplier file must not automatically become zero unless the supplier format explicitly establishes that meaning.

Approved SDG prices remain valid until superseded by newer approved evidence.

## Catalogue protection and provenance

Imports should retain enough provenance to answer where a value came from, when it was observed, which supplier/SKU/import produced it and what it replaced.

Do not create duplicate canonical colourways merely because formatting, whitespace, ordering, collection spelling or imagery changed.

Where supplier evidence genuinely conflicts with canonical identity, use conflict/merge handling rather than silently selecting the newest observation.

## Configuration and checkout

CurtainsUK does not send arbitrary recommendation output directly to Shopify.

The transaction chain is:

```text
Fabric Master
-> validated commercial state
-> curtain configuration
-> persistent configuration snapshot
-> checkout handoff
-> checkout execution
-> draft creation
-> Shopify
```

Relevant persistence includes:

- `staging_configuration_snapshots`
- `staging_checkout_handoffs`
- `staging_checkout_executions`
- `staging_draft_creation_claims`
- `staging_shopify_proxy_replay_receipts`

A configuration snapshot can retain the canonical fabric identity and supplier price snapshot used for the transaction. This preserves commercial provenance even when the live catalogue later changes.

Checkout gates, server-side handoff and idempotency controls must not be bypassed.

## Shopify themes

Known theme state from the latest business handover:

### CurtainsUK New Design – Live Base

Theme ID: `182310502779`

Status at handover: **UNPUBLISHED**

This is the production-candidate development base created from the genuine live theme and preserves existing commercial Shopify infrastructure.

### Updated copy of Dawn

Theme ID: `182264136059`

Historical design donor/reference only. Do not continue development here.

The currently published Shopify theme must not be replaced/published over without explicit approval. Always reverify live Shopify theme state immediately before publication because Shopify state changes independently of Git.

## Runtime and secrets

Vercel/runtime infrastructure forms part of production, but the exact CurtainsUK Vercel project was not visible through the account connection used during the September 2026 review. Do not invent a project ID; verify the actual account/project linkage before changing production settings.

Never commit secret values. Production secret categories include Supabase privileged credentials, Shopify credentials, HCI integration secrets, supplier authentication and email/runtime credentials.

Supplier credentials, especially Webtex authentication, are operational secrets and must not be committed to Git.

## Database operations and security

Schema changes must be deliberate and migration-backed. Inspect the existing schema and relationships before creating anything new; the primary application schema is `curtainsuk_private`, not `public`.

Do not weaken access controls to solve development permission problems. Privileged catalogue, checkout, review/evidence and supplier operations belong server-side.

During the September 2026 infrastructure inspection, one unusually heavy aggregate query returned a PostgreSQL `No space left on device` temporary-workspace error; smaller operations continued successfully. Treat this as an operational warning: avoid unnecessary cross-products/heavy retries and check resource health if similar failures recur.

## Testing

The repository includes automated suites for:

- decision engine
- supplier sync
- supplier intelligence
- supplier import
- Fabric Master
- Prestigious
- storefront
- Shopify theme integration

Useful commands include:

```bash
npm test
npm run build
npm run lint
```

Supplier/catalogue scripts are defined in `package.json`; inspect current script definitions before running them rather than relying on remembered command names.

A passing build alone is not a complete production release. Consider database compatibility, environment variables, Shopify/HCI integration, relevant tests, customer journey and rollback.

## Recovery

### Interrupted supplier import

1. Do not immediately restart from the beginning.
2. Inspect the newest persisted checkpoint.
3. Inspect recent import-run records.
4. Establish the