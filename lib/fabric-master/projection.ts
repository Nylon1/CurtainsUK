import type { CustomerSafeFabricProjection, FabricMasterRecord } from "./types";

export function fabricIsConfigurationEligible(record: FabricMasterRecord) {
  return Boolean((record.staging_catalog_visible || record.storefront_selectable)
    && record.lifecycle_state !== "DISCONTINUED"
    && record.usable_width_mm && Number.isFinite(record.usable_width_mm) && record.usable_width_mm > 0
    && record.pattern_match_type !== "HALF_DROP_MATCH");
}

/** Commercial approval is independent from manufacturing/configuration eligibility. */
export function fabricIsPriceEligible(record: FabricMasterRecord) {
  return record.storefront_selectable
    && record.price_verification_status === "VERIFIED"
    && record.lifecycle_state !== "DISCONTINUED";
}

export function projectCustomerSafeFabric(record: FabricMasterRecord): CustomerSafeFabricProjection {
  const configurable = fabricIsConfigurationEligible(record);
  const configurationMessage = record.lifecycle_state === "DISCONTINUED"
    ? "No longer available"
    : configurable && fabricIsPriceEligible(record)
      ? "Ready to configure"
      : "Price and availability to be confirmed";
  return {
    id: record.fabric_id,
    supplierSku: record.supplier_sku,
    supplier: record.supplier_name,
    brand: record.brand_name,
    collection: record.collection_name,
    design: record.design_name,
    colour: record.colour_name,
    imageReferences: [...record.imagery],
    composition: record.composition.map((part) => ({ ...part })),
    fullWidthMm: record.full_width_mm,
    usableWidthMm: record.usable_width_mm,
    verticalRepeatMm: record.vertical_repeat_mm,
    horizontalRepeatMm: record.horizontal_repeat_mm,
    patternMatchType: record.pattern_match_type,
    sampleAvailable: record.sample_available,
    availability: record.lifecycle_state === "DISCONTINUED" ? "No longer available" : "Availability to be confirmed",
    configurable,
    configurationMessage,
    feedEligible: false,
  };
}

export function assertCustomerSafeProjection(value: unknown) {
  const json = JSON.stringify(value);
  const forbidden = [
    "standard_trade_price",
    "cut_trade_price",
    "costing_price",
    "aggregate_available_quantity",
    "batch_reference",
    "batch_available_quantity",
    "next_due_quantity",
    "priceVerificationStatus",
    "price_verification_status",
  ];
  for (const key of forbidden) {
    if (json.includes(key)) throw new Error(`PRIVATE_FIELD_LEAK:${key}`);
  }
}
