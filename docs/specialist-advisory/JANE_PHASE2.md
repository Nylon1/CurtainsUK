# Jane consultation foundation — development implementation

**Historical initial implementation.** The [Jane readiness record](JANE_READINESS.md) supersedes the catalogue HTTP 400, cloud-control implementation and real-model evaluation blockers described here. This report remains evidence for its original revision; it is not the latest activation status.

9 October 2026. Implements Issue #168 on `feat/jane-consultation-phase2-20261009`, based on PR #167 release-candidate commit `851078c674ac2e9231e51dffbd5949ed4ea7c6d1`. Protected production remained `3649c879a4a5ddf88c2093a4172d20fbc58cd265`. This is an isolated mock-backed implementation, not an operational public AI adviser.

## Run and review

```powershell
node scripts/jane-preview.mjs
node --test lib/advisory/__tests__/*.test.mjs
```

Open **http://127.0.0.1:8789/** on this computer. No package installation or API credential is needed. Existing dependencies include PGlite for real local PostgreSQL policy tests. The harness binds only loopback and checks the exact Host and Origin. Use invented details only. It deliberately never selects the paid provider, reads an OpenAI key or connects customer chat to production storage.

The existing Shopify [six-adviser preview](https://www.curtainsuk.com/pages/fabric-library?view=meet-our-team&preview_theme_id=182472573307) remains the approved Phase 1 design with non-operational consultations. Jane's local harness is a development test surface, not a second customer storefront or an addition to the live tools.

## Implemented boundaries

| Component | Evidence and present limit |
| --- | --- |
| Jane and shared instructions | `lib/advisory/profiles.mjs`, version `2.0.0-preview.1`; imports all six independent Phase 1 personality profiles. Jane is the only development target. Other advisers remain Coming Soon. |
| Orchestration | Adaptive provider contract; validated structured advice, controlled tools, exact evidence IDs and approved product cards. Versioned session history, summaries, design context and consent events. |
| Working UI | Approved Jane portrait, welcome deadline/skip, labelled scripted chat, revised palettes, result handoff, summaries, save/resume/recovery/delete controls, native labelled dialogs and keyboard focus recovery. |
| Streaming | Validated, committed replies use SSE `text`/`complete` events. This is buffered validated streaming, not live model-token streaming; no unvalidated model fragments reach the browser. |
| Provider seam | Deterministic mock plus tested OpenAI Responses adapter. Real requests require an explicit paid-test flag, server credential and a supplied budget reservation/settlement implementation. None is activated. |
| Catalogue seam | Narrow exact-ID and ID-prefix reads across Fabric Master; existing retail projection; no catalogue rebuild, scans, SQL tool, price, stock, supplier cost or margin fields. |
| Local storage | Ephemeral memory by default; AES-256-GCM encrypted saved records after consent, atomic file replacement, ownership checks, revision compare-and-swap, per-session execution lock and one-time recovery. |
| Supabase preparation | Additive SQL design and owner-scoped adapter. RLS tested in local PostgreSQL. No cloud schema/migration applied; distributed lock/rate-limit/recovery implementation still required. The service refuses a store without atomic locking. |
| Vercel preparation | Additive route defaults to 404, including in production even if preview flags leak. Authenticated preview flag/key still returns 503 until durable cloud wiring is supplied. No remote service was deployed. |
| Knowledge ingestion | Existing knowledge reused. Supplier discovery, rights review, PDF/table extraction, manual evidence approval and incremental indexing remain later work; no bulk ingestion. |
| Uploads / human enquiries | Deliberately unavailable. No image processing, attachment endpoint, contact capture, staff notification or enquiry submission is claimed. |

## Contracts

The shared POST command requires every field: `requestId` (UUID v4), `sessionId` (nullable UUID), `revision` (nullable integer), `action`, `text`, `context`, `consent`, `recoveryToken`. All extra fields are rejected; action-specific values must be null unless used. Input is limited to 16 KB, messages to 2,000 characters. Actions are `start`, `message`, `context`, `summary`, `save`, `resume`, `recover`, `delete`. Session ownership is derived by the server; no owner field is accepted from the customer.

Successful operations return a safe session snapshot and increasing revision. Request IDs prevent duplicate messages after an uncertain response; reuse with different content is a conflict. Revision conflicts and concurrent messages are rejected before mutation. Provider/storage failures do not append a false successful reply. The browser retains the unsent draft, and a retry of that same draft reuses its request ID. Telemetry accepts event/action/provider/duration/count only, not conversation text or tokens.

The version-1 result handoff accepts:

- `source`: Room Visualiser, Fabric Intelligence or customer notes; `consent:true` is mandatory.
- Optional room, up to six exact fabric IDs, eight colour labels, heading text, lighting, curtain position, eight short preferences, five reference labels and 1,200 characters of feedback.
- Reference labels are not fetched URLs. There is no remote-image URL, uploaded file, signed commerce state, price, stock or internal commercial field.

Every handoff is marked customer-supplied design context, never canonical product authority. Fabric identities must resolve before storage. Each handoff has its own timestamp and consent receipt. The local form uses only two clearly labelled verified identity fixtures. No button or state-reader has been inserted into the existing Fabric Intelligence or Room Visualiser. A later reviewed integration can pass this same contract through a first-party authenticated endpoint after the customer sees exactly what will be shared.

The provider returns text, consultation stage, palette, pattern/texture directions, alternatives, questions, next steps, evidence IDs and optional fabric IDs. Product IDs must come from a governed retail lookup during that turn; evidence IDs must exist in that turn's tool results. The application owns URLs and image cards. Browser output is text nodes, never model HTML/Markdown execution. Numerical price/stock claims and some explicit guarantee patterns fail closed; this is not a semantic proof against every hallucination. Real-model evaluation remains mandatory.

Four strict tools are registered: `get_tool_guidance`, `lookup_fabric_knowledge` (six IDs), `find_fabric_identities` (minimum three-character ID prefix, six rows), `search_retail_fabrics` (bounded current projection, six safe cards after at most 24 hydrated rows). A turn permits six tool calls and at most four model rounds. No unrestricted SQL, URL fetch, email, supplier API, checkout or write tool exists.

## Fabric coverage and live retrieval findings

Basic Fabric Master knowledge is not filtered by retail lifecycle, so unpublished/incomplete identities can be resolved while always labelled **knowledge only, not a purchase offer**. Left joins preserve partially populated identities. Explicit fields include brand/design/collection/colour, composition, widths, repeats, applications and approved visual classification values. All reads use existing identity indexes, bounded batches and a 60-second, 64-entry cache. No authoritative fabric record is copied into a new catalogue.

The read-only connector resolved `pt-3697-770` and `sdg-f1541-01` with dimensions/compositions and confirmed their current lifecycle value was UNKNOWN. An `EXPLAIN` for these exact identities uses `fabric_colourways_pkey` and `fabric_designs_pkey`, estimated two rows, cost 9.84. See `artifacts/jane-phase2/master-read-proof.json`. This verifies actual facts and index use; it is **not** proof of a credentialed end-to-end REST adapter call. A separate six-result prefix read and EXPLAIN verified an index-only scan. The live collation exposed an initial tilde upper-bound error; the adapter now uses a bounded alphanumeric range plus a strict prefix filter, with the corrected query recorded in `master-prefix-proof.json`.

The public existing retail endpoint `/apps/curtainsuk-decision/catalog?view=retail&query=Shambala&colour=&pattern=&page=1` returned HTTP 400, `Unable to load the fabric catalogue`, during the smoke test. A focused retry with only the established view/query/page parameters returned the same error. This failure is recorded in `retail-read.json`; no existing catalogue code was changed to satisfy a test. It blocks product recommendation activation and requires a separate investigation or verification of the approved internal retail reader in an authorised protected test environment.

**Coverage limitation:** the implemented complete-master path resolves IDs and prefixes; it is not yet comprehensive name/colour/semantic search across every unpublished record. Approved retail search reuses the current projection. Extending full-master descriptive discovery needs an approved narrow indexed projection or existing suitable index, verified incrementally without scanning/rebuilding the catalogue. Governed descriptions are currently available through the retail projection; the new full-master adapter does not yet expose every technical document or all description variants. Do not call Jane's complete fabric mastery finished.

## Verified tool teaching

`guidance.mjs` identifies the protected source commit, runtime version, source paths and exact customer destinations. The live FI entry was read in the browser: “Help me choose” begins with darker room/privacy/soft daylight/mainly the look and an optional reference image. Source inspection confirms atmosphere, palette priorities, pattern and price-level preferences, feedback and refinement; it does not justify promising a fixed number of questions or results.

Room Visualiser source provides Living Room, Bedroom, Lounge and Office; Room/Curtain views; FIXED140-only Full curtain view; Change fabric; open/close/position/pause; supported surface colours/restore; Daylight/Evening/Fabric inspection; lamps and Living Room fireplace. **The published interface has no heading selector.** Curtain Style is the separate comparison destination. Render limitations, eligibility and physical samples are explicit. Naila and all existing tool decisions remain untouched.

## Continuity and privacy design

Local owner cookies are random, HttpOnly and SameSite=Strict, with a server-derived CSRF token and exact Origin checks. The development origin is loopback HTTP; a deployed cookie must add Secure and first-party production authentication. The browser stores only a session ID in sessionStorage for reload recovery; localStorage is used only after Save consent. Neither contains conversation text, a service key or a recovery token.

Unsaved sessions remain in the process for up to 24 hours and do not survive a server restart. Saving writes encrypted records under `%USERPROFILE%/.curtainsuk-jane-private-preview/sessions`; the 32-byte local key is in a separate sibling file, not Git. This protects stored content from casual disclosure, not a compromised Windows account with access to both files. The local harness has a bounded 100-session capacity and is not a distributed production database. Review evidence uses invented rooms only.

Saved preview retention is 90 days from last saved activity; startup/access remove or deny expired records. A raw 256-bit recovery capability is shown once after successful durable save; only its hash is stored. Recovery consumes the code, transfers local ownership and invalidates the old browser. Saving again rotates the code. Deletion removes the local record and recovery access. Production needs account-backed or verified-email ownership, a retention worker, backup-aware deletion, privacy notices/lawful-basis review, request handling and reviewed audit controls. No preview claim is a legal sign-off.

`schema.review.sql` creates only an isolated `advisory` schema and `consultations` table, denies PUBLIC/anon access, applies authenticated ownership RLS, size/consent/revision/expiry constraints and an owner/expiry index. It is a design fixture, deliberately outside production migrations. The Supabase adapter derives owner from verified authentication, uses revision CAS and never sends model SQL. Cloud recovery/locks and new-session creation are not yet wired; the Vercel route remains disabled.

External documents and customer context are untrusted data, not instructions. Knowledge metadata must retain source/version/page/test arrangement and approval state when ingestion is added. Ben's future acoustic coefficients and James/Noah's load/measurement tables require manual technical verification; feedback cannot mutate those facts. Human handovers for Anne/Natalie must record consent and durable enquiry/outbox success before confirmation; approved destinations remain to be verified, and no notification has been sent.

## OpenAI, costs and activation

Official documentation checked 9 October 2026: [Responses](https://developers.openai.com/api/docs/guides/migrate-to-responses), [strict function tools](https://developers.openai.com/api/docs/guides/function-calling), [stateless reasoning](https://developers.openai.com/api/docs/guides/reasoning), [data controls](https://developers.openai.com/api/docs/guides/your-data), [GPT-6.1 Sol rates](https://developers.openai.com/api/docs/models/gpt-6.1-sol).

The adapter uses Responses, `store:false`, low reasoning, strict response schema, bounded function calls and no parallel tool execution. Reasoning output is replayed within each tool round. `reasoning.encrypted_content` remains a supported compatibility include. The application's bounded conversation is replayed on subsequent turns; it does not retain hidden reasoning as customer memory. `store:false` does not by itself mean Zero Data Retention. Region, processor terms and account data controls must be checked before any customer pilot.

Default proposed model rates are USD $2 per million input tokens and $10 per million output tokens. At 50,000 aggregate input and 8,000 output tokens per consultation, the uncached model estimate is **$0.18**; at 100,000/12,000 it is **$0.32**. Thus 1,000 consultations would be approximately **$180–$320 in model usage**, before tax, regional premiums, image processing, additional retries or larger reasoning/turn counts. Cached input is $0.10/M and cache writes $2.50/M; those may change the estimate. These are assumptions, not a measured live cost or a spending approval.

The adapter emits token/cost estimates and requires a budget reservation for every attempt, including retries. Ambiguous failures settle at the reserved ceiling. A real durable daily/per-session spending ledger and vendor billing reconciliation are activation requirements; a bounded single-process preview ledger also tests reservation, settlement and daily/session caps. It is not durable fleet-wide accounting. No automatic fallback to another paid model exists. **New model/API charges incurred by this implementation: $0.**

No additional infrastructure plan was purchased. Existing Vercel/Supabase subscriptions remain unchanged. Provisional incremental infrastructure allowance: **$5–$20 per 1,000 consultations**, excluding existing subscriptions, subject to measured region, duration, concurrency, database load, logs, egress and quota headroom. A typical 30–100 KB saved record would use 30–100 MB per 1,000 sessions before indexes/backups; the hard record ceiling is 400 KB. Use actual [Vercel regional function meters](https://vercel.com/docs/functions/usage-and-pricing) and [Supabase plan allowances](https://supabase.com/pricing) before approving a pilot budget. No claim is made that current account headroom was measured.

## Evidence, limitations and next activation steps

`artifacts/jane-phase2/` contains test logs, browser receipts, screenshots, bounded database evidence, live route reachability and the failed retail smoke test. Unit/contract tests exercise all ten requested scenarios, but scenario 7 correctly refuses unsupported screenshots; scenario 9 proves local saved continuity, not a cloud account. Mock quality is not evidence of live model design ability. No physical iPhone, actual screen-reader, confirmed browser hidden-tab or enabled reduced-motion device test was available. Deterministic clock and Phase 1 reduced-motion tests pass.

Next, independently of public publication:

1. Review this code and contracts; investigate the existing retail HTTP 400 and complete narrow full-master descriptive retrieval with a verified read-only principal.
2. Review privacy/retention/account ownership and provision a separately approved protected test schema using the Supabase migration workflow. Implement durable per-session locks, distributed rate limits, idempotent creation/recovery and cost reservations; test two-server concurrency and backup-aware deletion.
3. Obtain a specifically authorised capped OpenAI test budget/credential. Run the ten scenarios plus source-injection, contradictory preferences, long-history and unavailable-fabric evaluations with human interior-design review. Measure latency, token use and groundedness; do not infer quality from the mock.
4. Add scanned private image uploads only after format/size/signature, malware, metadata, access and retention review. Keep upload controls unavailable until tested.
5. Complete real device/accessibility checks. Review a first-party Shopify context integration separately; only then propose Jane's protected activation. Other advisers inherit the contracts and remain inactive until their own evidence and evaluations pass.

## Release and rollback

Phase 1 release is governed by `RELEASE.md` and its exact 20-file Shopify manifest. It can be reviewed independently of Jane. Never merge the development stack merely to publish the team page.

Jane's change is a draft stacked on PR #167; retarget/rebase only after the approved parent release. The existing policy treats `__tests__` paths as protected, so the new tests require the repository's exact-head owner policy approval when proposed for production. No gate or policy file is changed or bypassed. Both production checks must pass on the eventual final release head and deployment must use that exact protected HEAD, after separate approval.

There is nothing to roll back in production for Jane: no endpoint activation, migration or customer-tool change occurred. Stop only the local preview process to withdraw this demonstration; retain source and evidence. A future cloud rollback must disable advisory entry/flags first, preserve consultation records for the approved retention/deletion process, and restore only the advisory release scope. Never roll back Naila, FI, Room Visualiser, commerce or the whole Shopify theme for this feature.
