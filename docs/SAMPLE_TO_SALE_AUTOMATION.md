# CurtainsUK sample-to-sale pilot

Status, 7 November 2026: deployed in the protected runtime at `dba75cb1580abc90e18ac9454f051d174ff00f0d` on READY deployment `dpl_Dd2ZD4SRUFTc2yyfmKW4nvgYjWpa`, but gated off. `CURTAINSUK_SAMPLE_TO_SALE_ENABLED=false`; no customer code or marketing email has been issued. The active Shopify app version is `sample-to-sale-04b4a8df`, and `currentAppInstallation.accessScopes` confirms the installed `read_customers` grant. The private offer ledger has zero rows. An internal mixed-cart invoice test, combined sample-credit redemption and margin review are still required before code issue.

## What the pilot now does

The staff page at `/admin/sample-to-sale` reads recent Shopify orders, finds the fabric sample variant and its fabric ID, checks carrier delivery events, checks the customer's current email marketing state and searches their accessible order history for a prior eligible product purchase. It shows four fabric-specific message previews. At the offer stage, staff can generate one personal code after a fresh eligibility check. The page does not send email.

The page uses the existing staff role check and private no-store response headers. The runtime Shopify app needs `read_customers` for current consent and order history. The scope is in the active app configuration and the actual installation now grants it. Offer issue remains gated pending the internal invoice and margin checks above.

The planner withholds a customer if any required order history is incomplete. It also withholds test, unpaid or cancelled sample orders; orders without carrier-confirmed delivery; customers without a current `SUBSCRIBED` email state; customers tagged `do-not-action`; and customers with an existing CurtainsUK product order. A fulfilled order alone is not treated as delivered. A subsequent product order ends the promotional journey. A newly added `do-not-action` tag also blocks redemption of an issued code before checkout.

## Pilot timing

| Stage | Earliest time after confirmed delivery | Purpose |
| --- | --- | --- |
| Check in | 1 day | Ask how the sample looks and offer help |
| Inspiration | 4 days | Show the chosen fabric and link to the Room Visualiser |
| Offer review | 8 days | Prepare the 10% offer only if still eligible |
| Reminder review | 15 days | Remind the customer while the offer is valid |
| End | 22 days | Stop the sequence |

These are review windows, not scheduled sends. The eventual sender must retain a per-customer delivery and message ledger, check consent and purchase again immediately before each send, include an unsubscribe mechanism, and use an idempotency key for each step. It should count quote requests separately from paid curtain orders.

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
- The code issuer is off unless `CURTAINSUK_SAMPLE_TO_SALE_ENABLED=true`, a separate 32-character-plus secret is configured, and the private ledger migration is applied. Do not issue customer codes until the resulting order margin and live discount total are reviewed. The current pricing target is 35% gross margin before this promotion.

## Activation route

1. Review the offer contract and run an internal end-to-end checkout with a mixed product order, sample credit, expiry and double redemption. The local unit and private-ledger tests are not a substitute for a real Shopify invoice test.
2. `read_customers` is granted on the actual `curtains-uk-mtm` app installation. Review the sample checkout's consent capture and any claimed soft opt-in evidence. The initial pilot uses only Shopify `SUBSCRIBED` customers.
3. Build an inactive custom Shopify Flow workflow from a confirmed delivery trigger. Use Shopify Messaging for customer email, not Flow's internal staff email action. Recheck consent and order state after every wait. Include unsubscribe and suppression in the sender. The staff code issue action does not send email.
4. Dry-run the first three eligible customers in the staff view, test the complete journey with internal test recipients, and review actual message rendering and destination links. Record sent, clicked, quote requested, purchased and unsubscribed states.
5. Activate only after the owner reviews the exact copy, pricing treatment and recipient list. Keep the first cohort small, and stop immediately on an order, opt-out, complaint or bounce.

## References

- [Shopify Messaging automations](https://help.shopify.com/en/manual/promoting-marketing/create-marketing/shopify-messaging/marketing-automations)
- [Shopify Flow fulfillment event trigger](https://help.shopify.com/en/manual/shopify-flow/reference/triggers/fulfillment-event-created)
- [ICO electronic mail marketing guidance](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/electronic-and-telephone-marketing/electronic-mail-marketing/)
- [Shopify Draft Order discounts](https://shopify.dev/docs/api/admin-graphql/latest/mutations/draftOrderCreate)
