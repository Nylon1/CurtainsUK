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
    if (resolveOwnerShippingRegion(postcode) !== "UK_MAINLAND") return null;
    return {
      grossMinor: 1295,
      vatMinor: allocateVatFromGross(
        1295,
        CURTAINSUK_RETAIL_VAT_RATE_BASIS_POINTS,
      ),
      title: "Combined order delivery",
      postcode: postcode.toUpperCase().replace(/\s/g, ""),
    };
  } catch {
    return null;
  }
}
