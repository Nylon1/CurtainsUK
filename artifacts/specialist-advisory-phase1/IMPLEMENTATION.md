# Specialist advisory platform — Phase 1 owner review

9 October 2026. **Implemented and previewed; not approved or published.** All six AI services remain upcoming. No customer data is captured or sent by this prototype.

## Review

- [Working Shopify preview](https://www.curtainsuk.com/pages/fabric-library?view=meet-our-team&preview_theme_id=182472573307)
- [Desktop/mobile screenshot gallery](review-gallery.html)
- [Programme source of truth and Phase 2 plan](../../docs/CURTAINSUK_SPECIALIST_AI_ADVISORY_PLATFORM.md)
- [Portrait prompts and provenance](../../docs/specialist-advisory/PORTRAITS.md)
- [Draft pull request #167](https://github.com/Nylon1/CurtainsUK/pull/167), targeting `release/production`. Consult its checks tab for the required gates on the current head; local results below are distinct from CI results.
- [Exact changed-file manifest](changed-files.txt)

The preview theme is **182472573307**, role **DEVELOPMENT**. It is separate from the live theme and temporary: Shopify can remove development themes after seven days of inactivity or CLI logout. Preserve these committed captures/source if it expires. The existing Fabric Library page hosts the alternate template for review only, so browser metadata still says Fabric Library. The requested `/pages/meet-our-team` native page and navigation entry are not published. The inherited preview banner says checkout disabled. Do not use this review theme for purchases.

## Verified starting authority

Repository `Nylon1/CurtainsUK`; protected `release/production` HEAD **3649c879a4a5ddf88c2093a4172d20fbc58cd265**, rechecked at the end of implementation with no advance. PR #166 is merged. The actual storefront shows its interactive homepage, four room environments, heading comparisons and approved studio assets. Historical unpublished wording in `docs/homepage-studio-review-20261009.md` is superseded.

The live theme remains **182339731835**, named **CurtainsUK - Curtain Style V1 review**, role MAIN, store `carpetup.myshopify.com`, public origin `www.curtainsuk.com`. The initial [Admin checksum evidence](preview-readback.json) verified **all 505 live theme files unchanged** and the original nine preview files matching local source (text/newline comparison, or semantic JSON comparison excluding Shopify's generated header). The [portrait revision read-back](portraits-readback.json) additionally confirms all 15 scoped files match source and all 505 live-theme files remain unchanged.

Production API `https://curtainsuk-production-api.vercel.app` remains READY on **dpl_CvvQKa2zCsFbQ7eZR9Lzi31w7BCD**, project **prj_vl2GLLlSf0AJAKqjs1Nk26ipKHBA**. Room Visualiser 2 release remains commit **800f42a27a0a6e9beb1abd92821145bf4a4b98c4**, documented tree **1150dad1d55649597d03df2dbaad01348ea98d63**. No Vercel deployment was performed. Naila, renderer/geometry/shaders/eligibility, Fabric Intelligence decisions, stock, pricing, checkout and live Theme Editor settings are unchanged.

Read-only preflight covered all seven requested release/project documents, existing theme/navigation/style patterns, Fabric Master/projections, FI/Fabric Library, House of Curtains, measuring/fitting tools and API boundaries. See [preflight receipt](preflight.json). Four historical guessed Apex routes returned 404; none is used by the page. Natalie's future destination must be confirmed before activation.

## Completed implementation

The native Shopify JSON page template uses a reusable Liquid section, adviser blocks, card/art snippets, shared dialog, scoped CSS and a small dependency-free controller. Jane receives the prominent featured layout. The portrait revision gives Jane, Anne, Noah, James, Ben and Natalie distinct AI-generated fictional identities. All are adults in their thirties; the requested representation is white British except Noah, who is brown British. These are synthetic creative specifications, not biographies of real employees. Additional advisers can be configured with blocks; the generic SVG remains available until bespoke artwork is supplied.

The six portraits were generated with the built-in image-generation tool and encoded as **1024 × 1024 WebP** theme assets, totalling **436,350 bytes**. Their exact prompts and provenance are recorded in [PORTRAITS.md](../../docs/specialist-advisory/PORTRAITS.md). Generated originals and exact prompt files are preserved outside the repository at `C:/Users/hamza/curtainsuk-advisory-portraits`; the encoding receipt there records these sizes:

| Theme asset | Bytes |
| --- | ---: |
| `curtainsuk-adviser-jane.webp` | 70,906 |
| `curtainsuk-adviser-anne.webp` | 61,792 |
| `curtainsuk-adviser-noah.webp` | 68,798 |
| `curtainsuk-adviser-james.webp` | 50,714 |
| `curtainsuk-adviser-ben.webp` | 103,662 |
| `curtainsuk-adviser-natalie.webp` | 80,478 |

Warm ivory, deep forest green, serif editorial headings, spacious layout and existing navigation follow the verified live homepage. The page includes specialist introductions/expertise, example questions, the planned free ten-minute format, consultation journey, FAQ and eight existing tool/service links. AI identity and coming-soon state are explicit throughout.

Every profile opens the shared 30-second waiting demonstration, with its own introduction and preparation guidance. A deadline based on actual elapsed time handles background/resume; users can skip or exit. The consultation-room example has no text entry and a disabled send control. It clearly states it is illustrative. No model call, session storage, enquiry, upload, queue claim or live consultation is implemented. Ten minutes is described as a flexible format, not a cutoff.

Six separately versioned personality specifications and the shared consultation policy are supplied for future implementation. The architecture keeps Shopify discovery/UI, Vercel server orchestration and governed tools, isolated Supabase consultation/knowledge/enquiry records, and an upgradeable OpenAI Responses adapter. Privacy, recovery, source rights/provenance, customer-safe product projections, durable handovers, security tests and operating-cost assumptions are documented as **designed/planned**, not running services.

## Interactive visual revision

**Implemented and tested in the unpublished owner-review preview.** A six-adviser hero spotlight starts with Jane and lets customers select an adviser using keyboard-operable buttons. Each selection displays the original portrait, specialist title, personality and example question, with an actual profile anchor and the existing shared consultation-demo entry point.

Layered cards provide depth. Gentle portrait tilt responds only to pointer input, and content has a one-time scroll entrance. Reduced-motion handling suppresses decorative motion. The interaction controller adds no autoplay, network requests, browser storage or model calls. Consultation previews remain explicitly non-operational.

The revision adds `assets/curtainsuk-advisory-interactions.js`, `assets/curtainsuk-advisory-motion.css` and `snippets/curtainsuk-advisory-spotlight.liquid`, with scoped section changes and additive advisory locale text. The total is **18 theme files**, expanding the 15-file portrait revision by three files. Earlier receipts and results below retain their original scope.

[Interactive tests](interactive-tests.log): **20 passed — 10 shared controller/content tests rerun and 10 new interaction tests**. Repeated tests are not additional unique coverage to add to the initial 42. The new suite verifies selection/keyboard behaviour, reduced motion at startup and on preference changes, pointer constraints, observer fallback and lifecycle cleanup. [Interactive Theme Check](interactive-theme-check.json) records **zero errors and 13 existing warnings**. [Read-back](interactive-readback.json) confirms **18/18 scoped files match source and all 505 MAIN-theme files remain unchanged**. The PR checks tab remains authoritative for CI on the final head; these local results do not establish that CI has passed.

[Interactive browser checks](interactive-browser.json) show no horizontal overflow at **320, 390, 412, 768 and 1440 CSS px**, loaded portraits after lazy-image completion, one active spotlight panel, and selector targets at least **47 px wide and 68 px high**. All six selections displayed the correct adviser and demo target. Home then ArrowRight selected Anne; End then ArrowLeft selected Ben, with visible focus. Fine-pointer tilt was observed in Chrome. Noah's hero action opened his own waiting room, and Escape returned focus to that action. At 320 px, skip opened Noah's illustrative room with zero inputs and a disabled send control; six profile cards were confirmed at 320 and 1440 px. See the refreshed [review gallery](review-gallery.html). Reduced-motion startup/preference-change handling is automated-test evidence; no actual reduced-motion browser run or physical-device test is claimed.

## Preview safety

Attempts to duplicate the current live theme through Shopify Admin and the official CLI failed without creating a normal unpublished theme. No historical draft was overwritten or deleted. An isolated development theme was created instead. Its base was assembled from the current live 505-file manifest: matching bytes were reused locally, and changed editor-managed JSON files were freshly retrieved from Shopify. The initial overlay comprised nine new/updated advisory files. The portrait revision expanded that scope to 15 theme files, with its upload parity confirmed in the portrait read-back receipt. The interactive visual revision expands the current scope to **18 theme files**, all verified by its separate [read-back receipt](interactive-readback.json). A transient SSL upload error during the initial preview was resolved by retrying the same development target; no certificate validation was bypassed.

The new sparse Git worktree is `C:/Users/hamza/curtainsuk-specialist-advisory-phase1`, branch `feat/specialist-advisory-phase1-20261009`. All existing checkouts/uncommitted work/evidence were preserved. The preview snapshot is outside the repository at `C:/Users/hamza/curtainsuk-advisory-preview-20261009`; it is not a future whole-theme release candidate.

## Validation

The results below record the initial Phase 1 implementation. The portrait revision additionally passed all 10 controller/content tests again, all six portraits loaded, and all five required viewport widths remained free of horizontal overflow. Noah's room preview still opens with his own introduction and no message input. See [portrait browser checks](portraits-browser.json), [portrait tests](portraits-tests.log), [current gallery](review-gallery.html) and [15-file upload read-back](portraits-readback.json). All 15 files match source, including exact binary checksums for the six portraits; all 505 live-theme files remain unchanged. CI on the latest PR head is reported on the PR checks tab.

**42 automated tests passed:** 10 new controller/content tests, 18 existing Shopify-theme tests, 10 existing security-boundary tests, two MTM production-policy tests and two Guided Measure checkout-allowlist tests. [Test log](regression-tests.log). The Guided Measure test initially lacked an existing sparse-checkout migration fixture; materialising the tracked migrations resolved that environment issue without changing source. New tests execute the actual controller and actual dialog structure, including absolute-time/no-early-opening, background restoration, reopen/skip/close/focus, all six profiles, no network/persistence, unsupported/error fallback, lifecycle cleanup and additive translations.

Official installed Shopify Theme Check reports **zero errors, 13 existing warnings and no new-file findings**. [Theme Check receipt](theme-check.json). The plugin's standalone validator lacked its existing theme-check dependency; the installed CLI supplied the official equivalent without a dependency installation.

[Chrome responsive checks](responsive-browser.json): **320, 390, 412, 768 and 1440 CSS px**, all six profiles, one H1, no missing translation, no horizontal overflow, minimum preview target height 52px. Windows display scaling was compensated when setting viewport sizes. [Six live-browser preview flows](consultation-browser.json) verify separate introductions, skip, disabled send/no input, closure and focus restoration. The natural timer was observed to have opened the room after 42,214ms; the exact 30-second boundary/background rules are deterministic unit-test evidence, not a 30.000-second browser timing claim. [Mobile keyboard checks](keyboard-browser.json) verify both focus-wrap directions, visible outline and Escape return at 390px.

Twelve existing storefront/cart routes returned HTTP 200, including homepage, Library, FI, Visualiser, House, measuring/fitting and samples. Existing regression contracts cover commerce boundaries. These are reachability/source-contract checks, **not a new paid checkout or exhaustive end-to-end order test**. Read-only console inspection showed extension sandbox/storage errors, with no advisory-controller error in the captured error entries; no unrelated extension/site code was changed.

**Remaining acceptance limits:** no physical iPhone Safari/touch test, screen-reader audit or runtime reduced-motion browser emulation. Reduced-motion rules were inspected in CSS, and the interaction tests verify reduced-motion startup and preference changes. Dialog/progressive fallback was unit-tested, not tested in every legacy browser. The preview requires native dialog support; unsupported browsers retain profiles and normal links. Adviser portraits are explicitly synthetic AI identities; product imagery is unchanged. These limits also do not close the prior Room Visualiser physical-iPhone item.

## Storage and backup

C: measured **42.28 GiB free initially; 41.89 GiB at 18:34 UTC**; see the [initial delivery storage observation](storage-final.json). The interactive revision started at 38.56 GiB free; its [latest receipt](interactive-storage.json) records **38.45 GiB free at 19:19:12 UTC**, still above the earlier 35GiB target, with `restic` PID 45016 present. Its success/completion was not established. No backup script, manifest, repository or process was altered; no cleanup/deletion was performed. The sparse worktree, small evidence files and one approximately 94MB current-theme snapshot avoided a full repository/dependency duplication. Existing dependencies were reused with no new installation, and no intensive local production build or supplier ingestion ran. **This new work needs a later backup; it is not assumed included in an earlier snapshot.**

## Next phase and release

Phase 2 should implement the server-only registry/tool contracts and mock adapter first; isolated authenticated persistence and secure recovery next; then mock-connected consultation UI, consented context, deletion lifecycle, idempotent handover/outbox and controlled synthetic conversations. Validate privacy, abuse/spend limits, prompt injection, cross-customer isolation and failures before any real customer service. Jane is the first complete agent in Phase 3. See the source-of-truth document for data models, costs, tests and all subsequent phases.

This is an owner-review candidate. Both existing required checks (`curtainsuk-production-gate`, `protected-production-policy`) must pass on the final PR head, followed by protected merge and explicit owner approval before publication. Do not publish the whole preview theme. For a later approved release, refresh protected/live state and current editor-managed locale, apply only the scoped advisory diff, assign the native page and add approved navigation. Capture before/after receipts. Rollback restores only the scoped bytes/page assignment and removes the approved entry; no Vercel release is needed.
