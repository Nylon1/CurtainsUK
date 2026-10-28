# Sample credit in checkout item details

Published from protected source `914b219563df26fc83293d7b2a3ac868bc10fff7` after [PR #307](https://github.com/Nylon1/CurtainsUK/pull/307) passed both required checks. The owner requested and selected a note inside each sample's expandable order details. The [production record](PRODUCTION_SURFACES.md#sample-credit-note-in-checkout-28-october-2026) records deployment, complete theme synchronization and live checkout verification.

New sample lines carry this public, signed property:

**Sample credit:** We credit the amount paid for up to 10 samples towards your later made-to-measure curtain order. Use your emailed code in Design My Home.

It travels with the existing fabric identity into Shopify's order summary. Mobile customers may need to expand their summary to see item properties. It is not a banner beside Pay now. The verified store plan is Basic; [Shopify restricts information/shipping/payment UI extensions to Plus](https://help.shopify.com/en/manual/checkout-settings/checkout-customization). Public line-item properties use Shopify's [existing cart properties support](https://shopify.dev/docs/api/ajax/reference/cart#add-line-item-properties).

The note is signed together with the existing sample properties. The signature algorithm, payment amount, product/variant, Merchant Center data, credit limit, code issuing and fulfilment rules do not change. Existing baskets and already-open checkouts keep their original properties. No existing basket is automatically rewritten. New additions show the note; existing paid orders remain valid for credit.

Adding the display property changes the generated signature. When a customer tries to add an identical older sample already in their basket, the frontend now recognizes only the exact legacy shape without the note, then asks the existing server endpoint to verify its original signature and current purchase availability. It redirects to the existing basket without duplicating or editing the line. Different quantities, provenance, fabric details, extra properties or an invalid signature still fail. The normal unchanged-signature path makes no additional request.

Verification: the nine existing sample-order/sample-credit tests pass, including the real SQL ledger concurrency/idempotency checks. An isolated manual browser-handler harness exercised new lines, current duplicates, legacy duplicates, invalid signatures, changed fabric/quantity/extra properties and disabled purchases. It confirmed new notes are signed, older properties are not rewritten, and invalid baskets do not navigate to checkout. JavaScript syntax, TypeScript and changed TypeScript lint passed. Live Chrome verified the note in Shopify and Shop Pay order details, including a narrow mobile viewport; the isolated test cart was cleared afterwards. No customer information, real payment, transactional email or code redemption was entered or performed.

The release used the exact protected production source for the API deployment and the one changed theme asset. A complete readback matched all 598 theme files and confirmed unchanged stored settings. The current sample-credit secret, private ledger, existing app permissions and all other feature settings were preserved.
