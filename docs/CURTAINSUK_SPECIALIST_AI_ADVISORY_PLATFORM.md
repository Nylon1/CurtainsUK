# CurtainsUK specialist AI advisory platform

**Programme source of truth · 9 October 2026 · Phase 1 visually approved; controlled release candidate**

## Owner direction and release preparation — Issue #168

The owner approved the six advisers, portraits and interactive design and authorised implementation of Jane's isolated Phase 2 framework. This is not merge, publication, paid-model activation or production-migration approval. [Issue #168](https://github.com/Nylon1/CurtainsUK/issues/168) and the direct owner brief govern the next stage. The following Phase 1 history remains evidence for its original revisions.

Protected HEAD was freshly re-read as `3649c879a4a5ddf88c2093a4172d20fbc58cd265`, PR #167 as `4e71193e17ab91bec9f8ab732a882ec1bf18d87a` with both required checks successful before this release-preparation revision. MAIN theme remains `182339731835`; Vercel remains READY on `dpl_CvvQKa2zCsFbQ7eZR9Lzi31w7BCD`. No deployment occurred.

The permanent Shopify page has now been created **hidden**, ID `693751873915`, handle and template suffix `meet-our-team`, `isPublished:false`. The shared navigation uses its permanent URL only after publication; DEVELOPMENT themes use the existing working review URL. All approved portraits, cards, motion and room demonstrations are unchanged. See [exact 20-file manifest](../artifacts/specialist-advisory-release/release-manifest.json), [scoped release/rollback instructions](specialist-advisory/RELEASE.md), and [fresh read-back](../artifacts/specialist-advisory-release/readback.json).

The latest local run passed the 20 advisory tests and 18 existing theme tests. Theme Check reported zero errors and 13 existing warnings. At 390 CSS px the mobile menu opens and follows the new adviser link without overflow. Jane's automatic room opening was observed after 39.599 seconds; exact boundary and background restoration remain deterministic test evidence. Physical iPhone/touch, screen-reader, actual-browser reduced-motion and confirmed hidden-tab visibility checks remain pending due unavailable control surfaces; no simulated result closes those items. See [browser limits/evidence](../artifacts/specialist-advisory-release/browser.json).

C: measured 38.41 GiB free at this phase's start; restic PID 45016 remained present. Existing dependencies are reused via a local junction, with no install, backup change, cleanup or supplier ingestion. New work needs a later verified backup.

The immediate deliverable is the native Shopify **Meet Our Team** page and an explicitly non-operational consultation demonstration. It introduces Jane, Anne, Noah, James, Ben and Natalie. No live AI consultation, production deployment, catalogue change, database migration or human notification is authorised or claimed by this Phase 1 record.

## Authority and verified starting state

| Surface | Starting evidence / boundary |
| --- | --- |
| Repository | `Nylon1/CurtainsUK`; protected `release/production` |
| Starting protected HEAD | `3649c879a4a5ddf88c2093a4172d20fbc58cd265`; re-read the remote tip before review/release |
| Development checkout | `C:/Users/hamza/curtainsuk-specialist-advisory-phase1`; isolated from preserved customer-release and historical main checkouts |
| Live Shopify | `www.curtainsuk.com`, `carpetup.myshopify.com`; preflight verified theme `182339731835` is `main` |
| Homepage | PR #166 merged and owner-confirmed live; fresh storefront review is the visual baseline. The unpublished statements in `homepage-studio-review-20261009.md` are historical and superseded. Preserve that historical record. |
| Vercel | Existing project `prj_vl2GLLlSf0AJAKqjs1Nk26ipKHBA`; canonical backend `https://curtainsuk-production-api.vercel.app`; preflight matches recorded deployment `dpl_CvvQKa2zCsFbQ7eZR9Lzi31w7BCD` |
| Runtime source | Deployed Room Visualiser commit `800f42a27a0a6e9beb1abd92821145bf4a4b98c4`, independently verified Git tree `1150dad1d55649597d03df2dbaad01348ea98d63`; do not imply that Vercel stores the tree attestation |
| Room Visualiser | Complete and live; pack `d5908d6eaf486ce33e2f72a5`, FIXED140 pack `3ef99c8970b0b92d4b5986f7`; 11,003 supported identities (3,137 STANDARD + 7,866 FIXED140) |
| Device limitation | Physical iPhone Safari verification remains outstanding. Browser emulation cannot close that item. |
| Storage / backup | Preflight measured **42.28 GiB free on C:**. A `restic` process was present; process visibility alone does not establish backup completion or snapshot coverage. Preserve its scripts, repository and manifests. |
| Existing work | Historical main retains two local commits and untracked themes; existing worktrees and evidence are preserved. No storage cleanup is authorised. New work needs a later backup; an earlier snapshot cannot be presumed to include it. |

Required records were read: [production surfaces](PRODUCTION_SURFACES.md), [Room Visualiser release](room-visualiser-2-customer-release.md), [structured production state](room-visualiser-2-production-state.json), [historical homepage review](homepage-studio-review-20261009.md), [project ledger](CURTAINSUK_PROJECT_LEDGER_2026_09_16.md), [frontend register](CURTAINSUK_FRONTEND_REGISTER_2026_09_16.md), and [release policy](../release/README.md). Dated catalogue counts in September documents are historical snapshots, not a new live database audit.

## Status vocabulary and delivery ledger

**Planned** means future scope; **designed** means a documented contract; **prototyped** means review interaction without a live service; **implemented** means code exists; **tested** requires recorded checks; **approved** requires owner approval; **published** requires verified live release. A later status must never be inferred merely from the previous one.

| Component | Status in this record |
| --- | --- |
| Native six-adviser page, reusable profiles, responsive assets | Implemented and tested in Shopify development theme `182472573307`; unpublished owner-review preview |
| Six synthetic portrait assets | Generated and encoded for the portrait revision; current-revision preview receipt and PR checks must be consulted separately from the initial illustration-version evidence |
| Interactive visual revision | Implemented and tested in the development preview; 20 focused tests passed and all 18 scoped files matched source; current-head CI remains governed by PR checks |
| Waiting room and consultation-room examples | Prototyped and tested for all six advisers; no model, messaging or persistence connected |
| Six separate personality profiles and shared behaviour | Designed, versioned in this change; not attached to a live model |
| Shared platform, data model, contracts and security boundaries | Designed below; not implemented |
| Secure continuity, uploads, knowledge ingestion, enquiries and staff dashboard | Planned; no live service or destination enabled |
| Jane / Anne / Noah / James / Ben / Natalie operational agents | Planned for Phases 3–7 |
| Commercial & Acoustic landing area | Planned in Phase 6; extensible disciplines, no premature theatre/healthcare/hotel implementation |
| Owner approval / publication | Visual design approved by owner / not published; release approval remains separate |

## Selected architecture

Keep the customer experience in the existing `shopify-theme/curtainsuk-dawn-16` architecture. The new page uses scoped Liquid components, CSS and lightweight JavaScript. Its final intended route is `/pages/meet-our-team`. The preview must state that consultations are coming soon; the demonstration cannot accept or pretend to answer free-text questions. There is no second Next.js customer storefront.

Future stages use the **existing Vercel service** for bounded, authenticated orchestration and the existing Supabase platform with an isolated advisory schema. The same consultation-room UI loads an independently versioned adviser profile; each adviser has a different instruction, knowledge and tool access profile. One server orchestrator is sufficient initially. Model/tool adapters isolate provider-specific API details from Shopify. Adding a specialist adds profile data, knowledge permissions and evaluation cases rather than a new chat stack.

For Phase 2, use OpenAI's **Responses API** through a small server-side adapter with explicitly registered function tools and structured schemas. The official guidance recommends Responses for new projects. Tool execution remains application-controlled; a model proposal is validated and authorised before execution. Do not enable hosted shell, computer use, arbitrary MCP servers or open-ended browser tools for these advisers. An Agents SDK layer can be evaluated later if orchestration complexity justifies it; beta multi-agent delegation is unnecessary for launch. [Responses guidance](https://developers.openai.com/api/docs/guides/migrate-to-responses), [function calling](https://developers.openai.com/api/docs/guides/function-calling).

Use `store: false` as the initial application-state design, with consented history controlled in Supabase. This does **not** mean zero OpenAI retention: default abuse-monitoring retention and eligibility for enhanced controls must be reflected in the privacy notice. Verify actual project configuration, region and contracts before live customer testing. [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data).

## Inspected integration map

| Existing surface | Relevant source and future reuse |
| --- | --- |
| Native navigation | `shopify-theme/curtainsuk-dawn-16/snippets/curtainsuk-header-navigation.liquid`; preserve existing entries and mobile behaviour |
| Fabric Library / Browser | `/pages/fabric-library`, `/pages/fabric-library?view=browse-fabrics`; `lib/fabric-master/retail-repository.ts` exposes `searchRetailFabrics` and `retailFabricDetail` |
| Product retrieval | Search RPC selection in `lib/fabric-master/browse-rpc.ts`; at most 24 records hydrated per retail page. Reuse approved/verified images, published profile URLs and commercial-readiness results. Do not call full-master scans for a conversation. |
| Fabric knowledge | `lib/fabric-master/visual-knowledge.ts`, `visual-knowledge-source.ts`, `hci-visual-knowledge.ts`; exact Fabric Master IDs and approved visual classifications remain authoritative |
| FI customer entry | `/apps/curtainsuk-decision/consultation?experience=premium&entry=guided` or `entry=match`; `lib/storefront/hci-premium-contract.ts`, `hci-premium-integration.ts` and `hci-premium-proxy-server.ts` |
| FI behaviour | Current contract supports room/reference-image types, editable palette, price levels, calibration, direction feedback and refinement. Source has governed progressive direction delivery; the older ledger's five-direction description is not a licence to promise a fixed current count. Verify the rendered journey before Jane teaches it. |
| Room Visualiser | `/pages/room-visualiser`; native section and existing signed app-proxy iframe. Living Room, Bedroom, Lounge, Office; preserve existing supported-fabric gate, headings, lighting, palettes and controls. No new renderer or control is introduced. |
| House of Curtains | `/pages/build-my-rooms`; `lib/storefront/rooms-core.ts`, `rooms-server.ts`, `rooms-checkout-server.ts`; saved browser state is context only, not price or order authority |
| Measuring | `/pages/how-to-measure`; `assets/curtainsuk-guided-measure.js` preserves explicit anchors, raw readings, units, rule version and customer confirmation. It labels browser-saved work as not submitted and requires workroom review; Noah must preserve those distinctions. |
| Fitting | `/pages/how-to-fit`; approved Forest/TrackFit service and calculator contracts still need targeted verification in Phases 5/8 |
| API boundary | `app/api/staging/shopify-proxy/[operation]/route.ts`, `lib/storefront/security/shopify-proxy-operations.ts`, `shopify-app-proxy.ts`; existing operation allowlist, signed shop/path/timestamp checks and per-endpoint limits |
| Staff workflows | `lib/storefront/review-request-repository.ts`, `review-authz.ts`, `security/evidence-workflow.ts`, `security/evidence-persistence.ts`; useful patterns for idempotency, durable receipts, staff permissions and private evidence. Do not repurpose existing review/order records for advisory leads. |

The `/api/staging/...` naming is established production infrastructure. Do not rename it cosmetically. Existing legacy/public routes are not automatically suitable for new adviser use; each future adapter needs its own contract and authorisation test.

## Adviser profiles and consultation behaviour

The six profile files independently carry `profileVersion: 1.0.0`, status, voice, questioning style, vocabulary, expertise, boundaries, intended knowledge and destinations. They are design artifacts, not executable agent configuration. All reference [shared consultation v1](specialist-advisory/shared-consultation.v1.md).

| Adviser / profile | Approach and intended primary context |
| --- | --- |
| [Jane](specialist-advisory/jane.v1.json) | Flagship; warm, elegant, exploratory and creative. Interiors, palette, pattern scale, texture, light and use of existing design tools. Specific fabric recommendations are optional. |
| [Anne](specialist-advisory/anne.v1.json) | Friendly, organised and efficient. House of Curtains, verified commercial/admin information and real staff enquiries. |
| [Noah](specialist-advisory/noah.v1.json) | Precise, patient and sequential. Measurement anchors and verified calculators, with understanding checked at each step. |
| [James](specialist-advisory/james.v1.json) | Practical, direct and approachable. Installation constraints, manufacturer rules and professional fitting assessment. |
| [Ben](specialist-advisory/ben.v1.json) | Investigative and analytical. Diagnose absorption/reverberation versus transmission; explain test conditions and uncertainty. |
| [Natalie](specialist-advisory/natalie.v1.json) | Personal, attentive and design-focused. Apex geometry and bespoke constraints, ending in consented human handover where wanted. |

Shared loop: understand → investigate → reason → recommend → listen/refine → conclude. Profiles adapt their questions rather than following a rigid script. The final summary records goals, recommendations, alternatives, unresolved issues and next steps. Ten minutes is the free expected format; continuation or a saved return is supported in the future service, with no abrupt cutoff. Text is the launch scope; voice is deferred.

## Waiting room and operational honesty

Phase 1 demonstrates a roughly 30-second welcome with identity, preparation guidance, elapsed-time progress, accessible skip/exit and an automatically opened example consultation room. There is no invented queue or claim that an adviser is busy. Use an absolute start/deadline and recalculate on visibility changes; do not decrement a counter once per timer tick. Reduced motion removes decorative animation without suppressing progress information. Countdown announcements should be throttled so assistive technology is not interrupted each second.

Future service readiness must be server-authoritative, independently enabled per adviser after evaluation and approval. Theme settings and browser state cannot turn an adviser operational. Initialisation failures show recovery and preserve valid customer input. A genuine outage must not transition into a fake consultation or fabricate a response.

## Interactive visual revision

**Implemented and tested in the unpublished owner-review preview.** The hero now includes a six-adviser spotlight selector with Jane selected initially. Keyboard-operable buttons select each adviser's original portrait, title, personality and example question. The spotlight links to the actual profile on the page and opens the existing labelled shared consultation demonstration.

Layered cards add visual depth, with gentle portrait tilt for pointer input and a one-time entrance as content scrolls into view. Reduced-motion handling suppresses decorative motion. There is no autoplay, network request from the interaction controller, browser storage or model call. All six services remain upcoming, with no live consultation introduced.

This revision adds `assets/curtainsuk-advisory-interactions.js`, `assets/curtainsuk-advisory-motion.css` and `snippets/curtainsuk-advisory-spotlight.liquid`, plus scoped edits to the existing advisory section and additive advisory locale text. The total theme scope is now **18 files**. Earlier tests, screenshots and nine-/15-file receipts remain evidence for their respective revisions.

The [interactive test run](../artifacts/specialist-advisory-phase1/interactive-tests.log) passed **20 tests: the 10 shared controller/content tests rerun plus 10 new interaction tests**. This count must not be added to the initial 42 as if every test were new. The new tests include reduced motion at startup and when the preference changes, coarse-pointer behaviour, bounded pointer effects, observer fallback and lifecycle cleanup. [Theme Check](../artifacts/specialist-advisory-phase1/interactive-theme-check.json) recorded **zero errors and 13 existing warnings**. The [interactive read-back](../artifacts/specialist-advisory-phase1/interactive-readback.json) confirms **18/18 scoped preview files match source and all 505 MAIN-theme files remain unchanged**.

[Connected Chrome checks](../artifacts/specialist-advisory-phase1/interactive-browser.json) cover **320, 390, 412, 768 and 1440 CSS px**: no horizontal overflow, loaded portraits after lazy-image completion, exactly one active spotlight panel and selector targets at least **47 px wide and 68 px high**. All six adviser selections showed the correct identity and demo target. Home then ArrowRight selected Anne; End then ArrowLeft selected Ben, with visible focus. Fine-pointer portrait tilt was observed in the browser. Noah's hero action opened his waiting room, and Escape restored its opener. At 320 px, skip opened Noah's illustrative room with zero inputs and a disabled send control; six profile cards were confirmed at 320 and 1440 px. The [current gallery](../artifacts/specialist-advisory-phase1/review-gallery.html) shows this revision. Physical iPhone, screen-reader and actual reduced-motion browser checks remain outstanding; reduced-motion evidence is automated, not an OS/browser emulation result. Current-head CI is reported by the PR checks tab, not inferred from these local results.

## Proposed data model — no migrations in Phase 1

Prefer an unexposed `advisory` schema, with explicit least-privilege grants and RLS as defence in depth. Keep Fabric Master and commerce tables unchanged. Exposed objects need both grants and row ownership policies; authentication alone does not authorise access to another customer's rows. Views must not silently bypass the intended row restrictions. [Supabase API security](https://supabase.com/docs/guides/api/securing-your-api), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

| Proposed object | Minimum purpose / fields |
| --- | --- |
| `consultations` | UUID, owner subject, adviser ID, profile/shared-policy versions, state, revision, creation/update/expiry timestamps, selected processing basis and consent references |
| `messages` | Consultation ID, monotonic sequence, role, bounded content, request ID, provenance references; unique `(consultation_id, request_id)` for retry safety |
| `summaries` | Versioned customer-facing goals, room/project context, preferences, constraints, considered options, feedback, revised advice, open questions and next steps; no internal reasoning trace |
| `context_grants` / `context_snapshots` | Source system, explicit selected fields, consent scope/version, origin, signed reference or customer-supplied designation, expiry/revocation; immutable revisions |
| `session_capabilities` / `recovery_challenges` | Hashed random credentials, owner/session binding, scope, expiry, rotation/revocation, one-use challenge status; no raw token logs |
| `consents` | Purpose, displayed notice version, authorised recipient/team, fields/attachments, decision and timestamp; separate save, image processing and human referral purposes |
| `attachments` | Owner/session, private object key, detected type/size/hash, scan/quarantine status, consent, expiry and deletion state; no public bucket |
| `knowledge_sources` / `source_versions` | Publisher, URL, rights/permission basis, source identity/version/hash, retrieved date, valid/superseded status, specialist scopes |
| `knowledge_chunks` / `verified_claims` | Page/table/section provenance, bounded text, retrieval index, confidence, extraction/verification state; numeric claims include units and test arrangement |
| `ingestion_jobs` | Source version, cursor, bounded batch, retry count, cost/I/O observations, errors and review requirements |
| `enquiries` / `enquiry_events` | Customer-authorised summary/contact/context, recipient team, status, assigned staff, consent, submission receipt, response history; idempotent create |
| `notification_outbox` | Enquiry reference, verified destination ID, minimal payload, attempts, queued/sent/failed receipt; committed with enquiry, delivered asynchronously |
| `usage_events` / `audit_events` | Pseudonymous request, operation, status, latency, model/profile version, tokens and cost estimate; no message body, room photo or personal contact detail |

Do not authorise from user-editable metadata. Staff roles come from verified administrative claims and team scopes. Service-role credentials bypass ordinary RLS and must remain server-only; use a scoped database role or tightly constrained server queries, with independent owner checks even where a privileged client is used. No schema exposure, global grant change or migration is part of this phase.

## Session continuity and customer context

Existing `hci-proxy-server.ts` explicitly records that Shopify strips cookies. Therefore the advisory proxy cannot rely on setting an HttpOnly cookie through that route. Design a new, independent, revocable opaque capability bound to one advisory owner and session, issued only after signed-proxy checks. Keep it in memory by default; any device persistence needs a clear customer choice, a short expiry and an explicit clear-device action. Do not put tokens in URLs, analytics or logs. Do not reuse HCI or Naila signing keys, storage namespaces, capabilities or memory.

Cross-device recovery requires a verified customer/account binding or single-use recovery challenge delivered through an approved channel. An email address or order number supplied to the model is never sufficient. Customer-specific order lookups need a stronger verified order-owner check, independent of an anonymous consultation capability. Prove logout, expiry, revocation, recovery replay and ownership enforcement before launch.

“Discuss my results with Jane” is designed for a later contextual integration. A consent screen lists the selected Fabric Master IDs, room, heading, customer-safe colours/settings, discovery preferences, saved design references and feedback. The server revalidates IDs and commercially meaningful data. Data passed from the browser is untrusted consultation context; it cannot override signed configuration, prices or eligibility. No automatic read of House, FI or visualiser local storage and no modification of their engines. If there is no approved structured export, accept a customer-authorised screenshot/share reference with a clear statement that it may be incomplete. Authorised later revisions extend the same consultation.

## Planned tool contracts

Every tool has a strict schema, version, adviser allowlist, authenticated caller, bounded inputs/results, timeout and an output classification. The server rejects extra fields and unknown operations; the model cannot choose an owner, staff role, arbitrary SQL, destination URL or arbitrary file path. Responses carry provenance and explicit `unknown`/`stale`/`not_available` states rather than fabricated fallbacks.

| Contract (proposed names) | Inputs → permitted outputs / authority |
| --- | --- |
| `search_fabric_knowledge.v1` | Bounded query/filters/cursor → customer-safe facts across the complete master knowledge index, exact IDs and eligibility classification. No cost/margin fields or purchase assertion. Jane's full coverage is distinct from the retail projection. |
| `search_retail_fabrics.v1` / `get_retail_fabric.v1` | Existing governed filters or exact ID → approved public metadata, real approved image URLs, current retail/readiness result, evidence time and supported links. Reuse bounded projections. |
| `lookup_commercial_facts.v1` | Exact permitted IDs/configuration reference → current governed retail quote/status or confirmation-required state; never editable price, supplier cost or raw order mutation. |
| `get_tool_guidance.v1` | Allowlisted tool ID + version → verified customer controls, eligible route, limitations and source. No guessed features. |
| `retrieve_evidence.v1` | Specialist-scoped query and bounded limit → approved excerpts, source version/page/table, technical arrangement and verification state. No model-invented citations. |
| `calculate_measurement.v1` | Known calculator/rule ID, explicit values and units → validated deterministic result, assumptions, rule version and review requirements. Missing input remains missing. |
| `attach_context.v1` / `save_summary.v1` | Customer-approved fields plus expected revision → session-bound snapshot/summary receipt; no source-system write. |
| `get_verified_order_status.v1` | Server-verified order entitlement/reference → minimum customer-safe status; disabled until Anne's identity/authority flow is tested. |
| `create_enquiry.v1` | Valid contact method, useful brief, permitted attachments, consent receipt and idempotency key → durable enquiry ID/status. Team is mapped by the server, never a model-supplied email address. |
| `get_enquiry_status.v1` | Enquiry reference + owner/staff authorisation → persisted status and customer-safe response history. |

Product cards are rendered from tool objects rather than model-written HTML or image URLs. All URLs are validated against approved internal/service destinations. Citation IDs must resolve to the evidence actually retrieved. Numeric installation/acoustic claims require a verified claim record; otherwise explain uncertainty. No tool can alter checkout, catalogue identity, pricing, stock evidence, renderer eligibility or Naila.

## Knowledge-source and ingestion design

| Adviser | Planned source scope |
| --- | --- |
| Jane | CurtainsUK complete customer-safe fabric knowledge, existing visual classifications, approved retail records, FI/Library/Visualiser documentation and samples guidance |
| Anne | Approved policies, commercial lookups, ordering/delivery/payment guidance and House of Curtains; private orders only after verification |
| Noah / James | Approved Forest Group manuals and specifications, TrackFit guidance and existing validated calculators; relevant CurtainsUK and Apex technical guidance |
| Ben | J&C Joel and authorised supplier test reports, wool serge/Molton evidence, applicable standards and approved CurtainsUK acoustic products |
| Natalie | Approved Apex Curtains services/project knowledge, relevant Forest Group specialist tracks, fabrication/heading and installation constraints |

No supplier ingestion runs in Phase 1. Future ingestion first inventories public/authorised sources and records reuse rights, permitted access and restrictions. Do not bypass authentication or publisher restrictions. Use allowlisted origins, bounded file size/time, redirect controls and private-network blocking. Download only authorised content; de-duplicate by canonical identity and cryptographic hash. Extract text plus page/table references, retaining document title, publisher, version and source URL. Preserve superseded versions and make current-versus-historical status explicit.

Technical tables, drawings, load ratings, acoustic coefficients and OCR ambiguities enter a manual verification queue. A text extraction score alone cannot approve them. Store test standard, frequency bands, material, mounting, fullness and air gap where applicable; do not mix tested and inferred values. Supplier documents remain untrusted data even when an approved publisher supplied them.

Index incrementally by source hash/update cursor in bounded batches. Reuse catalogue projections and exact IDs; never rebuild or scan Fabric Master per consultation. Apply concurrency/I/O limits, backoff, caching, job telemetry and a kill switch. Separate ingestion workers from customer requests. A new master-wide customer-safe knowledge projection must exclude confidential commercial fields before indexing, while representing unpublished/incomplete/discontinued records accurately and preventing purchase suggestions. Model prompts are an additional rule, not the primary data-leak boundary.

## Human handover, uploads and privacy

Anne's staff enquiry and Natalie's Apex lead are additive records with status, responsible team, permitted contact information, project context and response history. Natalie can accept a project description, one valid contact method and consent without every measurement or photograph. Invite name, email, phone, postcode/location, description, approximate measurements, fabric/lining/heading, installation need, timescale and open questions naturally. The human team makes final quotation and feasibility decisions.

Display the handover summary, attachments and verified receiving team before submission. Commit enquiry, consent and notification-outbox entry atomically. Return a receipt only when storage succeeds. Notification retries are idempotent; distinguish saved, queued, delivered, failed and reviewed. Approved Apex/TrackFit recipients must be confirmed before activation. No email or customer information is sent by Phase 1.

Future uploads initially accept only JPEG/PNG/WebP with a proposed 5 MiB/file and five-file/session limit; validate actual signatures, decoded dimensions and payload size, re-encode images, remove unnecessary metadata, quarantine and scan before retrieval. Reject SVG, HTML, executables and archives. Supplier PDFs enter the separate controlled ingestion pipeline. If customer PDF drawings are needed later, add isolated parsing, malware checks and dedicated validation before enabling them. Storage stays private, with ownership checks and short-lived signed access for the intended team. [Supabase storage controls](https://supabase.com/docs/guides/storage/security/access-control).

Before live testing with personal data, publish an accurate notice covering AI identity, purpose, processors, optional continuity, images, referrals, retention and rights. Record a suitable processing basis per purpose with privacy-owner review; optional save/referral controls are not a blanket substitute for that assessment. Proposed engineering defaults for review: unsaved session expiry 24 hours; opt-in saved consultation 90 days after activity; rejected/quarantined upload purge within 24 hours; lead retention set by the approved enquiry policy. These are **proposals, not approved legal requirements**. Implement deletion across messages, summaries, attachments, grants, recoveries, indexes and applicable processor state; distinguish backup expiry from immediate active-store deletion. Do not automatically change authoritative knowledge from customer feedback. [ICO data protection by design guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/guide-to-accountability-and-governance/data-protection-by-design-and-by-default).

Security controls include signed-proxy authentication, independent consultation ownership, bounded JSON, CSRF/origin handling appropriate to the transport, strict rendering, per-IP/session limits, global spend limits, concurrency limits, idempotency, optimistic revision checks, safe error messages, privacy-conscious telemetry and a feature kill switch. A database/limiter outage fails closed for writes while preserving the customer's recoverable input. Test prompt injection from documents and uploads, fabricated evidence requests, cross-customer reference swaps and private-field leakage.

## Operating/API cost model — estimate, not a bill

Official API documentation checked **9 October 2026** lists `gpt-6.1-sol` at **$2/1M input tokens, $0.10/1M cached input, $2.50/1M cache-write tokens and $10/1M output tokens** at standard short-context rates. It accepts text/images, supports streaming and structured output, and uses Responses for tool calling. Treat it as a quality/cost evaluation candidate for Jane, not an already selected production deployment. [Model details](https://developers.openai.com/api/docs/models/gpt-6.1-sol), [current pricing](https://developers.openai.com/api/docs/pricing).

| Explicit uncached planning scenario | Model-only estimate |
| --- | ---: |
| Ten-minute text consultation: 50,000 total billed input tokens across all turns + 8,000 billed output/reasoning tokens | $0.18 |
| Longer / more evidence-heavy consultation: 150,000 input + 20,000 output/reasoning tokens | $0.50 |
| 1,000 consultations at those assumptions | $180–$500 |
| 10,000 consultations at those assumptions | $1,800–$5,000 |

These are workload assumptions, not measured usage or an upper limit. Repeated history, reasoning, tool loops, images, cache writes, retries and longer conversations change the bill. Caching may lower cost; it is not assumed above. Regional processing currently adds 10% where applicable; a $0.18 example becomes $0.198 before other costs. Use billed usage telemetry, explicit tool/turn/token budgets and a daily spend cap, with graceful continuation/recovery rather than silently truncating advice.

The proposed index remains in Supabase; no OpenAI hosted file-search store is required initially. If later adopted, the current listed fees are $0.10/GiB/day after the first free GiB and $2.50/1,000 calls, in addition to model usage. For example, two GiB total plus 10,000 calls in a 30-day month would add approximately $28 under those rates. Embedding and ingestion costs require measured corpus size and are separately budgeted. [Pricing](https://developers.openai.com/api/docs/pricing).

Phase 1 has **zero ongoing consultation API cost**. For planning only, allow an initial **$50–$150/month incremental operations reserve** for database/storage/egress/functions/logs/approved email services; this is an internal budget allowance, not a verified provider quote. Existing account plans, headroom and observed utilisation have not been inspected for a billing estimate. Obtain those before Phase 2 activation; no plan upgrade or purchase is authorised here. On that reserve, 1,000 consultations would suggest a provisional **$230–$650/month** before tax, FX, image/embedding extras, staff time or any separate base subscriptions. No GBP conversion is asserted.

Supabase's current changelog was checked. Its September Postgres minor-release advisory concerns extension/index compatibility; Phase 2 must inspect actual database/extension versions before migrations, without treating that advisory as authority to change the production database now. No adapter/runtime upgrade is part of this phase. [Supabase changelog](https://supabase.com/changelog.md), [Postgres advisory](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes).

## Phase 2 implementation plan and release gates

1. Add server-only adviser registry, model adapter, strict tool contracts and feature flags. Pin dependencies; keep production flags off. Use a mock model first and record profile/policy versions for every response.
2. Implement isolated session/message/summary/consent persistence in a non-production environment, with explicit grants, ownership, revocation, expiry, request idempotency and revision conflict handling. No live Fabric Master writes.
3. Add signed Shopify proxy operations for advisory session/message/summary/recovery only after reviewing transport limits and replay behaviour. Preserve the existing operation policies and all Naila/HCI routes. Validate streaming versus bounded polling through the actual Shopify proxy before choosing the transport.
4. Connect the reusable waiting/consultation UI to mocks, including send/retry, cancellation, slow response, tab background/resume, soft ten-minute guidance and summary recovery. No fake queue language.
5. Implement read-only fake/fixture product and knowledge adapters; verify output projection, exact identity and evidence citations. Add real bounded retail reads only after controlled tests; master-wide knowledge remains a separate governed projection.
6. Implement privacy notice versions, consented context selection, delete/export lifecycle and recovery challenge design. Verify approved recipient configuration before any real notification. Uploads may remain disabled until quarantine/storage tests pass.
7. Run controlled conversations against the candidate model using synthetic data and budget caps. Build the six personality evaluations, then prioritise Jane. Record hallucinated facts, retrieval accuracy, helpful questioning, feedback adaptation, latency and cost; no implicit promotion from a successful demo.
8. Present the concrete Phase 2 candidate, security results, real operating estimate and rollback plan for owner approval. Go live only through the existing protected release process with explicit authorisation.

Required Phase 2 tests: cross-owner read/write rejection, session-fixation/recovery replay, tampered/expired capabilities, direct unsigned-proxy access, strict schema rejection, request duplication, stale revision, prompt injection, fabricated citation rejection, supplier-field exclusion, stale stock/price treatment, unavailable limiter/storage/model, disconnect/retry without duplicate messages, deleted session/attachment access, upload spoofing/oversize/quarantine, consent withdrawal, and enquiry saved-versus-notified distinctions. Validate calculator contracts and numeric acoustic claims with specialist fixtures before their phases. Only a verified identity/order-authority flow can enable Anne's order tool.

Following sequence: **Phase 3 Jane**, **4 Anne**, **5 Noah and James**, **6 Ben plus Commercial & Acoustic entry**, **7 Natalie**, **8 contextual integrations after individual agents pass**. Keep the homepage lightweight; do not add six global chat widgets.

## Phase 1 acceptance, owner review and release

Acceptance requires all six accurate AI-labelled profiles, Jane's prominence, reusable structure, honest upcoming states, working verified links, the elapsed-time waiting demonstration, mobile/desktop visual parity with the current homepage and no horizontal overflow at **320, 390, 412, 768 and 1440 px**. Check keyboard order, visible focus, dialog focus restoration, Escape/exit, reduced motion, meaningful headings and progressive fallback. The chat example must not impersonate a working service or save customer text.

Regression evidence must cover the homepage, Fabric Library, FI, Room Visualiser, House of Curtains, measuring/fitting, navigation and non-purchasing cart/checkout paths. A route returning 200 is a reachability check, not proof of a full checkout. Do not place another payment merely to reprove existing commerce. Physical iPhone testing remains a separate outstanding result unless a device is actually used.

### Verified Phase 1 integration and evidence

[Open the working Shopify preview](https://www.curtainsuk.com/pages/fabric-library?view=meet-our-team&preview_theme_id=182472573307). It runs on **DEVELOPMENT theme `182472573307`**, using an alternate template on the existing Fabric Library page for review. The intended `/pages/meet-our-team` destination remains unpublished. The portrait revision presents six distinct AI-generated fictional adviser identities, gives Jane the featured position and retains the labelled waiting/consultation-room demonstration from each profile.

All six portraits depict fictional adults in their thirties. The requested representation is white British for Jane, Anne, James, Ben and Natalie, and brown British for Noah; these are creative specifications for synthetic characters, not claims about real staff. Each original was generated with the built-in image-generation tool. The six **1024 × 1024 WebP** theme assets total **436,350 bytes**, as recorded in `C:/Users/hamza/curtainsuk-advisory-portraits/encoding.json`. Original generated images and exact prompts are preserved outside the repository in that folder. See [portrait prompts and provenance](specialist-advisory/PORTRAITS.md). The custom-adviser generic SVG remains available for future profiles without bespoke artwork.

Ordinary theme duplication failed. The isolated development preview was built using the preserved **505-file current-live snapshot**, initially with nine scoped advisory files added or changed. The portrait revision expanded the scoped theme change to 15 files; the interactive visual revision adds three files, bringing the current scope to **18 files** listed below. No historical draft was reused or deleted. The canonical live theme was not modified. Development previews are temporary: Shopify can remove them after seven days of inactivity or when the CLI session is logged out. The owner-review link should therefore be checked before a later review; this is not a permanent unpublished-theme guarantee.

The following checks record the initial Phase 1 implementation. They do not by themselves verify the later portrait revision or establish CI success on a newer commit; use the refreshed preview receipt, gallery and current PR checks for that revision.

| Verification | Recorded result / limit |
| --- | --- |
| Automated checks | **42 tests passed: 10 new controller/content tests and 32 existing regression tests.** The initial Guided Measure fixture failure was resolved by materialising its existing tracked migration files in the sparse checkout, without changing the fixture or production source. |
| Shopify Theme Check | **Zero errors; 13 pre-existing warnings** in unrelated files; no finding in the new page implementation. |
| Responsive layout | Connected Chrome at **320, 390, 412, 768 and 1440 px**: all six profiles, one H1, no missing translations and no horizontal overflow. |
| Adviser interactions | All six real UI open/skip/close paths passed; each showed its own identity, preparation and illustrative opening, with focus restored on close. |
| Keyboard / focus | At 390 px, actual browser keyboard wrapping, visible focus outline and Escape closure were verified. This does not constitute a full screen-reader audit. |
| Timer | The real browser automatically reached the room when observed **42.214 seconds** after entry. The exact 30-second boundary and background-tab catch-up passed deterministic controller tests; the browser record is not a precise transition-time measurement. |
| Preview honesty | No free-text input; disabled send control; coming-soon and illustrative-opening notices. The controller tests reject network, cookie and browser-storage access. No live AI, uploads, enquiries or consultation persistence are enabled. |
| Extensibility | Reusable adviser blocks and one shared room/controller; up to 20 configured blocks with a custom identity/text option. Additional advisers use the generic illustration until their own artwork is supplied. |
| Remaining device/accessibility checks | **Physical iPhone Safari, screen-reader testing and an actual reduced-motion browser run were not performed.** CSS rules were inspected; the later interaction tests verify reduced-motion startup and preference changes. Chrome viewport checks are not physical-device results. Native `dialog` support is required for the demonstration; unsupported browsers retain the profiles/tools while hiding demo entry controls. |

Evidence is preserved in [the Phase 1 artifact folder](../artifacts/specialist-advisory-phase1/): [preflight](../artifacts/specialist-advisory-phase1/preflight.json), [responsive results](../artifacts/specialist-advisory-phase1/responsive-browser.json), [consultation interactions](../artifacts/specialist-advisory-phase1/consultation-browser.json), [test log](../artifacts/specialist-advisory-phase1/regression-tests.log) and [Theme Check output](../artifacts/specialist-advisory-phase1/theme-check.json). Captures include the [desktop hero](../artifacts/specialist-advisory-phase1/desktop-1440-hero.jpg), [featured Jane](../artifacts/specialist-advisory-phase1/desktop-1440-jane.jpg), [other advisers](../artifacts/specialist-advisory-phase1/desktop-1440-advisers.jpg), [desktop waiting room](../artifacts/specialist-advisory-phase1/desktop-waiting-room.jpg), [desktop consultation example](../artifacts/specialist-advisory-phase1/desktop-consultation-room.jpg), [390 px Jane](../artifacts/specialist-advisory-phase1/mobile-390-jane.jpg), [390 px waiting room](../artifacts/specialist-advisory-phase1/mobile-390-waiting.jpg) and [390 px consultation example](../artifacts/specialist-advisory-phase1/mobile-390-room.jpg), plus captures at every required viewport.

The 18-file theme scope, relative to `shopify-theme/curtainsuk-dawn-16/`, is:

- `assets/curtainsuk-advisory-team.css`
- `assets/curtainsuk-advisory-room.css`
- `assets/curtainsuk-advisory-team.js`
- `assets/curtainsuk-advisory-interactions.js`
- `assets/curtainsuk-advisory-motion.css`
- `assets/curtainsuk-adviser-jane.webp`
- `assets/curtainsuk-adviser-anne.webp`
- `assets/curtainsuk-adviser-noah.webp`
- `assets/curtainsuk-adviser-james.webp`
- `assets/curtainsuk-adviser-ben.webp`
- `assets/curtainsuk-adviser-natalie.webp`
- `sections/curtainsuk-advisory-team.liquid`
- `snippets/curtainsuk-adviser-art.liquid`
- `snippets/curtainsuk-adviser-card.liquid`
- `snippets/curtainsuk-advisory-room.liquid`
- `snippets/curtainsuk-advisory-spotlight.liquid`
- `templates/page.meet-our-team.json`
- `locales/en.default.json` — additive `advisory_team` namespace only; existing translations verified unchanged.

The [implementation report](../artifacts/specialist-advisory-phase1/IMPLEMENTATION.md), [review gallery](../artifacts/specialist-advisory-phase1/review-gallery.html), [changed-file manifest](../artifacts/specialist-advisory-phase1/changed-files.txt) and [source/upload read-back](../artifacts/specialist-advisory-phase1/preview-readback.json) form the review package. [Draft PR #167](https://github.com/Nylon1/CurtainsUK/pull/167) targets `release/production`; its checks tab is authoritative for CI on the current head. The initial read-back verified that all **505 live-theme file checksums remained unchanged** and the original nine scoped preview files matched source. The [portrait revision read-back](../artifacts/specialist-advisory-phase1/portraits-readback.json) confirms all 15 scoped files match source and all 505 live-theme files remain unchanged. The [portrait browser checks](../artifacts/specialist-advisory-phase1/portraits-browser.json) reconfirm six loaded portraits and no overflow at all five widths. These facts do not imply release approval.

C: had **42.28 GiB free at preflight and 41.89 GiB at 18:34 UTC**; see the [initial delivery storage observation](../artifacts/specialist-advisory-phase1/storage-final.json). The interactive revision started at 38.56 GiB free; its [latest storage receipt](../artifacts/specialist-advisory-phase1/interactive-storage.json) records **38.45 GiB free at 19:19:12 UTC**, with `restic` PID 45016 still present. No dependency installation or cleanup was performed. No completed backup or later snapshot coverage is claimed. This new work requires a later backup. All production release and owner-approval requirements below remain in force.

Only the new scoped files are candidates for a later theme release. The owner-review preview is unpublished and is not live-theme parity evidence. Do not publish an entire draft or copy historical theme settings/navigation. Before any authorised release: re-read protected HEAD and live target files, compare the scoped diff with current Theme Editor state, pass `curtainsuk-production-gate` and `protected-production-policy`, merge through the protected process and obtain explicit owner publication approval. This theme-only phase requires **no Vercel deployment**.

For an approved scoped page release, capture the affected live template/section/assets before upload and read them back afterward. Publish the native page/navigation only within the approved scope. Roll back by restoring those scoped bytes/page assignment and disabling the new entry if necessary; do not touch unrelated theme files, commerce, Naila or the live visualiser. A future API release records exact protected commit/tree, deployment and feature flags with a tested kill switch and prior known-good deployment. The historical `release/baseline.json` rollback target must not be used as current authority.
