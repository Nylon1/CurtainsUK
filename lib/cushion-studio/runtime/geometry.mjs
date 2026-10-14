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
