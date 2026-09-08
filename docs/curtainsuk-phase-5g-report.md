# CurtainsUK Phase 5G — Catalogue activation

Checked 8 September 2026. Branch: `feature/curtainsuk-phase-5a-prelaunch`.

**Partial activation; the complete 50-record canary has not passed.** Shopify Files access is resolved, 50 Prestigious colourways have approved Shopify-hosted images and descriptions, and 15 pass the existing browsing gates. Expansion is held for current lifecycle evidence on the other 35. No new catalogue architecture or database tables were introduced.

## Results

| Requested measure | Result |
| --- | --- |
| Shopify Files permission | PASS — `write_files` granted to the existing app; real uploads succeeded. App configuration release `curtains-uk-mtm-5`. The previously ungranted `write_draft_orders` request was removed so the approval requested Files only. |
| Images uploaded | 52: 50 Prestigious and 2 Sanderson Design Group; all linked to existing Fabric Master records. |
| Deduplication | 50 existing mappings skipped on explicit replay, with zero new downloads/uploads. All 50 PT source hashes are distinct; no duplicate-content image occurred within this canary. |
| Image/SKU mismatches | Zero among the 50 uploaded PT images. Two SDG searches returned different colourway SKUs and were withheld. One additional SDG collection conflict remains unresolved. |
| Prestigious browse-ready | 15: Dali, Diez and Sarcone, five colourways each. Thirteen newly visible plus two previously visible. Their existing authorised lifecycle source is dated 1 August 2026; this is not a new trade lifecycle observation made today. |
| Prestigious price-ready | Three pre-existing `VERIFIED` flags in the 258-record master; two are among the 15 retail records. Zero newly price-verified; zero checkout-enabled by this phase. The other 255 master records remain `PRICE_REQUIRES_VERIFICATION`. |
| Descriptions approved | 50, using visual sample review across all 11 canary designs, rule correction and bulk validation. No requirement to rewrite each colourway manually. |
| Sanderson session/media | Authorised trade session reconnected. Six-brand exact-SKU probe completed; two exact media matches uploaded. Zero new SDG browse activations. |
| Dawn QA/screenshots | Real unpublished preview checked on desktop and at 390 × 844 CSS pixels on mobile; screenshot captures displayed in the task. No filesystem screenshot export is claimed. |
| Performance at 50 / 250 / 1,000 | BLOCKED — only 15 qualify for retail browsing, so these larger live datasets were not activated or benchmarked. Observed 15-record browse response: 1,468 ms / 34,935 bytes; other search/filter/detail/page probes: 481–1,379 ms. These are individual end-to-end measurements, not percentile benchmarks. |

The 50 PT media/editorial records cover Dali (5), Diez (5), Sarcone (5), Cord (5), Java (5), Chiara (5), Donata (5), Amir (4), Habitat (4), Wilfred (4) and Grayson (3), across eight collections. Canonical counts remain 258 PT and 9,680 SDG; this phase activated existing records rather than importing duplicate products.

## Media and editorial evidence

The existing resumable importer now accepts a controlled 50-record source manifest, checks exact SKU-bearing image filenames, and supports the observed SDG static-image host. Source references are opaque product identifiers, not authenticated portal URLs. Credentials remain in memory; no supplier cookies, headers, passwords or tokens were exported into the import artifacts. Customer responses use Shopify CDN copies.

All 50 PT CDN images returned HTTP 200, with at least 1,400 pixels width. Shopify re-encodes images, so CDN byte hashes differ from source hashes. A decoded source/CDN visual comparison passed for all 50; maximum mean absolute RGB error was 0.315/255 after resizing to 64 × 64. This checks upload fidelity; exact supplier SKU matching is a separate manifest/filename check. The two SDG images are 609 pixels wide.

Eleven design representatives were visually reviewed. Original descriptions and taxonomy rules were corrected once and applied to matching colourways with identity/specification checks, source/image hashes and optimistic revision protection. Unknown colour classifications remain unknown. No unsupported blackout, thermal, FR, acoustic or other performance claims were introduced. All 50 descriptions are now validated; this does not override lifecycle or commercial gates.

## Real Dawn journeys

- Browse returns 15 qualifying records; keyword Dali returns 5, geometric returns 10, green returns 3. Empty second page returns no records. Requests hydrate at most 24 records.
- Diez Mocha detail displays the real main image, factual specification, original description, sample action and Make Curtains action.
- Sample intent retains canonical fabric identity and Bay context; Continue My Curtains resolves to the same fabric and window context.
- Make Curtains opens the existing configurator with `pt-4271-147` and `bay-window`, preserving the review route. No customer submission or order was created during this QA.
- Mobile detail has no horizontal overflow. A scoped `[hidden]` rule fixes a Dawn CSS conflict which had exposed hidden search/loading panels on detail views.
- Staging robots remain `noindex,nofollow,noarchive`. Public response checks found no commercial/credential field leakage. Direct unsigned gateway access returns 401. Blocked fabric detail is denied by the same readiness gate as search.
- Specialist evidence remains email/reference based; no customer file input or malware-scanning dependency was introduced.

[Unpublished Dawn fabric library](https://www.curtainsuk.com/pages/fabric-library?preview_theme_id=182264234363)

[Diez Mocha detail with Bay context](https://www.curtainsuk.com/pages/fabric-library?preview_theme_id=182264234363&fabric=pt-4271-147&window=bay-window)

## SDG probe and merge protections

| Brand / requested SKU | Observation and action |
| --- | --- |
| Sanderson / DAPGPA203 | Exact Painters Garden Violet/Crimson, Live. Image uploaded. Portal collection is Sanderson One Sixty Fabrics, while the master says A Painters Garden Fabrics. Reconciliation required before activation. |
| Clarke & Clarke / F1787/01 | Exact Astraea Dove, Live. Image uploaded. Current usable width/specification requires a protected merge and editorial approval before activation. |
| Morris & Co. / DARP222519 | Search returned DARP222529, a different colourway. No mapping applied. |
| Harlequin / EAZU132713 | Returned adjacent SKUs 132714–132717; exact requested SKU absent. No mapping applied. |
| Scion / NESF120872 | Exact Epsilon Putty is Discontinued. Canonical lifecycle set to DISCONTINUED with revision guard; staging visibility and selection disabled. No commercial value changed. |
| Zoffany / ZALD332700 | No portal result. No mapping applied. |

Old SDG commercial observations were not refreshed or promoted as current. The pre-existing single SDG price-verification flag was not newly verified in this phase. No wider SDG rollout follows from these two image uploads.

## Verification and deployment

- 23 targeted media/readiness/theme tests passed; TypeScript check and changed-file ESLint passed.
- Credential-pattern scan checked 856 tracked/proposed text files with zero candidates; ignored operational caches and environment files are excluded from the commit. `git diff --check` passed.
- Staging Vercel preview build passed (37 seconds). Deployment: `dpl_8dSmXg671qBLTzSSBkgbuoxEQqTR`; only `curtainsuk-staging-gateway.vercel.app` was pointed to it.
- Existing retail search function migration `20260908035811_phase5g_browse_gate.sql` applied. Search and direct detail now consistently require the established readiness checks.
- Only the specified unpublished Dawn assets/section were pushed, including the mobile fix. Dawn `182264234363` remains unpublished; live Minimal `79650455661` was not changed.
- No live payment enablement, Merchant Center activation, supplier ordering or production supplier automation occurred.

## Exact remaining blockers

1. Sign in to the opened Prestigious trade portal so current lifecycle evidence can be obtained for the other 35 canary colourways. Their images/descriptions are ready, but lifecycle is UNKNOWN. Full canary acceptance and the remaining 206 validated PT source records remain held behind this gate.
2. After all 50 pass, run the complete canary journeys and real 50-record performance check, then expand PT in resumable batches and measure at 250/1,000 only when enough eligible records exist.
3. Reconcile the Sanderson collection conflict and merge current Astraea specification/lifecycle evidence with existing protections. Resolve or explicitly exclude missing, adjacent-SKU and discontinued SDG results before controlled expansion.
4. Current supplier commercial verification remains separate. Browsing approval must not enable a purchasable curtain price for unverified records. Shipping and test-order prerequisites from the earlier phase were not removed or exercised here.

Safe evidence manifests and measured API results are in `artifacts/phase5g/`. Operational resumable media caches remain ignored. Full Phase 5G rollout is not claimed complete.
