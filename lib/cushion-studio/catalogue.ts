import type { FabricMasterRecord } from "../fabric-master/types";
import type { FabricCuttingFacts } from "./domain";

export interface CushionFabricEvidence {
  originalImageUrl: string;
  fullWidthMm?: number;
  sourceHash?: string;
  evidence: string;
  directional?: boolean;
  orderIncrementMetres?: number;
  minimumOrderMetres?: number;
  supplierTermsVerified?: boolean;
  supplierTermsEvidence?: string;
}

export const CUSHION_MISSING_WIDTH_FALLBACK_MM = 1370;

export function cushionPhysicalWidths(fullWidthMm: number | null, usableWidthMm: number | null) {
  const full = Number.isFinite(fullWidthMm) && fullWidthMm !== null && fullWidthMm > 0 ? fullWidthMm : null;
  const usable = Number.isFinite(usableWidthMm) && usableWidthMm !== null && usableWidthMm > 0 ? usableWidthMm : null;
  if (full !== null && usable !== null)
    return {fullWidthMm: full, usableWidthMm: Math.min(full, usable), source: "supplier" as const};
  if (full !== null || usable !== null) {
    const width = full ?? usable!;
    return {fullWidthMm: width, usableWidthMm: width, source: "owner-single-width" as const};
  }
  return {fullWidthMm: CUSHION_MISSING_WIDTH_FALLBACK_MM,
    usableWidthMm: CUSHION_MISSING_WIDTH_FALLBACK_MM, source: "owner-no-width-fallback" as const};
}

export function cushionOrderingTerms(_evidence?: CushionFabricEvidence) {
  return {
    minimumOrderMetres: 1,
    orderIncrementMetres: 1,
    orderingTermsEvidence: "Owner confirmed a 1 metre minimum cut on 14 October 2026 and 1 metre ordering increments for all fabrics on 16 October 2026.",
  };
}

export interface CushionFabricCard {
  id: string;
  brand: string;
  collection: string;
  design: string;
  colour: string;
  imageUrl: string | null;
  fabricProfileUrl?: string;
  fullWidthMm: number | null;
  usableWidthMm: number | null;
  widthSource?: "supplier" | "owner-single-width" | "owner-no-width-fallback";
  calibration: FabricCuttingFacts["calibration"];
  previewReady: boolean;
  purchaseReady: false;
  sampleAvailable: boolean;
}

function safeImage(url: unknown): string | null {
  if (typeof url !== "string") return null;
  try {
    return new URL(url).protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

export function calibrationForFabric(
  record: Pick<FabricMasterRecord, "full_width_mm"> & {usable_width_mm?: number | null},
  evidence?: CushionFabricEvidence,
): FabricCuttingFacts["calibration"] {
  const widths = cushionPhysicalWidths(record.full_width_mm ?? evidence?.fullWidthMm ?? null, record.usable_width_mm ?? null);
  const width = widths.fullWidthMm;
  const imageUrl = safeImage(evidence?.originalImageUrl);
  if (
    !imageUrl ||
    !evidence?.evidence ||
    !width ||
    !Number.isFinite(width) ||
    width <= 0
  )
    return null;
  return {
    imageUrl,
    physicalWidthMm: width,
    physicalHeightMm: 1000,
    ...(evidence?.sourceHash ? { sourceHash: evidence.sourceHash } : {}),
    evidence: widths.source === "owner-no-width-fallback"
      ? `${evidence.evidence} Owner-approved 1370 mm image-width fallback because neither physical width is recorded.`
      : evidence.evidence,
    orientation: "upright",
    tileable: false,
  };
}

/** Owner-approved cushion suitability is independent of the curtain renderer allowlist. */
export function projectCushionFabric(
  record: FabricMasterRecord,
  evidence?: CushionFabricEvidence,
): CushionFabricCard | null {
  if (record.lifecycle_state !== "CURRENT") return null;
  const calibration = calibrationForFabric(record, evidence);
  const widths = cushionPhysicalWidths(record.full_width_mm ?? evidence?.fullWidthMm ?? null, record.usable_width_mm);
  return {
    id: record.fabric_id,
    brand: record.brand_name,
    collection: record.collection_name,
    design: record.design_name,
    colour: record.colour_name,
    imageUrl:
      calibration?.imageUrl ??
      record.imagery.map(safeImage).find(Boolean) ??
      null,
    fullWidthMm: widths.fullWidthMm,
    usableWidthMm: widths.usableWidthMm,
    widthSource: widths.source,
    calibration,
    previewReady: calibration !== null,
    purchaseReady: false,
    sampleAvailable: record.sample_available === true,
  };
}

export function cuttingFactsFromMaster(
  record: FabricMasterRecord,
  evidence?: CushionFabricEvidence,
): FabricCuttingFacts {
  const widths = cushionPhysicalWidths(record.full_width_mm ?? evidence?.fullWidthMm ?? null, record.usable_width_mm);
  return {
    supplierId: record.supplier_id,
    supplierSku: record.supplier_sku,
    id: record.fabric_id,
    fullWidthMm: widths.fullWidthMm,
    usableWidthMm: widths.usableWidthMm,
    usableWidthSource: widths.source,
    lifecycleState: record.lifecycle_state,
    pattern: {
      kind:
        record.vertical_repeat_mm === 0 && record.horizontal_repeat_mm === 0
          ? "plain"
          : record.pattern_match_type === "STRAIGHT_MATCH"
            ? "straight"
            : record.pattern_match_type === "HALF_DROP_MATCH"
              ? "half-drop"
              : "unknown",
      horizontalRepeatMm: record.horizontal_repeat_mm,
      verticalRepeatMm: record.vertical_repeat_mm,
    },
    directional: evidence?.directional ?? null,
    calibration: calibrationForFabric(record, evidence),
    supplierCostMinorPerMetre: null,
    ...cushionOrderingTerms(evidence),
    availableMetres: null,
  };
}

/** Discoverable fabrics without a confirmed current lifecycle stay explorable,
 * but must not inherit a supplier cost or verified stock from another state. */
export function unconfirmedCuttingFacts(
  record: FabricMasterRecord,
  evidence?: CushionFabricEvidence,
): FabricCuttingFacts {
  return {
    ...cuttingFactsFromMaster(record, evidence),
    supplierCostMinorPerMetre: null,
    availableMetres: null,
  };
}

export function searchCushionCatalogue(
  cards: CushionFabricCard[],
  params: URLSearchParams,
) {
  const query = (params.get("q") ?? "")
    .slice(0, 200)
    .toLocaleLowerCase("en-GB")
    .trim();
  const offset = Math.max(
    0,
    Math.min(100000, Number.parseInt(params.get("offset") ?? "0", 10) || 0),
  );
  const limit = Math.max(
    1,
    Math.min(48, Number.parseInt(params.get("limit") ?? "24", 10) || 24),
  );
  const matching = cards.filter(
    (card) =>
      !query ||
      [card.brand, card.collection, card.design, card.colour, card.id]
        .join(" ")
        .toLocaleLowerCase("en-GB")
        .includes(query),
  );
  return {
    items: matching.slice(offset, offset + limit),
    total: matching.length,
    nextOffset: offset + limit < matching.length ? offset + limit : null,
  };
}
