# Jane production source of truth

**Readback:** 14 October 2026, 06:09 UTC. This is a dated operational snapshot. The [platform master record](../CURTAINSUK_SPECIALIST_AI_ADVISORY_PLATFORM.md) remains the programme source of truth; this page identifies the current Git, hosted database, API and Shopify publication states without treating their commits as interchangeable.

## Release identity

| Surface | Verified state | Authority and limit |
| --- | --- | --- |
| Protected Git | `release/production` at `9cc3b5f8221b7897a333ebd15fa72538c433eca5` | PRs #169, #189, #190 and #191 are merged. #189 changed documentation only. |
| Vercel API | Existing project `prj_vl2GLLlSf0AJAKqjs1Nk26ipKHBA`; `curtainsuk-production-api.vercel.app` resolves to READY deployment `dpl_GraVU6meKp9gtFmSv14gSmzGGxMG` | The local PR #190 release record identifies protected source `09847a808b77ebd6c69340e712d4bb571df54dd9`. The later protected commits change Shopify files and documentation, so the API deployment is not expected to have Git's latest SHA. |
| Supabase | Existing project `hqysjumypgeapgmqkcrx` reports `ACTIVE_HEALTHY` | Hosted migration history includes `20261014005755_jane_continuous_daily_budget`. No new database write was made for this readback. |
| Shopify | Existing MAIN theme `CurtainsUK - Curtain Style V1 review`, ID `182339731835` on `carpetup.myshopify.com` | The exact PR #190 eight-file and PR #191 seven-file releases used scoped uploads. No duplicate theme was published. |

These surfaces are **aligned for the released Jane journey**, but do not share one deployment SHA. The 14 October fresh pull compared the 12 distinct Jane and fabric-entry theme files from those releases with current protected source. Two were byte-identical; ten were text-identical after CRLF/LF normalization. There was no content drift in this 12-file scope. The full Shopify theme was not compared with Git in this audit.

## Customer behaviour and data

- Jane is available on the live [Meet Our Team page](https://www.curtainsuk.com/pages/meet-our-team). Anne, Noah, James, Ben and Natalie remain labelled Coming Soon. Jane requires a signed Shopify customer and explicit consent before the selected fabric and messages are shared with her.
- Live Browse and fabric-detail entries open Jane with an exact Fabric Master ID. In the signed synthetic PR #191 test, a prior Mellora Blush exchange stayed in the transcript, then **Discuss selected fabric** created a new Saxon Oak (`pt-7141-127`) turn. Jane's new real reply discussed Saxon Oak in the remembered room. Reload restored the earlier history and the current Saxon focus. Product-level **Ask Naila about this fabric** links were replaced by **Ask Jane**. Naila's independent consultation engine was not changed.
- The tested unavailable Abeja Blush detail leaves **Make curtains** unavailable and explains that made-to-measure is not currently available. Jane can discuss such a fabric as a design reference; purchase readiness still comes from the live governed retail check, not from the advisory index or model text.
- The completed fixed eligible-index job `ac425f78-f6ec-4623-97bb-df8763d79d5a` reports **11,517 processed, 11,517 indexed, 11,517 unrolled-back receipts and 1,920 batches**. `advisory.knowledge_search` contains **11,518** rows, including one historical trial identity. This does not mean all Fabric Master identities are purchasable or that source changes after the snapshot have been refreshed. Automatic fabric refresh remains OFF.
- The continuous public budget migration creates a UTC-day ledger on the first paid reply of a day. The hosted 14 October row is enabled with a US$5 limit and US$0.050613 used at this readback. The separate US$1 lifetime-per-consultation limit remains. Future days are governed by the same installed function; they are not represented as pre-spent or pre-created.
- The scheduled bounded Jane retention job `curtainsuk_jane_retention_v1` had a successful run at 03:20 UTC on 14 October. Saved consultations use the approved encrypted, consented, up-to-90-day retention and deletion design. A newer disposable Saxon synthetic consultation was left saved for review; earlier disposal tests do not establish its deletion.

## Verification and limits

The live Meet Our Team page, Browse Fabrics, Room Visualiser and privacy policy returned HTTP 200 in this readback. The owner reported physical iPhone Safari chat controls and layout passing in the release review. Spoken VoiceOver and a direct hosted cross-owner API-denial attempt were **not performed** and are not marked as passed. The previous two-customer browser isolation and signed consultation deletion checks remain historical evidence. This readback did not repeat a paid model reply, a physical-device test, a full-theme audit or a database restore. Current recoverable-backup status was not reverified here; this document does not approve a future migration.

## Evidence and recovery

- [Protected Jane implementation](https://github.com/Nylon1/CurtainsUK/pull/169), [live launch record](https://github.com/Nylon1/CurtainsUK/pull/189), [daily budget and retail release](https://github.com/Nylon1/CurtainsUK/pull/190), and [selected-fabric correction](https://github.com/Nylon1/CurtainsUK/pull/191).
- Local exact-file theme backups and readbacks: `C:\Users\hamza\.curtainsuk-jane-private-preview\theme-backups\2026-10-14-pr190`, `C:\Users\hamza\.curtainsuk-jane-private-preview\theme-backups\2026-10-14-pr191`, and the new read-only 12-file pull at `C:\Users\hamza\.curtainsuk-jane-private-preview\theme-backups\2026-10-14-source-truth-readback`.
- To stop paid public replies, disable the existing Jane public/chat switches on the existing Vercel project through its reviewed release procedure. To revert a theme regression, restore only the affected file from its pre-upload backup, then read it back. Do not publish a different theme or restore the whole theme over newer work. Preserve consultation records for authorised recovery and deletion.

This record changes no storefront, model, database, index, campaign, Naila component or production setting.
