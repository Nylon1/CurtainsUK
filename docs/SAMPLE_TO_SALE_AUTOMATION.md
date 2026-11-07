# CurtainsUK sample-to-sale pilot

Status, 7 November 2026: protected runtime `869dcf77c0df384a9897006477865dad1160e5a3` on READY deployment `dpl_AvSvVbnAfqtAsUnEcd69QbuFfQxB` serves all three API aliases. `CURTAINSUK_SAMPLE_TO_SALE_ENABLED=true`. The signed-in staff page issued one personal code for sample order #1037. The private ledger showed that code as available until 21 November 2026 at 10:25 GMT. The Shopify app installation grants `read_customers`. A paid mixed-cart invoice and margin outcome have not yet been replayed.

The day 3, 5, 7 and 14 email journey is deployed. The sending domain, private migration, sender address, internal delivery and unsubscribe tests are complete. `CURTAINSUK_SAMPLE_TO_SALE_EMAIL_ENABLED=true`, with `CURTAINSUK_SAMPLE_TO_SALE_EMAIL_CANARY_CUSTOMERS` restricted to one internal synthetic customer with zero orders. The sender checks the comma-separated Shopify customer GID allowlist; an empty list sends nothing. No customer marketing email has been sent. The existing code-issue switch is separate.

## What the pilot now does

The staff page at `/admin/sample-to-sale` reads recent Shopify orders, finds the fabric sample variant and its fabric ID, checks carrier delivery events, checks the customer's current email marketing state and searches their accessible order history for a prior eligible product purchase. It shows four fabric-specific message previews. At the offer stage, staff can generate one personal code after a fresh eligibility check. The page does not send email.

The page uses the existing staff role check and private no-store response headers. The runtime Shopify app needs `read_customers` for current consent and order history. The scope is in the active app configuration and the actual installation now grants it. Offer issue remains gated pending the internal invoice and margin checks above.

The planner withholds a customer if any required order history is incomplete. It also withholds test, unpaid or cancelled sample orders; orders without carrier-confirmed delivery; customers without a current `SUBSCRIBED` email state; customers tagged `do-not-action`; and customers with an existing CurtainsUK product order. A fulfilled order alone is not treated as delivered. A subsequent product order ends the promotional journey. A newly added `do-not-action` tag also blocks redemption of an issued code before checkout.

## Pilot timing

| Stage | Earliest time after confirmed delivery | Purpose |
| --- | --- | --- |
| Check in | 3 days | Ask how the sample looks and offer help |
| Inspiration | 5 days | Show the chosen fabric and link to the Room Visualiser |
| Offer review | 7 days | Prepare the 10% offer only if still eligible |
| Reminder review | 14 days | Remind the customer while the offer is valid |
| End | 21 days | Stop the sequence |

The live release still uses review windows. The proposed sender checks the current Shopify subscription and complete purchase history immediately before each send. It stores one outbox row per customer and stage, uses a stable Resend idempotency key, and stops on an order or an unsubscribe. The unsubscribe link requires confirmation for a browser visit and accepts one-click email-client POST requests. It stops this sample follow-up journey; Shopify's wider marketing status remains a separate source of truth. Resend automatically suppresses hard bounces and complaints. The designed emails BCC `hm4335575@gmail.com`, include a call button for 0800 772 0367 and show Mon to Fri, 9am to 5pm hours. Open and click tracking are off on the new sending domain.

The Resend sending domain `curtainsuk.com` is verified. The internal sender and designed follow-up tests were delivered, including BCC. A signed unsubscribe link saved a synthetic suppression row; an invalid link returned 400. The staff page has styled previews; no preview sends email. The offer code remains valid for 14 days from issue. The automatic sender is on for the internal-only canary, with no eligible internal sample order and no customer marketing send at this checkpoint.

## Live evidence on 6 November 2026

Six paid sample orders appear in the current Shopify order view across five customer records. The three latest have `DELIVERED` carrier events and are currently `NOT_SUBSCRIBED`. Their `marketingUpdatedAt` is null, so Shopify has no recorded marketing opt-in update for those addresses. `SINGLE_OPT_IN` is the configured opt-in level, not a subscribed state. One older sample customer is `SUBSCRIBED`, but their order has no delivery event. Another sample customer has already bought made-to-measure curtains. These observations make the automated send count **zero** under the strict pilot gate. Customer names and email addresses are intentionally absent from this record.

The existing sample-credit email is transactional and already sent through the paid-order webhook. It must not be reused as marketing permission. The sample credit is a promised customer benefit and is applied as a line discount in the custom Draft Order checkout. That checkout sets `allowDiscountCodesInCheckout: false`. The new personal offer is a CurtainsUK code applied in Shopping Cart before the Draft Order is made; a Shopify Admin discount code will not redeem there. The public sale is already included in displayed prices, according to the owner-approved homepage release record. The extra 10% reduces margin on every eligible product.

Providing an email address for an order is not, by itself, a marketing subscription. For a UK existing-customer soft opt-in, retain evidence that a clear opt-out was offered when the address was collected, use the address only for similar CurtainsUK products, and give an opt-out in each message. Until that evidence is verified, the strict `SUBSCRIBED` gate remains in force. A current `UNSUBSCRIBED` state must always suppress marketing.

The private pilot provides an **Add a verified email** entry to Shopify Customers. Staff can review the customer's consent evidence, record when and where it was given and the wording used, check later opt-outs, then update the customer's marketing settings in Shopify. Newly verified addresses can be added as Shopify customers there. Shopify remains the subscription source of truth; the pilot reads its current status after refresh. A staff-entered email alone does not enter the automation.

## Offer contract

- 10% on the product subtotal in the custom Shopping Cart, with a £150 minimum before discounts. Curtains, Roman blinds, cushions and motorised curtain tracks qualify. Delivery is excluded. Fabric samples currently use a separate Shopify checkout and are not redeemable with this custom-cart code.
- First qualifying product order only, one redemption per customer, 14 days from issue. The staff page displays an exact expiry in Europe/London time.
- The 10% and already-promised sample credit can be used together. Apply 10% to all product lines first, then sample credit to the remaining curtain lines. Do not combine with other promotional offers.
- The code is bound to the original Shopify customer account. The customer signs in, enters both codes in Shopping Cart, sees each saving in the review, and receives the exact combined line discount in the Draft Order. The paid-order webhook verifies the invoice and consumes both ledgers.
- The code issuer requires `CURTAINSUK_SAMPLE_TO_SALE_ENABLED=true`, a separate 32-character-plus secret, and the private ledger migration. The owner directed a limited first pilot before a paid mixed-cart replay. Review the first resulting invoice, margin and live discount total before wider issue. The current pricing target is 35% gross margin before this promotion.

## Operational follow-up

1. Complete an internal end-to-end checkout with a mixed product order, sample credit, expiry and double redemption before expanding beyond the owner-directed first pilot. The local unit and private-ledger tests are not a substitute for a real Shopify invoice test.
2. `read_customers` is granted on the actual `curtains-uk-mtm` app installation. Review the sample checkout's consent capture and any claimed soft opt-in evidence. The initial pilot uses only Shopify `SUBSCRIBED` customers.
3. Publish the Resend DNS records for `curtainsuk.com` and verify the domain. Set `CURTAINSUK_SAMPLE_TO_SALE_FROM` to a CurtainsUK address on that verified domain. Apply the private outbox migration before enabling `CURTAINSUK_SAMPLE_TO_SALE_EMAIL_ENABLED`.
4. Dry-run an internal test recipient through the sequence and unsubscribe route. Review the BCC copy, rendering, links, inbox placement and one-click opt-out. Check Shopify access to customer email addresses and the complete order history. The sender fails closed if the latest 50-order scan is partial.
5. Activate only after the owner reviews the exact copy, pricing treatment and recipient list. Keep the first cohort small, review the first paid mixed-cart invoice, and stop immediately on an order, opt-out, complaint or bounce. Count quote requests separately from paid orders.

## References

- [Shopify Messaging automations](https://help.shopify.com/en/manual/promoting-marketing/create-marketing/shopify-messaging/marketing-automations)
- [Shopify Flow fulfillment event trigger](https://help.shopify.com/en/manual/shopify-flow/reference/triggers/fulfillment-event-created)
- [ICO electronic mail marketing guidance](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/electronic-and-telephone-marketing/electronic-mail-marketing/)
- [Shopify Draft Order discounts](https://shopify.dev/docs/api/admin-graphql/latest/mutations/draftOrderCreate)
