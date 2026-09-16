# CurtainsUK Project Ledger — 16 September 2026

> **Purpose:** authoritative handover to prevent repetitive work. Check this ledger before rebuilding, re-auditing or retesting CurtainsUK.
>
> This ledger records the read-only Codex audit supplied by the owner on 16 September 2026. Counts are the database snapshot at approximately 16:12 UTC. Newer persisted state supersedes snapshot counts.

## Core status

**CurtainsUK is already a functioning commerce system with a proven real sample payment. It does not need rebuilding.**

The remaining work is primarily catalogue completion, operational automation, targeted edge-case validation, source-state reconciliation and bringing unpublished theme work into a reproducible repository state.

## Architecture — settled

- **Shopify** is the customer-facing storefront, cart, checkout, payment and order platform.
- **Supabase Fabric Master** is canonical fabric/catalogue and commercial-evidence authority.
- **CurtainsUK Next.js/Vercel** is supporting API/intelligence/application infrastructure, not a second intended customer storefront.
- **HCI / Fabric Intelligence** is recommendation/consultation intelligence and cannot override Fabric Master commercial truth.
- Do not reopen the Shopify-vs-Vercel storefront decision unless the owner explicitly asks.
- The full Fabric Master catalogue does **not** need to be replicated as Shopify products.

## Project state classification

### DONE + PROVEN — do not rebuild

| Area | Proven state |
| --- | --- |
| Production storefront | Published Dawn production storefront; Minimal retained for rollback. Key public routes returned 200 in the audit. |
| Fabric Master | Canonical supplier/SKU records, private commercial evidence, lifecycle handling and customer-safe catalogue projection contain real data. |
| PT extraction/import | Authenticated Webtex extraction, exact-SKU enrichment, permanent images, resumability and bounded concurrency have operated across hundreds of entries. |
| SDG bulk evidence | Genuine bulk price/stock workbooks imported using exact identifiers with hashes/audit evidence. |
| PT pricing | Standard Price ex VAT is authoritative; Full Width is calculation width. |
| HCI integration | Hosted HCI, server-mediated access, exact Fabric Master identity, editable palette, five directions, reactions and refinement exercised. |
| Curtain calculation / Draft Orders | Standard, reviewed/manual historical routes and Bay instant route have successful staging rehearsals. |
| HCI → curtain Draft | Sadira recommendation flowed through configuration, price, stock, delivery and Draft Order; D15 total £613.95. |
| Price immutability / idempotency | Repeated requests retained configuration/Draft; approved transaction remained immutable when new supplier-price input was simulated. |
| Real sample payment | Shopify order #1034 is a genuine non-test PAID £1 sample order; one successful sale, £0.17 VAT included, £0 delivery. |
| Sample identity/context | Generic sample product preserved Sadira Lagoon 4262/770, Fabric Master identity and HCI context through cart/checkout/order. |
| Guides / legal identity | Measuring/fitting routes repaired and CurtainsUK legal/contact identity applied. |
| Premium development homepage | Homepage/header transformation plus cohesion/service work has desktop and mobile evidence; remains unpublished. |

### DONE BUT NOT FULLY PROVEN — test narrowly, do not rebuild

- No single clean source revision currently represents remote documentation/cleanup, both local importer fixes, exact deployed gateway and all unpublished theme work.
- Candidate theme `182310502779` has not itself been demonstrated with a new paid transaction; preview purchase controls were disabled.
- Fresh full-browser performance has not been repeated at the current 9,248 browsable catalogue size.
- No final uninterrupted acceptance matrix covers every assisted route, commerce boundary and accessibility requirement.
- Newly imported PT coverage in the separately hosted HCI candidate catalogue is not proven record-by-record.
- A real **curtain** payment is not claimed; real payment proof is the sample order. Curtain Draft Orders are proven.
- Recovery works operationally but migration-history identifiers/local filenames are not perfectly aligned.
- Privacy implementation was reviewed but is not a legal certification.

### PARTIAL — finish only the stated boundary

| Workstream | Remaining boundary |
| --- | --- |
| PT catalogue | Owner-paused at Madeira. Preserve completed work and resume there only when requested. |
| SDG completeness | 2,566 non-discontinued records remain non-browsable, mainly imagery/identity coverage. |
| Rich merchandising | 263 persisted retail profiles; 257 validated descriptions. Most other descriptions use factual runtime fallback. |
| Paid-order outcomes | Genuine SAMPLE_ORDERED outcome exists but was appended manually; automated paid-order webhook is not proven. |
| Stock consumption | Machinery exists; `daily_stock_usage` had zero rows at audit. Automatic paid-curtain deduction not proven. |
| Supplier refresh | Imports/materialisation work; scheduled materialisation does not itself retrieve new Webtex/SDG evidence. |
| HCI adaptive shortening | Pinned image-first rehearsal still used 14 questions + 22 calibration reactions. |
| Integrated latency | Warm generation improved; cold starts/refinement retain slower recorded tails. |
| Legacy Shopify paths | Escher/Dali/Diez remain active legacy products; complete bypass prevention is not proven. |

### NOT STARTED / no meaningful implementation found

These are absences, not automatic build instructions:

- unattended authenticated supplier-stock retrieval;
- automated verified payment → sample/purchase outcome recording;
- demonstrated operational failure-alert delivery for incomplete supplier refreshes;
- ordinary repository-wide CI for the current application;
- premium footer (deliberately deferred);
- Merchant Center activation / automated supplier ordering (deliberately excluded).

## Superseded — DO NOT REPEAT

| Superseded approach | Current rule |
| --- | --- |
| Develop CurtainsUK in `Nylon1/Apexcurtains` | Use `Nylon1/CurtainsUK`. |
| Continue donor Dawn `182264136059` | Donor/reference only. Development theme is `182310502779`. |
| Rebuild premium homepage | Freeze except genuine defects. |
| PT Cut Price | PT **Standard Price ex VAT**. |
| Require/prefer usable width | Use supplier **Full Width**. |
| Same-day stock evidence | Valid for **72 hours**. |
| Stock threshold >30m | **>=30m AVAILABLE**. |
| Independent normal sample flag | AVAILABLE fabric supplies normal sample eligibility. |
| Bay always requires staff approval/angles | Bay uses section widths and ordinary instant route. |
| Multiple mandatory parcel classes | One-class launch shipping; specialist delivery goes to confirmation. |
| Specialist customer file-upload/scanner dependency | Photos/drawings emailed with project reference to enquiries@curtainsuk.com. |
| Block browsing for unknown price/stock | Discovery and purchase eligibility are separate. |
| Every SKU needs unique image | Shared supplier imagery is valid when explicitly associated to each SKU. |
| “Unmapped” = supplier image missing | Preserve unresolved mapping state; do not invent absence. |
| Restart PT after reconnect | Resume preserved checkpoint; do not recapture completed work. |
| Historical reports saying Dawn/HCI disabled | Historical staging state, not current production truth. |
| Create thousands of Shopify fabric products | Fabric Master catalogue is consumed through CurtainsUK/Shopify integration; Shopify products are not required per fabric. |
| Rebuild Fabric Library/Fabric Master integration | Existing theme/application code already implements it. |
| Repeat £1 sample payment merely to prove architecture | Order #1034 already proves real sample payment. |

## Current production / development state

### Repository / deployment

| Component | Audited state |
| --- | --- |
| Repository | `Nylon1/CurtainsUK` |
| Remote `main` at audit | `670ac3a8c27432d6b09c3603821ccafb050901a0` |
| Local `main` at audit | `f7a281a7773b89f0b6785f3027053809c2de0463` |
| Local-only commits | `496bd55` field-readiness fix; `f7a281a` supplier-supported shared-image fix |
| Local untracked theme work | `shopify-theme/curtainsuk-new-design-live-base/` and `shopify-theme/curtainsuk-updated-dawn-preview/` |
| Hosted gateway baseline | `c762683d348874ceccbcfb62cc3d431e20cc4168`, deployment `dpl_Dbh9TKJbk7TMbhfXHLR29yhLDUMS`, READY at audit |
| HCI pinned baseline | `41a9f3f4a878a81cfed83ebeca47aa968e0744c7`, deployment `dpl_DNenkMK1wLfXrtfoTC972zo9eWXx`, READY at audit |
| HCI PR #24 | Draft/open/unmerged at audit; do not assume newer PR head is integrated baseline |

**Important:** remote and local source states diverged at audit. Do not copy the whole local tree over GitHub. Reconcile deliberately and preserve both sides before release.

### Shopify themes

| Theme | ID | Role at audit |
| --- | ---: | --- |
| CurtainsUK Phase 4A Dawn 16 | `182264234363` | MAIN / live |
| CurtainsUK New Design – Live Base | `182310502779` | UNPUBLISHED / sole development candidate |
| Updated copy of Dawn | `182264136059` | UNPUBLISHED / donor |
| Minimal | `79650455661` | UNPUBLISHED / rollback |

Never publish/replace the live theme without explicit owner approval and a fresh state check.

### Supabase

Project ref: `hqysjumypgeapgmqkcrx`.

At audit, read queries succeeded and no lock waiters were observed. Stock cron executed successfully on 16 Sep at 05:00 UTC / 06:00 BST in ~6.7s. That job **materialised saved evidence; it did not retrieve fresh supplier evidence**.

Latest bulk SDG observation recorded by the audit: 14 Sep 08:18:46 UTC; its 72-hour validity ends 17 Sep 08:18:46 UTC.

## Catalogue snapshot — 16 Sep 2026 ~16:12 UTC

| Measure | Count |
| --- | ---: |
| Canonical colourways | **13,148** |
| Designs | **3,354** |
| Collections | **582** |
| Browsable | **9,248** |
| Colourways with imagery | **9,531** |
| Media assets / mappings | **9,463 / 9,533** |
| AVAILABLE | **8,388** |
| OUT OF STOCK | **1,681** |
| CHECK AVAILABILITY | **1,752** |
| DISCONTINUED / hidden | **1,327** |
| Approved price-ready, non-discontinued | **9,882** |
| Automatic calculator-ready within browsing catalogue | **8,945** |
| Governed sample-ready | **7,694** |
| Automatic MTM-ready before configuration/delivery | **7,436** |
| Non-discontinued without approved price | **1,939** |
| Duplicate exact supplier/SKU identities | **0** |

### By brand

| Brand | Canonical | Browsable | Available | Out | Check | Discontinued |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Prestigious | 3,468 | 3,178 | 2,767 | 350 | 68 | 283 |
| Clarke & Clarke | 3,302 | 2,536 | 2,154 | 467 | 351 | 330 |
| Harlequin | 2,428 | 1,479 | 1,352 | 239 | 405 | 432 |
| Morris & Co. | 830 | 639 | 544 | 131 | 149 | 6 |
| Sanderson | 1,762 | 1,187 | 964 | 325 | 434 | 39 |
| Scion | 464 | 227 | 163 | 67 | 116 | 118 |
| Zoffany | 894 | 2 | 444 | 102 | 229 | 119 |
| **Total** | **13,148** | **9,248** | **8,388** | **1,681** | **1,752** | **1,327** |

Stock AVAILABLE does not imply every record is currently storefront-orderable; imagery, approved price and calculation constraints also matter.

## PT checkpoint

- 186 collection entries completed through **Luna**.
- Resume at **Madeira**.
- Madeira listing cached; details/import had not started at audit.
- Image worker stopped; processed-SKU, image and exception checkpoints preserved.
- Stable extraction concurrency in the audited run was **2**. Do not increase merely because an older handover mentioned a higher ceiling.
- “186 entries” includes exclusions/empty collections and is not the count of 186 current fabric collections.
- Do **not** restart from Annika/pilot.

## Specific catalogue gaps

- PT: 7 non-discontinued records not browsable; 3 non-discontinued records lack approved prices.
- SDG: 2,566 non-discontinued records not browsable; 1,936 lack approved prices.
- Zoffany: only 2 browsable; all 775 non-discontinued records lack approved price evidence.
- Preserved SDG exception artifact contains 195 identity conflicts. A zero-row database merge-conflict table does not prove this queue was resolved.
- 303 browsable fabrics remain excluded from automatic calculation by `HALF_DROP_MATCH`. This needs a targeted workroom/manufacturing decision, not a fabricated stock rule.
- Rich taxonomy/editorial descriptions cover only a subset; factual runtime fallback accounts for much displayed copy.

## Customer journey ledger

| Stage | State |
| --- | --- |
| Fabric Library | Server-backed paginated Fabric Master catalogue and filters exist. Current route was healthy; fresh load test at 9,248 not yet recorded. |
| Fabric Intelligence | Three entries, one-image model, palette editing, five strategies and refinement are proven. Adaptive shortening/new-catalogue coverage remain limited/unproved. |
| Fabric detail | Real imagery, identity, specs, descriptions and sample/configurator actions exist. Bulk editorial quality is not fully reviewed. |
| Samples | Generic £1 Shopify transaction product + signed exact Fabric Master/context properties. **Real paid order #1034 proven.** |
| Configurator | Standard, Bay instant and specialist/manual routes exist and have rehearsals. Do not rebuild. |
| Pricing | Full Width, approved prices and existing calculation rules proven. Half-drop remains deliberately excluded pending decision. |
| Availability | 72-hour genuine evidence, >=30m threshold and fail-closed unknown state implemented. Supplier retrieval remains operational/manual. |
| Shipping | Mainland £12.95; Highlands/Islands + NI £19.95; specialist confirmation. Sample real transaction used £0 native sample shipping. |
| Checkout | Sample path and immutable curtain handoff/Draft infrastructure exist. Legacy bypass paths need narrow verification. |
| Payment/order | Genuine sample payment proven. Real curtain payment not claimed. |
| Feedback/outcomes | Architecture exists; genuine sample outcome was manually recorded, not yet automated. |

## Known issues / blockers

1. **Source drift:** reconcile remote changes, two local importer fixes, deployed gateway and candidate-theme source before another release.
2. **Supplier freshness:** materialisation is not retrieval; genuine supplier evidence must be refreshed operationally.
3. **Legacy £0/legacy Shopify products:** test actual bypass exposure before making the smallest correction. Do not bulk-delete blindly.
4. **Paid-order feedback / stock usage:** automation is not proven.
5. **Half-drop:** 303 calculation exclusions require an explicit workroom decision.
6. **Candidate theme source control:** preserve current unpublished theme files/evidence in the repository.
7. **Current acceptance/CI:** run one bounded regression on the eventual reconciled release, not every historical phase again.
8. **Candidate validation findings:** nine `cpc_modified` filter errors in `main-cart-items` plus ten warnings were previously recorded; assess runtime impact before removing app-related code.

## NEXT WORK ONLY

1. Preserve and reconcile source state: remote changes, two local importer fixes and unpublished theme files. **No automatic deployment.**
2. Maintain genuine stock evidence through owner/admin source refresh; do not confuse cron materialisation with supplier retrieval.
3. Perform only the targeted Samples/legacy-bypass verification still needed. **A second payment is unnecessary unless the payment boundary changes.**
4. Resolve the narrow half-drop/readiness discrepancy with an explicit workroom decision.
5. Resume PT **only when requested**, from Madeira.
6. Before publishing the candidate, run one bounded current desktop/mobile/accessibility + commerce regression. Keep the functioning live theme until explicit approval.

No new recommendation engine, catalogue architecture, homepage redesign, sample-product proliferation or checkout rewrite is justified by the current evidence.

## Working rule for humans and AI agents

Before implementing CurtainsUK work:

1. Read this ledger.
2. Inspect newer persisted state for the relevant subsystem.
3. Classify the task as **DONE + PROVEN**, **BUILT NOT PROVEN**, **PARTIAL**, or **MISSING**.
4. Do not rebuild DONE work.
5. Test BUILT NOT PROVEN work narrowly.
6. Finish only the documented missing boundary of PARTIAL work.
7. Build from scratch only when genuinely MISSING.

**Learning may change what CurtainsUK recommends. It must not change what is commercially true.**

**Newer persisted evidence always supersedes snapshot counts and historical handovers.**
