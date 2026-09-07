import type { NormalizedCatalogueRecord } from "./catalogue-protection";
import type { SandersonCataloguePreview } from "./sanderson-catalogue-import";

export const SANDERSON_CANARY_SIZE = 50;

export const SANDERSON_CANARY_ALLOCATION: Readonly<Record<string, number>> = {
  "sdg-sanderson": 9,
  "sdg-harlequin": 9,
  "sdg-morris-co": 8,
  "sdg-zoffany": 8,
  "sdg-scion": 8,
  "sdg-clarke-clarke": 8,
};

function catalogueQuality(record: NormalizedCatalogueRecord) {
  return record.full_width_mm !== null
    && record.full_width_mm > 0
    && record.vertical_repeat_mm !== null
    && record.horizontal_repeat_mm !== null
    && record.pattern_match_type !== null
    && record.composition.length > 0
    && record.collection_name.length > 0
    && record.design_name.length > 0
    && record.colour_name.length > 0;
}

function diversified(records: NormalizedCatalogueRecord[], limit: number) {
  const ordered = [...records].sort((left, right) =>
    `${left.collection_name}\u0000${left.design_name}\u0000${left.supplier_sku}`
      .localeCompare(`${right.collection_name}\u0000${right.design_name}\u0000${right.supplier_sku}`),
  );
  const selected: NormalizedCatalogueRecord[] = [];
  const seenDesigns = new Set<string>();
  for (const record of ordered) {
    if (seenDesigns.has(record.design_id)) continue;
    selected.push(record);
    seenDesigns.add(record.design_id);
    if (selected.length === limit) return selected.map((item) => ({ ...item, staging_catalog_visible: true }));
  }
  for (const record of ordered) {
    if (selected.some((selectedRecord) => selectedRecord.supplier_sku === record.supplier_sku)) continue;
    selected.push(record);
    if (selected.length === limit) return selected.map((item) => ({ ...item, staging_catalog_visible: true }));
  }
  return selected.map((record) => ({ ...record, staging_catalog_visible: true }));
}

/**
 * Selects a deterministic, catalogue-only canary. Existing records are never
 * included: the verified DAPGPA203 pilot is tested as a preservation guard.
 */
export function selectSandersonCanary(preview: SandersonCataloguePreview) {
  if (!preview.source.existing_master_compared) throw new Error("CANARY_CURRENT_MASTER_COMPARISON_REQUIRED");
  const actionBySku = new Map(preview.rows.map((row) => [row.supplier_sku, row.action]));
  const candidates = preview.records.filter((record) =>
    actionBySku.get(record.supplier_sku) === "INSERT"
      && record.supplier_sku !== "DAPGPA203"
      && catalogueQuality(record),
  );
  const selected = Object.entries(SANDERSON_CANARY_ALLOCATION).flatMap(([brandId, count]) => {
    const selection = diversified(candidates.filter((record) => record.brand_id === brandId), count);
    if (selection.length !== count) throw new Error(`CANARY_BRAND_CAPACITY_INSUFFICIENT:${brandId}:${selection.length}/${count}`);
    return selection;
  });
  const skuCount = new Set(selected.map((record) => record.supplier_sku)).size;
  if (selected.length !== SANDERSON_CANARY_SIZE || skuCount !== SANDERSON_CANARY_SIZE) {
    throw new Error(`CANARY_EXACTLY_50_UNIQUE_REQUIRED:${selected.length}:${skuCount}`);
  }
  if (selected.some((record) => record.price_verification_status !== "PRICE_REQUIRES_VERIFICATION" || record.storefront_selectable)) {
    throw new Error("CANARY_PRICING_ELIGIBILITY_MUST_REMAIN_BLOCKED");
  }
  if (selected.some((record) => record.lifecycle_state !== "UNKNOWN")) {
    throw new Error("CANARY_STALE_LIFECYCLE_MUST_REMAIN_UNKNOWN");
  }
  return selected;
}
