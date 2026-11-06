# CurtainsUK sample-to-sale pilot

Status: private review build on `feat/sample-to-sale-pilot`. It is not deployed or sending email.

## What the pilot now does

The staff page at `/admin/sample-to-sale` reads recent Shopify orders, finds the fabric sample variant and its fabric ID, checks carrier delivery events, checks the customer's current email marketing state and searches their accessible order history for a paid curtain purchase. It shows four fabric-specific message previews. It never sends email or creates a discount.

The page uses the existing staff role check and private no-store response headers. The runtime Shopify app needs `read_customers` for current consent and order history, so that scope has been added to the app configuration for review. Until the actual app installation receives that scope, the page must not be treated as operational.

The planner withholds a customer if any required order history is incomplete. It also withholds test, unpaid or cancelled sample orders; orders without carrier-confirmed delivery; customers without a current `SUBSCRIBED` email state; and customers with a paid curtain order. A fulfilled order alone is not treated as delivered. A customer's subsequent curtain order always ends the promotional journey.

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

Six paid sample orders appear in the current Shopify order view across five customer records. The three latest have `DELIVERED` carrier events and are currently `NOT_SUBSCRIBED`. One older sample customer is `SUBSCRIBED`, but their order has no delivery event. Another sample customer has already bought made-to-measure curtains. These observations make the automated send count **zero** under the strict pilot gate. Customer names and email addresses are intentionally absent from this record.

The existing sample-credit email is transactional and already sent through the paid-order webhook. It must not be reused as marketing permission. The sample credit is a promised customer benefit and is applied as a line discount in the custom Draft Order checkout. That checkout sets `allowDiscountCodesInCheckout: false`. A Shopify code created in Admin would not currently redeem through Design My Home. The public sale is already included in displayed prices, according to the owner-approved homepage release record. A further 10% needs a real price and margin check.

## Offer contract to finish before enabling promotion

- 10% on eligible made-to-measure curtain goods with a £150 qualifying curtain subtotal. Exclude samples, delivery, Roman blinds, cushions and other parts unless separately approved.
- First curtain order only, one redemption per customer, 14 days from issue. Determine expiry in the store's Europe/London time zone and show an exact date to the customer.
- The owner confirmed that 10% and the already-promised sample credit can be used together. Calculate 10% on qualifying curtain goods first, then apply sample credit to the remaining curtain goods. Do not combine with other promotional offers. The pure calculation model and tests are in `lib/storefront/sample-to-sale-offer.ts`; checkout integration is still required.
- The chosen benefit must appear in Design My Home, the quote, the Draft Order invoice and the verified paid-order record. Creating a Shopify code alone does not complete this path.
- Add a margin floor or equivalent commercial approval before generating or sending codes. The current production pricing rules target 35% gross margin before an extra promotion; 10% off the selling price lowers that margin.

## Activation route

1. Review the offer contract and update the checkout to calculate, display, reserve and redeem the approved benefit. Test a mixed curtain, cushion and Roman order, plus a sample-only order, a refunded sample, expiry and double redemption.
2. Grant and verify `read_customers` on the actual `curtains-uk-mtm` app installation. Review the sample checkout's consent capture and any claimed soft opt-in evidence. The initial pilot uses only Shopify `SUBSCRIBED` customers.
3. Build an inactive custom Shopify Flow workflow from a confirmed delivery trigger. Use Shopify Messaging for customer email, not Flow's internal staff email action. Recheck consent and order state after every wait. Include unsubscribe and suppression in the sender. Keep the offer step disabled until the checkout contract is live.
4. Dry-run the first three eligible customers in the staff view, test the complete journey with internal test recipients, and review actual message rendering and destination links. Record sent, clicked, quote requested, purchased and unsubscribed states.
5. Activate only after the owner reviews the exact copy, pricing treatment and recipient list. Keep the first cohort small, and stop immediately on an order, opt-out, complaint or bounce.

## References

- [Shopify Messaging automations](https://help.shopify.com/en/manual/promoting-marketing/create-marketing/shopify-messaging/marketing-automations)
- [Shopify Flow fulfillment event trigger](https://help.shopify.com/en/manual/shopify-flow/reference/triggers/fulfillment-event-created)
- [ICO electronic mail marketing guidance](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/electronic-and-telephone-marketing/electronic-mail-marketing/)
- [Shopify Draft Order discounts](https://shopify.dev/docs/api/admin-graphql/latest/mutations/draftOrderCreate)
