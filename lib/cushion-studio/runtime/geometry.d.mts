export type SquareDrapeFootprint = {
  version: "square-drape-arc-v1";
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  visibleWidthMm: number;
  visibleHeightMm: number;
};

export function squareDrapeFootprint(
  widthMm: number,
  heightMm: number,
): SquareDrapeFootprint;

export function squareDrapeFitsSource(
  size: { widthMm: number; heightMm: number },
  calibration: { physicalWidthMm: number; physicalHeightMm: number },
  placement: { x: number; y: number },
): boolean;

export type VisualCushionSize = {
  readonly id: string;
  readonly label: string;
  readonly shape: "square" | "rectangle" | "bed" | "round" | "bolster";
  readonly widthMm: number;
  readonly heightMm: number;
  readonly approval: "confirmed" | "proposed";
};
export const CUSHION_VISUAL_SIZES: readonly VisualCushionSize[];
export const SHAPED_CONSTRUCTION_VERSION: "shaped-filled-v1";
export function sizeOf(id?: string): VisualCushionSize;
export type ShapedSourceFootprint = {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
  readonly visibleWidthMm: number;
  readonly visibleHeightMm: number;
  readonly cutShape: "rectangle" | "circle";
};
export type ShapedFootprints = {
  readonly version: typeof SHAPED_CONSTRUCTION_VERSION;
  readonly body: ShapedSourceFootprint;
  readonly end?: ShapedSourceFootprint;
};
export type ShapedSize = Pick<
  VisualCushionSize,
  "shape" | "widthMm" | "heightMm"
>;
export type ShapedPoint = {
  x: number;
  y: number;
  z: number;
  clothU: number;
  clothV: number;
};
export function shapedPanelPoint(input: {
  shape: "rectangle" | "bed";
  u: number;
  v: number;
  widthMm: number;
  heightMm: number;
  back?: boolean;
}): ShapedPoint;
export function shapedPanelAxis(sizeMm: number): number[];
export function roundPanelPoint(input: {
  radiusFraction: number;
  angle: number;
  diameterMm: number;
  back?: boolean;
}): ShapedPoint;
export function bolsterBodyPoint(input: {
  along: number;
  around: number;
  lengthMm: number;
  diameterMm: number;
}): ShapedPoint;
export function bolsterEndPoint(input: {
  radiusFraction: number;
  angle: number;
  lengthMm: number;
  diameterMm: number;
  back?: boolean;
}): ShapedPoint;
export function shapeDrapeFootprints(size: ShapedSize): ShapedFootprints;
export function shapeFilledDepthMm(size: ShapedSize): number;
export function shapeDrapeFitsSource(
  size: ShapedSize,
  calibration:
    { physicalWidthMm: number; physicalHeightMm: number } | null | undefined,
  placement: { x: number; y: number },
  endPlacement?: { x: number; y: number },
): boolean;

export function roundPreviewPoint(input: {radiusFraction:number;angle:number;diameterMm:number;back?:boolean}):ShapedPoint;
export function roundPreviewDepthMm(diameterMm:number):number;
export function roundPreviewFootprint(diameterMm:number):ShapedSourceFootprint;
export function roundPreviewFitsSource(size:{widthMm:number},calibration:{physicalWidthMm:number;physicalHeightMm:number}|null|undefined,placement:{x:number;y:number}):boolean;

export const CUSHION_ACTIVE_SIZE_IDS: readonly string[];
export const CUSHION_LEGACY_SIZE_REPLACEMENTS: Readonly<Record<string, string>>;
