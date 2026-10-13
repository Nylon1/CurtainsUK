# Phase 1 release preparation + Jane development evidence

9 October 2026. Implements [Issue #168](https://github.com/Nylon1/CurtainsUK/issues/168). **Nothing published, merged, activated or migrated in production. No paid model call.**

## Source and review

- Protected source: `3649c879a4a5ddf88c2093a4172d20fbc58cd265`, verified again after development.
- Phase 1 candidate: `851078c674ac2e9231e51dffbd5949ed4ea7c6d1`, [draft PR #167](https://github.com/Nylon1/CurtainsUK/pull/167). Both required checks [passed on this head](https://github.com/Nylon1/CurtainsUK/actions/runs/37981663754).
- Jane branch: `feat/jane-consultation-phase2-20261009`, stacked on the Phase 1 candidate; [draft PR #169](https://github.com/Nylon1/CurtainsUK/pull/169) contains only Jane's additive development changes and evidence. Implementation commit: `076b85a2032224df1b30084c15817b635ebb3d1e`; the final documentation receipt is recorded in Git. PR #169 has no protected check run while its base is the Phase 1 feature branch; both checks and exact-head approval remain required on retargeting.
- [Six-adviser Shopify preview](https://www.curtainsuk.com/pages/fabric-library?view=meet-our-team&preview_theme_id=182472573307). Approved design, all portraits and interactions preserved; temporary DEVELOPMENT theme may expire after inactivity/logout.
- [Working Jane mock preview](http://127.0.0.1:8789/) on this computer. Restart with `node scripts/jane-preview.mjs`; no credentials needed. This is not a remotely hosted or public AI service.
- [Screenshot gallery](REVIEW.md), [HTML gallery](review-gallery.html), [exact Jane changed files](changed-files.txt), [architecture/contracts/costs](../../docs/specialist-advisory/JANE_PHASE2.md), [programme source of truth](../../docs/CURTAINSUK_SPECIALIST_AI_ADVISORY_PLATFORM.md).

## Deliverable A — controlled publication candidate

Hidden permanent page `693751873915` has handle/template `meet-our-team`. `/pages/meet-our-team` correctly remains 404 while unpublished. The shared desktop/mobile header entry resolves to the permanent page only after publication; the development theme links to the working alternate-template preview now.

Only two additional navigation snippets were uploaded to DEVELOPMENT theme `182472573307`. Full before/after comparison confirms all **505 MAIN theme file checksums unchanged**, with MAIN still `182339731835`. The exact final publication scope is **20 theme files**, not the entire development theme. See [manifest](../specialist-advisory-release/release-manifest.json), [read-back](../specialist-advisory-release/readback.json) and [release/rollback procedure](../../docs/specialist-advisory/RELEASE.md).

Theme Check: **0 errors, 13 existing warnings**. Page/controller tests: **20 passed**. Existing theme tests: **18 passed**. Mobile menu navigation was observed at 390 CSS px. All six profiles, responsive layouts, keyboard controls and mock room transitions retain existing evidence. Owner visual approval does not authorise merge or publication.

## Deliverable B — working isolated Jane framework

Implemented strict request/result/tool contracts, Jane v2 instructions plus all six separately versioned profiles, four controlled read-only tools, source-traceable FI/Visualiser teaching, provider orchestration, mock and guarded OpenAI adapters, budget reservation hooks and a bounded test ledger. The local UI supports a deadline-based welcome, text conversation, feedback refinement, consented structured results, summary, encrypted save, resume, one-time recovery and deletion. No model-generated HTML, SQL, unrestricted URL, email, commerce mutation or upload capability is exposed.

The local store checks ownership/revision/idempotency and uses atomic encrypted writes after Save consent. A proposed owner-scoped Supabase table and adapter are tested locally, not installed. The Vercel route is present but disabled: production returns 404; even a valid preview key cannot activate an unwired cloud service.

**Mock components:** all displayed replies, two fabric identity fixtures, zero live product availability, all provider responses in automated adapter tests. **Implemented but unactivated:** OpenAI requests, full-master REST adapter, cloud persistence adapter. **Planned:** real-model evaluation, cloud authentication/locking/recovery, comprehensive descriptive full-master retrieval, images, supplier ingestion and human enquiries.

## Verification

| Check | Result |
| --- | --- |
| Jane contract/security/storage/provider tests | **22 pass**, including PostgreSQL RLS; [log](tests.log) |
| Approved team page interactions and waiting controller | **20 pass**; [log](phase1-regression.log) |
| Existing Shopify theme contracts | **18 pass**; [log](theme-regression.log) |
| Scoped ESLint | No errors; final warning-free result recorded in lint.log |
| New Vercel route bundle | Lightweight esbuild check succeeded; route-check.mjs is the verification output. No intensive full Next build. |
| Five browser widths | 320, 390, 412, 768, 1440 CSS px, no horizontal overflow; [receipt](browser.json) |
| Welcome timer | Automatic room opened by the 36.264-second observation. Exact deadline and suspended-time behaviour tested deterministically; not a claim of measured 30.000-second browser timing. |
| Real browser conversation | Warm/oak direction → consented visualiser feedback → quieter pattern → changed cool-blue preference → personalised summary. Saved and resumed after browser reload and server restart. |
| Keyboard/accessibility structure | Labelled inputs/log/dialogs, Escape closes handoff and returns focus to opener; Tab reaches Send. Actual screen-reader and enabled reduced-motion environment still pending. |
| Fabric Master | Two exact identities read via connector; primary-index query plan. Corrected six-result prefix query uses index-only scan; [facts](master-read-proof.json), [prefix proof](master-prefix-proof.json). |
| Public retail integration | **BLOCKED: HTTP 400** from existing catalogue endpoint. [Failure receipt](retail-read.json). No unrelated fix attempted. |
| Live route regression | 11 existing homepage/tool/service/cart routes returned 200; unpublished team page returned expected 404. [Receipt](storefront-reachability.json). Reachability is not exhaustive checkout or functional catalogue testing. |

The ten requested consultation scenarios are represented by deterministic tests. Screenshot scenario explicitly reports that processing is unavailable. Return-visit scenario proves local encrypted continuity. Prompt-injection/tool/ownership tests are infrastructure checks, not proof that an untested model is immune to adversarial prompts. Physical iPhone/touch, real screen reader, enabled reduced-motion browser preference and confirmed hidden-tab timer verification remain pending.

## Costs, safety and next steps

No new service purchase or paid OpenAI call occurred. At the verified proposed GPT-6.1 Sol rates, an assumed 50k input/8k output-token consultation is approximately **$0.18**, before tax/premiums/retries. Larger 100k/12k examples are $0.32. Infrastructure allowance and explicit assumptions are documented in JANE_PHASE2.md; these are estimates, not measured usage or spending approval.

MAIN Shopify, Vercel production deployment `dpl_CvvQKa2zCsFbQ7eZR9Lzi31w7BCD`, Naila, Room Visualiser's 11,003 identities/four rooms, FI decisions, Fabric Master records, pricing, stock, checkout and manufacturing were not modified. No production schema migration, release-gate edit, whole-theme upload, customer notification or public AI activation occurred.

C: started at 38.41 GiB free and finally measured 37.05 GiB; no large dependency installation or full build occurred. Existing dependencies were reused through a junction. The original restic process later disappeared from the process list, but backup completion/snapshot contents were not verified. All worktrees, backups and evidence are preserved. **New development requires a subsequent verified backup.**

Next: review the draft implementation; investigate the existing retail failure; complete narrow master discovery and authenticated durable cloud storage/locks/budgeting; approve a capped real-model test only when ready; run the realistic design and adversarial evaluations with human review; complete physical/accessibility checks; separately review customer-tool handoff integration. Phase 1 publication remains an independent scoped release requiring owner authorisation.
