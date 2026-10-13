# Jane working chat evidence, 13 October 2026

Draft PR #169 source at the milestone commit records:

- `advisory-tests-serial-final.log`: **203 passed, 0 failed**. This is the authoritative full local advisory regression.
- After this log, one focused Supabase secret-header test was added; its file passed **3 / 3**, with scoped ESLint and diff check still passing.
- `advisory-tests.log`: first parallel attempt. Several simultaneous PGlite fixtures hit a Windows `initdb.wasm` file-open error. It is preserved as diagnostic evidence, not a test pass.
- `advisory-tests-serial.log`: first serial attempt. One tracked historical `ranked-read-only-diagnostic.json` fixture was omitted by sparse checkout. The tracked artifact folder was materialised without content edits; the final serial suite then passed.

Other observed checks: scoped ESLint exited 0, `git diff --check` exited 0, the existing Next app served `/jane-review` at HTTP 200, a browser accessibility-tree inspection showed labelled sign-in fields and the synthetic portrait, `/api/advisory/review-fabric?fabric=pt-3697-770` returned HTTP 200 with the same ID and SHAMBALA design, and the unconfigured protected chat endpoint returned 404. These are local checks. No signed-in hosted chat, paid OpenAI request, Shopify composer, physical iPhone or spoken screen reader was tested.

The full-index snapshot and prior profile 2.4 evaluations remain in their earlier evidence folders. This milestone did not repopulate or change the index.
