# CurtainsUK Phase 5E owner inputs

Shipping remains **OWNER DECISION REQUIRED**. Malware scanning and private file storage are not launch requirements. No amounts or supplier stock observations have been invented.

## Shipping

Edit `config/curtainsuk-shipping-owner-inputs.json`. It contains exactly nine Standard/Large/Oversize region cells, all with null amounts and `AWAITING_OWNER_CONFIRMATION`. The private `/admin/shipping-rates` page appends effective, audited rate versions; it requires supplier administration permission, which the staging reviewer does not have. The JSON is an owner handoff worksheet and versioned operating policy; copying a rate into it alone does not activate a database rate.

Supply:

- Each VAT-inclusive GBP amount in integer pence, carrier/service and effective date. Leave unsupported cells blocked.
- Explicit outward postcode mappings, e.g. a rule has `outwardCode` and `region`; provide the complete approved service coverage. No implicit mainland fallback exists. Duplicate matches and missing codes block checkout.
- Standard/Large/Oversize maximum packed length, width, height in millimetres and weight in grams. Dimensions must be longest side first. Supply the overall maximum parcel limits as well.
- Owner-verified packing rules: `minFabricMetresExclusive`, `maxFabricMetres`, `maxFinishedDropCm`, and `parcel` containing `lengthMm`, `widthMm`, `heightMm`, `weightGrams`. These must conservatively cover the packed curtain/lining combination; leave ambiguous or unverified combinations blocked. The server matches these against calculated fabric metres and maximum finished drop, not the browser parcel-class hint.
- Approval actor, timestamp and a new policy version. Set operating-policy statuses to `VALIDATED` only after confirmation. Append confirmed rates through the private rate API/page with an actor, reason and expected predecessor version. Review and commit the policy before deploying it to Preview.

Specialist/manual delivery is separate from the nine cells. Legacy Specialist rate history is retained but cannot generate automatic checkout. A manual service requires its exact gross quote, staff approval and configuration/revision reference. Activation of a manual-delivery quote remains blocked until the carrier policy and quote mechanism are approved and rehearsed. Above-limit parcels never silently become oversize standard delivery.

The customer postcode is collected and a successful mapped postcode/policy version is retained in the immutable shipping snapshot. Postcode/region mismatches, absent packing rules and unconfirmed operating policy all fail closed. Full Shopify address-change behaviour still requires the blocked remote checkout rehearsal.

## Evidence by email — owner decision applied

Customer uploads are removed from launch. Submit measurements and contact details first; the receipt displays a full unique `CUK-<request UUID>` reference and an email link to the Shopify store contact address (currently `enquiries@drapesey.com`), with that reference in the subject. No message is sent automatically.

Staff record `EVIDENCE_NOT_RECEIVED`, then `EVIDENCE_RECEIVED`, then `EVIDENCE_REVIEWED` in the private review dashboard. This status is independent of the technical review state. The system stores only status, reason, revision, staff actor and timestamp. Files, mailbox contents and attachments remain outside CurtainsUK.

Apex, triangular, Gable, awkward, dormer, curved/bow and corner requests require evidence reviewed against the current revision before approval. Bay/manual requests can also be gated when staff request evidence. After a new revision, prior reviewed evidence becomes received until staff review it again. Reopen an approved request before changing evidence status.

No scanner provider, staging scanner credentials, private bucket, retention job or paid subscription is needed to operate this launch workflow. Legacy file endpoints return 410, the upload RPC rejects calls, and the launch submission/review/checkout code does not access storage or scanning services. Existing historical test objects are retained outside the launch workflow; they are neither served nor treated as proof of emailed evidence.

## Supplier pilot verification worksheet

| Supplier / fabric | SKU (internal) | Test metres | Current gate |
| --- | --- | ---: | --- |
| Prestigious Escher Mocha | 4269/147 | 10.2 | Stored stock expired; no batch records |
| Prestigious Dali Mocha | 4270/147 | 12.6 | Stored stock expired; no batch records |
| Sanderson Painters Garden Violet/Crimson | DAPGPA203 | 10.6 | No batch records; single-batch adequacy unproven |

For each, capture a fresh authorised cut price, batch/dye-lot identifier and available metres, lifecycle and supplier-check timestamp. Persist through the existing append-only supplier import/approval process. Promote only observations that cover the exact configuration in one batch. No pilot was promoted in Phase 5E. Larger reviewed configurations require their own metre adequacy checks.

Prestigious official Webtex remains the cut-price/stock source, with official imagery already mapped. Sanderson trade price lists/technical information is the identified commercial source; a fresh authorised current export and lifecycle/availability source are still required. The existing February workbook is suitable for catalogue identity/specification preparation only. Authorised bulk Sanderson imagery is still missing; a third-party retailer image is not treated as permission. Browser access to the existing authenticated supplier tabs timed out, so no new portal verification is claimed.
