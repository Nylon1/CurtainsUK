# Jane owner case review, 13 October 2026

Review source: [20 saved profile 2.3 conversations](JANE_PHONE_REVIEW_PROFILE_2_3_20261013.md), from the synthetic real-model run. This records the owner's case-by-case qualitative verdict, not invented numerical rubric scores or a second independent interior-design review.

| Owner verdict | Cases | Follow-up |
| --- | --- | --- |
| Works well | 01, 02, 04, 07–12, 14, 15, 17–20 | Retain as positive reference examples. |
| Needs conversation change | 03, 05, 13 | Correct guidance and rerun these conversations with the revised profile. |
| Needs full-index and live-retail retest | 06, 16 | The 36-identity fixture and empty retail fixture cannot establish final model behaviour. |

The owner also asked Jane to remember the full conversation, avoid repeating known or unanswered questions, keep ordinary replies short, check whether a suggestion helped, and continue solving the problem. Version `2.4.0-preview.2` carries these instructions. For Case 03 it now explicitly sends heading questions from Room Visualiser to the separate [Curtain Style comparison](https://www.curtainsuk.com/pages/fabric-library?view=curtain-style), with a verified guide link. For Case 05 it forbids treating an unstated wall colour as known. For Case 13 it tells Jane to use the customer's new preference instead of repeating an earlier unanswered question. The next evaluation suite is `jane-foundations-v4`, with those checks stated in its review criteria. These are implementation changes, not proof that the revised model will comply.

## Read-only retrieval diagnostics for Cases 06 and 16

On 13 October, bounded calls to the **existing** `advisory.search_knowledge` function on project `hqysjumypgeapgmqkcrx` returned at most six IDs per query. Case 06's strict olive/botanical/matte/cotton query returned six IDs, as did a relaxed olive query. A separate Shambala query returned `pt-3697-502`, `pt-3697-569` and `pt-3697-770`. The governed live retail catalogue returned those same three exact Shambala IDs with approved product cards and matching Room Visualiser destinations. This shows that the earlier empty Shambala answer was a fixture limitation, not proof of retail unavailability.

Case 16's conjunctive `warm neutral texture` and `quiet` query returned zero IDs. Broader alternatives `warm OR neutral`, `ivory OR cream`, and `linen OR weave` each returned six IDs. The governed retail query for `Ivory` returned four exact IDs, all present in the advisory index. The empty conjunctive result must not be described as no suitable fabrics. Neither broad matches nor retail eligibility establish that a particular fabric is right for the customer's room. Jane still needs to reason over verified attributes, distinguish unknown tone or texture, and check a candidate's live retail status before offering it for purchase.

These were independent read-only index and retail probes. They made no model calls, no index writes, no migration and no live theme change. **Cases 06 and 16 remain pending as end-to-end, real-model, full-index and retail-connected conversations.** A fresh paid-test budget is required for that new profile/suite; the earlier US$5 approval has been used. Formal human design-quality scores, physical-device/accessibility and hosted launch gates remain pending. Jane stays private and PR #169 stays draft.
