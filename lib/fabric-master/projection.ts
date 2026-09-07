import type { CustomerSafeFabricProjection, FabricMasterRecord } from "./types";

export function projectCustomerSafeFabric(record: FabricMasterRecord): CustomerSafeFabricProjection {
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
    priceVerificationStatus: record.price_verification_status,
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
  ];
  for (const key of forbidden) {
    if (json.includes(key)) throw new Error(`PRIVATE_FIELD_LEAK:${key}`);
  }
}
