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
