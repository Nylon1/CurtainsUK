/** All lengths are centimetres. No renderer, catalogue, environment or service dependencies. */
export const SPEC = Object.freeze({ finishedWidth: 230, flatWidth: 460, drop: 250, fullness: 2, panels: 2, flatPanelWidth: 230, finishedPanelWidth: 115, wavesPerPanel: 5, columns: 224, rows: 48 });
const positive = n => typeof n === 'number' && Number.isFinite(n) && n > 0;

export function texturePlan(fabric) {
  if (fabric.mode === 'plain') return { state: 'plain', horizontalPair: null, horizontalPanel: null, vertical: null, scale: [1 / 30, 1 / 30], note: 'Decorative continuous surface, 30 cm tile; no motif-scale claim.' };
  if (fabric.mode !== 'patterned') return { state: 'fallback', reason: 'UNKNOWN_MODE' };
  if (fabric.hRepeat == null || fabric.vRepeat == null) return { state: 'fallback', reason: 'MISSING_REPEAT_METADATA' };
  if (!positive(fabric.hRepeat) || !positive(fabric.vRepeat)) return { state: 'fallback', reason: 'INVALID_REPEAT_METADATA' };
  const counts = { horizontalPair: SPEC.flatWidth / fabric.hRepeat, horizontalPanel: SPEC.flatPanelWidth / fabric.hRepeat, vertical: SPEC.drop / fabric.vRepeat };
  const c = fabric.calibration;
  if (!c || c.kind === 'unknown') return { state: 'fallback', reason: 'IMAGE_CALIBRATION_UNKNOWN', ...counts };
  let h, v;
  if (c.kind === 'full-width') { h = fabric.fabricWidth / fabric.hRepeat; v = c.repeatsV; }
  else if (c.kind === 'single-repeat') { h = 1; v = 1; }
  else if (c.kind === 'multiple-repeats') { h = c.repeatsH; v = c.repeatsV; }
  if (!positive(h) || !positive(v)) return { state: 'fallback', reason: 'INVALID_IMAGE_CALIBRATION', ...counts };
  return { state: 'patterned', ...counts, sourceRepeats: [h, v], sourceCm: [h * fabric.hRepeat, v * fabric.vRepeat], scale: [1 / (h * fabric.hRepeat), 1 / (v * fabric.vRepeat)] };
}

/** Coordinates are material distances, established on flat cloth, not projected widths. */
export function textureCoordinate(flatU, flatV, plan) {
  if (!plan.scale) return null;
  return [flatU * plan.scale[0], flatV * plan.scale[1]];
}

function crossSection(angle, v, columns) {
  const ds = SPEC.flatPanelWidth / columns;
  const points = [[0, 0]];
  let x = 0, z = 0;
  // Integrate tangent angles along material distance: every discrete edge is exactly ds.
  // An integer wave count and paired half-panel samples give opposite tangents.
  // Bisection sets their total horizontal projection to 115 cm without stretching cloth.
  for (let i = 0; i < columns; i++) {
    const phase = 2 * Math.PI * SPEC.wavesPerPanel * (i + 0.5) / columns + 0.16 * Math.sin(Math.PI * v / 2);
    // Broader crowns and gently returning flanks; slight relaxation toward the hem.
    // Third harmonic is odd, retaining opposite tangents and zero net depth travel.
    const roundness = 0.055 + 0.04 * v * v * (3 - 2 * v);
    const theta = angle * (Math.sin(phase) - roundness * Math.sin(3 * phase));
    x += ds * Math.cos(theta); z += ds * Math.sin(theta);
    points.push([x, z]);
  }
  const centre = (Math.min(...points.map(p=>p[1])) + Math.max(...points.map(p=>p[1]))) / 2;
  for (const p of points) p[1] += -centre + 0.45 * Math.sin(Math.PI * v);
  return { points, projectedWidth: x, length: ds * columns };
}
/** Solve the discrete rendered polyline itself to 230 cm, not only its analytic limit. */
export function buildWaveMesh() {
  const { columns, rows, flatPanelWidth, drop } = SPEC;
  const position = [], flatPosition = [], uv = [], indices = [], rowLengths = [], amplitudes = [];
  const rowsData = [];
  for (let j = 0; j <= rows; j++) {
    let lo = 0, hi = 2.0, section;
    for (let iteration = 0; iteration < 34; iteration++) {
      const a = (lo + hi) / 2;
      section = crossSection(a, j / rows, columns);
      if (section.projectedWidth > SPEC.finishedPanelWidth) lo = a; else hi = a;
    }
    section = crossSection((lo + hi) / 2, j / rows, columns);
    rowsData.push(section.points); rowLengths.push(section.length); amplitudes.push((lo + hi) / 2);
  }
  for (let panel = 0; panel < 2; panel++) {
    const base = position.length / 3;
    for (let j = 0; j <= rows; j++) for (let i = 0; i <= columns; i++) {
      const s = i / columns * flatPanelWidth, y = drop - j / rows * drop;
      const [x, z] = rowsData[j][panel ? columns - i : i];
      position.push(panel ? SPEC.finishedPanelWidth - x : x - SPEC.finishedPanelWidth, y, z);
      flatPosition.push(panel * flatPanelWidth + s - SPEC.flatWidth / 2, y, 0);
      uv.push(panel * flatPanelWidth + s, drop - y);
    }
    for (let j = 0; j < rows; j++) for (let i = 0; i < columns; i++) {
      const a = base + j * (columns + 1) + i, b = a + 1, c = a + columns + 1, d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  return { position: new Float32Array(position), flatPosition: new Float32Array(flatPosition), uv: new Float32Array(uv), indices: new Uint32Array(indices), rowLengths, amplitudes };
}

export function meshMetrics(mesh) {
  const { columns, rows } = SPEC;
  let minRow = Infinity, maxRow = 0, maxVerticalStrain = 0, minEdge = Infinity, maxEdge = 0;
  for (let panel = 0; panel < 2; panel++) for (let j = 0; j <= rows; j++) {
    let length = 0;
    for (let i = 0; i <= columns; i++) {
      const a = (panel * (rows + 1) * (columns + 1) + j * (columns + 1) + i) * 3;
      if (i) { const e = Math.hypot(...[0, 1, 2].map(k => mesh.position[a + k] - mesh.position[a - 3 + k])); length += e; minEdge = Math.min(minEdge, e); maxEdge = Math.max(maxEdge, e); }
      if (j) { const b = a - (columns + 1) * 3; maxVerticalStrain = Math.max(maxVerticalStrain, Math.hypot(...[0, 1, 2].map(k => mesh.position[a + k] - mesh.position[b + k])) / (SPEC.drop / rows) - 1); }
    }
    minRow = Math.min(minRow, length); maxRow = Math.max(maxRow, length);
  }
  return { vertices: mesh.position.length / 3, triangles: mesh.indices.length / 3, typedArrayBytes: mesh.position.byteLength + mesh.flatPosition.byteLength + mesh.uv.byteLength + mesh.indices.byteLength, renderedRowLengthCm: [minRow, maxRow], materialEdgeCm: SPEC.flatPanelWidth / columns, renderedEdgeRangeCm: [minEdge, maxEdge], maximumVerticalStrain: maxVerticalStrain, finishedWidthCm: Math.max(...mesh.position.filter((_, i) => i % 3 === 0)) - Math.min(...mesh.position.filter((_, i) => i % 3 === 0)) };
}
