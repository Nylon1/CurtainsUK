import {
  resolveOwnerShippingRegion,
  shippingPolicyBlockers,
  STAGING_SHIPPING_OWNER_INPUTS,
} from "../storefront/shipping-owner-inputs";
import { allocateVatFromGross } from "../storefront/shopify-draft-order-core";
import { CURTAINSUK_RETAIL_VAT_RATE_BASIS_POINTS } from "../storefront/checkout-gates";
/** Product presence changes the tariff, never the approved destination coverage. */
export function smartTrackDelivery(postcode: string) {
  if (shippingPolicyBlockers(STAGING_SHIPPING_OWNER_INPUTS).length) return null;
  try {
    if (postcode) resolveOwnerShippingRegion(postcode);
    const standardRate = STAGING_SHIPPING_OWNER_INPUTS.rates.find(rate => rate.region === "UK_MAINLAND" && rate.parcelClass === "STANDARD" && rate.status === "VALIDATED");
    if (!standardRate || !Number.isSafeInteger(standardRate.grossAmountMinor) || standardRate.grossAmountMinor <= 0) return null;
    return {
      grossMinor: standardRate.grossAmountMinor,
      vatMinor: allocateVatFromGross(
        standardRate.grossAmountMinor,
        CURTAINSUK_RETAIL_VAT_RATE_BASIS_POINTS,
      ),
      title: "Combined order delivery",
      postcode: postcode.toUpperCase().replace(/\s/g, ""),
    };
  } catch {
    return null;
  }
}
