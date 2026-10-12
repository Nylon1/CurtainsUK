# Fabric detail to Jane: private review handoff

Status: implemented and locally tested, **not deployed, merged or publicly active**. Added to draft PR #169 on 12 October 2026. Existing population/indexing continues separately.

## Customer flow

The existing fabric detail renderer supplies the exact `fabric.id` to an optional Jane adapter. The private loopback harness loads that adapter and shows **Ask Jane about this fabric**. It opens Jane using `/?entry=fabric-detail&fabric=<exact ID>#consultation`.

Jane displays the verified fabric name, colour, exact ID, approved supplier image and product-detail link before sharing. The customer starts or resumes their consultation, reviews the fabric and explicitly consents. Only then does the existing context command save the selected ID. The selection remains visible after resume/recovery. Deleting the consultation clears it. No prices, stock quantities, supplier costs or browser-supplied product descriptions are transferred as authority.

The existing context schema is reused with `source: customer-notes`, one `fabricIds` entry and `references: [fabric-detail:v1]`. This labels the origin without changing an indexer dependency. Server-side lookup revalidates the exact ID through the existing single-fabric retail endpoint. Unknown, unpublished, commercially unavailable, mismatched and unapproved-image records fail closed with a retry/error state. No broad catalogue search or rebuild occurs.

The local API requires the existing preview owner cookie; consultation changes retain ownership, CSRF, revision, rate-limit, consent and durable-receipt checks. Repeating an uncertain context submission reuses its request ID. The reference endpoint is read-only and same-origin, uses a fixed upstream URL, bounded response size, six-second timeout and no redirects. It returns an explicit allowlist, not the upstream payload. The URL carries no contact details, session credentials or product facts.

## PR #183 coordination

PR #183 head `627a735ff3ac92f0bee05224ab28a493ae248ac8` changes only the Room Visualiser action in `assets/curtainsuk-fabric-experience.js`. This draft includes its identical one-line correction so the two actions can be reviewed together without conflicting link destinations. Its rule is preserved: only a supported URL matching `/pages/room-visualiser?fabric=<same ID>` becomes a room link. Jane uses that same exact ID. No visualiser runtime or Naila code changes.

Jane's additional hook is after detail rendering, outside PR #183's changed line. It is inert without the separately loaded adapter. No Shopify Liquid/template includes that adapter. The adapter additionally refuses non-loopback hosts and ports other than the two approved local review ports. This is deliberately a private-preview implementation, not a public activation flag. A future hosted/UI release must separately review its destination, access gate and loading configuration.

## Working review

- [Fabric detail entry](http://127.0.0.1:8794/fabric-detail?fabric=pt-3697-770)
- [Jane with selected fabric](http://127.0.0.1:8794/?entry=fabric-detail&fabric=pt-3697-770#consultation)
- [Evidence and screenshots](../../artifacts/jane-fabric-handoff-20261012/README.md)

Port 8794 runs the existing lightweight local preview with separate encrypted local storage. The earlier 8789 process is untouched. These URLs work on the owner's computer while that review server is running. The provider remains explicitly scripted; no OpenAI call or hosted customer record is created. The first scripted reply acknowledges the selected fabric; it does not assume the customer rejected patterns or visited the visualiser. The real adapter already receives the same consented context, but this change is not a fresh real-model evaluation.

## Evidence and boundaries

29 local tests passed: eight new handoff checks plus 21 existing consultation/security regressions. They cover exact read scope, response allowlisting, invalid/mismatched/ineligible fabric rejection, consent, provider context, idempotency, cross-owner refusal, recovery/deletion, room-link compatibility, live-host refusal and concise selected-fabric mock acknowledgement.

Actual Edge 155 browser verification passed with the public retail record `pt-3697-770` (SHAMBALA, LAGOON), explicit keyboard consent, exact selected-fabric rendering, one context submission, reload/resume without duplication, deletion, invalid-link rejection and upstream-failure retry. No horizontal overflow at 320/390/412/768/1440. Touch was browser-emulated. Reduced motion was enabled and its media query/zero transition were read back. No page script errors. Physical iPhone Safari and spoken screen-reader checks remain pending.

All 35 files in the active indexer's dependency manifest and its private runner file were hashed and found unchanged after implementation. Implementation SHA remains `13c498432a97f9949b3ef46304976fecc799734db0a021d608eb4721528a08b3`; runner SHA remains `9af9e2ffb08d1b236bc7bdd981a2f345bb113d7777f4558f6b8715878bd5575e`. No indexing restart, second job, changed safety limit, migration, source-data mutation, production deployment or paid AI call was performed for this handoff work. PR #167 is untouched. C: free space measured 33.03 GiB; no cleanup/install/large build. New work still needs a subsequent verified backup.

Rollback before release: revert this isolated draft commit if rejected. No hosted state or live theme has changed, so there is no production rollback to run.
