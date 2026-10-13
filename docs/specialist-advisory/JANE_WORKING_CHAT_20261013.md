# Jane working chat milestone, 13 October 2026

**State: implemented in draft PR #169; locally tested; not deployed or public.** This work follows the owner's PR direction to prioritise the customer chat over another wording cycle. It does not replace the existing Meet Our Team PR #167 or the protected PR #183 fabric-to-Room-Visualiser release.

## What now works in source

- `/jane-review` is a private Vercel review page in the existing application. A tester signs in with an approved synthetic Supabase Auth account and a one-hour signed deployment grant. The browser gets only the Supabase publishable key. Password and access token stay in memory. The private preview key, OpenAI key, advisory database login and fabric read key remain on the server.
- The page obtains a CSRF token, records explicit storage consent, starts an encrypted owner-scoped consultation, shows an elapsed-time 30-second welcome or immediate entry, sends messages, renders the committed response and exact approved retail cards, preserves an unedited draft and request ID for safe retry, resumes on the same browser, creates a one-time recovery code, summarises, and deletes the session. Ten minutes is guidance, not a cutoff.
- `?fabric=<exact-id>` verifies the selected identity through the governed public fabric-detail endpoint before showing a card. Sharing the ID with Jane requires a separate checkbox and writes a customer-authorised context event. Same-ID Room Visualiser links appear only when the governed retail response confirms support. The fabric reference is not itself a price or availability promise.
- The existing advisory HTTP route now has a second, signed **synthetic-openai-only** mode. It composes the server-side Responses adapter, bounded ranked search of the existing advisory index, bounded exact-ID Fabric Master rehydration, governed live retail checks, encrypted cloud storage, owner verification, distributed rate limits and the existing durable US$5 run/US$1 session database caps. The model cannot send SQL or choose an arbitrary product lookup. A paid-testing approval reference and durable evaluation-run ID are required in the signed grant. A missing key, grant, account, protected deployment or read credential fails closed.
- The original **synthetic-mock-only** hosted mode remains available. Production still returns 404 from the advisory route. A later draft addition adds a **default-off** Shopify Jane composer and protected signed proxy; the live Meet Our Team composer remains disabled. [Later Shopify gate report](JANE_SHOPIFY_CHAT_GATE_20261013.md). No live theme file was changed. Public storefront integration remains a separate release gate.

## Verification performed

| Check | Result |
| --- | --- |
| Local PGlite model-path integration | Send/reply committed; ciphertext contained no customer text; another verified owner received 404; durable run charged 5,000 microdollars; deletion removed the row. The model was a deterministic fake. |
| Hosted-search SQL contract | Validated five fields; fixed ranked query against only `advisory.knowledge_search`; maximum six exact IDs. No model-supplied SQL. |
| Advisory regression | 50 focused tests passed. After materialising tracked sparse-checkout evidence, the complete serial suite passed **203 / 203**. One final Supabase secret-header test was added after that run; its three-test file passed **3 / 3**. Scoped ESLint and diff check passed. [Logs](../../artifacts/jane-working-chat-20261013/README.md). |
| Existing Next app local render | `/jane-review` returned HTTP 200. Browser accessibility tree showed the synthetic portrait, labelled test-account fields, sign-in action and tool links. This is a render/structure check, not a signed-in conversation or screen-reader pass. |
| Fabric detail in local app | `pt-3697-770` returned HTTP 200 with the same exact ID and SHAMBALA design from the governed public detail route. No product write. |
| Unconfigured review API | Returned 404 in local development without a preview key/grant. No model or database call. |
| Real hosted OpenAI conversation through this UI | **Not performed.** No new paid call or hosted deployment was made. |

The local development render initially failed because this task's sparse checkout omitted tracked `components` and `lib/supplier-intelligence` files imported by the existing global layout and proxy. Those tracked paths were materialised without source edits, then the page returned 200. This is a checkout setup issue, not a Jane application failure. The development server generated untracked `AGENTS.md` and `CLAUDE.md`; they are not part of the PR.

## Required protected test configuration

The existing Vercel project needs a separately reviewed **preview** deployment with deployment protection verified, then a short-lived signed grant bound to its exact deployment ID and source SHA. The grant must name synthetic allowlisted owner UUIDs, `synthetic-openai-only`, the already-applied migration checksum, an approved durable evaluation-run UUID, and a fresh paid-testing approval reference. It is entered into the private review UI, never committed or embedded in Shopify. The existing Supabase project needs a time-limited advisory login with only `SET ROLE advisory_runtime`, and the existing advisory tables and index must be read back before testing. The preview environment needs the existing-project Supabase publishable key, server-only OpenAI key, encrypted data keys, CSRF key, advisory DB login, and a dedicated server-side `sb_secret_` key for the bounded canonical read projection. Supabase secret keys bypass RLS, so this key is **protected-trial-only**; a lower-privilege production catalogue path is still a launch review item. The application does not silently reuse general production service credentials.

The signed grant and database run together enforce a maximum of US$5 total and US$1 per session. The previous approved profile 2.4 evaluation used a separate local run; its remaining balance is **not** authorisation for this new hosted chat trial. No test account or key is configured in this checkout's process. Actual hosted calls and exact deployment verification remain pending.

## Release boundaries and next working-path checks

1. Rehearse the protected deployment with synthetic users on the existing Supabase project. Verify actual login, consent, send, bounded search, retail cards, same-ID Room Visualiser link, summary, cross-device recovery, second-owner denial, delete, spend cap, two-instance concurrency, retries and model/knowledge failure recovery. Check the private canonical PostgREST projection with the configured secret key before enabling a model call.
2. Complete the named interior-design reviews on the accepted 2.4 transcript and the working chat. The owner's earlier qualitative case comments are preserved but do not replace the two named scorecards. Test physical iPhone Safari, spoken screen reader, keyboard and reduced motion on the protected chat.
3. Connect the customer-facing Shopify entry and composer through a reviewed first-party authentication/proxy contract. The private `/jane-review` page is a development UI, not a second public storefront. Keep the live Shopify composer disabled until that contract, privacy notice, retention purge, abuse protection, kill switch and rollback are verified.
4. Run the protected production checks on the exact PR commit and complete a private deployment readback. Only then consider an authorised, scoped Shopify publication. Automatic fabric refresh remains off; the separate changed-only monthly/urgent procedure is unchanged.

No production migration, indexing, Supabase source update, Vercel deployment, Shopify publication, PR merge or paid OpenAI call occurred in this milestone. Naila, Fabric Intelligence decision logic, Room Visualiser, pricing, stock, checkout and PR #167 were not changed.
