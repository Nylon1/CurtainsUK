import { customerCushionDispatch } from "./dispatch";
import "server-only";
import {
  houseCheckoutServices,
  roomsFeatureEnabled,
} from "../storefront/rooms-server";
import {
  houseCheckoutConfigFromEnvironment,
  houseSnapshotCustomerSummary,
} from "../storefront/rooms-checkout-server";
import { persistStagingCheckoutSnapshotAndHandoff } from "../storefront/review-operations-repository";
import {
  quoteOwnerApprovedCurtainShipping,
  STAGING_SHIPPING_OWNER_INPUTS,
  deliveryRequiresReview,
} from "../storefront/shipping-owner-inputs";
import { loadStagingUkShippingRules } from "../storefront/shipping-repository";
import { CURTAINSUK_RETAIL_VAT_RATE_BASIS_POINTS } from "../storefront/checkout-gates";
import {
  executeMixedCheckout,
  reviewMixedCheckout,
  type MixedInput,
  type MixedServices,
} from "./mixed-checkout";
import type { CushionCheckoutServices } from "./checkout";

export function mixedEnabled() {
  return (
    process.env.CUSHION_STUDIO_MIXED_ENABLED === "true" &&
    roomsFeatureEnabled() &&
    process.env.CUSHION_STUDIO_MIXED_SHIPPING_APPROVAL_REFERENCE !==
      undefined &&
    Boolean(
      process.env.CUSHION_STUDIO_MIXED_SHIPPING_APPROVAL_REFERENCE?.trim(),
    )
  );
}
/** No new shipping tariff is invented. Owner must explicitly approve the
 * existing one-charge policy for these mixed parcels before this gate opens. */
export function createMixedServices(cushion: CushionCheckoutServices): MixedServices {
  const house = houseCheckoutServices();
  return {
    house,
    cushion,
    stock: house.stock,
    async shipping({ house: request, requirements }) {
      if (STAGING_SHIPPING_OWNER_INPUTS.launchMode !== "SINGLE_RATE")
        throw Error("MIXED_DELIVERY_POLICY_REQUIRED");
      // The signed receipt authority resolves and validates the configurations;
      // no parcel class, drop or shipping price comes from the client.
      const { reviewHouse } = await import("../storefront/rooms-core");
      const review = await reviewHouse(request, house);
      if (!review.ready) throw Error("MIXED_CURTAIN_REVIEW_REQUIRED");
      const configurations = review.lines.map((line) => line.configuration!);
      const shipping = quoteOwnerApprovedCurtainShipping({
        selectedRegion: "UK_MAINLAND",
        postcode: request.postcode,
        fabricMetres: [...requirements.values()].reduce((a, b) => a + b, 0),
        maximumDropCm: Math.max(...configurations.map((c) => c.dropCm)),
        requiresDeliveryReview: configurations.some((c) =>
          deliveryRequiresReview(c.windowSlug, {
            coverage_width: c.widthCm,
            finished_drop: c.dropCm,
          }),
        ),
        rules: await loadStagingUkShippingRules(),
      });
      if (shipping.status !== "READY" || shipping.grossAmountMinor === null)
        throw Error("MIXED_DELIVERY_REVIEW_REQUIRED");
      return {
        grossMinor: shipping.grossAmountMinor,
        vatMinor: Math.round(
          (shipping.grossAmountMinor *
            CURTAINSUK_RETAIL_VAT_RATE_BASIS_POINTS) /
            (10000 + CURTAINSUK_RETAIL_VAT_RATE_BASIS_POINTS),
        ),
        title: "Combined curtain and cushion delivery",
      };
    },
    async persistCurtains(curtains) {
      for (const curtain of curtains) {
        const { snapshot, handoffId } = curtain.handoff;
        await persistStagingCheckoutSnapshotAndHandoff({
          snapshot,
          handoffId,
          preparedBy: "SHOPIFY_APP_PROXY_HOUSE",
          customerSummary: houseSnapshotCustomerSummary({ snapshot }),
        });
      }
    },
  };
}
export async function mixedCommand(
  operation: string,
  body: Record<string, unknown>,
  cushion: CushionCheckoutServices,
  purchaseEnabled: boolean,
) {
  if (!mixedEnabled())
    return {
      ready: false,
      purchaseEnabled: false,
      message:
        "Combined curtain and cushion checkout awaits its delivery and release approval.",
    };
  if (operation === "mixed-review") {
    const review = await reviewMixedCheckout(
      body as MixedInput,
      createMixedServices(cushion),
    );
    const dispatchEstimate = customerCushionDispatch(
      review.cushion.snapshots[0].manufacturing.dispatchEstimate,
    );
    return {
      ready: true,
      reviewId: review.reviewId,
      houseReviewToken: review.house.review.reviewToken,
      acceptedPriceChanges: review.acceptedPriceChanges,
      lines: review.house.review.lines.map((line) => ({
        configurationId: line.configuration_id,
        room: line.room_name,
        window: line.window_name,
        status: line.status,
        currentPrice: line.currentPrice,
      })),
      totalMinor: review.contract.expected.orderGrossAmountMinor,
      goodsMinor: review.contract.expected.goodsGrossAmountMinor,
      deliveryMinor: review.contract.expected.shippingGrossAmountMinor,
      vatMinor: review.contract.expected.orderVatAmountMinor,
      purchaseEnabled: purchaseEnabled && dispatchEstimate !== null,
      dispatchEstimate,
      message:
        "Current curtain and cushion prices, combined fabric stock and one delivery have been checked.",
    };
  }
  if (operation !== "mixed-checkout" || !purchaseEnabled)
    throw Error("CUSHION_PURCHASE_DISABLED");
  houseCheckoutConfigFromEnvironment(); // Native House launch authority is mandatory too.
  const result = await executeMixedCheckout(
    body as Parameters<typeof executeMixedCheckout>[0],
    createMixedServices(cushion),
  );
  return {
    checkoutUrl: result.execution.checkoutUrl,
    purchaseEnabled: result.execution.paymentEnabled,
    status: result.execution.status,
  };
}
