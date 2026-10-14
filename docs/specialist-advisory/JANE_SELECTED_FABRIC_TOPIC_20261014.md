# Jane selected-fabric conversation correction

Status: draft, locally tested. This change is stacked on the signed-in return candidate in PR #191. It is not uploaded to Shopify or active for customers.

## Customer behaviour

- Opening Jane from an exact fabric detail or Browse card verifies the fabric ID through the existing customer-safe retail endpoint. The current selection is shown separately from earlier conversation. Nothing is shared until the customer checks the fabric consent box.
- **Discuss selected fabric** stores the exact verified fabric context and asks Jane about that ID in the same interaction. Earlier consultation messages stay in her history, but a visible topic marker separates the new fabric from old answers. Returning to a different fabric can start another discussion, even when an older context already mentioned it.
- If the context was saved but the reply failed, another click retries the reply without adding a duplicate context. A stable message request ID is reused after an uncertain reply failure. The server's existing idempotency, ownership, daily and per-consultation limits remain authoritative.
- An unavailable retail fabric may still be discussed as a design reference; the handoff explicitly says it is not currently available for made-to-measure curtains. No purchase availability is inferred from Jane's answer.
- The two Browse/detail **Ask Naila about this fabric** product controls are removed. The existing Naila consultation panel, intelligence and catalogue capability are not changed. Browse cards and details offer exact-ID **Ask Jane about this fabric** links when the governed Jane handoff is enabled.

## Verification and release boundary

Local synthetic tests cover Mellora-to-Saxon topic switching with the old conversation preserved, explicit consent, one context and one new message, unavailable fabric copy, a failed reply and idempotent retry, and exact-ID Jane links. The separate Jane sign-in, adviser room, fabric detail and Shopify theme tests also pass. No real OpenAI call or database write was made for this correction.

Before any MAIN upload, merge PR #191 and this stacked change through the protected release process, compare all affected theme assets with MAIN, save the live bytes, and upload only the changed files. Read them back for byte parity. On a signed test account, discuss fabric A, then enter from fabric B and verify Jane's first new answer addresses B while remembering earlier room details. Check a withdrawn/unavailable fabric and the Browse card links. Restore only the saved files if the live journey fails. The current live Jane service and automatic fabric refresh are outside this correction.
