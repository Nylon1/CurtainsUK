# CurtainsUK Phase 5F — BLOCKED

Checked 8 September 2026 (UK); source observations and migration timestamps are 7 September UTC. Branch: `feature/curtainsuk-phase-5a-prelaunch`.

The full customer-facing catalogue success condition has **not** been met. This commit prepares real supplier records, downloaded imagery and a reviewable retail experience. The expanded catalogue has not been deployed into Dawn because Shopify Files permission and Sanderson portal access remain unavailable.

## Delivered and verified

- Preserved the email-reference specialist workflow from commit `4826be1`: unique project reference; photographs/drawings sent separately to the configured review email; `EVIDENCE_NOT_RECEIVED`, `EVIDENCE_RECEIVED`, `EVIDENCE_REVIEWED`; no launch dependency on customer uploads, private customer file storage or malware scanning.
- Collected 256 distinct Prestigious colourways across 65 designs from current public product pages, using the supplier's displayed SKU and matching full-size image filename. The collection passes cover Rustic Persian, Formation, Instinct, Tuscany, Cord, Java, Brodie and Pippin, with additional explicitly linked products in Spotlight and Velour. No obsolete workbook image URLs were used.
- Inserted **226 new** private canonical Prestigious records. Existing verified records were not overwritten. Total Prestigious master: **258 colourways / 65 designs**, up from 32 colourways / 7 designs (**58 new designs**).
- Downloaded and checked **256 real images**, each with a distinct normalized content hash. JPEG/PNG/WebP decoding, minimum dimensions, pixel/file limits and metadata stripping are implemented. A repeated 30-colourway run reused all 30 cached downloads. No duplicate content was observed among this set.
- Recorded **22 unresolved product-page attempts** in local resumable checkpoints. They are not guessed into the catalogue. These are page attempts, not necessarily 22 additional unique fabrics.
- Generated **256 factual description drafts**. None has been marked editorially validated or launch-ready. Visual taxonomy and richer retail copy still need review. Unknown classifications remain `UNKNOWN`.
- Added supplier-neutral media ports and resumable batch handling for MAIN/SWATCH/DETAIL/ROOM/ADDITIONAL, plus a working Prestigious public-source collector and download runner. Sanderson's authenticated discovery adapter is still outstanding; the generic interface is not a claim that the portal integration has been exercised.
- Added private media asset/mapping/checkpoint/profile tables, service-role-only grants and RLS. The search RPC is security-invoker and denied to anonymous/customer roles.
- Implemented bounded server search and hydration: 24 records per retail page, four database calls rather than one query per fabric, keyword and structured filters, separate detail responses, CDN-only retail image projection, and bounded configurator selections.
- Built Dawn fabric detail, gallery, cards with “View Fabric”, sample intent, mobile collapsible filters, pagination, contextual links and canonical metadata preparation. An unverified deep link now preserves the selected fabric and blocks pricing rather than substituting another fabric.
- Removed supplier SKU from the new public catalogue response and sample display. Canonical Fabric Master IDs retain the supplier/SKU association server-side.
- The existing private Prestigious bulk-price screen remains available at `/admin/prestigious-stock`; it already accepts SKU rows, source/check dates and protected verification. No bulk price approvals were made.

## Counts

These are canonical database counts, **not** launched retail counts.

| Brand | Canonical colourways | Existing staging-visible | Stored verified-price flags | Known sample available |
|---|---:|---:|---:|---:|
| Prestigious Textiles | 258 | 3 | 3 | 255 |
| Sanderson | 1,762 | 10 | 1 | 1 |
| Morris & Co. | 830 | 8 | 0 | 0 |
| Harlequin | 2,428 | 9 | 0 | 0 |
| Zoffany | 894 | 8 | 0 | 0 |
| Scion | 464 | 8 | 0 | 0 |
| Clarke & Clarke | 3,302 | 8 | 0 | 0 |
| **Total** | **9,938** | **54** | **4** | **256** |

Sanderson-group records added/promoted in this phase: **0**. Its existing total remains **9,680**. Zero known samples for other brands means no confirmed available samples in the data; it does not assert that the supplier offers none.

| Media / readiness measure | Result |
|---|---:|
| Real Prestigious main images discovered and downloaded | 256 |
| Distinct normalized image hashes | 256 |
| Shopify Files uploads | **0** |
| Shopify/CDN mappings applied | **0** |
| Repeat downloads avoided in explicit resume check | 30 |
| Duplicate image content observed | 0 |
| Newly launch-ready browsing records | **0** |
| Description drafts / editorially validated | 256 / **0** |
| Newly price-verified / purchasable | **0 / 0** |
| Main-image CDN mappings still required for the discovered PT batch | 256 |
| Sanderson records awaiting this phase's portal mapping | 9,680 |

Stored price flags are not proof of current sufficient single-batch stock or checkout readiness. Shipping and safe Draft Order gates remain independent and blocked as before.

## Verification and limits

- Main test command: **210 passing test executions**, including the existing repeated theme suite. Four new media/gate tests exercise metadata removal, tiny-image rejection, rights/mapping validation and failed-upload recovery without re-downloading or persisting sensitive error text.
- TypeScript and production build passed. Changed-file lint passed. Repository-wide lint found **21 pre-existing errors** in unrelated Apex/Professional workspace components; it is not reported as a clean global lint run.
- Signed local Next API with the real staging database: retail page 200/24 records; keyword search 200; detail 200; configurator 200/4 records; unsigned request **401**. Response scans found no supplier SKU, supplier-reference, commercial or credential fields.
- Warm direct server search against the **54 actually visible records**: 107–163 ms; first observed request 678 ms. Full pages were about 32 KB. Local Next HTTP first compilation request was 4,047 ms; subsequent keyword/detail/configurator calls were 348/174/199 ms. These are local measurements, not deployed production latency promises.
- Local editorial browser uses **256 genuine supplier records and downloaded photographs**, 24 cards at a time. Desktop 1440×1000 and mobile 390×844 were inspected. Mobile document width was 375px, with no horizontal overflow; filters collapse and images lazy-load. Amir Lagoon sample intent retained its canonical fabric ID and window context in the resume link. No customer file inputs or payment actions were present.
- Desktop and mobile screenshots were displayed in the work session. Full-page browser capture showed stitching artifacts; those captures are not claimed as polished export files. No Sanderson/Morris/Harlequin detail screenshot was fabricated.
- 1,000/several-thousand-record **customer-facing** scale rehearsal remains blocked by the media/lifecycle gates. The 256-record local editorial preview does not substitute for that test.
- The new importer pins patched `sharp@0.35.4`; its media tests passed after the update. The repository audit still reports 24 dependency vulnerabilities, including the older Sharp bundled under existing Next.js. This phase is not a clean whole-repository dependency audit.
- Secret scan of tracked and proposed source files found zero live credential candidates. Supplier page HTML, normalized image files, CLI credentials and portal sessions are not committed. Credentials are obtained from the existing CLI in memory; raw adapter errors are not persisted.
- Supabase advisor has the expected service-only RLS/no-policy informational findings. Its pre-existing leaked-password-protection warning remains; [Supabase guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Remote changes and protection

- Applied migration `20260907223610_phase5f_retail_media` to dedicated project `hqysjumypgeapgmqkcrx`.
- Released Shopify **app configuration** version `curtains-uk-mtm-4` requesting `write_files`. This is not a theme publication. The installation still grants the old scopes: the real importer stops with `SHOPIFY_FILES_PERMISSION_REQUIRED` before upload.
- Uploaded **only** `layout/theme.liquid` to Dawn `182264234363` to add the missing global staging robots guard. Verified rendered `noindex, nofollow, noarchive` in the browser and theme role `unpublished`.
- The new retail JS/CSS/section and API have **not** been deployed remotely. Existing staging catalogue visibility was not expanded. Current remote browser still has its prior canary implementation until rollout is possible.
- Minimal `79650455661` remains live and untouched. No theme publication, real payment enablement, Merchant Center activation, supplier order or production supplier automation occurred.

## Exact remaining blockers

1. **OWNER ACTION REQUIRED — Shopify Files:** open the CurtainsUK app in the store's Apps settings and accept its requested Files permission update. The correct app is `curtains-uk-mtm` (client ID `d18f79c0a0d1db2df7babeb26906443e`). Do not provide credentials in chat. The existing CLI session already supplies credentials securely; the missing item is the installation grant.
2. **OWNER ACTION REQUIRED — Sanderson portal connection:** reconnect the authenticated Chrome session to the browser tool. Selecting both the existing Sanderson tab and existing Shopify admin tab timed out. No cookies/session tokens were extracted. Sanderson public pages redirect to a new site with client-rendered content, so they were not treated as verified trade-portal evidence.
3. **BLOCKED — media completion:** run the prepared Files uploader, verify remote processing/CDN contents, apply mappings, finish placeholder/wrong-colourway/duplicate review and collect the available room/detail imagery. Generic infrastructure alone does not complete Sanderson's six-brand adapter.
4. **BLOCKED — retail editorial/current-data gates:** validate descriptions and visual classifications, establish current lifecycle for new PT records, fill unresolved specification/sample states, and confirm suitable headings/window applications. New public page presence was deliberately not converted into CURRENT lifecycle. Sanderson February commercial/lifecycle observations remain untrusted as current data.
5. **BLOCKED — rollout and journeys:** promote only gated records, deploy the paired API/Dawn changes, then run 250 → 1,000 → remaining mapped records, actual mobile/desktop QA, all-brand examples, sample/resume and configuration journeys. No all-brand launch-ready or purchasable count is claimed yet.
6. **BLOCKED — SEO launch routing:** brand/collection/design/colourway paths are prepared in metadata, but `/fabrics/...` Shopify routes are not provisioned. The working detail route is `/pages/fabric-library?fabric=<id>` and remains noindex. Do not publish canonicals that imply unprovisioned routes work.

## Resume commands

All commands run from the existing repository and staging branch. Never publish the theme.

```powershell
# Local editorial review; loopback only, no payment or remote mutation.
npx tsx scripts/curtainsuk-retail-local-preview.ts

# Continue one supplier collection without restarting completed pages.
npx tsx scripts/curtainsuk-collect-prestigious-public.ts --collection=rustic-persian --batch-size=100 --retry-failures

# After the Files installation grant is accepted; uses cached image bytes.
npx tsx scripts/curtainsuk-import-supplier-media.ts --collection=rustic-persian --batch-size=100 --upload --confirm-store=carpetup.myshopify.com
npx tsx scripts/curtainsuk-apply-media-mappings.ts --confirm-project=hqysjumypgeapgmqkcrx
```

Local checkpoints and sanitized image cache are in ignored `artifacts/phase5f/checkpoints/` and `artifacts/phase5f/media/`. The local preview remains clearly labelled editorial, rather than a completed Shopify catalogue.
