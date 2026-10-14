/** Cushion manufacturing is independent of curtain configurations and scene placement. */
export const CUSHION_SPEC_VERSION = 1 as const;
export const CUSHION_SIZES = [
  ...[38, 45, 50, 55, 60].map((cm) => ({
    id: `square-${cm}`,
    label: `${cm} × ${cm} cm`,
    shape: "rectangle" as const,
    widthMm: cm * 10,
    heightMm: cm * 10,
    approval: "confirmed" as const,
  })),
  {
    id: "rectangle-30-45",
    label: "30 × 45 cm",
    shape: "rectangle" as const,
    widthMm: 450,
    heightMm: 300,
    approval: "confirmed" as const,
  },
  {
    id: "rectangle-38-50",
    label: "38 × 50 cm",
    shape: "rectangle" as const,
    widthMm: 500,
    heightMm: 380,
    approval: "confirmed" as const,
  },
  ...[40, 50].map((cm) => ({
    id: `round-${cm}`,
    label: `Round ${cm} cm · proposed`,
    shape: "round" as const,
    widthMm: cm * 10,
    heightMm: cm * 10,
    approval: "proposed" as const,
  })),
  {
    id: "bed-square-65",
    label: "Decorative bed square 65 cm · proposed",
    shape: "rectangle" as const,
    widthMm: 650,
    heightMm: 650,
    approval: "proposed" as const,
  },
  {
    id: "bed-square-70",
    label: "Decorative bed square 70 cm · proposed",
    shape: "rectangle" as const,
    widthMm: 700,
    heightMm: 700,
    approval: "proposed" as const,
  },
  {
    id: "bolster-23-56",
    label: "Bolster Ø23 × 56 cm",
    shape: "bolster" as const,
    widthMm: 560,
    heightMm: 230,
    approval: "confirmed" as const,
  },
] as const;
export type CushionSize = (typeof CUSHION_SIZES)[number];
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
  fabricId: string;
  filling: "cover" | "filled";
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
  colours: { furniture: string; wall: string; floor: string };
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
  approvedSizeIds?: string[];
  pipingStripWidthMm: number | null;
  pipingJoinAllowanceMm: number | null;
  pipingCordDiameterMm?: number | null;
  pipingCut: "straight" | "bias" | null;
  pipingConfirmed: boolean;
};
/** Planning allowance from the owner's 50+4 cm example; not a workroom approval. */
export const PREVIEW_CONSTRUCTION_RULES: ConstructionRules = {
  version: "cushion-construction-preview-v1",
  seamAllowanceMm: 20,
  confirmed: false,
  pipingStripWidthMm: null,
  pipingJoinAllowanceMm: null,
  pipingCut: null,
  pipingConfirmed: false,
};
export type CushionPricingRules = {
  version: string;
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
      { amountMinor: number; approval: "confirmed" | "proposed" }
    >
  >;
  compatibleInsertCostMinorBySize?: Partial<Record<string, number>>;
  /** Customer delivery net charge, distinct from supplier carriage in the cost basis. */
  carriageMinor: number | null;
};
export const CUSHION_MAKING_RATE_CARD: NonNullable<
  CushionPricingRules["makingRateCard"]
> = Object.fromEntries(
  CUSHION_SIZES.map((size) => {
    const base =
      size.id === "bolster-23-56" || size.id === "bed-square-70"
        ? 1200
        : size.shape === "round" || size.id === "bed-square-65"
          ? 1000
          : 800;
    return [
      size.id,
      {
        unpiped: {
          amountMinor: base,
          approval: base === 800 ? "confirmed" : "proposed",
        },
        self: { amountMinor: base + 300, approval: "proposed" },
        contrast: { amountMinor: base + 400, approval: "proposed" },
      },
    ];
  }),
);
export const PREVIEW_PRICING_RULES: CushionPricingRules = {
  version: "cushion-cost-basis-v2-owner-margin40",
  construction: PREVIEW_CONSTRUCTION_RULES,
  // Owner-selected starting target, 14 October 2026; server rules remain editable.
  marginBasisPoints: 4000,
  vatBasisPoints: null,
  carriageMinor: null,
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
  if (result.edge === "contrast")
    result.pipingFabricId = identifier(p.pipingFabricId);
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
  if (!fits(spec.placementMm, size.widthMm, size.heightMm))
    errors.push(
      "Artwork placement exceeds the original image; wrapping and extension are not permitted.",
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
