# Paid sample credit: review candidate

Status: unpublished. Based on protected `release/production` at `5db7af1f31c5869c44ba6dc3911a1c3f83b687fd`. No production settings, deployments, Shopify products or database records were changed while preparing this candidate. `PRODUCTION_SURFACES.md` continues to describe the deployed source of truth.

## Customer policy

Keep the paid sample product and its existing price, availability and Merchant Center structured data. Credit the actual amount paid for up to 10 sample products against made-to-measure curtains in Design My Home. All sample fabrics count, even if the customer chooses another fabric. Delivery is excluded. Credit never discounts cushions or motorised tracks.

Each paid sample order receives one private, single-use code. A webhook or email retry produces the same code. Multiple codes can be entered together, with a combined maximum of 10 samples per curtain order. The implementation selects the highest-value 10 eligible units. Each contributing code is consumed in full when the curtain order is paid; there is no residual balance on a used code. A code contributing no units is rejected rather than consumed. These combination and single-use details are included in the email and storefront terms for owner review.

This is a deduction shown before payment, not a later cash refund. No code is placed in URLs, analytics, public Shopify properties or browser persistence. Public reviews expose only the saving and sample count. This is a Design My Home credit code, not a reusable public Shopify promotional code.

## Implementation and safeguards

- Existing HMAC-verified orders/paid receiver checks real Shopify paid sample lines and their signed identities. No credit for free, test, cancelled or unpaid orders. Credit comes from actual product payment after allocated discounts, never a fixed hardcoded £25 voucher.
- The private ledger has one grant per source order and stores a code hash. Codes are 128-bit HMAC values derived from a dedicated stable key, independent of the Shopify webhook credential. Revalidated grant lines retain their previously proven identity when the webhook signing key rotates.
- Current Shopify source payment is rechecked at quotation, immediately before reserving an invoice, and before releasing a paid credited order. Partially refunded orders require staff review because remaining quantity alone does not prove the amount still paid. Full/partial refunds and cancellations cannot silently continue through the automatic credit route.
- Reservation locks prevent concurrent checkouts spending the same credit. Changed cart/review input cannot reuse its reservation. The same reviewed credit checkout has a stable attempt identity, so retries recover the existing invoice. An ordinary checkout cannot reuse the credit attempt by removing its code.
- A reservation is NOT released by a timer. Its existing Shopify invoice might still be payable. Staff must cancel and verify cancellation of that draft before any manual ledger recovery. Do not automatically reset an unresolved reservation after a failed network request.
- Shopify line discount, gross total, VAT, delivery, exact product properties and completed-draft linkage are checked before recording redemption. Credit is consumed only for the verified paid order; duplicate paid webhooks are idempotent. A source refund after invoice creation holds fulfilment for review and records an operational error. A refund after already-settled redemption needs normal staff accounting review; it does not automatically recreate credit.
- Existing Resend sender/credentials deliver a separate transactional sample-credit email, not a change to Shopify's built-in confirmation template. A durable outbox and Resend idempotency key prevent routine duplicates. Retry uses the existing scheduled route without changing the hourly dashboard email. Uncertain sends older than 23 hours move to REVIEW for receipt inspection instead of risking a second send beyond the provider's idempotency window.
- Supplier administrators can open `/admin/sample-credit`, review the latest issued credits/email status and retrieve a printable packing insert by Shopify order ID. No public lookup by email or order number is available. No-email orders have NO_EMAIL status. Customer-facing copy directs those customers to contact the shop with their order reference.
- Existing paid sample orders are not bulk-emailed or backfilled by this release. A historical claim requires a staff verification/controlled issue operation. Newly received duplicate paid webhooks reuse the same grant.

## Customer-facing surfaces

Small expandable offer on Browse Fabrics, fabric detail, saved samples and carts containing a sample. Design My Home has an expandable code-entry field and a separate sample-credit deduction. Codes are rechecked with every review and checkout; stale replies cannot replace a changed input. No new global feature flag or dependency download is used on these pages.

## Required release checks

1. Obtain the required exact-head owner approval and both protected checks. Publish as a coordinated API/database/theme release, not a theme-only promise.
2. Apply `20261028200448_sample_credit.sql` to the existing CurtainsUK Supabase project, verify private grants/RLS and run the Supabase advisors. Never apply it to Apex.
3. Add one permanent server secret, `CURTAINSUK_SAMPLE_CREDIT_SECRET` (at least 32 cryptographically random characters). Keep it backed up; changing it would invalidate printable/email regeneration. Do not place it in theme settings or a `NEXT_PUBLIC_` variable. Existing email sender is reused; `CURTAINSUK_SAMPLE_CREDIT_FROM` is an optional override only.
4. Verify the existing checkout app can read paid orders and sample variants. `read_orders` / `read_products` are needed; access to orders older than 60 days requires Shopify's `read_all_orders` approval. There is no customer credit expiry in this policy, so that older-order access must work before publication. Do not substitute connector app scopes for the actual runtime app's permissions.
5. Verify orders/paid registration points at the existing production receiver and the existing scheduler still runs. Test a controlled paid sample purchase, email receipt, code entry, combined order and completed payment through Shopify. Do not charge a real customer or send live test emails without a specified controlled recipient/order. This live-provider rehearsal is not claimed as completed by local tests.
6. Confirm the ordinary paid-sample, curtain-only, cushion-only, track-only and mixed routes still work. Check Fiona, Jane, Fabric Intelligence, room visualiser and stock. Preserve every existing feature setting. Read back live theme assets/settings and deployment commit, then update `PRODUCTION_SURFACES.md` with verified evidence.

## Operational recovery

- FAILED/PENDING: automatic retries use the original email idempotency key.
- REVIEW: inspect the provider receipt first. If sent, repair the ledger receipt. If not provably sent or failed, investigate before sending again. Never mint a replacement generic code.
- NO_EMAIL: staff can print the packing insert; the customer can redeem without creating an account.
- RESERVED: inspect the recorded draft and original purchase. Recover the same checkout where possible. Any cancellation/release is a staff-controlled operation, not an automatic expiry.
- Partially refunded source purchases, historical unsigned samples, missing order access or invalid paid totals: hold for staff review. Do not bypass amount or identity validation to make a code apply.

## Verification performed locally

- 58 focused tests pass: actual SQL ledger reservation/redemption/email claims; code identity, refund exclusions, real paid amounts, penny allocation, combined ten-sample cap, VAT/delivery treatment; My Home mixed checkout and retry; existing curtain/cushion/track financial contracts and guest checkout.
- TypeScript passes. Changed runtime TypeScript passes ESLint. Shopify 2026-07 validates the order query; all eight changed theme files pass Shopify theme validation. JavaScript syntax checked.
- The production build passes with synthetic public Supabase build variables (no production credentials or connections). The first attempt correctly failed because this isolated worktree has no public Supabase configuration. Existing room-visualiser filesystem-tracing warnings remain. The existing My Home test file has three pre-existing no-explicit-any lint errors; the added test and changed runtime files introduce none. Local checks are not evidence of a completed live payment, email delivery or production sync.
