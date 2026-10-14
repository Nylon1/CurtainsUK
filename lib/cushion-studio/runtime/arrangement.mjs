import { sizeOf, squareSofaBounds, shapeFilledDepthMm, SHAPED_CONSTRUCTION_VERSION } from "./geometry.mjs";

export function furniturePose(size, scene) {
  const bed = scene.includes("bed");
  return size.shape === "bolster"
    ? { lean: 0, yaw: bed ? 0 : -0.08 }
    : { lean: size.shape === "bed" ? -0.20 : -0.18, yaw: bed ? 0 : -0.06 };
}
/** Conservative rotated full-volume bounds; independent of square construction. */
export function shapedFurnitureBounds(size, scene, rotationDegrees = 0) {
  const {lean:x,yaw:y}=furniturePose(size,scene), z=rotationDegrees*Math.PI/180;
  const cx=Math.cos(x),sx=Math.sin(x),cy=Math.cos(y),sy=Math.sin(y),cz=Math.cos(z),sz=Math.sin(z);
  const w=size.widthMm,h=size.heightMm,d=shapeFilledDepthMm(size);
  return {
    widthMm: Math.abs(cy*cz)*w+Math.abs(cy*sz)*h+Math.abs(sy)*d+6,
    heightMm: Math.abs(cx*sz+sx*sy*cz)*w+Math.abs(cx*cz-sx*sy*sz)*h+Math.abs(sx*cy)*d,
    depthMm: Math.abs(sx*sz-cx*sy*cz)*w+Math.abs(sx*cz+cx*sy*sz)*h+Math.abs(cx*cy)*d+6,
  };
}

export const FURNITURE_LAYOUTS = {
  "sofa-2": {
    widthMm: 1600,
    slots: [0, 1, 2, 3, 4, 5],
    backMm: -150,
    frontMm: 410,
  },
  "sofa-3": {
    widthMm: 2200,
    slots: [0, 1, 2, 3, 4, 5],
    backMm: -150,
    frontMm: 410,
  },
  corner: {
    widthMm: 2200,
    slots: [0, 1, 2, 3, 4, 5, 8],
    backMm: -150,
    frontMm: 410,
    chaiseFrontMm: 1300,
  },
  armchair: { widthMm: 750, slots: [1, 4], backMm: -150, frontMm: 410 },
  "double-bed": {
    widthMm: 1450,
    slots: [0, 1, 2, 3, 4, 5],
    backMm: 0,
    frontMm: 1000,
  },
  "king-bed": {
    widthMm: 1700,
    slots: [0, 1, 2, 3, 4, 5],
    backMm: 0,
    frontMm: 1000,
  },
};
/** Conservative bounds include rotation and cushion thickness; never hide overflow through overlap. */
export function planArrangement(design) {
  const furniture =
      FURNITURE_LAYOUTS[design.scene] || FURNITURE_LAYOUTS["sofa-2"],
    placed = [],
    unplaced = [],
    occupied = new Set();
  for (const piece of design.pieces) {
    const size = sizeOf(piece.spec.sizeId),
      rotation = Math.max(-20, Math.min(20, piece.position.rotation || 0)),
      a = (rotation * Math.PI) / 180;
    let widthMm =
      size.widthMm * Math.abs(Math.cos(a)) +
      size.heightMm * Math.abs(Math.sin(a)) +
      6;
    let heightMm =
      size.heightMm * Math.abs(Math.cos(a)) +
      size.widthMm * Math.abs(Math.sin(a));
    const squareSofa = size.shape === "square" && !design.scene.includes("bed");
    const support = squareSofa
      ? squareSofaBounds(size.widthMm, size.heightMm, rotation)
      : null;
    if (support)
      widthMm = Math.max(
        widthMm,
        Math.max(Math.abs(support.minX), Math.abs(support.maxX)) * 2000 + 6,
      );
    let depthMm =
      size.shape === "bolster"
        ? 230
        : support
          ? (support.maxZ - support.minZ) * 1000 + 6
          : 148 * Math.cos(0.12) + heightMm * Math.sin(0.12);
    if (piece.spec.constructionProfile === SHAPED_CONSTRUCTION_VERSION) {
      const bounds=shapedFurnitureBounds(size,design.scene,rotation);
      widthMm=bounds.widthMm; heightMm=bounds.heightMm; depthMm=bounds.depthMm;
    }
    const wanted = piece.position.slot,
      column = wanted % 3,
      alternatives = [
        wanted,
        ...furniture.slots.filter((s) => s % 3 === column),
        ...furniture.slots,
      ];
    let result = null;
    if (widthMm <= furniture.widthMm) {
      for (const slot of [...new Set(alternatives)]) {
        if (!furniture.slots.includes(slot) || occupied.has(slot)) continue;
        const row = Math.floor(slot / 3),
          col = slot % 3,
          maxX = (furniture.widthMm - widthMm) / 2;
        const xMm =
          Math.max(-maxX, Math.min(maxX, ((col - 1) * furniture.widthMm) / 3)) +
          (piece.position.offsetX || 0);
        if (Math.abs(xMm) + widthMm / 2 > furniture.widthMm / 2) continue;
        if (
          placed.some(
            (p) =>
              p.row === row &&
              Math.abs(p.xMm - xMm) < (p.widthMm + widthMm) / 2 + 15,
          )
        )
          continue;
        result = {
          id: piece.spec.id,
          slot,
          column: col,
          row,
          xMm,
          widthMm,
          heightMm,
          depthMm,
          rotation,
          offsetY: piece.position.offsetY || 0,
          ...(squareSofa ? { squareSofa: true } : {}),
        };
        break;
      }
    }
    if (result) {
      placed.push(result);
      occupied.add(result.slot);
    } else
      unplaced.push({
        id: piece.spec.id,
        reason:
          widthMm > furniture.widthMm
            ? "This cushion is wider than the clear seat at its current angle."
            : "There is no clear position left on this furniture.",
      });
  }
  const depths = [0, 1, 2].map((row) =>
    Math.max(0, ...placed.filter((p) => p.row === row).map((p) => p.depthMm)),
  );
  const placements = [];
  for (const p of placed) {
    const zMm =
      furniture.backMm -
      (p.squareSofa && p.row === 0 ? 35 : 0) +
      depths.slice(0, p.row).reduce((a, b) => a + b + 25, 0) +
      p.depthMm / 2 +
      p.offsetY;
    const front =
      p.row === 2 && design.scene === "corner"
        ? furniture.chaiseFrontMm
        : furniture.frontMm;
    if (
      zMm + p.depthMm / 2 > front ||
      zMm - p.depthMm / 2 <
        furniture.backMm - (p.squareSofa && p.row === 0 ? 35 : 0)
    )
      unplaced.push({
        id: p.id,
        reason: "This cushion has no clear depth on the seat.",
      });
    else if (placements.some((other) =>
      Math.abs(other.xMm - p.xMm) < (other.widthMm + p.widthMm) / 2 &&
      Math.abs(other.zMm - zMm) < (other.depthMm + p.depthMm) / 2
    )) unplaced.push({id:p.id,reason:"This position overlaps another cushion. Choose a clear position or reset its offsets."});
    else placements.push({ ...p, zMm });
  }
  return { placements, unplaced, capacity: furniture.slots.length };
}
