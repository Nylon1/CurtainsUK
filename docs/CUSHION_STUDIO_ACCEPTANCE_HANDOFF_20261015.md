# Cushion Studio — acceptance handoff, 15 October 2026

Status: verified local candidate for draft PR review; not a production release. Approved round assets are frozen at `5a1e82cdff52ee5ef4e567381704cdcb623b9df7`; owner acceptance was recorded at `f65e1935`. The accepted fuller 50 cm square remains unchanged.

## Current evidence

- Full `npm test`: **645/645 passed**, including **110 cushion tests** and existing curtain/storefront, supplier, fabric and theme suites. Raw output: [final regression](../artifacts/cushion-acceptance-20261015/final-regression.txt).
- Production-style webpack build passed on the current runtime in the [round soft-cover review](CUSHION_STUDIO_ROUND_SOFT_COVER_REVIEW_20261015.md). Changes since that build are approval/handoff documentation and evidence only.
- Chrome loopback customer replay: fresh square design; 50 cm selection; back/side inspection; handoff into sofa layout; duplicate and convert the second piece to an approved 50 cm round; retain comparison; rename using keyboard input; save and reopen from the saved-design list. Both pieces retain Sabu Stripe, unpiped filled construction and their distinct placement coordinates.
- Restored set review shows exact square/round specifications, £4.95 VAT-inclusive cushion-only delivery once per order, no binding goods price, missing dispatch warning and no enabled checkout. This is a local preview using public fabric evidence, not a live supplier quote or Shopify payment.
- Mobile-width Chrome (390 × 844): review dialog fits at approximately 338 px; document width 375 px. Keyboard activation closes review and inspects the round back. No physical iPhone or spoken VoiceOver test is claimed.
- Console sweep: no captured warning/error entries. Two desktop actions initially exceeded the browser-control response deadline but visibly completed; state was inspected before continuing. Synthetic field fill did not commit a change event; native keyboard typing, leaving the field, save and recovery passed. These tool observations are not classified as proven customer defects.
- One named acceptance design is retained in the local preview store only. No hosted customer record, Draft Order, payment, paid AI or enquiry was created.

Evidence: [desktop review](../artifacts/cushion-acceptance-20261015/desktop-review.png), [mobile review](../artifacts/cushion-acceptance-20261015/mobile-review.png), [review text](../artifacts/cushion-acceptance-20261015/desktop-review.txt). Earlier range captures cover all twelve sizes and all three fabric controls; see [range review](CUSHION_STUDIO_SHAPE_RANGE_REVIEW_20261015.md). Current round visuals supersede that gallery's older round images.

## Outstanding release inputs

The [range workroom brief](CUSHION_STUDIO_RANGE_WORKROOM_HANDOFF_20261015.md) is ready for the owner to forward. Remaining decisions are per-size construction/seams, physically matching cuts, proposed extra making/piping rates and construction, nonstandard inserts, supplier increments/carriage, confirmed dispatch and mixed-delivery applicability. Established owner costs and visual approvals stay settled.

Hosted schema/RLS application and validation, authorised account save/recovery, real commerce reconciliation, physical-device checks and any paid rehearsal still require their existing release workflow. Offline tests do not establish these live outcomes. Public discovery and purchases remain off.

## Draft PR and release boundary

PR #201 targets protected `release/production`. At the start of this handoff it was open/draft at `2d459787251032ce36f6b5ffeb8c350bfbf50dd6`, with both required checks successful for that older head. Those checks and its exact-head owner approval do not approve subsequent commits. The draft is being updated with this reviewed candidate; required checks must rerun for its new head. The agent must not post an owner approval.

Keep the PR draft and do not merge/deploy or activate purchase flags. Future release must use the exact approved protected HEAD under [release policy](../release/README.md). Follow the [implementation rollback instructions](CUSHION_STUDIO_IMPLEMENTATION.md), preserving immutable order evidence and paid-event handling. No Shopify/Vercel deployment or production change is part of this handoff.
