# CurtainsUK Phase 5D — Launch readiness

> Launch update: customer uploads, scanner setup and private file storage in this historical report are superseded by the [Phase 5E email-evidence workflow](curtainsuk-phase-5e-owner-inputs.md#evidence-by-email--owner-decision-applied). Do not activate those file services for launch.

Date: 7 September 2026

Branch: `feature/curtainsuk-phase-5a-prelaunch`

Shopify theme: `CurtainsUK Phase 4A Dawn 16`, ID `182264234363`, unpublished

Live theme control: `Minimal`, ID `79650455661`, remained live and untouched

## Concise launch status

| Area | Status | Evidence or blocking decision |
| --- | --- | --- |
| App secret rotated | PASS | Previous secret revoked; replacement exists only in sensitive Vercel Preview storage; source/history scan found no live credential |
| Shopify app version 2 | PASS | `curtains-uk-mtm-2` released; immutable follow-on `curtains-uk-mtm-2-checkout` added `write_draft_orders`, approved only on `curtainsuk-dev.myshopify.com` |
| Signed app proxy | PASS | Live signed catalogue/price requests return `200`; invalid/missing signatures return `401`; duplicate mutation returned `201` then `409` |
| Signed Dawn customer journey | PASS | Prestigious, Sanderson, Bay and specialist routes use the deployed server-authoritative gateway; no private supplier fields observed |
| Prestigious catalogue readiness | BLOCKED | 3 of 32 colourways are price/launch eligible; 29 need cut-price verification |
| Sanderson catalogue readiness | BLOCKED | 1 of 9,680 colourways is launch eligible; authorised imagery, current lifecycle and current prices are missing for the remaining records |
| Malware scanning | OWNER DECISION REQUIRED | Cloudmersive adapter is integrated fail-closed; select plan, DPA/region and provision the staging key before real evidence is accepted |
| Secure evidence operations | PASS | Private quarantine, scan history, one-time signed retrieval, access audit, retention/deletion and orphan cleanup are implemented and migrated |
| UK shipping | OWNER DECISION REQUIRED | All nine region/parcel cells remain null and `AWAITING_OWNER_CONFIRMATION`; no rate was invented |
| Staff review domain workflow | PASS | Bay, Apex/Gable and Manual Quote revision/audit/approval rules pass deterministic rehearsal |
| Staff browser rehearsal | BLOCKED | No authorised Supabase staff identity exists for a real dashboard rehearsal; malware and delivery decisions also prevent checkout readiness |
| Shopify test checkout | BLOCKED | Live signed handoff correctly returns stock-freshness and shipping blockers; no Draft Order, checkout URL or payment was created |
| Price immutability/idempotency | PASS | Approved totals are snapshot-bound; retries use deterministic configuration-derived IDs and exact stored-snapshot reconciliation |
| Device/accessibility QA | PASS | 390 px, 412 px, tablet and desktop have no horizontal overflow; configurator axe scan has no violations; preview-toolbar contrast remains an external incomplete check |
| Analytics | PASS | Customer-safe funnel events cover configuration, review, acceptance and checkout handoff without supplier-commercial properties |
| Rate protection | PASS | Database-backed per-operation/customer/staff limits and mutation replay protection are deployed; Vercel system mitigations are active |
| Vercel custom WAF | OWNER DECISION REQUIRED | Custom Firewall remains unconfigured pending genuine-traffic observation and final false-positive/plan decision |
| Live-theme/payment/feed safety | PASS | Dawn remains unpublished; real payment, production checkout, Merchant Center and supplier ordering remain disabled |

## Activated staging platform

- Backend: Vercel Preview deployment behind `https://curtainsuk-staging-gateway.vercel.app`.
- Database: dedicated CurtainsUK Supabase/PostgreSQL project `hqysjumypgeapgmqkcrx`; no access to the excluded projects was used.
- Applied migrations:
  - `20260907195911_phase5d_evidence_shipping_security.sql`
  - `20260907203000_phase5d_shopify_test_checkout.sql`
- Schema verification: required tables/indexes present; forced RLS; append-only triggers; no `anon` or `authenticated` private-schema use; service-role read/RPC access without direct mutation grants; nine null delivery cells; checkout execution audit empty because no Draft Order was created.
- Vercel protection: platform system mitigations active. Operation-specific database limits remain authoritative across serverless instances.

## Live signed journey evidence

| Scenario | Observed staging result |
| --- | --- |
| Standard + Prestigious Escher Mocha + Pencil + Standard lining | `INSTANT_PRICE`, £834 VAT-inclusive, availability to be confirmed |
| Standard + Sanderson Painters Garden + Wave + Blackout | `INSTANT_PRICE`, £1,161 VAT-inclusive, availability to be confirmed |
| Bay 80/180/80 cm + Dali Mocha + Wave + Blackout | `PRICE_WITH_REVIEW`, provisional £1,004 VAT-inclusive; angles are not requested |
| Apex / Triangular / Gable | Technical review remains mandatory; no checkout bypass |
| Oversized 700 cm standard | `MANUAL_QUOTE`; no numeric customer price |
| Checkout handoff | `BLOCKED`: `AVAILABILITY_NOT_ACCEPTABLE`, `SHIPPING_NOT_READY`; `paymentEnabled=false`, no Shopify write or URL |

Every observed public response was checked for supplier cost, trade-price, stock/batch and margin field names; no hits were found. All customer-facing availability uses the approved simplified wording.

## Catalogue completion

### Prestigious Textiles

| Metric | Total |
| --- | ---: |
| Collections | 1 |
| Designs | 7 |
| Colourways | 32 |
| Image references / resolved | 32 / 32 |
| Verified prices | 3 |
| Prices awaiting verification | 29 |
| Current / discontinued / unknown lifecycle | 32 / 0 / 0 |
| Customer-launch eligible | 3 |

### Sanderson Design Group

The authorised workbook contained 15,550 products. The importer found 9,818 eligible fabric rows, safely accepted 9,680 supplier SKUs and retained 138 rejected rows for review. The verified pilot was preserved and the bulk apply made no Shopify writes.

| Metric | Total |
| --- | ---: |
| Brands | 6 |
| Collections | 426 |
| Designs | 2,581 |
| Colourways | 9,680 |
| Image references / resolved | 1 / 1 |
| Records without an authorised image reference | 9,679 |
| Verified prices | 1 |
| Prices awaiting verification | 9,679 |
| Current / discontinued / unknown lifecycle | 1 / 0 / 9,679 |
| Private catalogue-QA visible | 51 |
| Customer-launch eligible | 1 |

The unpublished Dawn catalogue currently renders 54 QA-visible fabrics, of which four are configurable. All four visible configurable images resolve. No unverified fabric can enter pricing; an unverified deep link now explains the substitution instead of silently changing fabric.

## Evidence and malware scanning

Uploads are limited to verified JPEG, PNG, WebP, HEIC/HEIF and PDF content, 3 MiB per file, and remain private/quarantined until a durable clean scan. Unexpected scanner failures record an auditable `PROVIDER_ERROR` and never promote the file. Staff retrieval is actor-bound, short-lived, one-use and served through the application with `no-store`; the bucket is never public.

Cloudmersive Advanced is the selected integration candidate, not an active subscription. Published options reviewed for this phase include Business at $49.99/month with Germany processing and Business Advantage at $199.99/month with UK processing. The owner must reconfirm current price/limits, select the processing region, approve the DPA and provision the key before activation. OPSWAT remains a quote-only alternative.

## Checkout and operational rehearsal

- Exact Draft Order contract includes VAT-inclusive goods, delivery as a separate line, configuration reference, supplier SKU, measurements, review/quote reference and pricing-rule version.
- Supplier costs, margin, raw stock and batch references are statically rejected.
- The adapter calculates first and refuses any Shopify total, currency, tax basis or discount mismatch.
- It is hard-allowlisted to `curtainsuk-dev.myshopify.com`, contains no completion/invoice-send operation and requires a separate real-payment-disabled confirmation before test creation.
- The immutable configuration ID drives stable snapshot and handoff identities. A retry may recover only when every stored immutable field matches; a conflict fails closed.
- The real remote Draft Order rehearsal remains blocked rather than simulated because owner-approved delivery rates and fresh acceptable fabric availability do not yet exist.

The staff domain rehearsal proves:

- Bay: submission → under review → amendment → approval → ready for checkout.
- Apex/Gable: submission → needs information → follow-up → clean-evidence gate → approval.
- Manual Quote: no price before staff quote; acceptance required before checkout readiness.
- Every transition requires actor, timestamp and reason; customer submissions remain immutable and amendments create revisions.

## QA evidence

- Full automated suite: 198/198 passing (the theme checks intentionally run both within the storefront glob and as their own release gate).
- TypeScript: pass.
- Production build: pass, 178 routes generated.
- Changed-file ESLint: pass. Whole-repository lint retains unrelated pre-existing issues and is not represented as clean.
- Shopify Theme Check: pass at error level; 10 inherited Dawn warnings.
- Secret scan: 0 real credential/JWT/private-key/database-password findings across tracked/untracked text and 0 all-history findings; `.env.local` remains ignored. `gitleaks` is not installed.
- Visual evidence: `artifacts/phase5d/` contains desktop journey steps plus 390 px, 412 px and tablet captures. The final 390 px tap-target recheck is `artifacts/phase5d/mobile-390/05-final-44px-targets.png` (zero undersized targets and zero horizontal overflow).

## Exact remaining blockers

1. Owner approval and provisioning for the malware provider, DPA/processing region, evidence retention and deletion identity policy.
2. Owner-confirmed VAT-inclusive delivery amounts, postcode mapping, parcel thresholds and service policy for all nine UK shipping cells.
3. Fresh, approved batch-level availability for checkout-eligible fabrics.
4. An authorised staging staff identity for the real dashboard review rehearsal.
5. After blockers 1–4, explicit confirmation that the dev store cannot take real payment, followed by the first remote `draftOrderCalculate` and test Draft Order rehearsal.
6. Prestigious verification of the remaining 29 cut prices.
7. Sanderson authorised imagery, current lifecycle and current commercial price data for the remaining 9,679 records.
8. Observe genuine staging traffic, then approve or decline the proposed outer Vercel Firewall rules. Application replay/rate controls are already active.

No live theme was published, no real payment was enabled, no Merchant Center feed was activated, and no supplier order was automated.
