# CurtainsUK Phase 5E owner inputs

Shipping and malware scanning remain **OWNER DECISION REQUIRED**. No amounts or supplier stock observations have been invented.

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

## Malware-scanning decision

Checked 7 September 2026. Monthly prices below are published USD prices, before any applicable taxes; they are not commitments or subscriptions.

| Candidate | Cost and UK/EU processing | API / PDF and images | Published file limit | Processing / DPA position |
| --- | --- | --- | --- | --- |
| Cloudmersive Advanced, Business | $49.99/month, 25,000 calls; Germany available | Existing adapter; one multipart API request; file scanning includes PDF/images | Plan maximum 1 GB; individual API limits also apply | Published DPA and subprocessors; owner must approve DPA and explicitly choose regional endpoint |
| Cloudmersive Advanced, Business Advantage | $199.99/month, 100,000 calls; UK and EU available | Same existing adapter and file types | Plan maximum 2 GB; individual API limits also apply | Same DPA review; UK processing must be selected explicitly |
| OPSWAT MetaDefender Cloud private processing | Commercial quote required for the appropriate private service; confirm EU region and contractual residency, no verified UK-specific option | Upload file, then retrieve report/poll; PDF and images supported | Licensing table lists 140 MB, 256 MB and 1 GB+ tiers; confirm contracted private tier | Select both private scanning and private processing; private scan removes the file after analysis but retains metadata/results. Request the applicable DPA, retention and region terms before using customer evidence |

Sources: [Cloudmersive pricing](https://cloudmersive.com/pricing-small-business), [scan API](https://api.cloudmersive.com/docs/virus.asp), [regional/security controls](https://www.cloudmersive.com/security), [DPA](https://www.cloudmersive.com/data-processing-dpa); [OPSWAT product, formats and limits](https://www.opswat.com/products/metadefender/cloud), [API](https://www.opswat.com/docs/mdcloud/metadefender-cloud-api-v4), [private scanning/processing](https://www.opswat.com/docs/mdcloud/operation/private-scanning-with-metadefender-cloud-apis), [privacy policy](https://www.opswat.com/legal/privacy-policy), [regional service status](https://trust.opswat.com/).

My implementation recommendation is Cloudmersive Business in Germany if EU processing is acceptable; Business Advantage if UK processing is required. This is an inference from the published options and the existing adapter. The current application cap remains 3 MiB per evidence file regardless of provider plan. No provider is activated and no paid service was purchased.

After selection, provision the staging key and explicit regional endpoint in sensitive Preview variables. Rehearse a valid clean PDF/image, an approved harmless antivirus test fixture, and provider unavailability through the actual upload/quarantine path. Do not interpret mocked scanner tests as provider certification. The current real staging test proves unavailability keeps a safe synthetic PNG quarantined and blocks approval; clean acceptance and infected-test detection remain blocked.

## Supplier pilot verification worksheet

| Supplier / fabric | SKU (internal) | Test metres | Current gate |
| --- | --- | ---: | --- |
| Prestigious Escher Mocha | 4269/147 | 10.2 | Stored stock expired; no batch records |
| Prestigious Dali Mocha | 4270/147 | 12.6 | Stored stock expired; no batch records |
| Sanderson Painters Garden Violet/Crimson | DAPGPA203 | 10.6 | No batch records; single-batch adequacy unproven |

For each, capture a fresh authorised cut price, batch/dye-lot identifier and available metres, lifecycle and supplier-check timestamp. Persist through the existing append-only supplier import/approval process. Promote only observations that cover the exact configuration in one batch. No pilot was promoted in Phase 5E. Larger reviewed configurations require their own metre adequacy checks.

Prestigious official Webtex remains the cut-price/stock source, with official imagery already mapped. Sanderson trade price lists/technical information is the identified commercial source; a fresh authorised current export and lifecycle/availability source are still required. The existing February workbook is suitable for catalogue identity/specification preparation only. Authorised bulk Sanderson imagery is still missing; a third-party retailer image is not treated as permission. Browser access to the existing authenticated supplier tabs timed out, so no new portal verification is claimed.
