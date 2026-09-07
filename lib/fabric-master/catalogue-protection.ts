import type { FabricMasterRecord } from "./types";

export type NormalizedCatalogueRecord = Omit<FabricMasterRecord, "supplier_name"> & {
  brand_name: string;
  source_row_number: number;
};

export interface ExistingCatalogueRecord {
  record: FabricMasterRecord;
  /** Exact observation time when available; source_effective_date is the fallback. */
  observed_at?: string | null;
}

export type CatalogueProtectionAction = "INSERT" | "UPDATE" | "UNCHANGED" | "PRESERVE_NEWER_EXISTING";

export interface CatalogueProtectionResult {
  action: CatalogueProtectionAction;
  record: NormalizedCatalogueRecord;
  protected_fields: string[];
  apply: boolean;
}

const SOURCE_FIELDS = new Set([
  "source_type",
  "source_name",
  "source_reference",
  "source_effective_date",
  "source_row_number",
]);

function coreExisting(existing: FabricMasterRecord, sourceRowNumber: number): NormalizedCatalogueRecord {
  const { supplier_name: supplierName, ...record } = existing;
  void supplierName;
  return { ...record, brand_name: existing.brand_name, source_row_number: sourceRowNumber };
}

function time(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.getTime() : null;
}

function preserveIfMissing<T>(incoming: T | null, existing: T | null, field: string, protectedFields: string[]) {
  if (incoming === null && existing !== null) {
    protectedFields.push(field);
    return existing;
  }
  return incoming;
}

function preserveArrayIfEmpty<T>(incoming: T[], existing: T[], field: string, protectedFields: string[]) {
  if (incoming.length === 0 && existing.length > 0) {
    protectedFields.push(field);
    return existing;
  }
  return incoming;
}

/**
 * Catalogue imports may enrich identity/specification fields but cannot demote an
 * independently approved fabric or erase known data with an empty source cell.
 * This rule is supplier-neutral and is applied before the existing Fabric Master
 * batch contract is constructed.
 */
export function protectCatalogueCandidate(input: {
  incoming: NormalizedCatalogueRecord;
  incoming_observed_at: string;
  existing?: ExistingCatalogueRecord | null;
}): CatalogueProtectionResult {
  if (!input.existing) {
    return { action: "INSERT", record: input.incoming, protected_fields: [], apply: true };
  }

  const existing = coreExisting(input.existing.record, input.incoming.source_row_number);
  const incomingObserved = time(input.incoming_observed_at);
  const existingObserved = time(input.existing.observed_at ?? input.existing.record.source_effective_date);
  if (incomingObserved === null) throw new Error("CATALOGUE_SOURCE_OBSERVED_AT_REQUIRED");

  if (existingObserved !== null && incomingObserved < existingObserved) {
    return {
      action: "PRESERVE_NEWER_EXISTING",
      record: existing,
      protected_fields: ["*"],
      apply: false,
    };
  }

  const protectedFields: string[] = [];
  let lifecycleState = input.incoming.lifecycle_state;
  if (lifecycleState === "UNKNOWN" && existing.lifecycle_state !== "UNKNOWN") {
    protectedFields.push("lifecycle_state");
    lifecycleState = existing.lifecycle_state;
  }
  let priceVerificationStatus = input.incoming.price_verification_status;
  if (existing.price_verification_status === "VERIFIED" && priceVerificationStatus !== "VERIFIED") {
    protectedFields.push("price_verification_status");
    priceVerificationStatus = "VERIFIED";
  }
  let storefrontSelectable = input.incoming.storefront_selectable;
  if (existing.storefront_selectable && !storefrontSelectable) {
    protectedFields.push("storefront_selectable");
    storefrontSelectable = true;
  }
  let stagingCatalogVisible = input.incoming.staging_catalog_visible ?? false;
  if (existing.staging_catalog_visible && !stagingCatalogVisible) {
    protectedFields.push("staging_catalog_visible");
    stagingCatalogVisible = true;
  }
  const merged: NormalizedCatalogueRecord = {
    ...input.incoming,
    supplier_collection_code: preserveIfMissing(
      input.incoming.supplier_collection_code,
      existing.supplier_collection_code,
      "supplier_collection_code",
      protectedFields,
    ),
    colourway_code: preserveIfMissing(input.incoming.colourway_code, existing.colourway_code, "colourway_code", protectedFields),
    full_width_mm: preserveIfMissing(input.incoming.full_width_mm, existing.full_width_mm, "full_width_mm", protectedFields),
    usable_width_mm: preserveIfMissing(input.incoming.usable_width_mm, existing.usable_width_mm, "usable_width_mm", protectedFields),
    vertical_repeat_mm: preserveIfMissing(input.incoming.vertical_repeat_mm, existing.vertical_repeat_mm, "vertical_repeat_mm", protectedFields),
    horizontal_repeat_mm: preserveIfMissing(input.incoming.horizontal_repeat_mm, existing.horizontal_repeat_mm, "horizontal_repeat_mm", protectedFields),
    pattern_match_type: preserveIfMissing(input.incoming.pattern_match_type, existing.pattern_match_type, "pattern_match_type", protectedFields),
    weight_gsm: preserveIfMissing(input.incoming.weight_gsm, existing.weight_gsm, "weight_gsm", protectedFields),
    composition: preserveArrayIfEmpty(input.incoming.composition, existing.composition, "composition", protectedFields),
    care_instructions: preserveArrayIfEmpty(input.incoming.care_instructions, existing.care_instructions, "care_instructions", protectedFields),
    usage_suitability: preserveArrayIfEmpty(input.incoming.usage_suitability, existing.usage_suitability, "usage_suitability", protectedFields),
    imagery: preserveArrayIfEmpty(input.incoming.imagery, existing.imagery, "imagery", protectedFields),
    sample_available: preserveIfMissing(input.incoming.sample_available, existing.sample_available, "sample_available", protectedFields),
    lifecycle_state: lifecycleState,
    price_verification_status: priceVerificationStatus,
    storefront_selectable: storefrontSelectable,
    staging_catalog_visible: stagingCatalogVisible,
  };

  const mergedBusiness = Object.fromEntries(Object.entries(merged).filter(([key]) => !SOURCE_FIELDS.has(key)));
  const existingBusiness = Object.fromEntries(Object.entries(existing).filter(([key]) => !SOURCE_FIELDS.has(key)));
  if (JSON.stringify(mergedBusiness) === JSON.stringify(existingBusiness)) {
    return { action: "UNCHANGED", record: existing, protected_fields: [...new Set(protectedFields)], apply: false };
  }

  return { action: "UPDATE", record: merged, protected_fields: [...new Set(protectedFields)], apply: true };
}
