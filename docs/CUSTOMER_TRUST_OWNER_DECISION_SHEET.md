# Customer Trust V1 — Owner Decisions Complete

**Review only — do not publish.** Prepared 21 September 2026 for `carpetup.myshopify.com` / `www.curtainsuk.com`.

The ordinary business-policy decisions are settled. The remaining release hold is technical verification and Shopify-admin cleanup; no further owner policy questions are required at this stage.

## Settled decisions

- Apex Curtains Ltd trading as Curtains UK; company number **15652466**.
- Customer correspondence and authorised returns address: **36–44 Bolton Road, Blackburn, BB2 3FA**.
- VAT registration number stays off the public site, footer and policies; prices may continue to show VAT where relevant.
- Support: `support@curtainsuk.com`; complaints: `complaints@curtainsuk.com`; media: `media@curtainsuk.com`; MTM change requests: `enquiries@curtainsuk.com` within 2 hours, reviewed rather than guaranteed.
- MTM goods and samples have no voluntary change-of-mind return/refund offer; statutory rights for faulty, damaged, incorrect or materially misdescribed goods remain unaffected.
- Damaged/faulty/incorrect goods should be reported to Support as soon as reasonably possible with order details and useful photographs where appropriate; no invented deadline or SLA.
- Delivery is UK Mainland. MTM lead time is normally approximately 3–4 weeks as an estimate. Curtain delivery uses the existing checkout rule; samples are delivered free. No hard-coded delivery price is published.
- Room images are optional and used only for the requested Fabric Intelligence service. No model training, general AI training, product/model improvement, unrelated evaluation/research, marketing or reusable image-dataset use. Any wider future use requires a separately approved opt-in.
- Intentional integrations: Facebook & Instagram, Google & YouTube, Pinterest and TikTok, subject to verified consent behaviour.
- Suitable fabric offcuts/surplus may be reused (including for samples), donated or recycled; cardboard and plastic packaging are recycled. Wording remains qualified by suitability.
- CurtainsUK works with established UK suppliers and expects fair treatment and respect; no formal audit/certification claim is made.
- CurtainsUK strives for high workmanship standards and will work with customers to resolve genuine workmanship/manufacturing defects; no fixed-duration warranty is promised.
- Preserve all MTM pricing, stock, payment, Fabric Master, PAID → REVIEW, workroom-release and cart-immutability logic.

## Remaining technical release checks

| Area | Current verified fact | Required before publication |
|---|---|---|
| Room-image infrastructure | Supabase project `hqysjumypgeapgmqkcrx` is healthy in `eu-central-1`; current application persistence rejects raw image data and stores derived state. | Verify upstream image processor, temporary handling, storage, logs/backups, deletion/retention, subprocessors, countries and transfer safeguards. Do not publish more precise claims until evidenced. |
| Privacy notice | The draft now states the owner-approved no-training/no-reuse restriction and keeps operational details qualified. | Complete provider/retention/legal-basis evidence review. |
| Cookies/consent | Shopify Admin currently reports the banner not visible in any region and checkout display unchecked; four intended integrations are listed. | Configure the canonical CurtainsUK privacy destination and consent controls, then runtime-test Accept, Reject, Preferences, withdrawal and non-essential pixel blocking. |
| Legacy customer surfaces | Read-only audit found 41 Shopify pages containing legacy references, plus legacy cookie destination and notification sender settings. | Replace/retire those Admin surfaces in a separately approved Shopify write step; do not delete blindly. |
| Checkout policies | Native Shopify policy bodies remain generic/legacy in places. | Replace them with the approved canonical drafts only after final review; keep MTM commerce logic unchanged. |

## Hold

No Shopify publication, policy write, cookie-setting change, notification change or deletion has been performed by this review build. The candidate source, generated pages, route audit and technical evidence are ready for final owner review.
