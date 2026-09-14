# Controlled production sample purchase — 14 September 2026

Owner authorized one genuine sample up to £25 including delivery/VAT, using the existing generic Shopify sample product and exact Sadira identity. No product, variant, price or payment-provider setting was changed.

## Implementation and release

Code: `58267b7196dc111412b6cdd148c5799d0d52e654` on `feature/curtainsuk-phase-5a-prelaunch`.
Gateway: `https://curtainsuk-staging-ieu2l6ay0-hamzas-projects-4ef62f35.vercel.app`, assigned to the existing gateway alias. Server approval is true and production Draft Order mode enabled after the purchase-disabled sample check passed. Dawn purchase controls are true; only that existing setting was changed. Minimal remains the rollback theme. Merchant Center and supplier ordering were untouched.

`/pages/samples` was an existing hidden page using the default template. Page `693621424507` is now visible with the `samples` template and returns 200. The existing sample product/variant is used; canonical identity is resolved server-side, signed, displayed in cart/checkout, and stored as Shopify line properties. Optional HCI context is verified using the existing signed commerce contract. Current daily stock and real Shopify sample price are checked before adding and again before the normal cart checkout button. Neither sample preparation endpoint creates a Draft Order or sends a supplier order. Unknown/failed/stale stock fails closed in these customer actions. Shopify native checkout and payment remain Shopify's responsibility; this is not a new Shopify checkout-validation Function or an automated supplier integration.

## Actual purchase

Order **#1034**, `gid://shopify/Order/13393454039419`, created **20:36 BST** from Online Store.

- One existing generic Fabric Sample, variant `56120226873723`, quantity **1**.
- Sadira — Lagoon, Prestigious Textiles, Fabric Master `pt-4262-770`, SKU `4262/770`.
- Existing sample price **£1.00**; native sample shipping **Standard FREE**; total **£1.00 GBP including £0.17 GB VAT at 20%**. This is the existing sample shipping result, not a change to the £12.95/£19.95 curtain delivery rules.
- Owner-provided recipient, address and receipt email retained at checkout. Personal details/payment credentials are deliberately excluded from this report.
- Shopify customer confirmation **5QQFDZE0T**; admin order status **Paid £1.00**, one timeline payment transaction, type **Sale**, status **Success**, via Shop Pay.
- Order remains **Unfulfilled**, at the merchant's manual fulfilment location. No supplier ordering/fulfilment action was invoked.
- Exact identity, consultation, strategy, policy and recommendation version are retained in Shopify order line properties. Original signed identity was not changed.
- One verified `SAMPLE_ORDERED` event appended using existing `hci_staging_commit`; latest consultation revision 46 contains exactly one event for this order. This was a manual, owner-authorized post-payment verification, not a new automated paid-order webhook and not a browser-reported purchase claim. No ranking changes or curtain-stock deductions were made for the sample.

## Verification

Full npm tests, TypeScript, changed-file lint and hosted builds passed. Tests cover exact identity, deterministic signature, reordered properties, tampering, discontinued/ineligible samples and mismatched HCI context. The ordinary curtain/specialist checkout tests remain intact.

Public browser: Samples 200 → signed Sadira/£1/current-stock check with controls OFF → enable controls → one cart item with complete metadata → guarded checkout → exact owner address → FREE delivery / £0.17 included VAT → one Pay submission → confirmed order → Shopify admin successful sale.

Post-activation HCI initialization 200, cross-session adoption 409, foreign-origin rejection 403, forged-cookie rejection 401 and anonymous staff access 401. Supabase reads and outcome append succeeded. Gateway 5xx log query from 19:33 UTC through transaction verification returned no matching errors. These are transaction-window observations, not a guarantee of provider uptime.

Purchase controls remain LIVE after the successful controlled transaction. Morning source refresh remains the CurtainsUK owner/admin's required daily operation. Unattended supplier refresh and automated sample outcome capture remain separate operational work, not falsely claimed as completed by this test.
