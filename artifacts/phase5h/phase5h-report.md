CurtainsUK Phase 5H — Supplier Verification, Canary Completion & Scale-Out

Branch: `feature/curtainsuk-phase-5a-prelaunch`. Base commit: `844301f1853541c9a9451d6dfebfb1527d30a538`. Results checked on 8 September 2026. The final delivery message identifies the commit containing this report.

Unpublished Dawn now displays **257 browse-ready fabrics: 250 Prestigious, six Clarke & Clarke and one Sanderson**. Prestigious covers **62 designs across eight collections**. No catalogue architecture, public application route, database migration or production theme change was required. The changes operate existing verification, media, editorial and browse gates; the existing loopback preview gained an isolated scale-test fixture.

| Phase 5H gate | Status |
|---|---|
| Prestigious 50-record canary | PASS |
| Prestigious lifecycle verification | PASS |
| Prestigious price verification | PASS |
| Sanderson SKU reconciliation | BLOCKED |
| Sanderson imagery mapping | PASS |
| 50-record performance | PASS |
| 250-record performance | PASS |
| 1,000-record performance | PASS |
| Mobile QA | PASS |
| Catalogue security/privacy | PASS |

The Prestigious verification passes cover the selected 250 colourways. Sanderson imagery passes cover seven exact, current reconciliations, including five new imports; this is not approval of its whole master catalogue. The 1,000-record pass is an isolated staging scale test, not 1,000 public browsing approvals.

| Prestigious measure | Count |
|---|---:|
| Total master colourways | 258 |
| Approved Shopify imagery | 250 |
| Description approved | 250 |
| Fresh lifecycle evidence applied to canonical records | 250 |
| Browse-ready | 250 |
| Current approved cut-price basis | 250 |
| Browse-ready with current sample availability | 250 |

All original 50 colourways received fresh exact-SKU Webtex checks, including the 35 previously blocked records. A further 200 passed the same governed verification. Current status derives from the fresh unflagged, orderable Webtex listing and its status legend, not the August PDF. The private observation file retains the visible standard/cut prices and timestamps; the committed reports retain provenance, observation hashes and snapshot references without commercial amounts. There are 250 new append-only supplier snapshots and approval histories. Manual portal timestamps are fixed in the evidence; rerunning a script cannot make an old observation fresh, and stale observations require another portal check. Five other held master colourways also have fresh observations in the private working evidence, but their canonical records were not promoted as part of the bounded 250.

Current cut prices use GBP per metre excluding VAT and the existing approval/expiry rules. **Price-ready describes verified commercial evidence; it does not enable checkout.** Shipping, single-batch stock and other order gates remain independent. No configuration/order writes occurred; the staging configuration snapshot table remains empty and its before/after digest is unchanged. The existing immutable revision and price-protection tests passed.

| Sanderson Group brand | Master | Exact identity reconciled | Image mapped | Browse-ready | Price-ready | Unreconciled identity |
|---|---:|---:|---:|---:|---:|---:|
| Sanderson | 1,762 | 1 | 1 | 1 | 1 | 1,761 |
| Morris & Co. | 830 | 0 | 0 | 0 | 0 | 830 |
| Harlequin | 2,428 | 0 | 0 | 0 | 0 | 2,428 |
| Zoffany | 894 | 0 | 0 | 0 | 0 | 894 |
| Scion | 464 | 1 | 0 | 0 | 0 | 463 |
| Clarke & Clarke | 3,302 | 6 | 6 | 6 | 0 | 3,296 |
| **Total** | **9,680** | **8** | **7** | **7** | **1** | **9,672** |

Seven Sanderson Group descriptions and sample states are approved. The one Sanderson price approval predates this phase and remains current under the existing expiry/approval gate; this phase added no Sanderson commercial approvals. Scion NESF120872 is an exact identity with a current discontinued result and remains hidden. All six Astraea identities are independently verified as live fabric products, with matching colour, collection, dimensions and portal IDs. Their shared drapery-use specification is supported by the current technical details.

The reconciliation table records 11 investigated candidates. Three searched identities remain genuinely unmatched; 9,669 other master records have not yet received an exact portal reconciliation. Portal search is fuzzy/full-text: a missing SKU can return adjacent numbers or products whose marketing text matches the query. Those results are not aliases. DAPGPA203 is explicitly also known as DSUP224503 and is currently in Sanderson One Sixty Fabrics; its existing canonical colourway was retained and the collection link corrected. No duplicate supplier SKU exists in the database.

Media operations uploaded **205 new images**: 200 Prestigious and five Astraea. Together with the 52 existing images, Shopify and Fabric Master now hold **257 verified main-image mappings and 257 distinct content hashes**. The Prestigious batches reused 200 cached downloads. A replay skipped all 250 Prestigious mappings and created zero remote uploads. The five Sanderson images were downloaded, individually viewed, then uploaded and applied as a bounded five-record batch. There were zero new SKU/image mismatches or import failures. The two previous mismatches remain withheld. One additional Midnight gallery image was discovered and retained privately for image-role review; it is not hotlinked or presented to customers.

Editorial review covered 65 representative design images. The 250 activated Prestigious colourways use 62 designs; clean records were approved under the reviewed rules, retaining UNKNOWN where uncertain. The 50 existing approvals were preserved and 200 further Prestigious descriptions approved. A systematic Soto discrepancy was corrected from 140 mm to **14 mm** repeat using current Webtex evidence, corroborated by all three public exact-SKU specifications, before approving those three descriptions. Original supplier imagery and factual specifications informed the descriptions; no acoustic, blackout, thermal or stain-resistance claim was generated.

| Repeated API probe | 50 Prestigious | 250 Prestigious | 1,000 internal identities |
|---|---:|---:|---:|
| Catalogue median | 1,043 ms | 823 ms | 28 ms |
| Search median | 981 ms | 836 ms | 7 ms |
| Colour filter median | 817 ms | 654 ms | 6 ms |
| Pattern filter median | 857 ms | 644 ms | 6 ms |
| Detail median | 486 ms | 507 ms | 3 ms |
| Unique records / pages | 50 / 3 | 250 / 11 | 1,000 / 42 |
| Largest raw page response | 53,750 bytes | 55,013 bytes | 56,050 bytes |

Each API median uses three observations. The 50/250 measurements use Shopify's proxy and a Prestigious filter. The earlier unfiltered 50-record measurement was 1,226 ms; the supplied 15-record baseline was about 1,470 ms. No major response regression appeared. The 1,000-record figures use the loopback harness and exclude Shopify/network transit; they are not a faster-production claim. A separate read-only Postgres projection of 1,000 actual master identities took roughly 71–88 ms for search/filter execution, with browse observations of 78–92 ms. These SQL and browser measurements isolate different layers and are not directly interchangeable.

The 1,000-record fixture contains 250 Prestigious identities and 125 from each Sanderson Group brand. It has 251 genuine approved images; the remaining 749 have no substituted supplier image. All fixture pricing and launch flags are disabled. Only 24 records are sent per response. Mobile began with three loaded images out of 24 lazy image elements. After eight next-page interactions, the browser still contained 24 cards; heap rose from 1.85 MB to 2.10 MB with no overflow or instability. Customer-facing readiness rules were never loosened.

Desktop and 390 × 844 mobile checks covered search, colour/pattern/brand/collection filters, pagination, details, sample intent, resume, standard-window and Bay handoffs, and blocked pricing. At 250 records, Java returned 29, geometric 85 and green 57. Soto's detail page displays the corrected 1.4 cm repeat and its sample/Make Curtains journey selects the exact Soto/Bay configuration. Astraea Teal saves its sample and Bay context while withholding numeric pricing and Make Curtains. These are desktop-browser viewport tests, not physical-handset measurements.

The final audit read all **257 public records across 11 pages**, plus unverified and held detail routes. It found no commercial/credential fields; all approved customer images use Shopify CDN. All six Astraea records remain browse-only. Seven held/discontinued deep links remained inaccessible. Browser HTML is `noindex, nofollow, noarchive`; metadata is noindex and feed eligibility is false. Anonymous and ordinary authenticated database roles have no select/insert/update grants on the private master, supplier-commercial, media-mapping or editorial tables. The secret scan found no matches in tracked/proposed text files. TypeScript, ESLint and **142 existing tests** passed (28 Fabric Master, 11 supplier-intelligence, 103 storefront).

Shopify theme inspection confirms Dawn **182264234363 is unpublished** and Minimal **79650455661 remains live**. No theme was pushed or published in this phase; no payment, Merchant Center or supplier-order settings were changed. CurtainsUK checkout remains disabled.

Exact remaining catalogue blockers:

- **Cabello 4282/543, 4282/681, 4282/928:** public composition totals only 66%. Fresh trade observations exist, but the specification must be reconciled before approval.
- **Velour 7150/168, 7150/602 and Spotlight 7895/038:** no fresh authenticated lifecycle observation in this pass; keep hidden.
- **Varini 4273/658 and Felice 4274/147:** fresh Webtex observations exist, but these two older master records lack the completed current public specification/image mapping used by the 250-record set.
- **Morris DARP222519:** exact product not returned. DARP222529 is a different design/colourway and remains rejected as a substitute.
- **Harlequin EAZU132713:** only adjacent colourways returned. Their discontinued status is not evidence for this missing SKU.
- **Zoffany ZALD332700:** exact SKU, numeric and design searches returned no matching product. A supplier-confirmed identity/alias is needed for these three unmatched SKUs.
- **9,669 additional Sanderson Group records:** further controlled exact-ID verification, media matching and current lifecycle/specification work remains. They have not been bulk approved.
- **All six Astraea colourways:** a governed, current cut-price basis is still required for pricing. Portal trade price alone was not promoted as cut price.
- **One Astraea Midnight additional image:** image-role review and a later gallery import remain; its approved main image is already present.

Evidence: [database counts](database-counts.json), [supplier reconciliation](sanderson-identity-reconciliation.json), [media manifest](media-summary.json), [public audit](public-security-audit.json), [browser measurements](browser-performance.json), [1,000-record SQL measurements](performance-sql-1000.json), [secret scan](secret-scan.json).

Screenshots: [final desktop catalogue](screenshots/desktop-final-257.png), [mobile Astraea Teal](screenshots/mobile-astraea-teal.png), [mobile Soto detail](screenshots/mobile-soto-corrected-repeat.png), [Sanderson Painters Garden](screenshots/desktop-painters-garden.png), [mobile 1,000-record test](screenshots/mobile-scale-1000.png), [desktop page-nine scale test](screenshots/desktop-scale-1000-page9.png).
