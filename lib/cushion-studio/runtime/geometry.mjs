/** Finite flat-cloth mapping shared by front and rear outward-facing surfaces. */
export function panelSourceUv({
  u,
  v,
  placementMm,
  physicalWidthMm,
  physicalHeightMm,
  widthMm,
  heightMm,
}) {
  return [
    (placementMm.x + u * widthMm) / physicalWidthMm,
    1 - (placementMm.y + (1 - v) * heightMm) / physicalHeightMm,
  ];
}
/** Invert geometry X on the back, not artwork U: viewed from outside both faces read upright. */
export function panelPoint({
  u,
  v,
  widthMm,
  heightMm,
  back = false,
  round = false,
  square = false,
}) {
  if (square && !round)
    return squarePanelPoint({ u, v, widthMm, heightMm, back });
  const a = 2 * u - 1,
    b = 2 * v - 1,
    x = round ? a * Math.sqrt(1 - (b * b) / 2) : a,
    y = round ? b * Math.sqrt(1 - (a * a) / 2) : b;
  const sewnX = round ? x : x * (1 - 0.075 * Math.pow(Math.abs(b), 12)),
    sewnY = round ? y : y * (1 - 0.075 * Math.pow(Math.abs(a), 12));
  return {
    x: ((back ? -1 : 1) * sewnX * widthMm) / 2000,
    y: (sewnY * heightMm) / 2000,
    z:
      (back ? -1 : 1) *
      0.074 *
      Math.pow(Math.max(0, (1 - a * a) * (1 - b * b)), 0.48),
    clothU: (x + 1) / 2,
    clothV: (y + 1) / 2,
  };
}
const smoothStep = (low, high, value) => {
  const t = Math.max(0, Math.min(1, (value - low) / (high - low)));
  return t * t * (3 - 2 * t);
};

/** Sewn square, in metres. Flat material coordinates remain unchanged by drape. */
export function squarePanelPoint({ u, v, widthMm, heightMm, back = false }) {
  const a = 2 * u - 1,
    b = 2 * v - 1;
  // Confine edge draw-in to the outer cloth: the central panel retains its X/Y scale.
  // Corners retain the full finished flat dimensions instead of being rounded off.
  const x = a * (1 - 0.065 * smoothStep(0.62, 1, Math.abs(a)) * (1 - b * b)),
    y = b * (1 - 0.075 * smoothStep(0.62, 1, Math.abs(b)) * (1 - a * a));
  const envelope = Math.pow(Math.max(0, (1 - a * a) * (1 - b * b)), 0.58);
  const halfDepth = (Math.min(widthMm, heightMm) / 1000) * 0.155;
  // A little more fullness below centre; every tension fold fades into the sewn edge.
  const p = 1 - Math.abs(a),
    q = 1 - Math.abs(b);
  const tension =
    Math.exp(-Math.pow((p - 0.62 * q) / 0.035, 2)) * Math.exp(-(p + q) / 0.32) +
    0.65 *
      Math.exp(-Math.pow((q - 0.7 * p) / 0.045, 2)) *
      Math.exp(-(p + q) / 0.26);
  const folds = halfDepth * 0.12 * tension * Math.pow(envelope, 0.55);
  const z = Math.max(0, halfDepth * envelope * (1 - 0.12 * b) - folds);
  return {
    x: ((back ? -1 : 1) * x * widthMm) / 2000,
    y: (y * heightMm) / 2000,
    z: (back ? -1 : 1) * z,
    clothU: u,
    clothV: v,
  };
}

export const SQUARE_SOFA_LEAN = -0.22;
/** Three.js XYZ Euler ordering: local Z rotation followed by backward X lean. */
export function squareSofaPoint(point, rotationDegrees = 0) {
  const r = (rotationDegrees * Math.PI) / 180,
    x = point.x * Math.cos(r) - point.y * Math.sin(r),
    y = point.x * Math.sin(r) + point.y * Math.cos(r);
  return {
    x,
    y: y * Math.cos(SQUARE_SOFA_LEAN) - point.z * Math.sin(SQUARE_SOFA_LEAN),
    z: y * Math.sin(SQUARE_SOFA_LEAN) + point.z * Math.cos(SQUARE_SOFA_LEAN),
  };
}

/** A short flat contact patch with a smooth transition; never rescale the cloth UVs. */
export function squareSeatContactY(y, minimumY, compression) {
  const contact = minimumY + compression;
  if (y <= contact - compression / 5) return contact;
  if (y >= contact + compression / 5) return y;
  const distance = y - (contact - compression / 5);
  return contact + (distance * distance) / (0.8 * compression);
}
const supportCache = new Map();
export function squareSofaBounds(widthMm, heightMm, rotationDegrees = 0) {
  const key = `${widthMm}:${heightMm}:${rotationDegrees}`;
  if (supportCache.has(key)) return supportCache.get(key);
  const bounds = {
    minX: Infinity,
    maxX: -Infinity,
    minY: Infinity,
    maxY: -Infinity,
    minZ: Infinity,
    maxZ: -Infinity,
  };
  for (let y = 0; y <= 64; y++)
    for (let x = 0; x <= 64; x++)
      for (const back of [false, true]) {
        const p = squareSofaPoint(
          squarePanelPoint({ u: x / 64, v: y / 64, widthMm, heightMm, back }),
          rotationDegrees,
        );
        for (const axis of ["X", "Y", "Z"]) {
          bounds[`min${axis}`] = Math.min(
            bounds[`min${axis}`],
            p[axis.toLowerCase()],
          );
          bounds[`max${axis}`] = Math.max(
            bounds[`max${axis}`],
            p[axis.toLowerCase()],
          );
        }
      }
  const result = Object.freeze({
    ...bounds,
    // A cushion tilted onto one corner compresses that corner a little further.
    compression: Math.min(
      0.02,
      (heightMm / 1000) *
        (0.016 + 0.05 * Math.abs(Math.sin((rotationDegrees * Math.PI) / 180))),
    ),
  });
  if (supportCache.size >= 64)
    supportCache.delete(supportCache.keys().next().value);
  supportCache.set(key, result);
  return result;
}

export function coverageBounds(size, calibration) {
  return {
    x: Math.max(0, (calibration?.physicalWidthMm || 0) - size.widthMm),
    y: Math.max(
      0,
      (calibration?.physicalHeightMm || 0) -
        (size.shape === "bolster" ? Math.PI * size.heightMm : size.heightMm),
    ),
  };
}
export function sizeOf(id = "square-45") {
  const sizes = {
    "square-38": [380, 380],
    "square-45": [450, 450],
    "square-50": [500, 500],
    "square-55": [550, 550],
    "square-60": [600, 600],
    "rectangle-30-45": [450, 300],
    "rectangle-38-50": [500, 380],
    "round-40": [400, 400],
    "round-50": [500, 500],
    "bed-square-65": [650, 650],
    "bed-square-70": [700, 700],
    "bolster-23-56": [560, 230],
  };
  const [widthMm, heightMm] = sizes[id] || sizes["square-45"];
  return {
    widthMm,
    heightMm,
    shape: id.startsWith("rectangle")
      ? "rectangle"
      : id.startsWith("round")
        ? "round"
        : id.startsWith("bed")
          ? "bed"
          : id.startsWith("bolster")
            ? "bolster"
            : "square",
    approval: /^(round|bed)/.test(id) ? "proposed" : "confirmed",
  };
}
export function pipingPreviewSegments(
  plan,
  calibration,
  lengthMm,
  offsetMm = 0,
) {
  if (
    !plan?.confirmed ||
    !calibration ||
    !(plan.cordDiameterMm > 0) ||
    !(plan.stripWidthMm >= Math.PI * plan.cordDiameterMm) ||
    !Array.isArray(plan.segments)
  )
    return null;
  if (
    plan.segments.some(
      (s) =>
        s.axis !== "x" ||
        !(s.lengthMm > 0) ||
        !s.sourceOriginMm ||
        !Number.isFinite(s.sourceOriginMm.x) ||
        !Number.isFinite(s.sourceOriginMm.y) ||
        s.sourceOriginMm.x < 0 ||
        s.sourceOriginMm.y < 0 ||
        s.sourceOriginMm.x + s.lengthMm > calibration.physicalWidthMm ||
        s.sourceOriginMm.y + plan.stripWidthMm > calibration.physicalHeightMm,
    )
  )
    return null;
  if (
    plan.segments.reduce((n, s) => n + s.lengthMm, 0) + 0.01 <
    lengthMm + offsetMm
  )
    return null;
  const result = [];
  let cumulative = 0;
  for (const segment of plan.segments) {
    const start = Math.max(offsetMm, cumulative),
      end = Math.min(offsetMm + lengthMm, cumulative + segment.lengthMm);
    if (end > start)
      result.push({
        startMm: start - offsetMm,
        lengthMm: end - start,
        xMm: segment.sourceOriginMm.x + start - cumulative,
        yMm:
          segment.sourceOriginMm.y +
          (plan.stripWidthMm - Math.PI * plan.cordDiameterMm) / 2,
        visibleBandMm: Math.PI * plan.cordDiameterMm,
      });
    cumulative += segment.lengthMm;
  }
  return result;
}
