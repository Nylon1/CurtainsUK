import type { FabricMasterRecord } from "./types";

type CatalogueRecord = Omit<FabricMasterRecord, "supplier_name"> & {
  supplier_name?: string;
};

export interface CatalogueCompletionCounts {
  brands: number;
  collections: number;
  designs: number;
  colourways: number;
  duplicate_supplier_skus: number;
  image_references_present: number;
  usable_width_known: number;
  repeats_known: number;
  composition_known: number;
  prices_verified: number;
  prices_awaiting_verification: number;
  lifecycle_current: number;
  lifecycle_discontinued: number;
  lifecycle_unknown: number;
  catalogue_qa_visible: number;
  pricing_eligible: number;
  customer_launch_eligible: number;
  unsafe_public_candidates: number;
}

export interface CatalogueCompletionReport {
  supplier_id: string;
  counts: CatalogueCompletionCounts;
  by_brand: Record<string, {
    colourways: number;
    prices_verified: number;
    image_references_present: number;
    lifecycle_current: number;
    lifecycle_discontinued: number;
    lifecycle_unknown: number;
    customer_launch_eligible: number;
  }>;
  qa_import: {
    eligible: boolean;
    blockers: string[];
  };
  customer_launch: {
    eligible: boolean;
    blockers: string[];
  };
}

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function hasIdentity(record: CatalogueRecord) {
  return hasText(record.supplier_id)
    && hasText(record.supplier_sku)
    && hasText(record.brand_id)
    && hasText(record.collection_id)
    && hasText(record.design_id)
    && hasText(record.design_name)
    && hasText(record.colour_name);
}

/**
 * A catalogue row may be retained for private QA without being priceable or
 * customer-visible. This is intentionally weaker than the launch gate.
 */
export function fabricIsCatalogueQaEligible(record: CatalogueRecord) {
  return hasIdentity(record);
}

/** Canonical Shopify imagery is written only after approved exact-identity mapping. */
export function fabricIsCustomerLaunchEligible(record: CatalogueRecord) {
  return hasIdentity(record)
    && record.lifecycle_state !== "DISCONTINUED"
    && record.imagery.some(url => /^https:\/\/cdn\.shopify\.com\/[^?#]+$/.test(url));
}

export function summarizeCatalogueCompletion(
  supplierId: string,
  records: CatalogueRecord[],
): CatalogueCompletionReport {
  if (!supplierId.trim()) throw new Error("CATALOGUE_COMPLETION_SUPPLIER_REQUIRED");
  if (records.some((record) => record.supplier_id !== supplierId)) {
    throw new Error("CATALOGUE_COMPLETION_MIXED_SUPPLIERS");
  }

  const skuCounts = new Map<string, number>();
  for (const record of records) {
    const key = record.supplier_sku.trim().toUpperCase();
    skuCounts.set(key, (skuCounts.get(key) ?? 0) + 1);
  }
  const duplicateSupplierSkus = [...skuCounts.values()].reduce((sum, count) => sum + Math.max(0, count - 1), 0);
  const launchEligible = records.filter(fabricIsCustomerLaunchEligible);
  const browseCandidates = records.filter((record) => record.lifecycle_state !== "DISCONTINUED");
  const pricingEligible = records.filter((record) => record.storefront_selectable
    && record.price_verification_status === "VERIFIED"
    && record.lifecycle_state !== "DISCONTINUED");
  const unsafePublicCandidates = records.filter((record) => record.storefront_selectable
    && !fabricIsCustomerLaunchEligible(record));
  const byBrand = Object.fromEntries([...new Set(records.map((record) => record.brand_name?.trim() || record.brand_id))]
    .sort((a, b) => a.localeCompare(b))
    .map((brand) => {
      const brandRecords = records.filter((record) => (record.brand_name?.trim() || record.brand_id) === brand);
      return [brand, {
        colourways: brandRecords.length,
        prices_verified: brandRecords.filter((record) => record.price_verification_status === "VERIFIED").length,
        image_references_present: brandRecords.filter((record) => record.imagery.length > 0).length,
        lifecycle_current: brandRecords.filter((record) => record.lifecycle_state === "CURRENT").length,
        lifecycle_discontinued: brandRecords.filter((record) => record.lifecycle_state === "DISCONTINUED").length,
        lifecycle_unknown: brandRecords.filter((record) => record.lifecycle_state === "UNKNOWN").length,
        customer_launch_eligible: brandRecords.filter(fabricIsCustomerLaunchEligible).length,
      }];
    }));

  const counts: CatalogueCompletionCounts = {
    brands: new Set(records.map((record) => record.brand_id)).size,
    collections: new Set(records.map((record) => record.collection_id)).size,
    designs: new Set(records.map((record) => record.design_id)).size,
    colourways: records.length,
    duplicate_supplier_skus: duplicateSupplierSkus,
    image_references_present: records.filter((record) => record.imagery.length > 0).length,
    usable_width_known: records.filter((record) => record.usable_width_mm !== null).length,
    repeats_known: records.filter((record) => record.pattern_match_type === "RANDOM_MATCH"
      || (record.pattern_match_type !== null && record.vertical_repeat_mm !== null)).length,
    composition_known: records.filter((record) => record.composition.length > 0).length,
    prices_verified: records.filter((record) => record.price_verification_status === "VERIFIED").length,
    prices_awaiting_verification: records.filter((record) => record.price_verification_status === "PRICE_REQUIRES_VERIFICATION").length,
    lifecycle_current: records.filter((record) => record.lifecycle_state === "CURRENT").length,
    lifecycle_discontinued: records.filter((record) => record.lifecycle_state === "DISCONTINUED").length,
    lifecycle_unknown: records.filter((record) => record.lifecycle_state === "UNKNOWN").length,
    catalogue_qa_visible: records.filter((record) => record.staging_catalog_visible === true).length,
    pricing_eligible: pricingEligible.length,
    customer_launch_eligible: launchEligible.length,
    unsafe_public_candidates: unsafePublicCandidates.length,
  };

  const qaBlockers: string[] = [];
  if (records.length === 0) qaBlockers.push("NO_CATALOGUE_RECORDS");
  if (duplicateSupplierSkus > 0) qaBlockers.push("DUPLICATE_SUPPLIER_SKUS");
  if (records.some((record) => !fabricIsCatalogueQaEligible(record))) qaBlockers.push("INCOMPLETE_STABLE_IDENTITY");

  const launchBlockers: string[] = [];
  if (records.length === 0) launchBlockers.push("NO_CATALOGUE_RECORDS");
  if (browseCandidates.length === 0) launchBlockers.push("NO_BROWSABLE_COLOURWAYS");
  if (browseCandidates.some((record) => record.imagery.length === 0)) launchBlockers.push("AUTHORISED_IMAGERY_INCOMPLETE");
  if (unsafePublicCandidates.length > 0) launchBlockers.push("UNSAFE_PUBLIC_CANDIDATES");
  if (launchEligible.length !== browseCandidates.length) {
    launchBlockers.push("CUSTOMER_LAUNCH_COVERAGE_INCOMPLETE");
  }

  return {
    supplier_id: supplierId,
    counts,
    by_brand: byBrand,
    qa_import: { eligible: qaBlockers.length === 0, blockers: qaBlockers },
    customer_launch: { eligible: launchBlockers.length === 0, blockers: [...new Set(launchBlockers)] },
  };
}
