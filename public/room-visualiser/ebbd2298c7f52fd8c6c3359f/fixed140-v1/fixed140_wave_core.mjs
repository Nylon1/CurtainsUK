/** Isolated fixed-140-cm pair, one supplier-width source per panel.
 * At most 140 cm of that physical width is represented, without resizing.
 * The mesh topology is identical for every width. STANDARD is untouched.
 */
export const FIXED140 = Object.freeze({
  finishedPairWidthCm: 140,
  finishedPanelWidthCm: 70,
  dropCm: 120,
  panels: 2,
  wavesPerPanel: 5,
  columns: 220,
  rows: 24,
});

const MAX_ANGLE = 2;

function assertFixedContract(spec) {
  if (spec.finishedPairWidthCm !== 140 || spec.finishedPanelWidthCm !== 70 ||
      spec.dropCm !== 120 || spec.panels !== 2 || spec.wavesPerPanel !== 5 ||
      spec.columns !== 220 || spec.rows !== 24)
    throw Error('Fixed-140 ten-Wave contract changed');
}

export function validateFabricWidth(fabricWidthCm, spec = FIXED140) {
  assertFixedContract(spec);
  if (!Number.isFinite(fabricWidthCm) || fabricWidthCm < spec.finishedPanelWidthCm ||
      fabricWidthCm > 200) throw Error('Unsupported physical fabric width');
  return fabricWidthCm;
}

export function flatPanelWidthCm(fabricWidthCm, spec = FIXED140) {
  validateFabricWidth(fabricWidthCm, spec);
  return Math.min(fabricWidthCm, spec.finishedPairWidthCm);
}

function section(angle, v, flatWidthCm, spec) {
  const ds = flatWidthCm / spec.columns;
  const points = [[0, 0]];
  let x = 0, z = 0;
  for (let i = 0; i < spec.columns; i++) {
    const phase = 2 * Math.PI * spec.wavesPerPanel * (i + 0.5) / spec.columns
      + 0.16 * Math.sin(Math.PI * v / 2);
    // Frozen STANDARD's round, hem-relaxed Wave cross-section family.
    const roundness = 0.055 + 0.04 * v * v * (3 - 2 * v);
    const theta = angle * (Math.sin(phase) - roundness * Math.sin(3 * phase));
    x += ds * Math.cos(theta);
    z += ds * Math.sin(theta);
    points.push([x, z]);
  }
  const depths = points.map(p => p[1]);
  const centre = (Math.min(...depths) + Math.max(...depths)) / 2;
  for (const p of points) p[1] += -centre + 0.45 * Math.sin(Math.PI * v);
  return {points, projectedWidthCm:x};
}

function solvedSection(v, flatWidthCm, spec) {
  const far = section(MAX_ANGLE, v, flatWidthCm, spec);
  if (far.projectedWidthCm > spec.finishedPanelWidthCm)
    throw Error('Requested fullness exceeds supported five-Wave geometry');
  let lo = 0, hi = MAX_ANGLE;
  for (let step = 0; step < 40; step++) {
    const mid = (lo + hi) / 2;
    if (section(mid, v, flatWidthCm, spec).projectedWidthCm > spec.finishedPanelWidthCm)
      lo = mid;
    else hi = mid;
  }
  const angle = (lo + hi) / 2;
  return {angle, ...section(angle, v, flatWidthCm, spec)};
}

export function buildFixed140Mesh(fabricWidthCm, spec = FIXED140) {
  validateFabricWidth(fabricWidthCm, spec);
  const flatWidthCm = flatPanelWidthCm(fabricWidthCm, spec);
  const positions = [], materialCm = [], indices = [], angles = [];
  const rowsData = [];
  for (let j = 0; j <= spec.rows; j++) {
    const row = solvedSection(j / spec.rows, flatWidthCm, spec);
    rowsData.push(row.points);
    angles.push(row.angle);
  }
  for (let panel = 0; panel < spec.panels; panel++) {
    const base = positions.length / 3;
    for (let j = 0; j <= spec.rows; j++) for (let i = 0; i <= spec.columns; i++) {
      const s = i / spec.columns * flatWidthCm;
      const y = spec.dropCm * (1 - j / spec.rows);
      const [x, z] = rowsData[j][panel ? spec.columns - i : i];
      positions.push(panel ? spec.finishedPanelWidthCm - x : x - spec.finishedPanelWidthCm,
                     y, z);
      materialCm.push(panel * flatWidthCm + s, spec.dropCm - y);
    }
    for (let j = 0; j < spec.rows; j++) for (let i = 0; i < spec.columns; i++) {
      const a = base + j * (spec.columns + 1) + i;
      const b = a + 1, c = a + spec.columns + 1, d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  return {position:new Float32Array(positions),
          materialCm:new Float32Array(materialCm),
          indices:new Uint32Array(indices), angles,
          fabricWidthCm, flatPanelWidthCm:flatWidthCm,
          flatPairWidthCm:2 * flatWidthCm,
          fullness:flatWidthCm / spec.finishedPanelWidthCm};
}

export function sourcePlan(sourceWidthPx, sourceHeightPx, fabricWidthCm, spec = FIXED140) {
  validateFabricWidth(fabricWidthCm, spec);
  if (!Number.isInteger(sourceWidthPx) || !Number.isInteger(sourceHeightPx) ||
      sourceWidthPx <= 0 || sourceHeightPx <= 0)
    throw Error('Invalid source image dimensions');
  const pixelsPerCm = sourceWidthPx / fabricWidthCm;
  const sourceHeightCm = sourceHeightPx / pixelsPerCm;
  const flatWidthCm = flatPanelWidthCm(fabricWidthCm, spec);
  const cropStartCm = (fabricWidthCm - flatWidthCm) / 2;
  return {pixelsPerCmX:pixelsPerCm,pixelsPerCmY:pixelsPerCm,
          sourcePhysicalCm:[fabricWidthCm,sourceHeightCm],
          flatPanelWidthCm:flatWidthCm,cropStartCm,
          sourceURange:[cropStartCm/fabricWidthCm,(cropStartCm+flatWidthCm)/fabricWidthCm],
          dropCovered:sourceHeightCm >= spec.dropCm,
          sourceVAtHem:1 - spec.dropCm / sourceHeightCm};
}

export function imageUV(mesh, sourceWidthPx, sourceHeightPx, spec = FIXED140) {
  const plan = sourcePlan(sourceWidthPx, sourceHeightPx, mesh.fabricWidthCm, spec);
  if (!plan.dropCovered) throw Error('Insufficient source height; no extension permitted');
  const uv = new Float32Array(mesh.materialCm.length);
  const stride = (spec.rows + 1) * (spec.columns + 1);
  for (let panel = 0; panel < 2; panel++) for (let vertex = 0; vertex < stride; vertex++) {
    const index = panel * stride + vertex;
    const materialX = mesh.materialCm[index * 2] - panel * mesh.flatPanelWidthCm;
    uv[index * 2] = (plan.cropStartCm + materialX) / mesh.fabricWidthCm;
    uv[index * 2 + 1] = 1 - mesh.materialCm[index * 2 + 1] / plan.sourcePhysicalCm[1];
  }
  return uv;
}

export function meshMetrics(mesh, spec = FIXED140) {
  const stride = (spec.rows + 1) * (spec.columns + 1);
  let minRow = Infinity, maxRow = 0, zMin = Infinity, zMax = -Infinity;
  let maxVerticalStrain = 0, minDx = Infinity;
  for (let panel = 0; panel < 2; panel++) for (let j = 0; j <= spec.rows; j++) {
    let rowLength = 0;
    for (let i = 0; i <= spec.columns; i++) {
      const a = (panel * stride + j * (spec.columns + 1) + i) * 3;
      zMin = Math.min(zMin, mesh.position[a + 2]);
      zMax = Math.max(zMax, mesh.position[a + 2]);
      if (i) {
        const dx = mesh.position[a] - mesh.position[a - 3];
        const dz = mesh.position[a + 2] - mesh.position[a - 1];
        rowLength += Math.hypot(dx, dz);
        minDx = Math.min(minDx, panel ? -dx : dx);
      }
      if (j) {
        const b = a - (spec.columns + 1) * 3;
        const length = Math.hypot(mesh.position[a] - mesh.position[b],
                                  mesh.position[a + 1] - mesh.position[b + 1],
                                  mesh.position[a + 2] - mesh.position[b + 2]);
        maxVerticalStrain = Math.max(maxVerticalStrain,
          Math.abs(length / (spec.dropCm / spec.rows) - 1));
      }
    }
    minRow = Math.min(minRow, rowLength);
    maxRow = Math.max(maxRow, rowLength);
  }
  const xs=[];
  for(let i=0;i<mesh.position.length;i+=3)xs.push(mesh.position[i]);
  return {vertices:mesh.position.length / 3,triangles:mesh.indices.length / 3,
          finishedPairWidthCm:Math.max(...xs)-Math.min(...xs),
          flatPanelWidthCm:mesh.flatPanelWidthCm,
          flatPairWidthCm:mesh.flatPairWidthCm,fullness:mesh.fullness,
          renderedRowLengthCm:[minRow,maxRow],depthRangeCm:zMax-zMin,
          wavePitchCm:spec.finishedPanelWidthCm / spec.wavesPerPanel,
          angleRangeRad:[Math.min(...mesh.angles),Math.max(...mesh.angles)],
          minimumForwardStepCm:minDx,maxVerticalStrain};
}
