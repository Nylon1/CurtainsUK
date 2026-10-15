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

/** Sewn square, in metres. The approved seam silhouette and centre depth are retained. */
function squareBodyPoint({ u, v, widthMm, heightMm, back = false }) {
  const a = 2 * u - 1,
    b = 2 * v - 1;
  // Confine edge draw-in to the outer cloth: the central panel retains its X/Y scale.
  // Corners retain the full finished flat dimensions instead of being rounded off.
  let x = a * (1 - 0.065 * smoothStep(0.62, 1, Math.abs(a)) * (1 - b * b)),
    y = b * (1 - 0.075 * smoothStep(0.62, 1, Math.abs(b)) * (1 - a * a));
  // A 4 mm sewn corner cap softens the tip. The adjoining seam still reaches
  // the full finished X/Y spans; the established inward edge bow is unchanged.
  const insetX = ((1 - Math.abs(a)) * widthMm) / 2,
    insetY = ((1 - Math.abs(b)) * heightMm) / 2,
    radius = 4;
  if (insetX < radius * 2 && insetY < radius * 2) {
    const localX = Math.max(0, radius - insetX),
      localY = Math.max(0, radius - insetY),
      length = Math.hypot(localX, localY),
      scale = length > radius ? radius / length : 1,
      roundedX = widthMm / 2 - insetX - localX * (1 - scale),
      roundedY = heightMm / 2 - insetY - localY * (1 - scale),
      blend = 1 - smoothStep(radius, radius * 2, Math.max(insetX, insetY));
    x += ((Math.sign(a) * roundedX * 2) / widthMm - x) * blend;
    y += ((Math.sign(b) * roundedY * 2) / heightMm - y) * blend;
  }
  // Full side shoulders roll into the thin sewn edge; the centre depth is unchanged.
  const envelope =
    Math.pow(Math.max(0, 1 - a * a), 0.28) *
    Math.pow(Math.max(0, 1 - b * b), 0.52);
  const halfDepth = (Math.min(widthMm, heightMm) / 1000) * 0.155;
  // A little more fullness below centre; every tension fold fades into the sewn edge.
  const p = 1 - Math.abs(a),
    q = 1 - Math.abs(b);
  const tension =
    Math.exp(-Math.pow((p - 0.62 * q) / 0.035, 2)) * Math.exp(-(p + q) / 0.32) +
    0.65 *
      Math.exp(-Math.pow((q - 0.7 * p) / 0.045, 2)) *
      Math.exp(-(p + q) / 0.26);
  const folds =
    halfDepth *
    0.22 *
    tension *
    Math.pow(envelope, 0.55) *
    (0.9 + 0.1 * a + 0.08 * b);
  const bodyDepth = Math.max(0, halfDepth * envelope * (1 - 0.12 * b) - folds);
  const z = bodyDepth;
  return {
    x: ((back ? -1 : 1) * x * widthMm) / 2000,
    y: (y * heightMm) / 2000,
    z: (back ? -1 : 1) * z,
    clothU: u,
    clothV: v,
  };
}

// Actual curved-cloth distances are measured from the existing motif centre.
// They may require more original photographed cloth than the nominal flat face.
function squareSurfacePoint({ u, v, widthMm, heightMm, back = false }) {
  const point = squareBodyPoint({ u, v, widthMm, heightMm, back });
  const edgeDistanceMm = Math.min(
    Math.min(u, 1 - u) * widthMm,
    Math.min(v, 1 - v) * heightMm,
  );
  const seam =
    Math.min(Math.abs(point.z) * 0.2, 0.0008) *
    Math.exp(-Math.pow((edgeDistanceMm - 2) / 0.65, 2)) *
    smoothStep(0, 0.8, edgeDistanceMm);
  point.z -= (back ? -1 : 1) * seam;
  return point;
}
const arcCache = new Map();
function surfaceArc(axis, fixed, at, widthMm, heightMm) {
  const key = `${axis}:${fixed}:${widthMm}:${heightMm}`;
  let table = arcCache.get(key);
  if (!table) {
    const nearEdges = Array.from({ length: 10 }, (_, i) =>
      Math.pow(10, -i - 3),
    );
    const seamSamples = Array.from(
      { length: 160 },
      (_, i) => ((i + 1) * 0.05) / (axis === "u" ? widthMm : heightMm),
    );
    const samples = [
      ...new Set([
        ...Array.from({ length: 1025 }, (_, i) => i / 1024),
        ...nearEdges,
        ...nearEdges.map((t) => 1 - t),
        ...seamSamples,
        ...seamSamples.map((t) => 1 - t),
      ]),
    ].sort((a, b) => a - b);
    let previous,
      length = 0;
    const cumulative = new Float64Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
      const t = samples[i],
        point = squareSurfacePoint({
          u: axis === "u" ? t : fixed,
          v: axis === "v" ? t : fixed,
          widthMm,
          heightMm,
        });
      if (previous)
        length +=
          Math.hypot(
            point.x - previous.x,
            point.y - previous.y,
            point.z - previous.z,
          ) * 1000;
      cumulative[i] = length;
      previous = point;
    }
    table = {
      samples: Float64Array.from(samples),
      cumulative,
      centre: cumulative[samples.indexOf(0.5)],
    };
    // Typed arrays and a bounded cache keep full-catalogue mobile exploration finite.
    if (arcCache.size >= 384) arcCache.delete(arcCache.keys().next().value);
    arcCache.set(key, table);
  }
  const { samples, cumulative, centre } = table;
  let low = 0,
    high = samples.length - 1;
  while (high - low > 1) {
    const mid = (low + high) >> 1;
    if (samples[mid] < at) low = mid;
    else high = mid;
  }
  const t = (at - samples[low]) / (samples[high] - samples[low]);
  return cumulative[low] + (cumulative[high] - cumulative[low]) * t - centre;
}
export function squarePanelPoint({ u, v, widthMm, heightMm, back = false }) {
  const point = squareSurfacePoint({ u, v, widthMm, heightMm, back });
  point.clothU = 0.5 + surfaceArc("u", v, u, widthMm, heightMm) / widthMm;
  point.clothV = 0.5 + surfaceArc("v", u, v, widthMm, heightMm) / heightMm;
  return point;
}

/** Experimental inspection geometry only. The ordered square construction stays unchanged. */
function experimentalSquareSurfacePoint(input) {
  const point = squareSurfacePoint(input),
    { u, v, widthMm, heightMm, back = false } = input;
  const a = 2 * u - 1,
    b = 2 * v - 1,
    across = Math.max(0, 1 - a * a),
    down = Math.max(0, 1 - b * b);
  const baseline = Math.pow(across, 0.28) * Math.pow(down, 0.52);
  const broader =
    Math.pow(Math.max(0, 1 - a ** 4), 0.4) *
    Math.pow(Math.max(0, 1 - b ** 4), 0.7);
  const cornerFade = smoothStep(4, 12, Math.min(u, 1 - u) * widthMm);
  const strength = Math.min(
    1,
    0.2 + Math.max(0, Math.min(widthMm, heightMm) - 380) / 87.5,
  );
  point.y -=
    (((heightMm / 2000) * 0.045 * across * (1 - b)) / 2) *
    cornerFade *
    strength;
  point.z +=
    (((back ? -1 : 1) * Math.min(widthMm, heightMm)) / 1000) *
    0.155 *
    (broader - baseline) *
    (1 - 0.12 * b) *
    strength;
  return point;
}
const previewArcCache = new Map();
function previewSurfaceArc(axis, fixed, at, widthMm, heightMm) {
  const key = `${axis}:${fixed}:${widthMm}:${heightMm}`;
  let table = previewArcCache.get(key);
  if (!table) {
    const nearEdges = Array.from({ length: 10 }, (_, i) =>
      Math.pow(10, -i - 3),
    );
    const seamSamples = Array.from(
      { length: 160 },
      (_, i) => ((i + 1) * 0.05) / (axis === "u" ? widthMm : heightMm),
    );
    const samples = [
      ...new Set([
        ...Array.from({ length: 1025 }, (_, i) => i / 1024),
        ...nearEdges,
        ...nearEdges.map((t) => 1 - t),
        ...seamSamples,
        ...seamSamples.map((t) => 1 - t),
      ]),
    ].sort((a, b) => a - b);
    let previous,
      length = 0;
    const cumulative = new Float64Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
      const t = samples[i],
        point = experimentalSquareSurfacePoint({
          u: axis === "u" ? t : fixed,
          v: axis === "v" ? t : fixed,
          widthMm,
          heightMm,
        });
      if (previous)
        length +=
          Math.hypot(
            point.x - previous.x,
            point.y - previous.y,
            point.z - previous.z,
          ) * 1000;
      cumulative[i] = length;
      previous = point;
    }
    table = {
      samples: Float64Array.from(samples),
      cumulative,
      centre: cumulative[samples.indexOf(0.5)],
    };
    // Typed arrays and a bounded cache keep full-catalogue mobile exploration finite.
    if (previewArcCache.size >= 384)
      previewArcCache.delete(previewArcCache.keys().next().value);
    previewArcCache.set(key, table);
  }
  const { samples, cumulative, centre } = table;
  let low = 0,
    high = samples.length - 1;
  while (high - low > 1) {
    const mid = (low + high) >> 1;
    if (samples[mid] < at) low = mid;
    else high = mid;
  }
  const t = (at - samples[low]) / (samples[high] - samples[low]);
  return cumulative[low] + (cumulative[high] - cumulative[low]) * t - centre;
}
export function squarePreviewPoint(input, variant = "baseline") {
  if (variant !== "soft-fullness") return squarePanelPoint(input);
  const point = experimentalSquareSurfacePoint(input),
    { u, v, widthMm, heightMm } = input;
  point.clothU =
    0.5 + previewSurfaceArc("u", v, u, widthMm, heightMm) / widthMm;
  point.clothV =
    0.5 + previewSurfaceArc("v", u, v, widthMm, heightMm) / heightMm;
  return point;
}
const previewFootprints = new Map();
export function squarePreviewFootprint(
  widthMm,
  heightMm,
  variant = "baseline",
) {
  if (variant !== "soft-fullness")
    return squareDrapeFootprint(widthMm, heightMm);
  const key = `${widthMm}:${heightMm}`;
  if (previewFootprints.has(key)) return previewFootprints.get(key);
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const u of squarePanelAxis(widthMm))
    for (const v of squarePanelAxis(heightMm)) {
      const p = squarePreviewPoint({ u, v, widthMm, heightMm }, variant),
        x = p.clothU * widthMm,
        y = (1 - p.clothV) * heightMm;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  const result = Object.freeze({
    version: "square-experimental-fullness-v1",
    minX,
    minY,
    maxX,
    maxY,
    visibleWidthMm: maxX - minX,
    visibleHeightMm: maxY - minY,
  });
  previewFootprints.set(key, result);
  return result;
}
export function squarePreviewFitsSource(
  size,
  calibration,
  placement,
  variant = "baseline",
) {
  if (variant !== "soft-fullness")
    return squareDrapeFitsSource(size, calibration, placement);
  if (!calibration) return false;
  const f = squarePreviewFootprint(size.widthMm, size.heightMm, variant);
  return (
    placement.x + f.minX >= 0 &&
    placement.y + f.minY >= 0 &&
    placement.x + f.maxX <= calibration.physicalWidthMm &&
    placement.y + f.maxY <= calibration.physicalHeightMm
  );
}
const footprintCache = new Map();
/** Bounds in mm relative to nominal placement (top-left), with the motif centre unchanged. */
export function squareDrapeFootprint(widthMm, heightMm) {
  const key = `${widthMm}:${heightMm}`;
  if (footprintCache.has(key)) return footprintCache.get(key);
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const u of squarePanelAxis(widthMm))
    for (const v of squarePanelAxis(heightMm)) {
      const point = squarePanelPoint({ u, v, widthMm, heightMm });
      const x = point.clothU * widthMm,
        y = (1 - point.clothV) * heightMm;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  const result = Object.freeze({
    version: "square-drape-arc-v1",
    minX,
    minY,
    maxX,
    maxY,
    visibleWidthMm: maxX - minX,
    visibleHeightMm: maxY - minY,
  });
  footprintCache.set(key, result);
  return result;
}
export function squareDrapeFitsSource(size, calibration, placement) {
  if (!calibration) return false;
  const bounds = squareDrapeFootprint(size.widthMm, size.heightMm);
  return (
    placement.x + bounds.minX >= 0 &&
    placement.y + bounds.minY >= 0 &&
    placement.x + bounds.maxX <= calibration.physicalWidthMm &&
    placement.y + bounds.maxY <= calibration.physicalHeightMm
  );
}

/** Resolve the 2 mm sewn fold with physical inset samples, without changing cloth scale. */
export function squarePanelAxis(sizeMm) {
  const values = Array.from({ length: 65 }, (_, i) => i / 64);
  for (const insetMm of [0.001, 0.01, 0.1, 0.25, 0.5, 1, 2, 3, 4])
    values.push(insetMm / sizeMm, 1 - insetMm / sizeMm);
  return [...new Set(values)].sort((a, b) => a - b);
}

/** Inspection-only camera position. No manufacturing or arrangement state is altered. */
export function squareInspectionCamera(widthMm, heightMm, angle = "straight") {
  const factor = Math.max(widthMm, heightMm) / 450;
  if (angle === "side") return { x: 1.22 * factor, y: heightMm / 2000, z: 0 };
  return angle === "three-quarter"
    ? { x: 0.72 * factor, y: heightMm / 2000 + 0.17 * factor, z: 1.02 * factor }
    : { x: 0, y: heightMm / 2000 + 0.06 * factor, z: 1.22 * factor };
}

export const SQUARE_SOFA_LEAN = -0.22;
export const SQUARE_SOFA_YAW = (-10 * Math.PI) / 180;
/** Three.js XYZ Euler ordering: local Z rotation followed by backward X lean. */
export function squareSofaPoint(point, rotationDegrees = 0) {
  const r = (rotationDegrees * Math.PI) / 180,
    rotatedX = point.x * Math.cos(r) - point.y * Math.sin(r),
    y = point.x * Math.sin(r) + point.y * Math.cos(r),
    x =
      rotatedX * Math.cos(SQUARE_SOFA_YAW) +
      point.z * Math.sin(SQUARE_SOFA_YAW),
    z =
      -rotatedX * Math.sin(SQUARE_SOFA_YAW) +
      point.z * Math.cos(SQUARE_SOFA_YAW);
  return {
    x,
    y: y * Math.cos(SQUARE_SOFA_LEAN) - z * Math.sin(SQUARE_SOFA_LEAN),
    z: y * Math.sin(SQUARE_SOFA_LEAN) + z * Math.cos(SQUARE_SOFA_LEAN),
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
  for (const v of squarePanelAxis(heightMm))
    for (const u of squarePanelAxis(widthMm))
      for (const back of [false, true]) {
        const p = squareSofaPoint(
          squarePanelPoint({ u, v, widthMm, heightMm, back }),
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
  return (
    CUSHION_VISUAL_SIZES.find((size) => size.id === id) ||
    CUSHION_VISUAL_SIZES[1]
  );
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

export function squareInspectionTransition({
  shape,
  mode,
  requested,
  reducedMotion,
  from,
  to,
}) {
  if (
    shape !== "square" ||
    mode !== "configurator" ||
    !requested ||
    reducedMotion ||
    from === to ||
    !Number.isFinite(from)
  )
    return null;
  return { from, to, durationMs: 1800 };
}
export function inspectionRotation(from, to, progress, side = (from + to) / 2) {
  side = Math.max(Math.min(from, to), Math.min(Math.max(from, to), side));
  const t = Math.max(0, Math.min(1, progress));
  // Pause briefly at the physical side profile so the sewn depth is inspectable.
  if (t >= 0.4 && t <= 0.6) return side;
  const phase = t < 0.4 ? t / 0.4 : (t - 0.6) / 0.4;
  const eased = phase * phase * (3 - 2 * phase);
  return t < 0.4 ? from + (side - from) * eased : side + (to - side) * eased;
}

/** Proposed non-square sewn profiles. Standard squares retain their separate authority. */
export const SHAPED_CONSTRUCTION_VERSION = "shaped-filled-v1";
export const CUSHION_VISUAL_SIZES = Object.freeze(
  [
    ...[38, 45, 50, 55, 60].map((cm) => ({
      id: `square-${cm}`,
      label: `${cm} × ${cm} cm`,
      shape: "square",
      widthMm: cm * 10,
      heightMm: cm * 10,
      approval: "confirmed",
    })),
    {
      id: "rectangle-30-45",
      label: "30 × 45 cm",
      shape: "rectangle",
      widthMm: 450,
      heightMm: 300,
      approval: "confirmed",
    },
    {
      id: "rectangle-38-50",
      label: "38 × 50 cm",
      shape: "rectangle",
      widthMm: 500,
      heightMm: 380,
      approval: "confirmed",
    },
    ...[40, 50].map((cm) => ({
      id: `round-${cm}`,
      label: `Round ${cm} cm · proposed`,
      shape: "round",
      widthMm: cm * 10,
      heightMm: cm * 10,
      approval: "proposed",
    })),
    ...[65, 70].map((cm) => ({
      id: `bed-square-${cm}`,
      label: `Decorative bed square ${cm} cm · proposed`,
      shape: "bed",
      widthMm: cm * 10,
      heightMm: cm * 10,
      approval: "proposed",
    })),
    {
      id: "bolster-23-56",
      label: "Bolster Ø23 × 56 cm",
      shape: "bolster",
      widthMm: 560,
      heightMm: 230,
      approval: "confirmed",
    },
  ].map(Object.freeze),
);

const shapedArcCache = new Map(),
  shapedFootprintCache = new Map();
function filledPanelSurface({ shape, u, v, widthMm, heightMm, back = false }) {
  if (!["rectangle", "bed"].includes(shape))
    throw new Error("Use the shape-specific surface contract.");
  const a = 2 * u - 1,
    b = 2 * v - 1;
  const radius = 4;
  const ix = ((1 - Math.abs(a)) * widthMm) / 2,
    iy = ((1 - Math.abs(b)) * heightMm) / 2;
  let x =
    ((a * widthMm) / 2) *
    (1 - 0.03 * smoothStep(0.72, 1, Math.abs(a)) * (1 - b * b));
  let y =
    ((b * heightMm) / 2) *
    (1 - 0.035 * smoothStep(0.72, 1, Math.abs(b)) * (1 - a * a));
  if (ix < radius * 2 && iy < radius * 2) {
    const cx = Math.max(0, radius - ix),
      cy = Math.max(0, radius - iy),
      length = Math.hypot(cx, cy);
    const k = length > radius ? radius / length : 1;
    const blend = 1 - smoothStep(radius, radius * 2, Math.max(ix, iy));
    x += (Math.sign(a) * (widthMm / 2 - ix - cx * (1 - k)) - x) * blend;
    y += (Math.sign(b) * (heightMm / 2 - iy - cy * (1 - k)) - y) * blend;
  }
  const halfDepth =
    Math.min(widthMm, heightMm) * (shape === "bed" ? 0.125 : 0.145);
  const envelope =
    Math.pow(Math.max(0, 1 - a * a), 0.48) *
    Math.pow(Math.max(0, 1 - b * b), 0.55);
  const edgeMm = Math.min(ix, iy);
  const cornerTension =
    Math.exp(-Math.pow((ix - 0.8 * iy) / 5, 2)) * Math.exp(-(ix + iy) / 34);
  const crease =
    Math.min(1.2, halfDepth * 0.025) * cornerTension * Math.sqrt(envelope);
  const fold =
    Math.min(0.55, halfDepth * envelope * 0.15) *
    Math.exp(-Math.pow((edgeMm - 1.8) / 0.65, 2));
  return {
    x: (back ? -x : x) / 1000,
    y: y / 1000,
    z:
      ((back ? -1 : 1) * Math.max(0, halfDepth * envelope - crease - fold)) /
      1000,
  };
}
/** Independent sampling resolves the new profiles' narrow sewn fold. */
export function shapedPanelAxis(sizeMm) {
  return [
    ...new Set([
      ...Array.from({ length: 65 }, (_, i) => i / 64),
      ...[0.25, 0.5, 1, 1.5, 1.8, 2, 2.5, 4, 5, 8].flatMap((mm) => [
        mm / sizeMm,
        1 - mm / sizeMm,
      ]),
    ]),
  ].sort((a, b) => a - b);
}
function makeArcTable(pointAt, samples) {
  let previous,
    total = 0;
  const lengths = samples.map((t) => {
    const point = pointAt(t);
    if (previous)
      total +=
        Math.hypot(
          point.x - previous.x,
          point.y - previous.y,
          point.z - previous.z,
        ) * 1000;
    previous = point;
    return total;
  });
  return { samples, lengths, total };
}
function arcAt(table, at) {
  const { samples, lengths } = table;
  if (at <= 0) return 0;
  if (at >= 1) return table.total;
  let lo = 0,
    hi = samples.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (samples[mid] <= at) lo = mid;
    else hi = mid;
  }
  return (
    lengths[lo] +
    ((lengths[hi] - lengths[lo]) * (at - samples[lo])) /
      (samples[hi] - samples[lo])
  );
}
function shapedArc(input, axis, fixed, at) {
  if (at === 0.5) return 0;
  const { shape, widthMm, heightMm } = input,
    key = `${shape}:${widthMm}:${heightMm}:${axis}:${fixed}`;
  let table = shapedArcCache.get(key);
  if (!table) {
    const extent = axis === "u" ? widthMm : heightMm;
    const edge = Array.from({ length: 10 }, (_, i) => 10 ** (-i - 3));
    const fold = Array.from(
      { length: 160 },
      (_, i) => ((i + 1) * 0.05) / extent,
    );
    const samples = [
      ...new Set([
        ...Array.from({ length: 1025 }, (_, i) => i / 1024),
        ...edge,
        ...edge.map((t) => 1 - t),
        ...fold,
        ...fold.map((t) => 1 - t),
      ]),
    ].sort((a, b) => a - b);
    table = makeArcTable(
      (t) =>
        filledPanelSurface({
          shape,
          widthMm,
          heightMm,
          u: axis === "u" ? t : fixed,
          v: axis === "v" ? t : fixed,
        }),
      samples,
    );
    if (shapedArcCache.size >= 512)
      shapedArcCache.delete(shapedArcCache.keys().next().value);
    shapedArcCache.set(key, table);
  }
  return arcAt(table, at) - arcAt(table, 0.5);
}
export function shapedPanelPoint(input) {
  const p = filledPanelSurface(input);
  return {
    ...p,
    clothU: 0.5 + shapedArc(input, "u", input.v, input.u) / input.widthMm,
    clothV: 0.5 + shapedArc(input, "v", input.u, input.v) / input.heightMm,
  };
}

// Circular panels use a meridian measured along an ellipse. Cloth easing around
// the curved circumference remains a proposed workroom construction, not a flat disk projection.
const radialTables = new Map();
function domeArc(radiusMm, riseMm, fraction) {
  const key = `${radiusMm}:${riseMm}`;
  let table = radialTables.get(key);
  if (!table) {
    table = makeArcTable(
      (t) => ({
        x: (radiusMm * Math.sin((t * Math.PI) / 2)) / 1000,
        y: 0,
        z: (riseMm * Math.cos((t * Math.PI) / 2)) / 1000,
      }),
      Array.from({ length: 2049 }, (_, i) => i / 2048),
    );
    if (radialTables.size >= 32)
      radialTables.delete(radialTables.keys().next().value);
    radialTables.set(key, table);
  }
  return arcAt(
    table,
    (Math.asin(Math.max(0, Math.min(1, fraction))) * 2) / Math.PI,
  );
}
function domePoint({
  radiusFraction,
  angle,
  diameterMm,
  riseMm,
  back = false,
}) {
  const r = Math.max(0, Math.min(1, radiusFraction)),
    radius = diameterMm / 2;
  const rho = domeArc(radius, riseMm, r),
    x = radius * r * Math.cos(angle),
    y = radius * r * Math.sin(angle);
  return {
    x: (back ? -x : x) / 1000,
    y: y / 1000,
    z: ((back ? -1 : 1) * riseMm * Math.sqrt(Math.max(0, 1 - r * r))) / 1000,
    clothU: 0.5 + (rho * Math.cos(angle)) / diameterMm,
    clothV: 0.5 + (rho * Math.sin(angle)) / diameterMm,
  };
}
export function roundPanelPoint(input) {
  return domePoint({ ...input, riseMm: input.diameterMm * 0.1 });
}
function bolsterCapRise(diameterMm) {
  return diameterMm * 0.045;
}
export function bolsterBodyPoint({ along, around, lengthMm, diameterMm }) {
  const bodyLength = lengthMm - 2 * bolsterCapRise(diameterMm),
    angle = around * Math.PI * 2 - Math.PI / 2;
  return {
    x: ((along - 0.5) * bodyLength) / 1000,
    y: (diameterMm * Math.sin(angle)) / 2000,
    z: (diameterMm * Math.cos(angle)) / 2000,
    clothU: 0.5 + ((along - 0.5) * bodyLength) / lengthMm,
    clothV: 1 - around,
  };
}
export function bolsterEndPoint({
  radiusFraction,
  angle,
  lengthMm,
  diameterMm,
  back = false,
}) {
  const rise = bolsterCapRise(diameterMm),
    p = domePoint({ radiusFraction, angle, diameterMm, riseMm: rise });
  const side = back ? -1 : 1;
  return {
    x: side * ((lengthMm / 2 - rise) / 1000 + p.z),
    y: p.y,
    z: -side * p.x,
    clothU: p.clothU,
    clothV: p.clothV,
  };
}
function sourceFootprint(
  widthMm,
  heightMm,
  actualWidth,
  actualHeight,
  cutShape,
) {
  return Object.freeze({
    minX: (widthMm - actualWidth) / 2,
    minY: (heightMm - actualHeight) / 2,
    maxX: (widthMm + actualWidth) / 2,
    maxY: (heightMm + actualHeight) / 2,
    visibleWidthMm: actualWidth,
    visibleHeightMm: actualHeight,
    cutShape,
  });
}
/** Source bounds relative to the nominal top-left motif anchor; excludes seam allowances. */
export function shapeDrapeFootprints(size) {
  const { shape, widthMm, heightMm } = size;
  if (!["rectangle", "bed", "round", "bolster"].includes(shape))
    throw new Error(
      "Standard squares use squareDrapeFootprint, never the shaped profile.",
    );
  const key = `${shape}:${widthMm}:${heightMm}`;
  if (shapedFootprintCache.has(key)) return shapedFootprintCache.get(key);
  let body, end;
  if (shape === "round") {
    const diameter = 2 * domeArc(widthMm / 2, widthMm * 0.1, 1);
    body = sourceFootprint(widthMm, heightMm, diameter, diameter, "circle");
  } else if (shape === "bolster") {
    body = sourceFootprint(
      widthMm,
      Math.PI * heightMm,
      widthMm - 2 * bolsterCapRise(heightMm),
      Math.PI * heightMm,
      "rectangle",
    );
    const diameter = 2 * domeArc(heightMm / 2, bolsterCapRise(heightMm), 1);
    end = sourceFootprint(heightMm, heightMm, diameter, diameter, "circle");
  } else {
    let width = 0,
      height = 0;
    // Include extrema across every rendered row/column and a regular 256-step audit.
    const xs = [
      ...new Set([
        ...shapedPanelAxis(widthMm),
        ...Array.from({ length: 257 }, (_, i) => i / 256),
      ]),
    ];
    const ys = [
      ...new Set([
        ...shapedPanelAxis(heightMm),
        ...Array.from({ length: 257 }, (_, i) => i / 256),
      ]),
    ];
    for (const v of ys)
      width = Math.max(
        width,
        shapedArc(size, "u", v, 1) - shapedArc(size, "u", v, 0),
      );
    for (const u of xs)
      height = Math.max(
        height,
        shapedArc(size, "v", u, 1) - shapedArc(size, "v", u, 0),
      );
    body = sourceFootprint(widthMm, heightMm, width, height, "rectangle");
  }
  const result = Object.freeze({
    version: SHAPED_CONSTRUCTION_VERSION,
    body,
    ...(end ? { end } : {}),
  });
  shapedFootprintCache.set(key, result);
  return result;
}
export function shapeDrapeFitsSource(
  size,
  calibration,
  placement,
  endPlacement = placement,
) {
  if (!calibration || !placement) return false;
  const { physicalWidthMm: w, physicalHeightMm: h } = calibration;
  if (![w, h].every((value) => Number.isFinite(value) && value > 0))
    return false;
  const fits = (f, p) =>
    !!p &&
    [p.x, p.y].every(Number.isFinite) &&
    p.x + f.minX >= 0 &&
    p.y + f.minY >= 0 &&
    p.x + f.maxX <= w &&
    p.y + f.maxY <= h;
  const footprints = shapeDrapeFootprints(size);
  return (
    fits(footprints.body, placement) &&
    (!footprints.end || fits(footprints.end, endPlacement))
  );
}
/** Conservative full depth, without constructing surface-arc tables. */
export function shapeFilledDepthMm(size) {
  if (size.shape === "bolster") return size.heightMm;
  if (size.shape === "round") return size.widthMm * 0.2;
  if (size.shape === "rectangle")
    return Math.min(size.widthMm, size.heightMm) * 0.29;
  if (size.shape === "bed") return Math.min(size.widthMm, size.heightMm) * 0.25;
  throw new Error("Standard squares retain their existing depth authority.");
}


// Visual fill only: manufacturing continues to use roundPanelPoint and its v1 footprint.
const roundPreviewArcs = new Map();
function roundFillSurface({radiusFraction, angle, diameterMm, back=false}) {
  const r=Math.max(0,Math.min(1,radiusFraction)), a=angle;
  const edgeDistance=(1-r)*diameterMm/2;
  // Small, non-periodic tension marks rather than a regular gathered/tufted edge.
  let crease=0;
  for(const [at,strength,width] of [[.24,1,.075],[1.05,.7,.06],[2.18,.8,.08],[3.35,.65,.06],[4.1,1,.085],[5.28,.8,.07]]) {
    const delta=Math.atan2(Math.sin(a-at),Math.cos(a-at));
    crease+=strength*Math.exp(-((delta/width)**2))*Math.exp(-(((edgeDistance-18)/15)**2));
  }
  const rimDraw=diameterMm*.003*Math.sin(2*a)**2*(.6+.4*Math.sin(3*a)**2);
  const radial=r*(diameterMm/2-rimDraw*r**6);
  const envelope=Math.max(0,1-r**4)**.55;
  const seamFold=.55*Math.exp(-(((edgeDistance-1.8)/.65)**2))*Math.min(1,edgeDistance);
  const z=Math.max(0,diameterMm*.1*envelope*(1-.035*r*Math.sin(a))-Math.min(4,diameterMm*.008)*crease*envelope**.3-seamFold);
  return {x:(back?-1:1)*radial*Math.cos(a)/1000,y:radial*Math.sin(a)/1000,z:(back?-1:1)*z/1000};
}
function roundFillArc(diameterMm,angle,r) {
  const a=((angle%(2*Math.PI))+2*Math.PI)%(2*Math.PI),key=`${diameterMm}:${a.toFixed(9)}`;
  let table=roundPreviewArcs.get(key);
  if(!table) {
    const samples=[...new Set([...Array.from({length:1025},(_,i)=>i/1024),...Array.from({length:160},(_,i)=>1-(i+1)*.05/(diameterMm/2)),...Array.from({length:8},(_,i)=>1-10**(-i-3))])].sort((a,b)=>a-b);
    table=makeArcTable((radiusFraction)=>roundFillSurface({radiusFraction,angle:a,diameterMm}),samples);
    if(roundPreviewArcs.size>=1024)roundPreviewArcs.delete(roundPreviewArcs.keys().next().value);
    roundPreviewArcs.set(key,table);
  }
  return arcAt(table,r);
}
export function roundPreviewPoint(input) {
  const point=roundFillSurface(input),rho=roundFillArc(input.diameterMm,input.angle,input.radiusFraction);
  return {...point,clothU:.5+rho*Math.cos(input.angle)/input.diameterMm,clothV:.5+rho*Math.sin(input.angle)/input.diameterMm};
}
const roundPreviewFootprints=new Map();
export function roundPreviewFootprint(diameterMm) {
  if(roundPreviewFootprints.has(diameterMm))return roundPreviewFootprints.get(diameterMm);
  let radius=0;
  for(let i=0;i<384;i++)radius=Math.max(radius,roundFillArc(diameterMm,i/384*2*Math.PI,1));
  // Conservative finite-photo extent, including angular interpolation and seam folds.
  const result=sourceFootprint(diameterMm,diameterMm,2*radius+1,2*radius+1,'circle');
  roundPreviewFootprints.set(diameterMm,result);return result;
}
export function roundPreviewFitsSource(size,calibration,placement) {
  if(!calibration || !placement)return false;
  const f=roundPreviewFootprint(size.widthMm),{x,y}=placement;
  return [x,y,calibration.physicalWidthMm,calibration.physicalHeightMm].every(Number.isFinite) && x+f.minX>=0 && y+f.minY>=0 && x+f.maxX<=calibration.physicalWidthMm && y+f.maxY<=calibration.physicalHeightMm;
}
