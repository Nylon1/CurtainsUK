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
}) {
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
