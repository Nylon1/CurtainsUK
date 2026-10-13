# Jane protected browser review, 13 October 2026

This is synthetic, private Preview evidence. It is not a customer launch or a physical-device accessibility certification. The tested UI source is draft PR #169 commit `367884b54030257d002789865991a7992dc3fe59`.

## Deployment and access

- Existing Vercel project `prj_vl2GLLlSf0AJAKqjs1Nk26ipKHBA`; no new project or production deployment.
- Mock browser Preview `dpl_CVRwWzt8LZ53AX2k6oyvFJ6UqUFd` and real-model browser Preview `dpl_HatKJNYFgWDFRQuqZpk1QX5LbVAf` were both `READY` and `target=preview`. An unauthenticated request to each redirected to Vercel Authentication. The real-mode URL was `https://curtainsuk-staging-oigkdfggy-hamzas-projects-4ef62f35.vercel.app/jane-review`.
- The operator signed into Vercel in the in-app browser and used an approved synthetic Supabase Auth account, a refreshed short-lived session verified by Supabase Auth, and a separate exact-deployment signed grant. Browser fields and local transfer were masked. Tokens, passwords, grants, signing keys and database credentials were not committed or printed in this receipt.
- The alternate **active test session** login applies only to the protected `/jane-review` development UI. The normal password login remains. It does not change Shopify customer authentication.

## Observed browser journey

| Check | Result and limit |
| --- | --- |
| Signed-in private chat | PASS in the in-app browser on both Preview modes. The protected page disclosed Jane's AI identity and showed no consultation before authentication. |
| Consent and waiting | PASS. Enter consultation stayed disabled until explicit synthetic storage consent. The 30-second timer showed progress and automatically opened after the tab was backgrounded. `Start now` also opened the room. |
| Exact fabric | PASS in real mode. `?fabric=pt-3697-770` displayed `SHAMBALA · LAGOON`, the exact ID, its governed fabric-detail link and a Room Visualiser link containing the same ID. Sharing required a separate checkbox. The context request completed and the UI confirmed the exact fabric was in the consultation. |
| Live Room Visualiser | PASS for this supported identity. The live page at `/pages/room-visualiser?fabric=pt-3697-770` loaded Living Room and showed `SHAMBALA — LAGOON` selected, with the same fabric-detail and sample destinations. The Room Visualiser runtime was not changed. |
| Real model | PASS for one invented room question. Jane discussed why the selected pattern felt busy, suggested warm stone and muted blue-green directions, explained how to compare options in the existing visualiser, and advised a physical sample for final colour. This is one browser reply, not a full design-quality certification. |
| Saved return | PASS. A one-time code saved the conversation. The same approved synthetic owner signed in on a separate tab with no session-storage history and recovered the question and reply. The code was kept in browser memory and not recorded here. |
| Deletion | PASS. The recovered test consultation was deleted in the browser. A scoped hosted database readback found zero remaining consultations for each of the two synthetic owners. |
| Mock mode | PASS for signed-in scripted reply and deletion. Exact-fabric sharing returned the honest `KNOWLEDGE_UNAVAILABLE` path because mock mode intentionally has no catalogue connection; the real mode passed the handoff. Do not use mock-mode sharing as a live product demonstration. |
| Accessibility | The signed-in browser accessibility tree exposed labelled controls, AI identity, a conversation log, consent, error/status text and a focused message input after the reply. This is browser-tree and keyboard-focus evidence, **not** spoken screen-reader verification. |

The existing durable US$5 test run was reopened only for the approved synthetic browser reply. Its final ledger was **111,194 microdollars (US$0.111194 total, including the earlier US$0.046090)** against a 5,000,000-microdollar cap. The run was then disabled and its state read back. No real customer data, payment, order, migration, indexing, Fabric Master source change, Shopify theme publication or production Vercel deployment occurred. The temporary local transfer server was stopped and the browser clipboard overwritten with harmless test text.

## Local checks and remaining release gates

The protected package built from the exact UI commit. Focused Auth/admission tests passed 10/10; adviser interaction tests passed 10/10. `node release/gate.mjs` passed all 11 protected capability groups at that source, including Fabric Master, stock, pricing and checkout. The gate intentionally copies its locked Fabric Master test fixture over the checkout's newer test file; the original tracked file was restored immediately afterward and independently passed 19/19 tests. No unrelated test change is part of PR #169. The previously completed 205/205 advisory suite and 5/5 signed Shopify gateway tests apply to earlier draft source; they were not rerun wholesale for this UI-only change.

Public launch is **not verified**. Physical iPhone Safari and spoken screen-reader tests remain pending because neither a physical device nor assistive technology was available to this operator. Browser emulation is not equivalent. The signed Shopify app-proxy customer journey, production authentication/privacy/retention operation, exact protected PR checks, rollback and scoped Shopify publication still need their own release evidence. Formal case-by-case scored design reviews were not supplied; the owner and Jasmine gave qualitative passes. PR #169 remains draft and publicly inactive, and PR #167 remains separate. Automatic fabric refresh remains off.
