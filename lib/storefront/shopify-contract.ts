import { STOREFRONT_FABRICS } from "./fabrics";
import { STOREFRONT_WINDOW_TYPES } from "./window-catalog";

/**
 * Customer-safe payload consumed by the unpublished Dawn theme. Commercial
 * inputs deliberately never cross this boundary.
 */
export function buildShopifyCatalogPayload() {
  return {
    schemaVersion: "1.1.0",
    environment: "STAGING" as const,
    checkoutEnabled: false,
    windows: STOREFRONT_WINDOW_TYPES.map((windowType) => ({
      slug: windowType.slug,
      name: windowType.name,
      description: windowType.description,
      aliases: windowType.aliases,
      measurementGuidance: windowType.measurementGuidance,
      trackGuidance: windowType.trackGuidance,
      headings: windowType.headings,
      linings: windowType.linings,
      journey: windowType.journey,
      route: `/pages/curtains-for-${windowType.slug}`,
      faqs: windowType.faqs,
    })),
    fabrics: STOREFRONT_FABRICS.filter((fabric) => fabric.recordLifecycle === "ACTIVE").map((fabric) => ({
      id: fabric.id,
      supplier: fabric.supplier.replace(" (synthetic staging fixture)", ""),
      collection: fabric.collection,
      design: fabric.design,
      colour: fabric.colour,
      supplierReference: fabric.supplierReference,
      uniqueSku: fabric.uniqueSku,
      usableWidthMm: fabric.usableWidthMm,
      fullWidthMm: fabric.fullWidthMm,
      verticalRepeatMm: fabric.verticalRepeatMm,
      horizontalRepeatMm: fabric.horizontalRepeatMm,
      patternMatchType: fabric.patternMatchType,
      composition: fabric.composition,
      imageReferences: fabric.imageReferences,
      availability: fabric.customerAvailability,
      configurable: fabric.priceVerificationStatus === "VERIFIED",
      configurationMessage: fabric.priceVerificationStatus === "VERIFIED"
        ? "Ready to configure"
        : "Price and availability to be confirmed",
      stagingFixture: false,
      feedEligible: false,
    })),
  };
}
