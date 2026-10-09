Implements Jane's isolated consultation foundation for Issue #168. Customers in the local mock can discuss an invented room, share selected design context with consent, revise their preferences, receive a personalised summary, and save/resume an encrypted consultation. Every reply is visibly labelled as scripted; no public AI service is activated.

This is **stacked on PR #167**, specifically `851078c674ac2e9231e51dffbd5949ed4ea7c6d1`, so the approved team-page release remains independently reviewable. Do not merge either branch without separate owner authorisation.

## Implementation

- Jane/shared v2 instructions, six separately versioned adviser profiles, strict request/result/tool contracts and source-traceable FI/Room Visualiser guides.
- Read-only exact-ID/prefix Fabric Master adapter, bounded governed retail adapter, strict evidence/product-ID checks and no model SQL/commerce writes.
- Provider orchestration, scripted mock, inactive OpenAI Responses adapter, per-attempt budget reservations and bounded local test accounting.
- Ownership, CSRF/origin/rate/body guards; revisions, idempotency and session locks; opt-in AES-GCM storage, one-time recovery, deletion and saved summaries.
- Proposed isolated Supabase schema with real local PostgreSQL RLS tests. No cloud migration or durable cloud activation.
- Vercel route fails closed, including 404 in production. Local harness is the working implementation; no Vercel deployment.

## Review and evidence

Run `node scripts/jane-preview.mjs`, then open http://127.0.0.1:8789/ on the development computer. Use invented room details only. No API key or new dependency installation is needed.

- [Implementation report](https://github.com/Nylon1/CurtainsUK/blob/feat/jane-consultation-phase2-20261009/artifacts/jane-phase2/IMPLEMENTATION.md)
- [Screenshot gallery](https://github.com/Nylon1/CurtainsUK/blob/feat/jane-consultation-phase2-20261009/artifacts/jane-phase2/REVIEW.md)
- [Architecture, contracts, privacy, costs and activation sequence](https://github.com/Nylon1/CurtainsUK/blob/feat/jane-consultation-phase2-20261009/docs/specialist-advisory/JANE_PHASE2.md)
- [Exact changed-file list](https://github.com/Nylon1/CurtainsUK/blob/feat/jane-consultation-phase2-20261009/artifacts/jane-phase2/changed-files.txt)
- [Programme source of truth](https://github.com/Nylon1/CurtainsUK/blob/feat/jane-consultation-phase2-20261009/docs/CURTAINSUK_SPECIALIST_AI_ADVISORY_PLATFORM.md)

## Validation and limitations

22 Jane/security/adapter/storage tests pass, including ownership RLS, ciphertext restart/recovery, failures, budget caps and all ten requested scenario outcomes. 20 existing team-page tests and 18 existing theme tests pass. Scoped lint and a lightweight route bundle pass. Chrome at 320/390/412/768/1440 has no horizontal overflow. Browser tests show automatic welcome, consented result handoff, changed preference, summary, saved reload/server restart and keyboard focus recovery.

Actual bounded Fabric Master reads and indexed query plans are recorded. **The existing public retail endpoint returned HTTP 400**, so product activation remains blocked. Full-master ID/prefix coverage is implemented; comprehensive descriptive/semantic search across unpublished records still needs an approved indexed approach. Credentialed REST end-to-end validation, real-model quality, cloud ownership/locking/budgeting, uploads, physical iPhone, screen reader and enabled reduced-motion browser checks remain pending. Mock evaluations do not prove a live model's intelligence or prompt-injection resistance.

The new unit-test paths fall under the existing protected policy. Retargeting/rebasing this stack for production will require the normal exact-head owner policy approval and both protected checks. No gate/policy or existing protected product system was edited to bypass review.

No production publication, migration, paid model call, new service purchase or customer notification. Naila, Fabric Intelligence, Room Visualiser, Fabric Master data, canonical pricing/stock, Shopify checkout and manufacturing remain unchanged. No cleanup or backup alteration; a later verified backup is required.

Refs #168. This does not close the remaining activation work.
