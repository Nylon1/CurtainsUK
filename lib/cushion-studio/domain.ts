import { OWNER_CONFIRMED_CUSHION_DISPATCH, type CushionDispatchEstimate } from "./dispatch";
import { STANDARD_INSERTS_BY_SIZE, LEGACY_DUNELM_INSERTS_BY_SIZE } from "./insert-sourcing";
import { squareDrapeFitsSource, CUSHION_VISUAL_SIZES, SHAPED_CONSTRUCTION_VERSION, shapeDrapeFitsSource, sizeOf } from "./runtime/geometry.mjs";
/** Cushion manufacturing is independent of curtain configurations and scene placement. */
export const CUSHION_SPEC_VERSION = 1 as const;
export const CUSHION_SIZES = CUSHION_VISUAL_SIZES.map((size) => ({
  ...size,
  shape: size.shape === "square" || size.shape === "bed" ? "rectangle" as const : size.shape,
}));
export type CushionSize = (typeof CUSHION_SIZES)[number];
/** Owner decisions apply only to this original range. Future registry entries
 * must not acquire construction approval, making rates or piping methods merely
 * by becoming selectable. Existing size identities remain permanent authority.
 */
export const OWNER_APPROVED_ORIGINAL_CUSHION_SIZE_IDS = Object.freeze([
  "square-38", "square-45", "square-50", "square-55", "square-60",
  "rectangle-30-45", "rectangle-38-50",
  "round-40", "round-50", "bed-square-65", "bed-square-70", "bolster-23-56",
] as const);
export const CUSHION_SCENES = [
  "sofa-2",
  "sofa-3",
  "corner",
  "armchair",
  "double-bed",
  "king-bed",
] as const;
export type PlacementMm = { x: number; y: number };
export type CushionSpec = {
  version: 1;
  id: string;
  sizeId: string;
  rangeVersion?: "standard-inserts-v1";
  /** Explicit opt-in: earlier saved specs retain their original construction. */
  constructionProfile?: typeof SHAPED_CONSTRUCTION_VERSION;
  /** Manufacturing contract, independent of the accepted illustrative drape. */
  manufacturingProfile?: "flat-sewn-v1";
  fabricId: string;
  filling: "cover" | "filled";
  /** Omitted on saved legacy specifications; never infer an insert material. */
  fillingType?: "hollowfibre" | "polyester";
  edge: "unpiped" | "self" | "contrast";
  pipingFabricId?: string;
  /** Top-left visible artwork in the original flat image. Both faces share this. */
  placementMm: PlacementMm;
  bolsterEndPlacementMm?: PlacementMm;
  quantity: number;
};
export type CushionDesign = {
  version: 1;
  id: string;
  name: string;
  scene: (typeof CUSHION_SCENES)[number];
  colours: { furniture: string; wall: string; floor: string; bedCover?: string };
  pieces: {
    spec: CushionSpec;
    position: {
      slot: number;
      offsetX: number;
      offsetY: number;
      rotation: number;
    };
  }[];
};
export type FabricCalibration = {
  imageUrl: string;
  physicalWidthMm: number;
  physicalHeightMm: number;
  sourceHash?: string;
  evidence: string;
  orientation: "upright";
  tileable: false;
};
export type FabricCuttingFacts = {
  /** Private procurement identity; never projected into customer browse/quotes. */
  supplierId?: string;
  supplierSku?: string;
  id: string;
  fullWidthMm: number | null;
  usableWidthMm: number | null;
  pattern: {
    kind: "plain" | "straight" | "half-drop" | "unknown";
    horizontalRepeatMm: number | null;
    verticalRepeatMm: number | null;
  };
  directional: boolean | null;
  calibration: FabricCalibration | null;
  supplierCostMinorPerMetre: number | null;
  orderIncrementMetres: number | null;
  minimumOrderMetres: number | null;
  orderingTermsEvidence?: string;
  availableMetres: number | null;
};
export type ConstructionRules = {
  version: string;
  seamAllowanceMm: number;
  confirmed: boolean;
  /** Workroom approval that the sewn square panels cover the calibrated curved face. */
  squareDrapeConfirmed?: boolean;
  flatConstructionBySize?: Record<string, {
    seamAllowanceMm: number;
    confirmed: boolean;
    approvalReference?: string;
    approvalAuthority?: "owner" | "workroom";
  }>;
  /** Each new shaped construction needs its own seam and workroom confirmation. */
  shapedConstructionBySize?: Record<string, {
    profileVersion: typeof SHAPED_CONSTRUCTION_VERSION;
    seamAllowanceMm: number | null;
    confirmed: boolean;
    approvalReference?: string;
  }>;
  approvedSizeIds?: string[];
  pipingStripWidthMm: number | null;
  pipingJoinAllowanceMm: number | null;
  pipingCordDiameterMm?: number | null;
  pipingCut: "straight" | "bias" | null;
  pipingConfirmed: boolean;
  /** Applies to the conservative 45 degree bounding-box strip layout only. */
  pipingBiasConfirmed?: boolean;
  pipingProposal?: {
    version: string;
    stripWidthMm: number;
    cordDiameterMm: number;
    finishingAllowanceMm: number;
    allowanceConfirmed: boolean;
    cutBySize: Record<string, "straight" | "bias">;
  };
};
export const CUSHION_OWNER_CONSTRUCTION_REFERENCE =
  "Owner accepted the 15 mm panel and closure specification on 2026-10-15 and reports workroom confirmation of all active-range construction details on 2026-10-16. No measured physical trial record was supplied.";
/** Legacy 20 mm construction remains unapproved. Active flat profiles have workroom approval. */
export const PREVIEW_CONSTRUCTION_RULES: ConstructionRules = {
  version: "cushion-construction-v7-conservative-bias-layout",
  seamAllowanceMm: 20,
  confirmed: false,
  squareDrapeConfirmed: false,
  flatConstructionBySize: { ...Object.fromEntries(OWNER_APPROVED_ORIGINAL_CUSHION_SIZE_IDS.map(sizeId => [sizeId, {
      seamAllowanceMm: 15,
      confirmed: true,
      approvalAuthority: "workroom",
      approvalReference: CUSHION_OWNER_CONSTRUCTION_REFERENCE,
  }])), ...Object.fromEntries(["square-35","square-40","rectangle-28-48","rectangle-38-58","bed-square-68","bolster-19-44"].map(sizeId => [sizeId, {
    seamAllowanceMm:15,confirmed:true,approvalAuthority:"workroom" as const,
    approvalReference:"Owner reports workroom confirmation of all proposed active-range construction details, 2026-10-16. No measured trial record supplied.",
  }])) },
  approvedSizeIds: ["round-40", "round-50", "bed-square-65", "bed-square-70", "square-35", "square-40", "rectangle-28-48", "rectangle-38-58", "bed-square-68", "bolster-19-44"],
  pipingStripWidthMm: 40,
  pipingCordDiameterMm: 4,
  // The workroom confirmed 300 mm total for joins and finishing, not a
  // separate loss per join. Flat-sewn straight strips use that gross reserve.
  pipingJoinAllowanceMm: null,
  pipingCut: "straight",
  pipingConfirmed: true,
  pipingBiasConfirmed: true,
  pipingProposal: {
    version: "workroom-confirmed-piping-v2-20261016",
    stripWidthMm: 40,
    cordDiameterMm: 4,
    finishingAllowanceMm: 300,
    allowanceConfirmed: true,
    cutBySize: Object.fromEntries([...OWNER_APPROVED_ORIGINAL_CUSHION_SIZE_IDS,"square-35","square-40","rectangle-28-48","rectangle-38-58","bed-square-68","bolster-19-44"].map(sizeId => [sizeId,
      sizeId === "round-40" || sizeId === "round-50" || sizeId.startsWith("bolster-") ? "bias" : "straight",
    ])),
  },
};
export type CushionPricingRules = {
  version: string;
  dispatchEstimate?: CushionDispatchEstimate | null;
  construction: ConstructionRules;
  marginBasisPoints: number | null;
  vatBasisPoints: number | null;
  fixedCosts?: {
    sundriesMinor: number;
    insertMinor: number;
    packagingMinor: number;
    overheadMinor: number;
  };
  discountNetMinor?: number;
  supplierCarriageMinor?: number | null;
  makingRateCard?: Record<
    string,
    Record<
      CushionSpec["edge"],
      { amountMinor: number; approval: "confirmed" | "proposed"; approvalReference?: string }
    >
  >;
  compatibleInsertCostMinorBySize?: Partial<Record<string, number>>;
  compatibleInsertsBySize?: Record<string, {
    fillingType?: "hollowfibre" | "polyester";
    supplierSku: string;
    supplierVariantId?: string;
    costBasisConfirmed?: boolean;
    coverSizeId: string;
    /** Supplier-stated pad dimensions, never an inferred finished-cover size. */
    dimensionsMm: number[];
    /** Separate finished-cover dimensions supported by the referenced fit rule. */
    finishedCoverDimensionsMm?: number[];
    /** A supplier size listing is not a fit rule; pending evidence blocks filled quotations. */
    fitEvidence?: {
      version: string;
      status: "confirmed" | "pending";
      reference: string;
    };
    costMinor: number;
    confirmed: boolean;
    approvalReference: string;
    sourcing?: {
      supplier: string;
      productId: string;
      productName: string;
      sourceUrl: string;
      checkedOn: string;
      currency: string;
      priceBasis: string;
      vatBasisPoints: number | null;
      termsUrl: string;
      procurementNote: string;
      advertisedSize: string;
      grossPriceMinor: number;
      fitStatus: "confirmed" | "advertised-size-match" | "unconfirmed";
      skuVerified: boolean;
      /** Preserve the supplier's exact description; polyester does not imply hollowfibre. */
      supplierFillingDescription?: string;
      /** Historical observation only, not live stock authority or a reservation. */
      stockObservation?: {
        status: "in-stock" | "out-of-stock" | "unknown";
        observedAt: string;
        reference: string;
      };
    };
  }>;
  legacyCompatibleInsertsBySize?: CushionPricingRules["compatibleInsertsBySize"];
  /** Customer delivery net charge, distinct from supplier carriage in the cost basis. */
  carriageMinor: number | null;
  /** Exact customer delivery INCLUDING VAT, once per cushion-only order. */
  customerDeliveryGrossMinor?: number | null;
  /** Actual carrier expense ex VAT; staff only, separate from product margin. */
  carrierCostMinor?: number | null;
};
export const CUSHION_OWNER_MAKING_REFERENCE =
  "Owner approved 2026-10-15: complete unpiped/self-piped making charges 8/11 standard, 10/13 round and bed65, 12/15 bolster and bed70 GBP; piping cord/labour included, fabric separate. Owner-directed standard-size replacement, 2026-10-16, retains these approved family charges for the revised sizes, including bed68 and bolster19x44; no extra visual-fullness charge.";
export const CUSHION_MAKING_RATE_CARD: NonNullable<
  CushionPricingRules["makingRateCard"]
> = Object.fromEntries(
  [...OWNER_APPROVED_ORIGINAL_CUSHION_SIZE_IDS,"square-35","square-40","rectangle-28-48","rectangle-38-58","bed-square-68","bolster-19-44"].map((sizeId) => {
    const base =
      sizeId.startsWith("bolster-") || sizeId === "bed-square-70" || sizeId === "bed-square-68"
        ? 1200
        : sizeId === "round-40" || sizeId === "round-50" || sizeId === "bed-square-65"
          ? 1000
          : 800;
    return [
      sizeId,
      {
        unpiped: {
          amountMinor: base,
          approval: "confirmed",
          approvalReference: CUSHION_OWNER_MAKING_REFERENCE,
        },
        self: { amountMinor: base + 300, approval: "confirmed", approvalReference: CUSHION_OWNER_MAKING_REFERENCE },
        contrast: { amountMinor: base + 400, approval: "proposed" },
      },
    ];
  }),
);
export const PREVIEW_PRICING_RULES: CushionPricingRules = {
  version: "cushion-cost-basis-v14-conservative-bias-layout-20261016",
  construction: PREVIEW_CONSTRUCTION_RULES,
  makingRateCard: CUSHION_MAKING_RATE_CARD,
  compatibleInsertsBySize: STANDARD_INSERTS_BY_SIZE,
  legacyCompatibleInsertsBySize: LEGACY_DUNELM_INSERTS_BY_SIZE,
  // Owner-selected starting target, 14 October 2026; server rules remain editable.
  marginBasisPoints: 4000,
  vatBasisPoints: null,
  // Owner confirmed zero supplier carriage on 16 October 2026. Customer
  // delivery and actual outbound carrier expense remain separate amounts.
  supplierCarriageMinor: 0,
  carriageMinor: null,
  customerDeliveryGrossMinor: 495,
  carrierCostMinor: null,
  dispatchEstimate: OWNER_CONFIRMED_CUSHION_DISPATCH,
};
const idPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,149}$/;
function object(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("CUSHION_OBJECT_REQUIRED");
  return input as Record<string, unknown>;
}
function identifier(input: unknown): string {
  if (typeof input !== "string" || !idPattern.test(input))
    throw new Error("CUSHION_ID_INVALID");
  return input;
}
function placement(input: unknown): PlacementMm {
  const p = object(input);
  if (
    ![p.x, p.y].every(
      (v) =>
        typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 10000,
    )
  )
    throw new Error("CUSHION_PLACEMENT_INVALID");
  return { x: p.x as number, y: p.y as number };
}
export function cushionSize(id: string): CushionSize {
  const s = CUSHION_SIZES.find((s) => s.id === id);
  if (!s) throw new Error("CUSHION_SIZE_INVALID");
  return s;
}
export function parseCushionSpec(input: unknown): CushionSpec {
  const p = object(input);
  if (p.version !== 1) throw new Error("CUSHION_VERSION_UNSUPPORTED");
  const sizeId = identifier(p.sizeId);
  cushionSize(sizeId);
  if (p.filling !== "cover" && p.filling !== "filled")
    throw new Error("CUSHION_FILLING_INVALID");
  if (!["unpiped", "self", "contrast"].includes(String(p.edge)))
    throw new Error("CUSHION_EDGE_INVALID");
  if (
    !Number.isInteger(p.quantity) ||
    Number(p.quantity) < 1 ||
    Number(p.quantity) > 50
  )
    throw new Error("CUSHION_QUANTITY_INVALID");
  const result: CushionSpec = {
    version: 1,
    id: identifier(p.id),
    sizeId,
    fabricId: identifier(p.fabricId),
    filling: p.filling,
    edge: p.edge as CushionSpec["edge"],
    placementMm: placement(p.placementMm),
    quantity: Number(p.quantity),
  };
  if (p.rangeVersion !== undefined) {
    if (p.rangeVersion !== "standard-inserts-v1") throw new Error("CUSHION_RANGE_VERSION_UNSUPPORTED");
    result.rangeVersion = "standard-inserts-v1";
  }
  if (p.fillingType !== undefined) {
    if (!["hollowfibre","polyester"].includes(String(p.fillingType)) || p.filling !== "filled")
      throw new Error("CUSHION_FILLING_TYPE_INVALID");
    result.fillingType = p.fillingType as CushionSpec["fillingType"];
  }
  if (result.edge === "contrast")
    result.pipingFabricId = identifier(p.pipingFabricId);
  if (p.constructionProfile !== undefined) {
    if (p.constructionProfile !== SHAPED_CONSTRUCTION_VERSION || sizeId.startsWith("square-"))
      throw new Error("CUSHION_CONSTRUCTION_PROFILE_UNSUPPORTED");
    result.constructionProfile = SHAPED_CONSTRUCTION_VERSION;
  }
  if (p.manufacturingProfile !== undefined) {
    if (p.manufacturingProfile !== "flat-sewn-v1") throw new Error("CUSHION_MANUFACTURING_PROFILE_INVALID");
    result.manufacturingProfile = "flat-sewn-v1";
  }
  if (p.bolsterEndPlacementMm !== undefined)
    result.bolsterEndPlacementMm = placement(p.bolsterEndPlacementMm);
  return result;
}
export function parseCushionDesign(input: unknown): CushionDesign {
  const p = object(input),
    colours = object(p.colours);
  if (
    p.version !== 1 ||
    !CUSHION_SCENES.includes(p.scene as (typeof CUSHION_SCENES)[number])
  )
    throw new Error("CUSHION_DESIGN_INVALID");
  if (
    typeof p.name !== "string" ||
    p.name.trim().length < 1 ||
    p.name.length > 120
  )
    throw new Error("CUSHION_DESIGN_NAME_INVALID");
  if (!Array.isArray(p.pieces) || p.pieces.length > 32)
    throw new Error("CUSHION_DESIGN_PIECES_INVALID");
  for (const c of ["furniture", "wall", "floor"])
    if (
      typeof colours[c] !== "string" ||
      !/^#[0-9a-f]{6}$/i.test(String(colours[c]))
    )
      throw new Error("CUSHION_COLOUR_INVALID");
  if (colours.bedCover !== undefined &&
      (typeof colours.bedCover !== "string" || !/^#[0-9a-f]{6}$/i.test(colours.bedCover)))
    throw new Error("CUSHION_COLOUR_INVALID");
  const pieces = p.pieces.map((value) => {
    const item = object(value),
      pos = object(item.position);
    if (
      !Number.isInteger(pos.slot) ||
      Number(pos.slot) < 0 ||
      Number(pos.slot) > 31 ||
      ![pos.offsetX, pos.offsetY, pos.rotation].every(
        (v) =>
          typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= 10000,
      )
    )
      throw new Error("CUSHION_SCENE_POSITION_INVALID");
    return {
      spec: parseCushionSpec(item.spec),
      position: {
        slot: Number(pos.slot),
        offsetX: Number(pos.offsetX),
        offsetY: Number(pos.offsetY),
        rotation: Number(pos.rotation),
      },
    };
  });
  if (new Set(pieces.map((p) => p.spec.id)).size !== pieces.length)
    throw new Error("CUSHION_DUPLICATE_ID");
  return {
    version: 1,
    id: identifier(p.id),
    name: p.name.trim(),
    scene: p.scene as CushionDesign["scene"],
    colours: colours as CushionDesign["colours"],
    pieces,
  };
}
export function visiblePanelSize(spec: CushionSpec) {
  const s = cushionSize(spec.sizeId);
  return {
    widthMm: s.widthMm,
    heightMm: s.shape === "bolster" ? Math.PI * s.heightMm : s.heightMm,
  };
}
export function previewIssues(
  spec: CushionSpec,
  facts: FabricCuttingFacts,
): string[] {
  const errors: string[] = [];
  if (spec.fabricId !== facts.id)
    errors.push("Fabric identity does not match.");
  const c = facts.calibration;
  if (!c) {
    errors.push("Original fabric image calibration is unavailable.");
    return errors;
  }
  if (
    ![c.physicalWidthMm, c.physicalHeightMm].every(
      (n) => Number.isFinite(n) && n > 0,
    ) ||
    c.orientation !== "upright" ||
    c.tileable !== false
  )
    errors.push("Original image calibration is invalid.");
  const size = visiblePanelSize(spec),
    fits = (p: PlacementMm, w: number, h: number) =>
      p.x + w <= c.physicalWidthMm + 1e-6 &&
      p.y + h <= c.physicalHeightMm + 1e-6;
  const sourceFits = spec.sizeId.startsWith("square-")
    ? squareDrapeFitsSource(size, c, spec.placementMm)
    : spec.constructionProfile === SHAPED_CONSTRUCTION_VERSION
      ? shapeDrapeFitsSource(sizeOf(spec.sizeId), c, spec.placementMm, spec.bolsterEndPlacementMm)
      : fits(spec.placementMm, size.widthMm, size.heightMm);
  if (!sourceFits)
    errors.push(
      "Artwork placement or the curved surface exceeds the original image; wrapping and extension are not permitted.",
    );
  if (
    cushionSize(spec.sizeId).shape === "bolster" &&
    !fits(
      spec.bolsterEndPlacementMm ?? spec.placementMm,
      cushionSize(spec.sizeId).heightMm,
      cushionSize(spec.sizeId).heightMm,
    )
  )
    errors.push("Bolster end-cap placement exceeds the original image.");
  return errors;
}

/** Versioned selection prevents a revised insert from replacing an old saved filling implicitly. */
export function insertForSpec(spec: CushionSpec, rules: CushionPricingRules) {
  return (spec.rangeVersion === "standard-inserts-v1" ? rules.compatibleInsertsBySize
    : rules.legacyCompatibleInsertsBySize ?? rules.compatibleInsertsBySize)?.[spec.sizeId];
}
