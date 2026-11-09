# Checkout retry delay: 9 November 2026

Live checks after PR #364 reached Shopify checkout successfully for a curtain,
Roman blind, motorised track and a current-profile cushion. An immediate repeat
of the Roman and track checkout requests failed. Runtime logs recorded
`SHOPIFY_DRAFT_ORDER_PENDING`; Shopify's app proxy returned a 500 HTML page.
Repeating the identical track request later returned
`EXISTING_PRODUCTION_DRAFT_REUSED` with the original invoice URL. No duplicate
draft was created by that retry.

The Roman/track adapter and cushion adapter invoked the shared transport without
`existingDraftOrderId` and did not save the successful create result. The transport
first searched Shopify by tag. An empty search result during index propagation,
followed by the already-held durable creation claim, produced the pending error.
The curtain House adapter already stores the draft ID and supplies it on retry.
This adapter omission predates PR #364.

The follow-up stores only the validated draft ID and its checkout identity in a
private immutable receipt. Subsequent attempts use the existing direct-ID lookup,
which still verifies the draft's exact configuration and financial contract.
Lost or concurrent creates retain the one-shot claim; pending is returned as a
customer-safe 409 response with Retry-After, rather than an unhandled 503.

Initial API handoff times were 7.59 seconds for the curtain, 5.07 seconds for the
Roman and 2.15 seconds for the track. Review calls took 4.84, 1.62 and 0.50 seconds
respectively. These single observations are not latency percentiles. Receipt
recovery fixes repeat requests; it does not claim to eliminate first-creation
pricing, persistence and Shopify API time.

## Release order

1. Pass the required PR checks and obtain the exact-head owner approval.
2. Apply `20261109084719_checkout_draft_receipts.sql` to the existing production
   database before deploying the server. The migration is additive and private.
3. Deploy the merged protected `release/production` HEAD using the normal release
   procedure. This follow-up has no Shopify theme changes.
4. Create disposable guest checkouts for Romans, tracks and cushions, immediately
   retry identical attempts, verify the same invoice and zero additional drafts,
   then delete only those QA drafts. No payment or invoice email is required.

Rollback restores the preceding Vercel deployment. Leave the additive receipts
in place; do not reset creation claims or delete manufacturing evidence.
