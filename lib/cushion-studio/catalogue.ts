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
  record: Pick<FabricMasterRecord, "full_width_mm">,
  evidence?: CushionFabricEvidence,
): FabricCuttingFacts["calibration"] {
  const width = record.full_width_mm ?? evidence?.fullWidthMm;
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
    evidence: evidence.evidence,
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
    fullWidthMm: record.full_width_mm ?? evidence?.fullWidthMm ?? null,
    usableWidthMm: record.usable_width_mm,
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
  return {
    supplierId: record.supplier_id,
    supplierSku: record.supplier_sku,
    id: record.fabric_id,
    fullWidthMm: record.full_width_mm ?? evidence?.fullWidthMm ?? null,
    usableWidthMm: record.usable_width_mm,
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
